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
      console.log('=== REGISTRATION START ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const { email, password, firstName, lastName, companyName, rnc, rncValidation } = req.body;

      console.log('Extracted data:', { email, firstName, lastName, companyName, rnc }); // Debug log

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Todos los campos requeridos deben ser completados" });
      }

      if (!companyName) {
        return res.status(400).json({ message: "El nombre de la empresa es requerido" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Ya existe un usuario con este correo electrónico" });
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

      console.log('User created successfully:', user.id); // Debug log

      // Create company with RNC information
      console.log('=== CREATING COMPANY ===');
      const companyData: any = {
        name: companyName,
        ownerId: user.id,
        businessType: "general",
        subscriptionPlan: "trial",
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      };

      // Add RNC if provided and validated
      if (rnc && rnc.trim()) {
        companyData.rnc = rnc.trim();
        
        // If we have validation data, use it for business name
        if (rncValidation && rncValidation.valid && rncValidation.data) {
          companyData.businessName = rncValidation.data.name || rncValidation.data.razonSocial;
          // Store industry information if available
          if (rncValidation.data.categoria) {
            companyData.industry = rncValidation.data.categoria;
          }
        }
      }

      console.log('Company data to create:', JSON.stringify(companyData, null, 2));
      const company = await storage.createCompany(companyData);
      console.log('Company created successfully:', company.id);
      console.log('Company created successfully:', company.id); // Debug log

      // Associate user with company as admin
      await storage.createCompanyUser({
        userId: user.id,
        companyId: company.id,
        role: "company_admin",
        permissions: ["all"],
        isActive: true,
      });

      console.log('Company user association created successfully'); // Debug log

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
      res.status(500).json({ 
        message: "Error interno del servidor durante el registro",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
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
      
      // Destroy session completely
      req.session.destroy((sessionErr: any) => {
        if (sessionErr) {
          console.error("Session destruction error:", sessionErr);
        }
        
        // Clear all cookies
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
        
        // Clear any other auth-related cookies
        res.clearCookie('session', { path: '/' });
        res.clearCookie('token', { path: '/' });
        res.clearCookie('auth', { path: '/' });
        
        // Set cache control headers to prevent caching
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        
        res.json({ 
          message: "Logged out successfully",
          clearCache: true,
          timestamp: new Date().toISOString()
        });
      });
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
      let emailSent = false;
      
      try {
        emailSent = await sendPasswordResetEmail(email, resetToken);
      } catch (error) {
        console.error('SendGrid error:', error);
        emailSent = false;
      }
      
      // Force development mode for testing when SendGrid is not configured
      // Comment out the line below when SendGrid is properly configured
      if (process.env.NODE_ENV === 'development') {
        emailSent = false;
      }

      if (!emailSent) {
        console.error('Failed to send password reset email to:', email);
        // Always provide the reset token in development for testing
        if (process.env.NODE_ENV === 'development') {
          const productionUrl = `https://fourone.com.do/reset-password?token=${resetToken}`;
          console.log('\n=== DESARROLLO: Enlace de Recuperación ===');
          console.log(`Email: ${email}`);
          console.log(`URL de Producción: ${productionUrl}`);
          console.log(`Token: ${resetToken}`);
          console.log('==========================================\n');
          return res.json({ 
            message: "Token generado exitosamente. Usar URL de producción desde la consola.",
            resetUrl: productionUrl,
            token: resetToken
          });
        }
        return res.status(500).json({ message: "Error enviando email de recuperación. Contactar soporte técnico." });
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

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres" });
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

      // Check if new password is the same as current password
      const isSamePassword = await comparePasswords(newPassword, user.password);
      if (isSamePassword) {
        return res.status(400).json({ message: "La nueva contraseña no puede ser igual a la actual" });
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
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export { hashPassword, comparePasswords };