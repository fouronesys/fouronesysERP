import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, DollarSign, FileText, Download, Filter, BarChart3 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Invoice, POSSale } from "@shared/schema";

export default function SalesReports() {
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("all");
  const isMobile = useIsMobile();

  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: posSales, isLoading: posLoading } = useQuery<POSSale[]>({
    queryKey: ["/api/pos/sales"],
  });

  const isLoading = invoicesLoading || posLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(amount);
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

  const getFilteredInvoices = () => {
    if (!invoices) return [];
    const filtered = filterSalesByDate(invoices, parseInt(dateRange));
    return reportType === "invoices" || reportType === "all" ? filtered : [];
  };

  const getFilteredPOSSales = () => {
    if (!posSales) return [];
    const filtered = filterSalesByDate(posSales, parseInt(dateRange));
    return reportType === "pos" || reportType === "all" ? filtered : [];
  };

  const getTotalRevenue = () => {
    const invoiceTotal = getFilteredInvoices().reduce((sum, invoice) => sum + invoice.total, 0);
    const posTotal = getFilteredPOSSales().reduce((sum, sale) => sum + sale.total, 0);
    return invoiceTotal + posTotal;
  };

  const getTotalTransactions = () => {
    return getFilteredInvoices().length + getFilteredPOSSales().length;
  };

  const getAverageTicket = () => {
    const total = getTotalRevenue();
    const transactions = getTotalTransactions();
    return transactions > 0 ? total / transactions : 0;
  };

  const getPaidInvoices = () => {
    return getFilteredInvoices().filter(invoice => invoice.status === "paid").length;
  };

  const getTopProducts = () => {
    // Esta función requeriría datos de items de venta que no están disponibles en el esquema actual
    return [];
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <Header title="Reportes de Ventas" subtitle="Análisis detallado de tus ventas" />
        <div className="p-4 sm:p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando reportes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Header title="Reportes de Ventas" subtitle="Análisis detallado de tus ventas" />
      
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
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

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
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

              <div className="sm:col-span-2 flex items-end">
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Reporte
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    Ingresos Totales
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400 truncate">
                    {formatCurrency(getTotalRevenue())}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Transacciones
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {getTotalTransactions()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    Ticket Promedio
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400 truncate">
                    {formatCurrency(getAverageTicket())}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    Facturas Pagadas
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {getPaidInvoices()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Invoices */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Facturas ({getFilteredInvoices().length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getFilteredInvoices().length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No hay facturas en este período
                </p>
              ) : (
                getFilteredInvoices().slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">Factura #{invoice.number}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(invoice.date).toLocaleDateString('es-DO')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(invoice.total)}</p>
                      <Badge 
                        variant="outline" 
                        className={
                          invoice.status === "paid" 
                            ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300" 
                            : "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300"
                        }
                      >
                        {invoice.status === "paid" ? "Pagada" : "Pendiente"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* POS Sales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Ventas POS ({getFilteredPOSSales().length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {getFilteredPOSSales().length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No hay ventas POS en este período
                </p>
              ) : (
                getFilteredPOSSales().slice(0, 5).map((sale) => (
                  <div key={sale.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">Venta POS #{sale.id}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(sale.createdAt).toLocaleDateString('es-DO')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatCurrency(sale.total)}</p>
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300">
                        Completada
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumen del Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(getFilteredInvoices().reduce((sum, inv) => sum + inv.total, 0))}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Facturas</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(getFilteredPOSSales().reduce((sum, sale) => sum + sale.total, 0))}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ventas POS</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getFilteredInvoices().length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Facturas emitidas</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getFilteredPOSSales().length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ventas realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}