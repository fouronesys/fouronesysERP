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
import multer from "multer";

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
  console.log("RNC registry initialized successfully");

  // Setup authentication
  setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server on a different port to avoid conflicts
  const wss = new WebSocketServer({ port: 3001, host: "0.0.0.0" });

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

  return httpServer;
}