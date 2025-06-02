import {
  users,
  companies,
  customers,
  suppliers,
  products,
  invoices,
  invoiceItems,
  productionOrders,
  bom,
  inventoryMovements,
  posSales,
  posSaleItems,
  posPrintSettings,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Customer,
  type InsertCustomer,
  type Supplier,
  type InsertSupplier,
  type Product,
  type InsertProduct,
  type Invoice,
  type InsertInvoice,
  type ProductionOrder,
  type InsertProductionOrder,
  type BOM,
  type InsertBOM,
  type POSSale,
  type InsertPOSSale,
  type POSSaleItem,
  type InsertPOSSaleItem,
  type POSPrintSettings,
  type InsertPOSPrintSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  createCompany(company: InsertCompany): Promise<Company>;
  getCompanyByUserId(userId: string): Promise<Company | undefined>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company>;
  
  // Customer operations
  getCustomers(companyId: number): Promise<Customer[]>;
  getCustomer(id: number, companyId: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>, companyId: number): Promise<Customer | undefined>;
  deleteCustomer(id: number, companyId: number): Promise<void>;
  
  // Supplier operations
  getSuppliers(companyId: number): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  
  // Product operations
  getProducts(companyId: number): Promise<Product[]>;
  getProduct(id: number, companyId: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>, companyId: number): Promise<Product | undefined>;
  deleteProduct(id: number, companyId: number): Promise<void>;
  
  // Invoice operations
  getInvoices(companyId: number): Promise<Invoice[]>;
  getInvoice(id: number, companyId: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>, companyId: number): Promise<Invoice | undefined>;
  
  // Production Order operations
  getProductionOrders(companyId: number): Promise<ProductionOrder[]>;
  createProductionOrder(order: InsertProductionOrder): Promise<ProductionOrder>;
  
  // BOM operations
  getBOMByProduct(productId: number, companyId: number): Promise<BOM[]>;
  createBOMItem(bomItem: InsertBOM): Promise<BOM>;
  updateBOMItem(id: number, bomItem: Partial<InsertBOM>, companyId: number): Promise<BOM | undefined>;
  deleteBOMItem(id: number, companyId: number): Promise<void>;
  
  // POS operations
  getPOSSales(companyId: number): Promise<POSSale[]>;
  getPOSSale(id: number, companyId: number): Promise<POSSale | undefined>;
  createPOSSale(sale: InsertPOSSale): Promise<POSSale>;
  getPOSSaleItems(saleId: number): Promise<POSSaleItem[]>;
  createPOSSaleItem(item: InsertPOSSaleItem): Promise<POSSaleItem>;
  getPOSPrintSettings(companyId: number): Promise<POSPrintSettings | undefined>;
  upsertPOSPrintSettings(settings: InsertPOSPrintSettings): Promise<POSPrintSettings>;
  
  // Dashboard metrics
  getDashboardMetrics(companyId: number): Promise<{
    monthSales: string;
    pendingInvoices: number;
    productsInStock: number;
    productionOrders: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Company operations
  async createCompany(companyData: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(companyData)
      .returning();
    return company;
  }

  async getCompanyByUserId(userId: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, userId));
    return company;
  }

  async updateCompany(id: number, companyData: Partial<InsertCompany>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ ...companyData, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  // Customer operations
  async getCustomers(companyId: number): Promise<Customer[]> {
    return await db
      .select()
      .from(customers)
      .where(eq(customers.companyId, companyId))
      .orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number, companyId: number): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId)));
    return customer;
  }

  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    const [customer] = await db
      .insert(customers)
      .values(customerData)
      .returning();
    return customer;
  }

  async updateCustomer(id: number, customerData: Partial<InsertCustomer>, companyId: number): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set({ ...customerData, updatedAt: new Date() })
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId)))
      .returning();
    return customer;
  }

  async deleteCustomer(id: number, companyId: number): Promise<void> {
    await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.companyId, companyId)));
  }

  // Supplier operations
  async getSuppliers(companyId: number): Promise<Supplier[]> {
    return await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.companyId, companyId))
      .orderBy(desc(suppliers.createdAt));
  }

  async createSupplier(supplierData: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db
      .insert(suppliers)
      .values(supplierData)
      .returning();
    return supplier;
  }

  // Product operations
  async getProducts(companyId: number): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId))
      .orderBy(desc(products.createdAt));
  }

  async getProduct(id: number, companyId: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.companyId, companyId)));
    return product;
  }

  async createProduct(productData: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(productData)
      .returning();
    return product;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>, companyId: number): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...productData, updatedAt: new Date() })
      .where(and(eq(products.id, id), eq(products.companyId, companyId)))
      .returning();
    return product;
  }

  async deleteProduct(id: number, companyId: number): Promise<void> {
    await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.companyId, companyId)));
  }

  // Invoice operations
  async getInvoices(companyId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.companyId, companyId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: number, companyId: number): Promise<Invoice | undefined> {
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)));
    return invoice;
  }

  async createInvoice(invoiceData: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db
      .insert(invoices)
      .values(invoiceData)
      .returning();
    return invoice;
  }

  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>, companyId: number): Promise<Invoice | undefined> {
    const [invoice] = await db
      .update(invoices)
      .set({ ...invoiceData, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.companyId, companyId)))
      .returning();
    return invoice;
  }

  // Production Order operations
  async getProductionOrders(companyId: number): Promise<ProductionOrder[]> {
    return await db
      .select()
      .from(productionOrders)
      .where(eq(productionOrders.companyId, companyId))
      .orderBy(desc(productionOrders.createdAt));
  }

  async createProductionOrder(orderData: InsertProductionOrder): Promise<ProductionOrder> {
    const [order] = await db
      .insert(productionOrders)
      .values(orderData)
      .returning();
    return order;
  }

  // BOM operations
  async getBOMByProduct(productId: number, companyId: number): Promise<BOM[]> {
    return await db
      .select()
      .from(bom)
      .where(and(eq(bom.productId, productId), eq(bom.companyId, companyId)))
      .orderBy(desc(bom.createdAt));
  }

  async createBOMItem(bomData: InsertBOM): Promise<BOM> {
    const [bomItem] = await db
      .insert(bom)
      .values(bomData)
      .returning();
    return bomItem;
  }

  async updateBOMItem(id: number, bomData: Partial<InsertBOM>, companyId: number): Promise<BOM | undefined> {
    const [bomItem] = await db
      .update(bom)
      .set(bomData)
      .where(and(eq(bom.id, id), eq(bom.companyId, companyId)))
      .returning();
    return bomItem;
  }

  async deleteBOMItem(id: number, companyId: number): Promise<void> {
    await db
      .delete(bom)
      .where(and(eq(bom.id, id), eq(bom.companyId, companyId)));
  }

  // POS operations
  async getPOSSales(companyId: number): Promise<POSSale[]> {
    return await db
      .select()
      .from(posSales)
      .where(eq(posSales.companyId, companyId))
      .orderBy(desc(posSales.createdAt));
  }

  async getPOSSale(id: number, companyId: number): Promise<POSSale | undefined> {
    const [sale] = await db
      .select()
      .from(posSales)
      .where(and(eq(posSales.id, id), eq(posSales.companyId, companyId)));
    return sale;
  }

  async createPOSSale(saleData: InsertPOSSale): Promise<POSSale> {
    const [sale] = await db
      .insert(posSales)
      .values(saleData)
      .returning();
    return sale;
  }

  async getPOSSaleItems(saleId: number): Promise<POSSaleItem[]> {
    return await db
      .select()
      .from(posSaleItems)
      .where(eq(posSaleItems.saleId, saleId))
      .orderBy(posSaleItems.id);
  }

  async createPOSSaleItem(itemData: InsertPOSSaleItem): Promise<POSSaleItem> {
    const [item] = await db
      .insert(posSaleItems)
      .values(itemData)
      .returning();
    return item;
  }

  async getPOSPrintSettings(companyId: number): Promise<POSPrintSettings | undefined> {
    const [settings] = await db
      .select()
      .from(posPrintSettings)
      .where(eq(posPrintSettings.companyId, companyId));
    return settings;
  }

  async upsertPOSPrintSettings(settingsData: InsertPOSPrintSettings): Promise<POSPrintSettings> {
    const [settings] = await db
      .insert(posPrintSettings)
      .values(settingsData)
      .onConflictDoUpdate({
        target: posPrintSettings.companyId,
        set: {
          ...settingsData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return settings;
  }

  // Dashboard metrics
  async getDashboardMetrics(companyId: number): Promise<{
    monthSales: string;
    pendingInvoices: number;
    productsInStock: number;
    productionOrders: number;
  }> {
    // Get current month sales
    const currentMonth = new Date();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    const [salesResult] = await db
      .select({ total: sql<string>`COALESCE(SUM(${invoices.total}), 0)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, companyId),
          sql`${invoices.date} >= ${firstDayOfMonth.toISOString().split('T')[0]}`
        )
      );

    // Get pending invoices count
    const [pendingResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(invoices)
      .where(
        and(
          eq(invoices.companyId, companyId),
          eq(invoices.status, "pending")
        )
      );

    // Get products in stock count
    const [stockResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(
        and(
          eq(products.companyId, companyId),
          sql`${products.stock} > 0`
        )
      );

    // Get active production orders count
    const [productionResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(productionOrders)
      .where(
        and(
          eq(productionOrders.companyId, companyId),
          sql`${productionOrders.status} IN ('planned', 'in_progress')`
        )
      );

    return {
      monthSales: salesResult?.total || "0",
      pendingInvoices: pendingResult?.count || 0,
      productsInStock: stockResult?.count || 0,
      productionOrders: productionResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
