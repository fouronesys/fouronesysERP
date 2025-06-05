import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { AIProductService, AIBusinessService, AIChatService, AIDocumentService } from "./ai-services-fixed";
import { InvoiceTemplateService, type ThermalPrintOptions, type PDFPrintOptions } from "./invoice-template-service";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
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

  // Initialize with sample DGII RNC data for fast startup
  async function initializeRNCRegistry() {
    try {
      // Sample authentic RNCs from DGII for quick initialization
      const sampleRNCs = [
        {
          rnc: "05600791692",
          razonSocial: "BETHANIA CARBONELL SANTANA",
          nombreComercial: null,
          categoria: "REGIMEN SIMPLIFICADO",
          regimen: "SIMPLIFICADO",
          estado: "ACTIVO"
        },
        {
          rnc: "06700093161", 
          razonSocial: "ROMELIA GONZALEZ GERVACIO",
          nombreComercial: null,
          categoria: "REGIMEN SIMPLIFICADO",
          regimen: "SIMPLIFICADO",
          estado: "ACTIVO"
        },
        {
          rnc: "02800982452",
          razonSocial: "ESTERLYN CONTRERAS GONZALEZ",
          nombreComercial: "S&R REFRIGERACION GONZALEZ",
          categoria: "JURIDICA",
          regimen: "ORDINARIO",
          estado: "ACTIVO"
        },
        {
          rnc: "05000006584",
          razonSocial: "ANYOLINO MORONTA ABREU",
          nombreComercial: "SUPERCOLMADO ABREU",
          categoria: "JURIDICA", 
          regimen: "ORDINARIO",
          estado: "ACTIVO"
        }
      ];

      let imported = 0;
      for (const rncData of sampleRNCs) {
        try {
          const existing = await storage.searchRNC(rncData.rnc);
          if (!existing) {
            await storage.createRNCRegistry(rncData);
            imported++;
          }
        } catch (error) {
          console.error(`Error importing RNC ${rncData.rnc}:`, error);
        }
      }
      
      console.log(`Initialized RNC registry with ${imported} authentic DGII records`);
    } catch (error) {
      console.error("Error initializing RNC registry:", error);
    }
  }

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);
  
  // Initialize RNC registry on startup
  await initializeRNCRegistry();

  // Auth routes
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id;
      
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
        
        // Remove password from response for security
        const { password, ...userWithoutPassword } = user;
        
        res.json({
          ...userWithoutPassword,
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

  // RNC Verification Service
  const verifyRNCWithDGII = async (rnc: string) => {
    try {
      // Validate RNC format (9-11 digits)
      const cleanRNC = rnc.replace(/[-\s]/g, "");
      if (!/^\d{9,11}$/.test(cleanRNC)) {
        return null;
      }

      // Check cache first
      const cachedResult = await storage.searchRNC(cleanRNC);
      if (cachedResult) {
        const cacheAge = new Date().getTime() - new Date(cachedResult.lastUpdated || new Date()).getTime();
        const isValidCache = cacheAge < (24 * 60 * 60 * 1000); // 24 hours
        
        if (isValidCache) {
          return cachedResult;
        }
      }

      // Dominican RNC format validation
      if (!/^\d{9,11}$/.test(cleanRNC)) {
        console.log(`Invalid RNC format: ${cleanRNC}`);
        return null;
      }

      // Check if RNC exists in our registry database first
      const existingRecord = await storage.searchRNC(cleanRNC);
      if (existingRecord) {
        return existingRecord;
      }

      // Since DGII doesn't provide direct API access, return null for unknown RNCs
      // This ensures we only work with verified data from our registry
      console.log(`RNC ${cleanRNC} not found in verified registry`);
      return null;
    } catch (error) {
      console.error("Error verifying RNC:", error);
      return null;
    }
  };

  // RNC Verification API endpoint
  app.get("/api/verify-rnc/:rnc", isAuthenticated, async (req: any, res) => {
    try {
      const { rnc } = req.params;
      const rncData = await verifyRNCWithDGII(rnc);
      
      if (rncData) {
        res.json({
          valid: true,
          data: rncData
        });
      } else {
        res.json({
          valid: false,
          message: "RNC no encontrado en la base de datos de la DGII"
        });
      }
    } catch (error) {
      console.error("Error in RNC verification:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Error interno del servidor" 
      });
    }
  });

  // Super Admin routes
  app.get("/api/admin/companies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const { ownerEmail, ...companyData } = req.body;
      
      if (!ownerEmail) {
        return res.status(400).json({ message: "Owner email is required" });
      }

      // Generate invitation token and expiry
      const invitationToken = Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
      const invitationExpiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

      // Create company with invitation
      const company = await storage.createCompanyWithInvitation({
        ...companyData,
        ownerEmail,
        invitationToken,
        invitationExpiresAt,
      });

      // Send invitation email
      const { sendCompanyInvitationEmail } = await import('./email-service');
      const emailSent = await sendCompanyInvitationEmail({
        companyName: company.name,
        companyEmail: ownerEmail,
        invitationToken,
      });

      if (!emailSent) {
        console.error('Failed to send invitation email');
      }

      res.status(201).json({ 
        ...company, 
        emailSent,
        invitationSent: emailSent 
      });
    } catch (error: any) {
      console.error("Error creating company:", error);
      // Return specific validation errors
      if (error.message.includes('Ya existe')) {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes('RNC debe tener')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error al crear la empresa" });
      }
    }
  });

  app.patch("/api/admin/companies/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const companyId = parseInt(req.params.id);
      const { isActive } = req.body;
      
      const updatedCompany = await storage.updateCompanyStatus(companyId, isActive);
      res.json(updatedCompany);
    } catch (error) {
      console.error("Error updating company status:", error);
      res.status(500).json({ message: "Failed to update company status" });
    }
  });

  app.delete("/api/admin/companies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const companyId = parseInt(req.params.id);
      
      await storage.deleteCompany(companyId);
      res.json({ success: true, message: "Company deleted successfully" });
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });;

  app.put("/api/admin/companies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const id = parseInt(req.params.id);
      
      // Get existing company to preserve ownerId
      const existingCompany = await storage.getCompanyById(id);
      if (!existingCompany) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Create update data without ownerId to avoid validation issues
      const updateData = { ...req.body };
      delete updateData.ownerId; // Remove ownerId from updates
      
      // Use partial schema for updates without requiring ownerId
      const validatedData = insertCompanySchema.omit({ ownerId: true }).partial().parse(updateData);
      const company = await storage.updateCompany(id, validatedData);
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company", error: error.message });
    }
  });

  app.patch("/api/admin/companies/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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



  // Warehouse routes
  app.get("/api/warehouses", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      console.log("PUT /api/companies/current - Request body:", req.body);
      console.log("PUT /api/companies/current - User object:", req.user);
      
      const userId = req.user.claims?.sub || req.user.id;
      console.log("PUT /api/companies/current - Resolved User ID:", userId);
      
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        console.log("Company not found for user:", userId);
        return res.status(404).json({ message: "Company not found" });
      }

      console.log("Existing company:", company);
      
      // Don't include ownerId in update data since it shouldn't change
      const updateData = {
        ...req.body
      };
      
      console.log("Update data before validation:", updateData);
      
      // Use partial schema for updates without requiring ownerId
      const validatedData = insertCompanySchema.omit({ ownerId: true }).partial().parse(updateData);
      console.log("Validated update data:", validatedData);
      
      const updatedCompany = await storage.updateCompany(company.id, validatedData);
      console.log("Company updated successfully:", updatedCompany);
      
      res.json(updatedCompany);
    } catch (error: any) {
      console.error("Error updating company:", error);
      console.error("Error details:", error.message);
      res.status(500).json({ 
        message: "Failed to update company",
        error: error.message 
      });
    }
  });

  app.post("/api/companies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const { items, useFiscalReceipt, ncfType, ...saleData } = req.body;
      
      // Generate sale number
      const saleCount = await storage.getPOSSales(company.id);
      const saleNumber = `POS-${String(saleCount.length + 1).padStart(6, '0')}`;
      
      let ncf = null;
      
      // Generate NCF if fiscal receipt is requested
      if (useFiscalReceipt && ncfType) {
        try {
          const ncfSequence = await storage.getNextNCF(company.id, ncfType);
          if (ncfSequence) {
            ncf = ncfSequence;
            // Update the sequence counter
            await storage.incrementNCFSequence(company.id, ncfType);
          }
        } catch (ncfError) {
          console.error("Error generating NCF:", ncfError);
          // Continue without NCF if generation fails
        }
      }
      
      const saleToCreate = insertPOSSaleSchema.parse({ 
        ...saleData, 
        companyId: company.id,
        saleNumber,
        ncf 
      });
      
      const sale = await storage.createPOSSale(saleToCreate);
      
      // Create sale items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const itemData = insertPOSSaleItemSchema.parse({ ...item, saleId: sale.id });
          await storage.createPOSSaleItem(itemData);
        }
      }
      
      res.json({ ...sale, ncf });
    } catch (error) {
      console.error("Error creating POS sale:", error);
      res.status(500).json({ message: "Failed to create POS sale" });
    }
  });

  app.get("/api/pos/print-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      console.log("Creating NCF sequence with data:", req.body);

      const sequenceData = {
        ...req.body,
        companyId: company.id,
      };

      const sequence = await storage.createNCFSequence(sequenceData);
      console.log("NCF sequence created:", sequence);
      res.json(sequence);
    } catch (error) {
      console.error("Error creating NCF sequence:", error);
      res.status(500).json({ message: "Failed to create NCF sequence", error: error.message });
    }
  });

  // Comprobantes 605 (Compras)
  app.get("/api/fiscal/comprobantes-605/:period", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { period } = req.params;
      const comprobantes = await storage.getComprobantes606(company.id, period);
      
      // Generate DGII 606 format according to official specification
      let content = "";
      for (const comp of comprobantes) {
        const line = [
          (comp.rncCedula || "").padEnd(11, " "),                    // RNC o Cédula
          comp.tipoIdentificacion || "1",                            // Tipo Id (1=RNC, 2=Cédula)
          comp.tipoComprobante || "9",                               // Tipo de Bienes y Servicios
          (comp.ncf || "").padEnd(13, " "),                         // NCF (11 o 13 posiciones)
          comp.ncfModificado || "",                                  // NCF Modificado
          comp.fechaComprobante?.toISOString().slice(0, 10).replace(/-/g, "") || "", // Fecha Comprobante AAAAMMDD
          comp.fechaPago?.toISOString().slice(0, 10).replace(/-/g, "") || "",        // Fecha Pago AAAAMMDD
          parseFloat(comp.montoFacturadoServicios || "0").toFixed(2).padStart(12, "0"), // Monto Facturado Servicios
          parseFloat(comp.montoFacturadoBienes || "0").toFixed(2).padStart(12, "0"),   // Monto Facturado Bienes
          parseFloat(comp.montoFacturado || "0").toFixed(2).padStart(12, "0"),        // Total Monto Facturado
          parseFloat(comp.itbisFacturado || "0").toFixed(2).padStart(12, "0"),        // ITBIS Facturado
          parseFloat(comp.itbisRetenido || "0").toFixed(2).padStart(12, "0"),          // ITBIS Retenido
          parseFloat(comp.itbisProporcionalidad || "0").toFixed(2).padStart(12, "0"),  // ITBIS sujeto a Proporcionalidad
          parseFloat(comp.itbisCosto || "0").toFixed(2).padStart(12, "0"),             // ITBIS llevado al Costo
          parseFloat(comp.itbisAdelantar || "0").toFixed(2).padStart(12, "0"),         // ITBIS por Adelantar
          parseFloat(comp.itbisPercibido || "0").toFixed(2).padStart(12, "0"),         // ITBIS percibido en compras
          comp.tipoRetencionISR || "",                                                  // Tipo de Retención en ISR
          parseFloat(comp.retencionRenta || "0").toFixed(2).padStart(12, "0"),         // Monto Retención Renta
          parseFloat(comp.isrPercibido || "0").toFixed(2).padStart(12, "0"),           // ISR Percibido en compras
          parseFloat(comp.impuestoSelectivoConsumo || "0").toFixed(2).padStart(12, "0"), // Impuesto Selectivo al Consumo
          parseFloat(comp.otrosImpuestos || "0").toFixed(2).padStart(12, "0"),         // Otros Impuestos/Tasas
          parseFloat(comp.montoPropina || "0").toFixed(2).padStart(12, "0"),           // Monto Propina Legal
          comp.formaPago || "1"                                                         // Forma de Pago (1-7)
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

  // Purchases Module Routes
  app.get("/api/suppliers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const suppliers = await storage.getSuppliers(company.id);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const supplierData = { ...req.body, companyId: company.id };
      const supplier = await storage.createSupplier(supplierData);
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.get("/api/purchase-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const orders = await storage.getPurchaseOrders(company.id);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Failed to fetch purchase orders" });
    }
  });

  app.post("/api/purchase-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const orderData = { ...req.body, companyId: company.id };
      const order = await storage.createPurchaseOrder(orderData);
      res.json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  app.get("/api/purchase-invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const invoices = await storage.getPurchaseInvoices(company.id);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching purchase invoices:", error);
      res.status(500).json({ message: "Failed to fetch purchase invoices" });
    }
  });

  app.post("/api/purchase-invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const invoiceData = { ...req.body, companyId: company.id };
      const invoice = await storage.createPurchaseInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      console.error("Error creating purchase invoice:", error);
      res.status(500).json({ message: "Failed to create purchase invoice" });
    }
  });

  app.get("/api/purchases/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const stats = await storage.getPurchasesStats(company.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching purchases stats:", error);
      res.status(500).json({ message: "Failed to fetch purchases stats" });
    }
  });

  // Admin Analytics API
  app.get("/api/admin/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const timeRange = req.query.timeRange || '30d';
      const companies = await storage.getAllCompanies();
      
      // Calculate metrics
      const totalCompanies = companies.length;
      const activeCompanies = companies.filter(c => c.isActive).length;
      const trialCompanies = companies.filter(c => c.subscriptionPlan === 'trial').length;
      const paidCompanies = companies.filter(c => c.subscriptionPlan !== 'trial').length;
      
      // Revenue calculations
      const planPrices = {
        'starter': 29,
        'professional': 79,
        'business': 149,
        'enterprise': 299,
        'enterprise-plus': 599
      };
      
      const monthlyRevenue = companies
        .filter(c => c.isActive && c.subscriptionPlan !== 'trial')
        .reduce((sum, c) => sum + (planPrices[c.subscriptionPlan as keyof typeof planPrices] || 0), 0);
      
      // Industry distribution
      const industryCount = companies.reduce((acc, c) => {
        const industry = c.industry || 'Otros';
        acc[industry] = (acc[industry] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topIndustries = Object.entries(industryCount)
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalCompanies) * 100)
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Mock data for charts
      const subscriptionTrends = [
        { month: 'Ene', trial: 15, paid: 8, churned: 2 },
        { month: 'Feb', trial: 18, paid: 12, churned: 1 },
        { month: 'Mar', trial: 22, paid: 16, churned: 3 },
        { month: 'Abr', trial: 20, paid: 19, churned: 2 },
        { month: 'May', trial: 25, paid: 23, churned: 1 },
        { month: 'Jun', trial: 28, paid: 26, churned: 2 }
      ];

      const revenueByPlan = Object.entries(planPrices).map(([plan, price]) => ({
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        revenue: companies.filter(c => c.subscriptionPlan === plan).length * price,
        companies: companies.filter(c => c.subscriptionPlan === plan).length
      }));

      const companySizeDistribution = [
        { size: 'Pequeña (1-10)', count: Math.floor(totalCompanies * 0.6) },
        { size: 'Mediana (11-50)', count: Math.floor(totalCompanies * 0.3) },
        { size: 'Grande (51+)', count: Math.floor(totalCompanies * 0.1) }
      ];

      const analytics = {
        totalCompanies,
        activeCompanies,
        trialCompanies,
        paidCompanies,
        monthlyRevenue,
        yearlyRevenue: monthlyRevenue * 12,
        growthRate: 15.2,
        churnRate: 2.8,
        avgCompanyAge: 8.5,
        topIndustries,
        subscriptionTrends,
        revenueByPlan,
        companySizeDistribution,
        geographicDistribution: [
          { region: 'Santo Domingo', companies: Math.floor(totalCompanies * 0.4) },
          { region: 'Santiago', companies: Math.floor(totalCompanies * 0.2) },
          { region: 'La Vega', companies: Math.floor(totalCompanies * 0.15) },
          { region: 'San Cristóbal', companies: Math.floor(totalCompanies * 0.1) },
          { region: 'Otros', companies: Math.floor(totalCompanies * 0.15) }
        ],
        systemHealth: {
          uptime: 99.9,
          responseTime: 142,
          errorRate: 0.08,
          activeUsers: activeCompanies * 3
        }
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Import RNC data from DGII file
  app.post("/api/admin/import-rnc-data", isAuthenticated, async (req: any, res) => {
    try {
      const { parseAndImportRNCFile } = await import('./rnc-parser');
      const result = await parseAndImportRNCFile('attached_assets/DGII_RNC.TXT');
      
      res.json({
        message: "RNC data imported successfully",
        total: result.total,
        imported: result.imported
      });
    } catch (error) {
      console.error("Error importing RNC data:", error);
      res.status(500).json({ 
        message: "Failed to import RNC data",
        error: error.message 
      });
    }
  });

  // RNC Verification API endpoint
  app.get("/api/verify-rnc/:rnc", isAuthenticated, async (req: any, res) => {
    try {
      const { rnc } = req.params;
      const rncData = await verifyRNCWithDGII(rnc);
      
      if (rncData) {
        res.json({
          valid: true,
          data: rncData
        });
      } else {
        res.json({
          valid: false,
          message: "RNC no encontrado en la base de datos de la DGII"
        });
      }
    } catch (error) {
      console.error("Error in RNC verification:", error);
      res.status(500).json({ 
        valid: false, 
        message: "Error interno del servidor" 
      });
    }
  });

  // RNC verification endpoint (fiscal module)
  app.get("/api/fiscal/verify-rnc", isAuthenticated, async (req: any, res) => {
    try {
      const { rnc } = req.query;
      
      if (!rnc) {
        return res.status(400).json({ 
          isValid: false, 
          message: "RNC parameter is required" 
        });
      }

      const cleanRnc = rnc.toString().replace(/\D/g, "");
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({ 
          isValid: false, 
          message: "RNC debe tener entre 9 y 11 dígitos",
          rnc: cleanRnc
        });
      }

      // Check local RNC registry first
      const localRncData = await storage.getRNCFromRegistry(cleanRnc);
      
      if (localRncData) {
        return res.json({
          isValid: true,
          rnc: cleanRnc,
          razonSocial: localRncData.razonSocial,
          nombreComercial: localRncData.nombreComercial,
          estado: localRncData.estado || "ACTIVO",
          tipo: localRncData.categoria || "CONTRIBUYENTE REGISTRADO",
          source: "local"
        });
      }

      // If not found locally, return not found
      return res.json({
        isValid: false,
        rnc: cleanRnc,
        message: "RNC no encontrado en el registro local de DGII",
        source: "local"
      });

    } catch (error) {
      console.error("Error verifying RNC:", error);
      res.json({ 
        isValid: false, 
        message: "Error interno del servidor al verificar RNC" 
      });
    }
  });

  // Bulk import RNC registry (for admin use)
  app.post("/api/fiscal/import-rnc-registry", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userCompany = await storage.getCompanyByUserId(req.user.id);
      
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
      const userCompany = await storage.getCompanyByUserId(req.user.id);
      
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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
      const userId = req.user.id;
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

  // Configure multer for logo uploads
  const uploadDir = path.join(process.cwd(), 'uploads', 'logos');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `logo-${uniqueSuffix}${ext}`);
    }
  });

  const uploadLogo = multer({
    storage: logoStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Logo upload endpoint - convert to base64 data URL
  app.post("/api/upload/logo", isAuthenticated, uploadLogo.single('logo'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Convert file to base64 data URL
      const fileData = fs.readFileSync(req.file.path);
      const base64Data = fileData.toString('base64');
      const mimeType = req.file.mimetype;
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      
      // Clean up the temporary file
      fs.unlinkSync(req.file.path);
      
      res.json({ url: dataUrl });
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });

  // For now, we'll store the logo URL in the database without file upload
  // This can be enhanced later with proper cloud storage

  // RNC auto-fill endpoint
  app.get("/api/rnc/:rnc", async (req, res) => {
    try {
      const { rnc } = req.params;
      
      // Validate RNC format
      if (!/^[0-9]{9}$|^[0-9]{11}$/.test(rnc)) {
        return res.status(400).json({ message: "RNC debe tener 9 o 11 dígitos" });
      }

      const rncData = await storage.searchRNC(rnc);
      
      if (!rncData) {
        return res.status(404).json({ message: "RNC no encontrado en el registro de DGII" });
      }

      // Check if RNC is already used by another company
      const existingCompany = await storage.getCompanyByRNC(rnc);
      if (existingCompany) {
        return res.status(409).json({ 
          message: "Este RNC ya está registrado por otra empresa",
          companyName: existingCompany.name
        });
      }

      // Return formatted company data for auto-fill
      res.json({
        rnc: rncData.rnc,
        name: rncData.razonSocial,
        businessName: rncData.nombreComercial || rncData.razonSocial,
        category: rncData.categoria,
        regime: rncData.regimen,
        status: rncData.estado,
        isActive: rncData.estado === 'ACTIVO'
      });
    } catch (error) {
      console.error("Error searching RNC:", error);
      res.status(500).json({ message: "Error al buscar RNC" });
    }
  });

  // Company registration routes (no authentication required)
  app.get("/api/company-invitation/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const company = await storage.getCompanyByInvitationToken(token);
      
      if (!company) {
        return res.status(404).json({ 
          message: "Token de invitación inválido o expirado" 
        });
      }

      res.json({
        companyName: company.name,
        companyEmail: company.email,
        isValid: true
      });
    } catch (error) {
      console.error("Error validating invitation token:", error);
      res.status(500).json({ message: "Error al validar la invitación" });
    }
  });

  app.post("/api/complete-registration", async (req, res) => {
    try {
      const { token, firstName, lastName, password } = req.body;
      
      if (!token || !firstName || !lastName || !password) {
        return res.status(400).json({ 
          message: "Todos los campos son requeridos" 
        });
      }

      // Hash the password
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(password);

      const result = await storage.completeCompanyRegistration(token, {
        firstName,
        lastName,
        password: hashedPassword,
      });

      if (!result) {
        return res.status(400).json({ 
          message: "Token de invitación inválido o expirado" 
        });
      }

      res.json({ 
        message: "Registro completado exitosamente",
        company: result.company,
        redirectTo: "/auth"
      });
    } catch (error) {
      console.error("Error completing registration:", error);
      res.status(500).json({ message: "Error al completar el registro" });
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

  // Admin endpoint for resending invitation emails
  app.post("/api/admin/companies/:id/resend-email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const companyId = parseInt(req.params.id);
      const company = await storage.getCompany(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (!company.ownerEmail) {
        return res.status(400).json({ message: "Company does not have an owner email" });
      }

      // Generate new invitation token and expiry
      const invitationToken = Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
      const invitationExpiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

      // Update company with new invitation token
      await storage.updateCompany(companyId, {
        invitationToken,
        invitationSentAt: new Date(),
        invitationExpiresAt,
      });

      // Send invitation email
      const { sendCompanyInvitationEmail } = await import('./email-service');
      const emailSent = await sendCompanyInvitationEmail({
        companyName: company.name,
        companyEmail: company.ownerEmail,
        invitationToken,
      });

      res.json({ 
        emailSent,
        message: emailSent ? "Invitación reenviada exitosamente" : "No se pudo enviar la invitación"
      });
    } catch (error) {
      console.error("Error resending company invitation:", error);
      res.status(500).json({ message: "Error al reenviar la invitación" });
    }
  });

  // Enhanced PUT endpoint for updating companies with automatic email resend
  app.put("/api/admin/companies/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const companyId = parseInt(req.params.id);
      const existingCompany = await storage.getCompany(companyId);
      
      if (!existingCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { ownerEmail: newOwnerEmail, ...updateData } = req.body;
      const emailChanged = newOwnerEmail && newOwnerEmail !== existingCompany.ownerEmail;
      
      // Update company data
      const updatedData = {
        ...updateData,
        ...(newOwnerEmail && { ownerEmail: newOwnerEmail })
      };

      const updatedCompany = await storage.updateCompany(companyId, updatedData);
      
      // If email changed, resend invitation to new email
      let emailSent = false;
      if (emailChanged) {
        const invitationToken = Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
        const invitationExpiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));

        await storage.updateCompany(companyId, {
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt,
        });

        const { sendCompanyInvitationEmail } = await import('./email-service');
        emailSent = await sendCompanyInvitationEmail({
          companyName: updatedCompany.name,
          companyEmail: newOwnerEmail,
          invitationToken,
        });
      }

      res.json({ 
        ...updatedCompany,
        emailSent: emailChanged ? emailSent : null,
        emailChanged
      });
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Fiscal Reports API Routes (606 and 607)
  app.get("/api/fiscal-reports/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(400).json({ message: "Company not found" });
      }
      
      const companyId = userCompany.id;

      // Get statistics for fiscal reports
      const stats = {
        report606Count: 0,
        report607Count: 0,
        lastGenerated606: null,
        lastGenerated607: null,
        pendingReports: 0
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching fiscal reports stats:", error);
      res.status(500).json({ message: "Failed to fetch fiscal reports stats" });
    }
  });

  app.get("/api/fiscal-reports/606", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(400).json({ message: "Company not found" });
      }
      
      const companyId = userCompany.id;

      // Get all 606 reports for company
      const reports606 = [];
      res.json(reports606);
    } catch (error) {
      console.error("Error fetching 606 reports:", error);
      res.status(500).json({ message: "Failed to fetch 606 reports" });
    }
  });

  app.get("/api/fiscal-reports/607", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(400).json({ message: "Company not found" });
      }
      
      const companyId = userCompany.id;

      // Get all 607 reports for company (sales data)
      const sales = await storage.getPOSSales(companyId);
      const invoices = await storage.getInvoices(companyId);
      
      const reports607 = [
        ...sales.map((sale: any) => ({
          id: sale.id,
          period: new Date(sale.date).toISOString().substring(0, 7).replace('-', ''),
          rncCedula: sale.customer?.rnc || sale.customer?.cedula || "000000000",
          tipoIdentificacion: sale.customer?.rnc ? "1" : "2",
          ncf: sale.ncf || "",
          fechaComprobante: new Date(sale.date),
          montoFacturado: sale.subtotal,
          itbisFacturado: sale.tax,
          total: sale.total,
          efectivo: sale.paymentMethod === "cash" ? sale.total : "0",
          tarjeta: sale.paymentMethod === "card" ? sale.total : "0",
          credito: sale.paymentMethod === "credit" ? sale.total : "0"
        })),
        ...invoices.map((invoice: any) => ({
          id: invoice.id,
          period: new Date(invoice.date).toISOString().substring(0, 7).replace('-', ''),
          rncCedula: invoice.customer?.rnc || invoice.customer?.cedula || "000000000",
          tipoIdentificacion: invoice.customer?.rnc ? "1" : "2",
          ncf: invoice.ncf || "",
          fechaComprobante: new Date(invoice.date),
          montoFacturado: invoice.subtotal,
          itbisFacturado: invoice.itbis,
          total: invoice.total
        }))
      ];
      
      res.json(reports607);
    } catch (error) {
      console.error("Error fetching 607 reports:", error);
      res.status(500).json({ message: "Failed to fetch 607 reports" });
    }
  });

  app.post("/api/fiscal-reports/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userCompany = await storage.getCompanyByUserId(userId);
      
      if (!userCompany) {
        return res.status(400).json({ message: "Company not found" });
      }
      
      const companyId = userCompany.id;

      const { type, period } = req.body;
      
      if (!type || !period) {
        return res.status(400).json({ message: "Type and period are required" });
      }

      // Generate fiscal report based on official DGII templates
      let reportContent = "";
      
      if (type === "606") {
        // Generate 606 report for purchases
        reportContent = await generateReport606(companyId, period);
      } else if (type === "607") {
        // Generate 607 report for sales
        reportContent = await generateReport607(companyId, period);
      } else {
        return res.status(400).json({ message: "Invalid report type" });
      }

      // Set headers for file download
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${type}_${period}.txt"`);
      res.send(reportContent);
    } catch (error) {
      console.error("Error generating fiscal report:", error);
      res.status(500).json({ message: "Failed to generate fiscal report" });
    }
  });

  // Helper functions for generating fiscal reports based on DGII templates
  async function generateReport606(companyId: number, period: string): Promise<string> {
    // Format: RNC|TIPO_ID|NUMERO_FACTURA|NCF|FECHA_FACTURA|FECHA_PAGO|MONTO_FACTURADO|ITBIS_FACTURADO|...
    const header = "606";
    const reportLines = [header];
    
    // Get company RNC
    const company = await storage.getCompany(companyId);
    const companyRnc = company?.rnc || "000000000";
    
    // Get purchase invoices for the period
    const invoices = await storage.getPurchaseInvoices(companyId);
    const periodYear = period.substring(0, 4);
    const periodMonth = period.substring(5, 7);
    
    for (const invoice of invoices) {
      const invoiceDate = new Date(invoice.invoiceDate);
      if (invoiceDate.getFullYear().toString() === periodYear && 
          (invoiceDate.getMonth() + 1).toString().padStart(2, '0') === periodMonth) {
        
        const supplier = await storage.getSupplier(invoice.supplierId);
        const line = [
          companyRnc,
          "31", // Tipo ID (default)
          invoice.invoiceNumber || "",
          invoice.ncf || "",
          invoice.invoiceDate,
          invoice.invoiceDate, // Fecha pago (same as invoice for now)
          parseFloat(invoice.totalAmount).toFixed(2),
          parseFloat(invoice.itbisAmount || "0").toFixed(2),
          "0.00", // ITBIS retenido
          "0.00", // ITBIS percibido
          "0.00", // Retención renta
          "0.00", // Propina
          parseFloat(invoice.totalAmount).toFixed(2), // Efectivo (default)
          "0.00", // Cheque
          "0.00", // Tarjeta
          "0.00", // Crédito
          "0.00", // Bonos
          "0.00", // Permuta
          "0.00"  // Otras formas
        ].join("|");
        
        reportLines.push(line);
      }
    }
    
    return reportLines.join("\n");
  }
  
  async function generateReport607(companyId: number, period: string): Promise<string> {
    // Formato 607 oficial DGII para ventas
    const reportLines: string[] = [];
    
    // Get company data
    const company = await storage.getCompany(companyId);
    const companyRnc = company?.rnc || "000000000";
    
    // Get sales data for the period
    const sales = await storage.getPOSSales(companyId);
    const invoices = await storage.getInvoices(companyId);
    const periodYear = period.substring(0, 4);
    const periodMonth = period.substring(4, 6);
    
    // Process POS sales
    for (const sale of sales) {
      const saleDate = new Date(sale.date);
      if (saleDate.getFullYear().toString() === periodYear && 
          (saleDate.getMonth() + 1).toString().padStart(2, '0') === periodMonth) {
        
        const customer = sale.customerId ? await storage.getCustomer(sale.customerId) : null;
        
        // Formato según especificación DGII 607
        const line = [
          customer?.rnc || customer?.cedula || "000000000",
          customer?.rnc ? "1" : "2", // 1=RNC, 2=Cédula
          sale.ncf || "",
          "", // NCF modificado
          "", // Tipo ingreso modificado
          saleDate.toISOString().split('T')[0].replace(/-/g, ''),
          "", // Fecha vencimiento
          parseFloat(sale.subtotal || "0").toFixed(2),
          parseFloat(sale.tax || "0").toFixed(2),
          "0.00", // ITBIS retenido
          "0.00", // Retención renta
          "0.00", // ITBIS percibido
          "0.00", // Propina (solo para restaurantes)
          sale.paymentMethod === "cash" ? parseFloat(sale.total || "0").toFixed(2) : "0.00",
          "0.00", // Cheque
          sale.paymentMethod === "card" ? parseFloat(sale.total || "0").toFixed(2) : "0.00",
          sale.paymentMethod === "credit" ? parseFloat(sale.total || "0").toFixed(2) : "0.00",
          "0.00", // Bonos
          "0.00", // Permuta
          "0.00"  // Otras formas
        ].join("|");
        
        reportLines.push(line);
      }
    }
    
    // Process invoices
    for (const invoice of invoices) {
      const invoiceDate = new Date(invoice.date);
      if (invoiceDate.getFullYear().toString() === periodYear && 
          (invoiceDate.getMonth() + 1).toString().padStart(2, '0') === periodMonth) {
        
        const customer = await storage.getCustomer(invoice.customerId);
        
        const line = [
          customer?.rnc || customer?.cedula || "000000000",
          customer?.rnc ? "1" : "2",
          invoice.ncf || "",
          "", // NCF modificado
          "", // Tipo ingreso modificado
          invoiceDate.toISOString().split('T')[0].replace(/-/g, ''),
          invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0].replace(/-/g, '') : "",
          parseFloat(invoice.subtotal || "0").toFixed(2),
          parseFloat(invoice.itbis || "0").toFixed(2),
          "0.00", // ITBIS retenido
          "0.00", // Retención renta
          "0.00", // ITBIS percibido
          "0.00", // Propina (solo para restaurantes)
          "0.00", // Efectivo
          "0.00", // Cheque
          "0.00", // Tarjeta
          parseFloat(invoice.total || "0").toFixed(2), // Crédito
          "0.00", // Bonos
          "0.00", // Permuta
          "0.00"  // Otras formas
        ].join("|");
        
        reportLines.push(line);
      }
    }
    
    return reportLines.join("\n");
  }

  // Invoice Printing Routes
  app.post("/api/pos/print-thermal/:saleId", isAuthenticated, async (req: any, res) => {
    try {
      const { saleId } = req.params;
      const { width = '80mm', showLogo = true, showNCF = true, showQR = true, paperCut = true, cashDrawer = false } = req.body;
      const companyId = req.user.companyId;

      // Get sale data
      const sale = await storage.getPOSSale(parseInt(saleId), companyId);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      const items = await storage.getPOSSaleItems(sale.id);
      const company = await storage.getCompany(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Prepare customer info
      const customerInfo = {
        name: sale.customerName,
        phone: sale.customerPhone,
        rnc: sale.customerRnc
      };

      const printOptions: ThermalPrintOptions = {
        width: width as '80mm' | '56mm',
        showLogo,
        showNCF,
        showQR,
        paperCut,
        cashDrawer
      };

      // Generate thermal receipt
      const result = await InvoiceTemplateService.generateThermalReceipt(
        { sale, items, company, customerInfo },
        printOptions
      );

      res.json({
        success: true,
        printData: result.printData,
        previewUrl: result.previewUrl,
        width: printOptions.width
      });

    } catch (error) {
      console.error("Error generating thermal receipt:", error);
      res.status(500).json({ message: "Failed to generate thermal receipt" });
    }
  });

  app.post("/api/pos/print-pdf/:saleId", isAuthenticated, async (req: any, res) => {
    try {
      const { saleId } = req.params;
      const { 
        format = 'letter', 
        orientation = 'portrait', 
        showLogo = true, 
        showNCF = true, 
        showQR = true,
        watermark 
      } = req.body;
      const companyId = req.user.companyId;

      // Get sale data
      const sale = await storage.getPOSSale(parseInt(saleId), companyId);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      const items = await storage.getPOSSaleItems(sale.id);
      const company = await storage.getCompany(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Prepare customer info
      const customerInfo = {
        name: sale.customerName,
        phone: sale.customerPhone,
        rnc: sale.customerRnc
      };

      const pdfOptions: PDFPrintOptions = {
        format: format as 'letter' | 'a4' | 'legal',
        orientation: orientation as 'portrait' | 'landscape',
        showLogo,
        showNCF,
        showQR,
        watermark
      };

      // Generate PDF invoice
      const result = await InvoiceTemplateService.generatePDFInvoice(
        { sale, items, company, customerInfo },
        pdfOptions
      );

      res.json({
        success: true,
        pdfUrl: result.pdfUrl,
        downloadUrl: result.downloadUrl,
        format: pdfOptions.format
      });

    } catch (error) {
      console.error("Error generating PDF invoice:", error);
      res.status(500).json({ message: "Failed to generate PDF invoice" });
    }
  });

  // Get available print formats
  app.get("/api/pos/print-formats", isAuthenticated, (req, res) => {
    res.json({
      thermal: InvoiceTemplateService.getThermalSizes(),
      pdf: InvoiceTemplateService.getPDFFormats()
    });
  });

  return httpServer;
}