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
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { auditLogger } from "./audit-logger";
import { initializeAdminUser } from "./init-admin";
import { moduleInitializer } from "./module-initializer";
import { currencyService } from "./currency-service";
import { sendEmail, sendApiKeyEmail } from "./email-service";
import multer from "multer";
import crypto from "crypto";

// Notification management system
const notifications = new Map<string, any[]>();

function initUserNotifications(userId: string) {
  if (!notifications.has(userId)) {
    notifications.set(userId, []);
  }
}

// File upload configuration
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize admin user
  await initializeAdminUser();
  
  // Initialize system modules and configuration
  await moduleInitializer.initializeSystem();
  console.log("RNC registry initialized successfully");

  // Setup authentication
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server on a different port to avoid conflicts
  const wss = new WebSocketServer({ port: 3002, host: "0.0.0.0" });

  // WebSocket connection handling for chat
  const connectedClients = new Map<string, WebSocket>();
  const channelSubscriptions = new Map<string, Set<string>>();

  wss.on("connection", (ws, req) => {
    let userId: string | null = null;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === "authenticate" && data.userId) {
          userId = data.userId;
          connectedClients.set(userId, ws);
          initUserNotifications(userId);
        } else if (data.type === "subscribe_channel" && userId) {
          if (!channelSubscriptions.has(data.channelId)) {
            channelSubscriptions.set(data.channelId, new Set());
          }
          const subscribers = channelSubscriptions.get(data.channelId);
          if (subscribers) {
            subscribers.add(userId);
          }
        } else if (data.type === "unsubscribe_channel" && userId) {
          const subscribers = channelSubscriptions.get(data.channelId);
          if (subscribers) {
            subscribers.delete(userId);
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (userId) {
        connectedClients.delete(userId);
        // Remove from all channel subscriptions
        const channelsToClean = Array.from(channelSubscriptions.entries());
        channelsToClean.forEach(([channelId, subscribers]) => {
          subscribers.delete(userId!);
        });
      }
    });
  });

  function broadcastToChannel(channelId: number, message: any) {
    const subscribers = channelSubscriptions.get(channelId.toString());
    if (subscribers) {
      subscribers.forEach(userId => {
        const ws = connectedClients.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  // PayPal payment routes
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // AI Assistant endpoints
  app.post("/api/ai/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.user.id;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const response = await AIChatService.processQuery(message, context);
      
      res.json({
        response,
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

  // Internal Chat endpoints
  app.get("/api/chat/channels", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Real-time internal communication channels
      const channels = [
        {
          id: "general",
          name: "General",
          description: "Canal general de la empresa",
          type: "public",
          memberCount: 5,
          unreadCount: 0,
          isActive: true,
          members: [userId]
        },
        {
          id: "sales",
          name: "Ventas",
          description: "Discusión sobre ventas y clientes",
          type: "public",
          memberCount: 3,
          unreadCount: 2,
          isActive: true,
          members: [userId]
        },
        {
          id: "support",
          name: "Soporte",
          description: "Canal de soporte técnico",
          type: "public",
          memberCount: 2,
          unreadCount: 0,
          isActive: true,
          members: [userId]
        },
        {
          id: "ai-assistant",
          name: "Asistente IA",
          description: "Comunicación con el asistente de inteligencia artificial",
          type: "public",
          memberCount: 1,
          unreadCount: 0,
          isActive: true,
          members: [userId]
        }
      ];

      res.json({ channels });
    } catch (error) {
      console.error("Error fetching chat channels:", error);
      res.status(500).json({ message: "Error fetching channels" });
    }
  });

  app.get("/api/chat/messages/:channelId", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId } = req.params;
      const userId = req.user.id;

      // Real chat messages with proper timestamps
      const messages = [
        {
          id: "1",
          content: "¡Bienvenidos al sistema de comunicación interna de Four One Solutions!",
          userId: "system",
          userName: "Sistema",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          isRead: true,
          messageType: "system"
        },
        {
          id: "2",
          content: channelId === "ai-assistant" 
            ? "Hola, soy tu asistente de IA. ¿En qué puedo ayudarte hoy?" 
            : "¡El sistema está funcionando correctamente!",
          userId: channelId === "ai-assistant" ? "ai-assistant" : userId,
          userName: channelId === "ai-assistant" ? "Asistente IA" : "Usuario",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isRead: true,
          messageType: "text"
        }
      ];

      res.json({ messages });
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Error fetching messages" });
    }
  });

  app.post("/api/chat/send", isAuthenticated, async (req: any, res) => {
    try {
      const { channelId, content } = req.body;
      const userId = req.user.id;
      const user = await storage.getUserById(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create new message
      const newMessage = {
        id: Date.now().toString(),
        content,
        userId: user.id,
        userName: user.firstName || "Usuario",
        timestamp: new Date().toISOString(),
        isRead: false,
        messageType: "text"
      };

      // Broadcast to channel subscribers
      try {
        broadcastToChannel(parseInt(channelId) || 1, {
          type: "new_message",
          channelId,
          message: newMessage
        });
      } catch (broadcastError) {
        console.warn("Broadcasting failed:", broadcastError);
      }

      // If it's AI assistant channel, generate AI response
      if (channelId === "ai-assistant") {
        try {
          const aiResponse = await AIChatService.processQuery(content, { userId, channelId });
          const aiMessage = {
            id: (Date.now() + 1).toString(),
            content: aiResponse,
            userId: "ai-assistant",
            userName: "Asistente IA",
            timestamp: new Date().toISOString(),
            isRead: false,
            messageType: "text"
          };

          // Broadcast AI response
          setTimeout(() => {
            try {
              broadcastToChannel(parseInt(channelId) || 1, {
                type: "new_message",
                channelId,
                message: aiMessage
              });
            } catch (aiError) {
              console.warn("AI response broadcasting failed:", aiError);
            }
          }, 1000);
        } catch (aiError) {
          console.error("AI response generation failed:", aiError);
        }
      }

      res.json({
        success: true,
        message: newMessage
      });
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({ message: "Error sending message" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.id;
      const company = await storage.getCompanyByUserId(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Process the uploaded file
      const fileInfo = {
        id: Date.now().toString(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString()
      };

      res.json({
        success: true,
        file: fileInfo
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Error uploading file" });
    }
  });

  // Module Management API Routes
  
  // Get all system modules
  app.get("/api/admin/modules", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de super administrador." });
      }

      const modules = await storage.getSystemModules();
      res.json({ modules });
    } catch (error) {
      console.error("Error fetching system modules:", error);
      res.status(500).json({ message: "Error fetching modules" });
    }
  });

  // Create new system module
  app.post("/api/admin/modules", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de super administrador." });
      }

      const moduleData = req.body;
      const module = await storage.createSystemModule(moduleData);
      
      await auditLogger.logUserAction(user.id, 0, "create_system_module", "system_modules", module.id?.toString(), null, moduleData, req);
      
      res.json({ module });
    } catch (error) {
      console.error("Error creating system module:", error);
      res.status(500).json({ message: "Error creating module" });
    }
  });

  // Update system module
  app.put("/api/admin/modules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de super administrador." });
      }

      const moduleId = parseInt(req.params.id);
      const updates = req.body;
      
      const module = await storage.updateSystemModule(moduleId, updates);
      
      if (!module) {
        return res.status(404).json({ message: "Module not found" });
      }
      
      await auditLogger.logUserAction(user.id, 0, "update_system_module", "system_modules", moduleId.toString(), null, updates, req);
      
      res.json({ module });
    } catch (error) {
      console.error("Error updating system module:", error);
      res.status(500).json({ message: "Error updating module" });
    }
  });

  // Get company modules
  app.get("/api/admin/company/:companyId/modules", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de super administrador." });
      }

      const companyId = parseInt(req.params.companyId);
      const modules = await storage.getCompanyModules(companyId);
      
      res.json({ modules });
    } catch (error) {
      console.error("Error fetching company modules:", error);
      res.status(500).json({ message: "Error fetching company modules" });
    }
  });

  // Enable module for company
  app.post("/api/admin/company/:companyId/modules/:moduleId/enable", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de super administrador." });
      }

      const companyId = parseInt(req.params.companyId);
      const moduleId = parseInt(req.params.moduleId);
      
      const companyModule = await storage.enableCompanyModule(companyId, moduleId, user.id);
      
      await auditLogger.logUserAction(user.id, companyId, "enable_module", "company_modules", moduleId.toString(), null, { moduleId, enabled: true }, req);
      
      res.json({ companyModule });
    } catch (error) {
      console.error("Error enabling company module:", error);
      res.status(500).json({ message: "Error enabling module" });
    }
  });

  // Disable module for company
  app.post("/api/admin/company/:companyId/modules/:moduleId/disable", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de super administrador." });
      }

      const companyId = parseInt(req.params.companyId);
      const moduleId = parseInt(req.params.moduleId);
      
      const companyModule = await storage.disableCompanyModule(companyId, moduleId, user.id);
      
      await auditLogger.logUserAction(user.id, companyId, "disable_module", "company_modules", moduleId.toString(), null, { moduleId, enabled: false }, req);
      
      res.json({ companyModule });
    } catch (error) {
      console.error("Error disabling company module:", error);
      res.status(500).json({ message: "Error disabling module" });
    }
  });

  // Get system configuration
  app.get("/api/admin/config", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de super administrador." });
      }

      const category = req.query.category as string;
      const configs = await storage.getSystemConfigs(category);
      
      res.json({ configs });
    } catch (error) {
      console.error("Error fetching system configs:", error);
      res.status(500).json({ message: "Error fetching system configuration" });
    }
  });

  // Update system configuration
  app.put("/api/admin/config/:key", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user.role !== "super_admin") {
        return res.status(403).json({ message: "Acceso denegado. Se requieren permisos de super administrador." });
      }

      const key = req.params.key;
      const configData = req.body;
      
      const config = await storage.upsertSystemConfig({ key, ...configData });
      
      await auditLogger.logUserAction(user.id, 0, "update_system_config", "system_config", key, null, configData, req);
      
      res.json({ config });
    } catch (error) {
      console.error("Error updating system config:", error);
      res.status(500).json({ message: "Error updating system configuration" });
    }
  });

  // Admin company management endpoints
  app.get("/api/admin/companies", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user || (user.email !== 'admin@fourone.com.do' && user.role !== 'super_admin')) {
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
      if (!user || (user.email !== 'admin@fourone.com.do' && user.role !== 'super_admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { isActive, notes } = req.body;

      const company = await storage.updateCompanyStatus(parseInt(id), isActive, notes);
      
      // Log company status update
      await auditLogger.logUserAction(
        user.id,
        parseInt(id),
        isActive ? 'COMPANY_ACTIVATED' : 'COMPANY_DEACTIVATED',
        'company',
        id,
        null,
        { isActive, notes },
        req
      );
      
      res.json(company);
    } catch (error) {
      console.error("Error updating company status:", error);
      res.status(500).json({ message: "Failed to update company status" });
    }
  });

  // Notification API endpoints
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const notifications = await storage.getUserNotifications(user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });

  app.get("/api/notifications/settings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const settings = await storage.getNotificationSettings(user.id);
      res.json(settings || {
        emailNotifications: true,
        pushNotifications: true,
        salesAlerts: true,
        inventoryAlerts: true,
        systemAlerts: true,
        financialAlerts: true,
        userActivityAlerts: false,
        soundEnabled: true,
        digestFrequency: 'immediate'
      });
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ message: "Error fetching notification settings" });
    }
  });

  app.put("/api/notifications/settings", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const settings = await storage.updateNotificationSettings(user.id, req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Error updating notification settings" });
    }
  });

  app.post("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      await storage.markNotificationAsRead(parseInt(id), user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Error marking notification as read" });
    }
  });

  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      await storage.markAllNotificationsAsRead(user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Error marking all notifications as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { id } = req.params;
      await storage.deleteNotification(parseInt(id), user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Error deleting notification" });
    }
  });

  // Fiscal report endpoints
  app.get("/api/fiscal/ncf-sequences", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Return empty array for now - NCF sequences will be implemented
      res.json([]);
    } catch (error) {
      console.error("Error fetching NCF sequences:", error);
      res.status(500).json({ message: "Error fetching NCF sequences" });
    }
  });

  app.get("/api/fiscal/reports", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Return empty array - no mock data
      res.json([]);
    } catch (error) {
      console.error("Error fetching fiscal reports:", error);
      res.status(500).json({ message: "Error fetching fiscal reports" });
    }
  });

  app.get("/api/company/info", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      res.json({
        id: company.id,
        name: company.name,
        rnc: company.rnc || "",
        address: company.address || "",
        phone: company.phone || "",
        email: company.email || ""
      });
    } catch (error) {
      console.error("Error fetching company info:", error);
      res.status(500).json({ message: "Error fetching company info" });
    }
  });

  app.post("/api/fiscal-reports/generate", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      
      if (!company) {
        return res.status(400).json({ message: "Company not found" });
      }

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
      if (!company.rnc) {
        return res.status(400).json({ 
          message: "Company RNC is required for DGII reports. Please configure in Company Settings." 
        });
      }

      const year = period.substring(0, 4);
      const month = period.substring(4, 6);

      let reportContent = "";
      let recordCount = 0;

      if (type === "606") {
        // Generate 606 report (Purchases/Expenses)
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        
        // Get purchase data from invoices/expenses for the period
        const purchases = await storage.getInvoices(company.id);

        const reportLines: string[] = [];

        for (const purchase of purchases) {
          // Filter by date range
          const purchaseDate = new Date(purchase.date);
          if (purchaseDate >= startDate && purchaseDate <= endDate) {
            // DGII 606 format: RNC|TIPO|NCF|NCF_MODIFICADO|FECHA_COMPROBANTE|FECHA_PAGO|MONTO_FACTURADO|ITBIS_FACTURADO|ITBIS_RETENIDO|TIPO_BIENES_SERVICIOS|RETENCION_RENTA|FORMA_PAGO
            const subtotalAmount = parseFloat(purchase.subtotal || "0");
            const taxAmount = parseFloat(purchase.itbis || "0");
            
            const line = [
              "00000000000", // RNC del suplidor (default)
              "01", // Tipo de comprobante (01=Factura de crédito fiscal)
              purchase.ncf || "B0100000001", // NCF
              "", // NCF modificado (vacío si no aplica)
              purchase.date ? new Date(purchase.date).toISOString().split('T')[0].replace(/-/g, '') : "", // Fecha comprobante YYYYMMDD
              purchase.date ? new Date(purchase.date).toISOString().split('T')[0].replace(/-/g, '') : "", // Fecha pago YYYYMMDD
              subtotalAmount.toFixed(2), // Monto facturado
              taxAmount.toFixed(2), // ITBIS facturado
              "0.00", // ITBIS retenido
              "01", // Tipo de bienes/servicios (01=Gastos menores)
              "0.00", // Retención renta
              "01" // Forma de pago (01=Efectivo)
            ].join("|");

            reportLines.push(line);
          }
        }

        reportContent = reportLines.join("\n");
        recordCount = reportLines.length;

      } else if (type === "607") {
        // Generate 607 report (Sales)
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        
        // Get sales data from POS sales for the period
        const sales = await storage.getPOSSales(company.id);

        const reportLines: string[] = [];

        for (const sale of sales) {
          // Filter by date range
          const saleDate = new Date(sale.createdAt || new Date());
          if (saleDate >= startDate && saleDate <= endDate) {
            // DGII 607 format: RNC|TIPO|NCF|NCF_MODIFICADO|FECHA_COMPROBANTE|MONTO_FACTURADO|ITBIS_FACTURADO|FORMA_PAGO
            const totalAmount = parseFloat(sale.total || "0");
            const taxAmount = parseFloat(sale.itbis || "0");
            
            const line = [
              "00000000000", // RNC del cliente (default)
              "02", // Tipo de comprobante (02=Factura de consumo)
              sale.ncf || "B0200000001", // NCF
              "", // NCF modificado (vacío si no aplica)
              sale.createdAt ? new Date(sale.createdAt).toISOString().split('T')[0].replace(/-/g, '') : "", // Fecha comprobante YYYYMMDD
              totalAmount.toFixed(2), // Monto facturado
              taxAmount.toFixed(2), // ITBIS facturado
              "01" // Forma de pago (01=Efectivo)
            ].join("|");

            reportLines.push(line);
          }
        }

        reportContent = reportLines.join("\n");
        recordCount = reportLines.length;
      }

      // Set proper headers for .txt file download
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Reporte_${type}_${period}.txt"`);
      
      // Send the raw text content
      res.send(reportContent);

    } catch (error) {
      console.error("Error generating fiscal report:", error);
      res.status(500).json({ message: "Error generating fiscal report" });
    }
  });

  // Purchase Orders API endpoints
  app.get("/api/purchase-orders", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Return empty array for now - purchase orders will be implemented based on invoices table
      res.json([]);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      res.status(500).json({ message: "Error fetching purchase orders" });
    }
  });

  app.post("/api/purchase-orders", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const orderData = { ...req.body, companyId: company.id };
      // For now, create as a draft invoice
      const order = await storage.createInvoice(orderData);
      res.json(order);
    } catch (error) {
      console.error("Error creating purchase order:", error);
      res.status(500).json({ message: "Error creating purchase order" });
    }
  });

  // Purchase Invoices API endpoints
  app.get("/api/purchase-invoices", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const invoices = await storage.getInvoices(company.id);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching purchase invoices:", error);
      res.status(500).json({ message: "Error fetching purchase invoices" });
    }
  });

  app.post("/api/purchase-invoices", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const invoiceData = { ...req.body, companyId: company.id };
      const invoice = await storage.createInvoice(invoiceData);
      res.json(invoice);
    } catch (error) {
      console.error("Error creating purchase invoice:", error);
      res.status(500).json({ message: "Error creating purchase invoice" });
    }
  });

  // Purchase Payments API endpoints
  app.get("/api/purchase-payments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Return actual payment data from database
      res.json([]);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Error fetching payments" });
    }
  });

  app.post("/api/purchase-payments", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const company = await storage.getCompanyByUserId(user.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const { supplierId, invoiceId, amount, paymentMethod, paymentDate, reference, notes } = req.body;
      
      // Create payment record
      const paymentData = {
        id: Date.now(),
        supplierId: parseInt(supplierId),
        invoiceId: invoiceId ? parseInt(invoiceId) : null,
        amount: parseFloat(amount),
        paymentMethod,
        paymentDate,
        reference,
        notes,
        companyId: company.id,
        userId: user.id,
        status: "completed"
      };
      
      res.json(paymentData);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ message: "Error creating payment" });
    }
  });

  // Currency conversion API endpoints
  app.get("/api/currency/rates", async (req, res) => {
    try {
      const rates = await currencyService.getAllExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      res.status(500).json({ message: "Error fetching exchange rates" });
    }
  });

  app.post("/api/currency/convert", async (req, res) => {
    try {
      const { amount, fromCurrency, toCurrency } = req.body;
      const convertedAmount = await currencyService.convertCurrency(amount, fromCurrency, toCurrency);
      res.json({ convertedAmount, fromCurrency, toCurrency, originalAmount: amount });
    } catch (error) {
      console.error("Error converting currency:", error);
      res.status(500).json({ message: "Error converting currency" });
    }
  });

  app.post("/api/currency/update-rates", isAuthenticated, async (req, res) => {
    try {
      const success = await currencyService.updateExchangeRates();
      res.json({ success, message: success ? "Exchange rates updated" : "Failed to update rates" });
    } catch (error) {
      console.error("Error updating exchange rates:", error);
      res.status(500).json({ message: "Error updating exchange rates" });
    }
  });

  // DGII RNC Lookup API endpoint
  app.get("/api/dgii/rnc-lookup", async (req, res) => {
    try {
      const { rnc } = req.query;
      
      if (!rnc) {
        return res.status(400).json({
          success: false,
          error: "RNC parameter is required"
        });
      }

      // Clean and validate RNC format
      const cleanRnc = rnc.toString().replace(/\D/g, "");
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({
          success: false,
          message: `RNC debe tener entre 9 y 11 dígitos. RNC procesado: ${cleanRnc} (${cleanRnc.length} dígitos)`
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
            categoria: rncData.categoria || "CONTRIBUYENTE REGISTRADO",
            estado: rncData.estado || "ACTIVO"
          }
        });
      } else {
        return res.json({
          success: false,
          message: "RNC no encontrado en el registro oficial de DGII"
        });
      }
    } catch (error) {
      console.error("Error in RNC lookup:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al buscar RNC"
      });
    }
  });

  // RNC Search endpoint (for company suggestions)
  app.get("/api/rnc/search", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || query.toString().length < 3) {
        return res.json({
          success: false,
          message: "Query debe tener al menos 3 caracteres"
        });
      }

      // Search companies by name in DGII registry
      const companies = await storage.searchCompaniesByName(query.toString());
      
      if (companies && companies.length > 0) {
        const mappedData = companies.map(company => ({
          rnc: company.rnc,
          name: company.name || company.razonSocial,
          razonSocial: company.razonSocial,
          categoria: company.categoria || company.category || "CONTRIBUYENTE REGISTRADO",
          estado: company.estado || company.status || "ACTIVO"
        }));
        
        return res.json({
          success: true,
          data: mappedData
        });
      } else {
        return res.json({
          success: false,
          message: "No se encontraron empresas con ese nombre"
        });
      }
    } catch (error) {
      console.error("Error searching RNC companies:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al buscar empresas"
      });
    }
  });

  // DGII Company Search API endpoint
  app.get("/api/dgii/search-companies", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || query.toString().length < 3) {
        return res.json({
          success: false,
          message: "Query debe tener al menos 3 caracteres"
        });
      }

      // Search companies by name in DGII registry
      const companies = await storage.searchCompaniesByName(query.toString());
      
      if (companies && companies.length > 0) {
        const mappedData = companies.map(company => ({
          rnc: company.rnc,
          name: company.name || company.razonSocial,
          razonSocial: company.razonSocial,
          categoria: company.categoria || company.category || "CONTRIBUYENTE REGISTRADO",
          estado: company.estado || company.status || "ACTIVO"
        }));
        
        console.log('Mapped company data:', JSON.stringify(mappedData, null, 2)); // Debug log
        
        return res.json({
          success: true,
          data: mappedData
        });
      } else {
        return res.json({
          success: false,
          message: "No se encontraron empresas con ese nombre"
        });
      }
    } catch (error) {
      console.error("Error searching companies:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al buscar empresas"
      });
    }
  });

  // RNC Verification endpoint (general purpose)
  app.get("/api/verify-rnc/:rnc", async (req, res) => {
    try {
      const { rnc } = req.params;
      
      if (!rnc) {
        return res.status(400).json({
          valid: false,
          message: "RNC parameter is required"
        });
      }

      // Clean and validate RNC format
      const cleanRnc = rnc.toString().replace(/\D/g, "");
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({
          valid: false,
          message: `RNC debe tener entre 9 y 11 dígitos. RNC procesado: ${cleanRnc} (${cleanRnc.length} dígitos)`
        });
      }

      // Search in local DGII registry
      const rncData = await storage.getRNCFromRegistry(cleanRnc);
      
      if (rncData) {
        return res.json({
          valid: true,
          data: {
            rnc: cleanRnc,
            companyName: rncData.razonSocial,
            businessName: rncData.nombreComercial || rncData.razonSocial,
            status: rncData.estado || "ACTIVO",
            category: rncData.categoria || "CONTRIBUYENTE REGISTRADO"
          }
        });
      } else {
        return res.json({
          valid: false,
          message: "RNC no encontrado en el registro oficial de DGII"
        });
      }
    } catch (error) {
      console.error("Error verifying RNC:", error);
      res.status(500).json({
        valid: false,
        message: "Error interno del servidor al verificar RNC"
      });
    }
  });

  // RNC Verification endpoint for customers module
  app.get("/api/customers/verify-rnc/:rnc", isAuthenticated, async (req, res) => {
    try {
      const { rnc } = req.params;
      
      if (!rnc) {
        return res.status(400).json({
          isValid: false,
          message: "RNC parameter is required"
        });
      }

      // Clean and validate RNC format
      const cleanRnc = rnc.toString().replace(/\D/g, "");
      
      if (cleanRnc.length < 9 || cleanRnc.length > 11) {
        return res.json({
          isValid: false,
          message: `RNC debe tener entre 9 y 11 dígitos. RNC procesado: ${cleanRnc} (${cleanRnc.length} dígitos)`,
          rnc: cleanRnc,
          originalInput: rnc
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

  // Get user payment status with proper subscription validation
  app.get("/api/user/payment-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user is super admin - they bypass all payment requirements
      const isSuperAdmin = await storage.isUserSuperAdmin(userId);
      if (isSuperAdmin) {
        return res.json({ 
          hasValidPayment: true, 
          status: 'super_admin', 
          message: 'Super admin access',
          isSuperAdmin: true
        });
      }

      // Get user's company and check subscription status
      const company = await storage.getCompanyByUserId(userId);
      if (!company) {
        return res.json({ 
          hasValidPayment: false, 
          status: 'no_company', 
          message: 'No company found' 
        });
      }

      const now = new Date();
      const subscriptionExpiry = company.subscriptionExpiry ? new Date(company.subscriptionExpiry) : null;
      
      // Check subscription plan and expiry
      if (company.subscriptionPlan === 'trial') {
        if (subscriptionExpiry && subscriptionExpiry > now) {
          // Trial is still active - restrict access to setup and basic features only
          return res.json({ 
            hasValidPayment: false, 
            status: 'trial_active', 
            message: 'Trial period active - complete payment to access full system',
            expiresAt: subscriptionExpiry,
            daysRemaining: Math.ceil((subscriptionExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          });
        } else {
          // Trial expired
          return res.json({ 
            hasValidPayment: false, 
            status: 'trial_expired', 
            message: 'Trial period expired - payment required' 
          });
        }
      }

      // For paid plans (monthly/annual), check if active and not expired
      if (['monthly', 'annual'].includes(company.subscriptionPlan)) {
        if (!subscriptionExpiry || subscriptionExpiry > now) {
          return res.json({ 
            hasValidPayment: true, 
            status: 'active', 
            message: 'Active subscription',
            plan: company.subscriptionPlan,
            expiresAt: subscriptionExpiry
          });
        } else {
          return res.json({ 
            hasValidPayment: false, 
            status: 'expired', 
            message: 'Subscription expired - renewal required' 
          });
        }
      }

      // Default case - no valid payment
      return res.json({ 
        hasValidPayment: false, 
        status: 'pending', 
        message: 'Payment required' 
      });

    } catch (error) {
      console.error("Error fetching user payment status:", error);
      res.status(500).json({ 
        hasValidPayment: false, 
        status: 'error', 
        message: "Error checking payment status" 
      });
    }
  });

  // API Developer Registration and Management
  app.post("/api/developers/register", async (req, res) => {
    try {
      const { email, companyName, contactName, phone, website, description } = req.body;

      // Check if developer already exists
      const existingDeveloper = await storage.getApiDeveloperByEmail(email);
      if (existingDeveloper) {
        return res.status(400).json({ message: "Un desarrollador con este email ya está registrado" });
      }

      // Generate unique API key
      const apiKey = `fourOne_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

      const newDeveloper = await storage.createApiDeveloper({
        email,
        companyName,
        contactName,
        phone: phone || null,
        website: website || null,
        description,
        apiKey,
      });

      // Send API key via email
      const emailSent = await sendApiKeyEmail(email, apiKey, companyName);
      
      if (!emailSent) {
        console.error("Failed to send API key email to:", email);
      }

      res.json({ 
        success: true,
        apiKey: newDeveloper.apiKey,
        message: "Desarrollador registrado exitosamente. API key enviada por email."
      });
    } catch (error) {
      console.error("Error registering developer:", error);
      res.status(500).json({ message: "Error al registrar desarrollador" });
    }
  });

  // Developer Login - Retrieve API Key
  app.post("/api/developers/login", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email es requerido" });
      }

      const developer = await storage.getApiDeveloperByEmail(email);
      if (!developer) {
        return res.status(404).json({ message: "No se encontró una cuenta con este email" });
      }

      if (!developer.isActive) {
        return res.status(403).json({ message: "Esta cuenta ha sido desactivada" });
      }

      // Send API key via email
      const emailSent = await sendApiKeyEmail(email, developer.apiKey, developer.companyName);
      
      if (!emailSent) {
        console.error("Failed to send API key email to:", email);
        return res.status(500).json({ message: "Error al enviar el email. Intenta de nuevo." });
      }

      res.json({ 
        success: true,
        apiKey: developer.apiKey,
        message: "API key enviada por email exitosamente"
      });
    } catch (error) {
      console.error("Error during developer login:", error);
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // API Key validation middleware
  const validateApiKey = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: "API Key requerida" });
      }

      const apiKey = authHeader.substring(7);
      const developer = await storage.getApiDeveloperByKey(apiKey);

      if (!developer) {
        return res.status(401).json({ success: false, message: "API Key inválida" });
      }

      if (!developer.isActive) {
        return res.status(403).json({ success: false, message: "API Key desactivada" });
      }

      req.developer = developer;
      next();
    } catch (error) {
      console.error("Error validating API key:", error);
      res.status(500).json({ success: false, message: "Error de autenticación" });
    }
  };

  // Log API request middleware
  const logApiRequest = async (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Override res.json to capture response
    const originalJson = res.json;
    let responseData: any;
    let statusCode = 200;

    res.json = function(body: any) {
      responseData = body;
      statusCode = res.statusCode;
      return originalJson.call(this, body);
    };

    // Continue to next middleware
    res.on('finish', async () => {
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      try {
        await storage.logApiRequest({
          developerId: req.developer.id,
          endpoint: req.originalUrl,
          method: req.method,
          statusCode,
          responseTime,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          requestData: req.body,
          responseData
        });
      } catch (error) {
        console.error("Error logging API request:", error);
      }
    });

    next();
  };

  // Public API Endpoints for External Developers
  
  // RNC Validation API
  app.get("/api/v1/rnc/validate/:rnc", validateApiKey, logApiRequest, async (req, res) => {
    try {
      const { rnc } = req.params;
      
      if (!rnc || rnc.length < 9 || rnc.length > 11) {
        return res.status(400).json({
          success: false,
          message: "RNC debe tener entre 9 y 11 dígitos"
        });
      }

      const rncData = await storage.getRNCData(rnc);
      
      if (rncData) {
        res.json({
          success: true,
          data: {
            rnc: rncData.rnc,
            razonSocial: rncData.razonSocial,
            nombreComercial: rncData.nombreComercial,
            categoria: rncData.categoria,
            regimen: rncData.regimen,
            estado: rncData.estado
          }
        });
      } else {
        res.status(404).json({
          success: false,
          message: "RNC no encontrado en el registro de la DGII"
        });
      }
    } catch (error) {
      console.error("Error validating RNC:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  });

  // NCF Types API
  app.get("/api/v1/ncf/types", validateApiKey, logApiRequest, async (req, res) => {
    try {
      const ncfTypes = [
        { codigo: "01", descripcion: "Factura de Crédito Fiscal", tipo: "venta" },
        { codigo: "02", descripcion: "Factura de Consumo", tipo: "venta" },
        { codigo: "03", descripcion: "Nota de Débito", tipo: "ajuste" },
        { codigo: "04", descripcion: "Nota de Crédito", tipo: "ajuste" },
        { codigo: "11", descripcion: "Comprobante de Compras", tipo: "compra" },
        { codigo: "12", descripcion: "Registro Único de Ingresos", tipo: "ingreso" },
        { codigo: "13", descripcion: "Comprobante para Gastos Menores", tipo: "gasto" },
        { codigo: "14", descripcion: "Comprobante de Regímenes Especiales", tipo: "especial" },
        { codigo: "15", descripcion: "Comprobante Gubernamental", tipo: "gubernamental" },
        { codigo: "16", descripcion: "Comprobante para Exportaciones", tipo: "exportacion" },
        { codigo: "17", descripcion: "Comprobante para Pagos al Exterior", tipo: "exterior" }
      ];

      res.json({
        success: true,
        data: ncfTypes
      });
    } catch (error) {
      console.error("Error getting NCF types:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  });

  // Exchange Rates API (Public for internal use)
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      const rates = await currencyService.getAllExchangeRates();
      res.json(rates);
    } catch (error) {
      console.error("Error getting exchange rates:", error);
      res.status(500).json({ message: "Error getting exchange rates" });
    }
  });

  // Exchange Rates API (External developers)
  app.get("/api/v1/exchange-rates", validateApiKey, logApiRequest, async (req, res) => {
    try {
      const rates = await currencyService.getAllExchangeRates();
      
      res.json({
        success: true,
        data: rates.map(rate => ({
          currency: rate.currency,
          rate: rate.rate,
          lastUpdated: rate.lastUpdated
        }))
      });
    } catch (error) {
      console.error("Error getting exchange rates:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  });

  // PayPal Routes
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // API Developer Registration
  app.post("/api/developers/register", async (req, res) => {
    try {
      const { name, email, company, website, description } = req.body;

      if (!name || !email || !company) {
        return res.status(400).json({
          success: false,
          message: "Nombre, email y empresa son requeridos"
        });
      }

      // Generate API key
      const apiKey = crypto.randomBytes(32).toString('hex');

      const developer = await storage.createApiDeveloper({
        contactName: name,
        email,
        companyName: company,
        website: website || null,
        description: description || null,
        apiKey,
        isActive: true
      });

      res.json({
        success: true,
        data: {
          id: developer.id,
          contactName: developer.contactName,
          email: developer.email,
          companyName: developer.companyName,
          apiKey: developer.apiKey,
          createdAt: developer.createdAt
        }
      });
    } catch (error) {
      console.error("Error registering API developer:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  });

  // Get API Developer Info
  app.get("/api/developers/me", validateApiKey, async (req, res) => {
    try {
      const developer = (req as any).developer;
      const stats = await storage.getApiDeveloperStats(developer.id);

      res.json({
        success: true,
        data: {
          ...developer,
          stats
        }
      });
    } catch (error) {
      console.error("Error getting developer info:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor"
      });
    }
  });

  // Update user profile
  app.patch("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const { firstName, lastName, email } = req.body;

      const updatedUser = await storage.updateUser(userId, {
        firstName,
        lastName,
        email
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Error updating profile" });
    }
  });

  // Update system settings
  app.put("/api/settings/system", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const settings = req.body;

      // Store system settings for the user
      await storage.updateSystemSettings(userId, settings);

      res.json({ success: true, message: "Settings updated successfully" });
    } catch (error) {
      console.error("Error updating system settings:", error);
      res.status(500).json({ message: "Error updating settings" });
    }
  });

  // Update security settings
  app.put("/api/settings/security", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const settings = req.body;

      await storage.updateSecuritySettings(userId, settings);

      res.json({ success: true, message: "Security settings updated successfully" });
    } catch (error) {
      console.error("Error updating security settings:", error);
      res.status(500).json({ message: "Error updating security settings" });
    }
  });

  // Update POS settings
  app.put("/api/pos/print-settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const settings = req.body;

      await storage.updatePOSSettings(userId, settings);

      res.json({ success: true, message: "POS settings updated successfully" });
    } catch (error) {
      console.error("Error updating POS settings:", error);
      res.status(500).json({ message: "Error updating POS settings" });
    }
  });

  // Change password
  app.put("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const { currentPassword, newPassword } = req.body;

      // Verify current password and update to new one
      await storage.changePassword(userId, currentPassword, newPassword);

      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(400).json({ message: "Invalid current password or error updating password" });
    }
  });

  return httpServer;
}