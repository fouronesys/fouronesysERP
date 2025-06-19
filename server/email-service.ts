import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await sgMail.send({
      to: params.to,
      from: 'noreply@fourone.com.do', // Replace with your verified sender email
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendApiKeyEmail(email: string, apiKey: string, companyName: string): Promise<boolean> {
  const subject = 'Tu Clave API - Four One System';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1e40af;">Four One System - API Developer</h2>
      
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