import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
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
  CreditCard,
  Menu,
  X,
  Settings,
  ShieldCheck,
  Calculator,
  Brain,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  UserCog
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useTranslation } from "@/lib/i18n";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import logoImage from "@assets/Four One Solutions Logo_20250130_143401_0000.png";

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
    category: "Logística",
    items: [
      { name: "Proveedores", href: "/suppliers", icon: Truck },
      { name: "Ventas POS", href: "/pos-sales", icon: ShoppingCart },
    ],
  },
  {
    category: "Recursos Humanos",
    items: [
      { name: "Empleados", href: "/employees", icon: Users },
      { name: "Nómina", href: "/payroll", icon: Calculator },
    ],
  },
  {
    category: "Cumplimiento Fiscal",
    items: [
      { name: "Comprobantes Fiscales", href: "/fiscal-documents", icon: FileText },
    ],
  },
  {
    category: "Inteligencia Artificial",
    items: [
      { name: "Insights con IA", href: "/ai-insights", icon: Brain },
    ],
  },
  {
    category: "Comunicación",
    items: [
      { name: "Chat Interno", href: "/chat", icon: MessageCircle },
      { name: "Gestión de Usuarios", href: "/user-management", icon: UserCog },
    ],
  },
  {
    category: "Configuración",
    items: [
      { name: "Empresa", href: "/company-settings", icon: Settings },
    ],
  },

];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { currentPlan, daysUntilExpiry } = useSubscription();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Dynamic navigation with translations
  const getNavigationItems = () => [
    {
      name: t('nav.dashboard'),
      href: "/",
      icon: BarChart3,
    },
    {
      category: "Ventas",
      items: [
        { name: t('nav.pos'), href: "/pos", icon: CreditCard },
        { name: t('nav.billing'), href: "/billing", icon: FileText },
        { name: t('nav.customers'), href: "/customers", icon: Users },
        { name: "Reportes de Ventas", href: "/sales-reports", icon: ChartBar },
      ],
    },
    {
      category: t('nav.inventory'),
      items: [
        { name: t('nav.products'), href: "/products", icon: Package },
        { name: t('nav.warehouses'), href: "/warehouses", icon: Warehouse },
        { name: "Movimientos", href: "/movements", icon: ArrowLeftRight },
      ],
    },
    {
      category: t('nav.manufacturing'),
      items: [
        { name: "Órdenes de Producción", href: "/manufacturing", icon: Factory },
        { name: "Lista de Materiales (BOM)", href: "/bom", icon: List },
        { name: "Recetas", href: "/recipes", icon: FlaskConical },
      ],
    },
    {
      category: "Recursos Humanos",
      items: [
        { name: t('nav.employees'), href: "/employees", icon: Users },
        { name: t('nav.payroll'), href: "/payroll", icon: Calculator },
      ],
    },
    {
      category: "Análisis",
      items: [
        { name: t('nav.reports'), href: "/reports", icon: ChartBar },
        { name: t('nav.aiInsights'), href: "/ai-insights", icon: Brain },
        { name: t('nav.chat'), href: "/chat", icon: MessageCircle },
      ],
    },
    {
      category: t('nav.settings'),
      items: [
        { name: "Empresa", href: "/company-settings", icon: Settings },
      ],
    },
  ];

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  // Cerrar menú móvil al hacer clic fuera
  useEffect(() => {
    if (isOpen && isMobile) {
      const handleClickOutside = (event: MouseEvent) => {
        const sidebar = document.getElementById('mobile-sidebar');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, isMobile]);

  const sidebarContent = (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 theme-blue:bg-gradient-to-b theme-blue:from-blue-600 theme-blue:to-blue-700">
      {/* Header */}
      <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 theme-blue:border-blue-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center min-w-0">
            <img 
              src={logoImage} 
              alt="Four One Solutions" 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0"
            />
            {!isCollapsed && (
              <div className="ml-2 sm:ml-3 min-w-0">
                <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white theme-blue:text-white truncate">
                  Four One Solutions
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 theme-blue:text-blue-100 hidden sm:block">
                  Sistema ERP
                </p>
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 theme-blue:text-blue-100 theme-blue:hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
        {getNavigationItems().map((item, index) => {
          if ("href" in item) {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href || "#"}
                className={cn(
                  "group flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 theme-blue:bg-white/20 theme-blue:text-white"
                    : "text-gray-700 dark:text-gray-300 theme-blue:text-blue-100 hover:bg-gray-100 dark:hover:bg-gray-800 theme-blue:hover:bg-white/10"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                {Icon && <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0", isCollapsed ? "mr-0" : "mr-2 sm:mr-3")} />}
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          }

          return (
            <div key={index} className="pt-3 sm:pt-4">
              <h3 className="px-2 sm:px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 theme-blue:text-blue-200 uppercase tracking-wider">
                {item.category}
              </h3>
              <div className="mt-1 sm:mt-2 space-y-1">
                {item.items?.map((subItem) => {
                  const isActive = location === subItem.href;
                  const Icon = subItem.icon;
                  return (
                    <Link 
                      key={subItem.name} 
                      href={subItem.href || "#"}
                      className={cn(
                        "group flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors",
                        isActive
                          ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 theme-blue:bg-white/20 theme-blue:text-white"
                          : "text-gray-700 dark:text-gray-300 theme-blue:text-blue-100 hover:bg-gray-100 dark:hover:bg-gray-800 theme-blue:hover:bg-white/10"
                      )}
                    >
                      {Icon && <Icon className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />}
                      <span className="truncate">{subItem.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Super Admin Access */}
        {user && (user as any)?.role === 'super_admin' && (
          <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700 theme-blue:border-blue-500">
            <h3 className="px-2 sm:px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 theme-blue:text-blue-200 uppercase tracking-wider">
              Administración
            </h3>
            <div className="mt-1 sm:mt-2">
              <Link 
                href="/super-admin"
                className={cn(
                  "group flex items-center px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors",
                  location === "/super-admin"
                    ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 theme-blue:bg-white/20 theme-blue:text-white"
                    : "text-gray-700 dark:text-gray-300 theme-blue:text-blue-100 hover:bg-gray-100 dark:hover:bg-gray-800 theme-blue:hover:bg-white/10"
                )}
              >
                <ShieldCheck className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">Panel de Admin</span>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Trial Info - Hidden on mobile to save space */}
      {currentPlan === "trial" && (
        <div className="hidden sm:block p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 theme-blue:border-blue-500">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-3 text-white">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">Prueba Gratuita</p>
                <p className="text-xs opacity-90 truncate">
                  {daysUntilExpiry > 0 ? `${daysUntilExpiry} días restantes` : "Expirado"}
                </p>
              </div>
              <Star className="h-5 w-5 text-yellow-300 flex-shrink-0" />
            </div>
            <button className="w-full mt-2 bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-xs font-medium transition-colors">
              Ver Planes
            </button>
          </div>
        </div>
      )}

      {/* Language Selector */}
      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 theme-blue:border-blue-500">
        <LanguageSelector />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-md lg:hidden"
        >
          <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        </button>

        {/* Mobile Overlay */}
        {isOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />
        )}

        {/* Mobile Sidebar */}
        <aside
          id="mobile-sidebar"
          className={cn(
            "fixed left-0 top-0 z-50 h-full w-64 sm:w-72 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 lg:hidden",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  // Desktop Sidebar
  return (
    <>
      {/* Desktop Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-md hidden lg:block transition-all duration-300"
        style={{ left: isCollapsed ? '4px' : '272px' }}
      >
        {isCollapsed ? (
          <Menu className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        ) : (
          <X className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      <aside 
        className={cn(
          "hidden lg:flex border-r border-gray-200 dark:border-gray-700 theme-blue:border-blue-500 h-screen overflow-hidden transition-all duration-300",
          isCollapsed ? "w-0" : "w-64 xl:w-72"
        )}
      >
        {!isCollapsed && sidebarContent}
      </aside>
    </>
  );
}