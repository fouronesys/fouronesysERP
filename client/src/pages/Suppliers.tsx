import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Package, 
  Building2, 
  Phone, 
  Mail, 
  MapPin,
  CreditCard,
  Star,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  User,
  Globe
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

const supplierSchema = z.object({
  // Basic Information
  code: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  businessName: z.string().optional(),
  rnc: z.string().optional(),
  
  // Contact Information
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  
  // Primary Contact Person
  contactPerson: z.string().optional(),
  contactPersonPosition: z.string().optional(),
  contactPersonPhone: z.string().optional(),
  contactPersonEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  
  // Address Information
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().default("República Dominicana"),
  postalCode: z.string().optional(),
  
  // Business Information
  supplierType: z.enum(["goods", "services", "both"]).default("goods"),
  category: z.string().optional(),
  industry: z.string().optional(),
  taxRegime: z.string().optional(),
  
  // Payment Information
  paymentTerms: z.coerce.number().min(0).max(365).default(30),
  paymentMethod: z.enum(["cash", "check", "transfer", "card"]).default("transfer"),
  creditLimit: z.coerce.number().min(0).default(0),
  currency: z.enum(["DOP", "USD", "EUR"]).default("DOP"),
  discountPercentage: z.coerce.number().min(0).max(100).default(0),
  
  // Banking Information
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankAccountType: z.enum(["checking", "savings"]).optional(),
  bankRoutingNumber: z.string().optional(),
  
  // Compliance & Classification
  taxId: z.string().optional(),
  businessLicense: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  
  // Status and Priority
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  preferredSupplier: z.boolean().default(false),
  status: z.enum(["active", "inactive", "blocked", "suspended"]).default("active"),
  
  // Notes
  internalNotes: z.string().optional(),
  publicNotes: z.string().optional(),
  
  // Tags
  tags: z.array(z.string()).default([]),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export default function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const { toast } = useToast();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
  });

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: "",
      name: "",
      businessName: "",
      rnc: "",
      email: "",
      phone: "",
      mobile: "",
      fax: "",
      website: "",
      contactPerson: "",
      contactPersonPosition: "",
      contactPersonPhone: "",
      contactPersonEmail: "",
      address: "",
      city: "",
      state: "",
      country: "República Dominicana",
      postalCode: "",
      supplierType: "goods",
      category: "",
      industry: "",
      taxRegime: "",
      paymentTerms: 30,
      paymentMethod: "transfer",
      creditLimit: 0,
      currency: "DOP",
      discountPercentage: 0,
      bankName: "",
      bankAccount: "",
      bankAccountType: undefined,
      bankRoutingNumber: "",
      taxId: "",
      businessLicense: "",
      certifications: [],
      priority: "normal",
      preferredSupplier: false,
      status: "active",
      internalNotes: "",
      publicNotes: "",
      tags: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: SupplierFormData) =>
      apiRequest("/api/suppliers", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Proveedor creado",
        description: "El proveedor ha sido creado exitosamente.",
      });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al crear el proveedor",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SupplierFormData }) =>
      apiRequest(`/api/suppliers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Proveedor actualizado",
        description: "El proveedor ha sido actualizado exitosamente.",
      });
      setEditingSupplier(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el proveedor",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Proveedor eliminado",
        description: "El proveedor ha sido eliminado exitosamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al eliminar el proveedor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupplierFormData) => {
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    form.reset({
      ...supplier,
      contactPerson: supplier.contactPerson || "",
      paymentTerms: supplier.paymentTerms || 30,
    });
  };

  const filteredSuppliers = Array.isArray(suppliers) ? (suppliers as any[]).filter((supplier: any) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.rnc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const getPaymentTermsLabel = (terms: string) => {
    const labels: Record<string, string> = {
      cash: "Contado",
      "15days": "15 días",
      "30days": "30 días",
      "45days": "45 días",
      "60days": "60 días",
    };
    return labels[terms] || terms;
  };

  return (
    <div className="space-y-6 h-screen overflow-y-auto max-h-screen p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Proveedores</h1>
        <Dialog open={isAddDialogOpen || !!editingSupplier} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setEditingSupplier(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="general" className="w-full">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="contact">Contacto</TabsTrigger>
                    <TabsTrigger value="financial">Financiero</TabsTrigger>
                    <TabsTrigger value="compliance">Cumplimiento</TabsTrigger>
                    <TabsTrigger value="notes">Notas</TabsTrigger>
                  </TabsList>

                  <TabsContent value="general" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Información Básica</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código de Proveedor</FormLabel>
                              <FormControl>
                                <Input placeholder="AUTO-001" {...field} />
                              </FormControl>
                              <FormDescription>
                                Dejar vacío para generar automáticamente
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">Activo</SelectItem>
                                  <SelectItem value="inactive">Inactivo</SelectItem>
                                  <SelectItem value="blocked">Bloqueado</SelectItem>
                                  <SelectItem value="suspended">Suspendido</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre Comercial*</FormLabel>
                              <FormControl>
                                <Input placeholder="Distribuidora XYZ" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="businessName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Razón Social</FormLabel>
                              <FormControl>
                                <Input placeholder="XYZ S.R.L." {...field} />
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
                                <Input placeholder="101-12345-6" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="taxId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ID Fiscal</FormLabel>
                              <FormControl>
                                <Input placeholder="Otro identificador fiscal" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="supplierType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Proveedor</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="goods">Bienes</SelectItem>
                                  <SelectItem value="services">Servicios</SelectItem>
                                  <SelectItem value="both">Bienes y Servicios</SelectItem>
                                </SelectContent>
                              </Select>
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar categoría" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="materials">Materiales</SelectItem>
                                  <SelectItem value="equipment">Equipos</SelectItem>
                                  <SelectItem value="services">Servicios</SelectItem>
                                  <SelectItem value="consumables">Consumibles</SelectItem>
                                  <SelectItem value="utilities">Utilidades</SelectItem>
                                  <SelectItem value="contractors">Contratistas</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="industry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industria</FormLabel>
                              <FormControl>
                                <Input placeholder="Ej: Tecnología, Alimentos, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Prioridad</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="low">Baja</SelectItem>
                                  <SelectItem value="normal">Normal</SelectItem>
                                  <SelectItem value="high">Alta</SelectItem>
                                  <SelectItem value="critical">Crítica</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="preferredSupplier"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Proveedor Preferido
                                </FormLabel>
                                <FormDescription>
                                  Marcar como proveedor preferido para esta categoría
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Información de Contacto</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Principal</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="proveedor@example.com" {...field} />
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
                                <Input placeholder="809-555-1234" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="mobile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Móvil</FormLabel>
                              <FormControl>
                                <Input placeholder="829-555-1234" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fax</FormLabel>
                              <FormControl>
                                <Input placeholder="809-555-1235" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Sitio Web</FormLabel>
                              <FormControl>
                                <Input placeholder="https://www.example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Separator className="col-span-2 my-4" />
                        
                        <div className="col-span-2">
                          <h4 className="text-sm font-medium mb-4">Persona de Contacto Principal</h4>
                        </div>

                        <FormField
                          control={form.control}
                          name="contactPerson"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nombre Completo</FormLabel>
                              <FormControl>
                                <Input placeholder="Juan Pérez" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactPersonPosition"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cargo</FormLabel>
                              <FormControl>
                                <Input placeholder="Gerente de Ventas" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactPersonPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Teléfono Directo</FormLabel>
                              <FormControl>
                                <Input placeholder="829-555-5678" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="contactPersonEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Directo</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="contacto@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Dirección</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="col-span-2">
                              <FormLabel>Dirección</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Calle, número, sector" 
                                  className="resize-none" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ciudad</FormLabel>
                              <FormControl>
                                <Input placeholder="Santo Domingo" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Provincia/Estado</FormLabel>
                              <FormControl>
                                <Input placeholder="Distrito Nacional" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>País</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="postalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código Postal</FormLabel>
                              <FormControl>
                                <Input placeholder="10100" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="financial" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Términos de Pago</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="paymentTerms"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plazo de Pago (días)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="365" {...field} />
                              </FormControl>
                              <FormDescription>
                                Días para el vencimiento de facturas
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="paymentMethod"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Método de Pago Preferido</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cash">Efectivo</SelectItem>
                                  <SelectItem value="check">Cheque</SelectItem>
                                  <SelectItem value="transfer">Transferencia</SelectItem>
                                  <SelectItem value="card">Tarjeta</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="currency"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Moneda</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="DOP">DOP - Peso Dominicano</SelectItem>
                                  <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="creditLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Límite de Crédito</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" step="0.01" {...field} />
                              </FormControl>
                              <FormDescription>
                                Monto máximo de crédito permitido
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="discountPercentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descuento General (%)</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" max="100" step="0.01" {...field} />
                              </FormControl>
                              <FormDescription>
                                Descuento aplicado a todas las compras
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="taxRegime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Régimen Tributario</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar régimen" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ordinary">Ordinario</SelectItem>
                                  <SelectItem value="simplified">Simplificado</SelectItem>
                                  <SelectItem value="special">Especial</SelectItem>
                                  <SelectItem value="exempt">Exento</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Información Bancaria</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Banco</FormLabel>
                              <FormControl>
                                <Input placeholder="Banco Popular" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bankAccountType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Cuenta</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="checking">Corriente</SelectItem>
                                  <SelectItem value="savings">Ahorros</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bankAccount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número de Cuenta</FormLabel>
                              <FormControl>
                                <Input placeholder="123-456789-0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="bankRoutingNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código de Ruta</FormLabel>
                              <FormControl>
                                <Input placeholder="021000021" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="compliance" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Documentación y Cumplimiento</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="businessLicense"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Licencia de Negocio</FormLabel>
                              <FormControl>
                                <Input placeholder="Número de licencia" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="certifications"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Certificaciones</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="ISO 9001, ISO 14001 (separar con comas)" 
                                  value={field.value?.join(", ") || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(value ? value.split(",").map(s => s.trim()) : []);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Certificaciones de calidad, ambientales, etc.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="col-span-2 space-y-2">
                          <h4 className="text-sm font-medium">Documentos Requeridos</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Badge variant="outline">RNC Vigente</Badge>
                              <Badge variant="outline">Registro Mercantil</Badge>
                              <Badge variant="outline">Certificación TSS</Badge>
                            </div>
                            <div className="space-y-2">
                              <Badge variant="outline">Certificación DGII</Badge>
                              <Badge variant="outline">Referencias Comerciales</Badge>
                              <Badge variant="outline">Estados Financieros</Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="notes" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Notas y Observaciones</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Etiquetas</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Confiable, Puntual, Premium (separar con comas)" 
                                  value={field.value?.join(", ") || ""}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(value ? value.split(",").map(s => s.trim()) : []);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Etiquetas para clasificar y buscar proveedores
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="publicNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notas Públicas</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Información visible para todos los usuarios"
                                  className="resize-none h-24"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Estas notas serán visibles para todos los usuarios del sistema
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="internalNotes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Notas Internas</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Información confidencial o sensible"
                                  className="resize-none h-24"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Estas notas solo serán visibles para usuarios autorizados
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingSupplier(null);
                      form.reset();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingSupplier ? "Actualizar" : "Crear"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar proveedores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Cargando proveedores...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No se encontraron proveedores</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RNC</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Términos</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier: any) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {supplier.name}
                      </div>
                    </TableCell>
                    <TableCell>{supplier.rnc || "-"}</TableCell>
                    <TableCell>{supplier.contactName || "-"}</TableCell>
                    <TableCell>
                      {supplier.email ? (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{supplier.email}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      {supplier.phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{supplier.phone}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getPaymentTermsLabel(supplier.paymentTerms)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("¿Está seguro de eliminar este proveedor?")) {
                              deleteMutation.mutate(supplier.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}