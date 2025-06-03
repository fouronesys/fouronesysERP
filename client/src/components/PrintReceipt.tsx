import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatDOP, generateNCF } from "@/lib/dominican";
import type {
  POSSale,
  POSSaleItem,
  Invoice,
  Customer,
  Company,
  POSPrintSettings,
} from "@shared/schema";

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
  size = "default",
}: PrintReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && printRef.current) {
      const isInvoice = !!invoice;
      const documentTitle = isInvoice
        ? `Factura #${invoice.number}`
        : `Recibo POS #${sale?.id}`;
      const printerWidth =
        printSettings?.printerWidth === "58mm" ? "200px" : "300px";

      printWindow.document.write(`
        <html>
          <head>
            <title>${documentTitle}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');

              @media print {
                body { 
                  font-family: 'Roboto', sans-serif; 
                  margin: 0; 
                  padding: 8px; 
                  font-size: ${printSettings?.printerWidth === "58mm" ? "10px" : "11px"};
                  line-height: 1.3;
                  color: #333;
                  background: white;
                }
              }
              body { 
                font-family: 'Roboto', sans-serif; 
                margin: 0; 
                padding: 10px; 
                font-size: ${printSettings?.printerWidth === "58mm" ? "11px" : "12px"};
                line-height: 1.4;
                color: #333;
                background: white;
              }
              .receipt { 
                width: ${printerWidth}; 
                max-width: 100%;
                margin: 0 auto;
                background: white;
                color: #333;
              }
              .center { text-align: center; }
              .right { text-align: right; }
              .left { text-align: left; }
              .bold { font-weight: 500; }
              .line { 
                border-bottom: 1px dashed #e0e0e0; 
                margin: 8px 0; 
                height: 1px;
              }
              .double-line {
                border-bottom: 2px solid #4a6cf7;
                margin: 10px 0;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 6px 0;
              }
              td { 
                padding: 3px 1px; 
                vertical-align: top;
                border: none;
              }
              .item-row td {
                padding: 4px 1px;
                border-bottom: 1px solid #f0f0f0;
              }
              .item-row:last-child td {
                border-bottom: none;
              }
              .total-section {
                margin-top: 12px;
                border-top: 2px solid #4a6cf7;
                padding-top: 8px;
              }
              .total-section td {
                padding: 3px 0;
                font-weight: 500;
              }
              .company-info {
                margin-bottom: 12px;
                padding-bottom: 8px;
              }
              .document-header {
                margin: 12px 0;
                padding: 8px 0;
                background: #4a6cf7;
                color: white;
                border-radius: 4px;
              }
              .customer-section {
                margin: 8px 0;
                padding: 8px;
                background: #f8faff;
                border-radius: 4px;
                border: 1px solid #e0e9ff;
              }
              .payment-section {
                margin: 8px 0;
                padding: 8px;
                border-top: 1px solid #e0e9ff;
                background: #f8faff;
                border-radius: 4px;
              }
              .footer {
                margin-top: 16px;
                text-align: center;
                font-size: ${printSettings?.printerWidth === "58mm" ? "9px" : "10px"};
                border-top: 1px dashed #e0e0e0;
                padding-top: 8px;
                color: #666;
              }
              .ncf-section {
                margin: 10px 0;
                padding: 8px;
                border: 1px solid #4a6cf7;
                background: #f0f5ff;
                text-align: center;
                font-weight: 500;
                border-radius: 4px;
              }
              .highlight {
                background: rgba(255,255,255,0.2);
                padding: 4px 8px;
                border-radius: 12px;
                display: inline-block;
                margin: 2px 0;
              }
              .logo-container {
                display: flex;
                justify-content: center;
                margin-bottom: 10px;
              }
              .logo {
                max-width: ${printSettings?.printerWidth === "58mm" ? "80px" : "100px"};
                height: auto;
                object-fit: contain;
              }
              .item-name {
                font-weight: 400;
              }
              .total-amount {
                font-weight: 700;
                color: #4a6cf7;
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
    if (!date) return "";
    return new Date(date).toLocaleString("es-DO", {
      timeZone: "America/Santo_Domingo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateTotals = () => {
    if (invoice) {
      return {
        subtotal: parseFloat(invoice.subtotal),
        itbis: parseFloat(invoice.itbis),
        total: parseFloat(invoice.total),
      };
    }

    if (sale) {
      return {
        subtotal: parseFloat(sale.subtotal),
        itbis: parseFloat(sale.itbis),
        total: parseFloat(sale.total),
      };
    }

    return { subtotal: 0, itbis: 0, total: 0 };
  };

  const totals = calculateTotals();

  const renderButton = () => {
    const buttonText = invoice ? "Imprimir Factura" : "Imprimir Recibo";
    
    return (
      <Button
        onClick={handlePrint}
        size={size}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        {buttonText}
      </Button>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Hidden print content */}
      <div ref={printRef} style={{ display: "none" }}>
        <div className="receipt">
          {/* Company Header */}
          <div className="company-info center">
            {/* Company Logo - Modern Design */}
            {company.logoUrl && printSettings?.showCompanyLogo !== false && (
              <div className="logo-container">
                <img src={company.logoUrl} alt="Logo" className="logo" />
              </div>
            )}

            <div
              className="bold"
              style={{
                fontSize: "14px",
                marginBottom: "4px",
                color: "#4a6cf7",
              }}
            >
              {company.businessName || company.name}
            </div>
            {company.rnc && (
              <div
                style={{ fontSize: "11px", marginBottom: "3px", color: "#666" }}
              >
                RNC: {company.rnc}
              </div>
            )}
            {company.address && (
              <div
                style={{ fontSize: "10px", marginBottom: "3px", color: "#666" }}
              >
                {company.address}
              </div>
            )}
            {company.phone && (
              <div
                style={{ fontSize: "10px", marginBottom: "3px", color: "#666" }}
              >
                Tel: {company.phone}
              </div>
            )}
            {company.email && (
              <div style={{ fontSize: "10px", color: "#666" }}>
                {company.email}
              </div>
            )}
          </div>

          <div className="line"></div>

          {/* Document Info */}
          <div className="document-header center">
            <div
              className="bold"
              style={{ fontSize: "14px", marginBottom: "4px" }}
            >
              {invoice ? "FACTURA" : "RECIBO DE VENTA"}
            </div>
            <div className="highlight" style={{ marginBottom: "4px" }}>
              #{invoice ? invoice.number : sale?.id}
            </div>
            <div style={{ fontSize: "10px", opacity: 0.9 }}>
              {formatDate(invoice ? invoice.date : sale?.createdAt)}
            </div>
          </div>

          {/* Customer Info */}
          {customer && (
            <>
              <div className="line"></div>
              <div className="customer-section">
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    color: "#4a6cf7",
                  }}
                >
                  INFORMACIÓN DEL CLIENTE
                </div>
                <div>
                  <strong>Cliente:</strong> {customer.name}
                </div>
                {customer.rnc && (
                  <div>
                    <strong>RNC:</strong> {customer.rnc}
                  </div>
                )}
                {customer.phone && (
                  <div>
                    <strong>Tel:</strong> {customer.phone}
                  </div>
                )}
                {customer.email && (
                  <div>
                    <strong>Email:</strong> {customer.email}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Sale-specific customer info */}
          {sale && (sale.customerName || sale.customerPhone) && (
            <>
              <div className="line"></div>
              <div className="customer-section">
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    color: "#4a6cf7",
                  }}
                >
                  INFORMACIÓN DEL CLIENTE
                </div>
                {sale.customerName && (
                  <div>
                    <strong>Cliente:</strong> {sale.customerName}
                  </div>
                )}
                {sale.customerPhone && (
                  <div>
                    <strong>Tel:</strong> {sale.customerPhone}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="line"></div>

          {/* Items */}
          <table>
            <thead>
              <tr style={{ borderBottom: "1px solid #4a6cf7" }}>
                <td className="bold" style={{ color: "#4a6cf7" }}>
                  Descripción
                </td>
                <td className="bold center" style={{ color: "#4a6cf7" }}>
                  Cant.
                </td>
                <td className="bold right" style={{ color: "#4a6cf7" }}>
                  Precio
                </td>
                <td className="bold right" style={{ color: "#4a6cf7" }}>
                  Total
                </td>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="item-row">
                  <td style={{ paddingRight: "5px" }} className="item-name">
                    {item.productName || `Producto #${item.productId}`}
                  </td>
                  <td className="center">{item.quantity}</td>
                  <td className="right">
                    {formatDOP(parseFloat(item.unitPrice))}
                  </td>
                  <td className="right">
                    {formatDOP(parseFloat(item.subtotal))}
                  </td>
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
              <tr style={{ borderTop: "1px solid #4a6cf7", paddingTop: "4px" }}>
                <td className="bold">TOTAL:</td>
                <td className="right total-amount">
                  {formatDOP(totals.total)}
                </td>
              </tr>
            </table>
          </div>

          {/* Payment info for POS sales */}
          {sale && (
            <>
              <div className="line"></div>
              <div className="payment-section">
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                    color: "#4a6cf7",
                  }}
                >
                  INFORMACIÓN DE PAGO
                </div>
                <table>
                  <tr>
                    <td>Método de pago:</td>
                    <td className="right bold">
                      {sale.paymentMethod === "cash" ? "Efectivo" : "Tarjeta"}
                    </td>
                  </tr>
                  {sale.paymentMethod === "cash" && sale.cashReceived && (
                    <>
                      <tr>
                        <td>Efectivo recibido:</td>
                        <td className="right">
                          {formatDOP(parseFloat(sale.cashReceived))}
                        </td>
                      </tr>
                      <tr>
                        <td>Cambio:</td>
                        <td className="right bold">
                          {formatDOP(parseFloat(sale.cashChange || "0"))}
                        </td>
                      </tr>
                    </>
                  )}
                </table>
              </div>
            </>
          )}

          {/* NCF */}
          {(invoice?.ncf || sale?.ncf || printSettings?.showNCF) && (
            <div className="ncf-section">
              <div>NCF: {invoice?.ncf || sale?.ncf || generateNCF()}</div>
            </div>
          )}

          <div className="line"></div>

          {/* Footer */}
          <div className="footer">
            <div
              style={{
                marginBottom: "8px",
                fontSize: "11px",
                fontWeight: "bold",
                color: "#4a6cf7",
              }}
            >
              ¡Gracias por su compra!
            </div>
            {printSettings?.receiptFooter && (
              <div style={{ marginBottom: "6px", fontSize: "10px" }}>
                {printSettings.receiptFooter}
              </div>
            )}
            <div style={{ fontSize: "9px", marginTop: "8px" }}>
              Powered by{" "}
              <span style={{ fontWeight: "500", color: "#4a6cf7" }}>
                Four One Solutions
              </span>
            </div>
            <div style={{ fontSize: "8px" }}>www.1111.com.do</div>
          </div>
        </div>
      </div>
    </>
  );
}
