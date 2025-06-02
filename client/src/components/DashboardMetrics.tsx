import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, FileText, Package, Factory } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsData {
  monthSales: string;
  pendingInvoices: number;
  productsInStock: number;
  productionOrders: number;
}

export function DashboardMetrics() {
  const { data: metrics, isLoading } = useQuery<MetricsData>({
    queryKey: ["/api/dashboard/metrics"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
    }).format(num);
  };

  const metricsCards = [
    {
      title: "Ventas del Mes",
      value: formatCurrency(metrics?.monthSales || "0"),
      change: "+12.5%",
      changeText: "vs mes anterior",
      changeColor: "text-green-600 dark:text-green-400",
      icon: BarChart3,
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Facturas Pendientes",
      value: metrics?.pendingInvoices || 0,
      change: "-3",
      changeText: "desde ayer",
      changeColor: "text-red-600 dark:text-red-400",
      icon: FileText,
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      title: "Productos en Stock",
      value: metrics?.productsInStock || 0,
      change: "15 agotándose",
      changeText: "",
      changeColor: "text-yellow-600 dark:text-yellow-400",
      icon: Package,
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
    },
    {
      title: "Órdenes de Producción",
      value: metrics?.productionOrders || 0,
      change: "3 en proceso",
      changeText: "",
      changeColor: "text-blue-600 dark:text-blue-400",
      icon: Factory,
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricsCards.map((card, index) => (
        <Card key={index} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {card.value}
                </p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${card.changeColor}`}>
                    {card.change}
                  </span>
                  {card.changeText && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {card.changeText}
                    </span>
                  )}
                </div>
              </div>
              <div className={`p-3 rounded-lg ${card.iconBg}`}>
                <card.icon className={`text-xl h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
