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
  Settings,
  Calculator,
  Users,
  Package,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { formatDOP, calculateITBIS, ITBIS_RATE, generateNCF } from "@/lib/dominican";
import type { Product, Customer, POSPrintSettings } from "@shared/schema";

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: printSettings } = useQuery<POSPrintSettings>({
    queryKey: ["/api/pos/print-settings"],
  });

  const filteredProducts = products?.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const itbis = calculateITBIS(subtotal);
  const total = subtotal + itbis;
  const cashChange = paymentMethod === "cash" && cashReceived ? 
    Math.max(0, parseFloat(cashReceived) - total) : 0;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      
      if (existingItem) {
        return prev.map(item =>
          item.product.id === product.id
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * parseFloat(product.price)
              }
            : item
        );
      }
      
      return [...prev, {
        product,
        quantity: 1,
        subtotal: parseFloat(product.price)
      }];
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { 
              ...item, 
              quantity: newQuantity,
              subtotal: newQuantity * parseFloat(item.product.price)
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerPhone("");
    setCustomerName("");
    setCashReceived("");
    setPaymentMethod("cash");
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "El carrito está vacío",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "cash" && (!cashReceived || parseFloat(cashReceived) < total)) {
      toast({
        title: "Error",
        description: "El efectivo recibido debe ser mayor o igual al total",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const saleData = {
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        paymentMethod,
        subtotal: subtotal.toString(),
        itbis: itbis.toString(),
        total: total.toString(),
        cashReceived: paymentMethod === "cash" ? cashReceived : null,
        cashChange: paymentMethod === "cash" ? cashChange.toString() : "0",
        ncf: printSettings?.showNCF ? generateNCF('consumer', Date.now()) : null,
      };

      const saleResponse = await apiRequest("POST", "/api/pos/sales", saleData);
      const sale = saleResponse as any;

      // Add sale items
      for (const item of cart) {
        await apiRequest("POST", "/api/pos/sale-items", {
          saleId: sale.id,
          productId: item.product.id,
          quantity: item.quantity.toString(),
          unitPrice: item.product.price,
        });
      }

      toast({
        title: "Venta completada",
        description: `Venta #${sale.id} procesada exitosamente`,
      });

      // Print receipt if needed
      if (printSettings) {
        setTimeout(() => {
          printReceipt(sale);
        }, 500);
      }

      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sales"] });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar la venta",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = (sale: any) => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Recibo - Venta #${sale.id}</title>
            <style>
              body { font-family: monospace; margin: 0; padding: 10px; }
              .receipt { width: ${printSettings?.printerWidth === '58mm' ? '200px' : '300px'}; }
              .center { text-align: center; }
              .right { text-align: right; }
              .bold { font-weight: bold; }
              .line { border-bottom: 1px dashed #000; margin: 5px 0; }
              table { width: 100%; border-collapse: collapse; }
              td { padding: 2px 0; }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (productsLoading) {
    return (
      <div className="w-full">
        <Header title="Punto de Venta" subtitle="Sistema POS integrado" />
        <div className="p-4 sm:p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando productos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Header title="Punto de Venta" subtitle="Sistema POS integrado" />
      
      <div className="p-3 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Products and Cart Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mobile Tabs for Products/Cart */}
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
                
                <TabsContent value="products" className="mt-4">
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredProducts.map((product) => (
                      <Card key={product.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm truncate">{product.name}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{product.code}</p>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              Stock: {product.stock}
                            </Badge>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-green-600 dark:text-green-400">
                              {formatDOP(parseFloat(product.price))}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => addToCart(product)}
                              disabled={parseInt(product.stock) <= 0}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
                
                <TabsContent value="cart" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Carrito de Compras
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {cart.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                          Carrito vacío
                        </p>
                      ) : (
                        cart.map((item) => (
                          <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{item.product.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDOP(parseFloat(item.product.price))} c/u
                              </p>
                            </div>
                            
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
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFromCart(item.product.id)}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="text-right ml-3">
                              <p className="font-bold text-sm">
                                {formatDOP(item.subtotal)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}

            {/* Desktop Products View */}
            {!isMobile && (
              <>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar productos por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => addToCart(product)}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm truncate">{product.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{product.code}</p>
                          </div>
                          <Badge variant={parseInt(product.stock) > 10 ? "default" : "destructive"} className="ml-2 text-xs">
                            {product.stock}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-green-600 dark:text-green-400">
                            {formatDOP(parseFloat(product.price))}
                          </span>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                            disabled={parseInt(product.stock) <= 0}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Cart and Checkout Section */}
          <div className={`space-y-4 ${isMobile ? 'hidden' : ''}`}>
            {/* Cart */}
            <Card>
              <CardHeader className="pb-3">
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
              <CardContent className="space-y-3 max-h-64 overflow-y-auto">
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
                        
                        <span className="font-bold text-sm">
                          {formatDOP(item.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Customer Info */}
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

            {/* Payment */}
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
                    <span>ITBIS ({ITBIS_RATE}%):</span>
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

                <Button
                  onClick={processSale}
                  disabled={cart.length === 0 || isProcessing}
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
        </div>

        {/* Mobile Checkout Button */}
        {isMobile && activeTab === "cart" && cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              {/* Totals Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
                  <span>Subtotal:</span>
                  <span>{formatDOP(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>ITBIS:</span>
                  <span>{formatDOP(itbis)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatDOP(total)}
                  </span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("cash")}
                  className="flex items-center gap-2"
                >
                  <Banknote className="h-4 w-4" />
                  Efectivo
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  Tarjeta
                </Button>
              </div>

              {/* Cash Input */}
              {paymentMethod === "cash" && (
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Efectivo recibido"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                />
              )}

              {/* Process Button */}
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
            </div>
          </div>
        )}

        {/* Hidden print template */}
        <div ref={printRef} style={{ display: "none" }}>
          <div className="receipt center">
            <div className="bold">RECIBO DE VENTA</div>
            <div>#{cart.length > 0 ? 'TEMP' : ''}</div>
            <div className="line"></div>
            <div>{new Date().toLocaleString('es-DO')}</div>
            {customerName && <div>Cliente: {customerName}</div>}
            {customerPhone && <div>Tel: {customerPhone}</div>}
            <div className="line"></div>
            
            <table>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.product.id}>
                    <td>{item.product.name}</td>
                    <td className="right">{item.quantity} x {formatDOP(parseFloat(item.product.price))}</td>
                    <td className="right">{formatDOP(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="line"></div>
            <table>
              <tr>
                <td>Subtotal:</td>
                <td className="right">{formatDOP(subtotal)}</td>
              </tr>
              <tr>
                <td>ITBIS:</td>
                <td className="right">{formatDOP(itbis)}</td>
              </tr>
              <tr className="bold">
                <td>TOTAL:</td>
                <td className="right">{formatDOP(total)}</td>
              </tr>
              {paymentMethod === "cash" && cashReceived && (
                <>
                  <tr>
                    <td>Efectivo:</td>
                    <td className="right">{formatDOP(parseFloat(cashReceived))}</td>
                  </tr>
                  <tr>
                    <td>Cambio:</td>
                    <td className="right">{formatDOP(cashChange)}</td>
                  </tr>
                </>
              )}
            </table>
            
            <div className="line"></div>
            <div className="center">¡Gracias por su compra!</div>
            {printSettings?.showNCF && (
              <div className="center">NCF: {generateNCF()}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}