import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users, Edit, Trash2, Building2, User, Mail, Phone, MapPin, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { RNCCompanySuggestions } from "@/components/RNCCompanySuggestions";
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
    rnc: string;
    companyName?: string;
    businessName?: string;
    status?: string;
    category?: string;
    regime?: string;
    message: string;
    source?: string;
  } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

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

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await apiRequest("/api/customers", {
        method: "POST",
        body: data
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      form.reset();
      setIsDialogOpen(false);
      setEditingCustomer(null);
      setRncVerification(null);
      toast({
        title: "Cliente creado",
        description: "El cliente ha sido creado exitosamente",
      });
    },
    onError: (error: Error) => {
      console.error("Customer creation failed:", error);
      toast({
        title: "Error al crear cliente",
        description: error.message || "Error desconocido al crear el cliente",
        variant: "destructive",
      });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!editingCustomer) throw new Error("No customer selected");
      const response = await apiRequest(`/api/customers/${editingCustomer.id}`, {
        method: "PUT",
        body: data
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      form.reset();
      setIsDialogOpen(false);
      setEditingCustomer(null);
      setRncVerification(null);
      toast({
        title: "Cliente actualizado",
        description: "El cliente ha sido actualizado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/customers/${id}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado exitosamente",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCustomers = (customers as Customer[]).filter((customer: Customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.rnc?.includes(searchTerm) ||
    customer.cedula?.includes(searchTerm)
  );

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
    setRncVerification(null);
    setIsDialogOpen(true);
  };

  const handleNewCustomer = () => {
    setEditingCustomer(null);
    form.reset();
    setRncVerification(null);
    setIsDialogOpen(true);
  };

  const handleRNCVerification = async (rnc: string) => {
    console.log('RNC Verification called with:', rnc);
    
    if (!rnc || rnc.length < 9) {
      setRncVerification(null);
      return;
    }

    setIsVerifyingRNC(true);
    try {
      console.log('Making API request to verify RNC:', rnc);
      const response = await apiRequest(`/api/dgii/rnc-lookup?rnc=${encodeURIComponent(rnc)}`);
      const result = await response.json();
      console.log('RNC verification result:', result);
      
      if (result.success && result.data) {
        const verificationResult = {
          isValid: true,
          rnc: rnc,
          companyName: result.data.razonSocial || result.data.name,
          businessName: result.data.nombreComercial,
          status: result.data.estado,
          category: result.data.categoria,
          regime: result.data.regimen,
          message: "RNC válido y encontrado en DGII",
          source: "dgii"
        };
        
        setRncVerification(verificationResult);
        console.log('Set verification result:', verificationResult);
        
        // Auto-fill company name if RNC is valid and name field is empty
        if (result.data.razonSocial && !form.getValues("name")) {
          form.setValue('name', result.data.razonSocial);
          console.log('Auto-filled company name:', result.data.razonSocial);
        }
        
        toast({
          title: "RNC Verificado",
          description: `Empresa: ${result.data.razonSocial || result.data.name}`,
        });
      } else {
        const verificationResult = {
          isValid: false,
          rnc: rnc,
          message: result.message || "RNC no encontrado en DGII",
          source: "dgii"
        };
        
        setRncVerification(verificationResult);
        console.log('Set verification result (invalid):', verificationResult);
        
        toast({
          title: "RNC No Encontrado",
          description: result.message || "RNC no encontrado en DGII",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error verifying RNC:', error);
      const verificationResult = {
        isValid: false,
        rnc: rnc,
        message: "Error al verificar RNC. Intente nuevamente.",
        source: "error"
      };
      
      setRncVerification(verificationResult);
      
      toast({
        title: "Error",
        description: "Error al verificar RNC. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingRNC(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <Header 
          title="Clientes" 
          subtitle="Gestiona tu base de clientes"
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto">
      <div className="container mx-auto p-4 space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Gestión de Clientes
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Administra tu base de clientes y contactos
            </p>
          </div>
        </div>
        <div className="p-3 sm:p-6 pb-32">
        {/* Always visible action button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Lista de Clientes
        </h2>
        <Button onClick={handleNewCustomer} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar clientes por nombre, email, RNC o cédula..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredCustomers.length === 0 && !searchTerm ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
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
                      {form.watch("type") === "company" ? (
                        <RNCCompanySuggestions
                          label=""
                          placeholder="Buscar empresa por nombre..."
                          value={field.value}
                          onChange={field.onChange}
                          onCompanySelect={(company) => {
                            form.setValue("name", company.name);
                            form.setValue("rnc", company.rnc);
                            setRncVerification({
                              isValid: true,
                              rnc: company.rnc,
                              companyName: company.name,
                              status: company.status,
                              category: company.category,
                              message: "Empresa encontrada en el registro DGII",
                              source: "DGII"
                            });
                          }}
                        />
                      ) : (
                        <Input placeholder="Nombre del cliente" {...field} />
                      )}
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
                      <div className="flex gap-2">
                        <FormControl>
                          <Input 
                            placeholder="Ej: 101000013" 
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              if (rncVerification) {
                                setRncVerification(null);
                              }
                            }}
                            onBlur={(e) => {
                              const rncValue = e.target.value?.replace(/\D/g, '') || '';
                              if (rncValue && rncValue.length >= 9) {
                                handleRNCVerification(rncValue);
                              }
                            }}
                            className={
                              rncVerification?.isValid === true 
                                ? "border-green-500 bg-green-50 dark:bg-green-950" 
                                : rncVerification?.isValid === false 
                                ? "border-red-500 bg-red-50 dark:bg-red-950" 
                                : ""
                            }
                          />
                        </FormControl>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isVerifyingRNC}
                          onClick={() => {
                            const cleanRnc = field.value?.replace(/\D/g, '') || '';
                            if (cleanRnc.length >= 9) {
                              handleRNCVerification(cleanRnc);
                            }
                          }}
                          className="shrink-0 min-w-[100px] bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                        >
                          {isVerifyingRNC ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              Verificando
                            </>
                          ) : (
                            <>
                              <Search className="h-4 w-4 mr-1" />
                              Verificar
                            </>
                          )}
                        </Button>
                      </div>
                      
                      {/* Verification Result */}
                      {rncVerification && (
                        <div className={`text-sm p-3 rounded-md border mt-2 ${
                          rncVerification.isValid 
                            ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200 dark:border-green-800' 
                            : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200 dark:border-red-800'
                        }`}>
                          <div className="flex items-start gap-2">
                            {rncVerification.isValid ? (
                              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="font-medium">
                                {rncVerification.isValid ? 'RNC Válido' : 'RNC No Válido'}
                              </p>
                              {rncVerification.isValid && rncVerification.companyName && (
                                <p className="text-xs opacity-90 mt-1">
                                  <strong>Empresa:</strong> {rncVerification.companyName}
                                </p>
                              )}
                              {rncVerification.isValid && rncVerification.businessName && (
                                <p className="text-xs opacity-90 mt-1">
                                  <strong>Nombre Comercial:</strong> {rncVerification.businessName}
                                </p>
                              )}
                              {!rncVerification.isValid && (
                                <p className="text-xs opacity-90 mt-1">
                                  {rncVerification.message}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <FormMessage />
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

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="cliente@ejemplo.com" {...field} />
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
                      <Input placeholder="(809) 000-0000" {...field} />
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
                      <Textarea 
                        placeholder="Dirección completa del cliente"
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingCustomer(null);
                    setRncVerification(null);
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {createCustomerMutation.isPending || updateCustomerMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {editingCustomer ? "Actualizando..." : "Creando..."}
                    </>
                  ) : (
                    editingCustomer ? "Actualizar Cliente" : "Crear Cliente"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
        </div>
      </div>
    </div>
  );
}