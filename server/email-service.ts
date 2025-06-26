import * as SibApiV3Sdk from '@getbrevo/brevo';

// Initialize Brevo API
const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Set API key if available
if (process.env.BREVO_API_KEY) {
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);
} else {
  console.warn("BREVO_API_KEY not configured - Email functionality disabled");
}

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.BREVO_API_KEY) {
    console.warn('Email not sent - BREVO_API_KEY not configured');
    return false;
  }

  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.sender = {
      name: "Four One Solutions",
      email: process.env.BREVO_FROM_EMAIL || 'noreply@fourone.com.do'
    };
    
    sendSmtpEmail.to = [{
      email: params.to
    }];
    
    sendSmtpEmail.subject = params.subject;
    
    if (params.html) {
      sendSmtpEmail.htmlContent = params.html;
    }
    
    if (params.text) {
      sendSmtpEmail.textContent = params.text;
    }

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent successfully via Brevo');
    return true;
  } catch (error) {
    console.error('Brevo email error:', error);
    return false;
  }
}

export async function sendApiKeyEmail(email: string, apiKey: string, companyName: string): Promise<boolean> {
  const subject = 'Tu Clave API - Four One Solutions';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">Four One Solutions - API Developer</h2>
      
      <p>Hola,</p>
      
      <p>Tu clave API ha sido generada exitosamente para <strong>${companyName}</strong>.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Tu Clave API:</h3>
        <code style="background-color: #e5e7eb; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 14px; display: block;">
          ${apiKey}
        </code>
      </div>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
        <h4 style="color: #dc2626; margin-top: 0;">Importante:</h4>
        <ul style="color: #7f1d1d;">
          <li>Guarda esta clave en un lugar seguro</li>
          <li>No compartas tu clave API con terceros</li>
          <li>Incluye la clave en el header Authorization de todas las peticiones</li>
        </ul>
      </div>
      
      <h3>Próximos pasos:</h3>
      <ol>
        <li>Consulta la <a href="https://api.example.com/docs" style="color: #1e40af;">documentación de la API</a></li>
        <li>Incluye tu clave en el header: <code>Authorization: Bearer ${apiKey}</code></li>
        <li>Comienza a integrar nuestras APIs en tu aplicación</li>
      </ol>
      
      <h3>APIs Disponibles:</h3>
      <ul>
        <li><strong>Validación RNC:</strong> <code>GET /api/v1/rnc/validate/{rnc}</code></li>
        <li><strong>Tipos de NCF:</strong> <code>GET /api/v1/ncf/types</code></li>
        <li><strong>Consulta Empresarial:</strong> <code>GET /api/v1/company/info/{rnc}</code></li>
      </ul>
      
      <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.</p>
      
      <p>Saludos,<br>
      <strong>Four One System Team</strong></p>
    </div>
  `;
  
  const text = `
Four One System - API Developer

Hola,

Tu clave API ha sido generada exitosamente para ${companyName}.

Tu Clave API: ${apiKey}

IMPORTANTE:
- Guarda esta clave en un lugar seguro
- No compartas tu clave API con terceros
- Incluye la clave en el header Authorization de todas las peticiones

Próximos pasos:
1. Consulta la documentación de la API
2. Incluye tu clave en el header: Authorization: Bearer ${apiKey}
3. Comienza a integrar nuestras APIs en tu aplicación

APIs Disponibles:
- Validación RNC: GET /api/v1/rnc/validate/{rnc}
- Tipos de NCF: GET /api/v1/ncf/types
- Consulta Empresarial: GET /api/v1/company/info/{rnc}

Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.

Saludos,
Four One System Team
  `;

  return await sendEmail({
    to: email,
    subject,
    text,
    html
  });
}