import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatDOP, generateNCF } from "@/lib/dominican";
import type { POSSale, POSSaleItem, Invoice, Customer, Company, POSPrintSettings } from "@shared/schema";

interface PrintReceiptProps {
  sale?: POSSale;
  invoice?: Invoice;
  items?: POSSaleItem[];
  customer?: Customer;
  company: Company;
  printSettings?: POSPrintSettings;
  size?: "sm" | "default";
}

export function PrintReceipt({ 
  sale, 
  invoice, 
  items = [], 
  customer, 
  company, 
  printSettings,
  size = "default" 
}: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      const isInvoice = !!invoice;
      const documentTitle = isInvoice ? `Factura #${invoice.number}` : `Recibo POS #${sale?.id}`;
      const printerWidth = printSettings?.printerWidth === '58mm' ? '200px' : '300px';
      
      printWindow.document.write(`
        <html>
          <head>
            <title>${documentTitle}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                margin: 0; 
                padding: 10px; 
                font-size: ${printSettings?.printerWidth === '58mm' ? '11px' : '12px'};
              }
              .receipt { 
                width: ${printerWidth}; 
                max-width: 100%;
              }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .line { 
                border-bottom: 1px dashed #000; 
                margin: 5px 0; 
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 5px 0;
              }
              td { 
                padding: 1px 0; 
                vertical-align: top;
              }
              .item-row td {
                padding: 2px 0;
              }
              .total-section {
                margin-top: 10px;
                border-top: 1px solid #000;
                padding-top: 5px;
              }
              .company-info {
                margin-bottom: 10px;
              }
              .footer {
                margin-top: 15px;
                text-align: center;
                font-size: ${printSettings?.printerWidth === '58mm' ? '9px' : '10px'};
              }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleString('es-DO', {
      timeZone: 'America/Santo_Domingo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotals = () => {
    if (invoice) {
      return {
        subtotal: parseFloat(invoice.subtotal),
        itbis: parseFloat(invoice.itbis),
        total: parseFloat(invoice.total)
      };
    }
    
    if (sale) {
      return {
        subtotal: parseFloat(sale.subtotal),
        itbis: parseFloat(sale.itbis),
        total: parseFloat(sale.total)
      };
    }
    
    return { subtotal: 0, itbis: 0, total: 0 };
  };

  const totals = calculateTotals();

  return (
    <>
      <Button
        onClick={handlePrint}
        size={size}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        Reimprimir
      </Button>

      {/* Hidden print content */}
      <div ref={printRef} style={{ display: "none" }}>
        <div className="receipt">
          {/* Company Header */}
          <div className="company-info center">
            <div className="bold" style={{ fontSize: '14px' }}>
              {company.businessName || company.name}
            </div>
            {company.rnc && (
              <div>RNC: {company.rnc}</div>
            )}
            {company.address && (
              <div>{company.address}</div>
            )}
            {company.phone && (
              <div>Tel: {company.phone}</div>
            )}
            {company.email && (
              <div>{company.email}</div>
            )}
          </div>

          <div className="line"></div>

          {/* Document Info */}
          <div className="center">
            <div className="bold" style={{ fontSize: '13px' }}>
              {invoice ? 'FACTURA' : 'RECIBO DE VENTA'}
            </div>
            <div>
              #{invoice ? invoice.number : sale?.id}
            </div>
            <div>
              {formatDate(invoice ? invoice.date : sale?.createdAt)}
            </div>
          </div>

          {/* Customer Info */}
          {customer && (
            <>
              <div className="line"></div>
              <div>
                <div><strong>Cliente:</strong> {customer.name}</div>
                {customer.rnc && <div><strong>RNC:</strong> {customer.rnc}</div>}
                {customer.phone && <div><strong>Tel:</strong> {customer.phone}</div>}
                {customer.email && <div><strong>Email:</strong> {customer.email}</div>}
              </div>
            </>
          )}

          {/* Sale-specific customer info */}
          {sale && (sale.customerName || sale.customerPhone) && (
            <>
              <div className="line"></div>
              <div>
                {sale.customerName && <div><strong>Cliente:</strong> {sale.customerName}</div>}
                {sale.customerPhone && <div><strong>Tel:</strong> {sale.customerPhone}</div>}
              </div>
            </>
          )}

          <div className="line"></div>

          {/* Items */}
          <table>
            <thead>
              <tr style={{ borderBottom: '1px solid #000' }}>
                <td className="bold">Descripción</td>
                <td className="bold center">Cant.</td>
                <td className="bold right">Precio</td>
                <td className="bold right">Total</td>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="item-row">
                  <td style={{ paddingRight: '5px' }}>
                    Producto #{item.productId}
                  </td>
                  <td className="center">{item.quantity}</td>
                  <td className="right">{formatDOP(parseFloat(item.unitPrice))}</td>
                  <td className="right">{formatDOP(parseFloat(item.subtotal))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="line"></div>

          {/* Totals */}
          <div className="total-section">
            <table>
              <tr>
                <td>Subtotal:</td>
                <td className="right">{formatDOP(totals.subtotal)}</td>
              </tr>
              <tr>
                <td>ITBIS (18%):</td>
                <td className="right">{formatDOP(totals.itbis)}</td>
              </tr>
              <tr className="bold" style={{ borderTop: '1px solid #000', paddingTop: '3px' }}>
                <td>TOTAL:</td>
                <td className="right">{formatDOP(totals.total)}</td>
              </tr>
            </table>
          </div>

          {/* Payment info for POS sales */}
          {sale && (
            <>
              <div className="line"></div>
              <table>
                <tr>
                  <td>Método de pago:</td>
                  <td className="right">
                    {sale.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}
                  </td>
                </tr>
                {sale.paymentMethod === 'cash' && sale.cashReceived && (
                  <>
                    <tr>
                      <td>Efectivo recibido:</td>
                      <td className="right">{formatDOP(parseFloat(sale.cashReceived))}</td>
                    </tr>
                    <tr>
                      <td>Cambio:</td>
                      <td className="right">{formatDOP(parseFloat(sale.cashChange || '0'))}</td>
                    </tr>
                  </>
                )}
              </table>
            </>
          )}

          {/* NCF */}
          {(invoice?.ncf || sale?.ncf || printSettings?.showNCF) && (
            <>
              <div className="line"></div>
              <div className="center">
                <strong>NCF:</strong> {invoice?.ncf || sale?.ncf || generateNCF()}
              </div>
            </>
          )}

          <div className="line"></div>

          {/* Footer */}
          <div className="footer">
            <div>¡Gracias por su compra!</div>
            <div>Powered by Four One Solutions</div>
          </div>
        </div>
      </div>
    </>
  );
}