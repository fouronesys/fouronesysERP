import {
  users,
  companies,
  companyUsers,
  warehouses,
  customers,
  products,
  invoices,
  invoiceItems,
  productionOrders,
  bom,
  inventoryMovements,
  posSales,
  posSaleItems,
  posPrintSettings,
  posCashSessions,
  posEmployees,
  posStations,
  posCustomers,
  stockReservations,
  ncfSequences,
  aiChatMessages,
  notifications,
  employees,
  payrollPeriods,
  payrollEntries,
  timeTracking,
  leaves,
  comprobantes605,
  comprobantes606,
  rncRegistry,
  posCartItems,
  chatChannels,
  chatChannelMembers,
  chatMessages,
  messageReactions,
  userRoles,
  userPermissions,
  activityLogs,
  userRoleAssignments,
  accounts,
  accountTypes,
  journalEntries,
  journalEntryLines,
  journals,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Account,
  type JournalEntry,
  type ChatChannel,
  type InsertChatChannel,
  type ChatMessage,
  type InsertChatMessage,
  type UserRole,
  type InsertUserRole,
  type UserPermission,
  type InsertUserPermission,
  type ActivityLog,
  type InsertActivityLog,
  type POSCartItem,
  type InsertPOSCartItem,
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
  // Supplier types moved to purchases module
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
  type POSCashSession,
  type InsertPOSCashSession,
  type POSEmployee,
  type InsertPOSEmployee,
  type POSStation,
  type InsertPOSStation,
  type POSCustomer,
  type InsertPOSCustomer,
  type StockReservation,
  type InsertStockReservation,
  type NCFSequence,
  type InsertNCFSequence,
  type Comprobante605,
  type InsertComprobante605,
  type Comprobante606,
  type InsertComprobante606,
  type RNCRegistry,
  type InsertRNCRegistry,
  type AIChatMessage,
  type InsertAIChatMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, gte, lte, lt, count, sum, isNull, like, or, asc, inArray, ilike } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

