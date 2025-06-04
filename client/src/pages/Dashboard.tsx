import { Header } from "@/components/Header";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { RecentInvoices } from "@/components/RecentInvoices";
import { QuickActions } from "@/components/QuickActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const isMobile = useIsMobile();

  return (
    <div className="w-full">
      <Header 
        title="Dashboard Principal" 
        subtitle="Resumen general de tu empresa" 
      />
      
      <div className="space-y-4 sm:space-y-6">
        {/* Metrics Cards */}
        <DashboardMetrics />

        {/* Quick Actions - Mobile First */}
        <div className="block lg:hidden">
          <QuickActions />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Sales Chart */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-3 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">
                    Ventas Mensuales
                  </CardTitle>
                  <Select defaultValue="6months">
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6months">Últimos 6 meses</SelectItem>
                      <SelectItem value="year">Este año</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="h-48 sm:h-64 lg:h-72 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
                      Gráfico de ventas mensuales
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Integrar con Chart.js o similar
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-white flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                    Crecimiento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl sm:text-2xl font-bold text-gray-500">0%</div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">vs mes anterior</p>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base text-gray-900 dark:text-white flex items-center">
                    <Users className="h-4 w-4 mr-2 text-blue-500" />
                    Clientes Activos
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xl sm:text-2xl font-bold text-blue-500">142</div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">en total</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Invoices - Full width on mobile */}
            <div className="lg:hidden">
              <RecentInvoices />
            </div>
          </div>

          {/* Right Column - Sidebar content */}
          <div className="space-y-4 sm:space-y-6">
            {/* Quick Actions - Desktop */}
            <div className="hidden lg:block">
              <QuickActions />
            </div>

            {/* Recent Activity */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-3">
                <CardTitle className="text-lg text-gray-900 dark:text-white">
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-3">
                  {[
                    { action: "Nueva factura creada", time: "Hace 2 horas", amount: "RD$ 45,000" },
                    { action: "Pago recibido", time: "Hace 5 horas", amount: "RD$ 32,500" },
                    { action: "Producto agregado", time: "Ayer", amount: null },
                    { action: "Cliente registrado", time: "Hace 2 días", amount: null },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.action}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {item.time}
                        </p>
                      </div>
                      {item.amount && (
                        <div className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400 ml-2">
                          {item.amount}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Products - Compact for mobile */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-3">
                <CardTitle className="text-lg text-gray-900 dark:text-white">
                  Productos Top
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-2">
                  {[
                    { name: "Producto A", sales: 45 },
                    { name: "Producto B", sales: 32 },
                    { name: "Producto C", sales: 28 },
                    { name: "Producto D", sales: 15 },
                  ].map((product, index) => (
                    <div key={index} className="flex items-center justify-between py-1">
                      <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate flex-1">
                        {product.name}
                      </span>
                      <div className="flex items-center ml-2">
                        <div className="w-12 sm:w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mr-2">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full" 
                            style={{ width: `${(product.sales / 50) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-6">
                          {product.sales}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Invoices - Desktop only */}
            <div className="hidden lg:block">
              <RecentInvoices />
            </div>
          </div>
        </div>

        {/* Mobile Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:hidden">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-3 text-center">
              <ShoppingCart className="h-6 w-6 mx-auto mb-1" />
              <div className="text-lg font-bold">23</div>
              <div className="text-xs opacity-90">Órdenes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-3 text-center">
              <DollarSign className="h-6 w-6 mx-auto mb-1" />
              <div className="text-lg font-bold">89K</div>
              <div className="text-xs opacity-90">Ingresos</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-3 text-center">
              <Users className="h-6 w-6 mx-auto mb-1" />
              <div className="text-lg font-bold">142</div>
              <div className="text-xs opacity-90">Clientes</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1" />
              <div className="text-lg font-bold">+15%</div>
              <div className="text-xs opacity-90">Crecimiento</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}