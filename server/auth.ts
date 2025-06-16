import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return await bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "fallback-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: false, // Disable secure for development
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password) {
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.isActive) {
            return done(null, false, { message: "Account is deactivated" });
          }

          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid email or password" });
          }

          // Update last login
          await storage.updateUserLastLogin(user.id);

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, companyName } = req.body;

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isActive: true,
      });

      // Create company if provided
      if (companyName) {
        const company = await storage.createCompany({
          name: companyName,
          ownerId: user.id,
          businessType: "general",
          subscriptionPlan: "trial",
          subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        // Associate user with company as admin
        await storage.createCompanyUser({
          userId: user.id,
          companyId: company.id,
          role: "company_admin",
          permissions: ["all"],
          isActive: true,
        });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      try {
        // Check company activation status
        const company = await storage.getCompanyByUserId(user.id);
        if (company && !company.isActive) {
          // Company exists but not activated - check payment status
          const paymentStatus = await storage.getUserPaymentStatus(user.email);
          
          if (paymentStatus && paymentStatus.status === 'confirmed') {
            // Payment completed but company not activated
            return res.status(403).json({ 
              message: "processing",
              title: "Orden en Procesamiento",
              description: "Su pago ha sido confirmado y su cuenta está siendo procesada. Le notificaremos cuando esté lista."
            });
          } else {
            // No payment or payment not confirmed
            return res.status(403).json({ 
              message: "payment_required",
              title: "Pago Requerido",
              description: "Debe completar el pago para activar su cuenta."
            });
          }
        }

        req.login(user, (err) => {
          if (err) {
            return res.status(500).json({ message: "Internal server error" });
          }
          res.json({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          });
        });
      } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    })(req, res, next);
  });

  // Clear cookies endpoint for troubleshooting
  app.post("/api/clear-session", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destruction error:", err);
        return res.status(500).json({ message: "Error clearing session" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Session cleared successfully" });
    });
  });

  // Logout endpoint - support both GET and POST
  const logoutHandler = (req: any, res: any, next: any) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  };
  
  app.post("/api/logout", logoutHandler);
  app.get("/api/logout", logoutHandler);

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      role: req.user.role,
      profileImageUrl: req.user.profileImageUrl,
      isActive: req.user.isActive,
    });
  });

  // Change password endpoint
  app.post("/api/change-password", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user || !user.password) {
        return res.status(404).json({ message: "User not found" });
      }

      const isCurrentValid = await comparePasswords(currentPassword, user.password);
      if (!isCurrentValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, hashedNewPassword);

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Password reset request endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Return success even if user doesn't exist to prevent email enumeration
        return res.json({ message: "Si existe una cuenta con ese email, se ha enviado un enlace de recuperación." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await storage.createPasswordResetToken(email, resetToken, expiry);

      // Send reset email
      const { sendPasswordResetEmail } = await import('./email-service');
      const emailSent = await sendPasswordResetEmail(email, resetToken);

      if (!emailSent) {
        console.error('Failed to send password reset email to:', email);
        return res.status(500).json({ message: "Error enviando email de recuperación" });
      }

      res.json({ message: "Si existe una cuenta con ese email, se ha enviado un enlace de recuperación." });
    } catch (error) {
      console.error("Password reset request error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // Password reset endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token y nueva contraseña son requeridos" });
      }

      // Validate reset token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken || resetToken.expiresAt < new Date()) {
        return res.status(400).json({ message: "Token inválido o expirado" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(resetToken.email);
      if (!user) {
        return res.status(400).json({ message: "Usuario no encontrado" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user password
      await storage.updateUserPassword(user.id, hashedPassword);

      // Delete used reset token
      await storage.deletePasswordResetToken(token);

      res.json({ message: "Contraseña restablecida exitosamente" });
    } catch (error) {
      console.error("Password reset error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });
}

// Authentication middleware
export function isAuthenticated(req: any, res: any, next: any) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export { hashPassword, comparePasswords };