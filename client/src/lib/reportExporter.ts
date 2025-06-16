import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

export interface ReportData {
  title: string;
  period: string;
  companyName: string;
  companyLogo?: string;
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageTicket: number;
    paidInvoices: number;
  };
  transactions: Array<{
    date: string;
    type: string;
    id: string;
    customer: string;
    amount: number;
    status: string;
  }>;
  topProducts?: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

export class ReportExporter {
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  }

  private formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  async exportToPDF(data: ReportData): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header with company info
    if (data.companyLogo) {
      try {
        doc.addImage(data.companyLogo, 'PNG', 20, 15, 30, 30);
      } catch (error) {
        console.warn('Error adding logo to PDF:', error);
      }
    }
    
    // Title and company name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(data.title, data.companyLogo ? 60 : 20, 25);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(data.companyName, data.companyLogo ? 60 : 20, 35);
    
    doc.setFontSize(12);
    doc.text(`Período: ${data.period}`, data.companyLogo ? 60 : 20, 45);
    
    // Add generation date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-DO')}`, pageWidth - 60, 20);
    
    // Reset text color
    doc.setTextColor(0);
    
    // Summary section
    let yPosition = 65;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen Ejecutivo', 20, yPosition);
    
    yPosition += 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const summaryData = [
      ['Ingresos Totales', this.formatCurrency(data.summary.totalRevenue)],
      ['Total de Transacciones', data.summary.totalTransactions.toString()],
      ['Ticket Promedio', this.formatCurrency(data.summary.averageTicket)],
      ['Facturas Pagadas', data.summary.paidInvoices.toString()]
    ];
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Métrica', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold' } },
      margin: { left: 20, right: 20 }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 20;
    
    // Transactions table
    if (data.transactions.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalle de Transacciones', 20, yPosition);
      
      yPosition += 10;
      
      const transactionData = data.transactions.map(transaction => [
        this.formatDate(transaction.date),
        transaction.type,
        transaction.id,
        transaction.customer,
        this.formatCurrency(transaction.amount),
        transaction.status
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Fecha', 'Tipo', 'ID', 'Cliente', 'Monto', 'Estado']],
        body: transactionData,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 
          0: { cellWidth: 25 },
          1: { cellWidth: 20 },
          2: { cellWidth: 25 },
          3: { cellWidth: 40 },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 20 }
        },
        margin: { left: 20, right: 20 }
      });
    }
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Página ${i} de ${pageCount} - Four One Solutions`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Save the PDF
    doc.save(`reporte-ventas-${data.period}.pdf`);
  }

  async exportToExcel(data: ReportData): Promise<void> {
    const workbook = XLSX.utils.book_new();
    
    // Summary worksheet
    const summaryData = [
      ['REPORTE DE VENTAS'],
      [data.companyName],
      [`Período: ${data.period}`],
      [`Generado: ${new Date().toLocaleDateString('es-DO')}`],
      [],
      ['RESUMEN EJECUTIVO'],
      ['Métrica', 'Valor'],
      ['Ingresos Totales', this.formatCurrency(data.summary.totalRevenue)],
      ['Total de Transacciones', data.summary.totalTransactions],
      ['Ticket Promedio', this.formatCurrency(data.summary.averageTicket)],
      ['Facturas Pagadas', data.summary.paidInvoices],
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Style the summary sheet
    summaryWS['!cols'] = [{ width: 25 }, { width: 20 }];
    
    XLSX.utils.book_append_sheet(workbook, summaryWS, 'Resumen');
    
    // Transactions worksheet
    if (data.transactions.length > 0) {
      const transactionHeaders = ['Fecha', 'Tipo', 'ID', 'Cliente', 'Monto', 'Estado'];
      const transactionData = data.transactions.map(transaction => [
        this.formatDate(transaction.date),
        transaction.type,
        transaction.id,
        transaction.customer,
        transaction.amount,
        transaction.status
      ]);
      
      const transactionsWS = XLSX.utils.aoa_to_sheet([transactionHeaders, ...transactionData]);
      
      // Style the transactions sheet
      transactionsWS['!cols'] = [
        { width: 15 }, // Fecha
        { width: 12 }, // Tipo
        { width: 15 }, // ID
        { width: 25 }, // Cliente
        { width: 15 }, // Monto
        { width: 12 }  // Estado
      ];
      
      XLSX.utils.book_append_sheet(workbook, transactionsWS, 'Transacciones');
    }
    
    // Top products worksheet
    if (data.topProducts && data.topProducts.length > 0) {
      const productHeaders = ['Producto', 'Cantidad', 'Ingresos'];
      const productData = data.topProducts.map(product => [
        product.name,
        product.quantity,
        product.revenue
      ]);
      
      const productsWS = XLSX.utils.aoa_to_sheet([productHeaders, ...productData]);
      productsWS['!cols'] = [{ width: 30 }, { width: 12 }, { width: 15 }];
      
      XLSX.utils.book_append_sheet(workbook, productsWS, 'Productos Top');
    }
    
    // Save the Excel file
    XLSX.writeFile(workbook, `reporte-ventas-${data.period}.xlsx`);
  }

  async exportToWord(data: ReportData): Promise<void> {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: data.title,
                bold: true,
                size: 32,
                color: "2980B9"
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          
          // Company info
          new Paragraph({
            children: [
              new TextRun({
                text: data.companyName,
                bold: true,
                size: 24
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `Período: ${data.period}`,
                size: 20
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: `Generado el: ${new Date().toLocaleDateString('es-DO')}`,
                size: 16,
                italics: true
              })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 300 }
          }),
          
          // Summary section
          new Paragraph({
            children: [
              new TextRun({
                text: "Resumen Ejecutivo",
                bold: true,
                size: 24,
                color: "2980B9"
              })
            ],
            spacing: { before: 200, after: 200 }
          }),
          
          // Summary table
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Métrica", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Valor", bold: true })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ingresos Totales" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: this.formatCurrency(data.summary.totalRevenue) })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Total de Transacciones" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.summary.totalTransactions.toString() })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ticket Promedio" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: this.formatCurrency(data.summary.averageTicket) })] })] })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Facturas Pagadas" })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: data.summary.paidInvoices.toString() })] })] })
                ]
              })
            ]
          }),
          
          // Transactions section
          ...(data.transactions.length > 0 ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Detalle de Transacciones",
                  bold: true,
                  size: 24,
                  color: "2980B9"
                })
              ],
              spacing: { before: 400, after: 200 }
            }),
            
            new Paragraph({
              children: [
                new TextRun({
                  text: `Total de ${data.transactions.length} transacciones en el período seleccionado.`,
                  size: 18
                })
              ],
              spacing: { after: 200 }
            })
          ] : [])
        ]
      }]
    });
    
    // Save the Word document
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, `reporte-ventas-${data.period}.docx`);
  }

  async exportToTXT(data: ReportData): Promise<void> {
    let content = '';
    
    // Header
    content += '='.repeat(60) + '\n';
    content += `${data.title}\n`;
    content += `${data.companyName}\n`;
    content += `Período: ${data.period}\n`;
    content += `Generado: ${new Date().toLocaleDateString('es-DO')}\n`;
    content += '='.repeat(60) + '\n\n';
    
    // Summary
    content += 'RESUMEN EJECUTIVO\n';
    content += '-'.repeat(30) + '\n';
    content += `Ingresos Totales: ${this.formatCurrency(data.summary.totalRevenue)}\n`;
    content += `Total de Transacciones: ${data.summary.totalTransactions}\n`;
    content += `Ticket Promedio: ${this.formatCurrency(data.summary.averageTicket)}\n`;
    content += `Facturas Pagadas: ${data.summary.paidInvoices}\n\n`;
    
    // Transactions
    if (data.transactions.length > 0) {
      content += 'DETALLE DE TRANSACCIONES\n';
      content += '-'.repeat(30) + '\n';
      content += 'Fecha\t\tTipo\t\tID\t\tCliente\t\tMonto\t\tEstado\n';
      content += '-'.repeat(80) + '\n';
      
      data.transactions.forEach(transaction => {
        content += `${this.formatDate(transaction.date)}\t`;
        content += `${transaction.type}\t\t`;
        content += `${transaction.id}\t`;
        content += `${transaction.customer}\t`;
        content += `${this.formatCurrency(transaction.amount)}\t`;
        content += `${transaction.status}\n`;
      });
    }
    
    content += '\n' + '='.repeat(60) + '\n';
    content += 'Reporte generado por Four One Solutions\n';
    content += 'https://fourone.com.do\n';
    
    // Save the TXT file
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `reporte-ventas-${data.period}.txt`);
  }
}

export const reportExporter = new ReportExporter();