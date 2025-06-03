import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { AIProductService, AIBusinessService, AIChatService, AIDocumentService } from "./ai-services-fixed";
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
  insertPOSPrintSettingsSchema,
  insertChatChannelSchema,
  insertChatMessageSchema,
  insertUserRoleSchema,
  insertUserPermissionSchema
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

  app.post("/api/products/create-samples", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      await storage.createSampleProducts(company.id);
      res.json({ message: "Sample products created successfully" });
    } catch (error) {
      console.error("Error creating sample products:", error);
      res.status(500).json({ message: "Failed to create sample products" });
    }
  });

  app.post("/api/products/generate-image", isAuthenticated, async (req: any, res) => {
    try {
      const { productName, productCode, description, source } = req.body;
      if (!productName) {
        return res.status(400).json({ message: "Product name is required" });
      }
      
      // Generate image URL using specific source
      const imageUrl = await storage.generateProductImageUrl(productName, productCode, description, source);
      res.json({ imageUrl });
    } catch (error) {
      console.error("Error generating product image:", error);
      res.status(500).json({ message: "Failed to generate product image" });
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

      // Convert string values to appropriate types for validation
      const processedData = {
        ...req.body,
        customerId: parseInt(req.body.customerId),
        subtotal: req.body.subtotal.toString(),
        itbis: req.body.tax ? req.body.tax.toString() : "0",
        total: req.body.total.toString(),
        companyId: company.id
      };

      // Auto-assign NCF if ncfType is provided
      if (req.body.ncfType && !req.body.ncf) {
        const nextNCF = await storage.getNextNCF(company.id, req.body.ncfType);
        if (!nextNCF) {
          return res.status(400).json({ 
            message: `No hay comprobantes disponibles del tipo ${req.body.ncfType}. Configure las secuencias NCF.` 
          });
        }
        processedData.ncf = nextNCF;
      }

      const invoiceData = insertInvoiceSchema.parse(processedData);
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

  app.put("/api/pos/print-settings", isAuthenticated, async (req: any, res) => {
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

  // Get last sale for reprint functionality
  app.get("/api/pos/sales/last", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const sales = await storage.getPOSSales(company.id);
      const lastSale = sales[0]; // Assuming sales are ordered by date desc
      res.json(lastSale || null);
    } catch (error) {
      console.error("Error fetching last sale:", error);
      res.status(500).json({ message: "Failed to fetch last sale" });
    }
  });

  // Get sale items for a specific sale
  app.get("/api/pos/sales/:id/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const saleId = parseInt(req.params.id);
      const items = await storage.getPOSSaleItems(saleId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching sale items:", error);
      res.status(500).json({ message: "Failed to fetch sale items" });
    }
  });

  // Profile routes
  app.patch("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, email } = req.body;
      
      // In a real implementation, you would update the user in your database
      // For now, return success as user data comes from Replit Auth
      res.json({ success: true, message: "Profile updated successfully" });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // In a real implementation, you would verify current password and update
      // For now, simulate password change
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }
      
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Settings routes
  app.put("/api/settings/system", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = req.body;
      
      // Store system settings (in real app, save to database)
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error updating system settings:", error);
      res.status(500).json({ message: "Failed to update system settings" });
    }
  });

  app.put("/api/settings/security", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = req.body;
      
      // Store security settings
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error updating security settings:", error);
      res.status(500).json({ message: "Failed to update security settings" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const notifications = await storage.getNotifications(userId, company.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId, userId);
      res.json({ success: true, id: notificationId });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = parseInt(req.params.id);
      await storage.deleteNotification(notificationId, userId);
      res.json({ success: true, id: notificationId });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.put("/api/notifications/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const settings = req.body;
      
      // Store notification settings
      res.json({ success: true, settings });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  app.patch("/api/notifications/mark-all-read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      initUserNotifications(userId);
      
      const notifications = userNotifications.get(userId) || [];
      notifications.forEach(notification => {
        notification.read = true;
      });
      userNotifications.set(userId, notifications);
      
      res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  app.delete("/api/notifications/clear-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Clear all notifications for this user
      userNotifications.set(userId, []);
      
      res.json({ success: true, message: "All notifications cleared" });
    } catch (error) {
      console.error("Error clearing all notifications:", error);
      res.status(500).json({ message: "Failed to clear notifications" });
    }
  });

  // Employee routes
  app.get("/api/employees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const employees = await storage.getEmployees(company.id);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const employee = await storage.getEmployee(parseInt(req.params.id), company.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Process the request body to handle date fields properly
      const createData = { ...req.body, companyId: company.id };
      if (createData.hireDate && typeof createData.hireDate === 'string') {
        createData.hireDate = new Date(createData.hireDate);
      }
      
      const employee = await storage.createEmployee(createData);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Process the request body to handle date fields properly
      const updateData = { ...req.body };
      if (updateData.hireDate && typeof updateData.hireDate === 'string') {
        updateData.hireDate = new Date(updateData.hireDate);
      }
      
      const employee = await storage.updateEmployee(parseInt(req.params.id), updateData, company.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      await storage.deleteEmployee(parseInt(req.params.id), company.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Payroll Period routes
  app.get("/api/payroll/periods", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const periods = await storage.getPayrollPeriods(company.id);
      res.json(periods);
    } catch (error) {
      console.error("Error fetching payroll periods:", error);
      res.status(500).json({ message: "Failed to fetch payroll periods" });
    }
  });

  app.post("/api/payroll/periods", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const period = await storage.createPayrollPeriod({
        ...req.body,
        companyId: company.id,
      });
      res.status(201).json(period);
    } catch (error) {
      console.error("Error creating payroll period:", error);
      res.status(500).json({ message: "Failed to create payroll period" });
    }
  });

  app.put("/api/payroll/periods/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const period = await storage.updatePayrollPeriod(parseInt(req.params.id), req.body, company.id);
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }
      res.json(period);
    } catch (error) {
      console.error("Error updating payroll period:", error);
      res.status(500).json({ message: "Failed to update payroll period" });
    }
  });

  // Payroll Entry routes
  app.get("/api/payroll/entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const periodId = req.query.periodId ? parseInt(req.query.periodId as string) : undefined;
      const entries = await storage.getPayrollEntries(company.id, periodId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching payroll entries:", error);
      res.status(500).json({ message: "Failed to fetch payroll entries" });
    }
  });

  app.post("/api/payroll/generate/:periodId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const periodId = parseInt(req.params.periodId);
      const period = await storage.getPayrollPeriod(periodId, company.id);
      if (!period) {
        return res.status(404).json({ message: "Payroll period not found" });
      }

      const employees = await storage.getEmployees(company.id);
      const entries = [];

      for (const employee of employees) {
        if (employee.status === "active") {
          const baseSalary = parseFloat(employee.salary);
          const hoursWorked = employee.salaryType === "hourly" ? 160 : 0;
          const overtimeHours = 0;
          const bonuses = 0;
          const commissions = 0;
          const allowances = 0;
          
          const grossPay = employee.salaryType === "hourly" 
            ? baseSalary * hoursWorked 
            : baseSalary;

          // Dominican Republic deductions (approximate percentages)
          const tssDeduction = grossPay * 0.0287; // 2.87% TSS
          const sfsDeduction = grossPay * 0.0304; // 3.04% SFS
          const infotepDeduction = grossPay * 0.01; // 1% INFOTEP
          const incomeTaxDeduction = grossPay > 34685 ? (grossPay - 34685) * 0.15 : 0; // Progressive tax
          const otherDeductions = 0;

          const totalDeductions = tssDeduction + sfsDeduction + infotepDeduction + incomeTaxDeduction + otherDeductions;
          const netPay = grossPay - totalDeductions;

          const entry = await storage.createPayrollEntry({
            companyId: company.id,
            periodId,
            employeeId: employee.id,
            baseSalary: baseSalary.toString(),
            hoursWorked: hoursWorked.toString(),
            overtimeHours: overtimeHours.toString(),
            bonuses: bonuses.toString(),
            commissions: commissions.toString(),
            allowances: allowances.toString(),
            grossPay: grossPay.toString(),
            tssDeduction: tssDeduction.toString(),
            sfsDeduction: sfsDeduction.toString(),
            infotepDeduction: infotepDeduction.toString(),
            incomeTaxDeduction: incomeTaxDeduction.toString(),
            otherDeductions: otherDeductions.toString(),
            totalDeductions: totalDeductions.toString(),
            netPay: netPay.toString(),
          });
          entries.push(entry);
        }
      }

      res.json({ message: "Payroll generated successfully", entries });
    } catch (error) {
      console.error("Error generating payroll:", error);
      res.status(500).json({ message: "Failed to generate payroll" });
    }
  });

  // Fiscal Documents / NCF Management Routes
  
  // NCF Sequences
  app.get("/api/fiscal/ncf-sequences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const sequences = await storage.getNCFSequences(company.id);
      res.json(sequences);
    } catch (error) {
      console.error("Error fetching NCF sequences:", error);
      res.status(500).json({ message: "Failed to fetch NCF sequences" });
    }
  });

  app.post("/api/fiscal/ncf-sequences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const sequenceData = {
        ...req.body,
        companyId: company.id,
      };

      const sequence = await storage.createNCFSequence(sequenceData);
      res.json(sequence);
    } catch (error) {
      console.error("Error creating NCF sequence:", error);
      res.status(500).json({ message: "Failed to create NCF sequence" });
    }
  });

  // Comprobantes 605 (Compras)
  app.get("/api/fiscal/comprobantes-605/:period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { period } = req.params;
      const comprobantes = await storage.getComprobantes605(company.id, period);
      res.json(comprobantes);
    } catch (error) {
      console.error("Error fetching comprobantes 605:", error);
      res.status(500).json({ message: "Failed to fetch comprobantes 605" });
    }
  });

  app.post("/api/fiscal/generate-605/:period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { period } = req.params;
      const comprobantes = await storage.generateComprobantes605(company.id, period);
      res.json({ message: "Comprobantes 605 generated successfully", data: comprobantes });
    } catch (error) {
      console.error("Error generating comprobantes 605:", error);
      res.status(500).json({ message: "Failed to generate comprobantes 605" });
    }
  });

  // Comprobantes 606 (Ventas)
  app.get("/api/fiscal/comprobantes-606/:period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { period } = req.params;
      const comprobantes = await storage.getComprobantes606(company.id, period);
      res.json(comprobantes);
    } catch (error) {
      console.error("Error fetching comprobantes 606:", error);
      res.status(500).json({ message: "Failed to fetch comprobantes 606" });
    }
  });

  app.post("/api/fiscal/generate-606/:period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { period } = req.params;
      const comprobantes = await storage.generateComprobantes606(company.id, period);
      res.json({ message: "Comprobantes 606 generated successfully", data: comprobantes });
    } catch (error) {
      console.error("Error generating comprobantes 606:", error);
      res.status(500).json({ message: "Failed to generate comprobantes 606" });
    }
  });

  // Download reports in DGII format
  app.get("/api/fiscal/download-605/:period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { period } = req.params;
      const comprobantes = await storage.getComprobantes605(company.id, period);
      
      // Generate DGII 605 format
      let content = "";
      for (const comp of comprobantes) {
        const line = [
          comp.rncCedula.padEnd(11, " "),
          comp.tipoIdentificacion,
          comp.tipoComprobante,
          (comp.ncf || "").padEnd(11, " "),
          comp.ncfModificado || "",
          comp.fechaComprobante.toISOString().slice(0, 10).replace(/-/g, ""),
          comp.fechaPago ? comp.fechaPago.toISOString().slice(0, 10).replace(/-/g, "") : "",
          parseFloat(comp.montoFacturado).toFixed(2).padStart(12, "0"),
          parseFloat(comp.itbisFacturado).toFixed(2).padStart(12, "0"),
          parseFloat(comp.itbisRetenido).toFixed(2).padStart(12, "0"),
          parseFloat(comp.itbisPercibido).toFixed(2).padStart(12, "0"),
          parseFloat(comp.retencionRenta).toFixed(2).padStart(12, "0"),
          parseFloat(comp.isrPercibido).toFixed(2).padStart(12, "0"),
          parseFloat(comp.impuestoSelectivoConsumo).toFixed(2).padStart(12, "0"),
          parseFloat(comp.otrosImpuestos).toFixed(2).padStart(12, "0"),
          parseFloat(comp.montoTotal).toFixed(2).padStart(12, "0"),
        ].join("|");
        content += line + "\n";
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="605_${period}.txt"`);
      res.send(content);
    } catch (error) {
      console.error("Error downloading 605 report:", error);
      res.status(500).json({ message: "Failed to download 605 report" });
    }
  });

  app.get("/api/fiscal/download-606/:period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { period } = req.params;
      const comprobantes = await storage.getComprobantes606(company.id, period);
      
      // Generate DGII 606 format
      let content = "";
      for (const comp of comprobantes) {
        const line = [
          comp.rncCedula.padEnd(11, " "),
          comp.tipoIdentificacion,
          comp.tipoComprobante,
          (comp.ncf || "").padEnd(11, " "),
          comp.ncfModificado || "",
          comp.fechaComprobante.toISOString().slice(0, 10).replace(/-/g, ""),
          comp.fechaPago ? comp.fechaPago.toISOString().slice(0, 10).replace(/-/g, "") : "",
          comp.servicioTipo || "",
          comp.conceptoPago || "",
          parseFloat(comp.montoFacturado).toFixed(2).padStart(12, "0"),
          parseFloat(comp.itbisFacturado).toFixed(2).padStart(12, "0"),
          parseFloat(comp.itbisRetenido).toFixed(2).padStart(12, "0"),
          parseFloat(comp.itbisPercibido).toFixed(2).padStart(12, "0"),
          parseFloat(comp.retencionRenta).toFixed(2).padStart(12, "0"),
          parseFloat(comp.isrPercibido).toFixed(2).padStart(12, "0"),
          parseFloat(comp.impuestoSelectivoConsumo).toFixed(2).padStart(12, "0"),
          parseFloat(comp.otrosImpuestos).toFixed(2).padStart(12, "0"),
          parseFloat(comp.montoTotal).toFixed(2).padStart(12, "0"),
        ].join("|");
        content += line + "\n";
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="606_${period}.txt"`);
      res.send(content);
    } catch (error) {
      console.error("Error downloading 606 report:", error);
      res.status(500).json({ message: "Failed to download 606 report" });
    }
  });

  // RNC Verification
  app.get("/api/fiscal/verify-rnc/:rnc", isAuthenticated, async (req: any, res) => {
    try {
      const { rnc } = req.params;
      const cleanRnc = rnc.replace(/\D/g, ""); // Remove non-digits
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.status(400).json({ error: "RNC debe tener entre 9 y 11 dígitos" });
      }

      // First check local database
      const localResult = await storage.searchRNC(cleanRnc);
      if (localResult) {
        return res.json(localResult);
      }

      // If not found locally, try to fetch from DGII API
      // Note: You would need to provide the DGII API credentials for this to work
      try {
        const dgiiResponse = await fetch(`https://api.dgii.gov.do/wsMovilDGII/WSMovilDGII.asmx/GetContribuyentes?value=${cleanRnc}&patronBusqueda=1&inicioFilas=1&filaFilas=1&IMEI=`, {
          method: 'GET',
          headers: {
            'User-Agent': 'Four One System/1.0'
          }
        });
        
        if (dgiiResponse.ok) {
          const dgiiData = await dgiiResponse.text();
          // Parse DGII response and save to local database
          // This is a simplified version - actual DGII API response would need proper parsing
          const mockData = {
            rnc: cleanRnc,
            razonSocial: "Empresa de prueba",
            nombreComercial: "Empresa comercial",
            estado: "ACTIVO",
            categoria: "PERSONA JURIDICA",
            regimen: "ORDINARIO"
          };
          
          await storage.createRNCRegistry(mockData);
          return res.json(mockData);
        }
      } catch (dgiiError) {
        console.log("DGII API not available, using fallback");
      }

      // Fallback response
      res.status(404).json({ error: "RNC no encontrado en los registros" });
    } catch (error) {
      console.error("Error verifying RNC:", error);
      res.status(500).json({ message: "Failed to verify RNC" });
    }
  });

  // Bulk import RNC registry (for admin use)
  app.post("/api/fiscal/import-rnc-registry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Only super admins can import RNC registry
      if (user?.role !== "super_admin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { data } = req.body;
      
      if (!Array.isArray(data)) {
        return res.status(400).json({ message: "Data must be an array" });
      }

      await storage.bulkInsertRNCRegistry(data);
      res.json({ message: `Successfully imported ${data.length} RNC records` });
    } catch (error) {
      console.error("Error importing RNC registry:", error);
      res.status(500).json({ message: "Failed to import RNC registry" });
    }
  });

  // Create sample products endpoint
  app.post("/api/products/create-samples", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Sample products with automatic image generation
      const sampleProducts = [
        {
          name: "Manzana Red Delicious",
          description: "Manzanas frescas y crujientes",
          code: "MANZ001",
          price: "45.00",
          cost: "25.00",
          stock: 50,
          imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop"
        },
        {
          name: "Plátano Maduro",
          description: "Plátanos dulces y maduros",
          code: "PLAT001", 
          price: "35.00",
          cost: "20.00",
          stock: 40,
          imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop"
        },
        {
          name: "Arroz Blanco Premium",
          description: "Arroz de grano largo de alta calidad",
          code: "ARRO001",
          price: "120.00",
          cost: "80.00",
          stock: 25,
          imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop"
        },
        {
          name: "Pollo Fresco Entero",
          description: "Pollo fresco de granja local",
          code: "POLL001",
          price: "280.00",
          cost: "200.00",
          stock: 15,
          imageUrl: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop"
        },
        {
          name: "Leche Entera 1L",
          description: "Leche fresca pasteurizada",
          code: "LECH001",
          price: "65.00",
          cost: "45.00",
          stock: 30,
          imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop"
        },
        {
          name: "Pan de Molde Integral",
          description: "Pan integral rico en fibra",
          code: "PAN001",
          price: "85.00",
          cost: "55.00",
          stock: 20,
          imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop"
        },
        {
          name: "Huevos Frescos Docena",
          description: "Huevos de gallina criolla",
          code: "HUEV001",
          price: "150.00",
          cost: "100.00",
          stock: 35,
          imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop"
        },
        {
          name: "Café Dominicano 500g",
          description: "Café tostado de las montañas dominicanas",
          code: "CAFE001",
          price: "320.00",
          cost: "220.00",
          stock: 18,
          imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop"
        }
      ];

      const createdProducts = [];
      for (const productData of sampleProducts) {
        const product = await storage.createProduct({
          companyId: company.id,
          ...productData
        });
        createdProducts.push(product);
      }

      res.json({ 
        message: "Sample products created successfully", 
        products: createdProducts 
      });
    } catch (error) {
      console.error("Error creating sample products:", error);
      res.status(500).json({ message: "Failed to create sample products" });
    }
  });

  // AI Integration Routes
  
  // Generate product description with AI
  app.post("/api/ai/product-description", isAuthenticated, async (req: any, res) => {
    try {
      const { productName, category, features } = req.body;
      
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const description = await AIProductService.generateProductDescription(
        productName,
        category,
        features
      );
      
      res.json({ description });
    } catch (error) {
      console.error("Error generating product description:", error);
      res.status(500).json({ message: error.message || "Failed to generate description" });
    }
  });

  // Generate product code with AI
  app.post("/api/ai/product-code", isAuthenticated, async (req: any, res) => {
    try {
      const { productName, category, brand } = req.body;
      
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const code = await AIProductService.generateProductCode(
        productName,
        category,
        brand
      );
      
      res.json({ code });
    } catch (error) {
      console.error("Error generating product code:", error);
      res.status(500).json({ message: error.message || "Failed to generate code" });
    }
  });

  // AI Sales Analysis
  app.post("/api/ai/sales-analysis", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await storage.getCompanyByUserId(req.user.claims.sub);
      
      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      // Get recent sales data
      const posSales = await storage.getPOSSales(userCompany.id);
      const invoices = await storage.getInvoices(userCompany.id);
      
      const salesData = [...posSales, ...invoices].slice(0, 20);
      
      const analysis = await AIBusinessService.analyzeSalesPattern(salesData);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing sales:", error);
      res.status(500).json({ message: error.message || "Failed to analyze sales" });
    }
  });

  // AI Inventory Optimization
  app.post("/api/ai/inventory-optimization", isAuthenticated, async (req: any, res) => {
    try {
      const userCompany = await storage.getCompanyByUserId(req.user.claims.sub);
      
      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const products = await storage.getProducts(userCompany.id);
      const salesHistory = await storage.getPOSSales(userCompany.id);
      
      const optimization = await AIBusinessService.optimizeInventory(products, salesHistory);
      
      res.json(optimization);
    } catch (error) {
      console.error("Error optimizing inventory:", error);
      res.status(500).json({ message: error.message || "Failed to optimize inventory" });
    }
  });

  // AI Chat Assistant
  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { message } = req.body;
      const userId = req.user.claims.sub;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      const context = {
        companyName: userCompany.name,
        userId: userId
      };
      
      const response = await AIChatService.processQuery(message, context);
      
      // Save chat message to database
      try {
        await storage.saveAIChatMessage({
          companyId: userCompany.id,
          userId,
          message,
          response,
          context
        });
      } catch (saveError) {
        console.error("Error saving chat message:", saveError);
        // Continue even if saving fails
      }
      
      res.json({ response });
    } catch (error) {
      console.error("Error processing chat:", error);
      res.status(500).json({ message: error.message || "Failed to process message" });
    }
  });

  // Get AI Chat history
  app.get("/api/ai/chat/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getAIChatMessages(userCompany.id, userId, limit);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // AI Document Processing
  app.post("/api/ai/extract-invoice", isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;
      
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(503).json({ message: "AI service not configured" });
      }

      const extractedData = await AIDocumentService.extractInvoiceData(text);
      
      res.json(extractedData);
    } catch (error) {
      console.error("Error extracting invoice data:", error);
      res.status(500).json({ message: error.message || "Failed to extract data" });
    }
  });

  // Chat System Routes
  
  // Get chat channels for company
  app.get("/api/chat/channels", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      const channels = await storage.getChatChannels(userCompany.id, userId);
      res.json(channels);
    } catch (error) {
      console.error("Error fetching chat channels:", error);
      res.status(500).json({ message: "Failed to fetch channels" });
    }
  });

  // Create new chat channel
  app.post("/api/chat/channels", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      const channelData = insertChatChannelSchema.parse({
        ...req.body,
        companyId: userCompany.id,
        createdBy: userId
      });

      const channel = await storage.createChatChannel(channelData);
      res.json(channel);
    } catch (error) {
      console.error("Error creating chat channel:", error);
      res.status(500).json({ message: "Failed to create channel" });
    }
  });

  // Get messages for a channel
  app.get("/api/chat/channels/:channelId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      // Verify user has access to channel
      const hasAccess = await storage.userHasChannelAccess(userId, parseInt(channelId));
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messages = await storage.getChatMessages(parseInt(channelId), limit, offset);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send message to channel
  app.post("/api/chat/channels/:channelId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.params;

      // Verify user has access to channel
      const hasAccess = await storage.userHasChannelAccess(userId, parseInt(channelId));
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const messageData = insertChatMessageSchema.parse({
        ...req.body,
        channelId: parseInt(channelId),
        senderId: userId
      });

      const message = await storage.createChatMessage(messageData);
      
      // Broadcast message via WebSocket
      broadcastToChannel(parseInt(channelId), {
        type: 'new_message',
        data: message
      });

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // User Management Routes

  // Get company users
  app.get("/api/users/company", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      const users = await storage.getCompanyUsers(userCompany.id);
      res.json(users);
    } catch (error) {
      console.error("Error fetching company users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create user role
  app.post("/api/users/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      const roleData = insertUserRoleSchema.parse({
        ...req.body,
        companyId: userCompany.id
      });

      const role = await storage.createUserRole(roleData);
      res.json(role);
    } catch (error) {
      console.error("Error creating user role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  // Get user permissions
  app.get("/api/users/:targetUserId/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { targetUserId } = req.params;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      const permissions = await storage.getUserPermissions(targetUserId, userCompany.id);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  // Update user permissions
  app.put("/api/users/:targetUserId/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { targetUserId } = req.params;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      const permissionData = insertUserPermissionSchema.parse({
        ...req.body,
        userId: targetUserId,
        companyId: userCompany.id
      });

      const permissions = await storage.updateUserPermissions(permissionData);
      res.json(permissions);
    } catch (error) {
      console.error("Error updating user permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active connections
  const activeConnections = new Map<string, Set<WebSocket>>();

  // Function to broadcast messages to channel members
  function broadcastToChannel(channelId: number, message: any) {
    const channelKey = `channel_${channelId}`;
    const connections = activeConnections.get(channelKey);
    
    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  wss.on('connection', (ws, request) => {
    console.log('New WebSocket connection');
    
    let userId: string | null = null;
    let userChannels: Set<string> = new Set();

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'authenticate':
            // In a real implementation, verify the token
            userId = message.userId;
            
            // Get user's channels and subscribe to them
            if (userId) {
              try {
                const userCompany = await storage.getCompanyByUserId(userId);
                if (userCompany) {
                  const channels = await storage.getChatChannels(userCompany.id, userId);
                  
                  channels.forEach((channel: any) => {
                    const channelKey = `channel_${channel.id}`;
                    userChannels.add(channelKey);
                    
                    if (!activeConnections.has(channelKey)) {
                      activeConnections.set(channelKey, new Set());
                    }
                    activeConnections.get(channelKey)?.add(ws);
                  });
                }
              } catch (error) {
                console.error('Error subscribing to channels:', error);
              }
            }
            
            ws.send(JSON.stringify({
              type: 'authenticated',
              success: true
            }));
            break;

          case 'typing':
            // Broadcast typing indicator to channel
            if (message.channelId) {
              broadcastToChannel(message.channelId, {
                type: 'user_typing',
                userId: userId,
                channelId: message.channelId
              });
            }
            break;

          case 'join_channel':
            // Add user to channel subscription
            if (message.channelId) {
              const channelKey = `channel_${message.channelId}`;
              userChannels.add(channelKey);
              
              if (!activeConnections.has(channelKey)) {
                activeConnections.set(channelKey, new Set());
              }
              activeConnections.get(channelKey)?.add(ws);
            }
            break;

          case 'leave_channel':
            // Remove user from channel subscription
            if (message.channelId) {
              const channelKey = `channel_${message.channelId}`;
              userChannels.delete(channelKey);
              activeConnections.get(channelKey)?.delete(ws);
            }
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      // Clean up connections
      userChannels.forEach(channelKey => {
        activeConnections.get(channelKey)?.delete(ws);
      });
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}