import {
  users,
  companies,
  companyUsers,
  warehouses,
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
  notifications,
  employees,
  payrollPeriods,
  payrollEntries,
  timeTracking,
  leaves,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Notification,
  type InsertNotification,
  type Employee,
  type InsertEmployee,
  type PayrollPeriod,
  type InsertPayrollPeriod,
  type PayrollEntry,
  type InsertPayrollEntry,
  type TimeTracking,
  type InsertTimeTracking,
  type Leave,
  type InsertLeave,
  type CompanyUser,
  type InsertCompanyUser,
  type Warehouse,
  type InsertWarehouse,
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
  
  // Super Admin operations
  getAllCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  updateCompanyStatus(id: number, isActive: boolean): Promise<Company>;
  createCompanyForUser(company: InsertCompany, userId: string): Promise<Company>;
  getUserCompanies(userId: string): Promise<Company[]>;
  
  // Company User operations
  addUserToCompany(userId: string, companyId: number, role: string): Promise<CompanyUser>;
  getUserRole(userId: string, companyId?: number): Promise<string | null>;
  isUserSuperAdmin(userId: string): Promise<boolean>;
  
  // Warehouse operations
  getWarehouses(companyId: number): Promise<Warehouse[]>;
  createWarehouse(warehouse: InsertWarehouse): Promise<Warehouse>;
  updateWarehouse(id: number, warehouse: Partial<InsertWarehouse>, companyId: number): Promise<Warehouse | undefined>;
  deleteWarehouse(id: number, companyId: number): Promise<void>;
  
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
  
  // Notification operations
  getNotifications(userId: string, companyId: number): Promise<Notification[]>;
  createNotification(notification: typeof notifications.$inferInsert): Promise<Notification>;
  markNotificationAsRead(id: number, userId: string): Promise<void>;
  deleteNotification(id: number, userId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string, companyId: number): Promise<void>;
  clearAllNotifications(userId: string, companyId: number): Promise<void>;
  
  // Employee operations
  getEmployees(companyId: number): Promise<Employee[]>;
  getEmployee(id: number, companyId: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>, companyId: number): Promise<Employee | undefined>;
  deleteEmployee(id: number, companyId: number): Promise<void>;
  
  // Payroll Period operations
  getPayrollPeriods(companyId: number): Promise<PayrollPeriod[]>;
  getPayrollPeriod(id: number, companyId: number): Promise<PayrollPeriod | undefined>;
  createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod>;
  updatePayrollPeriod(id: number, period: Partial<InsertPayrollPeriod>, companyId: number): Promise<PayrollPeriod | undefined>;
  deletePayrollPeriod(id: number, companyId: number): Promise<void>;
  
  // Payroll Entry operations
  getPayrollEntries(companyId: number, periodId?: number): Promise<PayrollEntry[]>;
  getPayrollEntry(id: number, companyId: number): Promise<PayrollEntry | undefined>;
  createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry>;
  updatePayrollEntry(id: number, entry: Partial<InsertPayrollEntry>, companyId: number): Promise<PayrollEntry | undefined>;
  deletePayrollEntry(id: number, companyId: number): Promise<void>;
  
  // Time Tracking operations
  getTimeTracking(companyId: number, employeeId?: number): Promise<TimeTracking[]>;
  getTimeTrackingEntry(id: number, companyId: number): Promise<TimeTracking | undefined>;
  createTimeTracking(timeEntry: InsertTimeTracking): Promise<TimeTracking>;
  updateTimeTracking(id: number, timeEntry: Partial<InsertTimeTracking>, companyId: number): Promise<TimeTracking | undefined>;
  deleteTimeTracking(id: number, companyId: number): Promise<void>;
  
  // Leave operations
  getLeaves(companyId: number, employeeId?: number): Promise<Leave[]>;
  getLeave(id: number, companyId: number): Promise<Leave | undefined>;
  createLeave(leave: InsertLeave): Promise<Leave>;
  updateLeave(id: number, leave: Partial<InsertLeave>, companyId: number): Promise<Leave | undefined>;
  deleteLeave(id: number, companyId: number): Promise<void>;
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
    // Set trial expiry date for trial companies
    const dataToInsert = { ...companyData };
    if (companyData.subscriptionPlan === 'trial' && !companyData.subscriptionExpiry) {
      const now = new Date();
      const trialExpiry = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000)); // 15 days from now
      dataToInsert.subscriptionExpiry = trialExpiry;
    }
    
    const [company] = await db
      .insert(companies)
      .values(dataToInsert)
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

  // Super Admin operations
  async getAllCompanies(): Promise<Company[]> {
    return await db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async updateCompanyStatus(id: number, isActive: boolean): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async createCompanyForUser(companyData: InsertCompany, userId: string): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({ ...companyData, ownerId: userId })
      .returning();
    
    // Agregar al usuario como admin de la empresa
    await db.insert(companyUsers).values({
      userId,
      companyId: company.id,
      role: "company_admin",
      permissions: ["manage_company", "manage_users", "view_reports"],
    });
    
    return company;
  }

  async getUserCompanies(userId: string): Promise<Company[]> {
    const userCompanies = await db
      .select({ company: companies })
      .from(companyUsers)
      .innerJoin(companies, eq(companyUsers.companyId, companies.id))
      .where(and(eq(companyUsers.userId, userId), eq(companyUsers.isActive, true)));
    
    return userCompanies.map(uc => uc.company);
  }

  async addUserToCompany(userId: string, companyId: number, role: string): Promise<CompanyUser> {
    const [companyUser] = await db
      .insert(companyUsers)
      .values({
        userId,
        companyId,
        role,
        permissions: role === "company_admin" ? ["manage_company", "manage_users"] : ["basic_access"],
      })
      .returning();
    return companyUser;
  }

  async getUserRole(userId: string, companyId?: number): Promise<string | null> {
    // Verificar si es super admin
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (user?.role === "super_admin") {
      return "super_admin";
    }

    if (companyId) {
      const [companyUser] = await db
        .select()
        .from(companyUsers)
        .where(and(
          eq(companyUsers.userId, userId),
          eq(companyUsers.companyId, companyId),
          eq(companyUsers.isActive, true)
        ));
      return companyUser?.role || null;
    }

    return user?.role || null;
  }

  async isUserSuperAdmin(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user?.role === "super_admin";
  }

  // Warehouse operations
  async getWarehouses(companyId: number): Promise<Warehouse[]> {
    return await db.select().from(warehouses).where(eq(warehouses.companyId, companyId));
  }

  async createWarehouse(warehouseData: InsertWarehouse): Promise<Warehouse> {
    const [warehouse] = await db
      .insert(warehouses)
      .values(warehouseData)
      .returning();
    return warehouse;
  }

  async updateWarehouse(id: number, warehouseData: Partial<InsertWarehouse>, companyId: number): Promise<Warehouse | undefined> {
    const [warehouse] = await db
      .update(warehouses)
      .set({ ...warehouseData, updatedAt: new Date() })
      .where(and(eq(warehouses.id, id), eq(warehouses.companyId, companyId)))
      .returning();
    return warehouse;
  }

  async deleteWarehouse(id: number, companyId: number): Promise<void> {
    await db
      .delete(warehouses)
      .where(and(eq(warehouses.id, id), eq(warehouses.companyId, companyId)));
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
    // Get product info to include name
    const [currentProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, itemData.productId));
    
    // Include product name in the item data
    const itemWithName = {
      ...itemData,
      productName: currentProduct?.name || `Producto #${itemData.productId}`
    };
    
    const [item] = await db
      .insert(posSaleItems)
      .values(itemWithName)
      .returning();
    
    // Stock deduction with improved validation
    const quantity = parseInt(itemData.quantity);
    
    if (currentProduct && quantity > 0) {
      // Check if there's enough stock
      if (currentProduct.stock >= quantity) {
        const newStock = currentProduct.stock - quantity;
        await db
          .update(products)
          .set({ 
            stock: newStock,
            updatedAt: new Date() 
          })
          .where(eq(products.id, itemData.productId));
        
        // Register inventory movement
        await db
          .insert(inventoryMovements)
          .values({
            productId: itemData.productId,
            type: "out",
            quantity: -quantity,
            reference: "POS Sale",
            referenceId: itemData.saleId,
            notes: `Venta POS #${itemData.saleId} - Stock reducido automáticamente`,
            companyId: currentProduct.companyId,
          });
      } else {
        console.warn(`Insufficient stock for product ${itemData.productId}. Available: ${currentProduct.stock}, Requested: ${quantity}`);
      }
    }
    
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

  // Notification operations
  async getNotifications(userId: string, companyId: number): Promise<Notification[]> {
    const notificationsList = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId)
        )
      )
      .orderBy(desc(notifications.createdAt));
    return notificationsList;
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true, updatedAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      );
  }

  async deleteNotification(id: number, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      );
  }

  async markAllNotificationsAsRead(userId: string, companyId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true, updatedAt: new Date() })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId)
        )
      );
  }

  async clearAllNotifications(userId: string, companyId: number): Promise<void> {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId)
        )
      );
  }

  // Employee operations
  async getEmployees(companyId: number): Promise<Employee[]> {
    const employeeList = await db
      .select()
      .from(employees)
      .where(eq(employees.companyId, companyId))
      .orderBy(employees.firstName, employees.lastName);
    return employeeList;
  }

  async getEmployee(id: number, companyId: number): Promise<Employee | undefined> {
    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.companyId, companyId)));
    return employee;
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const [employee] = await db
      .insert(employees)
      .values(employeeData)
      .returning();
    return employee;
  }

  async updateEmployee(id: number, employeeData: Partial<InsertEmployee>, companyId: number): Promise<Employee | undefined> {
    const [employee] = await db
      .update(employees)
      .set({ ...employeeData, updatedAt: new Date() })
      .where(and(eq(employees.id, id), eq(employees.companyId, companyId)))
      .returning();
    return employee;
  }

  async deleteEmployee(id: number, companyId: number): Promise<void> {
    await db
      .delete(employees)
      .where(and(eq(employees.id, id), eq(employees.companyId, companyId)));
  }

  // Payroll Period operations
  async getPayrollPeriods(companyId: number): Promise<PayrollPeriod[]> {
    const periods = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.companyId, companyId))
      .orderBy(desc(payrollPeriods.startDate));
    return periods;
  }

  async getPayrollPeriod(id: number, companyId: number): Promise<PayrollPeriod | undefined> {
    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(and(eq(payrollPeriods.id, id), eq(payrollPeriods.companyId, companyId)));
    return period;
  }

  async createPayrollPeriod(periodData: InsertPayrollPeriod): Promise<PayrollPeriod> {
    const [period] = await db
      .insert(payrollPeriods)
      .values(periodData)
      .returning();
    return period;
  }

  async updatePayrollPeriod(id: number, periodData: Partial<InsertPayrollPeriod>, companyId: number): Promise<PayrollPeriod | undefined> {
    const [period] = await db
      .update(payrollPeriods)
      .set({ ...periodData, updatedAt: new Date() })
      .where(and(eq(payrollPeriods.id, id), eq(payrollPeriods.companyId, companyId)))
      .returning();
    return period;
  }

  async deletePayrollPeriod(id: number, companyId: number): Promise<void> {
    await db
      .delete(payrollPeriods)
      .where(and(eq(payrollPeriods.id, id), eq(payrollPeriods.companyId, companyId)));
  }

  // Payroll Entry operations
  async getPayrollEntries(companyId: number, periodId?: number): Promise<PayrollEntry[]> {
    let query = db
      .select()
      .from(payrollEntries)
      .where(eq(payrollEntries.companyId, companyId));
    
    if (periodId) {
      query = query.where(and(eq(payrollEntries.companyId, companyId), eq(payrollEntries.periodId, periodId)));
    }
    
    const entries = await query.orderBy(payrollEntries.id);
    return entries;
  }

  async getPayrollEntry(id: number, companyId: number): Promise<PayrollEntry | undefined> {
    const [entry] = await db
      .select()
      .from(payrollEntries)
      .where(and(eq(payrollEntries.id, id), eq(payrollEntries.companyId, companyId)));
    return entry;
  }

  async createPayrollEntry(entryData: InsertPayrollEntry): Promise<PayrollEntry> {
    const [entry] = await db
      .insert(payrollEntries)
      .values(entryData)
      .returning();
    return entry;
  }

  async updatePayrollEntry(id: number, entryData: Partial<InsertPayrollEntry>, companyId: number): Promise<PayrollEntry | undefined> {
    const [entry] = await db
      .update(payrollEntries)
      .set({ ...entryData, updatedAt: new Date() })
      .where(and(eq(payrollEntries.id, id), eq(payrollEntries.companyId, companyId)))
      .returning();
    return entry;
  }

  async deletePayrollEntry(id: number, companyId: number): Promise<void> {
    await db
      .delete(payrollEntries)
      .where(and(eq(payrollEntries.id, id), eq(payrollEntries.companyId, companyId)));
  }

  // Time Tracking operations
  async getTimeTracking(companyId: number, employeeId?: number): Promise<TimeTracking[]> {
    let query = db
      .select()
      .from(timeTracking)
      .where(eq(timeTracking.companyId, companyId));
    
    if (employeeId) {
      query = query.where(and(eq(timeTracking.companyId, companyId), eq(timeTracking.employeeId, employeeId)));
    }
    
    const entries = await query.orderBy(desc(timeTracking.date));
    return entries;
  }

  async getTimeTrackingEntry(id: number, companyId: number): Promise<TimeTracking | undefined> {
    const [entry] = await db
      .select()
      .from(timeTracking)
      .where(and(eq(timeTracking.id, id), eq(timeTracking.companyId, companyId)));
    return entry;
  }

  async createTimeTracking(timeEntryData: InsertTimeTracking): Promise<TimeTracking> {
    const [entry] = await db
      .insert(timeTracking)
      .values(timeEntryData)
      .returning();
    return entry;
  }

  async updateTimeTracking(id: number, timeEntryData: Partial<InsertTimeTracking>, companyId: number): Promise<TimeTracking | undefined> {
    const [entry] = await db
      .update(timeTracking)
      .set({ ...timeEntryData, updatedAt: new Date() })
      .where(and(eq(timeTracking.id, id), eq(timeTracking.companyId, companyId)))
      .returning();
    return entry;
  }

  async deleteTimeTracking(id: number, companyId: number): Promise<void> {
    await db
      .delete(timeTracking)
      .where(and(eq(timeTracking.id, id), eq(timeTracking.companyId, companyId)));
  }

  // Leave operations
  async getLeaves(companyId: number, employeeId?: number): Promise<Leave[]> {
    let query = db
      .select()
      .from(leaves)
      .where(eq(leaves.companyId, companyId));
    
    if (employeeId) {
      query = query.where(and(eq(leaves.companyId, companyId), eq(leaves.employeeId, employeeId)));
    }
    
    const leaveList = await query.orderBy(desc(leaves.startDate));
    return leaveList;
  }

  async getLeave(id: number, companyId: number): Promise<Leave | undefined> {
    const [leave] = await db
      .select()
      .from(leaves)
      .where(and(eq(leaves.id, id), eq(leaves.companyId, companyId)));
    return leave;
  }

  async createLeave(leaveData: InsertLeave): Promise<Leave> {
    const [leave] = await db
      .insert(leaves)
      .values(leaveData)
      .returning();
    return leave;
  }

  async updateLeave(id: number, leaveData: Partial<InsertLeave>, companyId: number): Promise<Leave | undefined> {
    const [leave] = await db
      .update(leaves)
      .set({ ...leaveData, updatedAt: new Date() })
      .where(and(eq(leaves.id, id), eq(leaves.companyId, companyId)))
      .returning();
    return leave;
  }

  async deleteLeave(id: number, companyId: number): Promise<void> {
    await db
      .delete(leaves)
      .where(and(eq(leaves.id, id), eq(leaves.companyId, companyId)));
  }
}

export const storage = new DatabaseStorage();
