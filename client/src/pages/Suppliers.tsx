import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Plus, Search, Edit, Trash2, Package, Building2, Phone, Mail, MapPin } from "lucide-react";
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
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const supplierSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  rnc: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  contactName: z.string().optional(),
  paymentTerms: z.enum(["cash", "15days", "30days", "45days", "60days"]).default("30days"),
  notes: z.string().optional(),
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
      name: "",
      rnc: "",
      email: "",
      phone: "",
      address: "",
      contactName: "",
      paymentTerms: "30days",
      notes: "",
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
      name: supplier.name,
      rnc: supplier.rnc || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      contactName: supplier.contactName || "",
      paymentTerms: supplier.paymentTerms || "30days",
      notes: supplier.notes || "",
    });
  };

  const filteredSuppliers = suppliers.filter((supplier: any) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.rnc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="space-y-6">
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
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Nombre del Proveedor</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre completo" />
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
                          <Input {...field} placeholder="RNC o Cédula" />
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
                          <Input {...field} type="email" placeholder="email@ejemplo.com" />
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
                          <Input {...field} placeholder="809-555-5555" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Persona de Contacto</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre del contacto" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Términos de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar términos" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Contado</SelectItem>
                            <SelectItem value="15days">15 días</SelectItem>
                            <SelectItem value="30days">30 días</SelectItem>
                            <SelectItem value="45days">45 días</SelectItem>
                            <SelectItem value="60days">60 días</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Dirección completa" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Notas adicionales" rows={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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