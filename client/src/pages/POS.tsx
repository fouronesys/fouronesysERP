import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDOP, calculateITBIS, ITBIS_RATE } from "@/lib/dominican";
import type { Product, Customer } from "@shared/schema";

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface PrintTemplateProps {
  sale: any;
  items: CartItem[];
  customer?: Customer;
  settings: POSPrintSettings;
  company: any;
}

const PrintTemplate80mm = ({ sale, items, customer, settings, company }: PrintTemplateProps) => {
  const currentDate = new Date().toLocaleString("es-DO", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="w-[80mm] p-2 font-mono text-xs bg-white text-black print-container">
      {/* Header */}
      <div className="text-center mb-2">
        {settings.headerText && (
          <div className="font-bold text-sm mb-1">{settings.headerText}</div>
        )}
        <div className="font-bold">{company?.name || "EMPRESA"}</div>
        {company?.rnc && <div>RNC: {company.rnc}</div>}
        {company?.address && <div>{company.address}</div>}
        {company?.phone && <div>Tel: {company.phone}</div>}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Sale Info */}
      <div className="mb-2">
        <div className="flex justify-between">
          <span>Factura:</span>
          <span>{sale.saleNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Fecha:</span>
          <span>{currentDate}</span>
        </div>
        {settings.showNCF && sale.ncf && (
          <div className="flex justify-between">
            <span>NCF:</span>
            <span>{sale.ncf}</span>
          </div>
        )}
        {settings.showCustomerInfo && customer && (
          <>
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span>{customer.name}</span>
            </div>
            {customer.rnc && (
              <div className="flex justify-between">
                <span>RNC/Ced:</span>
                <span>{customer.rnc}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Items */}
      <div className="mb-2">
        {items.map((item, index) => (
          <div key={index} className="mb-1">
            <div className="flex justify-between">
              <span className="truncate flex-1 mr-2">{item.product.name}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>{item.quantity} x {formatDOP(parseFloat(item.product.price))}</span>
              <span>{formatDOP(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Totals */}
      <div className="mb-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatDOP(parseFloat(sale.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span>ITBIS (18%):</span>
          <span>{formatDOP(parseFloat(sale.itbis))}</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL:</span>
          <span>{formatDOP(parseFloat(sale.total))}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="mb-2">
        <div className="flex justify-between">
          <span>Pago:</span>
          <span>{sale.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</span>
        </div>
        {sale.paymentMethod === 'cash' && (
          <>
            <div className="flex justify-between">
              <span>Recibido:</span>
              <span>{formatDOP(parseFloat(sale.cashReceived || 0))}</span>
            </div>
            <div className="flex justify-between">
              <span>Cambio:</span>
              <span>{formatDOP(parseFloat(sale.cashChange || 0))}</span>
            </div>
          </>
        )}
      </div>

      <div className="border-t border-dashed border-black my-2"></div>

      {/* Footer */}
      <div className="text-center text-xs">
        {settings.footerText && (
          <div className="mb-1">{settings.footerText}</div>
        )}
        <div>¡Gracias por su compra!</div>
        <div>Four One System - POS</div>
      </div>
    </div>
  );
};

const PrintTemplate58mm = ({ sale, items, customer, settings, company }: PrintTemplateProps) => {
  const currentDate = new Date().toLocaleString("es-DO", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="w-[58mm] p-1 font-mono text-xs bg-white text-black print-container">
      {/* Header */}
      <div className="text-center mb-2">
        {settings.headerText && (
          <div className="font-bold text-xs mb-1 break-words">{settings.headerText}</div>
        )}
        <div className="font-bold text-xs break-words">{company?.name || "EMPRESA"}</div>
        {company?.rnc && <div className="text-xs">RNC: {company.rnc}</div>}
        {company?.address && <div className="text-xs break-words">{company.address}</div>}
        {company?.phone && <div className="text-xs">Tel: {company.phone}</div>}
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Sale Info */}
      <div className="mb-2 text-xs">
        <div>Factura: {sale.saleNumber}</div>
        <div>Fecha: {currentDate}</div>
        {settings.showNCF && sale.ncf && (
          <div>NCF: {sale.ncf}</div>
        )}
        {settings.showCustomerInfo && customer && (
          <>
            <div>Cliente: {customer.name}</div>
            {customer.rnc && (
              <div>RNC/Ced: {customer.rnc}</div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Items */}
      <div className="mb-2">
        {items.map((item, index) => (
          <div key={index} className="mb-1 text-xs">
            <div className="break-words">{item.product.name}</div>
            <div className="flex justify-between">
              <span>{item.quantity} x {formatDOP(parseFloat(item.product.price))}</span>
              <span>{formatDOP(item.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Totals */}
      <div className="mb-2 text-xs">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatDOP(parseFloat(sale.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span>ITBIS:</span>
          <span>{formatDOP(parseFloat(sale.itbis))}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>TOTAL:</span>
          <span>{formatDOP(parseFloat(sale.total))}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="mb-2 text-xs">
        <div>Pago: {sale.paymentMethod === 'cash' ? 'Efectivo' : 'Tarjeta'}</div>
        {sale.paymentMethod === 'cash' && (
          <>
            <div>Recibido: {formatDOP(parseFloat(sale.cashReceived || 0))}</div>
            <div>Cambio: {formatDOP(parseFloat(sale.cashChange || 0))}</div>
          </>
        )}
      </div>

      <div className="border-t border-dashed border-black my-1"></div>

      {/* Footer */}
      <div className="text-center text-xs">
        {settings.footerText && (
          <div className="mb-1 break-words">{settings.footerText}</div>
        )}
        <div>¡Gracias por su compra!</div>
        <div>Four One System</div>
      </div>
    </div>
  );
};

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [currentSale, setCurrentSale] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: printSettings } = useQuery<POSPrintSettings>({
    queryKey: ["/api/pos/print-settings"],
  });

  const { data: company } = useQuery({
    queryKey: ["/api/companies/current"],
  });

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      return await apiRequest("POST", "/api/pos/sales", saleData);
    },
    onSuccess: (sale: any) => {
      toast({
        title: "Venta completada",
        description: `Venta ${sale.saleNumber} registrada exitosamente.`,
      });
      setCurrentSale({ ...sale, items: cart });
      setCart([]);
      setSelectedCustomer(null);
      setCashReceived("");
      setIsCheckoutOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/pos/sales"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo completar la venta.",
        variant: "destructive",
      });
    },
  });

  const availableProducts = products?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const addToCart = (product: Product) => {
    setCart(current => {
      const existingItem = current.find(item => item.product.id === product.id);
      if (existingItem) {
        return current.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * parseFloat(product.price) }
            : item
        );
      }
      return [...current, { product, quantity: 1, subtotal: parseFloat(product.price) }];
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(current =>
      current.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * parseFloat(item.product.price) }
          : item
      )
    );
  };

  const removeFromCart = (productId: number) => {
    setCart(current => current.filter(item => item.product.id !== productId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const cartITBIS = calculateITBIS(cartSubtotal);
  const cartTotal = cartSubtotal + cartITBIS;
  const cashChange = paymentMethod === "cash" ? Math.max(0, parseFloat(cashReceived || "0") - cartTotal) : 0;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Carrito vacío",
        description: "Agrega productos al carrito antes de procesar la venta.",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "cash" && parseFloat(cashReceived) < cartTotal) {
      toast({
        title: "Pago insuficiente",
        description: "El monto recibido es menor al total de la venta.",
        variant: "destructive",
      });
      return;
    }

    const saleData = {
      customerId: selectedCustomer?.id || null,
      subtotal: cartSubtotal.toFixed(2),
      itbis: cartITBIS.toFixed(2),
      total: cartTotal.toFixed(2),
      paymentMethod,
      cashReceived: paymentMethod === "cash" ? cashReceived : null,
      cashChange: paymentMethod === "cash" ? cashChange.toFixed(2) : null,
      ncf: generateNCF("B01", Math.floor(Math.random() * 100000)),
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity.toString(),
        unitPrice: item.product.price,
        subtotal: item.subtotal.toFixed(2),
      })),
    };

    createSaleMutation.mutate(saleData);
  };

  const handlePrint = () => {
    if (!currentSale) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const printContent = printRef.current?.innerHTML || '';
      printWindow.document.write(`
        <html>
          <head>
            <title>Recibo - ${currentSale.saleNumber}</title>
            <style>
              body { margin: 0; padding: 0; font-family: monospace; }
              .print-container { page-break-after: always; }
              @media print {
                body { -webkit-print-color-adjust: exact; }
                .print-container { margin: 0; padding: 2mm; }
              }
            </style>
          </head>
          <body>${printContent}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Header title="Punto de Venta (POS)" subtitle="Sistema de ventas con impresión térmica" />
      
      <div className="flex h-[calc(100vh-120px)]">
        {/* Products Panel */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableProducts.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4">
                  <div className="text-center">
                    <Package className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 truncate">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{product.code}</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatDOP(parseFloat(product.price))}
                    </p>
                    <Badge variant={parseInt(product.stock) > 0 ? "default" : "destructive"} className="text-xs">
                      Stock: {product.stock}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Carrito
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPrintSettingsOpen(true)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                {currentSale && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <p className="mt-2 text-gray-500 dark:text-gray-400">Carrito vacío</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{item.product.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDOP(parseFloat(item.product.price))} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatDOP(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>ITBIS (18%):</span>
                  <span>{formatDOP(cartITBIS)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatDOP(cartTotal)}</span>
                </div>
              </div>

              <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Procesar Venta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Procesar Venta</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Cliente (Opcional)</label>
                      <Select onValueChange={(value) => {
                        const customer = customers?.find(c => c.id.toString() === value);
                        setSelectedCustomer(customer || undefined);
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cliente..." />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Método de Pago</label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant={paymentMethod === "cash" ? "default" : "outline"}
                          onClick={() => setPaymentMethod("cash")}
                          className="flex-1"
                        >
                          <Banknote className="mr-2 h-4 w-4" />
                          Efectivo
                        </Button>
                        <Button
                          variant={paymentMethod === "card" ? "default" : "outline"}
                          onClick={() => setPaymentMethod("card")}
                          className="flex-1"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Tarjeta
                        </Button>
                      </div>
                    </div>

                    {paymentMethod === "cash" && (
                      <div>
                        <label className="text-sm font-medium">Monto Recibido</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                          placeholder="0.00"
                        />
                        {cashReceived && (
                          <p className="text-sm text-gray-500 mt-1">
                            Cambio: {formatDOP(cashChange)}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                      <div className="flex justify-between font-bold">
                        <span>Total a Pagar:</span>
                        <span>{formatDOP(cartTotal)}</span>
                      </div>
                    </div>

                    <Button
                      onClick={handleCheckout}
                      disabled={createSaleMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Completar Venta
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>

      {/* Print Preview */}
      {currentSale && (
        <div className="hidden">
          <div ref={printRef}>
            {printSettings?.printerWidth === "58mm" ? (
              <PrintTemplate58mm
                sale={currentSale}
                items={currentSale.items || cart}
                customer={selectedCustomer}
                settings={printSettings}
                company={company}
              />
            ) : (
              <PrintTemplate80mm
                sale={currentSale}
                items={currentSale.items || cart}
                customer={selectedCustomer}
                settings={printSettings || { printerWidth: "80mm", showNCF: true, showCustomerInfo: true }}
                company={company}
              />
            )}
          </div>
        </div>
      )}

      {/* Print Settings Dialog */}
      <Dialog open={isPrintSettingsOpen} onOpenChange={setIsPrintSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración de Impresión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ancho de Impresora</label>
              <Select defaultValue={printSettings?.printerWidth || "80mm"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">80mm (Estándar)</SelectItem>
                  <SelectItem value="58mm">58mm (Compacta)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Texto del Encabezado</label>
              <Input placeholder="Mensaje personalizado..." />
            </div>
            <div>
              <label className="text-sm font-medium">Texto del Pie</label>
              <Input placeholder="Gracias por su compra..." />
            </div>
            <Button className="w-full">Guardar Configuración</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}