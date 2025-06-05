import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Receipt, 
  Printer,
  Calculator,
  Users,
  Package,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import MobileCalculator from "@/components/MobileCalculator";
import InvoicePrintModal from "@/components/InvoicePrintModal";
import type { Product, Customer, POSPrintSettings, Company } from "@shared/schema";

// Hook para detectar móvil
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);
  
  return isMobile;
}

// Funciones utilitarias
const formatDOP = (amount: number) => {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP'
  }).format(amount);
};

const calculateITBIS = (subtotal: number) => {
  return subtotal * 0.18;
};

const generateNCF = (type: string, sequence: number) => {
  return `${type}${String(sequence).padStart(8, '0')}`;
};

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export default function POS() {
  // Estados básicos
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const [showCalculator, setShowCalculator] = useState(false);
  const [useFiscalReceipt, setUseFiscalReceipt] = useState(false);
  const [selectedNCFType, setSelectedNCFType] = useState("B02");
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [lastSaleNumber, setLastSaleNumber] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Queries
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
  });

  const { data: printSettings } = useQuery<POSPrintSettings>({
    queryKey: ["/api/pos/print-settings"],
  });

  const { data: ncfSequences = [] } = useQuery({
    queryKey: ["/api/fiscal/ncf-sequences"],
  });

  // Función para verificar secuencias agotándose
  const checkLowSequences = () => {
    const alerts: string[] = [];
    ncfSequences.forEach((sequence: any) => {
      if (sequence.isActive) {
        const remaining = (sequence.maxSequence || 0) - (sequence.currentSequence || 0);
        if (remaining <= 0) {
          alerts.push(`Comprobantes ${sequence.ncfType} agotados`);
        } else if (remaining <= 10) {
          alerts.push(`Quedan ${remaining} comprobantes ${sequence.ncfType}`);
        }
      }
    });
    return alerts;
  };

  const sequenceAlerts = checkLowSequences();

  // Productos filtrados
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cálculos
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const itbis = calculateITBIS(subtotal);
  const total = subtotal + itbis;
  const cashChange = cashReceived ? parseFloat(cashReceived) - total : 0;

  // Funciones del carrito
  const addToCart = async (product: Product) => {
    // Check if there's enough stock
    const currentStock = parseInt(product.stock?.toString() || "0");
    const existingItem = cart.find(item => item.product.id === product.id);
    const currentCartQuantity = existingItem ? existingItem.quantity : 0;
    
    if (currentCartQuantity >= currentStock) {
      toast({
        title: "Stock insuficiente",
        description: `Solo hay ${currentStock} unidades disponibles de ${product.name}`,
        variant: "destructive",
      });
      return;
    }

    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        subtotal: parseFloat(product.price)
      };
      setCart([...cart, newItem]);
    }

    // Update product stock in backend
    try {
      await apiRequest("PATCH", `/api/products/${product.id}`, {
        stock: (currentStock - 1).toString()
      });
      
      // Refresh products to show updated stock
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (error) {
      console.error("Error updating stock:", error);
      toast({
        title: "Error actualizando stock",
        description: "No se pudo actualizar el inventario",
        variant: "destructive",
      });
    }
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => 
      item.product.id === productId
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * parseFloat(item.product.price) }
        : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Procesar venta
  const processSale = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      const saleData = {
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        subtotal: subtotal.toString(),
        itbis: itbis.toString(),
        total: total.toString(),
        paymentMethod,
        cashReceived: paymentMethod === "cash" ? cashReceived : null,
        cashChange: paymentMethod === "cash" ? cashChange.toString() : "0",
        useFiscalReceipt,
        ncfType: useFiscalReceipt ? selectedNCFType : null,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          productCode: item.product.code || "",
          quantity: item.quantity.toString(),
          unitPrice: item.product.price,
          subtotal: item.subtotal.toString(),
          discount: "0"
        }))
      };

      const response = await apiRequest("POST", "/api/pos/sales", saleData);
      
      if (response.ok) {
        const result = await response.json();
        
        // Guardar información para impresión
        setLastSaleId(result.id);
        setLastSaleNumber(result.saleNumber);
        
        // Limpiar carrito después de venta exitosa
        clearCart();
        setCashReceived("");
        setCustomerName("");
        setCustomerPhone("");
        
        // Mostrar modal de impresión
        setShowPrintModal(true);
        
        console.log("Venta procesada exitosamente");
      }
    } catch (error) {
      console.error("Error procesando venta:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (productsLoading) {
    return (
      <div className="w-full">
        <Header title="Punto de Venta" subtitle="Sistema POS integrado" />
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando productos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="Punto de Venta" subtitle="Sistema POS integrado" />
      
      {/* Alertas de secuencias NCF agotándose */}
      {sequenceAlerts.length > 0 && (
        <div className="px-3 sm:px-6 max-w-screen-2xl mx-auto">
          {sequenceAlerts.map((alert, index) => (
            <div key={index} className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">{alert}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="p-3 sm:p-6 max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6 h-[calc(100vh-140px)]">
          
          {/* Sección de Productos */}
          <div className="2xl:col-span-3 xl:col-span-2 lg:col-span-2 space-y-4 h-full overflow-hidden flex flex-col">
            
            {/* Tabs móviles */}
            {isMobile && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="products">
                    <Package className="h-4 w-4 mr-2" />
                    Productos
                  </TabsTrigger>
                  <TabsTrigger value="cart">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Carrito ({cart.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {/* Contenido de productos */}
            {(!isMobile || activeTab === "products") && (
              <>
                {/* Buscador */}
                <Card>
                  <CardContent className="p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar productos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Grid de productos */}
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                    {filteredProducts.map((product) => (
                      <Card 
                        key={product.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col h-full">
                            <div className="flex-1">
                              <h3 className="font-medium text-sm line-clamp-2 mb-1">
                                {product.name}
                              </h3>
                              <p className="text-xs text-gray-500 mb-2">
                                Código: {product.code}
                              </p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                {formatDOP(parseFloat(product.price))}
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <Badge variant={parseInt(product.stock.toString()) > 10 ? "default" : "destructive"}>
                                  Stock: {product.stock}
                                </Badge>
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              className="w-full h-8 text-xs mt-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                              disabled={parseInt(product.stock.toString()) <= 0}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Agregar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sección de Carrito y Checkout */}
          <div className={`2xl:col-span-2 xl:col-span-2 lg:col-span-1 space-y-4 h-full flex flex-col overflow-hidden ${isMobile ? 'hidden' : ''}`}>
            
            {/* Carrito */}
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Carrito ({cart.length})
                  </span>
                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCart}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 min-h-0">
                {cart.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    Carrito vacío
                  </p>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDOP(parseFloat(item.product.price))} c/u
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product.id)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {formatDOP(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Checkout */}
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 min-h-0">
              
              {/* Cliente */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Cliente (Opcional)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Nombre del cliente"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <Input
                    placeholder="Teléfono"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </CardContent>
              </Card>

              {/* Totales y Pago */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Totales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatDOP(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>ITBIS (18%):</span>
                      <span>{formatDOP(itbis)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-green-600 dark:text-green-400">
                        {formatDOP(total)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Método de Pago</label>
                      <Select value={paymentMethod} onValueChange={(value: "cash" | "card") => setPaymentMethod(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center gap-2">
                              <Banknote className="h-4 w-4" />
                              Efectivo
                            </div>
                          </SelectItem>
                          <SelectItem value="card">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Tarjeta
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Opciones de Comprobante Fiscal */}
                    <div className="space-y-3 border-t pt-3">
                      <div className="flex items-center space-x-2">
                        <input
                          id="useFiscalReceipt"
                          type="checkbox"
                          checked={useFiscalReceipt}
                          onChange={(e) => setUseFiscalReceipt(e.target.checked)}
                          className="rounded"
                        />
                        <label htmlFor="useFiscalReceipt" className="text-sm font-medium">
                          Generar Comprobante Fiscal
                        </label>
                      </div>

                      {useFiscalReceipt && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">Tipo de NCF</label>
                          <Select value={selectedNCFType} onValueChange={setSelectedNCFType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="B01">B01 - Crédito Fiscal</SelectItem>
                              <SelectItem value="B02">B02 - Consumidor Final</SelectItem>
                              <SelectItem value="B03">B03 - Nota de Débito</SelectItem>
                              <SelectItem value="B04">B04 - Nota de Crédito</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {paymentMethod === "cash" && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Efectivo Recibido</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                        />
                        {cashReceived && parseFloat(cashReceived) >= total && (
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Cambio: {formatDOP(cashChange)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowCalculator(true)}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      Calculadora
                    </Button>
                    <Button
                      onClick={processSale}
                      disabled={cart.length === 0 || isProcessing || (paymentMethod === "cash" && (!cashReceived || parseFloat(cashReceived) < total))}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="lg"
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      ) : (
                        <Receipt className="h-4 w-4 mr-2" />
                      )}
                      {isProcessing ? "Procesando..." : "Procesar Venta"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Tab Content móvil para carrito */}
          {isMobile && activeTab === "cart" && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Carrito ({cart.length})</span>
                    {cart.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearCart}
                        className="text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cart.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Carrito vacío</p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.product.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-sm">{item.product.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatDOP(parseFloat(item.product.price))} c/u
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-medium">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-bold text-green-600">
                            {formatDOP(item.subtotal)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Totales móvil */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatDOP(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ITBIS:</span>
                      <span>{formatDOP(itbis)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span className="text-green-600">{formatDOP(total)}</span>
                    </div>
                  </div>

                  {/* Método de pago móvil */}
                  <div className="space-y-3 mb-4">
                    <Input
                      placeholder="Nombre del cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                    <Input
                      placeholder="Teléfono"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 mb-4">
                    <Button
                      variant={paymentMethod === "cash" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("cash")}
                      className="flex-1"
                    >
                      <Banknote className="h-4 w-4 mr-2" />
                      Efectivo
                    </Button>
                    <Button
                      variant={paymentMethod === "card" ? "default" : "outline"}
                      onClick={() => setPaymentMethod("card")}
                      className="flex-1"
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Tarjeta
                    </Button>
                  </div>

                  {paymentMethod === "cash" && (
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Efectivo recibido"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      className="mb-4"
                    />
                  )}

                  <Button
                    onClick={processSale}
                    disabled={cart.length === 0 || isProcessing || (paymentMethod === "cash" && (!cashReceived || parseFloat(cashReceived) < total))}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {isProcessing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    ) : (
                      <Receipt className="h-4 w-4 mr-2" />
                    )}
                    {isProcessing ? "Procesando..." : "Procesar Venta"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <MobileCalculator 
          isOpen={showCalculator} 
          onClose={() => setShowCalculator(false)} 
        />

        {lastSaleId && (
          <InvoicePrintModal
            isOpen={showPrintModal}
            onClose={() => setShowPrintModal(false)}
            saleId={lastSaleId}
            saleNumber={lastSaleNumber}
          />
        )}
      </div>
    </div>
  );
}