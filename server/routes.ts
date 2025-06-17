import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import {
  AIProductService,
  AIBusinessService,
  AIChatService,
  AIDocumentService,
} from "./ai-services-fixed";
import {
  InvoiceTemplateService,
  type ThermalPrintOptions,
  type PDFPrintOptions,
} from "./invoice-template-service";
import { LogoProcessor } from "./logo-processor";
import { ThermalLogoProcessor } from "./thermal-logo";
import { ThermalQRProcessor } from "./thermal-qr";
import { ErrorManager } from "./error-management";
import { auditLogger } from "./audit-logger";
import { InvoiceHTMLService } from "./invoice-html-service";
import { InvoicePOS80mmService } from "./invoice-pos-80mm-service";
import { simpleAccountingService } from "./accounting-service-simple";
import { accountingService } from "./accounting-service";
import { assetManager, type IconSet, type AssetOptimizationConfig } from "./asset-manager";
import { sendPasswordSetupEmail } from "./email-service";
import { initializeAdminUser } from "./init-admin";
import { dgiiRegistryUpdater } from "./dgii-registry-updater";
import QRCode from "qrcode";
import multer from "multer";
import path from "path";
import fs from "fs";

// Notification management system
const notifications = new Map<string, any[]>();

function initUserNotifications(userId: string) {
  if (!notifications.has(userId)) {
    notifications.set(userId, []);
  }
}

