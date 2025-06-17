import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  UserCog,
  Bug,
  Image,
  Building2,
  Activity,
  Crown,
  Sparkles,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useIsMobile } from "@/hooks/use-mobile";
import logoImage from "@assets/Four One Solutions Logo_20250130_143033_0000_1750054689746.png";

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
      { name: "Control de Stock", href: "/inventory", icon: Warehouse },
      { name: "Almacenes", href: "/warehouses", icon: Warehouse },
      { name: "Movimientos", href: "/movements", icon: ArrowLeftRight },
    ],
  },
  {
    category: "Producción",
    items: [
      { name: "Módulo de Producción", href: "/production", icon: Factory },
    ],
  },
  {
    category: "Compras",
    items: [
      { name: "Módulo de Compras", href: "/purchases", icon: ShoppingCart },
      { name: "Ventas POS", href: "/pos-sales", icon: Star },
    ],
  },
  {
    category: "Fiscal",
    items: [
      { name: "Gestión Fiscal", href: "/fiscal-management", icon: FileText },
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
    category: "Contabilidad",
    items: [
      { name: "Contabilidad", href: "/accounting", icon: Calculator },
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
      { name: "Gestión de Errores", href: "/error-management", icon: Bug },
      { name: "Monitoreo del Sistema", href: "/system-monitoring", icon: Activity },
    ],
  },

];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { currentPlan, daysUntilExpiry } = useSubscription();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Ventas']));

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-white dark:from-gray-900 dark:to-gray-800 backdrop-blur-xl border-r border-slate-200/50 dark:border-gray-700/50"
    >
      {/* Header */}
      <motion.div 
        className="p-4 lg:p-6 border-b border-slate-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-600/5 to-purple-600/5 dark:from-blue-500/10 dark:to-purple-500/10"
        whileHover={{ scale: 1.02 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center min-w-0"
            initial={{ x: -20 }}
            animate={{ x: 0 }}
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <img 
                src={logoImage} 
                alt="Four One Solutions" 
                className="w-10 h-10 object-contain flex-shrink-0 rounded-xl shadow-lg"
              />
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity
                }}
              />
            </motion.div>
            {!isCollapsed && (
              <motion.div 
                className="ml-3 min-w-0"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent truncate">
                  Four One Solutions
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400 hidden sm:block">
                    Sistema ERP
                  </p>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles className="w-3 h-3 text-blue-500" />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>
          {isMobile && (
            <motion.button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="h-5 w-5" />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {navigation.map((item, index) => {
          if ("href" in item) {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link 
                  href={item.href || "#"}
                  className={cn(
                    "group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden",
                    isActive
                      ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25"
                      : "text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-gray-800 dark:hover:to-gray-750"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    layoutId={isActive ? "activeBackground" : undefined}
                  />
                  {Icon && (
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="relative z-10"
                    >
                      <Icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed ? "mr-0" : "mr-3")} />
                    </motion.div>
                  )}
                  {!isCollapsed && (
                    <span className="truncate relative z-10">{item.name}</span>
                  )}
                  {isActive && (
                    <motion.div
                      className="absolute right-2 w-2 h-2 bg-white rounded-full"
                      layoutId="activeIndicator"
                      transition={{ type: "spring", stiffness: 300 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          }

          const isExpanded = expandedCategories.has(item.category);
          const hasActiveItem = item.items?.some(subItem => location === subItem.href);

          return (
            <motion.div 
              key={index} 
              className="pt-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <motion.button
                onClick={() => toggleCategory(item.category)}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-slate-100/50 dark:hover:bg-gray-800/50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center gap-2">
                  {item.category}
                  {hasActiveItem && (
                    <motion.div
                      className="w-2 h-2 bg-blue-500 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.div>
              </motion.button>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1 pl-2">
                      {item.items?.map((subItem, subIndex) => {
                        const isActive = location === subItem.href;
                        const Icon = subItem.icon;
                        return (
                          <motion.div
                            key={subItem.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: subIndex * 0.05 }}
                          >
                            <Link 
                              href={subItem.href || "#"}
                              className={cn(
                                "group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden",
                                isActive
                                  ? "text-white bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg shadow-blue-500/25"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50 dark:hover:from-gray-800 dark:hover:to-gray-750"
                              )}
                            >
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                layoutId={isActive ? "activeSubBackground" : undefined}
                              />
                              {Icon && (
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  className="relative z-10"
                                >
                                  <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                                </motion.div>
                              )}
                              <span className="truncate relative z-10">{subItem.name}</span>
                              {isActive && (
                                <motion.div
                                  className="absolute right-2 w-2 h-2 bg-white rounded-full"
                                  layoutId="activeSubIndicator"
                                  transition={{ type: "spring", stiffness: 300 }}
                                />
                              )}
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Super Admin Access */}
        {user && (user.role === 'super_admin' || user.email === 'admin@fourone.com.do') && (
          <motion.div 
            className="pt-4 border-t border-slate-200/50 dark:border-gray-700/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2"
              whileHover={{ scale: 1.02 }}
            >
              <Crown className="w-3 h-3 text-yellow-500" />
              Administración
            </motion.div>
            <div className="mt-2 space-y-1">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/super-admin"
                  className={cn(
                    "group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden",
                    location === "/super-admin"
                      ? "text-white bg-gradient-to-r from-yellow-600 to-orange-600 shadow-lg shadow-yellow-500/25"
                      : "text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 dark:hover:from-yellow-900/20 dark:hover:to-orange-900/20"
                  )}
                >
                  <ShieldCheck className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Panel de Admin</span>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link 
                  href="/company-management"
                  className={cn(
                    "group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden",
                    location === "/company-management"
                      ? "text-white bg-gradient-to-r from-yellow-600 to-orange-600 shadow-lg shadow-yellow-500/25"
                      : "text-slate-700 dark:text-slate-300 hover:bg-gradient-to-r hover:from-yellow-50 hover:to-orange-50 dark:hover:from-yellow-900/20 dark:hover:to-orange-900/20"
                  )}
                >
                  <Building2 className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">Gestión de Empresas</span>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Trial Info - Enhanced with animations */}
      {currentPlan === "trial" && !isCollapsed && (
        <motion.div 
          className="p-4 border-t border-slate-200/50 dark:border-gray-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div 
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-4 text-white relative overflow-hidden"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"
              animate={{ 
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Prueba Gratuita</p>
                  <p className="text-xs opacity-90 truncate">
                    {daysUntilExpiry > 0 ? `${daysUntilExpiry} días restantes` : "Expirado"}
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Star className="h-5 w-5 text-yellow-300 flex-shrink-0" />
                </motion.div>
              </div>
              <motion.button 
                className="w-full bg-white/20 hover:bg-white/30 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-300 backdrop-blur-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Ver Planes Premium
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
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