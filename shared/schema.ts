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

// User storage table - Updated for email/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: text("password").notNull(), // Encrypted password
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).default("user"), // super_admin, company_admin, user
  isActive: boolean("is_active").default(true),
  isOnline: boolean("is_online").default(false),
  lastSeen: timestamp("last_seen"),
  lastLoginAt: timestamp("last_login_at"), // Track last login
  jobTitle: varchar("job_title", { length: 100 }),
  department: varchar("department", { length: 100 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company Users - Junction table for user-company relationships
export const companyUsers = pgTable("company_users", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  role: varchar("role", { length: 20 }).default("user"), // company_admin, user
  permissions: text("permissions").array(), // array of permission strings
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  businessName: varchar("business_name", { length: 255 }), // Razón social
  rnc: varchar("rnc", { length: 20 }),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  logoUrl: text("logo_url"), // URL del logo personalizado
  industry: varchar("industry", { length: 100 }), // Sector/industria
  businessType: varchar("business_type", { length: 50 }).default("general"), // general, restaurant
  taxRegime: varchar("tax_regime", { length: 50 }).default("general"), // régimen tributario
  currency: varchar("currency", { length: 3 }).default("DOP"),
  timezone: varchar("timezone", { length: 50 }).default("America/Santo_Domingo"),
  subscriptionPlan: varchar("subscription_plan", { length: 20 }).default("trial"), // trial, monthly, annual
  subscriptionExpiry: timestamp("subscription_expiry"),
  registrationStatus: varchar("registration_status", { length: 20 }).default("pending"), // pending, completed, expired
  invitationToken: varchar("invitation_token", { length: 255 }), // token for registration link
  invitationSentAt: timestamp("invitation_sent_at"),
  invitationExpiresAt: timestamp("invitation_expires_at"),
  ownerEmail: varchar("owner_email", { length: 255 }), // email del propietario para invitación
  isActive: boolean("is_active").notNull().default(true),
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

// Suppliers (manteniendo la tabla original para compatibilidad)
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

// Warehouses
export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  location: varchar("location", { length: 255 }),
  manager: varchar("manager", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
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
  imageUrl: varchar("image_url", { length: 1000 }),
  isActive: boolean("is_active").notNull().default(true),
  isManufactured: boolean("is_manufactured").notNull().default(false),
  itbisIncluded: boolean("itbis_included").notNull().default(true),
  itbisExempt: boolean("itbis_exempt").notNull().default(false),
  warehouseId: integer("warehouse_id"),
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
  // suppliers moved to purchases module
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
  ownerId: true,
  registrationStatus: true,
});

// Schema for admin company creation (includes invitation fields)
export const insertCompanySchemaForAdmin = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true,
  registrationStatus: true,
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

export const insertWarehouseSchema = createInsertSchema(warehouses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanyUserSchema = createInsertSchema(companyUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// POS Sales table with Fiscal Receipt support
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
  customerName: varchar("customer_name", { length: 255 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  customerRnc: varchar("customer_rnc", { length: 11 }), // Dominican RNC
  // Fiscal Receipt fields
  ncf: varchar("ncf", { length: 20 }).notNull(), // Comprobante Fiscal
  ncfType: varchar("ncf_type", { length: 3 }).default("B01"), // B01, B02, B04, etc.
  ncfSequence: integer("ncf_sequence").notNull(),
  fiscalPeriod: varchar("fiscal_period", { length: 8 }).notNull(), // YYYYMMDD
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("completed"),
  // Restaurant-specific fields
  orderType: varchar("order_type", { length: 20 }).default("dine_in"), // dine_in, takeout, delivery
  tableNumber: varchar("table_number", { length: 10 }),
  kitchenStatus: varchar("kitchen_status", { length: 20 }).default("pending"), // pending, preparing, ready, served
  preparationNotes: text("preparation_notes"),
  // Audit fields
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// POS Sale Items table
export const posSaleItems = pgTable("pos_sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => posSales.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  productCode: varchar("product_code", { length: 50 }).notNull(),
  quantity: varchar("quantity").notNull(),
  unitPrice: varchar("unit_price").notNull(),
  discount: varchar("discount").default("0"),
  subtotal: varchar("subtotal").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// NCF Sequence Control for Fiscal Receipts
export const ncfSequences = pgTable("ncf_sequences", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  ncfType: varchar("ncf_type", { length: 3 }).notNull(), // B01, B02, B04, etc.
  currentSequence: integer("current_sequence").default(1),
  maxSequence: integer("max_sequence").default(50000000), // DGII limit
  fiscalPeriod: varchar("fiscal_period", { length: 8 }).notNull(), // YYYYMMDD
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// POS Session for real-time synchronization
export const posSessions = pgTable("pos_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 255 }).notNull().unique(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  userId: varchar("user_id").notNull(),
  deviceInfo: text("device_info"),
  cartData: jsonb("cart_data"), // Real-time cart sync
  isActive: boolean("is_active").default(true),
  lastActivity: timestamp("last_activity").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stock Reservations for cart items
export const stockReservations = pgTable("stock_reservations", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  sessionId: varchar("session_id", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  reservedAt: timestamp("reserved_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(), // Auto-expire after 30 minutes
  isReleased: boolean("is_released").default(false),
  releasedAt: timestamp("released_at"),
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

// AI Chat Messages table
export const aiChatMessages = pgTable("ai_chat_messages", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  message: text("message").notNull(),
  response: text("response").notNull(),
  context: jsonb("context"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull().default("info"), // info, success, warning, error
  read: boolean("read").notNull().default(false),
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

export const insertPOSSessionSchema = createInsertSchema(posSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStockReservationSchema = createInsertSchema(stockReservations).omit({
  id: true,
  reservedAt: true,
  isReleased: true,
  releasedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// HR and Payroll Tables
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id", { length: 50 }).notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  position: varchar("position", { length: 100 }).notNull(),
  department: varchar("department", { length: 100 }),
  hireDate: timestamp("hire_date").notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }).notNull(),
  salaryType: varchar("salary_type", { length: 20 }).notNull().default("monthly"), // monthly, hourly, weekly
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, terminated
  cedula: varchar("cedula", { length: 20 }), // Dominican ID
  tss: varchar("tss", { length: 20 }), // Social Security Number
  bankAccount: varchar("bank_account", { length: 50 }),
  bankName: varchar("bank_name", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payrollPeriods = pgTable("payroll_periods", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  periodName: varchar("period_name", { length: 100 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  payDate: timestamp("pay_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("draft"), // draft, processing, paid, closed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payrollEntries = pgTable("payroll_entries", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  periodId: integer("period_id").notNull().references(() => payrollPeriods.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
  hoursWorked: decimal("hours_worked", { precision: 8, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 8, scale: 2 }).default("0"),
  bonuses: decimal("bonuses", { precision: 10, scale: 2 }).default("0"),
  commissions: decimal("commissions", { precision: 10, scale: 2 }).default("0"),
  allowances: decimal("allowances", { precision: 10, scale: 2 }).default("0"),
  grossPay: decimal("gross_pay", { precision: 10, scale: 2 }).notNull(),
  tssDeduction: decimal("tss_deduction", { precision: 10, scale: 2 }).default("0"),
  sfsDeduction: decimal("sfs_deduction", { precision: 10, scale: 2 }).default("0"),
  infotepDeduction: decimal("infotep_deduction", { precision: 10, scale: 2 }).default("0"),
  incomeTaxDeduction: decimal("income_tax_deduction", { precision: 10, scale: 2 }).default("0"),
  otherDeductions: decimal("other_deductions", { precision: 10, scale: 2 }).default("0"),
  totalDeductions: decimal("total_deductions", { precision: 10, scale: 2 }).notNull(),
  netPay: decimal("net_pay", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timeTracking = pgTable("time_tracking", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  breakStart: timestamp("break_start"),
  breakEnd: timestamp("break_end"),
  hoursWorked: decimal("hours_worked", { precision: 8, scale: 2 }).default("0"),
  overtimeHours: decimal("overtime_hours", { precision: 8, scale: 2 }).default("0"),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  leaveType: varchar("leave_type", { length: 50 }).notNull(), // vacation, sick, personal, maternity, etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  days: integer("days").notNull(),
  reason: text("reason"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by", { length: 255 }),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// HR and Payroll Insert Schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollPeriodSchema = createInsertSchema(payrollPeriods).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPayrollEntrySchema = createInsertSchema(payrollEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTimeTrackingSchema = createInsertSchema(timeTracking).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveSchema = createInsertSchema(leaves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Remove duplicate ncfSequences table as it's already defined above

export const comprobantes605 = pgTable("comprobantes_605", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
  rncCedula: varchar("rnc_cedula", { length: 11 }).notNull(),
  tipoIdentificacion: varchar("tipo_identificacion", { length: 1 }).notNull(), // 1=RNC, 2=Cedula
  tipoComprobante: varchar("tipo_comprobante", { length: 2 }).notNull(), // 01, 02, etc.
  ncf: varchar("ncf", { length: 11 }),
  ncfModificado: varchar("ncf_modificado", { length: 11 }),
  fechaComprobante: timestamp("fecha_comprobante").notNull(),
  fechaPago: timestamp("fecha_pago"),
  montoFacturado: decimal("monto_facturado", { precision: 12, scale: 2 }).notNull(),
  itbisFacturado: decimal("itbis_facturado", { precision: 12, scale: 2 }).notNull(),
  itbisRetenido: decimal("itbis_retenido", { precision: 12, scale: 2 }).default("0"),
  itbisPercibido: decimal("itbis_percibido", { precision: 12, scale: 2 }).default("0"),
  retencionRenta: decimal("retencion_renta", { precision: 12, scale: 2 }).default("0"),
  isrPercibido: decimal("isr_percibido", { precision: 12, scale: 2 }).default("0"),
  impuestoSelectivoConsumo: decimal("impuesto_selectivo_consumo", { precision: 12, scale: 2 }).default("0"),
  otrosImpuestos: decimal("otros_impuestos", { precision: 12, scale: 2 }).default("0"),
  montoTotal: decimal("monto_total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const comprobantes606 = pgTable("comprobantes_606", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  period: varchar("period", { length: 7 }).notNull(), // YYYY-MM
  rncCedula: varchar("rnc_cedula", { length: 11 }).notNull(),
  tipoIdentificacion: varchar("tipo_identificacion", { length: 1 }).notNull(), // 1=RNC, 2=Cedula
  tipoComprobante: varchar("tipo_comprobante", { length: 2 }).notNull(),
  ncf: varchar("ncf", { length: 11 }),
  ncfModificado: varchar("ncf_modificado", { length: 11 }),
  fechaComprobante: timestamp("fecha_comprobante").notNull(),
  fechaPago: timestamp("fecha_pago"),
  servicioTipo: varchar("servicio_tipo", { length: 2 }),
  conceptoPago: text("concepto_pago"),
  montoFacturado: decimal("monto_facturado", { precision: 12, scale: 2 }).notNull(),
  itbisFacturado: decimal("itbis_facturado", { precision: 12, scale: 2 }).notNull(),
  itbisRetenido: decimal("itbis_retenido", { precision: 12, scale: 2 }).default("0"),
  itbisPercibido: decimal("itbis_percibido", { precision: 12, scale: 2 }).default("0"),
  retencionRenta: decimal("retencion_renta", { precision: 12, scale: 2 }).default("0"),
  isrPercibido: decimal("isr_percibido", { precision: 12, scale: 2 }).default("0"),
  impuestoSelectivoConsumo: decimal("impuesto_selectivo_consumo", { precision: 12, scale: 2 }).default("0"),
  otrosImpuestos: decimal("otros_impuestos", { precision: 12, scale: 2 }).default("0"),
  montoTotal: decimal("monto_total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rncRegistry = pgTable("rnc_registry", {
  id: serial("id").primaryKey(),
  rnc: varchar("rnc", { length: 11 }).notNull().unique(),
  razonSocial: text("razon_social").notNull(),
  nombreComercial: text("nombre_comercial"),
  categoria: varchar("categoria", { length: 50 }),
  regimen: varchar("regimen", { length: 50 }),
  estado: varchar("estado", { length: 20 }),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertNCFSequenceSchema = createInsertSchema(ncfSequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComprobante605Schema = createInsertSchema(comprobantes605).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComprobante606Schema = createInsertSchema(comprobantes606).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRNCRegistrySchema = createInsertSchema(rncRegistry).omit({
  id: true,
  lastUpdated: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type NCFSequence = typeof ncfSequences.$inferSelect;
export type InsertNCFSequence = z.infer<typeof insertNCFSequenceSchema>;
export type Comprobante605 = typeof comprobantes605.$inferSelect;
export type InsertComprobante605 = z.infer<typeof insertComprobante605Schema>;
export type Comprobante606 = typeof comprobantes606.$inferSelect;
export type InsertComprobante606 = z.infer<typeof insertComprobante606Schema>;
export type RNCRegistry = typeof rncRegistry.$inferSelect;
export type InsertRNCRegistry = z.infer<typeof insertRNCRegistrySchema>;

// AI Chat Messages types
export type AIChatMessage = typeof aiChatMessages.$inferSelect;
export type InsertAIChatMessage = typeof aiChatMessages.$inferInsert;
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
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type CompanyUser = typeof companyUsers.$inferSelect;
export type InsertCompanyUser = z.infer<typeof insertCompanyUserSchema>;
export type POSSale = typeof posSales.$inferSelect;
export type InsertPOSSale = z.infer<typeof insertPOSSaleSchema>;
export type POSSaleItem = typeof posSaleItems.$inferSelect;
export type InsertPOSSaleItem = z.infer<typeof insertPOSSaleItemSchema>;
// NCF types removed as they are defined below
export type POSSession = typeof posSessions.$inferSelect;
export type InsertPOSSession = z.infer<typeof insertPOSSessionSchema>;
export type StockReservation = typeof stockReservations.$inferSelect;
export type InsertStockReservation = z.infer<typeof insertStockReservationSchema>;
export type POSPrintSettings = typeof posPrintSettings.$inferSelect;
export type InsertPOSPrintSettings = z.infer<typeof insertPOSPrintSettingsSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type PayrollPeriod = typeof payrollPeriods.$inferSelect;
export type InsertPayrollPeriod = z.infer<typeof insertPayrollPeriodSchema>;
export type PayrollEntry = typeof payrollEntries.$inferSelect;
export type InsertPayrollEntry = z.infer<typeof insertPayrollEntrySchema>;
export type TimeTracking = typeof timeTracking.$inferSelect;
export type InsertTimeTracking = z.infer<typeof insertTimeTrackingSchema>;
export type Leave = typeof leaves.$inferSelect;
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Comprobante605 = typeof comprobantes605.$inferSelect;
export type InsertComprobante605 = z.infer<typeof insertComprobante605Schema>;
export type Comprobante606 = typeof comprobantes606.$inferSelect;
export type InsertComprobante606 = z.infer<typeof insertComprobante606Schema>;
export type RNCRegistry = typeof rncRegistry.$inferSelect;
export type InsertRNCRegistry = z.infer<typeof insertRNCRegistrySchema>;

// Chat Channels
export const chatChannels = pgTable("chat_channels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull().default("public"), // public, private, direct
  companyId: integer("company_id").notNull().references(() => companies.id),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat Channel Members
export const chatChannelMembers = pgTable("chat_channel_members", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => chatChannels.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role", { length: 20 }).default("member"), // admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
  lastReadAt: timestamp("last_read_at"),
});

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => chatChannels.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  messageType: varchar("message_type", { length: 20 }).default("text"), // text, file, image, system
  fileUrl: text("file_url"),
  fileName: varchar("file_name", { length: 255 }),
  replyToId: integer("reply_to_id").references(() => chatMessages.id),
  isEdited: boolean("is_edited").default(false),
  editedAt: timestamp("edited_at"),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Message Reactions
export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => chatMessages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Permissions
export const userPermissions = pgTable("user_permissions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  module: varchar("module", { length: 50 }).notNull(), // sales, inventory, manufacturing, etc.
  permissions: text("permissions").array().notNull(), // [read, write, delete, admin]
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity Logs
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  action: varchar("action", { length: 100 }).notNull(),
  module: varchar("module", { length: 50 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 50 }),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Roles
export const userRoles = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description"),
  companyId: integer("company_id").notNull().references(() => companies.id),
  permissions: jsonb("permissions").notNull(), // JSON object with module permissions
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Role Assignments
export const userRoleAssignments = pgTable("user_role_assignments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  roleId: integer("role_id").notNull().references(() => userRoles.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  assignedBy: varchar("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

// Módulo de compras movido a shared/purchases-schema.ts

// Chat Channel Relations
export const chatChannelRelations = relations(chatChannels, ({ one, many }) => ({
  company: one(companies, {
    fields: [chatChannels.companyId],
    references: [companies.id],
  }),
  createdBy: one(users, {
    fields: [chatChannels.createdBy],
    references: [users.id],
  }),
  members: many(chatChannelMembers),
  messages: many(chatMessages),
}));

export const chatChannelMemberRelations = relations(chatChannelMembers, ({ one }) => ({
  channel: one(chatChannels, {
    fields: [chatChannelMembers.channelId],
    references: [chatChannels.id],
  }),
  user: one(users, {
    fields: [chatChannelMembers.userId],
    references: [users.id],
  }),
}));

export const chatMessageRelations = relations(chatMessages, ({ one, many }) => ({
  channel: one(chatChannels, {
    fields: [chatMessages.channelId],
    references: [chatChannels.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
  replyTo: one(chatMessages, {
    fields: [chatMessages.replyToId],
    references: [chatMessages.id],
  }),
  reactions: many(messageReactions),
}));

export const messageReactionRelations = relations(messageReactions, ({ one }) => ({
  message: one(chatMessages, {
    fields: [messageReactions.messageId],
    references: [chatMessages.id],
  }),
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
}));

export const userPermissionRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [userPermissions.companyId],
    references: [companies.id],
  }),
}));

export const activityLogRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [activityLogs.companyId],
    references: [companies.id],
  }),
}));

export const userRoleRelations = relations(userRoles, ({ one, many }) => ({
  company: one(companies, {
    fields: [userRoles.companyId],
    references: [companies.id],
  }),
  assignments: many(userRoleAssignments),
}));

export const userRoleAssignmentRelations = relations(userRoleAssignments, ({ one }) => ({
  user: one(users, {
    fields: [userRoleAssignments.userId],
    references: [users.id],
  }),
  role: one(userRoles, {
    fields: [userRoleAssignments.roleId],
    references: [userRoles.id],
  }),
  company: one(companies, {
    fields: [userRoleAssignments.companyId],
    references: [companies.id],
  }),
  assignedBy: one(users, {
    fields: [userRoleAssignments.assignedBy],
    references: [users.id],
  }),
}));

// Schema exports for chat system
export const insertChatChannelSchema = createInsertSchema(chatChannels);
export const insertChatChannelMemberSchema = createInsertSchema(chatChannelMembers);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertMessageReactionSchema = createInsertSchema(messageReactions);
export const insertUserPermissionSchema = createInsertSchema(userPermissions);
export const insertActivityLogSchema = createInsertSchema(activityLogs);
export const insertUserRoleSchema = createInsertSchema(userRoles);
export const insertUserRoleAssignmentSchema = createInsertSchema(userRoleAssignments);

export type ChatChannel = typeof chatChannels.$inferSelect;
export type InsertChatChannel = z.infer<typeof insertChatChannelSchema>;
export type ChatChannelMember = typeof chatChannelMembers.$inferSelect;
export type InsertChatChannelMember = z.infer<typeof insertChatChannelMemberSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = z.infer<typeof insertMessageReactionSchema>;
export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = z.infer<typeof insertUserPermissionSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRoleAssignment = typeof userRoleAssignments.$inferSelect;
export type InsertUserRoleAssignment = z.infer<typeof insertUserRoleAssignmentSchema>;

// Tipos del módulo de compras movidos a shared/purchases-schema.ts
