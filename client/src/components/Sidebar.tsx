import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  FileText, 
  Users, 
  ChartBar, 
  Package, 
  Warehouse, 
  ArrowLeftRight,
  Factory,
  List,
  FlaskConical,
  Truck,
  ShoppingCart,
  Star,
  CreditCard
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    category: "Ventas",
    items: [
      { name: "Punto de Venta (POS)", href: "/pos", icon: CreditCard },
      { name: "Facturación", href: "/billing", icon: FileText },
      { name: "Clientes", href: "/customers", icon: Users },
      { name: "Reportes de Ventas", href: "/sales-reports", icon: ChartBar },
    ],
  },
  {
    category: "Inventario",
    items: [
      { name: "Productos", href: "/products", icon: Package },
      { name: "Almacenes", href: "/warehouses", icon: Warehouse },
      { name: "Movimientos", href: "/movements", icon: ArrowLeftRight },
    ],
  },
  {
    category: "Producción",
    items: [
      { name: "Órdenes de Producción", href: "/manufacturing", icon: Factory },
      { name: "Lista de Materiales (BOM)", href: "/bom", icon: List },
      { name: "Recetas", href: "/recipes", icon: FlaskConical },
    ],
  },
  {
    category: "Compras",
    items: [
      { name: "Proveedores", href: "/suppliers", icon: Truck },
      { name: "Órdenes de Compra", href: "/purchase-orders", icon: ShoppingCart },
    ],
  },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white dark:bg-gray-900 theme-blue:bg-gradient-to-b theme-blue:from-blue-600 theme-blue:to-blue-700 border-r border-gray-200 dark:border-gray-700 theme-blue:border-blue-500 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 theme-blue:border-blue-500">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            4
          </div>
          <div className="ml-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white theme-blue:text-white">
              Four One System
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 theme-blue:text-blue-100">
              ERP Empresarial
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item, index) => {
          if ("href" in item) {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 theme-blue:bg-white/20 theme-blue:text-white"
                      : "text-gray-700 dark:text-gray-300 theme-blue:text-blue-100 hover:bg-gray-100 dark:hover:bg-gray-800 theme-blue:hover:bg-white/10"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              </Link>
            );
          }

          return (
            <div key={index} className="pt-4">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 theme-blue:text-blue-200 uppercase tracking-wider">
                {item.category}
              </h3>
              <div className="mt-2 space-y-1">
                {item.items.map((subItem) => {
                  const isActive = location === subItem.href;
                  return (
                    <Link key={subItem.name} href={subItem.href}>
                      <a
                        className={cn(
                          "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          isActive
                            ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 theme-blue:bg-white/20 theme-blue:text-white"
                            : "text-gray-700 dark:text-gray-300 theme-blue:text-blue-100 hover:bg-gray-100 dark:hover:bg-gray-800 theme-blue:hover:bg-white/10"
                        )}
                      >
                        <subItem.icon className="mr-3 h-5 w-5" />
                        {subItem.name}
                      </a>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Trial Info */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 theme-blue:border-blue-500">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-3 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Prueba Gratuita</p>
              <p className="text-xs opacity-90">5 días restantes</p>
            </div>
            <Star className="h-5 w-5 text-yellow-300" />
          </div>
          <button className="w-full mt-2 bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-xs font-medium transition-colors">
            Ver Planes
          </button>
        </div>
      </div>
    </aside>
  );
}
