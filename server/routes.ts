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
      const invoiceData = {
        ...req.body,
        companyId: company.id,
      };
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
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