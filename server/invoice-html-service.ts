import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

export interface InvoiceData {
  sale: any;
  items: any[];
  company: any;
  customerInfo?: {
    name?: string;
    phone?: string;
    rnc?: string;
    address?: string;
  };
}

export class InvoiceHTMLService {
  /**
   * Generate professional HTML invoice with CSS styling
   */
  static async generateHTMLInvoice(invoiceData: InvoiceData): Promise<string> {
    const { sale, items, company, customerInfo } = invoiceData;
    
    // Generate QR code for verification
    const verificationUrl = `https://invoice-verify.com/v/${sale.saleNumber}`;
    const qrCodeDataURL = await QRCode.toDataURL(verificationUrl, {
      width: 120,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Load company logo if available
    let logoBase64 = '';
    if (company.logo) {
      try {
        const logoPath = path.join(process.cwd(), 'uploads', 'logos', `${company.id}.png`);
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        }
      } catch (error) {
        console.log('Logo not found, using text header');
      }
    }

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${sale.saleNumber}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 2px solid #007acc;
            padding-bottom: 20px;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-logo {
            max-width: 150px;
            max-height: 80px;
            margin-bottom: 10px;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #007acc;
            margin-bottom: 5px;
        }
        
        .invoice-details {
            text-align: right;
            min-width: 200px;
        }
        
        .invoice-number {
            font-size: 18px;
            font-weight: bold;
            color: #007acc;
            margin-bottom: 10px;
        }
        
        .invoice-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .section-title {
            font-weight: bold;
            color: #007acc;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .info-row {
            margin-bottom: 5px;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        
        .items-table th {
            background: #007acc;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
        }
        
        .items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #eee;
        }
        
        .items-table tr:nth-child(even) {
            background: #f9f9f9;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        
        .totals-table {
            min-width: 300px;
        }
        
        .totals-table td {
            padding: 8px 15px;
            border-bottom: 1px solid #eee;
        }
        
        .totals-table .total-row {
            font-weight: bold;
            font-size: 16px;
            background: #f0f8ff;
            border-top: 2px solid #007acc;
        }
        
        .footer-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
        }
        
        .qr-section {
            text-align: center;
        }
        
        .qr-code {
            width: 100px;
            height: 100px;
            margin-bottom: 10px;
        }
        
        .verification-text {
            font-size: 10px;
            color: #666;
            max-width: 120px;
        }
        
        .payment-info {
            flex: 1;
            margin-right: 30px;
        }
        
        .amount-words {
            font-style: italic;
            color: #666;
            margin-bottom: 15px;
        }
        
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            .invoice-container {
                max-width: none;
                margin: 0;
                padding: 0;
            }
            
            .no-print {
                display: none !important;
            }
        }
        
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007acc;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,122,204,0.3);
        }
        
        .print-button:hover {
            background: #005a99;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>
    
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-info">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="company-logo">` : ''}
                <div class="company-name">${company.name}</div>
                <div><strong>RNC:</strong> ${company.rnc || 'N/A'}</div>
                <div><strong>Teléfono:</strong> ${company.phone || 'N/A'}</div>
                <div><strong>Email:</strong> ${company.email || 'N/A'}</div>
                <div><strong>Dirección:</strong> ${company.address || 'N/A'}</div>
            </div>
            <div class="invoice-details">
                <div class="invoice-number">FACTURA</div>
                <div class="invoice-number">${sale.saleNumber}</div>
                <div><strong>Fecha:</strong> ${new Date(sale.createdAt).toLocaleDateString('es-DO')}</div>
                <div><strong>Hora:</strong> ${new Date(sale.createdAt).toLocaleTimeString('es-DO')}</div>
                ${sale.ncf ? `<div><strong>NCF:</strong> ${sale.ncf}</div>` : ''}
            </div>
        </div>
        
        <div class="invoice-meta">
            <div class="customer-section">
                <div class="section-title">INFORMACIÓN DEL CLIENTE</div>
                <div class="info-row"><strong>Nombre:</strong> ${customerInfo?.name || 'Cliente General'}</div>
                <div class="info-row"><strong>Teléfono:</strong> ${customerInfo?.phone || 'N/A'}</div>
                <div class="info-row"><strong>RNC/Cédula:</strong> ${customerInfo?.rnc || 'N/A'}</div>
                <div class="info-row"><strong>Dirección:</strong> ${customerInfo?.address || 'N/A'}</div>
            </div>
            <div class="payment-section">
                <div class="section-title">INFORMACIÓN DE PAGO</div>
                <div class="info-row"><strong>Método:</strong> ${sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</div>
                ${sale.paymentMethod === 'cash' ? `
                <div class="info-row"><strong>Recibido:</strong> $${parseFloat(sale.cashReceived || '0').toFixed(2)}</div>
                <div class="info-row"><strong>Cambio:</strong> $${parseFloat(sale.cashChange || '0').toFixed(2)}</div>
                ` : ''}
                <div class="info-row"><strong>Estado:</strong> ${sale.status === 'completed' ? 'Completada' : 'Pendiente'}</div>
            </div>
        </div>
        
        <table class="items-table">
            <thead>
                <tr>
                    <th>Cant.</th>
                    <th>Descripción</th>
                    <th class="text-right">Precio Unit.</th>
                    <th class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                <tr>
                    <td class="text-center">${item.quantity}</td>
                    <td>${item.productName || item.name}</td>
                    <td class="text-right">$${parseFloat(item.unitPrice || '0').toFixed(2)}</td>
                    <td class="text-right">$${parseFloat(item.subtotal || '0').toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td><strong>Subtotal:</strong></td>
                    <td class="text-right">$${parseFloat(sale.subtotal || '0').toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>ITBIS (18%):</strong></td>
                    <td class="text-right">$${parseFloat(sale.itbis || '0').toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                    <td><strong>TOTAL:</strong></td>
                    <td class="text-right"><strong>$${parseFloat(sale.total || '0').toFixed(2)}</strong></td>
                </tr>
            </table>
        </div>
        
        <div class="footer-section">
            <div class="payment-info">
                <div class="amount-words">
                    <strong>Total en letras:</strong> ${this.numberToWords(parseFloat(sale.total || '0'))} pesos dominicanos
                </div>
                ${sale.notes ? `<div><strong>Notas:</strong> ${sale.notes}</div>` : ''}
                <div style="margin-top: 20px; font-size: 11px; color: #666;">
                    Gracias por su compra. Esta factura fue generada electrónicamente.
                </div>
            </div>
            <div class="qr-section">
                <img src="${qrCodeDataURL}" alt="Código QR" class="qr-code">
                <div class="verification-text">
                    <strong>CÓDIGO QR DE VERIFICACIÓN</strong><br>
                    Escanea para verificar esta venta
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    return html;
  }

  /**
   * Convert number to words in Spanish
   */
  private static numberToWords(num: number): string {
    if (num === 0) return 'cero';
    
    const ones = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    
    function convertHundreds(n: number): string {
      let result = '';
      
      if (n >= 100) {
        if (n >= 900) result += 'novecientos ';
        else if (n >= 800) result += 'ochocientos ';
        else if (n >= 700) result += 'setecientos ';
        else if (n >= 600) result += 'seiscientos ';
        else if (n >= 500) result += 'quinientos ';
        else if (n >= 400) result += 'cuatrocientos ';
        else if (n >= 300) result += 'trescientos ';
        else if (n >= 200) result += 'doscientos ';
        else if (n >= 100) result += 'cien ';
        n %= 100;
      }
      
      if (n >= 20) {
        result += tens[Math.floor(n / 10)];
        if (n % 10 > 0) result += ' y ' + ones[n % 10];
      } else if (n >= 10) {
        result += teens[n - 10];
      } else if (n > 0) {
        result += ones[n];
      }
      
      return result.trim();
    }
    
    const integerPart = Math.floor(num);
    const decimalPart = Math.round((num - integerPart) * 100);
    
    let words = convertHundreds(integerPart);
    
    if (decimalPart > 0) {
      words += ` con ${decimalPart}/100`;
    }
    
    return words;
  }
}