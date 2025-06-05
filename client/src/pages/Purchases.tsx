import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Package, 
  FileText, 
  CreditCard, 
  TrendingUp,
  Users,
  ShoppingCart,
  Receipt,
  DollarSign
} from "lucide-react";

// Tipos para evitar errores de TypeScript
interface Supplier {
  id: number;
  name: string;
  rnc?: string;
  category?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  currentBalance?: string;
  isActive: boolean;
}

interface PurchaseOrder {
  id: number;
  orderNumber: string;
  status: string;
  supplier?: { name: string };
  orderDate: string;
  totalAmount: string;
  currency: string;
}

interface PurchaseInvoice {
  id: number;
  invoiceNumber: string;
  paymentStatus: string;
  type: string;
  supplier?: { name: string };
  ncf?: string;
  invoiceDate: string;
  totalAmount: string;
  paidAmount?: string;
}

interface Stats {
  totalSuppliers?: number;
  newSuppliersThisMonth?: number;
  pendingOrders?: number;
  pendingOrdersValue?: string;
  pendingInvoices?: number;
  pendingPayments?: string;
  monthlyExpenses?: string;
  expenseChange?: string;
}

// Componentes para cada sección del módulo
const SuppliersSection = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Proveedores</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona tu catálogo de proveedores
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proveedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : suppliers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No hay proveedores registrados</p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer Proveedor
            </Button>
          </div>
        ) : (
          suppliers
            .filter((supplier: any) =>
              supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              supplier.rnc?.includes(searchTerm)
            )
            .map((supplier: any) => (
              <Card key={supplier.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">{supplier.name}</CardTitle>
                  <CardDescription>
                    {supplier.rnc && (
                      <Badge variant="outline" className="mr-2">
                        RNC: {supplier.rnc}
                      </Badge>
                    )}
                    {supplier.category}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {supplier.contactPerson && (
                      <p><strong>Contacto:</strong> {supplier.contactPerson}</p>
                    )}
                    {supplier.email && (
                      <p><strong>Email:</strong> {supplier.email}</p>
                    )}
                    {supplier.phone && (
                      <p><strong>Teléfono:</strong> {supplier.phone}</p>
                    )}
                    <div className="flex justify-between items-center mt-3">
                      <Badge variant={supplier.isActive ? "default" : "secondary"}>
                        {supplier.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                      <span className="text-sm font-medium">
                        ${parseFloat(supplier.currentBalance || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
};

const PurchaseOrdersSection = () => {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/purchase-orders"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Órdenes de Compra</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las órdenes de compra a proveedores
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (orders as PurchaseOrder[]).length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No hay órdenes de compra</p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Crear Primera Orden
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {(orders as PurchaseOrder[]).map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{order.orderNumber}</h4>
                      <Badge 
                        variant={
                          order.status === "confirmed" ? "default" :
                          order.status === "draft" ? "secondary" :
                          order.status === "cancelled" ? "destructive" : "outline"
                        }
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Proveedor: {order.supplier?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fecha: {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${parseFloat(order.totalAmount).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.currency}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const PurchaseInvoicesSection = () => {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/purchase-invoices"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Facturas de Compra</h3>
          <p className="text-sm text-muted-foreground">
            Registra facturas de proveedores y gastos
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (invoices as PurchaseInvoice[]).length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No hay facturas de compra</p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Registrar Primera Factura
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {(invoices as PurchaseInvoice[]).map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{invoice.invoiceNumber}</h4>
                      <Badge 
                        variant={
                          invoice.paymentStatus === "paid" ? "default" :
                          invoice.paymentStatus === "pending" ? "secondary" :
                          invoice.paymentStatus === "overdue" ? "destructive" : "outline"
                        }
                      >
                        {invoice.paymentStatus}
                      </Badge>
                      <Badge variant="outline">
                        {invoice.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Proveedor: {invoice.supplier?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      NCF: {invoice.ncf || "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fecha: {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${parseFloat(invoice.totalAmount).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pagado: {invoice.paidAmount || "$0.00"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default function PurchasesPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/purchases/stats"],
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compras</h1>
          <p className="text-muted-foreground">
            Gestiona proveedores, órdenes de compra, facturas y pagos
          </p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proveedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : (stats as Stats)?.totalSuppliers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              +{statsLoading ? "..." : (stats as Stats)?.newSuppliersThisMonth || 0} este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : (stats as Stats)?.pendingOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? "..." : (stats as Stats)?.pendingOrdersValue || "$0.00"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : (stats as Stats)?.pendingInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? "..." : (stats as Stats)?.pendingPayments || "$0.00"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : (stats as Stats)?.monthlyExpenses || "$0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              {statsLoading ? "..." : (stats as Stats)?.expenseChange || "0"}% vs mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs principales */}
      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="suppliers" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Proveedores</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center space-x-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Órdenes</span>
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Facturas</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Pagos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <SuppliersSection />
        </TabsContent>

        <TabsContent value="orders">
          <PurchaseOrdersSection />
        </TabsContent>

        <TabsContent value="invoices">
          <PurchaseInvoicesSection />
        </TabsContent>

        <TabsContent value="payments">
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Módulo de pagos en desarrollo</p>
            <p className="text-sm text-muted-foreground">
              Pronto podrás gestionar los pagos a proveedores desde aquí
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}