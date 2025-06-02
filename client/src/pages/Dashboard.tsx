import { Header } from "@/components/Header";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { RecentInvoices } from "@/components/RecentInvoices";
import { QuickActions } from "@/components/QuickActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3 } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <Header 
        title="Dashboard Principal" 
        subtitle="Resumen general de tu empresa" 
      />
      
      <div className="p-6">
        <DashboardMetrics />

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Chart */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-white">Ventas Mensuales</CardTitle>
                <Select defaultValue="6months">
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6months">Últimos 6 meses</SelectItem>
                    <SelectItem value="year">Este año</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-64 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">Gráfico de ventas mensuales</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Integrar con Chart.js o similar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-gray-900 dark:text-white">Productos Más Vendidos</CardTitle>
                <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Ver todos
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No hay datos de productos vendidos disponibles
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RecentInvoices />
          <QuickActions />
        </div>
      </div>
    </div>
  );
}
