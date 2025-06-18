import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  DollarSign,
  Calendar as CalendarIcon,
  Edit,
  Eye,
  Trash2,
  Check,
  X
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Form schemas
const supplierSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  rnc: z.string().optional(),
  category: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Proveedor es requerido"),
  orderDate: z.date(),
  expectedDeliveryDate: z.date().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Producto es requerido"),
    quantity: z.number().min(1, "Cantidad debe ser mayor a 0"),
    unitPrice: z.number().min(0, "Precio debe ser mayor o igual a 0"),
  })).min(1, "Debe agregar al menos un item"),
});

const purchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Proveedor es requerido"),
  invoiceNumber: z.string().min(1, "Número de factura es requerido"),
  ncf: z.string().optional(),
  invoiceDate: z.date(),
  dueDate: z.date().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Producto es requerido"),
    quantity: z.number().min(1, "Cantidad debe ser mayor a 0"),
    unitPrice: z.number().min(0, "Precio debe ser mayor o igual a 0"),
  })).min(1, "Debe agregar al menos un item"),
});

const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Factura es requerida"),
  amount: z.number().min(0.01, "Monto debe ser mayor a 0"),
  paymentMethod: z.string().min(1, "Método de pago es requerido"),
  paymentDate: z.date(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;
type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;
type PurchaseInvoiceFormData = z.infer<typeof purchaseInvoiceSchema>;
type PaymentFormData = z.infer<typeof paymentSchema>;

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

// Dialog components
const NewSupplierDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      rnc: "",
      category: "",
      contactPerson: "",
      email: "",
      phone: "",
      address: "",
      isActive: true,
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const response = await apiRequest("POST", "/api/suppliers", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Proveedor creado",
        description: "El proveedor ha sido creado exitosamente.",
      });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "No se pudo crear el proveedor.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupplierFormData) => {
    createSupplierMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Proveedor
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Proveedor</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del proveedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="rnc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RNC</FormLabel>
                  <FormControl>
                    <Input placeholder="RNC del proveedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Input placeholder="Categoría del proveedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona de Contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del contacto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="email@ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Teléfono de contacto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dirección del proveedor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createSupplierMutation.isPending}
              >
                {createSupplierMutation.isPending ? "Creando..." : "Crear Proveedor"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

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
        <NewSupplierDialog onSuccess={() => {}} />
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

const NewPurchaseOrderDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierId: "",
      orderDate: new Date(),
      expectedDeliveryDate: undefined,
      notes: "",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: PurchaseOrderFormData) => {
      const response = await apiRequest("POST", "/api/purchase-orders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Orden creada",
        description: "La orden de compra ha sido creada exitosamente.",
      });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "No se pudo crear la orden de compra.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PurchaseOrderFormData) => {
    createOrderMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Orden de Compra</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Orden *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? "Creando..." : "Crear Orden"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const NewInvoiceDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<PurchaseInvoiceFormData>({
    resolver: zodResolver(purchaseInvoiceSchema),
    defaultValues: {
      supplierId: "",
      invoiceNumber: "",
      ncf: "",
      invoiceDate: new Date(),
      dueDate: undefined,
      notes: "",
      items: [{ productId: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: PurchaseInvoiceFormData) => {
      const response = await apiRequest("POST", "/api/purchase-invoices", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      toast({
        title: "Factura creada",
        description: "La factura ha sido creada exitosamente.",
      });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "No se pudo crear la factura.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PurchaseInvoiceFormData) => {
    createInvoiceMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva Factura de Compra</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Factura *</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de factura" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoiceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Factura *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccionar fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ncf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NCF</FormLabel>
                    <FormControl>
                      <Input placeholder="Comprobante Fiscal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createInvoiceMutation.isPending}
              >
                {createInvoiceMutation.isPending ? "Creando..." : "Crear Factura"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

const PaymentDialog = ({ invoice, onSuccess }: { invoice: PurchaseInvoice; onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      invoiceId: invoice.id.toString(),
      amount: 0,
      paymentMethod: "",
      paymentDate: new Date(),
      reference: "",
      notes: "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const response = await apiRequest("POST", "/api/purchase-payments", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-invoices"] });
      toast({
        title: "Pago registrado",
        description: "El pago ha sido registrado exitosamente.",
      });
      setOpen(false);
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CreditCard className="h-4 w-4 mr-2" />
          Pagar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pago</DialogTitle>
        </DialogHeader>
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <p className="text-sm"><strong>Factura:</strong> {invoice.invoiceNumber}</p>
          <p className="text-sm"><strong>Proveedor:</strong> {invoice.supplier?.name}</p>
          <p className="text-sm"><strong>Total:</strong> RD$ {parseFloat(invoice.totalAmount).toLocaleString()}</p>
          <p className="text-sm"><strong>Pagado:</strong> RD$ {parseFloat(invoice.paidAmount || "0").toLocaleString()}</p>
          <p className="text-sm font-medium"><strong>Pendiente:</strong> RD$ {(parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || "0")).toLocaleString()}</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a Pagar *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de Pago *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="transfer">Transferencia</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Pago *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referencia</FormLabel>
                  <FormControl>
                    <Input placeholder="Número de referencia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas del pago" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createPaymentMutation.isPending}
              >
                {createPaymentMutation.isPending ? "Registrando..." : "Registrar Pago"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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
        <NewPurchaseOrderDialog onSuccess={() => {}} />
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
        <NewInvoiceDialog onSuccess={() => {}} />
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
                  <div className="text-right space-y-2">
                    <div>
                      <p className="font-medium">
                        RD$ {parseFloat(invoice.totalAmount).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Pagado: RD$ {parseFloat(invoice.paidAmount || "0").toLocaleString()}
                      </p>
                      <p className="text-sm font-medium text-orange-600">
                        Pendiente: RD$ {(parseFloat(invoice.totalAmount) - parseFloat(invoice.paidAmount || "0")).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                      {invoice.paymentStatus !== "paid" && (
                        <PaymentDialog invoice={invoice} onSuccess={() => {}} />
                      )}
                    </div>
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