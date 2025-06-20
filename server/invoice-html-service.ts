import type { Invoice, InvoiceItem, Customer, Company } from "@shared/schema";

// Format currency in Dominican Pesos
function formatDOP(amount: number): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export class InvoiceHTMLService {
  static async generateInvoiceHTML(
    invoice: Invoice,
    customer: Customer,
    company: Company,
    invoiceItems: InvoiceItem[]
  ): Promise<string> {
    // Calculate totals
    const subtotalNum = parseFloat(invoice.subtotal);
    const taxNum = parseFloat(invoice.itbis || "0");
    const totalNum = parseFloat(invoice.total);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${invoice.number}</title>
    <style>
        @page {
            margin: 20mm;
            size: A4;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .invoice-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm;
            background: white;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
        }
        
        .company-info {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .company-logo {
            max-width: 80px;
            max-height: 80px;
            object-fit: contain;
        }
        
        .company-details-wrapper {
            flex: 1;
        }
        
        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #000;
            margin-bottom: 5px;
        }
        
        .company-details {
            font-size: 11px;
            color: #666;
            line-height: 1.3;
        }
        
        .invoice-info {
            text-align: right;
            min-width: 200px;
        }
        
        .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #000;
            margin-bottom: 10px;
        }
        
        .invoice-number {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .invoice-dates {
            font-size: 11px;
            color: #666;
        }
        
        .ncf-section {
            background: #f8f8f8;
            border: 2px solid #000;
            padding: 8px;
            text-align: center;
            margin: 15px 0;
            border-radius: 4px;
        }
        
        .ncf-title {
            font-weight: bold;
            font-size: 14px;
            color: #000;
            margin-bottom: 3px;
        }
        
        .ncf-number {
            font-size: 16px;
            font-weight: bold;
            color: #000;
        }
        
        .billing-section {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
        }
        
        .billing-to, .shipping-to {
            flex: 1;
            margin-right: 20px;
        }
        
        .section-title {
            font-weight: bold;
            font-size: 14px;
            color: #000;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        
        .customer-info {
            background: #f8f8f8;
            padding: 12px;
            border-radius: 4px;
            border-left: 4px solid #2563eb;
        }
        
        .customer-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 3px;
        }
        
        .customer-details {
            font-size: 11px;
            color: #666;
            line-height: 1.3;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border: 1px solid #e2e8f0;
        }
        
        .items-table th {
            background: #2563eb;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
            text-transform: uppercase;
        }
        
        .items-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
        }
        
        .items-table tr:nth-child(even) {
            background: #f8fafc;
        }
        
        .item-description {
            font-weight: 500;
            color: #374151;
        }
        
        .text-right {
            text-align: right;
        }
        
        .text-center {
            text-align: center;
        }
        
        .totals-section {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
        }
        
        .totals-table {
            width: 300px;
            border-collapse: collapse;
        }
        
        .totals-table td {
            padding: 8px 12px;
            font-size: 12px;
        }
        
        .totals-table .label {
            text-align: right;
            font-weight: 500;
            color: #374151;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .totals-table .amount {
            text-align: right;
            font-weight: bold;
            border-bottom: 1px solid #e2e8f0;
            width: 120px;
        }
        
        .total-row .label,
        .total-row .amount {
            background: #2563eb;
            color: white;
            font-size: 14px;
            border: none;
        }
        
        .notes-section {
            margin-top: 30px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 4px;
            border-left: 4px solid #10b981;
        }
        
        .notes-title {
            font-weight: bold;
            font-size: 12px;
            color: #059669;
            margin-bottom: 5px;
        }
        
        .notes-content {
            font-size: 11px;
            color: #374151;
            line-height: 1.4;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            color: #6b7280;
        }
        
        .payment-info {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 12px;
            border-radius: 4px;
            margin: 20px 0;
        }
        
        .payment-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 5px;
        }
        
        .payment-details {
            font-size: 11px;
            color: #92400e;
        }
        
        @media print {
            .invoice-container {
                padding: 0;
                margin: 0;
                max-width: none;
            }
            
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="company-info">
                <div class="company-name">${company.name || 'Mi Empresa'}</div>
                <div class="company-details">
                    ${company.address ? `${company.address}<br>` : ''}
                    ${company.phone ? `Tel: ${company.phone}<br>` : ''}
                    ${company.email ? `Email: ${company.email}<br>` : ''}
                    ${company.rnc ? `RNC: ${company.rnc}` : ''}
                </div>
            </div>
            <div class="invoice-info">
                <div class="invoice-title">FACTURA</div>
                <div class="invoice-number"># ${invoice.number}</div>
                <div class="invoice-dates">
                    <div><strong>Fecha:</strong> ${new Date(invoice.date).toLocaleDateString('es-DO')}</div>
                    <div><strong>Vencimiento:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('es-DO') : 'N/A'}</div>
                </div>
            </div>
        </div>

        <!-- NCF Section -->
        ${invoice.ncf ? `
        <div class="ncf-section">
            <div class="ncf-title">*** COMPROBANTE FISCAL ***</div>
            <div class="ncf-number">NCF: ${invoice.ncf}</div>
        </div>
        ` : ''}

        <!-- Billing Information -->
        <div class="billing-section">
            <div class="billing-to">
                <div class="section-title">Facturar a:</div>
                <div class="customer-info">
                    <div class="customer-name">${customer.name || 'Cliente General'}</div>
                    <div class="customer-details">
                        ${customer.email ? `Email: ${customer.email}<br>` : ''}
                        ${customer.phone ? `Teléfono: ${customer.phone}<br>` : ''}
                        ${customer.address ? `Dirección: ${customer.address}<br>` : ''}
                        ${customer.rnc ? `RNC: ${customer.rnc}<br>` : ''}
                        ${customer.cedula ? `Cédula: ${customer.cedula}` : ''}
                    </div>
                </div>
            </div>
        </div>

        <!-- Items Table -->
        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 50%">Descripción</th>
                    <th style="width: 10%" class="text-center">Cant.</th>
                    <th style="width: 15%" class="text-right">Precio Unit.</th>
                    <th style="width: 15%" class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${invoiceItems.map(item => `
                <tr>
                    <td class="item-description">${item.price || 'Producto'}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-right">${formatDOP(parseFloat(item.price))}</td>
                    <td class="text-right">${formatDOP(parseFloat(item.subtotal))}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <!-- Totals -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td class="label">Subtotal:</td>
                    <td class="amount">${formatDOP(subtotalNum)}</td>
                </tr>
                <tr>
                    <td class="label">ITBIS (18%):</td>
                    <td class="amount">${formatDOP(taxNum)}</td>
                </tr>
                <tr class="total-row">
                    <td class="label">TOTAL:</td>
                    <td class="amount">${formatDOP(totalNum)}</td>
                </tr>
            </table>
        </div>

        <!-- Payment Information -->
        <div class="payment-info">
            <div class="payment-title">Estado de Pago</div>
            <div class="payment-details">
                Estado: <strong>${invoice.status === 'paid' ? 'PAGADA' : invoice.status === 'pending' ? 'PENDIENTE' : 'VENCIDA'}</strong>
            </div>
        </div>

        <!-- Notes -->
        ${invoice.notes ? `
        <div class="notes-section">
            <div class="notes-title">Notas:</div>
            <div class="notes-content">${invoice.notes}</div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            <p>Gracias por su preferencia</p>
            <p>Esta factura fue generada electrónicamente y es válida sin firma</p>
        </div>
    </div>
</body>
</html>`;
  }
}