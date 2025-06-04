import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  ShoppingCart, 
  Package, 
  Users, 
  Receipt, 
  Factory,
  MessageSquare,
  Calculator,
  FileText,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  color: string;
  description: string;
}

export default function QuickActionMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: "new-sale",
      label: "Nueva Venta",
      icon: ShoppingCart,
      action: () => setLocation("/pos"),
      color: "bg-green-500 hover:bg-green-600",
      description: "Procesar una venta rápida"
    },
    {
      id: "new-product",
      label: "Nuevo Producto",
      icon: Package,
      action: () => setLocation("/products"),
      color: "bg-blue-500 hover:bg-blue-600",
      description: "Agregar producto al inventario"
    },
    {
      id: "new-customer",
      label: "Nuevo Cliente",
      icon: Users,
      action: () => setLocation("/customers"),
      color: "bg-purple-500 hover:bg-purple-600",
      description: "Registrar un nuevo cliente"
    },
    {
      id: "new-invoice",
      label: "Nueva Factura",
      icon: Receipt,
      action: () => setLocation("/billing"),
      color: "bg-yellow-500 hover:bg-yellow-600",
      description: "Crear factura comercial"
    },
    {
      id: "production",
      label: "Producción",
      icon: Factory,
      action: () => setLocation("/manufacturing"),
      color: "bg-orange-500 hover:bg-orange-600",
      description: "Gestionar órdenes de producción"
    },
    {
      id: "chat",
      label: "Chat",
      icon: MessageSquare,
      action: () => setLocation("/chat"),
      color: "bg-indigo-500 hover:bg-indigo-600",
      description: "Comunicación interna"
    },
    {
      id: "calculator",
      label: "Calculadora",
      icon: Calculator,
      action: () => openCalculator(),
      color: "bg-gray-500 hover:bg-gray-600",
      description: "Calculadora empresarial"
    },
    {
      id: "reports",
      label: "Reportes",
      icon: FileText,
      action: () => setLocation("/sales-reports"),
      color: "bg-red-500 hover:bg-red-600",
      description: "Ver reportes y análisis"
    }
  ];

  const openCalculator = () => {
    // Simple calculator implementation - can be enhanced later
    const result = prompt("Calculadora básica (ej: 10+5*2):");
    if (result) {
      try {
        const calculation = eval(result);
        alert(`Resultado: ${calculation}`);
      } catch (error) {
        alert("Error en el cálculo");
      }
    }
    setIsOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Don't show if user is not authenticated
  if (!user) return null;

  const handleActionClick = (action: QuickAction) => {
    action.action();
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-50">
      {/* Action Buttons */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 mb-2"
          >
            <div className="flex flex-col space-y-2">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, x: 50, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 50, scale: 0.8 }}
                  transition={{ 
                    duration: 0.2, 
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 200,
                    damping: 20
                  }}
                  className="flex items-center group"
                >
                  {/* Action Label */}
                  <div className="mr-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap backdrop-blur-sm">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-gray-300">{action.description}</div>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Button
                    onClick={() => handleActionClick(action)}
                    className={`
                      w-12 h-12 rounded-full ${action.color} 
                      shadow-lg hover:shadow-xl transform hover:scale-110 
                      transition-all duration-200 border-2 border-white/20
                      flex items-center justify-center
                    `}
                  >
                    <action.icon className="w-5 h-5 text-white" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Button */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 
            hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl
            transform transition-all duration-300 border-2 border-white/20
            flex items-center justify-center group
            ${isOpen ? 'rotate-45' : 'rotate-0'}
          `}
        >
          {isOpen ? (
            <Plus className="w-6 h-6 text-white transition-transform duration-300" />
          ) : (
            <Zap className="w-6 h-6 text-white group-hover:animate-pulse" />
          )}
        </Button>

        {/* Pulse Effect */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600/30 to-purple-600/30 animate-ping"></div>
        )}
      </motion.div>

      {/* Background Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/10 backdrop-blur-sm -z-10"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}