import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { User, Plus, Check, X, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const customerSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  rnc: z.string().optional(),
  cedula: z.string().optional()
});

type CustomerForm = z.infer<typeof customerSchema>;

interface POSCustomerSelectProps {
  selectedCustomer: any;
  onCustomerSelect: (customer: any) => void;
  requireFiscalCustomer?: boolean;
}

export default function POSCustomerSelect({ selectedCustomer, onCustomerSelect, requireFiscalCustomer = false }: POSCustomerSelectProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isValidatingRnc, setIsValidatingRnc] = useState(false);
  const [rncValidation, setRncValidation] = useState<{ valid: boolean; rnc: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      rnc: "",
      cedula: ""
    }
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['/api/pos/customers']
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerForm) => {
      return await apiRequest('/api/pos/customers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: (customer) => {
      toast({
        title: "Cliente creado",
        description: `Cliente ${customer.name} agregado exitosamente`
      });
      onCustomerSelect(customer);
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/pos/customers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear cliente",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Search customer by RNC with auto-fill
  const searchByRnc = async (rnc: string) => {
    if (!rnc || rnc.length < 9) {
      setRncValidation(null);
      return;
    }
    
    setIsValidatingRnc(true);
    try {
      const response = await apiRequest('/api/pos/customers/search-rnc', {
        method: 'POST',
        body: JSON.stringify({ rnc })
      });

      if (response.exists) {
        // Customer already exists, select it
        onCustomerSelect(response.customer);
        setIsDialogOpen(false);
        toast({
          title: "Cliente encontrado",
          description: `Cliente ${response.customer.name} seleccionado`
        });
      } else if (response.validation?.valid) {
        // RNC is valid, auto-fill form data
        const { data } = response.validation;
        form.setValue('name', data.name || '');
        if (data.businessName) {
          form.setValue('name', data.businessName);
        }
        setRncValidation({ valid: true, rnc, data });
        toast({
          title: "RNC válido",
          description: "Datos del cliente rellenados automáticamente"
        });
      } else {
        setRncValidation({ valid: false, rnc });
        toast({
          title: "RNC no válido",
          description: "El RNC ingresado no existe en el registro DGII",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('RNC search error:', error);
      setRncValidation({ valid: false, rnc });
      toast({
        title: "Error de validación",
        description: "No se pudo verificar el RNC",
        variant: "destructive"
      });
    } finally {
      setIsValidatingRnc(false);
    }
  };

  const onSubmit = async (values: CustomerForm) => {
    // Validate RNC for fiscal customers
    if (requireFiscalCustomer && values.rnc) {
      if (!rncValidation?.valid) {
        toast({
          title: "RNC inválido",
          description: "Debe proporcionar un RNC válido para clientes con comprobante fiscal",
          variant: "destructive"
        });
        return;
      }
    }

    await createCustomerMutation.mutateAsync(values);
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers?.find((c: any) => c.id.toString() === customerId);
    if (customer) {
      // Validate fiscal requirements
      if (requireFiscalCustomer && !customer.rnc) {
        toast({
          title: "Cliente no válido para comprobante fiscal",
          description: "Seleccione un cliente con RNC válido",
          variant: "destructive"
        });
        return;
      }
      onCustomerSelect(customer);
    }
  };

  const fiscalCustomers = customers?.filter((c: any) => c.rnc && c.isValidatedRnc) || [];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select onValueChange={handleCustomerSelect} value={selectedCustomer?.id?.toString() || ""}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={requireFiscalCustomer ? "Seleccione cliente con RNC" : "Seleccione cliente"} />
          </SelectTrigger>
          <SelectContent>
            {requireFiscalCustomer ? (
              <>
                {fiscalCustomers.length > 0 ? (
                  fiscalCustomers.map((customer: any) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{customer.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          RNC: {customer.rnc}
                        </Badge>
                        {customer.isValidatedRnc && (
                          <Check className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No hay clientes con RNC válido
                  </SelectItem>
                )}
              </>
            ) : (
              customers?.map((customer: any) => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{customer.name}</span>
                    {customer.rnc && (
                      <Badge variant="outline" className="text-xs">
                        RNC
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Cliente</DialogTitle>
              <DialogDescription>
                {requireFiscalCustomer 
                  ? "Complete la información del cliente. El RNC es obligatorio para comprobantes fiscales."
                  : "Complete la información del nuevo cliente."
                }
              </DialogDescription>
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="correo@ejemplo.com" {...field} />
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
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input placeholder="Dirección completa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rnc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          RNC {requireFiscalCustomer && "*"}
                          {isValidatingRnc && <Search className="h-3 w-3 animate-spin" />}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="000000000" 
                            {...field} 
                            onChange={(e) => {
                              field.onChange(e);
                              searchByRnc(e.target.value);
                            }}
                          />
                        </FormControl>
                        {rncValidation && (
                          <div className="flex items-center gap-1 text-sm">
                            {rncValidation.valid ? (
                              <>
                                <Check className="h-3 w-3 text-green-500" />
                                <span className="text-green-600">RNC válido</span>
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 text-red-500" />
                                <span className="text-red-600">RNC no válido</span>
                              </>
                            )}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createCustomerMutation.isPending}>
                    {createCustomerMutation.isPending ? "Creando..." : "Crear Cliente"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedCustomer && (
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border">
          <User className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium">{selectedCustomer.name}</span>
          {selectedCustomer.rnc && (
            <Badge variant="secondary" className="text-xs">
              RNC: {selectedCustomer.rnc}
            </Badge>
          )}
          {selectedCustomer.isValidatedRnc && (
            <Check className="h-3 w-3 text-green-500" />
          )}
        </div>
      )}

      {requireFiscalCustomer && !selectedCustomer?.rnc && (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Se requiere un cliente con RNC válido para generar comprobante fiscal
          </p>
        </div>
      )}
    </div>
  );
}