import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface CompanyInvitationEmailParams {
  companyName: string;
  companyEmail: string;
  invitationToken: string;
  fromEmail?: string;
}

export async function sendCompanyInvitationEmail(params: CompanyInvitationEmailParams): Promise<boolean> {
  try {
    const registrationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/registro-empresa?token=${params.invitationToken}`;
    
    const emailContent = {
      to: params.companyEmail,
      from: params.fromEmail || 'noreply@fourone.solutions',
      subject: `Invitación para registrarse en Four One Solutions - ${params.companyName}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenido a Four One Solutions</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Four One Solutions</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Sistema de Gestión Empresarial</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">¡Bienvenido a Four One Solutions!</h2>
            
            <p>Estimado equipo de <strong>${params.companyName}</strong>,</p>
            
            <p>Se ha creado una cuenta empresarial para su organización en Four One Solutions, nuestra plataforma integral de gestión empresarial.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #667eea;">Qué incluye Four One Solutions:</h3>
              <ul style="padding-left: 20px;">
                <li>Sistema POS completo con impresión térmica</li>
                <li>Gestión de inventario y almacenes</li>
                <li>Facturación electrónica</li>
                <li>Módulo de manufactura y producción</li>
                <li>Gestión de recursos humanos y nómina</li>
                <li>Chat empresarial interno</li>
                <li>Reportes y análisis avanzados</li>
              </ul>
            </div>
            
            <p>Para completar la configuración de su cuenta y establecer su contraseña, haga clic en el siguiente enlace:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${registrationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                Completar Registro
              </a>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;"><strong>Importante:</strong> Este enlace expira en 7 días. Si necesita asistencia, contáctenos en soporte@fourone.solutions</p>
            </div>
            
            <p>Una vez completado el registro, tendrá acceso completo a todas las funcionalidades de la plataforma.</p>
            
            <p>¡Esperamos que disfrute de la experiencia con Four One Solutions!</p>
            
            <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px; text-align: center; color: #666; font-size: 14px;">
              <p style="margin: 0;">Four One Solutions</p>
              <p style="margin: 5px 0 0 0;">Sistema de Gestión Empresarial para República Dominicana</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Bienvenido a Four One Solutions - ${params.companyName}
        
        Se ha creado una cuenta empresarial para su organización en Four One Solutions.
        
        Para completar la configuración de su cuenta, visite: ${registrationUrl}
        
        Este enlace expira en 7 días.
        
        Four One Solutions - Sistema de Gestión Empresarial
      `
    };

    await mailService.send(emailContent);
    return true;
  } catch (error) {
    console.error('Error sending company invitation email:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  try {
    // Always use production domain for emails to ensure proper functionality
    const baseUrl = 'https://fourone.com.do';
    
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    const emailContent = {
      to: email,
      from: {
        email: 'admin@fourone.com.do',
        name: 'Four One Solutions'
      },
      subject: 'Restablecer contraseña - Four One Solutions',
      tracking_settings: {
        click_tracking: {
          enable: false
        },
        open_tracking: {
          enable: false
        }
      },
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Restablecimiento de contraseña - Four One Solutions</title>
          <style>
            body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; }
            .logo { color: white; font-size: 32px; font-weight: bold; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
            .content { padding: 40px 30px; background-color: #f8f9fa; }
            .title { color: #333; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; text-align: center; }
            .message { color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
            .button-container { text-align: center; margin: 40px 0; }
            .reset-button { 
              display: inline-block; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; 
              padding: 16px 32px; 
              text-decoration: none; 
              border-radius: 30px; 
              font-weight: 600;
              font-size: 16px;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
              transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .reset-button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6); }
            .url-box { 
              background: #e9ecef; 
              border: 1px solid #dee2e6; 
              border-radius: 8px; 
              padding: 15px; 
              margin: 20px 0; 
              font-family: 'Courier New', monospace; 
              font-size: 14px; 
              word-break: break-all; 
              color: #495057;
            }
            .warning-box { 
              background: #fff3cd; 
              border-left: 4px solid #ffc107; 
              padding: 20px; 
              margin: 30px 0; 
              border-radius: 0 8px 8px 0;
            }
            .warning-title { color: #856404; font-weight: 600; margin: 0 0 10px 0; }
            .warning-list { color: #856404; margin: 0; padding-left: 20px; }
            .footer { 
              background: #343a40; 
              color: #ffffff; 
              text-align: center; 
              padding: 30px; 
              font-size: 14px;
            }
            .footer-logo { color: #667eea; font-weight: 600; font-size: 18px; margin-bottom: 5px; }
            .footer-tagline { color: #adb5bd; }
            .divider { height: 1px; background: linear-gradient(to right, transparent, #dee2e6, transparent); margin: 30px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">Four One Solutions</h1>
            </div>
            
            <div class="content">
              <h2 class="title">🔐 Restablecimiento de Contraseña</h2>
              
              <p class="message">
                Hemos recibido una solicitud para restablecer la contraseña de su cuenta en Four One Solutions.
              </p>
              
              <p class="message">
                Para crear una nueva contraseña segura, haga clic en el siguiente botón:
              </p>
              
              <div class="button-container">
                <a href="${resetUrl}" class="reset-button">
                  ✨ Restablecer mi Contraseña
                </a>
              </div>
              
              <div class="divider"></div>
              
              <p class="message">
                <strong>¿No puede hacer clic en el botón?</strong> Copie y pegue este enlace en su navegador:
              </p>
              
              <div class="url-box">
                ${resetUrl}
              </div>
              
              <div class="warning-box">
                <div class="warning-title">⚠️ Información Importante</div>
                <ul class="warning-list">
                  <li>Este enlace expirará automáticamente en <strong>1 hora</strong></li>
                  <li>Solo puede utilizarse <strong>una vez</strong> por motivos de seguridad</li>
                  <li>Si no solicitó este restablecimiento, puede ignorar este mensaje</li>
                  <li>Para su seguridad, nunca comparta este enlace con terceros</li>
                </ul>
              </div>
            </div>
            
            <div class="footer">
              <div class="footer-logo">Four One Solutions</div>
              <div class="footer-tagline">Sistema Integral de Gestión Empresarial</div>
              <div style="margin-top: 15px; color: #6c757d; font-size: 12px;">
                Este es un mensaje automático, por favor no responda a este correo.
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Four One Solutions - Restablecimiento de contraseña

Se ha solicitado un restablecimiento de contraseña para su cuenta.

Para crear una nueva contraseña, copie y pegue el siguiente enlace en su navegador:

${resetUrl}

IMPORTANTE:
- Este enlace expirará en 1 hora
- Solo puede usarse una vez
- Si no solicitó este restablecimiento, ignore este mensaje

Four One Solutions
Sistema de Gestión Empresarial`
    };

    await mailService.send(emailContent);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

export async function sendPasswordSetupEmail(email: string, name: string): Promise<boolean> {
  try {
    // Generate password setup token
    const crypto = require('crypto');
    const setupToken = crypto.randomBytes(32).toString('hex');
    
    // Store token in database with expiration (24 hours)
    const { DatabaseStorage } = await import('./storage');
    const storage = new DatabaseStorage();
    await storage.createPasswordResetToken(email, setupToken, new Date(Date.now() + 24 * 60 * 60 * 1000));

    const setupUrl = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/setup-password?token=${setupToken}`;
    
    const emailContent = {
      to: email,
      from: 'soporte@fourone.com.do',
      subject: '¡Bienvenido a Four One Solutions! - Configura tu contraseña',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bienvenido a Four One Solutions</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Four One Solutions</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0; font-size: 16px;">Sistema de Gestión Empresarial</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #343a40; margin-top: 0;">¡Bienvenido/a ${name}!</h2>
            
            <p style="color: #495057; line-height: 1.6;">
              Tu pago ha sido confirmado exitosamente. Ahora puedes acceder a tu cuenta en Four One Solutions.
            </p>
            
            <p style="color: #495057; line-height: 1.6;">
              Para completar la configuración de tu cuenta, necesitas establecer tu contraseña de acceso:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${setupUrl}" 
                 style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(0, 123, 255, 0.4);">
                Establecer mi Contraseña
              </a>
            </div>
            
            <div style="background: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #0c5460; font-size: 14px;">
                <strong>Importante:</strong> Este enlace es válido por 24 horas. Si no completas la configuración en este tiempo, contacta con nuestro soporte.
              </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
            
            <div style="color: #6c757d; font-size: 14px;">
              <p><strong>Contacto y Soporte:</strong></p>
              <p>• Soporte técnico: <a href="mailto:soporte@fourone.com.do" style="color: #007bff;">soporte@fourone.com.do</a></p>
              <p>• Información general: <a href="mailto:info@fourone.com.do" style="color: #007bff;">info@fourone.com.do</a></p>
              <p>• Teléfono: (809) 555-0123</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; color: #6c757d; font-size: 12px;">
              <p>© 2025 Four One Solutions SRL. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ¡Bienvenido/a ${name}!
        
        Tu pago ha sido confirmado exitosamente. Ahora puedes acceder a tu cuenta en Four One Solutions.
        
        Para completar la configuración de tu cuenta, visita: ${setupUrl}
        
        Este enlace es válido por 24 horas.
        
        Contacto y Soporte:
        - Soporte técnico: soporte@fourone.com.do
        - Información general: info@fourone.com.do
        - Teléfono: (809) 555-0123
        
        © 2025 Four One Solutions SRL
      `
    };

    await mailService.send(emailContent);
    return true;
  } catch (error) {
    console.error('Error sending password setup email:', error);
    return false;
  }
}