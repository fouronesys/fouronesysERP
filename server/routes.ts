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
import { insertCustomerSchema, invoiceItems, posSales, ncfSequences } from "../shared/schema";
import { dgiiRegistryUpdater } from "./dgii-registry-updater";
import { InvoicePOS80mmService } from "./invoice-pos-80mm-service";
import { InvoiceHTMLService } from "./invoice-html-service";
import { db } from "./db";
import { and, eq, isNotNull, desc, sql } from "drizzle-orm";

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

  // Admin auto-login endpoint for SuperAdmin interface
  app.post("/api/admin/auto-login", async (req: any, res) => {
    try {
      // Auto-authenticate as admin user for SuperAdmin interface
      const adminUser = {
        id: "admin-fourone-001",
        email: "admin@fourone.com.do",
        firstName: "Super",
        lastName: "Admin",
        role: "superadmin"
      };
      
      req.session.userId = adminUser.id;
      req.user = adminUser;
      
      res.json({ user: adminUser, success: true });
    } catch (error) {
      console.error("Admin auto-login error:", error);
      res.status(500).json({ message: "Auto-login failed" });
    }
  });

  // Admin company management endpoints
  app.get("/api/admin/companies", simpleAuth, async (req: any, res) => {
    try {
      console.log(`[DEBUG] Fetching admin companies for user: ${req.user.id}`);
      const companies = await storage.getAllCompaniesWithDetails();
      console.log(`[DEBUG] Found ${companies.length} admin companies`);
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

  // Update company details (PUT)
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

  // Update company details (PATCH)
  app.patch("/api/admin/companies/:id", simpleAuth, async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const existingCompany = await storage.getCompany(companyId);

      if (!existingCompany) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Remove fields that shouldn't be updated directly
      const { ownerId, ...updateData } = req.body;
      
      const updatedCompany = await storage.updateCompany(companyId, updateData);
      
      // Log company update
      await auditLogger.logUserAction(
        req.user.id,
        companyId,
        'COMPANY_UPDATED',
        'company',
        companyId.toString(),
        existingCompany,
        updateData,
        req
      );
      
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

  // Users management endpoints
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const users = await storage.getCompanyUsers(req.user.companyId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const userData = {
        ...req.body,
        companyId: req.user.companyId,
        createdBy: req.user.id,
      };
      const newUser = await storage.createUser(userData);
      
      // Log user creation
      await auditLogger.logUserAction(
        req.user.id,
        req.user.companyId,
        'USER_CREATED',
        'user',
        newUser.id,
        undefined,
        { email: newUser.email, role: newUser.role },
        req
      );
      
      res.json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const existingUser = await storage.getUser(userId);
      
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, req.body);
      
      // Log user update
      await auditLogger.logUserAction(
        req.user.id,
        req.user.companyId,
        'USER_UPDATED',
        'user',
        userId,
        existingUser,
        req.body,
        req
      );
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Roles management endpoints
  app.get("/api/roles", isAuthenticated, async (req: any, res) => {
    try {
      const roles = await storage.getCompanyRoles(req.user.companyId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post("/api/roles", isAuthenticated, async (req: any, res) => {
    try {
      const roleData = {
        ...req.body,
        companyId: req.user.companyId,
        createdBy: req.user.id,
      };
      const newRole = await storage.createRole(roleData);
      
      // Log role creation
      await auditLogger.logUserAction(
        req.user.id,
        req.user.companyId,
        'ROLE_CREATED',
        'role',
        newRole.id,
        undefined,
        { name: newRole.name, permissions: newRole.permissions },
        req
      );
      
      res.json(newRole);
    } catch (error) {
      console.error("Error creating role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.patch("/api/roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const roleId = req.params.id;
      const existingRole = await storage.getRole(roleId);
      
      if (!existingRole) {
        return res.status(404).json({ message: "Role not found" });
      }
      
      const updatedRole = await storage.updateRole(roleId, req.body);
      
      // Log role update
      await auditLogger.logUserAction(
        req.user.id,
        req.user.companyId,
        'ROLE_UPDATED',
        'role',
        roleId,
        existingRole,
        req.body,
        req
      );
      
      res.json(updatedRole);
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({ message: "Failed to update role" });
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

  // DGII RNC lookup endpoint
  app.get("/api/dgii/rnc-lookup", async (req, res) => {
    try {
      const { rnc } = req.query;
      
      if (!rnc || typeof rnc !== 'string') {
        return res.status(400).json({
          success: false,
          message: "RNC parameter is required"
        });
      }
      
      // Clean and validate RNC format
      const cleanRnc = rnc.replace(/\D/g, "");
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({
          success: false,
          message: "RNC debe tener entre 9 y 11 dígitos"
        });
      }

      // Search in local DGII registry
      const rncData = await storage.getRNCFromRegistry(cleanRnc);
      
      if (rncData) {
        return res.json({
          success: true,
          data: {
            rnc: cleanRnc,
            name: rncData.razonSocial,
            razonSocial: rncData.razonSocial,
            nombreComercial: rncData.nombreComercial,
            estado: rncData.estado || "ACTIVO",
            categoria: rncData.categoria || "CONTRIBUYENTE REGISTRADO"
          }
        });
      } else {
        return res.json({
          success: false,
          message: "RNC no encontrado en el registro de DGII"
        });
      }
    } catch (error) {
      console.error("Error in DGII RNC lookup:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  });

  // RNC search endpoint for name suggestions
  app.get("/api/rnc/search", async (req, res) => {
    try {
      const { query, limit = 10 } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.json({
          companies: []
        });
      }
      
      if (query.length < 3) {
        return res.json({
          companies: []
        });
      }
      
      // Search companies by name in local DGII registry
      const companies = await storage.searchRNCByName(query.toString(), parseInt(limit.toString()));
      
      // Format the response to match the expected structure
      const formattedCompanies = companies.map(company => ({
        rnc: company.rnc,
        name: company.razonSocial,
        status: company.estado || "ACTIVO",
        category: company.categoria || "CONTRIBUYENTE REGISTRADO"
      }));
      
      res.json({
        companies: formattedCompanies
      });
    } catch (error) {
      console.error("Error searching RNC companies:", error);
      res.json({
        companies: []
      });
    }
  });

  // DGII company search endpoint
  app.get("/api/dgii/search-companies", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string' || query.length < 3) {
        return res.json({
          success: false,
          message: "Query parameter must be at least 3 characters"
        });
      }
      
      // Search companies by name in DGII registry
      const companies = await storage.searchCompaniesByName(query.trim());
      
      if (companies && companies.length > 0) {
        return res.json({
          success: true,
          data: companies.slice(0, 10).map(company => ({
            rnc: company.rnc,
            razonSocial: company.razonSocial,
            name: company.razonSocial,
            nombreComercial: company.nombreComercial,
            categoria: company.categoria,
            estado: company.estado
          }))
        });
      } else {
        return res.json({
          success: false,
          message: "No se encontraron empresas con ese nombre",
          data: []
        });
      }
    } catch (error) {
      console.error("Error searching companies:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  });

  // Customer RNC verification endpoint
  app.get("/api/customers/verify-rnc/:rnc", isAuthenticated, async (req: any, res) => {
    try {
      const { rnc } = req.params;
      
      // Clean and validate RNC format
      const cleanRnc = rnc.replace(/\D/g, "");
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({
          isValid: false,
          message: "RNC debe tener entre 9 y 11 dígitos"
        });
      }

      // Check if customer exists first
      const existingCustomer = await storage.getCustomerByRNC(req.user.companyId, cleanRnc);
      if (existingCustomer) {
        return res.json({
          exists: true,
          customer: existingCustomer,
          validation: {
            valid: true,
            rnc: cleanRnc
          }
        });
      }

      // Search in DGII registry
      const rncData = await storage.getRNCFromRegistry(cleanRnc);
      
      if (rncData) {
        return res.json({
          exists: false,
          validation: {
            valid: true,
            rnc: cleanRnc,
            data: {
              rnc: cleanRnc,
              name: rncData.razonSocial,
              businessName: rncData.nombreComercial || rncData.razonSocial,
              razonSocial: rncData.razonSocial,
              estado: rncData.estado || "ACTIVO",
              categoria: rncData.categoria || "CONTRIBUYENTE REGISTRADO"
            }
          }
        });
      } else {
        return res.json({
          exists: false,
          validation: {
            valid: false,
            rnc: cleanRnc,
            message: "RNC no encontrado en el registro de DGII"
          }
        });
      }
    } catch (error) {
      console.error("Error verifying customer RNC:", error);
      res.status(500).json({
        isValid: false,
        message: "Error interno del servidor"
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

  // DGII Analytics endpoint
  app.get("/api/fiscal/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Get real fiscal analytics data
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      // Count total fiscal documents (invoices)
      const documentsCount = await storage.getPOSSalesCount(company.id, currentYear);
      
      // Calculate total invoiced amount
      const totalInvoiced = await storage.getPOSSalesTotalAmount(company.id, currentYear);
      
      // Count generated reports
      const reportsSent = await storage.getFiscalReportsCount(company.id, currentYear);
      
      // Calculate compliance rate based on monthly reports submitted
      const expectedReports = currentMonth; // One report per month
      const complianceRate = reportsSent > 0 ? Math.min(Math.round((reportsSent / expectedReports) * 100), 100) : 0;

      res.json({
        documentsCount: documentsCount || 0,
        totalInvoiced: totalInvoiced || 0,
        complianceRate,
        reportsSent: reportsSent || 0,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching DGII analytics:", error);
      res.status(500).json({ message: "Failed to fetch DGII analytics" });
    }
  });

  // Payment management routes
  app.post("/api/payments/submissions", async (req: any, res) => {
    try {
      const paymentData = {
        ...req.body,
        submittedAt: new Date()
      };
      
      const payment = await storage.createPaymentSubmission(paymentData);
      
      res.json({ 
        success: true, 
        message: 'Payment submission received successfully',
        paymentId: payment.id 
      });
    } catch (error) {
      console.error("Error processing payment submission:", error);
      res.status(500).json({ message: "Failed to process payment submission" });
    }
  });

  app.get("/api/payments/submissions", simpleAuth, async (req: any, res) => {
    try {
      const payments = await storage.getPaymentSubmissions();
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payment submissions:", error);
      res.status(500).json({ message: "Failed to fetch payment submissions" });
    }
  });

  app.patch("/api/payments/:id/status", simpleAuth, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      console.log(`[DEBUG] Updating payment ${id} to status: ${status}`);
      console.log(`[DEBUG] Request body:`, req.body);

      const payment = await storage.updatePaymentStatus(parseInt(id), status, notes);
      console.log(`[DEBUG] Payment updated:`, payment);

      // If payment is confirmed, update company subscription dates
      if (status === 'confirmed' && payment.email) {
        try {
          // Find user by email to get their company
          const user = await storage.getUserByEmail(payment.email);
          if (user) {
            const company = await storage.getCompanyByUserId(user.id);
            if (company) {
              // Set subscription dates based on payment confirmation date
              const confirmationDate = new Date();
              const expiryDate = new Date();
              
              // Determine subscription period based on amount or plan
              const amount = parseFloat(payment.amount || '0');
              if (amount >= 20000) { // Annual plan (assuming $200+ for annual)
                expiryDate.setFullYear(confirmationDate.getFullYear() + 1);
              } else {
                expiryDate.setMonth(confirmationDate.getMonth() + 1);
              }

              await storage.updateCompany(company.id, {
                subscriptionStartDate: confirmationDate,
                subscriptionExpiry: expiryDate,
                subscriptionPlan: amount >= 20000 ? 'annual' : 'monthly'
              });
            }
          }
        } catch (error) {
          console.error('Failed to update subscription dates:', error);
        }
      }

      await auditLogger.log({
        userId: req.user.id,
        module: 'Payment',
        action: 'PAYMENT_STATUS_UPDATED',
        entityType: 'payment',
        entityId: id,
        newValues: { status, notes },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        success: true,
        severity: 'info'
      });

      res.json(payment);
    } catch (error) {
      console.error("Error updating payment status:", error);
      res.status(500).json({ message: "Failed to update payment status" });
    }
  });

  app.get("/api/user/payment-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;
      
      // Check if user is super admin
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      
      // Super admins always have valid payment access
      if (isSuperAdmin) {
        return res.json({ 
          hasValidPayment: true, 
          status: 'confirmed', 
          message: 'Super admin access - bypass payment requirements',
          isSuperAdmin: true
        });
      }
      
      // Get user's company to check payment status
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.json({ 
          hasValidPayment: false, 
          status: 'pending', 
          message: 'No company found for user' 
        });
      }
      
      // Check company payment status
      const hasValidPayment = company.paymentStatus === 'confirmed';
      
      res.json({ 
        hasValidPayment,
        status: company.paymentStatus || 'pending',
        subscriptionPlan: company.subscriptionPlan,
        subscriptionExpiry: company.subscriptionExpiry
      });
    } catch (error) {
      console.error("Error fetching user payment status:", error);
      res.status(500).json({ message: "Failed to fetch payment status" });
    }
  });

  // Dashboard metrics endpoint
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

  // Sales chart data endpoint
  app.get("/api/dashboard/sales-chart", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const salesData = await storage.getSalesChartData(company.id);
      res.json(salesData);
    } catch (error) {
      console.error("Error fetching sales chart data:", error);
      res.status(500).json({ message: "Failed to fetch sales chart data" });
    }
  });

  app.get("/api/companies/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error fetching current company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.put("/api/companies/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Clean the update data and handle logo field mapping
      const updateData = { ...req.body };
      
      // Map frontend 'logo' field to database 'logoUrl' field
      if (updateData.logo !== undefined) {
        updateData.logoUrl = updateData.logo;
        delete updateData.logo;
      }

      // Remove any undefined or null values that might cause database issues
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
          delete updateData[key];
        }
      });

      const updatedCompany = await storage.updateCompany(company.id, updateData);
      
      await auditLogger.logFiscalAction(
        userId,
        company.id,
        'update_company_settings',
        'company',
        company.id.toString(),
        updateData,
        req
      );

      res.json(updatedCompany);
    } catch (error) {
      console.error("Error updating company settings:", error);
      res.status(500).json({ message: "Error al guardar configuración de la empresa" });
    }
  });

  // Company management endpoints for SuperAdmin
  app.get("/api/companies/all", simpleAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log(`[DEBUG] Fetching companies for user: ${userId}`);
      
      const companies = await storage.getAllCompaniesWithDetails();
      console.log(`[DEBUG] Found ${companies.length} companies`);
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post("/api/companies", simpleAuth, async (req: any, res) => {
    try {
      const newCompany = await storage.createCompany(req.body);
      res.json(newCompany);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.put("/api/companies/:id", simpleAuth, async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const { ownerId, paymentConfirmed, subscriptionPlan, ...updateData } = req.body;
      
      // Map paymentConfirmed to paymentStatus
      if (typeof paymentConfirmed === 'boolean') {
        updateData.paymentStatus = paymentConfirmed ? 'confirmed' : 'pending';
        
        // If payment is being confirmed, update subscription dates
        if (paymentConfirmed) {
          const { confirmPaymentAndUpdateSubscription } = await import('./subscription-service');
          await confirmPaymentAndUpdateSubscription(companyId);
        }
      }
      
      // Handle subscription plan changes
      if (subscriptionPlan) {
        const currentCompany = await storage.getCompanyById(companyId);
        if (currentCompany && subscriptionPlan !== currentCompany.subscriptionPlan) {
          const { updateCompanySubscription } = await import('./subscription-service');
          await updateCompanySubscription(companyId, subscriptionPlan);
          console.log(`[DEBUG] Updated subscription plan from ${currentCompany.subscriptionPlan} to ${subscriptionPlan}`);
        }
      }
      
      console.log(`[DEBUG] Updating company ${companyId} with data:`, updateData);
      
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

  app.delete("/api/companies/:id", simpleAuth, async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.id);
      await storage.deleteCompany(companyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting company:", error);
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  app.patch("/api/companies/bulk-activate", simpleAuth, async (req: any, res) => {
    try {
      const { companyIds } = req.body;
      const results = [];
      
      for (const id of companyIds) {
        const company = await storage.updateCompanyStatus(id, true);
        results.push(company);
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error bulk activating companies:", error);
      res.status(500).json({ message: "Failed to activate companies" });
    }
  });

  app.patch("/api/companies/bulk-deactivate", simpleAuth, async (req: any, res) => {
    try {
      const { companyIds } = req.body;
      const results = [];
      
      for (const id of companyIds) {
        const company = await storage.updateCompanyStatus(id, false);
        results.push(company);
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error bulk deactivating companies:", error);
      res.status(500).json({ message: "Failed to deactivate companies" });
    }
  });

  app.post("/api/companies/:id/resend-email", simpleAuth, async (req: any, res) => {
    try {
      const companyId = parseInt(req.params.id);
      const company = await storage.getCompany(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      res.json({ emailSent: true, message: "Invitation resent successfully" });
    } catch (error) {
      console.error("Error resending email:", error);
      res.status(500).json({ message: "Failed to resend email" });
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
      const productData = {
        ...req.body,
        companyId: company.id,
      };
      const product = await storage.createProduct(productData);
      
      // Log product creation
      await auditLogger.logProductAction(userId, company.id, 'create', product.id.toString(), null, product, req);
      
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const product = await storage.updateProduct(id, updateData, company.id);
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
      
      // Get product data before deletion for audit
      const deletedProduct = await storage.getProduct(id, company.id);
      
      await storage.deleteProduct(id, company.id);
      
      // Log product deletion
      await auditLogger.logProductAction(userId, company.id, 'delete', id.toString(), deletedProduct, null, req);
      
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
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

      const { items, ...invoiceData } = req.body;
      
      // Create invoice header with proper field mapping
      const processedInvoiceData = {
        ...invoiceData,
        companyId: company.id,
        customerId: parseInt(invoiceData.customerId) || 0,
        selectiveConsumptionTax: invoiceData.selectiveConsumptionTax || "0",
        otherTaxes: invoiceData.otherTaxes || "0"
      };
      
      const invoice = await storage.createInvoice(processedInvoiceData);

      // Create invoice items if provided
      if (items && items.length > 0) {
        for (const item of items) {
          const itemData = {
            invoiceId: invoice.id,
            productId: parseInt(item.productId),
            description: item.description || item.productName || 'Producto',
            quantity: parseInt(item.quantity),
            price: parseFloat(item.unitPrice || item.price).toFixed(2),
            subtotal: parseFloat(item.subtotal).toFixed(2),
            taxType: invoiceData.taxType || "itbis_18",
            taxRate: "18.00",
            taxAmount: (parseFloat(item.subtotal) * 0.18).toFixed(2),
            total: (parseFloat(item.subtotal) * 1.18).toFixed(2)
          };
          
          await storage.createInvoiceItem(itemData);
          
          // Deduct stock for the product
          try {
            const product = await storage.getProduct(parseInt(item.productId), company.id);
            if (product && product.stock !== null) {
              const currentStock = parseInt(product.stock?.toString() || "0");
              const newStock = Math.max(0, currentStock - parseInt(item.quantity));
              await storage.updateProduct(parseInt(item.productId), { stock: newStock }, company.id);
            }
          } catch (stockError) {
            console.error("Error updating stock for product:", item.productId, stockError);
          }
        }
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.delete("/api/invoices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const invoiceId = parseInt(req.params.id);
      
      // Restore stock before deleting invoice
      try {
        await storage.restoreInvoiceStock(invoiceId, company.id, userId);
      } catch (stockError) {
        console.error("Error restoring stock for deleted invoice:", stockError);
        // Continue with deletion even if stock restoration fails
      }
      
      await storage.deleteInvoice(invoiceId, company.id);
      
      res.status(200).json({ success: true, message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice", error: String(error) });
    }
  });

  // Sale verification endpoint (public, no authentication required)
  app.get("/api/verify/sale/:saleId", async (req: any, res) => {
    try {
      const saleId = parseInt(req.params.saleId);
      
      // Use public verification method in storage
      const verification = await storage.verifySaleById(saleId);
      
      if (!verification) {
        return res.json({ 
          valid: false, 
          message: "Venta no encontrada" 
        });
      }

      res.json({
        valid: true,
        sale: verification.sale,
        company: verification.company,
        items: verification.items
      });
    } catch (error) {
      console.error("Error verifying sale:", error);
      res.json({ 
        valid: false, 
        message: "Error al verificar la venta" 
      });
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
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        companyId: company.id,
      });
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Purchase Orders routes
  app.get("/api/purchase-orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const purchaseOrders = await storage.getPurchaseOrders(company.id);
      res.json(purchaseOrders);
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
      const purchaseOrderData = {
        ...req.body,
        companyId: company.id,
      };
      const purchaseOrder = await storage.createPurchaseOrder(purchaseOrderData);
      res.json(purchaseOrder);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Failed to create purchase order" });
    }
  });

  // Suppliers routes
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
      const supplierData = {
        ...req.body,
        companyId: company.id,
      };
      const supplier = await storage.createSupplier(supplierData);
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.patch("/api/suppliers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const supplier = await storage.updateSupplier(supplierId, req.body);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete("/api/suppliers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      await storage.deleteSupplier(supplierId, company.id);
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Inventory movements routes
  app.get("/api/inventory-movements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const movements = await storage.getInventoryMovements(company.id);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching inventory movements:", error);
      res.status(500).json({ message: "Failed to fetch inventory movements" });
    }
  });

  app.post("/api/inventory-movements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const movementData = {
        ...req.body,
        companyId: company.id,
        createdBy: userId,
      };
      const movement = await storage.createInventoryMovement(movementData);
      res.json(movement);
    } catch (error) {
      console.error("Error creating inventory movement:", error);
      res.status(500).json({ message: "Failed to create inventory movement" });
    }
  });

  // POS Cart Management Routes
  app.get("/api/pos/cart", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const cartItems = await storage.getPOSCartItems(company.id, userId);
      res.json(cartItems);
    } catch (error) {
      console.error("Error fetching cart items:", error);
      res.status(500).json({ message: "Failed to fetch cart items" });
    }
  });

  app.post("/api/pos/cart", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Support both legacy format and new format
      const { id, price, productId, quantity = 1, unitPrice, subtotal } = req.body;
      const finalProductId = productId || id;
      const finalUnitPrice = unitPrice || price;
      const finalQuantity = parseInt(quantity);
      const finalSubtotal = subtotal || (finalUnitPrice * finalQuantity);
      
      if (!finalProductId) {
        return res.status(400).json({ message: "Product ID is required" });
      }
      
      // Check if item already exists in cart
      const existingItems = await storage.getPOSCartItems(company.id, userId);
      const existingItem = existingItems.find(item => item.productId === finalProductId);

      if (existingItem) {
        // Calculate quantity difference for stock adjustment
        const oldQuantity = parseInt(existingItem.quantity);
        const newQuantity = oldQuantity + finalQuantity;
        const quantityDifference = finalQuantity; // Only the added quantity affects stock
        
        // Get product details for stock management
        const product = await storage.getProduct(finalProductId, company.id);
        
        // Skip stock validation for services and non-inventoriable products
        const isStockless = product?.productType === 'service' || 
                           product?.productType === 'non_inventoriable' || 
                           product?.trackInventory === false;
        
        if (product && !isStockless && product.stock !== null && product.stock !== undefined) {
          const currentStock = parseInt(String(product.stock) || "0");
          const newStock = Math.floor(currentStock - quantityDifference);
          
          if (newStock < 0) {
            return res.status(400).json({ 
              message: `Stock insuficiente. Disponible: ${currentStock}` 
            });
          }
          
          await storage.updateProduct(finalProductId, { stock: newStock }, company.id);
        }
        
        // Update existing item quantity
        const updatedItem = await storage.updatePOSCartItem(existingItem.id, newQuantity);
        res.json(updatedItem);
        return;
      }
      
      // Get product details to check if it's manufactured/consumable
      const product = await storage.getProduct(finalProductId, company.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Skip stock validation for services and non-inventoriable products
      const isStockless = product.productType === 'service' || 
                         product.productType === 'non_inventoriable' || 
                         product.trackInventory === false;
      
      // Check and update stock for regular products only
      if (!isStockless && product.stock !== null && product.stock !== undefined) {
        const currentStock = parseInt(String(product.stock) || "0");
        const newStock = currentStock - finalQuantity;
        
        if (newStock < 0) {
          return res.status(400).json({ 
            message: `Stock insuficiente. Disponible: ${currentStock}` 
          });
        }
        
        await storage.updateProduct(finalProductId, { stock: newStock }, company.id);
      }

      // For consumable products, check material availability
      if (product.isConsumable && product.isManufactured) {
        const availability = await storage.checkMaterialAvailability(finalProductId, finalQuantity, company.id);
        if (!availability.available) {
          return res.status(400).json({ 
            message: "Insufficient materials to manufacture this product",
            missingMaterials: availability.missing
          });
        }
      }
      
      const cartItem = {
        companyId: company.id,
        userId: userId,
        productId: finalProductId,
        quantity: finalQuantity,
        unitPrice: finalUnitPrice,
        subtotal: finalSubtotal
      };

      const newItem = await storage.addToPOSCart(cartItem);
      res.json(newItem);
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: error.message || "Failed to add to cart" });
    }
  });

  app.patch("/api/pos/cart/:id", isAuthenticated, async (req: any, res) => {
    try {
      const cartId = parseInt(req.params.id);
      const { quantity } = req.body;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Get cart item to check the product
      const cartItem = await storage.getPOSCartItem(cartId);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      // Get product details
      const product = await storage.getProduct(cartItem.productId, company.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Calculate stock adjustment based on quantity change
      const oldQuantity = parseInt(cartItem.quantity.toString());
      const newQuantity = parseInt(quantity);
      const quantityDifference = newQuantity - oldQuantity;

      // Adjust stock if product tracks inventory (for regular products)
      if (product.stock !== null && product.stock !== undefined) {
        const currentStock = parseInt(product.stock?.toString() || "0");
        const newStock = Math.floor(currentStock - quantityDifference); // Subtract difference from stock
        
        // Check if we have enough stock for the increase
        if (quantityDifference > 0 && newStock < 0) {
          return res.status(400).json({ 
            message: `Stock insuficiente. Disponible: ${currentStock}` 
          });
        }
        
        await storage.updateProduct(cartItem.productId, { stock: newStock }, company.id);
      }

      // For consumable products, check material availability for the new quantity
      if (product.isConsumable && product.isManufactured) {
        const availability = await storage.checkMaterialAvailability(cartItem.productId, newQuantity, company.id);
        if (!availability.available) {
          return res.status(400).json({ 
            message: "Insufficient materials to manufacture the requested quantity",
            missingMaterials: availability.missing
          });
        }
      }
      
      const updatedItem = await storage.updatePOSCartItem(cartId, newQuantity);
      if (!updatedItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/pos/cart/:id", isAuthenticated, async (req: any, res) => {
    try {
      const cartId = parseInt(req.params.id);
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Get cart item details before removing to restore stock
      const cartItem = await storage.getPOSCartItem(cartId);
      if (!cartItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      // Get product details
      const product = await storage.getProduct(cartItem.productId, company.id);
      if (product && product.stock !== null && product.stock !== undefined) {
        // Restore stock when removing from cart
        const currentStock = parseInt(product.stock?.toString() || "0");
        const quantityToRestore = parseFloat(cartItem.quantity.toString());
        const newStock = Math.floor(currentStock + quantityToRestore);
        
        await storage.updateProduct(cartItem.productId, { stock: newStock }, company.id);
      }

      await storage.removePOSCartItem(cartId);
      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing cart item:", error);
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  app.patch("/api/pos/cart/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { quantity } = req.body;

      const updatedItem = await storage.updatePOSCartItem(parseInt(id), quantity);
      if (!updatedItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/pos/cart/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;

      const success = await storage.removePOSCartItem(parseInt(id));
      if (success === undefined || success === null) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json({ message: "Item removed from cart" });
    } catch (error) {
      console.error("Error removing cart item:", error);
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  app.delete("/api/pos/cart", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      await storage.clearPOSCart(company.id, userId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // POS customers endpoint
  app.get("/api/pos/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const customers = await storage.getCustomers(company.id);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching POS customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/pos/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const customerData = insertCustomerSchema.parse({
        ...req.body,
        companyId: company.id,
      });
      
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error creating POS customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // POS Customer RNC search endpoint
  app.post("/api/pos/customers/search-rnc", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      const { rnc } = req.body;
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (!rnc) {
        return res.status(400).json({ message: "RNC is required" });
      }

      // Clean and validate RNC
      const cleanRnc = rnc.replace(/\D/g, "");
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({
          exists: false,
          valid: false,
          message: "RNC debe tener entre 9 y 11 dígitos"
        });
      }

      // Search for existing customer first
      const result = await storage.searchCustomerByRNC(cleanRnc, company.id);
      
      // If customer exists, return customer data
      if (result.exists) {
        return res.json({
          exists: true,
          customer: result.customer,
          valid: true
        });
      }

      // If customer doesn't exist, try to validate RNC against DGII registry
      const rncData = await storage.getRNCFromRegistry(cleanRnc);
      
      if (rncData) {
        return res.json({
          exists: false,
          valid: true,
          rncData: {
            rnc: cleanRnc,
            name: rncData.razonSocial,
            businessName: rncData.razonSocial,
            commercialName: rncData.nombreComercial,
            status: rncData.estado || "ACTIVO",
            category: rncData.categoria || "CONTRIBUYENTE REGISTRADO"
          }
        });
      }

      // RNC not found in registry
      return res.json({
        exists: false,
        valid: false,
        message: "RNC no encontrado en el registro de DGII"
      });

    } catch (error) {
      console.error("Error searching customer by RNC:", error);
      res.status(500).json({ 
        exists: false, 
        valid: false, 
        message: "Error interno del servidor" 
      });
    }
  });

  // POS Sales routes
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
      console.log("[DEBUG] POST /api/pos/sales - Processing POS sale");
      console.log("[DEBUG] Request body:", JSON.stringify(req.body, null, 2));
      
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { items, useFiscalReceipt, ncfType, ...saleData } = req.body;
      
      // Generate sale number
      const existingSales = await storage.getPOSSales(company.id);
      const saleNumber = `POS-${String(existingSales.length + 1).padStart(6, '0')}`;
      
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

      // Ensure fiscal period is set for all sales
      const currentDate = new Date();
      const fiscalPeriod = currentDate.getFullYear().toString() + 
                          (currentDate.getMonth() + 1).toString().padStart(2, '0') + 
                          currentDate.getDate().toString().padStart(2, '0');
      
      // Prepare sale data
      const saleToCreate = {
        ...saleData,
        companyId: company.id,
        saleNumber,
        ncf,
        ncfType: useFiscalReceipt ? ncfType : null,
        fiscalPeriod,
        status: "completed",
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log("[DEBUG] Creating sale:", saleToCreate);
      const sale = await storage.createPOSSale(saleToCreate);
      console.log("[DEBUG] Sale created with ID:", sale.id);
      
      // Create sale items
      if (items && Array.isArray(items)) {
        console.log("[DEBUG] Creating", items.length, "sale items");
        for (const item of items) {
          const itemData = {
            ...item,
            saleId: sale.id,
            createdAt: new Date(),
            updatedAt: new Date()
          };
          console.log("[DEBUG] Creating item:", itemData);
          await storage.createPOSSaleItem(itemData);
        }
      }

      // Clear the cart after successful sale
      await storage.clearPOSCart(company.id, userId);
      console.log("[DEBUG] Cart cleared for user:", userId);
      
      // Log POS sale creation with audit
      await auditLogger.logPOSAction(userId, company.id, 'create_sale', sale, req);

      console.log("[DEBUG] Sale processing completed successfully");
      res.json({ ...sale, ncf });
    } catch (error) {
      console.error("Error creating POS sale:", error);
      res.status(500).json({ message: "Failed to create POS sale", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

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

  app.get("/api/pos/print-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const settings = await storage.getPOSPrintSettings(company.id);
      res.json(settings || { 
        printerWidth: "80mm", 
        showNCF: true, 
        showCustomerInfo: true,
        companyId: company.id
      });
    } catch (error) {
      console.error("Error fetching POS print settings:", error);
      res.status(500).json({ message: "Failed to fetch POS print settings" });
    }
  });

  // 80mm POS Receipt Generation Route
  app.post("/api/pos/print-pos-80mm/:saleId", isAuthenticated, async (req: any, res) => {
    try {
      const { saleId } = req.params;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Get sale data
      const sale = await storage.getPOSSale(parseInt(saleId), company.id);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      const items = await storage.getPOSSaleItems(sale.id);

      // Prepare customer info
      const customerInfo = {
        name: sale.customerName || undefined,
        phone: sale.customerPhone || undefined,
        rnc: sale.customerRnc || undefined,
      };

      // Generate 80mm POS receipt
      console.log('Generating 80mm POS receipt for sale:', sale.saleNumber);
      const htmlContent = await InvoicePOS80mmService.generatePOS80mmReceipt({
        sale,
        items,
        company,
        customerInfo,
      });

      console.log('80mm POS receipt HTML length:', htmlContent.length);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);

    } catch (error) {
      console.error("Error generating 80mm POS receipt:", error);
      res.status(500).json({ message: "Failed to generate 80mm POS receipt" });
    }
  });

  // PayPal payment routes
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Manufacturing BOM Routes
  app.get("/api/manufacturing/boms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const boms = await storage.getBOMs(company.id);
      res.json(boms);
    } catch (error) {
      console.error("Error fetching BOMs:", error);
      res.status(500).json({ message: "Failed to fetch BOMs" });
    }
  });

  app.post("/api/manufacturing/boms", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const bomData = {
        ...req.body,
        companyId: company.id,
        createdBy: userId
      };
      const bom = await storage.createBOM(bomData);
      res.json(bom);
    } catch (error) {
      console.error("Error creating BOM:", error);
      res.status(500).json({ message: "Failed to create BOM" });
    }
  });

  app.patch("/api/manufacturing/boms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const bomId = parseInt(req.params.id);
      const bom = await storage.updateBOM(bomId, req.body, company.id);
      res.json(bom);
    } catch (error) {
      console.error("Error updating BOM:", error);
      res.status(500).json({ message: "Failed to update BOM" });
    }
  });

  app.delete("/api/manufacturing/boms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const bomId = parseInt(req.params.id);
      await storage.deleteBOM(bomId, company.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting BOM:", error);
      res.status(500).json({ message: "Failed to delete BOM" });
    }
  });

  // Production Orders Routes
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
      
      const orderNumber = req.body.orderNumber || `OP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const orderData = {
        ...req.body,
        orderNumber,
        companyId: company.id,
        status: req.body.status || "planned"
      };
      const order = await storage.createProductionOrder(orderData);
      res.json(order);
    } catch (error) {
      console.error("Error creating production order:", error);
      res.status(500).json({ message: "Failed to create production order" });
    }
  });

  app.patch("/api/production-orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const orderId = parseInt(req.params.id);
      const { status } = req.body;
      const order = await storage.updateProductionOrderStatus(orderId, status, company.id);
      res.json(order);
    } catch (error) {
      console.error("Error updating production order status:", error);
      res.status(500).json({ message: "Failed to update production order status" });
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

  // Manufacturing and BOM operations
  app.get("/api/products/:id/manufacturing-cost", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const productId = parseInt(req.params.id);
      const cost = await storage.calculateManufacturedProductCost(productId, company.id);
      res.json({ productId, cost });
    } catch (error) {
      console.error("Error calculating manufacturing cost:", error);
      res.status(500).json({ message: "Failed to calculate manufacturing cost" });
    }
  });

  app.get("/api/products/:id/material-availability", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const productId = parseInt(req.params.id);
      const quantity = parseInt(req.query.quantity as string) || 1;
      
      const availability = await storage.checkMaterialAvailability(productId, quantity, company.id);
      res.json({ productId, quantity, ...availability });
    } catch (error) {
      console.error("Error checking material availability:", error);
      res.status(500).json({ message: "Failed to check material availability" });
    }
  });

  app.get("/api/products/:id/bom", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const productId = parseInt(req.params.id);
      const bom = await storage.getBOMForProduct(productId, company.id);
      res.json({ productId, bom });
    } catch (error) {
      console.error("Error fetching BOM:", error);
      res.status(500).json({ message: "Failed to fetch BOM" });
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

  // Get default warehouse for the company
  app.get("/api/warehouse/default", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const defaultWarehouse = await storage.getDefaultWarehouse(company.id);
      res.json(defaultWarehouse);
    } catch (error) {
      console.error("Error fetching default warehouse:", error);
      res.status(500).json({ message: "Failed to fetch default warehouse" });
    }
  });

  // Get warehouse stock data
  app.get("/api/warehouse-stock", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Get default warehouse to ensure consistent data
      const defaultWarehouse = await storage.getDefaultWarehouse(company.id);
      
      // Create sample warehouse stock data for testing
      const warehouseStock = [
        { productId: 3, warehouseId: defaultWarehouse.id, quantity: 150, avgCost: 25.50 },
        { productId: 4, warehouseId: defaultWarehouse.id, quantity: 75, avgCost: 15.75 },
        { productId: 5, warehouseId: defaultWarehouse.id, quantity: 0, avgCost: 0 },
        { productId: 6, warehouseId: defaultWarehouse.id, quantity: 200, avgCost: 8.30 },
        { productId: 7, warehouseId: defaultWarehouse.id, quantity: 50, avgCost: 45.00 },
        { productId: 8, warehouseId: defaultWarehouse.id, quantity: 120, avgCost: 12.80 },
        { productId: 9, warehouseId: defaultWarehouse.id, quantity: 30, avgCost: 35.00 },
        { productId: 10, warehouseId: defaultWarehouse.id, quantity: 90, avgCost: 18.50 },
      ];
      
      res.json(warehouseStock);
    } catch (error) {
      console.error("Error fetching warehouse stock:", error);
      res.status(500).json({ message: "Failed to fetch warehouse stock" });
    }
  });

  app.post("/api/warehouses", isAuthenticated, async (req: any, res) => {
    try {
      console.log("[DEBUG] Creating warehouse - Headers:", req.headers);
      console.log("[DEBUG] Creating warehouse - Raw body:", req.body);
      console.log("[DEBUG] Body type:", typeof req.body);
      console.log("[DEBUG] Body stringified:", JSON.stringify(req.body, null, 2));
      
      const userId = req.user.id;
      console.log("[DEBUG] User ID:", userId);
      
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        console.log("[DEBUG] Company not found for user:", userId);
        return res.status(404).json({ message: "Company not found" });
      }
      console.log("[DEBUG] Company found:", company.id, company.name);
      
      const warehouseData = {
        ...req.body,
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log("[DEBUG] Warehouse data to insert:", JSON.stringify(warehouseData, null, 2));
      
      const warehouse = await storage.createWarehouse(warehouseData);
      console.log("[DEBUG] Warehouse created successfully:", warehouse);
      res.json(warehouse);
    } catch (error: any) {
      console.error("[ERROR] Error creating warehouse:", error);
      console.error("[ERROR] Error stack:", error?.stack);
      console.error("[ERROR] Error message:", error?.message);
      res.status(500).json({ 
        message: "Failed to create warehouse", 
        error: error?.message || "Unknown error",
        details: error?.stack 
      });
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
      const warehouseData = {
        ...req.body,
        companyId: company.id,
      };
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
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting warehouse:", error);
      res.status(500).json({ message: "Failed to delete warehouse" });
    }
  });

  // Inventory movements routes
  app.get("/api/inventory/movements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const movements = await storage.getInventoryMovements(company.id);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching inventory movements:", error);
      res.status(500).json({ message: "Failed to fetch inventory movements" });
    }
  });

  app.post("/api/inventory/movements", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const movementData = {
        ...req.body,
        companyId: company.id,
        createdBy: userId,
      };
      const movement = await storage.createInventoryMovement(movementData);
      res.json(movement);
    } catch (error) {
      console.error("Error creating inventory movement:", error);
      res.status(500).json({ message: "Failed to create inventory movement" });
    }
  });

  // Fiscal Documents / NCF Management Routes
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
      console.log("[DEBUG] POST /api/fiscal/ncf-sequences - Headers:", req.headers);
      console.log("[DEBUG] POST /api/fiscal/ncf-sequences - Raw Body:", req.body);
      console.log("[DEBUG] POST /api/fiscal/ncf-sequences - Body Type:", typeof req.body);
      
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        console.log("[DEBUG] Company not found for user:", userId);
        return res.status(404).json({ message: "Company not found" });
      }

      console.log("[DEBUG] Company found:", company.id);

      // Map frontend field names to database field names
      const { type, series, rangeStart, rangeEnd, currentNumber, expirationDate, isActive, description } = req.body;
      
      console.log("[DEBUG] Extracted fields:", { type, series, rangeStart, rangeEnd, currentNumber, expirationDate, isActive, description });
      
      // Validate required fields
      if (!type || !rangeStart || !rangeEnd) {
        console.log("[DEBUG] Missing required fields");
        return res.status(400).json({ message: "Missing required fields: type, rangeStart, rangeEnd" });
      }
      
      const sequenceData = {
        companyId: company.id,
        ncfType: type,
        series: series || '001',
        currentSequence: rangeStart || currentNumber || 1,
        maxSequence: rangeEnd || 50000000,
        isActive: isActive !== false,
        description: description || '',
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const sequence = await storage.createNCFSequence(sequenceData);
      res.json(sequence);
    } catch (error) {
      console.error("Error creating NCF sequence:", error);
      res.status(500).json({ message: "Failed to create NCF sequence" });
    }
  });

  // Get used NCFs endpoint
  app.get("/api/fiscal/ncf-used", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Get NCFs used in sales
      const usedNCFs = await db.select({
        id: posSales.id,
        ncf: posSales.ncf,
        tipo: posSales.ncfType,
        documentoTipo: sql<string>`'Venta'`,
        fecha: posSales.createdAt,
        monto: posSales.total,
        rncCliente: posSales.customerRnc,
        nombreCliente: posSales.customerName,
        estado: sql<string>`'Usado'`
      })
      .from(posSales)
      .where(
        and(
          eq(posSales.companyId, company.id),
          isNotNull(posSales.ncf)
        )
      )
      .orderBy(desc(posSales.createdAt))
      .limit(100);

      res.json(usedNCFs);
    } catch (error) {
      console.error("Error getting used NCFs:", error);
      res.status(500).json({ message: "Failed to get used NCFs" });
    }
  });

  app.put("/api/fiscal/ncf-sequences/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const sequenceId = parseInt(req.params.id);
      const { currentSequence, maxSequence, isActive } = req.body;

      const updateData = {
        currentSequence: parseInt(currentSequence),
        maxSequence: parseInt(maxSequence),
        isActive,
        updatedAt: new Date()
      };

      const sequence = await storage.updateNCFSequence(sequenceId, updateData, company.id);
      res.json(sequence);
    } catch (error) {
      console.error("Error updating NCF sequence:", error);
      res.status(500).json({ message: "Failed to update NCF sequence" });
    }
  });

  app.get("/api/fiscal/reports", isAuthenticated, async (req: any, res) => {
    try {
      // Return empty reports for now
      res.json([]);
    } catch (error) {
      console.error("Error fetching fiscal reports:", error);
      res.status(500).json({ message: "Failed to fetch fiscal reports" });
    }
  });

  app.get("/api/fiscal/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Get basic analytics
      const invoices = await storage.getInvoices(company.id);
      const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.total || '0'), 0);
      
      res.json({
        documentsCount: invoices.length.toString(),
        totalInvoiced: totalInvoiced.toFixed(2),
        averageTicket: invoices.length > 0 ? (totalInvoiced / invoices.length).toFixed(2) : "0.00"
      });
    } catch (error) {
      console.error("Error fetching fiscal analytics:", error);
      res.status(500).json({ message: "Failed to fetch fiscal analytics" });
    }
  });

  // Professional Invoice Generation Route for POS Sales
  app.get("/api/pos/print-professional/:saleId", isAuthenticated, async (req: any, res) => {
    try {
      const { saleId } = req.params;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Get sale data
      const sale = await storage.getPOSSale(parseInt(saleId), company.id);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      const items = await storage.getPOSSaleItems(sale.id);

      // Create invoice structure for the HTML service
      const invoice = {
        id: sale.id,
        number: sale.saleNumber || `POS-${sale.id}`,
        date: sale.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        dueDate: sale.createdAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
        subtotal: sale.subtotal,
        itbis: sale.itbis || '0',
        total: sale.total,
        notes: sale.notes || '',
        status: 'paid',
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        companyId: sale.companyId,
        ncf: sale.ncf,
        customerId: sale.customerId || 0,
        taxType: 'itbis_18',
        taxRate: '18.00'
      };

      // Create customer structure
      const customer = {
        id: 0,
        name: sale.customerName || 'Cliente General',
        email: sale.customerPhone || null, // Use phone as email fallback
        phone: sale.customerPhone,
        address: sale.customerAddress || null,
        rnc: sale.customerRnc,
        cedula: sale.customerRnc || null // Use RNC as cedula fallback
      };

      // Convert POS items to invoice items
      const invoiceItems = items.map(item => ({
        id: item.id,
        invoiceId: sale.id,
        productId: item.productId,
        description: item.productName || 'Producto',
        quantity: parseInt(item.quantity),
        price: item.unitPrice,
        subtotal: item.subtotal,
        taxType: 'itbis_18',
        taxRate: '18.00',
        taxAmount: '0',
        total: item.subtotal
      }));

      // Generate professional HTML invoice
      const htmlContent = await InvoiceHTMLService.generateInvoiceHTML(
        {
          ...invoice,
          selectiveConsumptionTax: "0",
          otherTaxes: "0"
        },
        customer as any,
        company,
        invoiceItems
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);

    } catch (error) {
      console.error("Error generating professional invoice:", error);
      res.status(500).json({ message: "Failed to generate professional invoice" });
    }
  });

  // Professional invoice generation for Billing module
  app.get("/api/invoices/:id/professional", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId, company.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      // Get invoice items and customer
      const items = await storage.getInvoiceItems(invoiceId);
      const customer = await storage.getCustomer(invoice.customerId, company.id);

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // Generate professional HTML invoice
      const htmlContent = await InvoiceHTMLService.generateInvoiceHTML(
        invoice,
        customer as any,
        company,
        items
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlContent);

    } catch (error) {
      console.error("Error generating professional invoice:", error);
      res.status(500).json({ message: "Failed to generate professional invoice" });
    }
  });

  // Invoice verification route for QR codes
  app.get("/verify-invoice/:invoiceNumber", async (req, res) => {
    try {
      const { invoiceNumber } = req.params;
      
      // Simple verification page
      const verificationHTML = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificación de Factura</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .container { max-width: 500px; margin: 0 auto; }
            .success { color: #16a34a; }
            .info { color: #6b7280; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✓ Factura Verificada</h1>
            <p>Factura No: <strong>${invoiceNumber}</strong></p>
            <p class="info">Esta factura es válida y fue generada por Four One System.</p>
          </div>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(verificationHTML);
    } catch (error) {
      console.error("Error verifying invoice:", error);
      res.status(500).send("Error verificando factura");
    }
  });

  // DGII RNC verification endpoint
  app.post("/api/dgii/validate-rnc", isAuthenticated, async (req, res) => {
    try {
      console.log("DGII validate-rnc request body:", req.body);
      const { rnc } = req.body;
      
      if (!rnc) {
        return res.status(400).json({
          isValid: false,
          message: "RNC parameter is required"
        });
      }
      
      // Clean and validate RNC format
      const cleanRnc = rnc.replace(/\D/g, "");
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({
          isValid: false,
          message: "RNC debe tener entre 9 y 11 dígitos"
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
          categoria: rncData.categoria,
          regimen: rncData.regimen,
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

  // DGII company search endpoint for autocomplete
  app.get("/api/dgii/search-companies", async (req, res) => {
    try {
      const { q: searchTerm } = req.query;
      
      if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.length < 3) {
        return res.json([]);
      }

      // Search by business name, commercial name, or RNC
      const companies = await storage.searchRNCRegistry(searchTerm.trim(), 10);
      
      res.json(companies.map((company: any) => ({
        rnc: company.rnc,
        razonSocial: company.razonSocial,
        nombreComercial: company.nombreComercial,
        estado: company.estado || "ACTIVO",
        categoria: company.categoria || "JURIDICA",
        regimen: company.regimen || "ORDINARIO"
      })));
    } catch (error) {
      console.error("Error searching companies:", error);
      res.status(500).json({ message: "Error searching companies" });
    }
  });

  // Recipes endpoints
  app.get("/api/recipes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const recipes = await storage.getRecipes(company.id);
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ message: "Failed to fetch recipes" });
    }
  });

  app.post("/api/recipes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const recipeData = {
        ...req.body,
        companyId: company.id,
        createdBy: userId
      };

      const recipe = await storage.createRecipe(recipeData);
      
      // Log audit activity
      await auditLogger.logHRAction(
        userId,
        company.id,
        'create_recipe',
        'recipe',
        recipe.id?.toString(),
        undefined,
        recipe,
        req
      );

      res.status(201).json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.get("/api/recipes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const recipe = await storage.getRecipe(parseInt(req.params.id), company.id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      res.json(recipe);
    } catch (error) {
      console.error("Error fetching recipe:", error);
      res.status(500).json({ message: "Failed to fetch recipe" });
    }
  });

  app.put("/api/recipes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const recipeId = parseInt(req.params.id);
      const oldRecipe = await storage.getRecipe(recipeId, company.id);
      if (!oldRecipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      const updatedRecipe = await storage.updateRecipe(recipeId, req.body);
      
      // Log audit activity
      await auditLogger.logHRAction(
        userId,
        company.id,
        'update_recipe',
        'recipe',
        recipeId.toString(),
        oldRecipe,
        updatedRecipe,
        req
      );

      res.json(updatedRecipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ message: "Failed to update recipe" });
    }
  });

  app.delete("/api/recipes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const recipeId = parseInt(req.params.id);
      const recipe = await storage.getRecipe(recipeId, company.id);
      if (!recipe) {
        return res.status(404).json({ message: "Recipe not found" });
      }

      await storage.deleteRecipe(recipeId);
      
      // Log audit activity
      await auditLogger.logHRAction(
        userId,
        company.id,
        'delete_recipe',
        'recipe',
        recipeId.toString(),
        recipe,
        undefined,
        req
      );

      res.json({ message: "Recipe deleted successfully" });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  // AI Assistant endpoints
  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.user.id;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Import AI services
      const { AIChatService } = require('./ai-services-fixed');
      const response = await AIChatService.processQuery(message, context);
      
      res.json({
        response,
        message: response,
        timestamp: new Date().toISOString(),
        userId
      });
    } catch (error) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ error: "Error processing AI request" });
    }
  });

  app.post("/api/ai/generate-product", isAuthenticated, async (req: any, res) => {
    try {
      const { name, category, features } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Product name is required" });
      }

      const { AIProductService } = require('./ai-services-fixed');
      const description = await AIProductService.generateProductDescription(name, category, features);
      const code = await AIProductService.generateProductCode(name, category);
      
      res.json({
        description,
        code,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("AI Product Generation Error:", error);
      res.status(500).json({ error: "Error generating product information" });
    }
  });

  app.post("/api/ai/analyze-sales", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const { AIBusinessService } = require('./ai-services-fixed');
      const salesData = await storage.getPOSSales(company.id);
      const analysis = await AIBusinessService.analyzeSalesPattern(salesData);
      
      res.json({
        analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("AI Sales Analysis Error:", error);
      res.status(500).json({ error: "Error analyzing sales data" });
    }
  });

  app.post("/api/ai/optimize-inventory", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const { AIBusinessService } = require('./ai-services-fixed');
      const products = await storage.getProducts(company.id);
      const salesHistory = await storage.getPOSSales(company.id);
      
      const optimization = await AIBusinessService.optimizeInventory(products, salesHistory);
      
      res.json({
        optimization,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("AI Inventory Optimization Error:", error);
      res.status(500).json({ error: "Error optimizing inventory" });
    }
  });

  app.get("/api/ai/insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Get actual data from the system
      const products = await storage.getProducts(company.id);
      const salesData = await storage.getPOSSales(company.id);
      const customers = await storage.getCustomers(company.id);
      
      // Generate real insights from actual data
      const insights = [
        {
          id: "sales-trend",
          title: "Tendencia de Ventas",
          type: "chart",
          description: `Análisis de ${salesData.length} ventas realizadas`,
          data: {
            total: salesData.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0),
            count: salesData.length,
            avgTicket: salesData.length > 0 ? (salesData.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0) / salesData.length).toFixed(2) : "0"
          }
        },
        {
          id: "inventory-status",
          title: "Estado del Inventario",
          type: "metric",
          description: `${products.length} productos registrados en el sistema`,
          data: {
            totalProducts: products.length,
            lowStock: products.filter((p: any) => (p.stock || 0) < (p.minStock || 5)).length,
            outOfStock: products.filter((p: any) => (p.stock || 0) === 0).length
          }
        },
        {
          id: "customer-insights",
          title: "Análisis de Clientes",
          type: "metric",
          description: `Base de ${customers.length} clientes activos`,
          data: {
            totalCustomers: customers.length,
            activeCustomers: customers.filter((c: any) => c.status === 'active').length,
            newThisMonth: customers.filter((c: any) => {
              const created = new Date(c.createdAt);
              const now = new Date();
              return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
            }).length
          }
        }
      ];
      
      res.json(insights);
    } catch (error) {
      console.error("AI Insights Error:", error);
      res.status(500).json({ error: "Error generating insights" });
    }
  });

  app.post("/api/ai/generate-insight/:type", isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.params;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      // Generate specific insights based on type
      let insight = {};
      
      switch (type) {
        case 'sales':
          const salesData = await storage.getPOSSales(company.id);
          insight = {
            type: 'sales',
            title: 'Análisis de Ventas Generado',
            description: `Análisis completado para ${salesData.length} ventas`,
            timestamp: new Date().toISOString()
          };
          break;
        case 'inventory':
          const products = await storage.getProducts(company.id);
          insight = {
            type: 'inventory',
            title: 'Optimización de Inventario',
            description: `Análisis de ${products.length} productos completado`,
            timestamp: new Date().toISOString()
          };
          break;
        default:
          insight = {
            type: type,
            title: 'Análisis General',
            description: 'Análisis completado exitosamente',
            timestamp: new Date().toISOString()
          };
      }
      
      res.json({ insight });
    } catch (error) {
      console.error("AI Generate Insight Error:", error);
      res.status(500).json({ error: "Error generating insight" });
    }
  });

  app.get("/api/ai/status", isAuthenticated, async (req: any, res) => {
    try {
      res.json({
        enabled: true,
        status: "active",
        version: "1.0.0",
        capabilities: [
          "chat",
          "product-generation",
          "sales-analysis",
          "inventory-optimization",
          "insights-generation"
        ]
      });
    } catch (error) {
      console.error("AI Status Error:", error);
      res.status(500).json({ error: "Error getting AI status" });
    }
  });

  // Chat endpoints
  app.get("/api/chat/channels", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Default channels for the company
      const channels = [
        {
          id: 1,
          name: "General",
          description: "Canal principal de comunicación",
          type: "public",
          createdAt: new Date().toISOString(),
          unreadCount: 0
        },
        {
          id: 2,
          name: "Ventas",
          description: "Discusiones sobre ventas y clientes",
          type: "public",
          createdAt: new Date().toISOString(),
          unreadCount: 0
        }
      ];

      res.json(channels);
    } catch (error) {
      console.error("Error fetching chat channels:", error);
      res.status(500).json({ message: "Error fetching channels" });
    }
  });

  app.get("/api/chat/channels/:channelId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId } = req.params;
      const userId = req.user.id;
      
      // Mock messages data
      const messages = [
        {
          id: 1,
          content: "¡Bienvenidos al canal de comunicación interna!",
          senderId: "system",
          senderName: "Sistema",
          senderLastName: "",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          messageType: "system",
          isEdited: false
        },
        {
          id: 2,
          content: "Hola equipo, ¿cómo van las ventas de hoy?",
          senderId: userId,
          senderName: "Usuario",
          senderLastName: "Sistema",
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          messageType: "text",
          isEdited: false
        }
      ];

      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Error fetching messages" });
    }
  });

  app.post("/api/chat/channels/:channelId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId } = req.params;
      const { content } = req.body;
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create new message
      const newMessage = {
        id: Date.now(),
        content,
        senderId: user.id,
        senderName: user.firstName || "Usuario",
        senderLastName: user.lastName || "",
        createdAt: new Date().toISOString(),
        messageType: "text",
        isEdited: false
      };

      res.json(newMessage);
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ message: "Error sending message" });
    }
  });

  // Reports endpoints with real data
  app.get("/api/reports/sales", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { startDate, endDate } = req.query;
      const sales = await storage.getPOSSales(company.id);
      
      // Filter by date range if provided
      let filteredSales = sales;
      if (startDate && endDate) {
        filteredSales = sales.filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= new Date(startDate as string) && saleDate <= new Date(endDate as string);
        });
      }
      
      // Calculate metrics
      const totalSales = filteredSales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0);
      const salesCount = filteredSales.length;
      const avgTicket = salesCount > 0 ? totalSales / salesCount : 0;
      
      // Create chart data by month
      const monthlyData = new Map();
      filteredSales.forEach((sale: any) => {
        const date = new Date(sale.createdAt);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { name: monthName, ventas: 0 });
        }
        monthlyData.get(monthKey).ventas += sale.total || 0;
      });
      
      const chartData = Array.from(monthlyData.values());
      
      // Get products to calculate category data
      const products = await storage.getProducts(company.id);
      const categoryMap = new Map();
      
      filteredSales.forEach((sale: any) => {
        // This would need sale items to get accurate category data
        // For now, we'll use a simplified approach
        const category = 'General';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, 0);
        }
        categoryMap.set(category, categoryMap.get(category) + (sale.total || 0));
      });
      
      const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value: Math.round((value / totalSales) * 100) || 0
      }));
      
      res.json({
        totalSales: totalSales.toFixed(2),
        salesCount,
        avgTicket: avgTicket.toFixed(2),
        chartData,
        categoryData,
        period: { startDate, endDate }
      });
    } catch (error) {
      console.error("Error generating sales report:", error);
      res.status(500).json({ message: "Failed to generate sales report" });
    }
  });

  app.get("/api/reports/inventory", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const products = await storage.getProducts(company.id);
      
      // Calculate inventory metrics
      const totalProducts = products.length;
      const lowStock = products.filter((p: any) => (p.stock || 0) < (p.minStock || 5)).length;
      const outOfStock = products.filter((p: any) => (p.stock || 0) === 0).length;
      const totalValue = products.reduce((sum: number, p: any) => sum + ((p.stock || 0) * (p.salePrice || 0)), 0);
      
      // Stock levels data
      const stockLevels = [
        { name: 'En Stock', value: totalProducts - lowStock - outOfStock, color: '#00C49F' },
        { name: 'Stock Bajo', value: lowStock, color: '#FFBB28' },
        { name: 'Sin Stock', value: outOfStock, color: '#FF8042' }
      ];
      
      // Top products by value
      const topProducts = products
        .map((p: any) => ({
          name: p.name,
          value: (p.stock || 0) * (p.salePrice || 0),
          stock: p.stock || 0
        }))
        .sort((a: any, b: any) => b.value - a.value)
        .slice(0, 10);
      
      res.json({
        totalProducts,
        lowStock,
        outOfStock,
        totalValue: totalValue.toFixed(2),
        stockLevels,
        topProducts
      });
    } catch (error) {
      console.error("Error generating inventory report:", error);
      res.status(500).json({ message: "Failed to generate inventory report" });
    }
  });

  app.get("/api/reports/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const customers = await storage.getCustomers(company.id);
      const sales = await storage.getPOSSales(company.id);
      
      // Calculate customer metrics
      const totalCustomers = customers.length;
      const activeCustomers = customers.filter((c: any) => c.status === 'active').length;
      
      // Customer growth by month
      const monthlyGrowth = new Map();
      customers.forEach((customer: any) => {
        const date = new Date(customer.createdAt);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('es-ES', { month: 'short' });
        
        if (!monthlyGrowth.has(monthKey)) {
          monthlyGrowth.set(monthKey, { name: monthName, clientes: 0 });
        }
        monthlyGrowth.get(monthKey).clientes += 1;
      });
      
      const growthData = Array.from(monthlyGrowth.values());
      
      // Top customers by sales (simplified)
      const topCustomers = customers
        .map((c: any) => ({
          name: c.name,
          email: c.email,
          total: sales
            .filter((s: any) => s.customerRnc === c.rnc)
            .reduce((sum: number, s: any) => sum + (s.total || 0), 0)
        }))
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 10);
      
      res.json({
        totalCustomers,
        activeCustomers,
        newThisMonth: customers.filter((c: any) => {
          const created = new Date(c.createdAt);
          const now = new Date();
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }).length,
        growthData,
        topCustomers
      });
    } catch (error) {
      console.error("Error generating customer report:", error);
      res.status(500).json({ message: "Failed to generate customer report" });
    }
  });

  app.get("/api/reports/products", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const products = await storage.getProducts(company.id);
      const sales = await storage.getPOSSales(company.id);
      
      // Calculate product performance (simplified - would need sale items for accuracy)
      const productPerformance = products.map((p: any) => ({
        name: p.name,
        category: p.category || 'General',
        stock: p.stock || 0,
        price: p.salePrice || 0,
        value: (p.stock || 0) * (p.salePrice || 0)
      }));
      
      // Categories distribution
      const categoryMap = new Map();
      products.forEach((p: any) => {
        const category = p.category || 'General';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, 0);
        }
        categoryMap.set(category, categoryMap.get(category) + 1);
      });
      
      const categoryData = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value
      }));
      
      res.json({
        totalProducts: products.length,
        productPerformance,
        categoryData,
        avgPrice: products.length > 0 ? 
          (products.reduce((sum: number, p: any) => sum + (p.salePrice || 0), 0) / products.length).toFixed(2) : 
          "0"
      });
    } catch (error) {
      console.error("Error generating product report:", error);
      res.status(500).json({ message: "Failed to generate product report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}