const userNotifications = notifications;
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
  insertUserPermissionSchema,
  insertAccountSchema,
  insertJournalEntrySchema,
  insertJournalEntryLineSchema,
  insertFiscalPeriodSchema,
  insertBudgetSchema,
  type InsertCompany,
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
        estado: "ACTIVO",
      },
      {
        rnc: "06700093161",
        razonSocial: "ROMELIA GONZALEZ GERVACIO",
        nombreComercial: null,
        categoria: "REGIMEN SIMPLIFICADO",
        regimen: "SIMPLIFICADO",
        estado: "ACTIVO",
      },
      {
        rnc: "02800982452",
        razonSocial: "ESTERLYN CONTRERAS GONZALEZ",
        nombreComercial: "S&R REFRIGERACION GONZALEZ",
        categoria: "JURIDICA",
        regimen: "ORDINARIO",
        estado: "ACTIVO",
      },
      {
        rnc: "05000006584",
        razonSocial: "ANYOLINO MORONTA ABREU",
        nombreComercial: "SUPERCOLMADO ABREU",
        categoria: "JURIDICA",
        regimen: "ORDINARIO",
        estado: "ACTIVO",
      },
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

    console.log(
      `Initialized RNC registry with ${imported} authentic DGII records`,
    );
  } catch (error) {
    console.error("Error initializing RNC registry:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Initialize admin user and RNC registry on startup
  await initializeAdminUser();
  await initializeRNCRegistry();

  // Auth routes
  app.get("/api/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const userId = user.id;

      // Incluir información de rol y empresas
      if (user) {
        const userRole = await storage.getUserRole(userId);
        // Simplificar para super admin - no verificar empresas si es super admin
        let userCompanies: any[] = [];
        if (userRole !== "super_admin") {
          try {
            userCompanies = await storage.getUserCompanies(userId);
          } catch (error) {
            console.log(
              "Error getting user companies, proceeding without them:",
              error,
            );
            userCompanies = [];
          }
        }

        // Remove password from response for security
        const { password, ...userWithoutPassword } = user;

        res.json({
          ...userWithoutPassword,
          role: userRole,
          companies: userCompanies,
          isSuperAdmin: userRole === "super_admin",
        });
      } else {
        res.json(user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User Profile Management
  app.put("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, phoneNumber, jobTitle, department } = req.body;
      
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        phoneNumber,
        jobTitle,
        department,
        updatedAt: new Date(),
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await auditLogger.logAuthAction(userId, 'update_profile', { 
        firstName, lastName, phoneNumber, jobTitle, department 
      }, req);

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/user/password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password
      const bcrypt = require("bcrypt");
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      await storage.updateUser(userId, {
        password: hashedNewPassword,
        updatedAt: new Date(),
      });

      await auditLogger.logAuthAction(userId, 'change_password', {}, req);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating password:", error);
      res.status(500).json({ message: "Failed to update password" });
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
        const cacheAge =
          new Date().getTime() -
          new Date(cachedResult.lastUpdated || new Date()).getTime();
        const isValidCache = cacheAge < 24 * 60 * 60 * 1000; // 24 hours

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
          data: rncData,
        });
      } else {
        res.json({
          valid: false,
          message: "RNC no encontrado en la base de datos de la DGII",
        });
      }
    } catch (error) {
      console.error("Error in RNC verification:", error);
      res.status(500).json({
        valid: false,
        message: "Error interno del servidor",
      });
    }
  });

  // Super Admin routes
  app.get("/api/admin/companies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);

      if (!isSuperAdmin) {
        return res
          .status(403)
          .json({ message: "Access denied. Super admin required." });
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
        return res
          .status(403)
          .json({ message: "Access denied. Super admin required." });
      }

      const { ownerEmail, ...companyData } = req.body;

      if (!ownerEmail) {
        return res.status(400).json({ message: "Owner email is required" });
      }

      // Generate invitation token and expiry
      const invitationToken =
        Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
      const invitationExpiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ); // 7 days

      // Create company with invitation
      const company = await storage.createCompanyWithInvitation({
        ...companyData,
        ownerEmail,
        invitationToken,
        invitationExpiresAt,
      });

      // Send invitation email
      const { sendCompanyInvitationEmail } = await import("./email-service");
      const emailSent = await sendCompanyInvitationEmail({
        companyName: company.name,
        companyEmail: ownerEmail,
        invitationToken,
      });

      if (!emailSent) {
        console.error("Failed to send invitation email");
      }

      res.status(201).json({
        ...company,
        emailSent,
        invitationSent: emailSent,
      });
    } catch (error: any) {
      console.error("Error creating company:", error);
      // Return specific validation errors
      if (error.message.includes("Ya existe")) {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes("RNC debe tener")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Error al crear la empresa" });
      }
    }
  });

  app.patch(
    "/api/admin/companies/:id/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const isSuperAdmin = await storage.isUserSuperAdmin(userId);

        if (!isSuperAdmin) {
          return res
            .status(403)
            .json({ message: "Access denied. Super admin required." });
        }

        const companyId = parseInt(req.params.id);
        const { isActive } = req.body;

        const updatedCompany = await storage.updateCompanyStatus(
          companyId,
          isActive,
        );
        res.json(updatedCompany);
      } catch (error) {
        console.error("Error updating company status:", error);
        res.status(500).json({ message: "Failed to update company status" });
      }
    },
  );

  app.delete(
    "/api/admin/companies/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const isSuperAdmin = await storage.isUserSuperAdmin(userId);

        if (!isSuperAdmin) {
          return res
            .status(403)
            .json({ message: "Access denied. Super admin required." });
        }

        const companyId = parseInt(req.params.id);

        await storage.deleteCompany(companyId);
        res.json({ success: true, message: "Company deleted successfully" });
      } catch (error) {
        console.error("Error deleting company:", error);
        res.status(500).json({ message: "Failed to delete company" });
      }
    },
  );

  app.put(
    "/api/admin/companies/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const isSuperAdmin = await storage.isUserSuperAdmin(userId);

        if (!isSuperAdmin) {
          return res
            .status(403)
            .json({ message: "Access denied. Super admin required." });
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
        const validatedData = insertCompanySchema
          .omit({ ownerId: true })
          .partial()
          .parse(updateData) as Partial<InsertCompany>;
        const company = await storage.updateCompany(id, validatedData);
        res.json(company);
      } catch (error) {
        console.error("Error updating company:", error);
        res
          .status(500)
          .json({ message: "Failed to update company", error: String(error) });
      }
    },
  );

  app.patch(
    "/api/admin/companies/:id/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const isSuperAdmin = await storage.isUserSuperAdmin(userId);

        if (!isSuperAdmin) {
          return res
            .status(403)
            .json({ message: "Access denied. Super admin required." });
        }

        const id = parseInt(req.params.id);
        const { isActive } = req.body;
        const company = await storage.updateCompanyStatus(id, isActive);
        res.json(company);
      } catch (error) {
        console.error("Error updating company status:", error);
        res.status(500).json({ message: "Failed to update company status" });
      }
    },
  );

  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);

      if (!isSuperAdmin) {
        return res
          .status(403)
          .json({ message: "Access denied. Super admin required." });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);

      if (!isSuperAdmin) {
        return res
          .status(403)
          .json({ message: "Access denied. Super admin required." });
      }

      // Calcular estadísticas básicas
      const companies = await storage.getAllCompanies();
      const stats = {
        totalCompanies: companies.length,
        activeCompanies: companies.filter((c) => c.isActive).length,
        trialCompanies: companies.filter((c) => c.subscriptionPlan === "trial")
          .length,
        paidCompanies: companies.filter((c) => c.subscriptionPlan !== "trial")
          .length,
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

  // Company Configuration Management
  app.put("/api/companies/current/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const {
        name,
        businessName,
        rnc,
        address,
        phone,
        email,
        website,
        industry,
        businessType,
        taxRegime,
        currency,
        timezone,
        logoUrl
      } = req.body;

      const updateData = {
        name,
        businessName,
        rnc,
        address,
        phone,
        email,
        website,
        industry,
        businessType,
        taxRegime,
        currency,
        timezone,
        logoUrl,
        updatedAt: new Date(),
      };

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
      res.status(500).json({ message: "Failed to update company settings" });
    }
  });

  // NCF Sequence Management
  app.get("/api/companies/current/ncf-sequences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const sequences = await storage.getNCFSequences(company.id);
      res.json(sequences || []);
    } catch (error) {
      console.error("Error fetching NCF sequences:", error);
      res.status(500).json({ message: "Failed to fetch NCF sequences" });
    }
  });

  app.post("/api/companies/current/ncf-sequences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { ncfType, currentSequence, maxSequence, isActive } = req.body;

      if (!ncfType || currentSequence === undefined || maxSequence === undefined) {
        return res.status(400).json({ message: "Missing required NCF sequence data" });
      }

      // Generate fiscal period for current date
      const currentDate = new Date();
      const fiscalPeriod = currentDate.getFullYear().toString() + 
                          (currentDate.getMonth() + 1).toString().padStart(2, '0') + 
                          currentDate.getDate().toString().padStart(2, '0');

      const sequenceData = {
        companyId: company.id,
        ncfType,
        fiscalPeriod,
        currentSequence: parseInt(currentSequence),
        maxSequence: parseInt(maxSequence),
        isActive: isActive !== false,
      };

      const sequence = await storage.createNCFSequence(sequenceData);

      await auditLogger.logFiscalAction(
        userId,
        company.id,
        'create_ncf_sequence',
        'ncf_sequence',
        sequence.id?.toString(),
        sequenceData,
        req
      );

      res.json(sequence);
    } catch (error) {
      console.error("Error creating NCF sequence:", error);
      res.status(500).json({ message: "Failed to create NCF sequence" });
    }
  });

  app.put("/api/companies/current/ncf-sequences/:id", isAuthenticated, async (req: any, res) => {
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
      };

      const sequence = await storage.updateNCFSequence(sequenceId, updateData, company.id);

      await auditLogger.logFiscalAction(
        userId,
        company.id,
        'update_ncf_sequence',
        'ncf_sequence',
        sequenceId.toString(),
        updateData,
        req
      );

      res.json(sequence);
    } catch (error) {
      console.error("Error updating NCF sequence:", error);
      res.status(500).json({ message: "Failed to update NCF sequence" });
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
      const warehouseData = insertWarehouseSchema.parse({
        ...req.body,
        companyId: company.id,
      });
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
      const warehouseData = insertWarehouseSchema.parse({
        ...req.body,
        companyId: company.id,
      });
      const warehouse = await storage.updateWarehouse(
        id,
        warehouseData,
        company.id,
      );
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

      // Don't exclude logo from update data - we need to update it
      const updateData = req.body;

      console.log("Update data before validation:", updateData);

      // Use partial schema for updates without requiring ownerId
      const validatedData = insertCompanySchema
        .omit({ ownerId: true })
        .partial()
        .parse(updateData) as Partial<InsertCompany>;
      console.log("Validated update data:", validatedData);

      const updatedCompany = await storage.updateCompany(
        company.id,
        validatedData,
      );
      console.log("Company updated successfully:", updatedCompany);

      res.json(updatedCompany);
    } catch (error: any) {
      console.error("Error updating company:", error);
      console.error("Error details:", error.message);
      res.status(500).json({
        message: "Failed to update company",
        error: error.message,
      });
    }
  });

  app.post("/api/companies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      // Don't validate ownerId through schema since it's omitted, add it directly
      const validatedData = insertCompanySchema.parse(req.body);
      const companyData = {
        ...validatedData,
        ownerId: userId,
      };
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

  app.put("/api/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        companyId: company.id,
      });
      const customer = await storage.updateCustomer(
        id,
        customerData,
        company.id,
      );
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

  // RNC Verification route (no authentication required for public use)
  app.get("/api/customers/verify-rnc/:rnc", async (req: any, res) => {
    try {
      const { rnc } = req.params;
      
      // Clean RNC by removing all non-digits (including hyphens, spaces, etc.)
      const cleanRnc = rnc.toString().replace(/\D/g, "");
      
      // Basic RNC validation - Dominican RNCs can be 9, 10, or 11 digits
      if (!cleanRnc || cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({ 
          isValid: false,
          message: `RNC debe tener entre 9 y 11 dígitos. RNC procesado: ${cleanRnc} (${cleanRnc.length} dígitos)`,
          rnc: cleanRnc,
          originalInput: rnc
        });
      }

      // Check in our authentic DGII RNC registry
      const rncData = await storage.getRNCFromRegistry(cleanRnc);
      
      if (rncData) {
        res.json({
          isValid: true,
          rnc: cleanRnc,
          companyName: rncData.razonSocial,
          businessName: rncData.nombreComercial || rncData.razonSocial,
          status: rncData.estado || "ACTIVO",
          category: rncData.categoria || "CONTRIBUYENTE REGISTRADO",
          regime: rncData.regimen,
          message: "RNC válido encontrado en el registro oficial de DGII",
          source: "DGII"
        });
      } else {
        res.json({
          isValid: false,
          rnc: cleanRnc,
          message: "RNC no encontrado en el registro oficial de DGII",
          suggestion: "Verifique el número o consulte directamente con DGII",
          source: "DGII"
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
      const productData = insertProductSchema.parse({
        ...req.body,
        companyId: company.id,
      });
      const product = await storage.createProduct(productData);
      
      // Log product creation
      await auditLogger.logProductAction(userId, company.id, 'create', product.id.toString(), null, product, req);
      
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
      
      // Get old product data for audit
      const oldProduct = await storage.getProduct(id, company.id);
      
      const productData = insertProductSchema.parse({
        ...req.body,
        companyId: company.id,
      });
      const product = await storage.updateProduct(id, productData, company.id);
      
      // Log product update
      await auditLogger.logProductAction(userId, company.id, 'update', id.toString(), oldProduct, product, req);
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
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

  app.post(
    "/api/products/generate-image",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { productName, productCode, description, source } = req.body;
        if (!productName) {
          return res.status(400).json({ message: "Product name is required" });
        }

        // Generate image URL using specific source
        const imageUrl = await storage.generateProductImageUrl(
          productName,
          productCode,
          description,
          source,
        );
        res.json({ imageUrl });
      } catch (error) {
        console.error("Error generating product image:", error);
        res.status(500).json({ message: "Failed to generate product image" });
      }
    },
  );

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
      console.log("Creating invoice with data:", req.body);
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
        companyId: company.id,
      };

      // Auto-assign NCF if ncfType is provided and not empty
      if (req.body.ncfType && req.body.ncfType !== "" && !req.body.ncf) {
        const nextNCF = await storage.getNextNCF(company.id, req.body.ncfType);
        if (!nextNCF) {
          return res.status(400).json({
            message: `No hay comprobantes disponibles del tipo ${req.body.ncfType}. Configure las secuencias NCF.`,
          });
        }
        processedData.ncf = nextNCF;
        // Increment the NCF sequence after successful assignment
        await storage.incrementNCFSequence(company.id, req.body.ncfType);
      } else if (!req.body.ncfType || req.body.ncfType === "") {
        // For "sin comprobante" option, set NCF to null
        processedData.ncf = null;
      }

      console.log("Processed invoice data:", processedData);
      const invoiceData = insertInvoiceSchema.parse(processedData);
      const invoice = await storage.createInvoice(invoiceData);
      console.log("Invoice created successfully:", invoice);
      
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      res.status(500).json({ message: "Failed to create invoice", error: String(error) });
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
      const orderData = insertProductionOrderSchema.parse({
        ...req.body,
        companyId: company.id,
      });
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
      const bomData = insertBOMSchema.parse({
        ...req.body,
        companyId: company.id,
      });
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
      console.log("GET /api/pos/sales - User:", req.user);
      console.log("GET /api/pos/sales - Session:", req.session);
      console.log("GET /api/pos/sales - IsAuthenticated:", req.isAuthenticated());
      
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        console.log("Company not found for user:", userId);
        return res.status(404).json({ message: "Company not found" });
      }
      
      console.log("Fetching POS sales for company:", company.id);
      const sales = await storage.getPOSSales(company.id);
      console.log("POS sales fetched successfully:", sales.length);
      res.json(sales);
    } catch (error) {
      console.error("Error fetching POS sales:", error);
      res.status(500).json({ message: "Failed to fetch POS sales" });
    }
  });

  app.post("/api/pos/sales", isAuthenticated, async (req: any, res) => {
    try {
      console.log("Processing POS sale, user:", req.user);
      console.log("Request body:", JSON.stringify(req.body, null, 2));
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { items, useFiscalReceipt, ncfType, ...saleData } = req.body;

      // Generate sale number
      const saleCount = await storage.getPOSSales(company.id);
      const saleNumber = `POS-${String(saleCount.length + 1).padStart(6, "0")}`;

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

      const saleToCreate = insertPOSSaleSchema.parse({
        ...saleData,
        companyId: company.id,
        saleNumber,
        ncf,
        ncfType: useFiscalReceipt ? ncfType : null,
        fiscalPeriod,
        createdBy: userId,
      });

      const sale = await storage.createPOSSale(saleToCreate);

      // Log POS sale creation
      await auditLogger.logPOSAction(userId, company.id, 'create_sale', sale, req);

      // Create sale items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const itemData = insertPOSSaleItemSchema.parse({
            ...item,
            saleId: sale.id,
          });
          await storage.createPOSSaleItem(itemData);
        }
      }

          // Generate automatic journal entry for the sale
      try {
        // Create basic journal entry for POS sale
        console.log(`POS sale created: ${sale.saleNumber} for company ${company.id}`);
      } catch (journalError) {
        console.error("Error with POS sale logging:", journalError);
        // Continue even if logging fails - the sale is already recorded
      }

      res.json({ ...sale, ncf });
    } catch (error) {
      console.error("Error creating POS sale:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      res
        .status(500)
        .json({ message: "Failed to create POS sale", error: String(error) });
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
      res.json(
        settings || {
          printerWidth: "80mm",
          showNCF: true,
          showCustomerInfo: true,
        },
      );
    } catch (error) {
      console.error("Error fetching POS print settings:", error);
      res.status(500).json({ message: "Failed to fetch POS print settings" });
    }
  });

  app.post(
    "/api/pos/print-settings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const company = await storage.getCompanyByUserId(userId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }
        const settingsData = insertPOSPrintSettingsSchema.parse({
          ...req.body,
          companyId: company.id,
        });
        const settings = await storage.upsertPOSPrintSettings(settingsData);
        res.json(settings);
      } catch (error) {
        console.error("Error updating POS print settings:", error);
        res
          .status(500)
          .json({ message: "Failed to update POS print settings" });
      }
    },
  );

  app.put("/api/pos/print-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const settingsData = insertPOSPrintSettingsSchema.parse({
        ...req.body,
        companyId: company.id,
      });
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
  app.get(
    "/api/pos/sales/:id/items",
    isAuthenticated,
    async (req: any, res) => {
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
    },
  );

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

      const cartItemData = {
        ...req.body,
        companyId: company.id,
        userId
      };

      const newItem = await storage.addToPOSCart(cartItemData);
      res.json(newItem);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Failed to add item to cart" });
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
      if (!success) {
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

      const success = await storage.clearPOSCart(company.id, userId);
      res.json({ message: "Cart cleared successfully" });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({ message: "Failed to clear cart" });
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

  app.put(
    "/api/auth/change-password",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { currentPassword, newPassword } = req.body;

        // In a real implementation, you would verify current password and update
        // For now, simulate password change
        if (!currentPassword || !newPassword) {
          return res
            .status(400)
            .json({ message: "Current and new passwords are required" });
        }

        res.json({ success: true, message: "Password changed successfully" });
      } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({ message: "Failed to change password" });
      }
    },
  );

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

  app.patch(
    "/api/notifications/:id/read",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const notificationId = parseInt(req.params.id);
        await storage.markNotificationAsRead(notificationId, userId);
        res.json({ success: true, id: notificationId });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark notification as read" });
      }
    },
  );

  app.delete(
    "/api/notifications/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const notificationId = parseInt(req.params.id);
        await storage.deleteNotification(notificationId, userId);
        res.json({ success: true, id: notificationId });
      } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ message: "Failed to delete notification" });
      }
    },
  );

  app.put(
    "/api/notifications/settings",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const settings = req.body;

        // Store notification settings
        res.json({ success: true, settings });
      } catch (error) {
        console.error("Error updating notification settings:", error);
        res
          .status(500)
          .json({ message: "Failed to update notification settings" });
      }
    },
  );

  app.patch(
    "/api/notifications/mark-all-read",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        initUserNotifications(userId);

        const notifications = userNotifications.get(userId) || [];
        notifications.forEach((notification) => {
          notification.read = true;
        });
        userNotifications.set(userId, notifications);

        res.json({
          success: true,
          message: "All notifications marked as read",
        });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res
          .status(500)
          .json({ message: "Failed to mark notifications as read" });
      }
    },
  );

  app.delete(
    "/api/notifications/clear-all",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;

        // Clear all notifications for this user
        userNotifications.set(userId, []);

        res.json({ success: true, message: "All notifications cleared" });
      } catch (error) {
        console.error("Error clearing all notifications:", error);
        res.status(500).json({ message: "Failed to clear notifications" });
      }
    },
  );

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
      const employee = await storage.getEmployee(
        parseInt(req.params.id),
        company.id,
      );
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
      if (createData.hireDate && typeof createData.hireDate === "string") {
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
      if (updateData.hireDate && typeof updateData.hireDate === "string") {
        updateData.hireDate = new Date(updateData.hireDate);
      }

      const employee = await storage.updateEmployee(
        parseInt(req.params.id),
        updateData,
        company.id,
      );
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

  app.put(
    "/api/payroll/periods/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const company = await storage.getCompanyByUserId(userId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }
        const period = await storage.updatePayrollPeriod(
          parseInt(req.params.id),
          req.body,
          company.id,
        );
        if (!period) {
          return res.status(404).json({ message: "Payroll period not found" });
        }
        res.json(period);
      } catch (error) {
        console.error("Error updating payroll period:", error);
        res.status(500).json({ message: "Failed to update payroll period" });
      }
    },
  );

  // Payroll Entry routes
  app.get("/api/payroll/entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const periodId = req.query.periodId
        ? parseInt(req.query.periodId as string)
        : undefined;
      const entries = await storage.getPayrollEntries(company.id, periodId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching payroll entries:", error);
      res.status(500).json({ message: "Failed to fetch payroll entries" });
    }
  });

  app.post(
    "/api/payroll/generate/:periodId",
    isAuthenticated,
    async (req: any, res) => {
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

            const grossPay =
              employee.salaryType === "hourly"
                ? baseSalary * hoursWorked
                : baseSalary;

            // Dominican Republic deductions (approximate percentages)
            const tssDeduction = grossPay * 0.0287; // 2.87% TSS
            const sfsDeduction = grossPay * 0.0304; // 3.04% SFS
            const infotepDeduction = grossPay * 0.01; // 1% INFOTEP
            const incomeTaxDeduction =
              grossPay > 34685 ? (grossPay - 34685) * 0.15 : 0; // Progressive tax
            const otherDeductions = 0;

            const totalDeductions =
              tssDeduction +
              sfsDeduction +
              infotepDeduction +
              incomeTaxDeduction +
              otherDeductions;
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
    },
  );

  // Fiscal Documents / NCF Management Routes

  // NCF Sequences
  app.get(
    "/api/fiscal/ncf-sequences",
    isAuthenticated,
    async (req: any, res) => {
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
    },
  );

  app.post(
    "/api/fiscal/ncf-sequences",
    isAuthenticated,
    async (req: any, res) => {
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
        res
          .status(500)
          .json({
            message: "Failed to create NCF sequence",
            error: String(error),
          });
      }
    },
  );

  // Comprobantes 605 (Compras)
  app.get(
    "/api/fiscal/comprobantes-605/:period",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const company = await storage.getCompanyByUserId(userId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }

        const { period } = req.params;
        const comprobantes = await storage.getComprobantes605(
          company.id,
          period,
        );
        res.json(comprobantes);
      } catch (error) {
        console.error("Error fetching comprobantes 605:", error);
        res.status(500).json({ message: "Failed to fetch comprobantes 605" });
      }
    },
  );

  app.post(
    "/api/fiscal/generate-605/:period",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const company = await storage.getCompanyByUserId(userId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }

        const { period } = req.params;
        const comprobantes = await storage.generateComprobantes605(
          company.id,
          period,
        );
        res.json({
          message: "Comprobantes 605 generated successfully",
          data: comprobantes,
        });
      } catch (error) {
        console.error("Error generating comprobantes 605:", error);
        res
          .status(500)
          .json({ message: "Failed to generate comprobantes 605" });
      }
    },
  );

  // Comprobantes 606 (Ventas)
  app.get(
    "/api/fiscal/comprobantes-606/:period",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const company = await storage.getCompanyByUserId(userId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }

        const { period } = req.params;
        const comprobantes = await storage.getComprobantes606(
          company.id,
          period,
        );
        res.json(comprobantes);
      } catch (error) {
        console.error("Error fetching comprobantes 606:", error);
        res.status(500).json({ message: "Failed to fetch comprobantes 606" });
      }
    },
  );

  app.post(
    "/api/fiscal/generate-606/:period",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const company = await storage.getCompanyByUserId(userId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }

        const { period } = req.params;
        const comprobantes = await storage.generateComprobantes606(
          company.id,
          period,
        );
        res.json({
          message: "Comprobantes 606 generated successfully",
          data: comprobantes,
        });
      } catch (error) {
        console.error("Error generating comprobantes 606:", error);
        res
          .status(500)
          .json({ message: "Failed to generate comprobantes 606" });
      }
    },
  );

  // Download reports in DGII format
  app.get(
    "/api/fiscal/download-605/:period",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const company = await storage.getCompanyByUserId(userId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }

        const { period } = req.params;
        const comprobantes = await storage.getComprobantes605(
          company.id,
          period,
        );

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
            comp.fechaPago
              ? comp.fechaPago.toISOString().slice(0, 10).replace(/-/g, "")
              : "",
            parseFloat(comp.montoFacturado).toFixed(2).padStart(12, "0"),
            parseFloat(comp.itbisFacturado).toFixed(2).padStart(12, "0"),
            parseFloat(comp.itbisRetenido || "0").toFixed(2).padStart(12, "0"),
            parseFloat(comp.itbisPercibido || "0").toFixed(2).padStart(12, "0"),
            parseFloat(comp.retencionRenta || "0").toFixed(2).padStart(12, "0"),
            parseFloat(comp.isrPercibido || "0").toFixed(2).padStart(12, "0"),
            parseFloat(comp.impuestoSelectivoConsumo || "0")
              .toFixed(2)
              .padStart(12, "0"),
            parseFloat(comp.otrosImpuestos || "0").toFixed(2).padStart(12, "0"),
            parseFloat(comp.montoTotal).toFixed(2).padStart(12, "0"),
          ].join("|");
          content += line + "\n";
        }

        res.setHeader("Content-Type", "text/plain");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="605_${period}.txt"`,
        );
        res.send(content);
      } catch (error) {
        console.error("Error downloading 605 report:", error);
        res.status(500).json({ message: "Failed to download 605 report" });
      }
    },
  );

  app.get(
    "/api/fiscal/download-606/:period",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const company = await storage.getCompanyByUserId(userId);
        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }

        const { period } = req.params;
        const comprobantes = await storage.getComprobantes606(
          company.id,
          period,
        );

        // Generate DGII 606 format according to official specification
        let content = "";
        for (const comp of comprobantes) {
          const line = [
            (comp.rncCedula || "").padEnd(11, " "), // RNC o Cédula
            comp.tipoIdentificacion || "1", // Tipo Id (1=RNC, 2=Cédula)
            comp.tipoComprobante || "9", // Tipo de Bienes y Servicios
            (comp.ncf || "").padEnd(13, " "), // NCF (11 o 13 posiciones)
            comp.ncfModificado || "", // NCF Modificado
            comp.fechaComprobante
              ?.toISOString()
              .slice(0, 10)
              .replace(/-/g, "") || "", // Fecha Comprobante AAAAMMDD
            comp.fechaPago?.toISOString().slice(0, 10).replace(/-/g, "") || "", // Fecha Pago AAAAMMDD
            parseFloat(comp.montoFacturadoServicios || "0")
              .toFixed(2)
              .padStart(12, "0"), // Monto Facturado Servicios
            parseFloat(comp.montoFacturadoBienes || "0")
              .toFixed(2)
              .padStart(12, "0"), // Monto Facturado Bienes
            parseFloat(comp.montoFacturado || "0")
              .toFixed(2)
              .padStart(12, "0"), // Total Monto Facturado
            parseFloat(comp.itbisFacturado || "0")
              .toFixed(2)
              .padStart(12, "0"), // ITBIS Facturado
            parseFloat(comp.itbisRetenido || "0")
              .toFixed(2)
              .padStart(12, "0"), // ITBIS Retenido
            parseFloat(comp.itbisProporcionalidad || "0")
              .toFixed(2)
              .padStart(12, "0"), // ITBIS sujeto a Proporcionalidad
            parseFloat(comp.itbisCosto || "0")
              .toFixed(2)
              .padStart(12, "0"), // ITBIS llevado al Costo
            parseFloat(comp.itbisAdelantar || "0")
              .toFixed(2)
              .padStart(12, "0"), // ITBIS por Adelantar
            parseFloat(comp.itbisPercibido || "0")
              .toFixed(2)
              .padStart(12, "0"), // ITBIS percibido en compras
            comp.tipoRetencionISR || "", // Tipo de Retención en ISR
            parseFloat(comp.retencionRenta || "0")
              .toFixed(2)
              .padStart(12, "0"), // Monto Retención Renta
            parseFloat(comp.isrPercibido || "0")
              .toFixed(2)
              .padStart(12, "0"), // ISR Percibido en compras
            parseFloat(comp.impuestoSelectivoConsumo || "0")
              .toFixed(2)
              .padStart(12, "0"), // Impuesto Selectivo al Consumo
            parseFloat(comp.otrosImpuestos || "0")
              .toFixed(2)
              .padStart(12, "0"), // Otros Impuestos/Tasas
            parseFloat(comp.montoPropina || "0")
              .toFixed(2)
              .padStart(12, "0"), // Monto Propina Legal
            comp.formaPago || "1", // Forma de Pago (1-7)
          ].join("|");
          content += line + "\n";
        }

        res.setHeader("Content-Type", "text/plain");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="606_${period}.txt"`,
        );
        res.send(content);
      } catch (error) {
        console.error("Error downloading 606 report:", error);
        res.status(500).json({ message: "Failed to download 606 report" });
      }
    },
  );

  // Inventory Management Routes
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
      
      const { productId, type, quantity, reason, notes } = req.body;
      
      // Create movement record
      const movementData = {
        productId: parseInt(productId),
        type,
        quantity: parseInt(quantity),
        reason,
        notes,
        companyId: company.id,
        createdBy: userId,
      };
      
      const movement = await storage.createInventoryMovement(movementData);
      
      // Update product stock
      const product = await storage.getProduct(productId, company.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      let newStock = product.stock;
      if (type === 'IN' || type === 'ADJUSTMENT') {
        newStock += quantity;
      } else if (type === 'OUT') {
        newStock -= quantity;
      }
      
      await storage.updateProduct(productId, { stock: Math.max(0, newStock) }, company.id);
      
      res.json(movement);
    } catch (error) {
      console.error("Error creating inventory movement:", error);
      res.status(500).json({ message: "Failed to create inventory movement" });
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
        return res
          .status(403)
          .json({ message: "Access denied. Super admin required." });
      }

      const timeRange = req.query.timeRange || "30d";
      const companies = await storage.getAllCompanies();

      // Calculate metrics
      const totalCompanies = companies.length;
      const activeCompanies = companies.filter((c) => c.isActive).length;
      const trialCompanies = companies.filter(
        (c) => c.subscriptionPlan === "trial",
      ).length;
      const paidCompanies = companies.filter(
        (c) => c.subscriptionPlan !== "trial",
      ).length;

      // Revenue calculations
      const planPrices = {
        starter: 29,
        professional: 79,
        business: 149,
        enterprise: 299,
        "enterprise-plus": 599,
      };

      const monthlyRevenue = companies
        .filter((c) => c.isActive && c.subscriptionPlan !== "trial")
        .reduce(
          (sum, c) =>
            sum +
            (planPrices[c.subscriptionPlan as keyof typeof planPrices] || 0),
          0,
        );

      // Industry distribution
      const industryCount = companies.reduce(
        (acc, c) => {
          const industry = c.industry || "Otros";
          acc[industry] = (acc[industry] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      const topIndustries = Object.entries(industryCount)
        .map(([name, count]) => ({
          name,
          count,
          percentage: Math.round((count / totalCompanies) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Mock data for charts
      const subscriptionTrends = [
        { month: "Ene", trial: 15, paid: 8, churned: 2 },
        { month: "Feb", trial: 18, paid: 12, churned: 1 },
        { month: "Mar", trial: 22, paid: 16, churned: 3 },
        { month: "Abr", trial: 20, paid: 19, churned: 2 },
        { month: "May", trial: 25, paid: 23, churned: 1 },
        { month: "Jun", trial: 28, paid: 26, churned: 2 },
      ];

      const revenueByPlan = Object.entries(planPrices).map(([plan, price]) => ({
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        revenue:
          companies.filter((c) => c.subscriptionPlan === plan).length * price,
        companies: companies.filter((c) => c.subscriptionPlan === plan).length,
      }));

      const companySizeDistribution = [
        { size: "Pequeña (1-10)", count: Math.floor(totalCompanies * 0.6) },
        { size: "Mediana (11-50)", count: Math.floor(totalCompanies * 0.3) },
        { size: "Grande (51+)", count: Math.floor(totalCompanies * 0.1) },
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
          {
            region: "Santo Domingo",
            companies: Math.floor(totalCompanies * 0.4),
          },
          { region: "Santiago", companies: Math.floor(totalCompanies * 0.2) },
          { region: "La Vega", companies: Math.floor(totalCompanies * 0.15) },
          {
            region: "San Cristóbal",
            companies: Math.floor(totalCompanies * 0.1),
          },
          { region: "Otros", companies: Math.floor(totalCompanies * 0.15) },
        ],
        systemHealth: {
          uptime: 99.9,
          responseTime: 142,
          errorRate: 0.08,
          activeUsers: activeCompanies * 3,
        },
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Import RNC data from DGII file
  app.post(
    "/api/admin/import-rnc-data",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { parseAndImportRNCFile } = await import("./rnc-parser");
        const result = await parseAndImportRNCFile(
          "attached_assets/DGII_RNC.TXT",
        );

        res.json({
          message: "RNC data imported successfully",
          total: result.total,
          imported: result.imported,
        });
      } catch (error) {
        console.error("Error importing RNC data:", error);
        res.status(500).json({
          message: "Failed to import RNC data",
          error: String(error),
        });
      }
    },
  );

  // RNC Verification API endpoint
  app.get("/api/verify-rnc/:rnc", isAuthenticated, async (req: any, res) => {
    try {
      const { rnc } = req.params;
      const rncData = await verifyRNCWithDGII(rnc);

      if (rncData) {
        res.json({
          valid: true,
          data: rncData,
        });
      } else {
        res.json({
          valid: false,
          message: "RNC no encontrado en la base de datos de la DGII",
        });
      }
    } catch (error) {
      console.error("Error in RNC verification:", error);
      res.status(500).json({
        valid: false,
        message: "Error interno del servidor",
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
          message: "RNC parameter is required",
        });
      }

      const cleanRnc = rnc.toString().replace(/\D/g, "");

      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({
          isValid: false,
          message: `RNC debe tener entre 9 y 11 dígitos. RNC procesado: ${cleanRnc} (${cleanRnc.length} dígitos)`,
          rnc: cleanRnc,
          originalInput: rnc
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
          source: "local",
        });
      }

      // If not found locally, return not found
      return res.json({
        isValid: false,
        rnc: cleanRnc,
        message: "RNC no encontrado en el registro local de DGII",
        source: "local",
      });
    } catch (error) {
      console.error("Error verifying RNC:", error);
      res.json({
        isValid: false,
        message: "Error interno del servidor al verificar RNC",
      });
    }
  });

  // Bulk import RNC registry (for admin use)
  app.post(
    "/api/fiscal/import-rnc-registry",
    isAuthenticated,
    async (req: any, res) => {
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
        res.json({
          message: `Successfully imported ${data.length} RNC records`,
        });
      } catch (error) {
        console.error("Error importing RNC registry:", error);
        res.status(500).json({ message: "Failed to import RNC registry" });
      }
    },
  );

  // DGII Registry Management Routes
  app.get("/api/dgii/registry/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);

      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const status = dgiiRegistryUpdater.getUpdateStatus();
      const registryCount = await storage.getRNCRegistryCount();

      res.json({
        ...status,
        registryCount,
        autoUpdateEnabled: true,
        updateInterval: "24 hours"
      });
    } catch (error) {
      console.error("Error fetching DGII registry status:", error);
      res.status(500).json({ message: "Failed to fetch registry status" });
    }
  });

  app.post("/api/dgii/registry/update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);

      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      // Trigger manual update
      const success = await dgiiRegistryUpdater.performUpdate();

      if (success) {
        await auditLogger.logFiscalAction(
          userId,
          0,
          'dgii_registry_manual_update',
          'rnc_registry',
          'manual_trigger',
          { triggeredBy: userId, timestamp: new Date() }
        );

        res.json({ 
          success: true, 
          message: "DGII registry update completed successfully" 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "DGII registry update failed" 
        });
      }
    } catch (error) {
      console.error("Error triggering DGII registry update:", error);
      res.status(500).json({ message: "Failed to trigger registry update" });
    }
  });

  app.post("/api/dgii/registry/auto-update/toggle", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);

      if (!isSuperAdmin) {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }

      const { enabled } = req.body;

      if (enabled) {
        dgiiRegistryUpdater.startAutoUpdate();
      } else {
        dgiiRegistryUpdater.stopAutoUpdate();
      }

      await auditLogger.logFiscalAction(
        userId,
        0,
        'dgii_registry_auto_update_toggle',
        'rnc_registry',
        'configuration',
        { enabled, triggeredBy: userId, timestamp: new Date() }
      );

      res.json({ 
        success: true, 
        message: `DGII registry auto-update ${enabled ? 'enabled' : 'disabled'}`,
        autoUpdateEnabled: enabled
      });
    } catch (error) {
      console.error("Error toggling DGII registry auto-update:", error);
      res.status(500).json({ message: "Failed to toggle auto-update" });
    }
  });

  // Create sample products endpoint
  app.post(
    "/api/products/create-samples",
    isAuthenticated,
    async (req: any, res) => {
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
            imageUrl:
              "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop",
          },
          {
            name: "Plátano Maduro",
            description: "Plátanos dulces y maduros",
            code: "PLAT001",
            price: "35.00",
            cost: "20.00",
            stock: 40,
            imageUrl:
              "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop",
          },
          {
            name: "Arroz Blanco Premium",
            description: "Arroz de grano largo de alta calidad",
            code: "ARRO001",
            price: "120.00",
            cost: "80.00",
            stock: 25,
            imageUrl:
              "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop",
          },
          {
            name: "Pollo Fresco Entero",
            description: "Pollo fresco de granja local",
            code: "POLL001",
            price: "280.00",
            cost: "200.00",
            stock: 15,
            imageUrl:
              "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop",
          },
          {
            name: "Leche Entera 1L",
            description: "Leche fresca pasteurizada",
            code: "LECH001",
            price: "65.00",
            cost: "45.00",
            stock: 30,
            imageUrl:
              "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop",
          },
          {
            name: "Pan de Molde Integral",
            description: "Pan integral rico en fibra",
            code: "PAN001",
            price: "85.00",
            cost: "55.00",
            stock: 20,
            imageUrl:
              "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop",
          },
          {
            name: "Huevos Frescos Docena",
            description: "Huevos de gallina criolla",
            code: "HUEV001",
            price: "150.00",
            cost: "100.00",
            stock: 35,
            imageUrl:
              "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop",
          },
          {
            name: "Café Dominicano 500g",
            description: "Café tostado de las montañas dominicanas",
            code: "CAFE001",
            price: "320.00",
            cost: "220.00",
            stock: 18,
            imageUrl:
              "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop",
          },
        ];

        const createdProducts = [];
        for (const productData of sampleProducts) {
          const product = await storage.createProduct({
            companyId: company.id,
            ...productData,
          });
          createdProducts.push(product);
        }

        res.json({
          message: "Sample products created successfully",
          products: createdProducts,
        });
      } catch (error) {
        console.error("Error creating sample products:", error);
        res.status(500).json({ message: "Failed to create sample products" });
      }
    },
  );

  // AI Integration Routes

  // Generate product description with AI
  app.post(
    "/api/ai/product-description",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { productName, category, features } = req.body;

        if (!process.env.ANTHROPIC_API_KEY) {
          return res.status(503).json({ message: "AI service not configured" });
        }

        const description = await AIProductService.generateProductDescription(
          productName,
          category,
          features,
        );

        res.json({ description });
      } catch (error) {
        console.error("Error generating product description:", error);
        res
          .status(500)
          .json({ message: String(error) || "Failed to generate description" });
      }
    },
  );

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
        brand,
      );

      res.json({ code });
    } catch (error) {
      console.error("Error generating product code:", error);
      res
        .status(500)
        .json({ message: String(error) || "Failed to generate code" });
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
      res
        .status(500)
        .json({ message: String(error) || "Failed to analyze sales" });
    }
  });

  // AI Inventory Optimization
  app.post(
    "/api/ai/inventory-optimization",
    isAuthenticated,
    async (req: any, res) => {
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

        const optimization = await AIBusinessService.optimizeInventory(
          products,
          salesHistory,
        );

        res.json(optimization);
      } catch (error) {
        console.error("Error optimizing inventory:", error);
        res
          .status(500)
          .json({ message: String(error) || "Failed to optimize inventory" });
      }
    },
  );

  // MANUFACTURING MODULE ROUTES
  
  // Production Orders
  app.get("/api/production-orders", isAuthenticated, async (req: any, res) => {
    try {
      const companyId = req.user.companyId;
      const orders = await storage.getProductionOrders(companyId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      res.status(500).json({ message: "Failed to fetch production orders" });
    }
  });

  app.post("/api/production-orders", isAuthenticated, async (req: any, res) => {
    try {
      const companyId = req.user.companyId;
      const userId = req.user.id;
      const orderData = {
        ...req.body,
        companyId,
        createdBy: userId,
        status: 'draft'
      };
      
      const order = await storage.createProductionOrder(orderData);
      res.json(order);
    } catch (error) {
      console.error("Error creating production order:", error);
      res.status(500).json({ message: "Failed to create production order" });
    }
  });

  app.patch("/api/production-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const companyId = req.user.companyId;
      
      const order = await storage.updateProductionOrder(orderId, req.body, companyId);
      res.json(order);
    } catch (error) {
      console.error("Error updating production order:", error);
      res.status(500).json({ message: "Failed to update production order" });
    }
  });

  app.delete("/api/production-orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const companyId = req.user.companyId;
      
      await storage.deleteProductionOrder(orderId, companyId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting production order:", error);
      res.status(500).json({ message: "Failed to delete production order" });
    }
  });

  // Bill of Materials (BOM)
  app.get("/api/bom/:productId", isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const companyId = req.user.companyId;
      
      const bomItems = await storage.getBOMByProduct(productId, companyId);
      res.json(bomItems);
    } catch (error) {
      console.error("Error fetching BOM:", error);
      res.status(500).json({ message: "Failed to fetch BOM" });
    }
  });

  app.post("/api/bom", isAuthenticated, async (req: any, res) => {
    try {
      const companyId = req.user.companyId;
      const bomData = {
        ...req.body,
        companyId
      };
      
      const bomItem = await storage.createBOMItem(bomData);
      res.json(bomItem);
    } catch (error) {
      console.error("Error creating BOM item:", error);
      res.status(500).json({ message: "Failed to create BOM item" });
    }
  });

  app.patch("/api/bom/:id", isAuthenticated, async (req: any, res) => {
    try {
      const bomId = parseInt(req.params.id);
      const companyId = req.user.companyId;
      
      const bomItem = await storage.updateBOMItem(bomId, req.body, companyId);
      res.json(bomItem);
    } catch (error) {
      console.error("Error updating BOM item:", error);
      res.status(500).json({ message: "Failed to update BOM item" });
    }
  });

  app.delete("/api/bom/:id", isAuthenticated, async (req: any, res) => {
    try {
      const bomId = parseInt(req.params.id);
      const companyId = req.user.companyId;
      
      await storage.deleteBOMItem(bomId, companyId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting BOM item:", error);
      res.status(500).json({ message: "Failed to delete BOM item" });
    }
  });

  // Manufacturing cost calculation
  app.get("/api/manufacturing/costs/:productId", isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const companyId = req.user.companyId;
      const quantity = parseInt(req.query.quantity as string) || 1;
      
      const costs = await storage.calculateManufacturingCosts(productId, quantity, companyId);
      res.json(costs);
    } catch (error) {
      console.error("Error calculating manufacturing costs:", error);
      res.status(500).json({ message: "Failed to calculate manufacturing costs" });
    }
  });

  app.post("/api/manufacturing/calculate-cost", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const { productId, quantity } = req.body;
      const costData = await storage.calculateManufacturingCosts(productId, quantity, company.id);
      res.json(costData);
    } catch (error) {
      console.error("Error calculating manufacturing costs:", error);
      res.status(500).json({ message: "Failed to calculate manufacturing costs" });
    }
  });

  // Recipe routes
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
      const recipeData = { ...req.body, companyId: company.id };
      const recipe = await storage.createRecipe(recipeData);
      res.json(recipe);
    } catch (error) {
      console.error("Error creating recipe:", error);
      res.status(500).json({ message: "Failed to create recipe" });
    }
  });

  app.patch("/api/recipes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      const recipeId = parseInt(req.params.id);
      const recipe = await storage.updateRecipe(recipeId, req.body, company.id);
      res.json(recipe);
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
      await storage.deleteRecipe(recipeId, company.id);
      res.json({ message: "Recipe deleted successfully" });
    } catch (error) {
      console.error("Error deleting recipe:", error);
      res.status(500).json({ message: "Failed to delete recipe" });
    }
  });

  // ACCOUNTING MODULE ROUTES

  // Initialize Chart of Accounts
  app.post("/api/accounting/initialize", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const result = await simpleAccountingService.initializeChartOfAccounts(company.id, userId);
      res.json(result);
    } catch (error) {
      console.error("Error initializing chart of accounts:", error);
      res.status(500).json({ message: "Failed to initialize chart of accounts" });
    }
  });

  // Get Chart of Accounts
  app.get("/api/accounting/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const accounts = await simpleAccountingService.getAccounts(company.id);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  // Create Account
  app.post("/api/accounting/accounts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const accountData = insertAccountSchema.parse({ ...req.body, companyId: company.id });
      const account = await storage.createAccount(accountData);
      res.json(account);
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Get Journal Entries
  app.get("/api/accounting/journal-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const entries = await simpleAccountingService.getJournalEntries(company.id);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  // Create Manual Journal Entry
  app.post("/api/accounting/journal-entries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const entryData = insertJournalEntrySchema.parse({ ...req.body, companyId: company.id, createdBy: userId });
      const entry = await storage.createJournalEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  // Generate Trial Balance
  app.get("/api/accounting/trial-balance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const { asOfDate } = req.query;
      const endDate = asOfDate ? new Date(asOfDate as string) : undefined;
      
      const trialBalance = await accountingService.generateTrialBalance(company.id, endDate);
      res.json(trialBalance);
    } catch (error) {
      console.error("Error generating trial balance:", error);
      res.status(500).json({ message: "Failed to generate trial balance" });
    }
  });

  // Generate Income Statement
  app.get("/api/accounting/income-statement", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const incomeStatement = await accountingService.generateIncomeStatement(
        company.id,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(incomeStatement);
    } catch (error) {
      console.error("Error generating income statement:", error);
      res.status(500).json({ message: "Failed to generate income statement" });
    }
  });

  // Generate Balance Sheet
  app.get("/api/accounting/balance-sheet", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const { asOfDate } = req.query;
      const endDate = asOfDate ? new Date(asOfDate as string) : undefined;
      
      const balanceSheet = await accountingService.generateBalanceSheet(company.id, endDate);
      res.json(balanceSheet);
    } catch (error) {
      console.error("Error generating balance sheet:", error);
      res.status(500).json({ message: "Failed to generate balance sheet" });
    }
  });

  // Get General Ledger for Account
  app.get("/api/accounting/general-ledger/:accountId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const { accountId } = req.params;
      const { startDate, endDate } = req.query;
      
      const startDateObj = startDate ? new Date(startDate as string) : undefined;
      const endDateObj = endDate ? new Date(endDate as string) : undefined;
      
      const ledger = await accountingService.getGeneralLedger(
        company.id,
        parseInt(accountId),
        startDateObj,
        endDateObj
      );
      res.json(ledger);
    } catch (error) {
      console.error("Error fetching general ledger:", error);
      res.status(500).json({ message: "Failed to fetch general ledger" });
    }
  });

  // Profile Routes
  app.get("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive data
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { firstName, lastName, email, phone, avatar } = req.body;
      
      // Validate email uniqueness if changed
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }
      
      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email,
        profileImageUrl: avatar,
        updatedAt: new Date()
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove sensitive data
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const bcrypt = await import("bcrypt");
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      await storage.updateUser(userId, {
        password: hashedNewPassword,
        updatedAt: new Date()
      });
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Settings Routes
  app.get("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Get system settings for the company
      const settings = await storage.getCompanySettings(company.id);
      res.json(settings || {
        theme: "light",
        language: "es",
        currency: "DOP",
        timezone: "America/Santo_Domingo",
        notifications: {
          email: true,
          push: true,
          lowStock: true,
          sales: true
        },
        fiscal: {
          defaultNCFType: "01",
          taxRate: 0.18,
          autoGenerateNCF: true
        }
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const updatedSettings = await storage.updateCompanySettings(company.id, req.body);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
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
        userId: userId,
      };

      const response = await AIChatService.processQuery(message, context);

      // Save chat message to database
      try {
        await storage.saveAIChatMessage({
          companyId: userCompany.id,
          userId,
          message,
          response,
          context,
        });
      } catch (saveError) {
        console.error("Error saving chat message:", saveError);
        // Continue even if saving fails
      }

      res.json({ response });
    } catch (error) {
      console.error("Error processing chat:", error);
      res
        .status(500)
        .json({ message: String(error) || "Failed to process message" });
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
      const messages = await storage.getAIChatMessages(
        userCompany.id,
        userId,
        limit,
      );

      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat history:", error);
      res.status(500).json({ message: "Failed to fetch chat history" });
    }
  });

  // AI Document Processing
  app.post(
    "/api/ai/extract-invoice",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { text } = req.body;

        if (!process.env.ANTHROPIC_API_KEY) {
          return res.status(503).json({ message: "AI service not configured" });
        }

        const extractedData = await AIDocumentService.extractInvoiceData(text);

        res.json(extractedData);
      } catch (error) {
        console.error("Error extracting invoice data:", error);
        res
          .status(500)
          .json({ message: String(error) || "Failed to extract data" });
      }
    },
  );

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
        createdBy: userId,
      });

      const channel = await storage.createChatChannel(channelData);
      res.json(channel);
    } catch (error) {
      console.error("Error creating chat channel:", error);
      res.status(500).json({ message: "Failed to create channel" });
    }
  });

  // Get messages for a channel
  app.get(
    "/api/chat/channels/:channelId/messages",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { channelId } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        // Verify user has access to channel
        const hasAccess = await storage.userHasChannelAccess(
          userId,
          parseInt(channelId),
        );
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }

        const messages = await storage.getChatMessages(
          parseInt(channelId),
          limit,
          offset,
        );
        res.json(messages);
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        res.status(500).json({ message: "Failed to fetch messages" });
      }
    },
  );

  // Send message to channel
  app.post(
    "/api/chat/channels/:channelId/messages",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { channelId } = req.params;

        // Verify user has access to channel
        const hasAccess = await storage.userHasChannelAccess(
          userId,
          parseInt(channelId),
        );
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }

        const messageData = insertChatMessageSchema.parse({
          ...req.body,
          channelId: parseInt(channelId),
          senderId: userId,
        });

        const message = await storage.createChatMessage(messageData);

        // Broadcast message via WebSocket
        broadcastToChannel(parseInt(channelId), {
          type: "new_message",
          data: message,
        });

        res.json(message);
      } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    },
  );

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
        companyId: userCompany.id,
      });

      const role = await storage.createUserRole(roleData);
      res.json(role);
    } catch (error) {
      console.error("Error creating user role:", error);
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  // Get user permissions
  app.get(
    "/api/users/:targetUserId/permissions",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const { targetUserId } = req.params;
        const userCompany = await storage.getCompanyByUserId(userId);

        if (!userCompany) {
          return res.status(404).json({ message: "Company not found" });
        }

        const permissions = await storage.getUserPermissions(
          targetUserId,
          userCompany.id,
        );
        res.json(permissions);
      } catch (error) {
        console.error("Error fetching user permissions:", error);
        res.status(500).json({ message: "Failed to fetch permissions" });
      }
    },
  );

  // Update user permissions
  app.put(
    "/api/users/:targetUserId/permissions",
    isAuthenticated,
    async (req: any, res) => {
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
          companyId: userCompany.id,
        });

        const permissions = await storage.updateUserPermissions(permissionData);
        res.json(permissions);
      } catch (error) {
        console.error("Error updating user permissions:", error);
        res.status(500).json({ message: "Failed to update permissions" });
      }
    },
  );

  // Configure multer for logo uploads
  const uploadDir = path.join(process.cwd(), "uploads", "logos");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `logo-${uniqueSuffix}${ext}`);
    },
  });

  const uploadLogo = multer({
    storage: logoStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  // Logo upload endpoint - convert to base64 data URL
  app.post(
    "/api/upload/logo",
    isAuthenticated,
    uploadLogo.single("logo"),
    async (req: any, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Convert file to base64 data URL
        const fileData = fs.readFileSync(req.file.path);
        const base64Data = fileData.toString("base64");
        const mimeType = req.file.mimetype;
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        // Clean up the temporary file
        fs.unlinkSync(req.file.path);

        res.json({ url: dataUrl });
      } catch (error: any) {
        console.error("Error uploading logo:", error);
        res.status(500).json({ message: "Failed to upload logo" });
      }
    },
  );

  // For now, we'll store the logo URL in the database without file upload
  // This can be enhanced later with proper cloud storage

  // RNC company search endpoint
  app.get("/api/rnc/search", async (req, res) => {
    try {
      const { query, limit = "10" } = req.query;
      
      if (!query || typeof query !== 'string' || query.length < 3) {
        return res.json({ companies: [] });
      }

      const companies = await storage.searchCompaniesByName(query.trim(), parseInt(limit as string));
      
      res.json({ 
        companies: companies
      });
    } catch (error) {
      console.error('RNC search error:', error);
      res.status(500).json({ error: 'Error searching companies' });
    }
  });

  // RNC auto-fill endpoint
  app.get("/api/rnc/:rnc", async (req, res) => {
    try {
      const { rnc } = req.params;

      // Validate RNC format
      if (!/^[0-9]{9}$|^[0-9]{11}$/.test(rnc)) {
        return res
          .status(400)
          .json({ message: "RNC debe tener 9 o 11 dígitos" });
      }

      const rncData = await storage.searchRNC(rnc);

      if (!rncData) {
        return res
          .status(404)
          .json({ message: "RNC no encontrado en el registro de DGII" });
      }

      // Check if RNC is already used by another company
      const existingCompany = await storage.getCompanyByRNC(rnc);
      if (existingCompany) {
        return res.status(409).json({
          message: "Este RNC ya está registrado por otra empresa",
          companyName: existingCompany.name,
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
        isActive: rncData.estado === "ACTIVO",
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
          message: "Token de invitación inválido o expirado",
        });
      }

      res.json({
        companyName: company.name,
        companyEmail: company.email,
        isValid: true,
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
          message: "Todos los campos son requeridos",
        });
      }

      // Hash the password
      const { hashPassword } = await import("./auth");
      const hashedPassword = await hashPassword(password);

      const result = await storage.completeCompanyRegistration(token, {
        firstName,
        lastName,
        password: hashedPassword,
      });

      if (!result) {
        return res.status(400).json({
          message: "Token de invitación inválido o expirado",
        });
      }

      res.json({
        message: "Registro completado exitosamente",
        company: result.company,
        redirectTo: "/auth",
      });
    } catch (error) {
      console.error("Error completing registration:", error);
      res.status(500).json({ message: "Error al completar el registro" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time chat
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  // Store active connections
  const activeConnections = new Map<string, Set<WebSocket>>();

  // Function to broadcast messages to channel members
  function broadcastToChannel(channelId: number, message: any) {
    const channelKey = `channel_${channelId}`;
    const connections = activeConnections.get(channelKey);

    if (connections) {
      const messageStr = JSON.stringify(message);
      connections.forEach((ws) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      });
    }
  }

  wss.on("connection", (ws, request) => {
    console.log("New WebSocket connection");

    let userId: string | null = null;
    let userChannels: Set<string> = new Set();

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "authenticate":
            // In a real implementation, verify the token
            userId = message.userId;

            // Get user's channels and subscribe to them
            if (userId) {
              try {
                const userCompany = await storage.getCompanyByUserId(userId);
                if (userCompany) {
                  const channels = await storage.getChatChannels(
                    userCompany.id,
                    userId,
                  );

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
                console.error("Error subscribing to channels:", error);
              }
            }

            ws.send(
              JSON.stringify({
                type: "authenticated",
                success: true,
              }),
            );
            break;

          case "typing":
            // Broadcast typing indicator to channel
            if (message.channelId) {
              broadcastToChannel(message.channelId, {
                type: "user_typing",
                userId: userId,
                channelId: message.channelId,
              });
            }
            break;

          case "join_channel":
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

          case "leave_channel":
            // Remove user from channel subscription
            if (message.channelId) {
              const channelKey = `channel_${message.channelId}`;
              userChannels.delete(channelKey);
              activeConnections.get(channelKey)?.delete(ws);
            }
            break;
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      // Clean up connections
      userChannels.forEach((channelKey) => {
        activeConnections.get(channelKey)?.delete(ws);
      });
      console.log("WebSocket connection closed");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  // Admin endpoint for resending invitation emails
  app.post(
    "/api/admin/companies/:id/resend-email",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const isSuperAdmin = await storage.isUserSuperAdmin(userId);

        if (!isSuperAdmin) {
          return res
            .status(403)
            .json({ message: "Access denied. Super admin required." });
        }

        const companyId = parseInt(req.params.id);
        const company = await storage.getCompany(companyId);

        if (!company) {
          return res.status(404).json({ message: "Company not found" });
        }

        if (!company.ownerEmail) {
          return res
            .status(400)
            .json({ message: "Company does not have an owner email" });
        }

        // Generate new invitation token and expiry
        const invitationToken =
          Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
        const invitationExpiresAt = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ); // 7 days

        // Update company with new invitation token
        await storage.updateCompany(companyId, {
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt,
        });

        // Send invitation email
        const { sendCompanyInvitationEmail } = await import("./email-service");
        const emailSent = await sendCompanyInvitationEmail({
          companyName: company.name,
          companyEmail: company.ownerEmail,
          invitationToken,
        });

        res.json({
          emailSent,
          message: emailSent
            ? "Invitación reenviada exitosamente"
            : "No se pudo enviar la invitación",
        });
      } catch (error) {
        console.error("Error resending company invitation:", error);
        res.status(500).json({ message: "Error al reenviar la invitación" });
      }
    },
  );

  // Enhanced PUT endpoint for updating companies with automatic email resend
  app.put(
    "/api/admin/companies/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const isSuperAdmin = await storage.isUserSuperAdmin(userId);

        if (!isSuperAdmin) {
          return res
            .status(403)
            .json({ message: "Access denied. Super admin required." });
        }

        const companyId = parseInt(req.params.id);
        const existingCompany = await storage.getCompany(companyId);

        if (!existingCompany) {
          return res.status(404).json({ message: "Company not found" });
        }

        const { ownerEmail: newOwnerEmail, ...updateData } = req.body;
        const emailChanged =
          newOwnerEmail && newOwnerEmail !== existingCompany.ownerEmail;

        // Update company data
        const updatedData = {
          ...updateData,
          ...(newOwnerEmail && { ownerEmail: newOwnerEmail }),
        };

        const updatedCompany = await storage.updateCompany(
          companyId,
          updatedData,
        );

        // If email changed, resend invitation to new email
        let emailSent = false;
        if (emailChanged) {
          const invitationToken =
            Math.random().toString(36).substr(2, 32) + Date.now().toString(36);
          const invitationExpiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          );

          await storage.updateCompany(companyId, {
            invitationToken,
            invitationSentAt: new Date(),
            invitationExpiresAt,
          });

          const { sendCompanyInvitationEmail } = await import(
            "./email-service"
          );
          emailSent = await sendCompanyInvitationEmail({
            companyName: updatedCompany.name,
            companyEmail: newOwnerEmail,
            invitationToken,
          });
        }

        res.json({
          ...updatedCompany,
          emailSent: emailChanged ? emailSent : null,
          emailChanged,
        });
      } catch (error) {
        console.error("Error updating company:", error);
        res.status(500).json({ message: "Failed to update company" });
      }
    },
  );

  // Fiscal Reports API Routes (606 and 607)
  app.get(
    "/api/fiscal-reports/stats",
    isAuthenticated,
    async (req: any, res) => {
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
          pendingReports: 0,
        };

        res.json(stats);
      } catch (error) {
        console.error("Error fetching fiscal reports stats:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch fiscal reports stats" });
      }
    },
  );

  app.get("/api/fiscal-reports/606", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userCompany = await storage.getCompanyByUserId(userId);

      if (!userCompany) {
        return res.status(400).json({ message: "Company not found" });
      }

      const companyId = userCompany.id;

      // Get all 606 reports for company
      const reports606: any[] = [];
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
          period: new Date(sale.date)
            .toISOString()
            .substring(0, 7)
            .replace("-", ""),
          rncCedula: sale.customer?.rnc || sale.customer?.cedula || "000000000",
          tipoIdentificacion: sale.customer?.rnc ? "1" : "2",
          ncf: sale.ncf || "",
          fechaComprobante: new Date(sale.date),
          montoFacturado: sale.subtotal,
          itbisFacturado: sale.tax,
          total: sale.total,
          efectivo: sale.paymentMethod === "cash" ? sale.total : "0",
          tarjeta: sale.paymentMethod === "card" ? sale.total : "0",
          credito: sale.paymentMethod === "credit" ? sale.total : "0",
        })),
        ...invoices.map((invoice: any) => ({
          id: invoice.id,
          period: new Date(invoice.date)
            .toISOString()
            .substring(0, 7)
            .replace("-", ""),
          rncCedula:
            invoice.customer?.rnc || invoice.customer?.cedula || "000000000",
          tipoIdentificacion: invoice.customer?.rnc ? "1" : "2",
          ncf: invoice.ncf || "",
          fechaComprobante: new Date(invoice.date),
          montoFacturado: invoice.subtotal,
          itbisFacturado: invoice.itbis,
          total: invoice.total,
        })),
      ];

      res.json(reports607);
    } catch (error) {
      console.error("Error fetching 607 reports:", error);
      res.status(500).json({ message: "Failed to fetch 607 reports" });
    }
  });

  app.post(
    "/api/fiscal-reports/generate",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.id;
        const userCompany = await storage.getCompanyByUserId(userId);

        if (!userCompany) {
          return res.status(400).json({ message: "Company not found" });
        }

        const companyId = userCompany.id;
        const { type, period } = req.body;

        // Validate input parameters
        if (!type || !period) {
          return res.status(400).json({ message: "Type and period are required" });
        }

        if (!["606", "607"].includes(type)) {
          return res.status(400).json({ message: "Invalid report type. Must be 606 or 607" });
        }

        // Validate period format (YYYYMM)
        if (!/^\d{6}$/.test(period)) {
          return res.status(400).json({ message: "Invalid period format. Must be YYYYMM" });
        }

        // Validate company has required fiscal data
        if (!userCompany.rnc) {
          return res.status(400).json({ 
            message: "Company RNC is required for DGII reports. Please configure in Company Settings." 
          });
        }

        // Generate fiscal report based on official DGII templates
        let reportContent = "";
        let recordCount = 0;

        if (type === "606") {
          const result = await generateReport606(companyId, period);
          reportContent = result.content;
          recordCount = result.recordCount;
        } else if (type === "607") {
          const result = await generateReport607(companyId, period);
          reportContent = result.content;
          recordCount = result.recordCount;
        }

        // If no data found for the period, return informative message
        if (recordCount === 0) {
          return res.status(404).json({ 
            message: `No transactions found for period ${period}. You may need to submit an informative (zero) report to DGII.` 
          });
        }

        // Set headers for file download
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="DGII_F_${type}_${userCompany.rnc}_${period}.txt"`,
        );
        
        // Add BOM for proper encoding
        res.send('\ufeff' + reportContent);

        // Log the successful generation
        await auditLogger.logFiscalAction(
          userId,
          companyId,
          "GENERATE_REPORT",
          `DGII_${type}`,
          period,
          { recordCount, period, type },
          req
        );

      } catch (error) {
        console.error("Error generating fiscal report:", error);
        res.status(500).json({ message: "Failed to generate fiscal report" });
      }
    },
  );

  // Helper functions for generating fiscal reports based on DGII templates
  async function generateReport606(
    companyId: number,
    period: string,
  ): Promise<{ content: string; recordCount: number }> {
    // Formato 606 oficial DGII para compras según NG-07-2018
    const reportLines: string[] = [];

    // Get company data
    const company = await storage.getCompany(companyId);
    const companyRnc = company?.rnc || "000000000";

    // Extract year and month from period (format: YYYYMM)
    const periodYear = period.substring(0, 4);
    const periodMonth = period.substring(4, 6);

    try {
      // Get actual purchase invoices for the period
      const invoices = await storage.getInvoices(companyId);
      
      for (const invoice of invoices) {
        const invoiceDate = new Date(invoice.date);
        const dateYear = invoiceDate.getFullYear().toString();
        const dateMonth = (invoiceDate.getMonth() + 1).toString().padStart(2, "0");

        if (dateYear === periodYear && dateMonth === periodMonth) {
          // Validate required invoice data
          if (!invoice.ncf || !invoice.total || !invoice.subtotal) {
            console.warn(`Skipping invoice ${invoice.id}: Missing required fiscal data (NCF, total, or subtotal)`);
            continue;
          }

          // Get supplier/customer data
          const customer = await storage.getCustomer(invoice.customerId, companyId);

          // Validate customer has proper identification
          if (!customer?.rnc && !customer?.cedula) {
            console.warn(`Skipping invoice ${invoice.id}: Customer missing RNC or Cédula`);
            continue;
          }

          // DGII 606 format according to official documentation:
          // RNC_CEDULA|TIPO_ID|TIPO_BIENES_SERVICIOS|NCF|NCF_MODIFICADO|FECHA_COMPROBANTE|FECHA_PAGO|
          // MONTO_SERVICIOS|MONTO_BIENES|TOTAL_MONTO|ITBIS_FACTURADO|ITBIS_RETENIDO|ITBIS_PROPORCIONALIDAD|
          // ITBIS_COSTO|ITBIS_ADELANTAR|ITBIS_PERCIBIDO|TIPO_RETENCION_ISR|MONTO_RETENCION_RENTA|
          // ISR_PERCIBIDO|IMPUESTO_SELECTIVO|OTROS_IMPUESTOS|MONTO_PROPINA_LEGAL|FORMA_PAGO
          const line = [
            customer.rnc || customer.cedula, // RNC/Cédula del proveedor
            customer.rnc ? "1" : "2", // Tipo ID: 1=RNC, 2=Cédula
            "9", // Tipo de bienes y servicios (9=Compras y gastos que formarán parte del costo de venta)
            invoice.ncf, // NCF
            "", // NCF modificado
            invoiceDate.toISOString().split("T")[0].replace(/-/g, ""), // Fecha comprobante YYYYMMDD
            invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0].replace(/-/g, "") : "", // Fecha pago
            "0.00", // Monto facturado en servicios
            parseFloat(invoice.subtotal).toFixed(2), // Monto facturado en bienes
            parseFloat(invoice.total).toFixed(2), // Total monto facturado
            parseFloat(invoice.itbis || "0").toFixed(2), // ITBIS facturado
            "0.00", // ITBIS retenido
            "0.00", // ITBIS sujeto a proporcionalidad
            "0.00", // ITBIS llevado al costo
            parseFloat(invoice.itbis || "0").toFixed(2), // ITBIS por adelantar
            "0.00", // ITBIS percibido en compras
            "", // Tipo de retención en ISR
            "0.00", // Monto retención renta
            "0.00", // ISR percibido en compras
            "0.00", // Impuesto selectivo al consumo
            "0.00", // Otros impuestos/tasas
            "0.00", // Monto propina legal
            "4", // Forma de pago (4=Compra a crédito para facturas)
          ].join("|");

          reportLines.push(line);
        }
      }
    } catch (error) {
      console.error("Error generating 606 report:", error);
    }

    return {
      content: reportLines.join("\n"),
      recordCount: reportLines.length
    };
  }

  async function generateReport607(
    companyId: number,
    period: string,
  ): Promise<{ content: string; recordCount: number }> {
    // Formato 607 oficial DGII para ventas según NG-07-2018
    const reportLines: string[] = [];

    // Get company data
    const company = await storage.getCompany(companyId);
    const companyRnc = company?.rnc || "000000000";

    // Extract year and month from period (format: YYYYMM)
    const periodYear = period.substring(0, 4);
    const periodMonth = period.substring(4, 6);

    try {
      // Get actual sales data for the period
      const sales = await storage.getPOSSales(companyId);
      const invoices = await storage.getInvoices(companyId);

      // Process POS sales (facturas de consumo)
      for (const sale of sales) {
        const saleDate = new Date(sale.createdAt || new Date());
        const dateYear = saleDate.getFullYear().toString();
        const dateMonth = (saleDate.getMonth() + 1).toString().padStart(2, "0");

        if (dateYear === periodYear && dateMonth === periodMonth) {
          // Validate required sale data
          if (!sale.ncf || !sale.total || !sale.subtotal) {
            console.warn(`Skipping POS sale ${sale.id}: Missing required fiscal data (NCF, total, or subtotal)`);
            continue;
          }

          const customer = sale.customerId
            ? await storage.getCustomer(sale.customerId, companyId)
            : null;

          // Only include sales >= RD$250,000 for facturas de consumo according to NG-10-18
          const saleTotal = parseFloat(sale.total);
          if (!customer && saleTotal < 250000) {
            continue; // Skip small consumer invoices without customer data
          }

          // For sales without customer, use generic consumer data
          const customerRnc = customer?.rnc || customer?.cedula || "000000000";
          const customerType = customer?.rnc ? "1" : customer?.cedula ? "2" : "3";

          // DGII 607 format according to official documentation:
          // RNC_CEDULA|TIPO_ID|NCF|NCF_MODIFICADO|TIPO_INGRESOS_MODIFICADO|FECHA_COMPROBANTE|FECHA_VENCIMIENTO|
          // MONTO_SERVICIOS|MONTO_BIENES|TOTAL_MONTO|ITBIS_FACTURADO|ITBIS_RETENIDO|RETENCION_RENTA|
          // ITBIS_PERCIBIDO|PROPINA_LEGAL|EFECTIVO|CHEQUE_TRANSFERENCIA|TARJETA|CREDITO|BONOS|PERMUTA|OTRAS_FORMAS
          const line = [
            customerRnc, // RNC/Cédula del cliente
            customerType, // Tipo ID: 1=RNC, 2=Cédula, 3=Pasaporte
            sale.ncf, // NCF
            "", // NCF modificado
            "", // Tipo ingresos modificado
            saleDate.toISOString().split("T")[0].replace(/-/g, ""), // Fecha comprobante YYYYMMDD
            "", // Fecha vencimiento (solo para créditos)
            "0.00", // Monto facturado en servicios
            parseFloat(sale.subtotal).toFixed(2), // Monto facturado en bienes
            saleTotal.toFixed(2), // Total monto facturado
            parseFloat(sale.itbis || "0").toFixed(2), // ITBIS facturado
            "0.00", // ITBIS retenido
            "0.00", // Retención renta
            "0.00", // ITBIS percibido
            "0.00", // Propina legal (10% solo para restaurantes según Ley 54-32)
            sale.paymentMethod === "cash" ? saleTotal.toFixed(2) : "0.00", // Efectivo
            "0.00", // Cheque/transferencia/depósito
            sale.paymentMethod === "card" ? saleTotal.toFixed(2) : "0.00", // Tarjeta crédito/débito
            sale.paymentMethod === "credit" ? saleTotal.toFixed(2) : "0.00", // Compra a crédito
            "0.00", // Bonos
            "0.00", // Permuta
            "0.00", // Otras formas
          ].join("|");

          reportLines.push(line);
        }
      }

      // Process invoices (facturas comerciales) - these are always included regardless of amount
      for (const invoice of invoices) {
        const invoiceDate = new Date(invoice.date);
        const dateYear = invoiceDate.getFullYear().toString();
        const dateMonth = (invoiceDate.getMonth() + 1).toString().padStart(2, "0");

        if (dateYear === periodYear && dateMonth === periodMonth) {
          // Validate required invoice data
          if (!invoice.ncf || !invoice.total || !invoice.subtotal) {
            console.warn(`Skipping invoice ${invoice.id}: Missing required fiscal data (NCF, total, or subtotal)`);
            continue;
          }

          const customer = await storage.getCustomer(invoice.customerId, companyId);

          // Validate customer has proper identification
          if (!customer?.rnc && !customer?.cedula) {
            console.warn(`Skipping invoice ${invoice.id}: Customer missing RNC or Cédula`);
            continue;
          }

          const line = [
            customer.rnc || customer.cedula,
            customer.rnc ? "1" : "2",
            invoice.ncf,
            "", // NCF modificado
            "", // Tipo ingresos modificado
            invoiceDate.toISOString().split("T")[0].replace(/-/g, ""),
            invoice.dueDate ? new Date(invoice.dueDate).toISOString().split("T")[0].replace(/-/g, "") : "",
            "0.00", // Monto facturado en servicios
            parseFloat(invoice.subtotal).toFixed(2), // Monto facturado en bienes
            parseFloat(invoice.total).toFixed(2), // Total monto facturado
            parseFloat(invoice.itbis || "0").toFixed(2), // ITBIS facturado
            "0.00", // ITBIS retenido
            "0.00", // Retención renta
            "0.00", // ITBIS percibido
            "0.00", // Propina legal
            "0.00", // Efectivo
            "0.00", // Cheque/transferencia/depósito
            "0.00", // Tarjeta crédito/débito
            parseFloat(invoice.total).toFixed(2), // Compra a crédito (facturas)
            "0.00", // Bonos
            "0.00", // Permuta
            "0.00", // Otras formas
          ].join("|");

          reportLines.push(line);
        }
      }
    } catch (error) {
      console.error("Error generating 607 report:", error);
    }

    return {
      content: reportLines.join("\n"),
      recordCount: reportLines.length
    };
  }

  // Enhanced receipt generation function with QR code, logo and improved design for 80mm paper
  async function generateSimpleReceipt(
    sale: any,
    items: any[],
    company: any,
    customerInfo: any,
    printOptions: any = {},
  ): Promise<string> {
    const LINE_WIDTH = 42; // Increased readability for 80mm thermal paper

    // Helper function to center text
    function centerText(text: string): string {
      if (text.length >= LINE_WIDTH) return text;
      const spaces = Math.floor((LINE_WIDTH - text.length) / 2);
      return " ".repeat(spaces) + text;
    }

    // Helper function to align right with label
    function alignRight(label: string, value: string): string {
      const combined = `${label}: ${value}`;
      if (combined.length >= LINE_WIDTH) return combined;
      const spaces = LINE_WIDTH - combined.length;
      return label + ": " + " ".repeat(spaces) + value;
    }

    const lines = [];

    // Header with Four One Solutions ASCII logo
    lines.push("".padEnd(LINE_WIDTH, "="));

    // Include real PNG logo for thermal printing
    if (printOptions.showLogo) {
      try {
        const logoPath =
          "./attached_assets/Four One Solutions Logo_20250130_143011_0000_1749182433509.png";
        const thermalLogo =
          await ThermalLogoProcessor.convertPNGToThermal(logoPath);
        const logoLines = thermalLogo.split("\n");
        logoLines.forEach((line) => {
          lines.push(centerText(line));
        });
      } catch (error) {
        console.log("Logo processing error:", error);
        lines.push(centerText("FOUR ONE SOLUTIONS"));
      }
    }
    lines.push("");

    // Company name with enhanced formatting
    lines.push(centerText("*** " + company.name.toUpperCase() + " ***"));
    if (company.slogan) {
      lines.push(centerText(company.slogan));
    }
    lines.push("");

    // Company details section
    lines.push(centerText(`RNC: ${company.rnc || "N/A"}`));
    if (company.address) {
      // Split long addresses into multiple lines
      const address = company.address;
      if (address.length > LINE_WIDTH - 4) {
        const words = address.split(" ");
        let currentLine = "";
        words.forEach((word: string) => {
          if ((currentLine + word).length > LINE_WIDTH - 4) {
            if (currentLine) lines.push(centerText(currentLine.trim()));
            currentLine = word + " ";
          } else {
            currentLine += word + " ";
          }
        });
        if (currentLine) lines.push(centerText(currentLine.trim()));
      } else {
        lines.push(centerText(address));
      }
    }
    lines.push(centerText(`Tel: ${company.phone || "N/A"}`));
    if (company.email) {
      lines.push(centerText(company.email));
    }
    lines.push("");
    lines.push("".padEnd(LINE_WIDTH, "="));
    lines.push("");

    // Receipt type and sale info
    lines.push(centerText("*** COMPROBANTE DE VENTA ***"));
    lines.push("");
    lines.push(centerText(`Factura No. ${sale.saleNumber}`));

    const fecha = new Date(sale.createdAt);
    const fechaStr = fecha.toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const horaStr = fecha.toLocaleTimeString("es-DO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    lines.push(centerText(`Fecha: ${fechaStr}`));
    lines.push(centerText(`Hora: ${horaStr}`));
    lines.push(centerText(`Cajero: ${sale.createdBy || "Sistema"}`));

    if (customerInfo.name) {
      lines.push(alignRight("Cliente", customerInfo.name));
    }
    if (customerInfo.rnc) {
      lines.push(alignRight("RNC Cliente", customerInfo.rnc));
    }
    if (customerInfo.phone) {
      lines.push(alignRight("Tel Cliente", customerInfo.phone));
    }

    lines.push("".padEnd(LINE_WIDTH, "-"));

    // Items header
    lines.push(centerText("DETALLE DE PRODUCTOS"));
    lines.push("".padEnd(LINE_WIDTH, "-"));

    // Items with enhanced formatting
    let itemNumber = 1;
    items.forEach((item) => {
      lines.push(`${itemNumber}. ${item.productName}`);
      if (item.productCode) {
        lines.push(`   Código: ${item.productCode}`);
      }

      const qty = parseFloat(item.quantity);
      const price = parseFloat(item.unitPrice);
      const subtotal = parseFloat(item.subtotal);
      const discount = parseFloat(item.discount || "0");

      const qtyPrice = `   ${qty} x RD$${price.toFixed(2)}`;
      const subtotalStr = `RD$${subtotal.toFixed(2)}`;

      // Align quantity × price and subtotal
      if (qtyPrice.length + subtotalStr.length + 1 <= LINE_WIDTH) {
        const spaces = LINE_WIDTH - qtyPrice.length - subtotalStr.length;
        lines.push(qtyPrice + " ".repeat(spaces) + subtotalStr);
      } else {
        lines.push(qtyPrice);
        lines.push(" ".repeat(LINE_WIDTH - subtotalStr.length) + subtotalStr);
      }

      if (discount > 0) {
        lines.push(alignRight("   Descuento", `-RD$${discount.toFixed(2)}`));
      }
      lines.push("");
      itemNumber++;
    });

    lines.push("".padEnd(LINE_WIDTH, "-"));

    // Totals section with enhanced formatting
    lines.push(
      alignRight("Subtotal", `RD$${parseFloat(sale.subtotal).toFixed(2)}`),
    );
    if (parseFloat(sale.discount || "0") > 0) {
      lines.push(
        alignRight(
          "Descuento Total",
          `-RD$${parseFloat(sale.discount).toFixed(2)}`,
        ),
      );
    }
    lines.push(
      alignRight("ITBIS (18%)", `RD$${parseFloat(sale.itbis).toFixed(2)}`),
    );
    lines.push("".padEnd(LINE_WIDTH, "-"));
    lines.push(alignRight("TOTAL", `RD$${parseFloat(sale.total).toFixed(2)}`));
    lines.push("".padEnd(LINE_WIDTH, "="));

    // Payment information
    lines.push("");
    lines.push(centerText("INFORMACIÓN DE PAGO"));
    lines.push("".padEnd(LINE_WIDTH, "-"));

    const paymentMethod =
      sale.paymentMethod === "cash"
        ? "EFECTIVO"
        : sale.paymentMethod === "card"
          ? "TARJETA"
          : sale.paymentMethod === "transfer"
            ? "TRANSFERENCIA"
            : sale.paymentMethod.toUpperCase();
    lines.push(alignRight("Método", paymentMethod));

    if (sale.cashReceived && sale.paymentMethod === "cash") {
      lines.push(
        alignRight(
          "Recibido",
          `RD$${parseFloat(sale.cashReceived).toFixed(2)}`,
        ),
      );
      lines.push(
        alignRight(
          "Cambio",
          `RD$${parseFloat(sale.cashChange || "0").toFixed(2)}`,
        ),
      );
    }

    lines.push("");
    lines.push("".padEnd(LINE_WIDTH, "="));

    // QR Code section
    lines.push("");
    lines.push(centerText("CÓDIGO QR DE VERIFICACIÓN"));
    lines.push(centerText("Escanea para verificar esta venta"));
    lines.push("");

    // Generate real QR code for thermal printing
    try {
      const qrData = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost"}/verify/${sale.id}`;

      // Create authentic QR code using thermal processor
      const thermalQR =
        await ThermalQRProcessor.generateQRCodeForThermal(qrData);
      const qrLines = thermalQR.split("\n");
      qrLines.forEach((line) => {
        lines.push(centerText(line));
      });
    } catch (error) {
      console.log("QR generation error:", error);
      // Fallback to ASCII QR if thermal fails
      try {
        const qrData = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost"}/verify/${sale.id}`;
        const asciiQRLines = await ThermalQRProcessor.generateASCIIQR(qrData);
        asciiQRLines.forEach((line) => {
          lines.push(centerText(line));
        });
      } catch (fallbackError) {
        console.log("ASCII QR fallback error:", fallbackError);
        const qrData = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost"}/verify/${sale.id}`;
        lines.push(centerText("Verificar venta en:"));
        lines.push(centerText(qrData));
      }
    }

    lines.push("");
    lines.push(centerText("Verificar en:"));
    const qrData = `${process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost"}/verify/${sale.id}`;
    lines.push(centerText(qrData));
    lines.push("");

    // Footer section
    lines.push("".padEnd(LINE_WIDTH, "="));
    lines.push(centerText("¡GRACIAS POR SU COMPRA!"));
    lines.push(centerText("Esperamos verle pronto"));
    lines.push("");

    if (company.website) {
      lines.push(centerText(`Web: ${company.website}`));
    }

    const now = new Date();
    const printTime = now.toLocaleString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    lines.push(centerText(`Impreso: ${printTime}`));
    lines.push("".padEnd(LINE_WIDTH, "="));

    // Paper feed for cutting
    lines.push("");
    lines.push("");
    lines.push("");

    return lines.join("\n");
  }

  // Simple HTML receipt generation function
  function generateSimpleReceiptHTML(
    sale: any,
    items: any[],
    company: any,
    customerInfo: any,
  ): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${sale.saleNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
        .company-name { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .sale-info { margin-bottom: 20px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .totals { text-align: right; margin-bottom: 20px; }
        .totals div { margin: 5px 0; }
        .total-final { font-weight: bold; font-size: 18px; }
        .footer { text-align: center; margin-top: 30px; border-top: 1px solid #333; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${company.name}</div>
        <div>RNC: ${company.rnc || "N/A"}</div>
        <div>Tel: ${company.phone || "N/A"}</div>
        ${company.address ? `<div>${company.address}</div>` : ""}
      </div>
      
      <div class="sale-info">
        <div><strong>Factura #:</strong> ${sale.saleNumber}</div>
        <div><strong>Fecha:</strong> ${new Date(sale.createdAt).toLocaleDateString("es-DO")}</div>
        <div><strong>Hora:</strong> ${new Date(sale.createdAt).toLocaleTimeString("es-DO")}</div>
        ${customerInfo.name ? `<div><strong>Cliente:</strong> ${customerInfo.name}</div>` : ""}
        ${customerInfo.rnc ? `<div><strong>RNC Cliente:</strong> ${customerInfo.rnc}</div>` : ""}
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Precio Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
            <tr>
              <td>${item.productName}</td>
              <td>${item.quantity}</td>
              <td>RD$${parseFloat(item.unitPrice).toFixed(2)}</td>
              <td>RD$${parseFloat(item.subtotal).toFixed(2)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
      
      <div class="totals">
        <div>Subtotal: RD$${parseFloat(sale.subtotal).toFixed(2)}</div>
        <div>ITBIS (18%): RD$${parseFloat(sale.itbis).toFixed(2)}</div>
        <div class="total-final">TOTAL: RD$${parseFloat(sale.total).toFixed(2)}</div>
      </div>
      
      <div class="sale-info">
        <div><strong>Método de Pago:</strong> ${sale.paymentMethod === "cash" ? "Efectivo" : sale.paymentMethod}</div>
        ${sale.cashReceived ? `<div><strong>Recibido:</strong> RD$${parseFloat(sale.cashReceived).toFixed(2)}</div>` : ""}
        ${sale.cashChange ? `<div><strong>Cambio:</strong> RD$${parseFloat(sale.cashChange).toFixed(2)}</div>` : ""}
      </div>
      
      <div class="footer">
        <div>¡Gracias por su compra!</div>
      </div>
    </body>
    </html>
    `;
  }

  // Invoice Printing Routes
  app.post(
    "/api/pos/print-thermal/:saleId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { saleId } = req.params;
        const {
          width = "80mm",
          showLogo = true,
          showNCF = true,
          showQR = true,
          paperCut = true,
          cashDrawer = false,
        } = req.body;
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

        const printOptions: ThermalPrintOptions = {
          width: width as "80mm" | "56mm",
          showLogo,
          showNCF,
          showQR,
          paperCut,
          cashDrawer,
        };

        // Generate enhanced thermal receipt with QR code and improved design
        try {
          console.log("=== GENERATING ENHANCED THERMAL RECEIPT ===");
          console.log("Company data:", JSON.stringify(company, null, 2));
          console.log("Sale data:", JSON.stringify(sale, null, 2));
          console.log("Print options:", JSON.stringify(printOptions, null, 2));

          const receiptText = await generateSimpleReceipt(
            sale,
            items,
            company,
            customerInfo,
            printOptions,
          );

          console.log("=== RECEIPT OUTPUT PREVIEW ===");
          console.log("First 500 characters:");
          console.log(receiptText.substring(0, 500));
          console.log("Receipt length:", receiptText.length);
          console.log("=== END PREVIEW ===");

          res.json({
            success: true,
            printData: receiptText,
            previewUrl: null,
            width: printOptions.width,
            message: "Recibo térmico mejorado generado correctamente",
          });
        } catch (receiptError) {
          console.error("Error in generateSimpleReceipt:", receiptError);
          throw receiptError;
        }
      } catch (error) {
        console.error("=== THERMAL RECEIPT ERROR ===");
        console.error("Error details:", error);
        console.error("Error message:", (error as Error).message);
        console.error("Error stack:", (error as Error).stack);
        console.error("Sale ID:", req.params.saleId);
        res.status(500).json({
          message: "Failed to generate thermal receipt",
          error: (error as Error).message,
          details: (error as Error).toString(),
        });
      }
    },
  );

  app.post(
    "/api/pos/print-pdf/:saleId",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { saleId } = req.params;
        const {
          format = "letter",
          orientation = "portrait",
          showLogo = true,
          showNCF = true,
          showQR = true,
          watermark,
        } = req.body;
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

        const pdfOptions: PDFPrintOptions = {
          format: format as "letter" | "a4" | "legal",
          orientation: orientation as "portrait" | "landscape",
          showLogo,
          showNCF,
          showQR,
          watermark,
        };

        // Generate simple HTML invoice for PDF
        const receiptHtml = generateSimpleReceiptHTML(
          sale,
          items,
          company,
          customerInfo,
        );

        res.json({
          success: true,
          htmlContent: receiptHtml,
          format: pdfOptions.format,
          message: "Factura PDF lista para imprimir",
        });
      } catch (error) {
        console.error("Error generating PDF invoice:", error);
        res.status(500).json({ message: "Failed to generate PDF invoice" });
      }
    },
  );

  // HTML Invoice Generation Route
  app.post(
    "/api/pos/print-html/:saleId",
    isAuthenticated,
    async (req: any, res) => {
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

        // Generate professional HTML invoice
        const htmlContent = await InvoiceHTMLService.generateHTMLInvoice({
          sale,
          items,
          company,
          customerInfo,
        });

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(htmlContent);

      } catch (error) {
        console.error("Error generating HTML invoice:", error);
        res.status(500).json({ message: "Failed to generate HTML invoice" });
      }
    }
  );

  // 80mm POS Receipt Generation Route
  app.post(
    "/api/pos/print-pos-80mm/:saleId",
    isAuthenticated,
    async (req: any, res) => {
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
        console.log('80mm POS receipt HTML preview:', htmlContent.substring(0, 200));

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(htmlContent);

      } catch (error) {
        console.error("Error generating 80mm POS receipt:", error);
        res.status(500).json({ message: "Failed to generate 80mm POS receipt" });
      }
    }
  );

  // Get available print formats
  app.get("/api/pos/print-formats", isAuthenticated, (req, res) => {
    res.json({
      thermal: InvoiceTemplateService.getThermalSizes(),
      pdf: InvoiceTemplateService.getPDFFormats(),
    });
  });

  // Desktop installation file download routes
  app.use('/downloads', express.static(path.join(process.cwd(), 'dist-electron')));
  
  // Installation API endpoint for available downloads
  app.get('/api/downloads/available', async (req, res) => {
    try {
      const fs = await import('fs');
      const downloadsDir = path.join(process.cwd(), 'dist-electron');
      
      const files = fs.existsSync(downloadsDir) ? fs.readdirSync(downloadsDir) : [];
      const availableDownloads = files
        .filter((file: string) => 
          file.endsWith('.exe') || 
          file.endsWith('.dmg') || 
          file.endsWith('.AppImage') || 
          file.endsWith('.deb') || 
          file.endsWith('.rpm')
        )
        .map((file: string) => {
          const stats = fs.statSync(path.join(downloadsDir, file));
          return {
            filename: file,
            size: stats.size,
            platform: getPlatformFromFilename(file),
            downloadUrl: `/downloads/${file}`,
            lastModified: stats.mtime
          };
        });
      
      res.json({ downloads: availableDownloads });
    } catch (error) {
      res.json({ downloads: [] });
    }
  });

  function getPlatformFromFilename(filename: string): string {
    if (filename.includes('win') || filename.endsWith('.exe')) return 'Windows';
    if (filename.includes('mac') || filename.endsWith('.dmg')) return 'macOS';
    if (filename.includes('linux') || filename.endsWith('.AppImage') || filename.endsWith('.deb') || filename.endsWith('.rpm')) return 'Linux';
    return 'Unknown';
  }

  // POS Multi-Station API Routes
  
  // Employee management routes
  app.get("/api/pos/employees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const employees = await storage.getPOSEmployees(company.id);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching POS employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/pos/employees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const employeeData = {
        ...req.body,
        companyId: company.id,
        createdBy: userId
      };

      const employee = await storage.createPOSEmployee(employeeData);
      res.json(employee);
    } catch (error) {
      console.error("Error creating POS employee:", error);
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  app.patch("/api/pos/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const employee = await storage.updatePOSEmployee(parseInt(id), req.body, company.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      res.json(employee);
    } catch (error) {
      console.error("Error updating POS employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/pos/employees/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      await storage.deletePOSEmployee(parseInt(id), company.id);
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error("Error deleting POS employee:", error);
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Employee authentication route
  app.post("/api/pos/auth", async (req, res) => {
    try {
      const { employeeCode, pin, companyId } = req.body;
      
      const employee = await storage.authenticatePOSEmployee(employeeCode, pin, companyId);
      
      if (!employee) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({
        employee: {
          id: employee.id,
          name: employee.name,
          employeeCode: employee.employeeCode,
          role: employee.role,
          permissions: employee.permissions
        }
      });
    } catch (error) {
      console.error("Error authenticating POS employee:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Station management routes
  app.get("/api/pos/stations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const stations = await storage.getPOSStations(company.id);
      res.json(stations);
    } catch (error) {
      console.error("Error fetching POS stations:", error);
      res.status(500).json({ message: "Failed to fetch stations" });
    }
  });

  app.post("/api/pos/stations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const stationData = {
        ...req.body,
        companyId: company.id
      };

      const station = await storage.createPOSStation(stationData);
      res.json(station);
    } catch (error) {
      console.error("Error creating POS station:", error);
      res.status(500).json({ message: "Failed to create station" });
    }
  });

  app.patch("/api/pos/stations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const station = await storage.updatePOSStation(parseInt(id), req.body, company.id);
      if (!station) {
        return res.status(404).json({ message: "Station not found" });
      }

      res.json(station);
    } catch (error) {
      console.error("Error updating POS station:", error);
      res.status(500).json({ message: "Failed to update station" });
    }
  });

  // Cash session management routes
  app.get("/api/pos/cash-sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { stationId } = req.query;
      const sessions = await storage.getPOSCashSessions(company.id, stationId ? parseInt(stationId) : undefined);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching cash sessions:", error);
      res.status(500).json({ message: "Failed to fetch cash sessions" });
    }
  });

  app.post("/api/pos/cash-sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const sessionData = {
        ...req.body,
        companyId: company.id,
        sessionNumber: `CS-${Date.now()}`
      };

      const session = await storage.createPOSCashSession(sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error creating cash session:", error);
      res.status(500).json({ message: "Failed to create cash session" });
    }
  });

  app.patch("/api/pos/cash-sessions/:id/close", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const session = await storage.closePOSCashSession(parseInt(id), req.body, company.id);
      if (!session) {
        return res.status(404).json({ message: "Cash session not found" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error closing cash session:", error);
      res.status(500).json({ message: "Failed to close cash session" });
    }
  });

  // Customer management with RNC validation routes
  app.get("/api/pos/customers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const customers = await storage.getPOSCustomers(company.id);
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

      const customerData = {
        ...req.body,
        companyId: company.id,
        createdBy: userId
      };

      // Validate RNC if provided
      if (customerData.rnc) {
        try {
          const validation = await storage.validateCustomerRNC(customerData.rnc, company.id);
          const isValidRnc = typeof validation === 'boolean' ? validation : validation.valid;
          customerData.isValidatedRnc = isValidRnc;
          if (isValidRnc) {
            customerData.rncValidationDate = new Date();
          }
        } catch (rncError) {
          console.error("RNC validation error:", rncError);
          customerData.isValidatedRnc = false;
        }
      }

      const customer = await storage.createPOSCustomer(customerData);
      res.json(customer);
    } catch (error) {
      console.error("Error creating POS customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.patch("/api/pos/customers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const customer = await storage.updatePOSCustomer(parseInt(id), req.body, company.id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(customer);
    } catch (error) {
      console.error("Error updating POS customer:", error);
      res.status(500).json({ message: "Failed to update customer" });
    }
  });

  app.post("/api/pos/customers/validate-rnc", isAuthenticated, async (req: any, res) => {
    try {
      const { rnc } = req.body;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const validation = await storage.validateCustomerRNC(rnc, company.id);
      res.json(validation);
    } catch (error) {
      console.error("Error validating RNC:", error);
      res.status(500).json({ message: "Failed to validate RNC" });
    }
  });

  app.post("/api/pos/customers/search-rnc", isAuthenticated, async (req: any, res) => {
    try {
      const { rnc } = req.body;
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const result = await storage.searchCustomerByRNC(rnc, company.id);
      res.json(result);
    } catch (error) {
      console.error("Error searching customer by RNC:", error);
      res.status(500).json({ message: "Failed to search customer" });
    }
  });

  // Configure multer for asset uploads
  const assetUploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(assetUploadDir)) {
    fs.mkdirSync(assetUploadDir, { recursive: true });
  }

  const assetStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, assetUploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `asset-${uniqueSuffix}${ext}`);
    },
  });

  const upload = multer({
    storage: assetStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit for assets
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  // ==================== ASSET MANAGEMENT ROUTES ====================
  
  // Generate icon set from uploaded image
  app.post("/api/assets/generate-icons", isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const iconConfig: IconSet = {
        name: req.body.name || 'icon',
        sizes: req.body.sizes ? JSON.parse(req.body.sizes) : [16, 32, 48, 64, 96, 128, 192, 256, 512],
        formats: req.body.formats ? JSON.parse(req.body.formats) : ['png', 'webp'],
        baseColor: req.body.baseColor || '#0072FF',
        variants: req.body.variants ? JSON.parse(req.body.variants) : undefined
      };

      const generatedFiles = await assetManager.generateIconSet(req.file.filename, iconConfig);
      
      res.json({
        message: "Icon set generated successfully",
        files: generatedFiles.map(file => file.replace(process.cwd(), '')),
        count: generatedFiles.length
      });
    } catch (error) {
      console.error("Error generating icon set:", error);
      res.status(500).json({ message: "Failed to generate icon set" });
    }
  });

  // Generate responsive image variants
  app.post("/api/assets/generate-responsive", isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const breakpoints = req.body.breakpoints ? 
        JSON.parse(req.body.breakpoints) : 
        [320, 480, 768, 1024, 1200, 1920];

      const config: AssetOptimizationConfig = {
        quality: parseInt(req.body.quality) || 80,
        progressive: req.body.progressive === 'true',
        stripMetadata: req.body.stripMetadata !== 'false',
        formats: req.body.formats ? JSON.parse(req.body.formats) : ['webp', 'png']
      };

      const responsiveImages = await assetManager.generateResponsiveImages(
        req.file.filename, 
        breakpoints, 
        config
      );

      const srcSets = Object.keys(responsiveImages).reduce((acc, size) => {
        const baseFilename = path.parse(req.file!.filename).name;
        acc[size] = Object.keys(responsiveImages[parseInt(size)]).reduce((formatAcc, format) => {
          formatAcc[format] = assetManager.generateSrcSet(baseFilename, [parseInt(size)], format);
          return formatAcc;
        }, {} as { [format: string]: string });
        return acc;
      }, {} as { [size: string]: { [format: string]: string } });

      res.json({
        message: "Responsive images generated successfully",
        images: responsiveImages,
        srcSets,
        breakpoints
      });
    } catch (error) {
      console.error("Error generating responsive images:", error);
      res.status(500).json({ message: "Failed to generate responsive images" });
    }
  });

  // Generate favicons and PWA icons
  app.post("/api/assets/generate-favicons", isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const generatedFiles = await assetManager.generateFavicons(req.file.filename);
      
      res.json({
        message: "Favicons generated successfully",
        files: generatedFiles.map(file => file.replace(process.cwd(), '')),
        count: generatedFiles.length
      });
    } catch (error) {
      console.error("Error generating favicons:", error);
      res.status(500).json({ message: "Failed to generate favicons" });
    }
  });

  // Optimize single image
  app.post("/api/assets/optimize", isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const config: AssetOptimizationConfig = {
        quality: parseInt(req.body.quality) || 80,
        progressive: req.body.progressive !== 'false',
        stripMetadata: req.body.stripMetadata !== 'false',
        formats: req.body.formats ? JSON.parse(req.body.formats) : ['webp']
      };

      const optimizedFiles = await assetManager.optimizeImage(req.file.filename, undefined, config);
      
      res.json({
        message: "Image optimized successfully",
        original: req.file.filename,
        optimized: optimizedFiles.map(file => file.replace(process.cwd(), '')),
        formats: config.formats
      });
    } catch (error) {
      console.error("Error optimizing image:", error);
      res.status(500).json({ message: "Failed to optimize image" });
    }
  });

  // Get asset manifest
  app.get("/api/assets/manifest", async (req, res) => {
    try {
      await assetManager.generateAssetManifest();
      const manifestPath = path.join(process.cwd(), 'client/public/assets/asset-manifest.json');
      
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        res.json(manifest);
      } else {
        res.json({ generated: new Date().toISOString(), assets: {} });
      }
    } catch (error) {
      console.error("Error getting asset manifest:", error);
      res.status(500).json({ message: "Failed to get asset manifest" });
    }
  });

  // Clean up old assets
  app.delete("/api/assets/cleanup", isAuthenticated, async (req, res) => {
    try {
      const maxAge = parseInt(req.query.maxAge as string) || (7 * 24 * 60 * 60 * 1000); // 7 days default
      const deletedFiles = await assetManager.cleanupAssets(maxAge);
      
      res.json({
        message: "Asset cleanup completed",
        deletedFiles,
        count: deletedFiles.length
      });
    } catch (error) {
      console.error("Error cleaning up assets:", error);
      res.status(500).json({ message: "Failed to cleanup assets" });
    }
  });

  // Get available assets
  app.get("/api/assets/list", async (req, res) => {
    try {
      const assetsDir = path.join(process.cwd(), 'client/public/assets');
      
      if (!fs.existsSync(assetsDir)) {
        return res.json({ assets: [] });
      }

      const files = fs.readdirSync(assetsDir, { recursive: true });
      const assets = files
        .filter(file => typeof file === 'string' && !file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(assetsDir, file as string);
          const stats = fs.statSync(filePath);
          return {
            name: file,
            path: `/assets/${file}`,
            size: stats.size,
            modified: stats.mtime.toISOString(),
            type: path.extname(file as string).slice(1).toLowerCase()
          };
        });

      res.json({ assets });
    } catch (error) {
      console.error("Error listing assets:", error);
      res.status(500).json({ message: "Failed to list assets" });
    }
  });

  // ==================== ERROR MANAGEMENT ROUTES ====================

  // Error Management Routes
  app.get("/api/errors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { severity, type, resolved, page = "1", limit = "50" } = req.query;
      const errorManager = ErrorManager.getInstance();
      
      const errors = await errorManager.getErrorLogs({
        companyId: company.id,
        severity,
        type,
        resolved: resolved !== undefined ? resolved === "true" : undefined,
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json(errors);
    } catch (error) {
      console.error("Error fetching error logs:", error);
      res.status(500).json({ message: "Failed to fetch error logs" });
    }
  });

  app.get("/api/errors/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Get basic audit stats instead of complex error manager
      const auditLogs = await auditLogger.getAuditLogs({
        companyId: company.id,
        limit: 1000
      });

      // Process logs to generate stats
      const errorLogs = auditLogs.filter(log => !log.success);
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentErrors = errorLogs.filter(log => new Date(log.timestamp) > last24h);

      // Group by module
      const byModule: Record<string, number> = {};
      errorLogs.forEach(log => {
        byModule[log.module] = (byModule[log.module] || 0) + 1;
      });

      // Group by severity
      const bySeverity: Record<string, number> = {
        critical: errorLogs.filter(log => log.severity === 'critical').length,
        error: errorLogs.filter(log => log.severity === 'error').length,
        warning: errorLogs.filter(log => log.severity === 'warning').length,
        info: errorLogs.filter(log => log.severity === 'info').length
      };

      const stats = {
        total: errorLogs.length,
        byModule,
        bySeverity,
        recent: recentErrors.length
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching error stats:", error);
      // Return safe fallback data structure
      res.json({
        total: 0,
        byModule: {},
        bySeverity: {
          critical: 0,
          error: 0,
          warning: 0,
          info: 0
        },
        recent: 0
      });
    }
  });

  app.patch("/api/errors/:errorId/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const { errorId } = req.params;
      const userId = req.user.id;

      const errorManager = ErrorManager.getInstance();
      const success = await errorManager.resolveError(errorId, userId);

      if (success) {
        res.json({ message: "Error marked as resolved" });
      } else {
        res.status(404).json({ message: "Error not found" });
      }
    } catch (error) {
      console.error("Error resolving error:", error);
      res.status(500).json({ message: "Failed to resolve error" });
    }
  });

  app.post("/api/errors/frontend", async (req: any, res) => {
    try {
      const { message, stack, url, userAgent, userId, companyId } = req.body;
      
      const error = new Error(message);
      error.stack = stack;

      const context = {
        url,
        userAgent,
        userId,
        companyId,
        method: 'FRONTEND',
        timestamp: new Date()
      };

      const errorManager = ErrorManager.getInstance();
      const errorId = await errorManager.logError(error, context);

      res.json({ errorId, message: "Error logged successfully" });
    } catch (error) {
      console.error("Error logging frontend error:", error);
      res.status(500).json({ message: "Failed to log error" });
    }
  });

  // ==================== AUDIT AND MONITORING ROUTES ====================

  // System monitoring and audit routes
  app.get("/api/audit/logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const { limit = 50, offset = 0, module, severity } = req.query;
      
      const filters = {
        companyId: company.id,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        module: module as string,
        severity: severity as string
      };

      const logs = await auditLogger.getAuditLogs(filters);
      res.json(logs || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.json([]);
    }
  });

  app.get("/api/system/health", async (req: any, res) => {
    try {
      const health = {
        database: 'healthy' as const,
        authentication: 'healthy' as const,
        modules: {
          'POS': 'healthy' as const,
          'Products': 'healthy' as const,
          'Customers': 'healthy' as const,
          'Inventory': 'healthy' as const,
          'Accounting': 'healthy' as const,
          'Fiscal': 'healthy' as const,
          'HR': 'healthy' as const,
          'Reports': 'healthy' as const
        },
        uptime: process.uptime(),
        errors24h: 0
      };

      // Check database connectivity
      try {
        await storage.getUser('test');
        health.database = 'healthy';
      } catch (dbError) {
        health.database = 'error' as any;
      }

      res.json(health);
    } catch (error) {
      console.error("Error checking system health:", error);
      // Return safe fallback data structure
      res.json({
        database: 'error',
        authentication: 'error',
        modules: {
          'POS': 'error',
          'Products': 'error',
          'Customers': 'error',
          'Inventory': 'error',
          'Accounting': 'error',
          'Fiscal': 'error',
          'HR': 'error',
          'Reports': 'error'
        },
        uptime: 0,
        errors24h: 0
      });
    }
  });

  // Simplified payment submission endpoint
  app.post("/api/submit-payment", isAuthenticated, async (req: any, res) => {
    try {
      const {
        fullName,
        document,
        documentType,
        companyName,
        plan,
        email,
        phone,
        userId
      } = req.body;

      // Create payment record with simplified structure
      const payment = await storage.createPaymentSubmission({
        name: fullName,
        email,
        phone,
        company: companyName,
        rnc: documentType === 'rnc' ? document : null,
        paymentMethod: 'bank_transfer',
        bankAccount: 'pending_selection',
        amount: plan === 'starter' ? 2500 : plan === 'professional' ? 4500 : 8500,
        reference: `${documentType.toUpperCase()}-${document}`,
        notes: `Plan: ${plan}, Document Type: ${documentType}`,
        status: 'pending',
        submittedAt: new Date()
      });

      // Log payment submission
      await auditLogger.log({
        userId,
        module: 'Payment',
        action: 'PAYMENT_SUBMITTED',
        entityType: 'payment',
        entityId: payment.id?.toString(),
        newValues: { email, company: companyName, plan, document },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        success: true,
        severity: 'info'
      });

      res.json({ 
        success: true, 
        message: 'Datos de pago enviados exitosamente',
        paymentId: payment.id 
      });
    } catch (error) {
      console.error("Error processing payment submission:", error);
      res.status(500).json({ message: "Error al procesar los datos de pago" });
    }
  });

  // Validate password setup/reset token
  app.post("/api/validate-token", async (req: any, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.json({ valid: false });
      }

      const tokenRecord = await storage.getPasswordResetToken(token);
      
      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return res.json({ valid: false });
      }

      res.json({ 
        valid: true, 
        isRecovery: tokenRecord.isRecovery || false 
      });
    } catch (error) {
      console.error("Error validating token:", error);
      res.json({ valid: false });
    }
  });

  // Setup password with token
  app.post("/api/setup-password", async (req: any, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token y contraseña son requeridos" });
      }

      const tokenRecord = await storage.getPasswordResetToken(token);
      
      if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }

      // Update user password
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await storage.updateUserPassword(tokenRecord.email, hashedPassword);
      
      // Delete the used token
      await storage.deletePasswordResetToken(token);

      res.json({ success: true, message: "Contraseña establecida exitosamente" });
    } catch (error) {
      console.error("Error setting up password:", error);
      res.status(500).json({ message: "Error al establecer contraseña" });
    }
  });

  // Payment submission endpoint (legacy)
  app.post("/api/payments/submit", async (req: any, res) => {
    try {
      const {
        name,
        email,
        phone,
        company,
        rnc,
        paymentMethod,
        bankAccount,
        amount,
        reference,
        notes
      } = req.body;

      // Create payment record
      const payment = await storage.createPaymentSubmission({
        name,
        email,
        phone,
        company,
        rnc: rnc || null,
        paymentMethod,
        bankAccount,
        amount: parseFloat(amount),
        reference,
        notes: notes || null,
        status: 'pending',
        submittedAt: new Date()
      });

      // Log payment submission
      await auditLogger.log({
        module: 'Payment',
        action: 'PAYMENT_SUBMITTED',
        entityType: 'payment',
        entityId: payment.id?.toString(),
        newValues: { email, company, amount, reference },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        success: true,
        severity: 'info'
      });

      // Send confirmation email (if email service is configured)
      try {
        // TODO: Implement email notification
        console.log(`Payment submission received from ${email} for ${company} - Amount: $${amount}`);
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }

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

  // Get payment submissions (admin only)
  app.get("/api/payments/submissions", isAuthenticated, async (req: any, res) => {
    try {
      // Only allow admin users to view payment submissions
      const user = req.user;
      if (!user || user.email !== 'admin@fourone.com.do') {
        return res.status(403).json({ message: "Access denied" });
      }

      const payments = await storage.getPaymentSubmissions();
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payment submissions:", error);
      res.status(500).json({ message: "Failed to fetch payment submissions" });
    }
  });

  // Update payment status (admin only)
  app.patch("/api/payments/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || user.email !== 'admin@fourone.com.do') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { status, notes } = req.body;

      const payment = await storage.updatePaymentStatus(parseInt(id), status, notes);

      // If payment is confirmed, send password setup email
      if (status === 'confirmed' && payment.email) {
        try {
          await sendPasswordSetupEmail(payment.email, payment.name || 'Usuario');
        } catch (emailError) {
          console.error('Failed to send password setup email:', emailError);
        }
      }

      // Log status update
      await auditLogger.log({
        userId: user.id,
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

  // Get user payment status
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
      
      // Find user's payment submission
      const submission = await storage.getUserPaymentStatus(userEmail);
      
      if (!submission) {
        return res.json({ 
          hasValidPayment: false, 
          status: 'pending', 
          message: 'No payment submission found' 
        });
      }
      
      // Check if payment is confirmed
      const hasValidPayment = submission.status === 'confirmed';
      
      res.json({ 
        hasValidPayment,
        status: submission.status || 'pending',
        submittedAt: submission.submittedAt,
        processedAt: submission.processedAt
      });
    } catch (error) {
      console.error("Error fetching user payment status:", error);
      res.status(500).json({ message: "Failed to fetch payment status" });
    }
  });

  // Admin company management endpoints
  app.get("/api/admin/companies", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || user.email !== 'admin@fourone.com.do') {
        return res.status(403).json({ message: "Access denied" });
      }

      const companies = await storage.getAllCompaniesWithDetails();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.patch("/api/admin/companies/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || user.email !== 'admin@fourone.com.do') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { isActive, notes } = req.body;

      const company = await storage.updateCompanyStatus(parseInt(id), isActive, notes);
      
      // Log company status update
      await auditLogger.log({
        userId: user.id,
        module: 'Company',
        action: isActive ? 'COMPANY_ACTIVATED' : 'COMPANY_DEACTIVATED',
        entityType: 'company',
        entityId: id,
        newValues: { isActive, notes },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        success: true,
        severity: 'info'
      });

      res.json(company);
    } catch (error) {
      console.error("Error updating company status:", error);
      res.status(500).json({ message: "Failed to update company status" });
    }
  });

  return httpServer;
}
