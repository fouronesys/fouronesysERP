import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Download, 
  Filter, 
  BarChart3,
  Users,
  ShoppingCart,
  Eye,
  FileSpreadsheet,
  FileImage,
  FileType
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { reportExporter, type ReportData } from "@/lib/reportExporter";
import type { Invoice, POSSale } from "@shared/schema";

export default function SalesReports() {
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("all");
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel" | "word" | "txt">("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const isMobile = useIsMobile();

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: posSales, isLoading: posLoading } = useQuery<POSSale[]>({
    queryKey: ["/api/pos/sales"],
  });

  const { data: company } = useQuery({
    queryKey: ["/api/companies/current"],
  });

  const isLoading = invoicesLoading || posLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDateRangeFilter = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    return { startDate, endDate };
  };

  const filterSalesByDate = (sales: any[], days: number) => {
    const { startDate } = getDateRangeFilter(days);
    return sales.filter(sale => new Date(sale.date || sale.createdAt) >= startDate);
  };

  const reportMetrics = useMemo(() => {
    const filteredInvoices = invoices ? filterSalesByDate(invoices, parseInt(dateRange)) : [];
    const filteredPOSSales = posSales ? filterSalesByDate(posSales, parseInt(dateRange)) : [];
    
    const invoiceData = (reportType === "invoices" || reportType === "all") ? filteredInvoices : [];
    const posData = (reportType === "pos" || reportType === "all") ? filteredPOSSales : [];
    
    const totalRevenue = invoiceData.reduce((sum, invoice) => sum + invoice.total, 0) + 
                        posData.reduce((sum, sale) => sum + sale.total, 0);
    
    const totalTransactions = invoiceData.length + posData.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    const paidInvoices = invoiceData.filter(invoice => invoice.status === "paid").length;
    
    const allTransactions = [
      ...invoiceData.map(invoice => ({
        date: invoice.date || invoice.createdAt?.toISOString() || new Date().toISOString(),
        type: "Factura",
        id: invoice.invoiceNumber || `INV-${invoice.id}`,
        customer: invoice.customerName || "Cliente General",
        amount: invoice.total,
        status: invoice.status || "pendiente"
      })),
      ...posData.map(sale => ({
        date: sale.createdAt?.toISOString() || new Date().toISOString(),
        type: "POS",
        id: `POS-${sale.id}`,
        customer: sale.customerName || "Cliente General",
        amount: sale.total,
        status: "completado"
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      totalRevenue,
      totalTransactions,
      averageTicket,
      paidInvoices,
      transactions: allTransactions
    };
  }, [invoices, posSales, dateRange, reportType]);

  const getPeriodLabel = () => {
    const days = parseInt(dateRange);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    return `${startDate.toLocaleDateString('es-DO')} - ${endDate.toLocaleDateString('es-DO')}`;
  };

  const handleExportReport = async (format: "pdf" | "excel" | "word" | "txt") => {
    if (isExporting) return;
    
    setIsExporting(true);
    
    try {
      const reportData: ReportData = {
        title: "Reporte de Ventas",
        period: getPeriodLabel(),
        companyName: company?.name || "Mi Empresa",
        companyLogo: company?.logo,
        summary: {
          totalRevenue: reportMetrics.totalRevenue,
          totalTransactions: reportMetrics.totalTransactions,
          averageTicket: reportMetrics.averageTicket,
          paidInvoices: reportMetrics.paidInvoices
        },
        transactions: reportMetrics.transactions
      };

      switch (format) {
        case "pdf":
          await reportExporter.exportToPDF(reportData);
          break;
        case "excel":
          await reportExporter.exportToExcel(reportData);
          break;
        case "word":
          await reportExporter.exportToWord(reportData);
          break;
        case "txt":
          await reportExporter.exportToTXT(reportData);
          break;
      }

      toast({
        title: "Reporte exportado",
        description: `El reporte se ha exportado exitosamente en formato ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      toast({
        title: "Error al exportar",
        description: "No se pudo exportar el reporte. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
        <Header title="Reportes de Ventas" subtitle="Análisis detallado de tus ventas" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Cargando reportes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header title="Reportes de Ventas" subtitle="Análisis detallado de tus ventas" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Filters Section */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filtros de Reporte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Period Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Período
                  </label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Últimos 7 días</SelectItem>
                      <SelectItem value="30">Últimos 30 días</SelectItem>
                      <SelectItem value="90">Últimos 3 meses</SelectItem>
                      <SelectItem value="365">Último año</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Report Type Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tipo de Venta
                  </label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las ventas</SelectItem>
                      <SelectItem value="invoices">Solo facturas</SelectItem>
                      <SelectItem value="pos">Solo POS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Export Format */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Formato de Exportación
                  </label>
                  <Select value={exportFormat} onValueChange={(value: "pdf" | "excel" | "word" | "txt") => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF (con estilos)</SelectItem>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="word">Word (.docx)</SelectItem>
                      <SelectItem value="txt">Texto (.txt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Export Button */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Acción
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        disabled={isExporting}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {isExporting ? "Exportando..." : "Exportar Reporte"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleExportReport("pdf")}>
                        <FileImage className="h-4 w-4 mr-2" />
                        PDF (con estilos)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportReport("excel")}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Excel (.xlsx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportReport("word")}>
                        <FileText className="h-4 w-4 mr-2" />
                        Word (.docx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportReport("txt")}>
                        <FileType className="h-4 w-4 mr-2" />
                        Texto (.txt)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Ingresos Totales
                </CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(reportMetrics.totalRevenue)}
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  En {dateRange} días
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
                  Total Transacciones
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {reportMetrics.totalTransactions}
                </div>
                <p className="text-xs text-green-700 dark:text-green-300">
                  Ventas procesadas
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  Ticket Promedio
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {formatCurrency(reportMetrics.averageTicket)}
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  Por transacción
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Facturas Pagadas
                </CardTitle>
                <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {reportMetrics.paidInvoices}
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Facturas completadas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transactions Table */}
          <Card className="border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Detalle de Transacciones
                <Badge variant="secondary" className="ml-2">
                  {reportMetrics.transactions.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportMetrics.transactions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No hay transacciones en el período seleccionado
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Desktop Table */}
                    <div className="hidden sm:block">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                              Fecha
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                              Tipo
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                              ID
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                              Cliente
                            </th>
                            <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                              Monto
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportMetrics.transactions.slice(0, 50).map((transaction, index) => (
                            <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                                {formatDate(transaction.date)}
                              </td>
                              <td className="py-3 px-4">
                                <Badge variant={transaction.type === "Factura" ? "default" : "secondary"}>
                                  {transaction.type}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm font-mono text-gray-600 dark:text-gray-300">
                                {transaction.id}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">
                                {transaction.customer}
                              </td>
                              <td className="py-3 px-4 text-sm font-medium text-right text-gray-900 dark:text-gray-100">
                                {formatCurrency(transaction.amount)}
                              </td>
                              <td className="py-3 px-4">
                                <Badge 
                                  variant={transaction.status === "paid" || transaction.status === "completado" ? "default" : "secondary"}
                                >
                                  {transaction.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden space-y-4">
                      {reportMetrics.transactions.slice(0, 20).map((transaction, index) => (
                        <Card key={index} className="border-gray-200 dark:border-gray-700">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {transaction.id}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {formatDate(transaction.date)}
                                </p>
                              </div>
                              <Badge variant={transaction.type === "Factura" ? "default" : "secondary"}>
                                {transaction.type}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                Cliente: {transaction.customer}
                              </p>
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {formatCurrency(transaction.amount)}
                                </span>
                                <Badge 
                                  variant={transaction.status === "paid" || transaction.status === "completado" ? "default" : "secondary"}
                                >
                                  {transaction.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {reportMetrics.transactions.length > (isMobile ? 20 : 50) && (
                      <div className="text-center mt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Mostrando {isMobile ? 20 : 50} de {reportMetrics.transactions.length} transacciones.
                          Exporta el reporte completo para ver todos los datos.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}