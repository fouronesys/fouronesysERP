import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertCompanySchema,
  insertWarehouseSchema,
  insertCustomerSchema, 
  insertProductSchema,
  insertInvoiceSchema,
  insertProductionOrderSchema,
  insertBOMSchema,
  insertPOSSaleSchema,
  insertPOSSaleItemSchema,
  insertPOSPrintSettingsSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Incluir información de rol y empresas
      if (user) {
        const userRole = await storage.getUserRole(userId);
        // Simplificar para super admin - no verificar empresas si es super admin
        let userCompanies = [];
        if (userRole !== 'super_admin') {
          try {
            userCompanies = await storage.getUserCompanies(userId);
          } catch (error) {
            console.log('Error getting user companies, proceeding without them:', error);
            userCompanies = [];
          }
        }
        
        res.json({
          ...user,
          role: userRole,
          companies: userCompanies,
          isSuperAdmin: userRole === 'super_admin'
        });
      } else {
        res.json(user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Super Admin routes
  app.get("/api/admin/companies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching all companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post("/api/admin/companies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompanyForUser(companyData, companyData.ownerId || userId);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put("/api/admin/companies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const id = parseInt(req.params.id);
      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.updateCompany(id, companyData);
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.patch("/api/admin/companies/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const id = parseInt(req.params.id);
      const { isActive } = req.body;
      const company = await storage.updateCompanyStatus(id, isActive);
      res.json(company);
    } catch (error) {
      console.error("Error updating company status:", error);
      res.status(500).json({ message: "Failed to update company status" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      // Calcular estadísticas básicas
      const companies = await storage.getAllCompanies();
      const stats = {
        totalCompanies: companies.length,
        activeCompanies: companies.filter(c => c.isActive).length,
        trialCompanies: companies.filter(c => c.subscriptionPlan === 'trial').length,
        paidCompanies: companies.filter(c => c.subscriptionPlan !== 'trial').length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Company routes
  app.get("/api/companies/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "No company found for user" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching current company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.put("/api/companies/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "No company found for user" });
      }
      
      const companyData = insertCompanySchema.parse(req.body);
      const updatedCompany = await storage.updateCompany(company.id, companyData);
      res.json(updatedCompany);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Warehouse routes
  app.get("/api/warehouses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const warehouses = await storage.getWarehouses(company.id);
      res.json(warehouses);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      res.status(500).json({ message: "Failed to fetch warehouses" });
    }
  });

  app.post("/api/warehouses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const warehouseData = insertWarehouseSchema.parse({ ...req.body, companyId: company.id });
      const warehouse = await storage.createWarehouse(warehouseData);
      res.json(warehouse);
    } catch (error) {
      console.error("Error creating warehouse:", error);
      res.status(500).json({ message: "Failed to create warehouse" });
    }
  });

  app.put("/api/warehouses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const id = parseInt(req.params.id);
      const warehouseData = insertWarehouseSchema.parse({ ...req.body, companyId: company.id });
      const warehouse = await storage.updateWarehouse(id, warehouseData, company.id);
      res.json(warehouse);
    } catch (error) {
      console.error("Error updating warehouse:", error);
      res.status(500).json({ message: "Failed to update warehouse" });
    }
  });

  app.delete("/api/warehouses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteWarehouse(id, company.id);
      res.json({ message: "Warehouse deleted successfully" });
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      res.status(500).json({ message: "Failed to delete warehouse" });
    }
  });

  // Company routes
  app.get("/api/companies/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let company = await storage.getCompanyByUserId(userId);
      
      // Si no existe empresa, crear una por defecto
      if (!company) {
        const defaultCompany = {
          ownerId: userId,
          name: "Mi Empresa",
          rnc: "",
          address: "",
          phone: "",
          email: req.user.claims.email || "",
        };
        company = await storage.createCompany(defaultCompany);
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.put("/api/companies/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const updateData = insertCompanySchema.parse({ ...req.body, ownerId: userId });
      const updatedCompany = await storage.updateCompany(company.id, updateData);
      res.json(updatedCompany);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.post("/api/companies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const companyData = insertCompanySchema.parse({ ...req.body, ownerId: userId });
      const company = await storage.createCompany(companyData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const metrics = await storage.getDashboardMetrics(company.id);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Customer routes
  app.get("/api/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const customers = await storage.getCustomers(company.id);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const customerData = insertCustomerSchema.parse({ ...req.body, companyId: company.id });
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.put("/api/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.parse({ ...req.body, companyId: company.id });
      const customer = await storage.updateCustomer(id, customerData, company.id);
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteCustomer(id, company.id);
      res.json({ message: "Customer deleted successfully" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Product routes
  app.get("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const products = await storage.getProducts(company.id);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const productData = insertProductSchema.parse({ ...req.body, companyId: company.id });
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const id = parseInt(req.params.id);
      const productData = insertProductSchema.parse({ ...req.body, companyId: company.id });
      const product = await storage.updateProduct(id, productData, company.id);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id, company.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const invoices = await storage.getInvoices(company.id);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const invoiceData = insertInvoiceSchema.parse({ ...req.body, companyId: company.id });
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Production order routes
  app.get("/api/production-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const orders = await storage.getProductionOrders(company.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      res.status(500).json({ message: "Failed to fetch production orders" });
    }
  });

  app.post("/api/production-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const orderData = insertProductionOrderSchema.parse({ ...req.body, companyId: company.id });
      const order = await storage.createProductionOrder(orderData);
      res.json(order);
    } catch (error) {
      console.error("Error creating production order:", error);
      res.status(500).json({ message: "Failed to create production order" });
    }
  });

  // BOM routes
  app.get("/api/bom/:productId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const productId = parseInt(req.params.productId);
      const bom = await storage.getBOMByProduct(productId, company.id);
      res.json(bom);
    } catch (error) {
      console.error("Error fetching BOM:", error);
      res.status(500).json({ message: "Failed to fetch BOM" });
    }
  });

  app.post("/api/bom", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const bomData = insertBOMSchema.parse({ ...req.body, companyId: company.id });
      const bomItem = await storage.createBOMItem(bomData);
      res.json(bomItem);
    } catch (error) {
      console.error("Error creating BOM item:", error);
      res.status(500).json({ message: "Failed to create BOM item" });
    }
  });

  // POS routes
  app.get("/api/pos/sales", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const sales = await storage.getPOSSales(company.id);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching POS sales:", error);
      res.status(500).json({ message: "Failed to fetch POS sales" });
    }
  });

  app.post("/api/pos/sales", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const { items, ...saleData } = req.body;
      
      // Generate sale number
      const saleCount = await storage.getPOSSales(company.id);
      const saleNumber = `POS-${String(saleCount.length + 1).padStart(6, '0')}`;
      
      const saleToCreate = insertPOSSaleSchema.parse({ 
        ...saleData, 
        companyId: company.id,
        saleNumber 
      });
      
      const sale = await storage.createPOSSale(saleToCreate);
      
      // Create sale items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const itemData = insertPOSSaleItemSchema.parse({ ...item, saleId: sale.id });
          await storage.createPOSSaleItem(itemData);
        }
      }
      
      res.json(sale);
    } catch (error) {
      console.error("Error creating POS sale:", error);
      res.status(500).json({ message: "Failed to create POS sale" });
    }
  });

  app.get("/api/pos/print-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const settings = await storage.getPOSPrintSettings(company.id);
      res.json(settings || { printerWidth: "80mm", showNCF: true, showCustomerInfo: true });
    } catch (error) {
      console.error("Error fetching POS print settings:", error);
      res.status(500).json({ message: "Failed to fetch POS print settings" });
    }
  });

  app.post("/api/pos/print-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const settingsData = insertPOSPrintSettingsSchema.parse({ ...req.body, companyId: company.id });
      const settings = await storage.upsertPOSPrintSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error updating POS print settings:", error);
      res.status(500).json({ message: "Failed to update POS print settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}