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
  X,
  Eye,
  RotateCcw,
  FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { formatDOP, calculateITBIS, ITBIS_RATE, generateNCF } from "@/lib/dominican";
import { PrintReceipt } from "@/components/PrintReceipt";
import { EnhancedPrintReceipt } from "@/components/EnhancedPrintReceipt";
import type { Product, Customer, POSPrintSettings, Company, POSSale, POSSaleItem } from "@shared/schema";

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export default function POS() {
  // Cart state with localStorage persistence and cross-window sync
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("pos_cart");
      return savedCart ? JSON.parse(savedCart) : [];
    }
    return [];
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const [showPreview, setShowPreview] = useState(false);
  const [previewAsCommand, setPreviewAsCommand] = useState(false);
  const [lastSale, setLastSale] = useState<POSSale | null>(null);
  const [lastSaleItems, setLastSaleItems] = useState<POSSaleItem[]>([]);
  
  // Restaurant-specific fields
  const [orderType, setOrderType] = useState<"dine_in" | "takeout" | "delivery">("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [preparationNotes, setPreparationNotes] = useState("");
  
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

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
  });

  const { data: lastSaleData } = useQuery({
    queryKey: ["/api/pos/sales/last"],
    enabled: false,
  });

  // Sync cart with localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("pos_cart", JSON.stringify(cart));
      // Dispatch storage event for cross-window sync
      window.dispatchEvent(new StorageEvent("storage", {
        key: "pos_cart",
        newValue: JSON.stringify(cart)
      }));
    }
  }, [cart]);

  // Listen for cart changes from other windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pos_cart" && e.newValue) {
        try {
          const newCart = JSON.parse(e.newValue);
          setCart(newCart);
        } catch (error) {
          console.error("Error parsing cart from localStorage:", error);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, []);

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
    // Check stock availability
    const existingItem = cart.find(item => item.product.id === product.id);
    const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
    const newTotalQuantity = currentQuantityInCart + 1;
    
    if (newTotalQuantity > parseInt(product.stock.toString())) {
      toast({
        title: "Stock insuficiente",
        description: `No hay suficiente stock para esta orden. Stock disponible: ${product.stock}`,
        variant: "destructive",
      });
      return;
    }
    
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
    
    // Find the product to check stock
    const cartItem = cart.find(item => item.product.id === productId);
    if (cartItem && newQuantity > parseInt(cartItem.product.stock.toString())) {
      toast({
        title: "Stock insuficiente",
        description: `No hay suficiente stock para esta orden. Stock disponible: ${cartItem.product.stock}`,
        variant: "destructive",
      });
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
        // Restaurant-specific fields
        orderType: company?.businessType === "restaurant" ? orderType : "dine_in",
        tableNumber: company?.businessType === "restaurant" && orderType === "dine_in" ? tableNumber : null,
        preparationNotes: company?.businessType === "restaurant" ? preparationNotes : null,
      };

      const saleResponse = await apiRequest("POST", "/api/pos/sales", saleData);
      const sale = await saleResponse.json();

      // Add sale items with product names
      const saleItems = [];
      for (const item of cart) {
        const itemResponse = await apiRequest("POST", "/api/pos/sale-items", {
          saleId: sale.id,
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity.toString(),
          unitPrice: item.product.price,
          subtotal: item.subtotal.toString(),
        });
        const saleItem = await itemResponse.json();
        saleItems.push(saleItem);
      }

      // Store for receipt printing
      setLastSale(sale);
      setLastSaleItems(saleItems);

      toast({
        title: "Venta completada",
        description: `Venta #${sale.id} procesada exitosamente`,
      });

      // Reset restaurant-specific fields after successful sale
      if (company?.businessType === "restaurant") {
        setOrderType("dine_in");
        setTableNumber("");
        setPreparationNotes("");
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

  const printReceipt = (sale: any, isCommand = false) => {
    const printWindow = window.open('', '_blank');
    if (printWindow && printRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${isCommand ? 'Comanda' : 'Recibo'} - Venta #${sale.id}</title>
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

  const fetchLastSale = async () => {
    try {
      const lastSaleResponse = await apiRequest("/api/pos/sales/last");
      if (lastSaleResponse) {
        const saleItemsResponse = await apiRequest(`/api/pos/sales/${lastSaleResponse.id}/items`);
        setLastSale(lastSaleResponse);
        setLastSaleItems(saleItemsResponse || []);
        return { sale: lastSaleResponse, items: saleItemsResponse || [] };
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo obtener la última venta",
        variant: "destructive",
      });
    }
    return null;
  };

  const reprintLastSale = async () => {
    const saleData = await fetchLastSale();
    if (saleData) {
      printReceipt(saleData.sale);
      toast({
        title: "Reimpresión exitosa",
        description: `Factura #${saleData.sale.saleNumber} reimpresa`,
      });
    }
  };

  const previewCurrentInvoice = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos para previsualizar la factura",
        variant: "destructive",
      });
      return;
    }
    setShowPreview(true);
    setPreviewAsCommand(false);
  };

  const previewAsKitchenCommand = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos para previsualizar la comanda",
        variant: "destructive",
      });
      return;
    }
    setShowPreview(true);
    setPreviewAsCommand(true);
  };

  const printPreview = () => {
    if (cart.length === 0) return;
    
    const mockSale = {
      id: "PREVIEW",
      saleNumber: "PREVIEW",
      date: new Date().toISOString(),
      subtotal: subtotal.toString(),
      itbis: itbis.toString(),
      total: total.toString(),
      paymentMethod: paymentMethod,
      cashReceived: cashReceived,
      cashChange: cashChange.toString(),
      ncf: generateNCF(),
      customerName: customerName || "Cliente General",
      customerPhone: customerPhone,
    };

    printReceipt(mockSale, previewAsCommand);
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Products Section */}
          <div className="xl:col-span-2 space-y-4">
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
                  {/* Search and Actions */}
                  <div className="space-y-3 mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar productos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {/* Sample Products Button */}
                    {(!products || products.length === 0) && (
                      <Button
                        onClick={async () => {
                          try {
                            await apiRequest("/api/products/create-samples", {
                              method: "POST"
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                            toast({
                              title: "Productos creados",
                              description: "Se han creado productos de muestra para testing"
                            });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: "Error al crear productos de muestra",
                              variant: "destructive"
                            });
                          }
                        }}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <Package className="h-4 w-4 mr-2" />
                        Crear Productos de Muestra
                      </Button>
                    )}
                  </div>

                  {/* Products Grid - Enhanced Layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <CardContent className="p-0">
                          {/* Product Image */}
                          <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop";
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-12 w-12 text-gray-400" />
                              </div>
                            )}
                            
                            {/* Stock Badge */}
                            <div className="absolute top-2 right-2">
                              <Badge 
                                variant={parseInt(product.stock.toString()) > 10 ? "default" : parseInt(product.stock.toString()) > 0 ? "secondary" : "destructive"}
                                className="text-xs font-medium shadow-sm"
                              >
                                Stock: {product.stock}
                              </Badge>
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="p-4 space-y-3">
                            <div className="space-y-2">
                              <h3 className="font-semibold text-base leading-tight text-gray-900 dark:text-gray-100">
                                {product.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono tracking-wide">
                                {product.code}
                              </p>
                              {product.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                  {product.description}
                                </p>
                              )}
                            </div>
                            
                            {/* Price and Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex flex-col">
                                <span className="font-bold text-lg text-green-600 dark:text-green-400">
                                  {formatDOP(parseFloat(product.price))}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Precio unitario
                                </span>
                              </div>
                              <Button
                                onClick={() => addToCart(product)}
                                size="sm"
                                className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                                disabled={parseInt(product.stock.toString()) === 0}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar
                              </Button>
                            </div>
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
                          <div key={item.product.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="space-y-3">
                              {/* Product Info */}
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 pr-3">
                                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 leading-tight">
                                    {item.product.name}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {formatDOP(parseFloat(item.product.price))} por unidad
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFromCart(item.product.id)}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              {/* Quantity Controls and Subtotal */}
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                    className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  
                                  <span className="w-10 text-center text-sm font-medium bg-gray-50 dark:bg-gray-600 py-1 px-2 text-gray-900 dark:text-gray-100">
                                    {item.quantity}
                                  </span>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                    className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-600"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                <div className="text-right">
                                  <p className="font-bold text-sm text-green-600 dark:text-green-400">
                                    {formatDOP(item.subtotal)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Subtotal
                                  </p>
                                </div>
                              </div>
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

                {/* Products Grid - Fixed Layout */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 lg:gap-4">
                  {filteredProducts.map((product) => (
                    <Card key={product.id} className="flex flex-col hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={() => addToCart(product)}>
                      <CardContent className="p-3 flex flex-col h-full">
                        {/* Product Image */}
                        <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                          <img
                            className="w-full h-full object-cover"
                            src={product.imageUrl || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop"}
                            alt={product.name}
                            onError={(e) => {
                              e.currentTarget.src = "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop";
                            }}
                          />
                        </div>
                        
                        {/* Product Info - Flex grow to fill space */}
                        <div className="flex flex-col flex-grow space-y-2">
                          {/* Header with stock badge */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium text-sm leading-tight line-clamp-2">{product.name}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.code}</p>
                            </div>
                            <Badge 
                              variant={parseInt(product.stock.toString()) > 10 ? "default" : "destructive"} 
                              className="text-xs shrink-0"
                            >
                              {product.stock}
                            </Badge>
                          </div>
                          
                          {/* Price */}
                          <div className="flex-grow flex items-end">
                            <span className="font-bold text-green-600 dark:text-green-400 text-sm">
                              {formatDOP(parseFloat(product.price))}
                            </span>
                          </div>
                          
                          {/* Add Button - Always at bottom */}
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

                {/* Restaurant-specific fields */}
                {company?.businessType === "restaurant" && (
                  <div className="space-y-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border">
                    <h4 className="font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Opciones de Restaurante
                    </h4>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Tipo de Orden</label>
                      <Select value={orderType} onValueChange={(value: "dine_in" | "takeout" | "delivery") => setOrderType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dine_in">Para Comer Aquí</SelectItem>
                          <SelectItem value="takeout">Para Llevar</SelectItem>
                          <SelectItem value="delivery">Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {orderType === "dine_in" && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Número de Mesa</label>
                        <Input
                          placeholder="Ej: Mesa 5"
                          value={tableNumber}
                          onChange={(e) => setTableNumber(e.target.value)}
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium mb-2 block">Notas de Preparación</label>
                      <Input
                        placeholder="Instrucciones especiales..."
                        value={preparationNotes}
                        onChange={(e) => setPreparationNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                  {/* Preview and Print Options */}
                  <div className={`grid gap-2 ${company?.businessType === "restaurant" ? "grid-cols-2" : "grid-cols-1"}`}>
                    <Button
                      onClick={previewCurrentInvoice}
                      disabled={cart.length === 0}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Vista Previa
                    </Button>
                    {company?.businessType === "restaurant" && (
                      <Button
                        onClick={previewAsKitchenCommand}
                        disabled={cart.length === 0}
                        variant="outline"
                        size="sm"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Comanda
                      </Button>
                    )}
                  </div>

                  {/* Reprint Last Sale */}
                  <Button
                    onClick={reprintLastSale}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reimprimir Última Venta
                  </Button>

                  {/* Main Process Button */}
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
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Receipt Preview Panel - Desktop Only */}
          {!isMobile && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Vista Previa en Vivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-[600px] overflow-y-auto">
                    {cart.length === 0 ? (
                      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                        <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          Agrega productos para ver la vista previa del recibo
                        </p>
                      </div>
                    ) : (
                      company && printSettings && (
                        <div className="receipt-preview font-mono text-xs leading-tight">
                          {/* Header */}
                          <div className="text-center mb-3">
                            {printSettings.showLogo && company.logoUrl && (
                              <div className="mb-2">
                                <img 
                                  src={company.logoUrl} 
                                  alt="Logo" 
                                  className="h-12 w-auto mx-auto"
                                />
                              </div>
                            )}
                            <div className="font-bold text-sm">{company.businessName || company.name}</div>
                            {company.address && <div>{company.address}</div>}
                            {company.phone && <div>Tel: {company.phone}</div>}
                            {company.rnc && <div>RNC: {company.rnc}</div>}
                            <div className="border-b border-dashed border-gray-400 my-2"></div>
                          </div>

                          {/* Sale Info */}
                          <div className="mb-3">
                            <div className="flex justify-between">
                              <span>Fecha:</span>
                              <span>{new Date().toLocaleDateString('es-DO')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Hora:</span>
                              <span>{new Date().toLocaleTimeString('es-DO')}</span>
                            </div>
                            {printSettings.showNCF && (
                              <div className="flex justify-between">
                                <span>NCF:</span>
                                <span>{generateNCF()}</span>
                              </div>
                            )}
                          </div>

                          {/* Customer Info */}
                          {printSettings.showCustomerInfo && (customerName || customerPhone) && (
                            <div className="mb-3">
                              <div className="border-b border-dashed border-gray-400 mb-2"></div>
                              {customerName && (
                                <div className="flex justify-between">
                                  <span>Cliente:</span>
                                  <span>{customerName}</span>
                                </div>
                              )}
                              {customerPhone && (
                                <div className="flex justify-between">
                                  <span>Teléfono:</span>
                                  <span>{customerPhone}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="border-b border-dashed border-gray-400 my-2"></div>

                          {/* Items */}
                          <div className="mb-3">
                            {cart.map((item, index) => (
                              <div key={index} className="mb-2">
                                <div className="flex justify-between">
                                  <span className="truncate pr-2">{item.product.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>{item.quantity} x {formatDOP(parseFloat(item.product.price))}</span>
                                  <span>{formatDOP(item.subtotal)}</span>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="border-b border-dashed border-gray-400 my-2"></div>

                          {/* Totals */}
                          <div className="mb-3">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>{formatDOP(subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>ITBIS ({ITBIS_RATE}%):</span>
                              <span>{formatDOP(itbis)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>TOTAL:</span>
                              <span>{formatDOP(total)}</span>
                            </div>
                          </div>

                          {/* Payment Info */}
                          <div className="mb-3">
                            <div className="border-b border-dashed border-gray-400 mb-2"></div>
                            <div className="flex justify-between">
                              <span>Método de Pago:</span>
                              <span>{paymentMethod === "cash" ? "Efectivo" : "Tarjeta"}</span>
                            </div>
                            {paymentMethod === "cash" && cashReceived && (
                              <>
                                <div className="flex justify-between">
                                  <span>Efectivo Recibido:</span>
                                  <span>{formatDOP(parseFloat(cashReceived))}</span>
                                </div>
                                {cashChange > 0 && (
                                  <div className="flex justify-between">
                                    <span>Cambio:</span>
                                    <span>{formatDOP(cashChange)}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Footer */}
                          {printSettings.footerText && (
                            <>
                              <div className="border-b border-dashed border-gray-400 my-2"></div>
                              <div className="text-center text-xs">
                                {printSettings.footerText}
                              </div>
                            </>
                          )}

                          <div className="text-center mt-3 text-xs">
                            ¡Gracias por su compra!
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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

        {/* Live Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {previewAsCommand ? "Vista Previa - Comanda" : "Vista Previa - Factura"}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {cart.length > 0 && company && (
                <PrintReceipt
                  sale={{
                    id: "PREVIEW",
                    saleNumber: "PREVIEW",
                    date: new Date().toISOString(),
                    subtotal: subtotal.toString(),
                    itbis: itbis.toString(),
                    total: total.toString(),
                    paymentMethod: paymentMethod,
                    cashReceived: cashReceived,
                    cashChange: cashChange.toString(),
                    ncf: generateNCF("consumer", Date.now()),
                    customerName: customerName || "Cliente General",
                    customerPhone: customerPhone,
                  }}
                  items={cart.map(item => ({
                    id: 0,
                    createdAt: null,
                    saleId: 0,
                    productId: item.product.id,
                    productName: item.product.name,
                    quantity: item.quantity.toString(),
                    unitPrice: item.product.price,
                    subtotal: item.subtotal.toString(),
                  }))}
                  company={company}
                  printSettings={printSettings}
                  isCommand={previewAsCommand}
                />
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={printPreview} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir {previewAsCommand ? "Comanda" : "Factura"}
              </Button>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden print template */}
        <div ref={printRef} style={{ display: "none" }}>
          <div className="receipt center">
            <div className="bold">{previewAsCommand ? "COMANDA DE COCINA" : "RECIBO DE VENTA"}</div>
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
              <div className="center">NCF: {generateNCF("B01", 1)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}