import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users, Edit, Trash2, Building2, User, Mail, Phone, MapPin } from "lucide-react";
import { RNCVerificationField } from "@/components/RNCVerificationField";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { validateRNC, validateCedula, formatRNC, formatCedula } from "@/lib/dominican";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Customer } from "@shared/schema";

const customerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(["individual", "company"]),
  rnc: z.string().optional(),
  cedula: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isVerifyingRNC, setIsVerifyingRNC] = useState(false);
  const [rncVerification, setRncVerification] = useState<{
    isValid: boolean;
    companyName?: string;
    message: string;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      type: "individual",
      rnc: "",
      cedula: "",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const payload = {
        ...data,
        email: data.email || undefined,
        rnc: data.type === "company" ? formatRNC(data.rnc || "") : undefined,
        cedula: data.type === "individual" ? formatCedula(data.cedula || "") : undefined,
      };
      return await apiRequest("/api/customers", {
        method: "POST",
        body: payload
      });
    },
    onSuccess: () => {
      toast({
        title: "Cliente creado",
        description: "El cliente ha sido creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el cliente.",
        variant: "destructive",
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!editingCustomer) return;
      const payload = {
        ...data,
        email: data.email || undefined,
        rnc: data.type === "company" ? formatRNC(data.rnc || "") : undefined,
        cedula: data.type === "individual" ? formatCedula(data.cedula || "") : undefined,
      };
      return await apiRequest(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        body: payload
      });
    },
    onSuccess: () => {
      toast({
        title: "Cliente actualizado",
        description: "El cliente ha sido actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el cliente.",
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/customers/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente.",
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.rnc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.cedula?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const onSubmit = (data: CustomerFormData) => {
    if (editingCustomer) {
      updateCustomerMutation.mutate(data);
    } else {
      createCustomerMutation.mutate(data);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      type: customer.type as "individual" | "company",
      rnc: customer.rnc || "",
      cedula: customer.cedula || "",
    });
    setIsDialogOpen(true);
  };

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    form.reset();
    setRncVerification(null);
    setIsDialogOpen(true);
  };

  const handleRNCVerification = async (rnc: string) => {
    if (!rnc || rnc.length < 9) {
      setRncVerification(null);
      return;
    }

    setIsVerifyingRNC(true);
    try {
      const response = await fetch(`/api/customers/verify-rnc/${rnc.replace(/\D/g, '')}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      setRncVerification(data);
      
      if (data.isValid && data.companyName) {
        // Auto-fill company name if RNC is valid
        form.setValue('name', data.companyName);
        toast({
          title: "RNC Verificado",
          description: `Empresa: ${data.companyName}`,
        });
      } else {
        toast({
          title: "RNC No Encontrado",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error verifying RNC:', error);
      toast({
        title: "Error",
        description: "No se pudo verificar el RNC",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingRNC(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <Header title="Clientes" subtitle="Gestiona tu base de datos de clientes" />
        <div className="p-4 sm:p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando clientes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Header title="Clientes" subtitle="Gestiona tu base de datos de clientes" />
      
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {customers?.length || 0} Clientes
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filteredCustomers.length} mostrados
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleNewCustomer} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            size={isMobile ? "default" : "default"}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar clientes por nombre, RNC o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Customers Grid/List */}
        {filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="p-8 sm:p-12 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay clientes
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Comienza agregando tu primer cliente
              </p>
              <Button onClick={handleNewCustomer} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Cliente
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        customer.type === "company" 
                          ? "bg-purple-100 dark:bg-purple-900/20" 
                          : "bg-green-100 dark:bg-green-900/20"
                      }`}>
                        {customer.type === "company" ? (
                          <Building2 className={`h-4 w-4 ${
                            customer.type === "company" 
                              ? "text-purple-600 dark:text-purple-400" 
                              : "text-green-600 dark:text-green-400"
                          }`} />
                        ) : (
                          <User className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm sm:text-base truncate">{customer.name}</CardTitle>
                        <Badge 
                          variant="outline" 
                          className="text-xs mt-1"
                        >
                          {customer.type === "company" ? "Empresa" : "Individual"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(customer)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCustomerMutation.mutate(customer.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-2">
                  {customer.email && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  
                  {customer.phone && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  
                  {customer.address && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                  
                  {(customer.rnc || customer.cedula) && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {customer.type === "company" ? "RNC:" : "Cédula:"} {customer.rnc || customer.cedula}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Customer Form Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
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
                        <Input placeholder="Nombre del cliente" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="company">Empresa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("type") === "company" && (
                  <FormField
                    control={form.control}
                    name="rnc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RNC</FormLabel>
                        <RNCVerificationField 
                          field={field} 
                          onVerificationResult={(result) => {
                            if (result.isValid && result.companyName) {
                              form.setValue('name', result.companyName);
                            }
                          }}
                        />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("type") === "individual" && (
                  <FormField
                    control={form.control}
                    name="cedula"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cédula</FormLabel>
                        <FormControl>
                          <Input placeholder="000-0000000-0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@ejemplo.com" {...field} />
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
                          <Input placeholder="(000) 000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Dirección completa" 
                          className="resize-none" 
                          rows={2}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  >
                    {editingCustomer ? "Actualizar" : "Crear"} Cliente
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}