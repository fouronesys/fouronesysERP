import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  rnc: varchar("rnc", { length: 20 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  logo: text("logo"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  rnc: varchar("rnc", { length: 20 }),
  cedula: varchar("cedula", { length: 15 }),
  type: varchar("type", { length: 20 }).notNull().default("individual"), // individual, company
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  rnc: varchar("rnc", { length: 20 }),
  contactPerson: varchar("contact_person", { length: 255 }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Categories
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => productCategories.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  stock: integer("stock").notNull().default(0),
  minStock: integer("min_stock").default(0),
  maxStock: integer("max_stock"),
  unit: varchar("unit", { length: 20 }).notNull().default("unit"),
  isActive: boolean("is_active").notNull().default(true),
  isManufactured: boolean("is_manufactured").notNull().default(false),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 50 }).notNull(),
  ncf: varchar("ncf", { length: 20 }),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  date: date("date").notNull(),
  dueDate: date("due_date"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  itbis: decimal("itbis", { precision: 10, scale: 2 }).notNull().default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, paid, overdue, cancelled
  notes: text("notes"),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoice Items
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

// Bill of Materials (BOM) - Lista de materiales para manufactura
export const bom = pgTable("bom", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  materialId: integer("material_id").notNull().references(() => products.id),
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }), // Costo por unidad del material
  notes: text("notes"), // Notas sobre el material (ej: "Agregar al final", "Calentar antes")
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Recetas - Para productos que requieren instrucciones detalladas
export const recipes = pgTable("recipes", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  instructions: text("instructions").notNull(), // Instrucciones paso a paso
  preparationTime: integer("preparation_time"), // Tiempo en minutos
  cookingTime: integer("cooking_time"), // Tiempo de cocción en minutos
  servings: integer("servings"), // Porciones que produce
  difficulty: varchar("difficulty", { length: 20 }).default("medium"), // easy, medium, hard
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ingredientes/Materiales para recetas
export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  recipeId: integer("recipe_id").notNull().references(() => recipes.id),
  materialId: integer("material_id").notNull().references(() => products.id),
  quantity: decimal("quantity", { precision: 10, scale: 4 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  step: integer("step").default(1), // En qué paso se usa
  isOptional: boolean("is_optional").default(false),
  notes: text("notes"), // Notas específicas del ingrediente
});

// Pasos de producción
export const productionSteps = pgTable("production_steps", {
  id: serial("id").primaryKey(),
  productionOrderId: integer("production_order_id").notNull().references(() => productionOrders.id),
  stepNumber: integer("step_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  estimatedTime: integer("estimated_time"), // Tiempo estimado en minutos
  actualTime: integer("actual_time"), // Tiempo real tomado
  status: varchar("status", { length: 20 }).default("pending"), // pending, in_progress, completed, skipped
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

// Production Orders
export const productionOrders = pgTable("production_orders", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 50 }).notNull(),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, planned, in_progress, completed, cancelled
  plannedStartDate: date("planned_start_date"),
  plannedEndDate: date("planned_end_date"),
  actualStartDate: date("actual_start_date"),
  actualEndDate: date("actual_end_date"),
  notes: text("notes"),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Inventory Movements
export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  type: varchar("type", { length: 20 }).notNull(), // in, out, adjustment
  quantity: integer("quantity").notNull(),
  reference: varchar("reference", { length: 100 }),
  referenceId: integer("reference_id"),
  notes: text("notes"),
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  customers: many(customers),
  suppliers: many(suppliers),
  products: many(products),
  invoices: many(invoices),
  productionOrders: many(productionOrders),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, {
    fields: [customers.companyId],
    references: [companies.id],
  }),
  invoices: many(invoices),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  invoiceItems: many(invoiceItems),
  bomItems: many(bom, { relationName: "product_bom" }),
  bomMaterials: many(bom, { relationName: "material_bom" }),
  productionOrders: many(productionOrders),
  inventoryMovements: many(inventoryMovements),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  company: one(companies, {
    fields: [invoices.companyId],
    references: [companies.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  items: many(invoiceItems),
}));

export const bomRelations = relations(bom, ({ one }) => ({
  product: one(products, {
    fields: [bom.productId],
    references: [products.id],
    relationName: "product_bom",
  }),
  material: one(products, {
    fields: [bom.materialId],
    references: [products.id],
    relationName: "material_bom",
  }),
  company: one(companies, {
    fields: [bom.companyId],
    references: [companies.id],
  }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  product: one(products, {
    fields: [recipes.productId],
    references: [products.id],
  }),
  company: one(companies, {
    fields: [recipes.companyId],
    references: [companies.id],
  }),
  ingredients: many(recipeIngredients),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, {
    fields: [recipeIngredients.recipeId],
    references: [recipes.id],
  }),
  material: one(products, {
    fields: [recipeIngredients.materialId],
    references: [products.id],
  }),
}));

export const productionStepsRelations = relations(productionSteps, ({ one }) => ({
  productionOrder: one(productionOrders, {
    fields: [productionSteps.productionOrderId],
    references: [productionOrders.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  price: z.coerce.string(),
  cost: z.coerce.string().optional(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductionOrderSchema = createInsertSchema(productionOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBOMSchema = createInsertSchema(bom).omit({
  id: true,
  createdAt: true,
});

// POS Sales table
export const posSales = pgTable("pos_sales", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  saleNumber: varchar("sale_number", { length: 50 }).notNull(),
  subtotal: varchar("subtotal").notNull(),
  itbis: varchar("itbis").notNull(),
  total: varchar("total").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  cashReceived: varchar("cash_received"),
  cashChange: varchar("cash_change"),
  ncf: varchar("ncf", { length: 20 }),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// POS Sale Items table
export const posSaleItems = pgTable("pos_sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => posSales.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: varchar("quantity").notNull(),
  unitPrice: varchar("unit_price").notNull(),
  subtotal: varchar("subtotal").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// POS Print Settings table
export const posPrintSettings = pgTable("pos_print_settings", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  printerWidth: varchar("printer_width", { length: 10 }).default("80mm"),
  headerText: text("header_text"),
  footerText: text("footer_text"),
  showLogo: boolean("show_logo").default(false),
  showNCF: boolean("show_ncf").default(true),
  showCustomerInfo: boolean("show_customer_info").default(true),
  fontSize: varchar("font_size", { length: 10 }).default("normal"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPOSSaleSchema = createInsertSchema(posSales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPOSSaleItemSchema = createInsertSchema(posSaleItems).omit({
  id: true,
  createdAt: true,
});

export const insertPOSPrintSettingsSchema = createInsertSchema(posPrintSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type ProductionOrder = typeof productionOrders.$inferSelect;
export type InsertProductionOrder = z.infer<typeof insertProductionOrderSchema>;
export type BOM = typeof bom.$inferSelect;
export type InsertBOM = z.infer<typeof insertBOMSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type POSSale = typeof posSales.$inferSelect;
export type InsertPOSSale = z.infer<typeof insertPOSSaleSchema>;
export type POSSaleItem = typeof posSaleItems.$inferSelect;
export type InsertPOSSaleItem = z.infer<typeof insertPOSSaleItemSchema>;
export type POSPrintSettings = typeof posPrintSettings.$inferSelect;
export type InsertPOSPrintSettings = z.infer<typeof insertPOSPrintSettingsSchema>;