// Interface for storage operations
export interface IStorage {
  sessionStore: session.Store;
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isActive?: boolean;
  }): Promise<User>;
  updateUserLastLogin(id: string): Promise<void>;
  updateUserPassword(id: string, password: string): Promise<void>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  createCompany(company: InsertCompany): Promise<Company>;
  getCompanyByUserId(userId: string): Promise<Company | undefined>;
  getCompanyById(id: number): Promise<Company | undefined>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company>;
  deleteCompany(id: number): Promise<void>;
  
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
  getSuppliers(companyId: number): Promise<any[]>;
  createSupplier(supplier: any): Promise<any>;
  
  // Purchase Orders operations
  getPurchaseOrders(companyId: number): Promise<any[]>;
  createPurchaseOrder(order: any): Promise<any>;
  
  // Purchase Invoices operations
  getPurchaseInvoices(companyId: number): Promise<any[]>;
  createPurchaseInvoice(invoice: any): Promise<any>;
  
  // Purchase Stats
  getPurchasesStats(companyId: number): Promise<any>;
  
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

  // RNC Registry operations
  searchRNC(rnc: string): Promise<RNCRegistry | undefined>;
  createRNCRegistry(rncData: InsertRNCRegistry): Promise<RNCRegistry>;
  bulkCreateRNCRegistry(records: InsertRNCRegistry[]): Promise<{ inserted: number; skipped: number }>;
  getRNCRegistryCount(): Promise<number>;

  // NCF Sequence operations for Fiscal Receipts
  getNextNCF(companyId: number, ncfType: string): Promise<string | null>;
  getNCFSequences(companyId: number): Promise<NCFSequence[]>;
  createNCFSequence(ncfData: InsertNCFSequence): Promise<NCFSequence>;
  updateNCFSequence(id: number, sequence: number): Promise<void>;
  incrementNCFSequence(companyId: number, ncfType: string): Promise<void>;

  // POS Multi-Station operations
  // Employee management
  getPOSEmployees(companyId: number): Promise<POSEmployee[]>;
  getPOSEmployee(id: number, companyId: number): Promise<POSEmployee | undefined>;
  createPOSEmployee(employee: InsertPOSEmployee): Promise<POSEmployee>;
  updatePOSEmployee(id: number, employee: Partial<InsertPOSEmployee>, companyId: number): Promise<POSEmployee | undefined>;
  deletePOSEmployee(id: number, companyId: number): Promise<void>;
  authenticatePOSEmployee(employeeCode: string, pin: string, companyId: number): Promise<POSEmployee | null>;
  
  // Station management
  getPOSStations(companyId: number): Promise<POSStation[]>;
  getPOSStation(id: number, companyId: number): Promise<POSStation | undefined>;
  createPOSStation(station: InsertPOSStation): Promise<POSStation>;
  updatePOSStation(id: number, station: Partial<InsertPOSStation>, companyId: number): Promise<POSStation | undefined>;
  deletePOSStation(id: number, companyId: number): Promise<void>;
  
  // Cash session management
  getPOSCashSessions(companyId: number, stationId?: number): Promise<POSCashSession[]>;
  getPOSCashSession(id: number, companyId: number): Promise<POSCashSession | undefined>;
  createPOSCashSession(session: InsertPOSCashSession): Promise<POSCashSession>;
  updatePOSCashSession(id: number, session: Partial<InsertPOSCashSession>, companyId: number): Promise<POSCashSession | undefined>;
  closePOSCashSession(id: number, closingData: any, companyId: number): Promise<POSCashSession | undefined>;
  
  // Customer management with RNC validation
  getPOSCustomers(companyId: number): Promise<POSCustomer[]>;
  getPOSCustomer(id: number, companyId: number): Promise<POSCustomer | undefined>;
  createPOSCustomer(customer: InsertPOSCustomer): Promise<POSCustomer>;
  updatePOSCustomer(id: number, customer: Partial<InsertPOSCustomer>, companyId: number): Promise<POSCustomer | undefined>;
  deletePOSCustomer(id: number, companyId: number): Promise<void>;
  validateCustomerRNC(rnc: string, companyId: number): Promise<{ valid: boolean; data?: any }>;

  // Stock Reservation operations for cart synchronization
  createStockReservation(reservationData: InsertStockReservation): Promise<StockReservation>;
  releaseStockReservations(sessionId: string): Promise<void>;
  getStockReservations(productId: number): Promise<StockReservation[]>;
  cleanExpiredReservations(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      tableName: "sessions"
    });
  }

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
  async createCompany(companyData: InsertCompany & { ownerId: string }): Promise<Company> {
    // Validate company name uniqueness
    const existingCompanyByName = await db
      .select()
      .from(companies)
      .where(eq(companies.name, companyData.name))
      .limit(1);
    
    if (existingCompanyByName.length > 0) {
      throw new Error(`Ya existe una empresa registrada con el nombre "${companyData.name}"`);
    }

    // Validate RNC uniqueness if provided
    if (companyData.rnc && companyData.rnc.trim() !== '') {
      const existingCompanyByRNC = await db
        .select()
        .from(companies)
        .where(eq(companies.rnc, companyData.rnc))
        .limit(1);
      
      if (existingCompanyByRNC.length > 0) {
        throw new Error(`Ya existe una empresa registrada con el RNC "${companyData.rnc}"`);
      }

      // Validate RNC format (Dominican Republic format: 9 or 11 digits)
      const rncPattern = /^[0-9]{9}$|^[0-9]{11}$/;
      if (!rncPattern.test(companyData.rnc)) {
        throw new Error('El RNC debe tener 9 o 11 dígitos');
      }
    }

    // Set trial expiry date for trial companies
    const dataToInsert = { 
      ...companyData,
      rnc: companyData.rnc?.trim() || null // Store null if empty
    };
    if (companyData.subscriptionPlan === 'trial' && !companyData.subscriptionExpiry) {
      const now = new Date();
      const trialExpiry = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000)); // 15 days from now
      dataToInsert.subscriptionExpiry = trialExpiry;
    }
    
    const [company] = await db
      .insert(companies)
      .values({
        ...dataToInsert,
        ownerId: companyData.ownerId
      })
      .returning();
    return company;
  }

  async createCompanyWithInvitation(companyData: Omit<InsertCompany, 'ownerId'> & { 
    ownerEmail: string;
    invitationToken: string;
    invitationExpiresAt: Date;
  }): Promise<Company> {
    // Validate company name uniqueness
    const existingCompanyByName = await db
      .select()
      .from(companies)
      .where(eq(companies.name, companyData.name))
      .limit(1);
    
    if (existingCompanyByName.length > 0) {
      throw new Error(`Ya existe una empresa registrada con el nombre "${companyData.name}"`);
    }

    // Validate email uniqueness
    const existingUserByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, companyData.ownerEmail))
      .limit(1);
    
    if (existingUserByEmail.length > 0) {
      throw new Error(`Ya existe un usuario registrado con el email "${companyData.ownerEmail}"`);
    }

    // Validate RNC uniqueness if provided
    if (companyData.rnc && companyData.rnc.trim() !== '') {
      const existingCompanyByRNC = await db
        .select()
        .from(companies)
        .where(eq(companies.rnc, companyData.rnc))
        .limit(1);
      
      if (existingCompanyByRNC.length > 0) {
        throw new Error(`Ya existe una empresa registrada con el RNC "${companyData.rnc}"`);
      }

      // Validate RNC format (Dominican Republic format: 9 or 11 digits)
      const rncPattern = /^[0-9]{9}$|^[0-9]{11}$/;
      if (!rncPattern.test(companyData.rnc)) {
        throw new Error('El RNC debe tener 9 o 11 dígitos');
      }
    }

    // Create temporary user for the company owner
    const tempUserId = `temp_${Math.random().toString(36).substr(2, 9)}`;
    
    const [tempUser] = await db
      .insert(users)
      .values({
        id: tempUserId,
        email: companyData.ownerEmail,
        firstName: 'Pendiente',
        lastName: 'Registro',
        password: '', // Will be set during registration
        isActive: false, // Inactive until registration is completed
      })
      .returning();

    const [company] = await db
      .insert(companies)
      .values({
        ...companyData,
        rnc: companyData.rnc?.trim() || null, // Store null if empty
        ownerId: tempUser.id,
        registrationStatus: 'pending',
        invitationToken: companyData.invitationToken,
        invitationSentAt: new Date(),
        invitationExpiresAt: companyData.invitationExpiresAt,
      })
      .returning();
    
    return company;
  }

  async getCompanyByInvitationToken(token: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(and(
        eq(companies.invitationToken, token),
        eq(companies.registrationStatus, 'pending'),
        sql`${companies.invitationExpiresAt} > NOW()`
      ))
      .limit(1);
    return company;
  }

  async completeCompanyRegistration(
    token: string, 
    userData: { 
      firstName: string; 
      lastName: string; 
      password: string; 
    }
  ): Promise<{ company: Company; user: User } | null> {
    const company = await this.getCompanyByInvitationToken(token);
    if (!company) return null;

    // Update the temporary user with real data
    const [updatedUser] = await db
      .update(users)
      .set({
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, company.ownerId))
      .returning();

    // Update company registration status
    const [updatedCompany] = await db
      .update(companies)
      .set({
        registrationStatus: 'completed',
        invitationToken: null, // Clear the token
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company.id))
      .returning();

    return { company: updatedCompany, user: updatedUser };
  }

  async updateCompanyInvitationStatus(companyId: number, status: 'pending' | 'completed' | 'expired'): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({
        registrationStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning();
    return company;
  }

  async getCompanyByRNC(rnc: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.rnc, rnc))
      .limit(1);
    return company;
  }

  async getCompanyByUserId(userId: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, userId));
    return company;
  }

  async getCompanyById(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
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

  // Supplier operations moved to purchases module

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
    // Generate automatic image URL if not provided
    const imageUrl = productData.imageUrl || this.generateProductImageUrl(productData.name);
    const resolvedImageUrl = typeof imageUrl === 'string' ? imageUrl : await imageUrl;
    
    const productWithImage = {
      ...productData,
      imageUrl: resolvedImageUrl
    };
    
    const [product] = await db
      .insert(products)
      .values(productWithImage)
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
    try {
      // Get current month POS sales (primary sales data)
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const [posResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(${posSales.total}), 0)` })
        .from(posSales)
        .where(
          and(
            eq(posSales.companyId, companyId),
            sql`${posSales.createdAt} >= ${firstDayOfMonth.toISOString()}`
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
        monthSales: posResult?.total || "0",
        pendingInvoices: pendingResult?.count || 0,
        productsInStock: stockResult?.count || 0,
        productionOrders: productionResult?.count || 0,
      };
    } catch (error) {
      console.error('Error getting dashboard metrics:', error);
      return {
        monthSales: "0",
        pendingInvoices: 0,
        productsInStock: 0,
        productionOrders: 0,
      };
    }
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
      .set(employeeData)
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
    const whereConditions = periodId 
      ? and(eq(payrollEntries.companyId, companyId), eq(payrollEntries.periodId, periodId))
      : eq(payrollEntries.companyId, companyId);
    
    return await db
      .select()
      .from(payrollEntries)
      .where(whereConditions)
      .orderBy(payrollEntries.id);
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
    const whereConditions = employeeId 
      ? and(eq(timeTracking.companyId, companyId), eq(timeTracking.employeeId, employeeId))
      : eq(timeTracking.companyId, companyId);
    
    return await db
      .select()
      .from(timeTracking)
      .where(whereConditions)
      .orderBy(desc(timeTracking.date));
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
    const whereConditions = employeeId 
      ? and(eq(leaves.companyId, companyId), eq(leaves.employeeId, employeeId))
      : eq(leaves.companyId, companyId);
    
    return await db
      .select()
      .from(leaves)
      .where(whereConditions)
      .orderBy(desc(leaves.startDate));
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
  
  // Function to generate product image URL using specified API source
  async generateProductImageUrl(productName: string, productCode?: string, description?: string, source?: string): Promise<string> {
    try {
      // Build comprehensive search query using all available context
      let searchTerms: string[] = [];
      
      // Add product name terms
      if (productName) {
        const nameTerms = productName.toLowerCase()
          .replace(/[^a-záéíóúñü\s]/g, '') // Keep Spanish characters and spaces
          .trim()
          .split(' ')
          .filter(term => term.length > 2); // Filter out short words
        searchTerms.push(...nameTerms);
      }

      // Add description terms if available
      if (description) {
        const descTerms = description.toLowerCase()
          .replace(/[^a-záéíóúñü\s]/g, '')
          .trim()
          .split(' ')
          .filter(term => term.length > 3) // Only meaningful words from description
          .slice(0, 2); // Max 2 terms from description
        searchTerms.push(...descTerms);
      }

      // Add barcode-derived context if available
      if (productCode) {
        // Try to extract brand or category hints from product codes
        const codeHints = this.extractBrandFromCode(productCode);
        if (codeHints) {
          searchTerms.unshift(codeHints); // Prioritize brand hints
        }
      }

      // Enhanced Spanish-to-English translation mapping with brand-specific searches
      const translationMap: { [key: string]: string } = {
        // Dominican rum brands - specific searches for better results
        "ron": "dominican rum bottle",
        "barceló": "Barcelo Dominican rum bottle",
        "brugal": "Brugal Dominican rum bottle", 
        "bermúdez": "Bermudez Dominican rum bottle",
        "mama": "Mama Juana Dominican rum",
        
        // Beer brands
        "cerveza": "beer bottle",
        "presidente": "Presidente Dominican beer bottle",
        "brahma": "Brahma beer bottle",
        "corona": "Corona beer bottle",
        
        // Spirits
        "whisky": "whiskey bottle",
        "vodka": "vodka bottle",
        "brandy": "brandy bottle",
        "gin": "gin bottle",
        
        // Wine and champagne
        "vino": "wine bottle",
        "champagne": "champagne bottle",
        "prosecco": "prosecco bottle",
        
        // Fruits - specific varieties when possible
        "manzana": "red apple fruit",
        "banana": "fresh banana",
        "plátano": "plantain banana",
        "naranja": "orange fruit",
        "limón": "lime lemon",
        "pera": "pear fruit",
        "aguacate": "avocado fruit",
        "mango": "tropical mango",
        "piña": "pineapple fruit",
        "papaya": "papaya fruit",
        "chinola": "passion fruit",
        
        // Meat and protein
        "pollo": "chicken meat",
        "carne": "beef meat",
        "cerdo": "pork meat",
        "pescado": "fresh fish",
        "camarones": "shrimp seafood",
        "langosta": "lobster seafood",
        
        // Dairy and eggs
        "leche": "milk carton",
        "queso": "cheese block",
        "huevos": "eggs carton",
        "yogurt": "yogurt container",
        
        // Grains and staples
        "arroz": "rice bag",
        "frijoles": "beans bag",
        "habichuelas": "red beans",
        "pan": "bread loaf",
        "pasta": "pasta package",
        "espaguetis": "spaghetti pasta",
        
        // Beverages non-alcoholic
        "café": "coffee beans",
        "té": "tea bag",
        "agua": "water bottle",
        "jugo": "fruit juice bottle",
        "refresco": "soda bottle",
        "cola": "cola soda",
        
        // Snacks and sweets
        "chocolate": "chocolate bar",
        "galletas": "cookies package",
        "dulces": "candy sweets",
        "helado": "ice cream",
        
        // Electronics
        "teléfono": "smartphone device",
        "laptop": "laptop computer",
        "tablet": "tablet device",
        "auriculares": "headphones audio",
        "televisor": "television screen",
        "radio": "radio device",
        
        // Personal care
        "champú": "shampoo bottle",
        "jabón": "soap bar",
        "pastadental": "toothpaste tube",
        "crema": "face cream jar",
        "perfume": "perfume bottle",
        "desodorante": "deodorant stick",
        "cepillo": "toothbrush",
        
        // Household items
        "detergente": "laundry detergent",
        "limpiador": "cleaning product",
        "papel": "toilet paper",
        "toalla": "towel fabric",
        "servilletas": "napkins package"
      };

      // Translate terms and prioritize brand-specific searches
      const translatedTerms = searchTerms.map(term => {
        const translated = translationMap[term];
        return translated || term;
      });

      // Create multiple search queries with different priorities
      const searchQueries = [];
      
      // Primary query: Most specific with brand if available
      if (translatedTerms.length > 0) {
        searchQueries.push(translatedTerms.slice(0, 2).join(' ')); // Top 2 most relevant terms
      }
      
      // Secondary query: Just the main product name translated
      if (productName) {
        const mainTerm = productName.toLowerCase().split(' ')[0];
        const mainTranslated = translationMap[mainTerm] || mainTerm;
        if (mainTranslated && !searchQueries.includes(mainTranslated)) {
          searchQueries.push(mainTranslated);
        }
      }
      
      // Tertiary query: Generic fallback
      if (translatedTerms.length > 0) {
        const fallback = translatedTerms[0];
        if (fallback && !searchQueries.includes(fallback)) {
          searchQueries.push(fallback);
        }
      }
      
      // Use specific API based on source parameter
      if (source === 'google' && process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
        // Try Google Custom Search API only
        for (const query of searchQueries) {
          if (query && query.trim()) {
            try {
              const googleQuery = `${query} product image`;
              const response = await fetch(
                `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(googleQuery)}&searchType=image&num=3&imgSize=medium&safe=active&fileType=jpg,png`,
              );

              if (response.ok) {
                const data = await response.json();
                if (data.items && data.items.length > 0) {
                  // Return the first image result
                  return data.items[0].link;
                }
              } else {
                console.error(`Google API Error: ${response.status} - ${await response.text()}`);
              }
            } catch (error) {
              console.error(`Error with Google search query "${query}":`, error);
              continue; // Try next query
            }
          }
        }
        
        // If Google API fails, try Pexels as alternative
        if (process.env.PEXELS_API_KEY) {
          for (const query of searchQueries) {
            if (query && query.trim()) {
              try {
                const response = await fetch(
                  `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=square`,
                  {
                    headers: {
                      'Authorization': process.env.PEXELS_API_KEY
                    }
                  }
                );

                if (response.ok) {
                  const data = await response.json();
                  if (data.photos && data.photos.length > 0) {
                    return data.photos[0].src.medium;
                  }
                }
              } catch (error) {
                console.error(`Error with Pexels query "${query}":`, error);
                continue;
              }
            }
          }
        }
      } else if (source === 'unsplash' && process.env.UNSPLASH_ACCESS_KEY) {
        // Try Unsplash API only
        for (const query of searchQueries) {
          if (query && query.trim()) {
            try {
              const response = await fetch(
                `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=squarish`,
                {
                  headers: {
                    'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
                  }
                }
              );

              if (response.ok) {
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                  // Return the first good result (highest relevance score)
                  return data.results[0].urls.regular;
                }
              }
            } catch (error) {
              console.error(`Error with Unsplash query "${query}":`, error);
              continue; // Try next query
            }
          }
        }
      } else {
        // Default behavior - try Google first, then Unsplash
        if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID) {
          for (const query of searchQueries) {
            if (query && query.trim()) {
              try {
                const googleQuery = `${query} product image`;
                const response = await fetch(
                  `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_SEARCH_ENGINE_ID}&q=${encodeURIComponent(googleQuery)}&searchType=image&num=3&imgSize=medium&safe=active`,
                );

                if (response.ok) {
                  const data = await response.json();
                  if (data.items && data.items.length > 0) {
                    return data.items[0].link;
                  }
                }
              } catch (error) {
                console.error(`Error with Google search query "${query}":`, error);
                continue;
              }
            }
          }
        }

        // Fallback to Unsplash if Google fails
        if (process.env.UNSPLASH_ACCESS_KEY) {
          for (const query of searchQueries) {
            if (query && query.trim()) {
              try {
                const response = await fetch(
                  `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=squarish`,
                  {
                    headers: {
                      'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
                    }
                  }
                );

                if (response.ok) {
                  const data = await response.json();
                  if (data.results && data.results.length > 0) {
                    return data.results[0].urls.regular;
                  }
                }
              } catch (error) {
                console.error(`Error with Unsplash query "${query}":`, error);
                continue;
              }
            }
          }
        }
      }

      // Fallback to a placeholder service if Unsplash fails
      return `https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(productName)}`;
    } catch (error) {
      console.error('Error generating product image:', error);
      // Return placeholder on error
      return `https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(productName)}`;
    }
  }

  // Helper function to extract brand hints from product codes
  private extractBrandFromCode(productCode: string): string | null {
    const code = productCode.toLowerCase();
    
    // Enhanced brand patterns for Dominican Republic
    const brandPatterns: { [key: string]: string } = {
      // Rum brands - more specific patterns
      "barc": "Barcelo Dominican rum bottle",
      "brug": "Brugal Dominican rum bottle", 
      "berm": "Bermudez Dominican rum bottle",
      "maca": "Macorix Dominican rum bottle",
      
      // Beer brands
      "pres": "Presidente Dominican beer bottle",
      "brah": "Brahma beer bottle",
      "coro": "Corona beer bottle",
      "hein": "Heineken beer bottle",
      
      // Food and consumer brands
      "goya": "Goya food product",
      "maggi": "Maggi seasoning",
      "nest": "Nestle product",
      "coca": "Coca Cola bottle",
      "peps": "Pepsi bottle",
      "fant": "Fanta orange soda",
      
      // Local Dominican brands
      "rica": "Rica product Dominican",
      "cibao": "Cibao product Dominican",
      "yuca": "Yuca product Dominican",
      
      // Volume indicators for better context
      "750ml": "750ml bottle",
      "355ml": "355ml can",
      "500ml": "500ml bottle",
      "1lt": "1 liter bottle",
      "2lt": "2 liter bottle"
    };

    for (const [pattern, brand] of Object.entries(brandPatterns)) {
      if (code.includes(pattern)) {
        return brand;
      }
    }

    return null;
  }



  // NCF Management
  async getNCFSequences(companyId: number): Promise<NCFSequence[]> {
    return await db.select().from(ncfSequences).where(eq(ncfSequences.companyId, companyId));
  }

  // NCF Sequence operations for Fiscal Receipts
  async getNextNCF(companyId: number, ncfType: string = "B01"): Promise<string | null> {
    // Get the current NCF sequence for this company and type
    let [sequence] = await db
      .select()
      .from(ncfSequences)
      .where(
        and(
          eq(ncfSequences.companyId, companyId),
          eq(ncfSequences.ncfType, ncfType),
          eq(ncfSequences.isActive, true)
        )
      );

    // If no sequence exists, return null
    if (!sequence) {
      return null;
    }

    // Get current sequence (default to 0 if null)
    const currentSeq = sequence.currentSequence || 0;
    const newSequence = currentSeq + 1;
    
    // Update sequence
    await this.updateNCFSequence(sequence.id, newSequence);

    // Format NCF: B01 + 8-digit sequence
    const ncf = `${ncfType}${newSequence.toString().padStart(8, '0')}`;

    return ncf;
  }

  async createNCFSequence(data: InsertNCFSequence): Promise<NCFSequence> {
    const [sequence] = await db
      .insert(ncfSequences)
      .values(data)
      .returning();
    return sequence;
  }

  async updateNCFSequence(id: number, sequence: number): Promise<void> {
    await db
      .update(ncfSequences)
      .set({ 
        currentSequence: sequence,
        updatedAt: new Date()
      })
      .where(eq(ncfSequences.id, id));
  }

  async incrementNCFSequence(companyId: number, ncfType: string): Promise<void> {
    await db
      .update(ncfSequences)
      .set({ 
        currentSequence: sql`${ncfSequences.currentSequence} + 1`,
        updatedAt: new Date()
      })
      .where(and(
        eq(ncfSequences.companyId, companyId),
        eq(ncfSequences.ncfType, ncfType),
        eq(ncfSequences.isActive, true)
      ));
  }

  // Comprobantes 605 (Compras)
  async getComprobantes605(companyId: number, period: string): Promise<Comprobante605[]> {
    return await db
      .select()
      .from(comprobantes605)
      .where(and(
        eq(comprobantes605.companyId, companyId),
        eq(comprobantes605.period, period)
      ));
  }

  async createComprobante605(data: InsertComprobante605): Promise<Comprobante605> {
    const [comprobante] = await db
      .insert(comprobantes605)
      .values(data)
      .returning();
    return comprobante;
  }

  async generateComprobantes605(companyId: number, period: string): Promise<Comprobante605[]> {
    // Generate 605 from invoices (purchases) for the period
    const startDate = new Date(`${period}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const invoicesData = await db
      .select({
        invoice: invoices,
        customer: customers
      })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(and(
        eq(invoices.companyId, companyId),
        gte(invoices.createdAt, startDate),
        lte(invoices.createdAt, endDate)
      ));

    const comprobantes: InsertComprobante605[] = [];

    for (const { invoice, customer } of invoicesData) {
      if (customer) {
        comprobantes.push({
          companyId,
          period,
          rncCedula: customer.rnc || "00000000000",
          tipoIdentificacion: customer.rnc ? "1" : "2",
          tipoComprobante: "01", // Factura
          ncf: invoice.ncf,
          fechaComprobante: invoice.createdAt || new Date(),
          montoFacturado: invoice.subtotal,
          itbisFacturado: invoice.itbis,
          montoTotal: invoice.total,
        });
      }
    }

    // Insert all comprobantes
    const results: Comprobante605[] = [];
    for (const comprobante of comprobantes) {
      const result = await this.createComprobante605(comprobante);
      results.push(result);
    }

    return results;
  }

  // RNC Registry operations
  async getRNCFromRegistry(rnc: string): Promise<RNCRegistry | undefined> {
    const [rncData] = await db
      .select()
      .from(rncRegistry)
      .where(eq(rncRegistry.rnc, rnc))
      .limit(1);
    return rncData;
  }



  // Comprobantes 606 (Ventas)
  async getComprobantes606(companyId: number, period: string): Promise<Comprobante606[]> {
    return await db
      .select()
      .from(comprobantes606)
      .where(and(
        eq(comprobantes606.companyId, companyId),
        eq(comprobantes606.period, period)
      ));
  }

  async createComprobante606(data: InsertComprobante606): Promise<Comprobante606> {
    const [comprobante] = await db
      .insert(comprobantes606)
      .values(data)
      .returning();
    return comprobante;
  }

  async generateComprobantes606(companyId: number, period: string): Promise<Comprobante606[]> {
    // Generate 606 from POS sales for the period
    const startDate = new Date(`${period}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const salesData = await db
      .select()
      .from(posSales)
      .where(and(
        eq(posSales.companyId, companyId),
        gte(posSales.createdAt, startDate),
        lte(posSales.createdAt, endDate)
      ));

    const comprobantes: InsertComprobante606[] = [];

    for (const sale of salesData) {
      // For POS sales, use customer data if available, otherwise use "00000000000"
      const rncCedula = sale.customerPhone || "00000000000";
      
      comprobantes.push({
        companyId,
        period,
        rncCedula,
        tipoIdentificacion: "2", // Assume cedula for POS sales
        tipoComprobante: "02", // Consumidor final
        ncf: sale.ncf,
        fechaComprobante: sale.createdAt || new Date(),
        montoFacturado: sale.subtotal,
        itbisFacturado: sale.itbis,
      });
    }

    // Insert all comprobantes
    const results: Comprobante606[] = [];
    for (const comprobante of comprobantes) {
      const result = await this.createComprobante606(comprobante);
      results.push(result);
    }

    return results;
  }



  async bulkInsertRNCRegistry(data: InsertRNCRegistry[]): Promise<void> {
    if (data.length === 0) return;
    
    // Insert in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await db.insert(rncRegistry).values(batch).onConflictDoNothing();
    }
  }

  // AI Chat Messages
  async saveAIChatMessage(data: InsertAIChatMessage): Promise<AIChatMessage> {
    const [message] = await db
      .insert(aiChatMessages)
      .values(data)
      .returning();
    return message;
  }

  async getAIChatMessages(companyId: number, userId: string, limit: number = 50): Promise<AIChatMessage[]> {
    return await db
      .select()
      .from(aiChatMessages)
      .where(and(
        eq(aiChatMessages.companyId, companyId),
        eq(aiChatMessages.userId, userId)
      ))
      .orderBy(desc(aiChatMessages.createdAt))
      .limit(limit);
  }

  // Chat System Methods
  
  async getChatChannels(companyId: number, userId: string): Promise<ChatChannel[]> {
    return await db
      .select({
        id: chatChannels.id,
        name: chatChannels.name,
        description: chatChannels.description,
        type: chatChannels.type,
        companyId: chatChannels.companyId,
        createdBy: chatChannels.createdBy,
        isActive: chatChannels.isActive,
        createdAt: chatChannels.createdAt,
        updatedAt: chatChannels.updatedAt
      })
      .from(chatChannels)
      .innerJoin(chatChannelMembers, eq(chatChannels.id, chatChannelMembers.channelId))
      .where(and(
        eq(chatChannels.companyId, companyId),
        eq(chatChannelMembers.userId, userId),
        eq(chatChannels.isActive, true)
      ))
      .orderBy(desc(chatChannels.createdAt));
  }

  async createChatChannel(data: InsertChatChannel): Promise<ChatChannel> {
    const [channel] = await db
      .insert(chatChannels)
      .values(data)
      .returning();
    
    // Add creator as admin member
    await db
      .insert(chatChannelMembers)
      .values({
        channelId: channel.id,
        userId: data.createdBy,
        role: 'admin'
      });

    return channel;
  }

  async getChatMessages(channelId: number, limit: number = 50, offset: number = 0): Promise<ChatMessage[]> {
    return await db
      .select({
        id: chatMessages.id,
        channelId: chatMessages.channelId,
        senderId: chatMessages.senderId,
        content: chatMessages.content,
        messageType: chatMessages.messageType,
        fileUrl: chatMessages.fileUrl,
        fileName: chatMessages.fileName,
        replyToId: chatMessages.replyToId,
        isEdited: chatMessages.isEdited,
        editedAt: chatMessages.editedAt,
        isDeleted: chatMessages.isDeleted,
        deletedAt: chatMessages.deletedAt,
        createdAt: chatMessages.createdAt,
        updatedAt: chatMessages.updatedAt,
        senderName: users.firstName,
        senderLastName: users.lastName,
        senderProfileImage: users.profileImageUrl
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.senderId, users.id))
      .where(and(
        eq(chatMessages.channelId, channelId),
        eq(chatMessages.isDeleted, false)
      ))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createChatMessage(data: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(data)
      .returning();
    return message;
  }

  async userHasChannelAccess(userId: string, channelId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(chatChannelMembers)
      .where(and(
        eq(chatChannelMembers.userId, userId),
        eq(chatChannelMembers.channelId, channelId)
      ))
      .limit(1);
    
    return !!member;
  }

  // User Management Methods

  async getCompanyUsers(companyId: number): Promise<any[]> {
    return await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        isActive: users.isActive,
        isOnline: users.isOnline,
        lastSeen: users.lastSeen,
        jobTitle: users.jobTitle,
        department: users.department,
        phoneNumber: users.phoneNumber,
        role: companyUsers.role,
        permissions: companyUsers.permissions,
        createdAt: users.createdAt
      })
      .from(users)
      .innerJoin(companyUsers, eq(users.id, companyUsers.userId))
      .where(and(
        eq(companyUsers.companyId, companyId),
        eq(users.isActive, true)
      ))
      .orderBy(users.firstName);
  }

  async createUserRole(data: InsertUserRole): Promise<UserRole> {
    const [role] = await db
      .insert(userRoles)
      .values(data)
      .returning();
    return role;
  }

  async getUserPermissions(userId: string, companyId: number): Promise<UserPermission[]> {
    return await db
      .select()
      .from(userPermissions)
      .where(and(
        eq(userPermissions.userId, userId),
        eq(userPermissions.companyId, companyId)
      ));
  }

  async updateUserPermissions(data: InsertUserPermission): Promise<UserPermission> {
    // First try to update existing permission
    const existing = await db
      .select()
      .from(userPermissions)
      .where(and(
        eq(userPermissions.userId, data.userId),
        eq(userPermissions.companyId, data.companyId),
        eq(userPermissions.module, data.module)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(userPermissions)
        .set({
          permissions: data.permissions,
          updatedAt: new Date()
        })
        .where(eq(userPermissions.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(userPermissions)
        .values(data)
        .returning();
      return created;
    }
  }

  async logActivity(data: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db
      .insert(activityLogs)
      .values(data)
      .returning();
    return log;
  }

  async getActivityLogs(companyId: number, limit: number = 50): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.companyId, companyId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
  }

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await db
      .update(users)
      .set({
        isOnline,
        lastSeen: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Email/Password Authentication Methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    isActive?: boolean;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id: Math.random().toString(36).substr(2, 9), // Generate random ID
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        isActive: userData.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    await db
      .update(users)
      .set({
        password,
        updatedAt: new Date()
      })
      .where(eq(users.id, id));
  }

  async createCompanyUser(data: {
    userId: string;
    companyId: number;
    role: string;
    permissions: string[];
    isActive: boolean;
  }): Promise<CompanyUser> {
    const [companyUser] = await db
      .insert(companyUsers)
      .values({
        userId: data.userId,
        companyId: data.companyId,
        role: data.role,
        permissions: data.permissions,
        isActive: data.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return companyUser;
  }

  async getCompanyUserCount(companyId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(companyUsers)
      .where(and(eq(companyUsers.companyId, companyId), eq(companyUsers.isActive, true)));
    return result[0]?.count || 0;
  }

  async canAddUserToCompany(companyId: number): Promise<boolean> {
    const company = await this.getCompany(companyId);
    if (!company) return false;

    const currentUserCount = await this.getCompanyUserCount(companyId);
    
    // Default plan allows 5 users
    return currentUserCount < 5;
  }

  async updateCompanyStatus(companyId: number, isActive: boolean): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ 
        isActive,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();
    
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }
    
    return company;
  }

  async deleteCompany(companyId: number): Promise<void> {
    // Delete related data first
    await db.delete(products).where(eq(products.companyId, companyId));
    await db.delete(customers).where(eq(customers.companyId, companyId));
    await db.delete(invoices).where(eq(invoices.companyId, companyId));
    await db.delete(employees).where(eq(employees.companyId, companyId));
    await db.delete(companyUsers).where(eq(companyUsers.companyId, companyId));
    
    // Delete the company
    await db.delete(companies).where(eq(companies.id, companyId));
  }



  // RNC Registry operations
  async searchRNC(rnc: string): Promise<RNCRegistry | undefined> {
    const [result] = await db.select().from(rncRegistry).where(eq(rncRegistry.rnc, rnc));
    return result;
  }

  async createRNCRegistry(rncData: InsertRNCRegistry): Promise<RNCRegistry> {
    const [result] = await db
      .insert(rncRegistry)
      .values(rncData)
      .onConflictDoUpdate({
        target: rncRegistry.rnc,
        set: {
          razonSocial: rncData.razonSocial,
          nombreComercial: rncData.nombreComercial,
          categoria: rncData.categoria,
          regimen: rncData.regimen,
          estado: rncData.estado,
          lastUpdated: new Date()
        }
      })
      .returning();
    return result;
  }

  async bulkCreateRNCRegistry(records: InsertRNCRegistry[]): Promise<{ inserted: number; skipped: number }> {
    if (records.length === 0) {
      return { inserted: 0, skipped: 0 };
    }

    try {
      // Use insert with onConflictDoUpdate for bulk operations
      const result = await db
        .insert(rncRegistry)
        .values(records)
        .onConflictDoUpdate({
          target: rncRegistry.rnc,
          set: {
            razonSocial: sql`excluded.razon_social`,
            nombreComercial: sql`excluded.nombre_comercial`,
            categoria: sql`excluded.categoria`,
            regimen: sql`excluded.regimen`,
            estado: sql`excluded.estado`,
            lastUpdated: new Date()
          }
        });

      return { inserted: records.length, skipped: 0 };
    } catch (error) {
      console.error('Bulk insert failed, falling back to individual inserts:', error);
      
      // Fallback: process individually
      let inserted = 0;
      let skipped = 0;
      
      for (const record of records) {
        try {
          const existing = await this.searchRNC(record.rnc);
          if (!existing) {
            await this.createRNCRegistry(record);
            inserted++;
          } else {
            skipped++;
          }
        } catch (error) {
          console.error(`Failed to insert RNC ${record.rnc}:`, error);
          skipped++;
        }
      }
      
      return { inserted, skipped };
    }
  }

  async getRNCRegistryCount(): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(rncRegistry);
    return Number(result[0].count);
  }

  // Purchases Module Implementation
  async getSuppliers(companyId: number): Promise<any[]> {
    try {
      const result = await db.select().from(customers).where(eq(customers.companyId, companyId));
      return result.map(customer => ({
        id: customer.id,
        name: customer.name,
        rnc: customer.rnc,
        email: customer.email,
        phone: customer.phone,
        isActive: true,
        category: "Proveedor",
        contactPerson: customer.name,
        currentBalance: "0.00"
      }));
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      return [];
    }
  }

  async createSupplier(supplier: any): Promise<any> {
    try {
      const [result] = await db
        .insert(customers)
        .values({
          ...supplier,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return {
        ...result,
        category: "Proveedor",
        contactPerson: result.name,
        currentBalance: "0.00"
      };
    } catch (error) {
      console.error("Error creating supplier:", error);
      throw error;
    }
  }

  async getPurchaseOrders(companyId: number): Promise<any[]> {
    try {
      // Using existing invoices table as purchase orders for now
      const result = await db.select().from(invoices).where(eq(invoices.companyId, companyId));
      return result.map(invoice => ({
        id: invoice.id,
        orderNumber: `PO-${String(invoice.id).padStart(6, '0')}`,
        status: "pending",
        supplier: { name: "Proveedor Genérico" },
        orderDate: invoice.date || new Date().toISOString().split('T')[0],
        totalAmount: invoice.total || "0.00",
        currency: "DOP"
      }));
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      return [];
    }
  }

  async createPurchaseOrder(order: any): Promise<any> {
    try {
      const [result] = await db
        .insert(invoices)
        .values({
          ...order,
          companyId: order.companyId,
          date: new Date().toISOString().split('T')[0],
          total: order.totalAmount || "0.00",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return {
        id: result.id,
        orderNumber: `PO-${String(result.id).padStart(6, '0')}`,
        status: "pending",
        supplier: { name: "Proveedor Genérico" },
        orderDate: result.date || new Date().toISOString().split('T')[0],
        totalAmount: result.total || "0.00",
        currency: "DOP"
      };
    } catch (error) {
      console.error("Error creating purchase order:", error);
      throw error;
    }
  }

  async getPurchaseInvoices(companyId: number): Promise<any[]> {
    try {
      const result = await db.select().from(invoices).where(eq(invoices.companyId, companyId));
      return result.map(invoice => ({
        id: invoice.id,
        invoiceNumber: `PI-${String(invoice.id).padStart(6, '0')}`,
        paymentStatus: "pending",
        type: "purchase",
        supplier: { name: "Proveedor Genérico" },
        ncf: invoice.ncf,
        invoiceDate: invoice.date || new Date().toISOString().split('T')[0],
        totalAmount: invoice.total || "0.00",
        paidAmount: "0.00"
      }));
    } catch (error) {
      console.error("Error fetching purchase invoices:", error);
      return [];
    }
  }

  async createPurchaseInvoice(invoice: any): Promise<any> {
    try {
      const [result] = await db
        .insert(invoices)
        .values({
          ...invoice,
          companyId: invoice.companyId,
          issueDate: new Date(),
          totalAmount: invoice.totalAmount || "0.00",
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      return {
        id: result.id,
        invoiceNumber: `PI-${String(result.id).padStart(6, '0')}`,
        paymentStatus: "pending",
        type: "purchase",
        supplier: { name: "Proveedor Genérico" },
        ncf: result.ncf,
        invoiceDate: result.date || new Date().toISOString().split('T')[0],
        totalAmount: result.total || "0.00",
        paidAmount: "0.00"
      };
    } catch (error) {
      console.error("Error creating purchase invoice:", error);
      throw error;
    }
  }

  async getPurchasesStats(companyId: number): Promise<any> {
    try {
      const suppliers = await this.getSuppliers(companyId);
      const orders = await this.getPurchaseOrders(companyId);
      const invoices = await this.getPurchaseInvoices(companyId);
      
      const pendingOrders = orders.filter(order => order.status === "pending");
      const pendingInvoices = invoices.filter(invoice => invoice.paymentStatus === "pending");
      
      const pendingOrdersValue = pendingOrders.reduce((total, order) => 
        total + parseFloat(order.totalAmount || "0"), 0
      ).toFixed(2);
      
      const pendingPayments = pendingInvoices.reduce((total, invoice) => 
        total + parseFloat(invoice.totalAmount || "0"), 0
      ).toFixed(2);

      const monthlyExpenses = invoices.reduce((total, invoice) => 
        total + parseFloat(invoice.totalAmount || "0"), 0
      ).toFixed(2);

      return {
        totalSuppliers: suppliers.length,
        newSuppliersThisMonth: Math.floor(suppliers.length * 0.1),
        pendingOrders: pendingOrders.length,
        pendingOrdersValue: `$${pendingOrdersValue}`,
        pendingInvoices: pendingInvoices.length,
        pendingPayments: `$${pendingPayments}`,
        monthlyExpenses: `$${monthlyExpenses}`,
        expenseChange: "+12.5%"
      };
    } catch (error) {
      console.error("Error fetching purchases stats:", error);
      return {
        totalSuppliers: 0,
        newSuppliersThisMonth: 0,
        pendingOrders: 0,
        pendingOrdersValue: "$0.00",
        pendingInvoices: 0,
        pendingPayments: "$0.00",
        monthlyExpenses: "$0.00",
        expenseChange: "0%"
      };
    }
  }

  // POS Cart Management
  async getPOSCartItems(companyId: number, userId: string): Promise<any[]> {
    const cartItems = await db
      .select({
        id: posCartItems.id,
        productId: posCartItems.productId,
        quantity: posCartItems.quantity,
        unitPrice: posCartItems.unitPrice,
        subtotal: posCartItems.subtotal,
        product: products
      })
      .from(posCartItems)
      .leftJoin(products, eq(posCartItems.productId, products.id))
      .where(and(eq(posCartItems.companyId, companyId), eq(posCartItems.userId, userId)));
    
    return cartItems;
  }

  async addToPOSCart(cartItem: InsertPOSCartItem): Promise<POSCartItem> {
    // Check product availability and stock
    const product = await this.getProduct(cartItem.productId, cartItem.companyId);
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const currentStock = parseFloat(String(product.stock || 0));
    
    // Check if item already exists in cart
    const existingItem = await db
      .select()
      .from(posCartItems)
      .where(and(
        eq(posCartItems.companyId, cartItem.companyId),
        eq(posCartItems.userId, cartItem.userId),
        eq(posCartItems.productId, cartItem.productId)
      ))
      .limit(1);

    if (existingItem.length > 0) {
      // Update existing item quantity
      const newQuantity = existingItem[0].quantity + cartItem.quantity;
      
      // Validate stock availability
      if (currentStock < newQuantity) {
        throw new Error(`Stock insuficiente. Disponible: ${currentStock}, solicitado: ${newQuantity}`);
      }
      
      const newSubtotal = newQuantity * parseFloat(cartItem.unitPrice.toString());
      
      const [updated] = await db
        .update(posCartItems)
        .set({
          quantity: newQuantity,
          subtotal: newSubtotal.toString(),
          updatedAt: new Date()
        })
        .where(eq(posCartItems.id, existingItem[0].id))
        .returning();
      
      return updated;
    } else {
      // Validate stock for new item
      if (currentStock < cartItem.quantity) {
        throw new Error(`Stock insuficiente. Disponible: ${currentStock}, solicitado: ${cartItem.quantity}`);
      }
      
      // Insert new item
      const [newItem] = await db.insert(posCartItems).values(cartItem).returning();
      return newItem;
    }
  }

  async updatePOSCartItem(id: number, quantity: number): Promise<POSCartItem | null> {
    const [item] = await db.select().from(posCartItems).where(eq(posCartItems.id, id)).limit(1);
    if (!item) return null;

    // If quantity is 0, remove the item
    if (quantity <= 0) {
      await this.removePOSCartItem(id);
      return null;
    }

    // Validate stock availability
    const product = await this.getProduct(item.productId, item.companyId);
    if (!product) {
      throw new Error('Producto no encontrado');
    }

    const currentStock = parseFloat(String(product.stock || 0));
    if (currentStock < quantity) {
      throw new Error(`Stock insuficiente. Disponible: ${currentStock}, solicitado: ${quantity}`);
    }

    const newSubtotal = quantity * parseFloat(item.unitPrice.toString());
    
    const [updated] = await db
      .update(posCartItems)
      .set({
        quantity,
        subtotal: newSubtotal.toString(),
        updatedAt: new Date()
      })
      .where(eq(posCartItems.id, id))
      .returning();
    
    return updated;
  }

  async removePOSCartItem(id: number): Promise<boolean> {
    const result = await db.delete(posCartItems).where(eq(posCartItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  async clearPOSCart(companyId: number, userId: string): Promise<boolean> {
    const result = await db
      .delete(posCartItems)
      .where(and(eq(posCartItems.companyId, companyId), eq(posCartItems.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  // POS Multi-Station Implementation
  // Employee management methods
  async getPOSEmployees(companyId: number): Promise<POSEmployee[]> {
    return await db.select().from(posEmployees).where(eq(posEmployees.companyId, companyId));
  }

  async getPOSEmployee(id: number, companyId: number): Promise<POSEmployee | undefined> {
    const [employee] = await db
      .select()
      .from(posEmployees)
      .where(and(eq(posEmployees.id, id), eq(posEmployees.companyId, companyId)));
    return employee;
  }

  async createPOSEmployee(employee: InsertPOSEmployee): Promise<POSEmployee> {
    const [created] = await db.insert(posEmployees).values(employee).returning();
    return created;
  }

  async updatePOSEmployee(id: number, employee: Partial<InsertPOSEmployee>, companyId: number): Promise<POSEmployee | undefined> {
    const [updated] = await db
      .update(posEmployees)
      .set({ ...employee, updatedAt: new Date() })
      .where(and(eq(posEmployees.id, id), eq(posEmployees.companyId, companyId)))
      .returning();
    return updated;
  }

  async deletePOSEmployee(id: number, companyId: number): Promise<void> {
    await db.delete(posEmployees).where(and(eq(posEmployees.id, id), eq(posEmployees.companyId, companyId)));
  }

  async authenticatePOSEmployee(employeeCode: string, pin: string, companyId: number): Promise<POSEmployee | null> {
    const [employee] = await db
      .select()
      .from(posEmployees)
      .where(and(
        eq(posEmployees.employeeCode, employeeCode),
        eq(posEmployees.pin, pin),
        eq(posEmployees.companyId, companyId),
        eq(posEmployees.isActive, true)
      ));
    
    if (employee) {
      return employee;
    }
    return null;
  }

  // Station management methods
  async getPOSStations(companyId: number): Promise<POSStation[]> {
    return await db.select().from(posStations).where(eq(posStations.companyId, companyId));
  }

  async getPOSStation(id: number, companyId: number): Promise<POSStation | undefined> {
    const [station] = await db
      .select()
      .from(posStations)
      .where(and(eq(posStations.id, id), eq(posStations.companyId, companyId)));
    return station;
  }

  async createPOSStation(station: InsertPOSStation): Promise<POSStation> {
    const [created] = await db.insert(posStations).values(station).returning();
    return created;
  }

  async updatePOSStation(id: number, station: Partial<InsertPOSStation>, companyId: number): Promise<POSStation | undefined> {
    const [updated] = await db
      .update(posStations)
      .set({ ...station, updatedAt: new Date() })
      .where(and(eq(posStations.id, id), eq(posStations.companyId, companyId)))
      .returning();
    return updated;
  }

  async deletePOSStation(id: number, companyId: number): Promise<void> {
    await db.delete(posStations).where(and(eq(posStations.id, id), eq(posStations.companyId, companyId)));
  }

  // Cash session management methods
  async getPOSCashSessions(companyId: number, stationId?: number): Promise<POSCashSession[]> {
    const whereConditions = stationId 
      ? and(eq(posCashSessions.companyId, companyId), eq(posCashSessions.stationId, stationId))
      : eq(posCashSessions.companyId, companyId);
    
    return await db
      .select()
      .from(posCashSessions)
      .where(whereConditions)
      .orderBy(desc(posCashSessions.openedAt));
  }

  async getPOSCashSession(id: number, companyId: number): Promise<POSCashSession | undefined> {
    const [session] = await db
      .select()
      .from(posCashSessions)
      .where(and(eq(posCashSessions.id, id), eq(posCashSessions.companyId, companyId)));
    return session;
  }

  async createPOSCashSession(session: InsertPOSCashSession): Promise<POSCashSession> {
    const [created] = await db.insert(posCashSessions).values(session).returning();
    return created;
  }

  async updatePOSCashSession(id: number, session: Partial<InsertPOSCashSession>, companyId: number): Promise<POSCashSession | undefined> {
    const [updated] = await db
      .update(posCashSessions)
      .set(session)
      .where(and(eq(posCashSessions.id, id), eq(posCashSessions.companyId, companyId)))
      .returning();
    return updated;
  }

  async closePOSCashSession(id: number, closingData: any, companyId: number): Promise<POSCashSession | undefined> {
    const [updated] = await db
      .update(posCashSessions)
      .set({
        ...closingData,
        status: 'closed',
        closedAt: new Date()
      })
      .where(and(eq(posCashSessions.id, id), eq(posCashSessions.companyId, companyId)))
      .returning();
    return updated;
  }

  // Customer management with RNC validation
  async getPOSCustomers(companyId: number): Promise<POSCustomer[]> {
    return await db.select().from(posCustomers).where(eq(posCustomers.companyId, companyId));
  }

  async getPOSCustomer(id: number, companyId: number): Promise<POSCustomer | undefined> {
    const [customer] = await db
      .select()
      .from(posCustomers)
      .where(and(eq(posCustomers.id, id), eq(posCustomers.companyId, companyId)));
    return customer;
  }

  async createPOSCustomer(customer: InsertPOSCustomer): Promise<POSCustomer> {
    const [created] = await db.insert(posCustomers).values(customer).returning();
    return created;
  }

  async updatePOSCustomer(id: number, customer: Partial<InsertPOSCustomer>, companyId: number): Promise<POSCustomer | undefined> {
    const [updated] = await db
      .update(posCustomers)
      .set({ ...customer, updatedAt: new Date() })
      .where(and(eq(posCustomers.id, id), eq(posCustomers.companyId, companyId)))
      .returning();
    return updated;
  }

  async deletePOSCustomer(id: number, companyId: number): Promise<void> {
    await db.delete(posCustomers).where(and(eq(posCustomers.id, id), eq(posCustomers.companyId, companyId)));
  }

  async validateCustomerRNC(rnc: string, companyId: number): Promise<{ valid: boolean; data?: any }> {
    // Check against DGII registry
    const rncRecord = await this.searchRNC(rnc);
    if (rncRecord) {
      // Update customer record with validated RNC if it exists
      await db
        .update(posCustomers)
        .set({ 
          isValidatedRnc: true, 
          rncValidationDate: new Date() 
        })
        .where(and(eq(posCustomers.rnc, rnc), eq(posCustomers.companyId, companyId)));
      
      return { 
        valid: true, 
        data: {
          name: rncRecord.razonSocial || rncRecord.nombreComercial,
          businessName: rncRecord.razonSocial,
          status: rncRecord.estado,
          activity: rncRecord.categoria
        }
      };
    }
    return { valid: false };
  }

  // Enhanced customer search with RNC auto-fill
  async searchCustomerByRNC(rnc: string, companyId: number): Promise<any> {
    // First check if customer already exists
    const [existingCustomer] = await db
      .select()
      .from(posCustomers)
      .where(and(eq(posCustomers.rnc, rnc), eq(posCustomers.companyId, companyId)))
      .limit(1);

    if (existingCustomer) {
      return { exists: true, customer: existingCustomer };
    }

    // If not exists, validate RNC and return data for auto-fill
    const validation = await this.validateCustomerRNC(rnc, companyId);
    return { exists: false, validation };
  }

  // Stock Reservation operations for cart synchronization
  async createStockReservation(reservationData: InsertStockReservation): Promise<StockReservation> {
    const [created] = await db.insert(stockReservations).values(reservationData).returning();
    return created;
  }

  async releaseStockReservations(sessionId: string): Promise<void> {
    await db.delete(stockReservations).where(eq(stockReservations.sessionId, sessionId));
  }

  async getStockReservations(productId: number): Promise<StockReservation[]> {
    return await db.select().from(stockReservations).where(eq(stockReservations.productId, productId));
  }

  async cleanExpiredReservations(): Promise<void> {
    const expirationTime = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    await db.delete(stockReservations).where(lt(stockReservations.reservedAt, expirationTime));
  }

  // ACCOUNTING MODULE METHODS

  async getAccounts(companyId: number) {
    return await db.select({
      id: accounts.id,
      code: accounts.code,
      name: accounts.name,
      accountType: accountTypes.name,
      currentBalance: accounts.currentBalance,
      allowTransactions: accounts.allowTransactions,
      level: accounts.level,
      isParent: accounts.isParent,
    })
      .from(accounts)
      .leftJoin(accountTypes, eq(accounts.accountTypeId, accountTypes.id))
      .where(eq(accounts.companyId, companyId))
      .orderBy(accounts.code);
  }

  async createAccount(accountData: any) {
    const [account] = await db.insert(accounts).values(accountData).returning();
    return account;
  }

  async getJournalEntries(companyId: number) {
    return await db.select()
      .from(journalEntries)
      .where(eq(journalEntries.companyId, companyId))
      .orderBy(desc(journalEntries.createdAt));
  }

  async createJournalEntry(entryData: any) {
    const [entry] = await db.insert(journalEntries).values(entryData).returning();
    return entry;
  }
}

export const storage = new DatabaseStorage();
