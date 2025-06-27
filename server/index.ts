import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorHandlerMiddleware } from "./error-management";
import { dgiiRegistryUpdater } from "./dgii-registry-updater";
import { dgiiMonitor } from "./dgii-monitor";

// Set server timezone to GMT-4:00 (Atlantic Standard Time / Dominican Republic)
process.env.TZ = 'America/Santo_Domingo';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[DEBUG] ${req.method} ${req.path} - Body:`, req.body);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Test database connection first
    const { testDatabaseConnection } = await import("./db");
    const dbConnected = await testDatabaseConnection();
    
    if (!dbConnected) {
      console.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    const server = await registerRoutes(app);

    // Global error handler middleware
    app.use(errorHandlerMiddleware);

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
      
      // Start the DGII registry auto-updater (only after successful DB connection)
      try {
        dgiiRegistryUpdater.startAutoUpdate();
        log("DGII RNC registry system initialized with auto-update enabled");
      } catch (error) {
        console.warn("DGII registry updater failed to start:", error);
      }
      
      // Start DGII server monitoring
      try {
        dgiiMonitor.startMonitoring();
        dgiiMonitor.on('server_online', (status) => {
          log(`DGII server is online - Response time: ${status.responseTime}ms`);
        });
        dgiiMonitor.on('server_offline', (status) => {
          log(`DGII server is offline - Last error: ${status.lastError}`);
        });
      } catch (error) {
        console.warn("DGII monitor failed to start:", error);
      }
    });
  } catch (error) {
    console.error("Application startup failed:", error);
    process.exit(1);
  }
})();
