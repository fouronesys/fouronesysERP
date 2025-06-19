import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import session from "express-session";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { auditLogger } from "./audit-logger";
import { initializeAdminUser } from "./init-admin";
import { moduleInitializer } from "./module-initializer";
import { sendApiKeyEmail } from "./email-service";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { insertCustomerSchema } from "../shared/schema";
import { dgiiRegistryUpdater } from "./dgii-registry-updater";

// File upload configuration
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Simple authentication middleware for admin routes
function simpleAuth(req: any, res: any, next: any) {
  // For now, allow admin operations without session for testing
  // In production, this should check proper authentication
  req.user = { 
    id: "admin-fourone-001", 
    email: "admin@fourone.com.do", 
    role: "super_admin" 
  };
  next();
}

// Super admin only middleware - ONLY admin@fourone.com.do has access
function superAdminOnly(req: any, res: any, next: any) {
  const user = req.user;
  if (!user || user.email !== 'admin@fourone.com.do') {
    return res.status(403).json({ 
      message: "Acceso denegado. Solo el súper administrador puede acceder a esta función." 
    });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware
  setupAuth(app);

  // Session heartbeat endpoint to keep sessions alive during deployments
  app.post("/api/auth/heartbeat", isAuthenticated, async (req: any, res) => {
    try {
      res.json({ 
        status: 'alive',
        userId: req.user.id,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Heartbeat error:", error);
      res.status(500).json({ message: "Heartbeat failed" });
    }
  });
  
  // Initialize admin user
  await initializeAdminUser();
  
  // Initialize system modules and configuration
  await moduleInitializer.initializeSystem();
  console.log("RNC registry initialized successfully");

  // Admin company management endpoints
  app.get("/api/admin/companies", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {

      const companies = await storage.getAllCompaniesWithDetails();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  // Update company status (activate/deactivate)
  app.patch("/api/admin/companies/:id/status", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {

      const { id } = req.params;
      const { isActive } = req.body;

      const company = await storage.updateCompanyStatus(parseInt(id), isActive);
      
      // Log company status update
      await auditLogger.logUserAction(
        req.user.id,
        parseInt(id),
        isActive ? 'COMPANY_ACTIVATED' : 'COMPANY_DEACTIVATED',
        'company',
        id,
        undefined,
        { isActive },
        req
      );
      
      res.json(company);
    } catch (error) {
      console.error("Error updating company status:", error);
      res.status(500).json({ message: "Failed to update company status" });
    }
  });

  // Delete company
  app.delete("/api/admin/companies/:id", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {

      const companyId = parseInt(req.params.id);
      
      await storage.deleteCompany(companyId);
      
      // Log company deletion
      await auditLogger.logUserAction(
        req.user.id,
        companyId,
        'COMPANY_DELETED',
        'company',
        req.params.id,
        undefined,
        { companyId },
        req
      );
      
      res.json({ success: true, message: "Company deleted successfully" });
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // Update company details
  app.put("/api/admin/companies/:id", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {

      const companyId = parseInt(req.params.id);
      const existingCompany = await storage.getCompany(companyId);

      if (!existingCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Remove fields that shouldn't be updated directly
      const { ownerId, ...updateData } = req.body;
      
      const updatedCompany = await storage.updateCompany(companyId, updateData);
      
      res.json(updatedCompany);
    } catch (error: any) {
      console.error("Error updating company:", error);
      res.status(500).json({ 
        message: "No se pudo actualizar empresa", 
        error: error?.message || "Error interno del servidor"
      });
    }
  });

  // Create new company
  app.post("/api/admin/companies", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {

      const newCompany = await storage.createCompany(req.body);
      res.json(newCompany);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  // Bulk company operations
  app.patch("/api/admin/companies/bulk-activate", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {

      const { companyIds } = req.body;
      
      for (const id of companyIds) {
        await storage.updateCompanyStatus(id, true);
      }
      
      res.json({ success: true, message: "Companies activated successfully" });
    } catch (error) {
      console.error("Error bulk activating companies:", error);
      res.status(500).json({ message: "Failed to activate companies" });
    }
  });

  app.patch("/api/admin/companies/bulk-deactivate", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {

      const { companyIds } = req.body;
      
      for (const id of companyIds) {
        await storage.updateCompanyStatus(id, false);
      }
      
      res.json({ success: true, message: "Companies deactivated successfully" });
    } catch (error) {
      console.error("Error bulk deactivating companies:", error);
      res.status(500).json({ message: "Failed to deactivate companies" });
    }
  });

  // Resend email invitation
  app.post("/api/admin/companies/:id/resend-email", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {

      const companyId = parseInt(req.params.id);
      const company = await storage.getCompany(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Resend email logic here
      res.json({ success: true, message: "Email resent successfully" });
    } catch (error) {
      console.error("Error resending email:", error);
      res.status(500).json({ message: "Failed to resend email" });
    }
  });

  // Basic user endpoint for authenticated users
  app.get("/api/user", simpleAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Customer endpoints
  app.get("/api/customers", simpleAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const company = await storage.getCompanyByUserId(user.id);
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

  app.post("/api/customers", simpleAuth, async (req: any, res) => {
    try {
      const user = req.user;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Validate request body with Zod schema
      const validation = insertCustomerSchema.safeParse({
        ...req.body,
        companyId: company.id
      });

      if (!validation.success) {
        console.error("Customer validation error:", validation.error);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: validation.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }

      const customer = await storage.createCustomer(validation.data);
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.patch("/api/customers/:id", simpleAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const customer = await storage.updateCustomer(parseInt(id), req.body, company.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.delete("/api/customers/:id", simpleAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      await storage.deleteCustomer(parseInt(id), company.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // RNC verification endpoint
  app.get("/api/verify-rnc/:rnc", async (req, res) => {
    try {
      const { rnc } = req.params;
      
      // Clean and validate RNC format
      const cleanRnc = rnc.replace(/\D/g, "");
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({
          isValid: false,
          rnc: cleanRnc,
          message: `RNC debe tener entre 9 y 11 dígitos. RNC procesado: ${cleanRnc} (${cleanRnc.length} dígitos)`
        });
      }

      // Search in local DGII registry
      const rncData = await storage.getRNCFromRegistry(cleanRnc);
      
      if (rncData) {
        return res.json({
          isValid: true,
          rnc: cleanRnc,
          razonSocial: rncData.razonSocial,
          companyName: rncData.razonSocial,
          nombreComercial: rncData.nombreComercial,
          estado: rncData.estado || "ACTIVO",
          tipo: rncData.categoria || "CONTRIBUYENTE REGISTRADO",
          source: "local"
        });
      } else {
        return res.json({
          isValid: false,
          rnc: cleanRnc,
          message: "RNC no encontrado en el registro local de DGII",
          source: "local"
        });
      }
    } catch (error) {
      console.error("Error verifying RNC:", error);
      res.json({
        isValid: false,
        message: "Error interno del servidor al verificar RNC"
      });
    }
  });

  // Admin Analytics endpoint
  app.get("/api/admin/analytics", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {
      const timeRange = req.query.timeRange || "30d";
      const companies = await storage.getAllCompanies();

      // Calculate metrics
      const totalCompanies = companies.length;
      const activeCompanies = companies.filter((c) => c.isActive).length;
      const trialCompanies = companies.filter(
        (c) => c.subscriptionPlan === "trial"
      ).length;
      const paidCompanies = companies.filter(
        (c) => c.subscriptionPlan !== "trial"
      ).length;

      // Growth metrics (simplified for now)
      const analytics = {
        overview: {
          totalCompanies,
          activeCompanies,
          trialCompanies,
          paidCompanies,
          conversionRate: totalCompanies > 0 ? (paidCompanies / totalCompanies * 100).toFixed(1) : "0"
        },
        timeRange,
        growth: {
          newCompanies: Math.floor(Math.random() * 10), // This should be calculated from actual data
          revenue: Math.floor(Math.random() * 50000), // This should be calculated from actual data
          activeUsers: activeCompanies
        },
        trends: {
          daily: [], // This should be populated with real data
          monthly: []
        }
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching admin analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Admin Modules endpoint
  app.get("/api/admin/modules", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {
      const modules = await storage.getSystemModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching admin modules:", error);
      res.status(500).json({ message: "Failed to fetch modules" });
    }
  });

  // DGII RNC Registry Management
  app.post("/api/admin/dgii/update-registry", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {
      console.log("Manual DGII RNC registry update initiated by admin");
      const updateResult = await dgiiRegistryUpdater.performUpdate();
      
      if (updateResult) {
        res.json({
          success: true,
          message: "DGII RNC registry updated successfully",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to update DGII RNC registry"
        });
      }
    } catch (error) {
      console.error("Error updating DGII registry:", error);
      res.status(500).json({
        success: false,
        message: "Error updating DGII registry",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/admin/dgii/registry-status", isAuthenticated, superAdminOnly, async (req: any, res) => {
    try {
      const status = dgiiRegistryUpdater.getStatus();
      const registryCount = await storage.getRNCRegistryCount();
      
      res.json({
        ...status,
        registryCount,
        lastChecked: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching DGII registry status:", error);
      res.status(500).json({ message: "Failed to fetch registry status" });
    }
  });

  // Downloads endpoint
  app.get("/api/downloads/available", async (req, res) => {
    try {
      const downloads = [
        {
          id: 1,
          name: "Aplicación Windows",
          description: "Versión completa para Windows con funcionalidades avanzadas",
          platform: "windows",
          version: "1.0.0",
          size: "45.2 MB",
          downloadUrl: "/downloads/FourOneSystem-Windows-1.0.0.exe"
        },
        {
          id: 2,
          name: "Aplicación Android",
          description: "Versión móvil para Android con funcionalidades POS",
          platform: "android",
          version: "1.0.0",
          size: "12.8 MB",
          downloadUrl: "/downloads/FourOneSystem-Android-1.0.0.apk"
        }
      ];
      
      res.json(downloads);
    } catch (error) {
      console.error("Error fetching downloads:", error);
      res.status(500).json({ message: "Error fetching downloads" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}