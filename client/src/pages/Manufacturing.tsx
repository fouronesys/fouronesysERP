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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Factory, Calendar, Play, Pause, CheckCircle, XCircle, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ProductionOrder, Product } from "@shared/schema";

const productionOrderSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto"),
  quantity: z.string().min(1, "La cantidad es requerida"),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  notes: z.string().optional(),
});

type ProductionOrderFormData = z.infer<typeof productionOrderSchema>;

export default function Manufacturing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("orders");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: productionOrders, isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ["/api/production-orders"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<ProductionOrderFormData>({
    resolver: zodResolver(productionOrderSchema),
    defaultValues: {
      productId: "",
      quantity: "",
      plannedStartDate: "",
      plannedEndDate: "",
      notes: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: ProductionOrderFormData) => {
      const orderNumber = `OP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      return await apiRequest("/api/production-orders", {
        method: "POST",
        body: {
          number: orderNumber,
          productId: parseInt(data.productId),
          quantity: parseInt(data.quantity),
          plannedStartDate: data.plannedStartDate || undefined,
          plannedEndDate: data.plannedEndDate || undefined,
          notes: data.notes || undefined,
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Orden de producción creada",
        description: "La orden de producción ha sido creada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la orden de producción.",
        variant: "destructive",
      });
    },
  });

  const manufacturedProducts = products || [];
  
  const filteredOrders = productionOrders?.filter(order => {
    const product = products?.find(p => p.id === order.productId);
    return order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
           product?.name.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const onSubmit = (data: ProductionOrderFormData) => {
    createOrderMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { 
        label: "Borrador", 
        color: "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300",
        icon: Clock
      },
      planned: { 
        label: "Planificada", 
        color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
        icon: Calendar
      },
      in_progress: { 
        label: "En Proceso", 
        color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
        icon: Play
      },
      completed: { 
        label: "Completada", 
        color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
        icon: CheckCircle
      },
      cancelled: { 
        label: "Cancelada", 
        color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
        icon: XCircle
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getProductName = (productId: number) => {
    const product = products?.find(p => p.id === productId);
    return product?.name || `Producto #${productId}`;
  };

  if (isLoading) {
    return (
      <div className="flex-1 h-screen overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <Header title="Producción" subtitle="Gestiona las órdenes de producción y manufactura" />
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando órdenes de producción...</p>
          </div>
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
              Módulo de Producción
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona las órdenes de producción y manufactura
            </p>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">Órdenes de Producción</TabsTrigger>
            <TabsTrigger value="bom">Lista de Materiales (BOM)</TabsTrigger>
            <TabsTrigger value="recipes">Recetas</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-6">
            {/* Actions and Search */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar órdenes por número o producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Orden
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Nueva Orden de Producción</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="productId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Producto a Manufacturar</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar producto" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {manufacturedProducts.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name} ({product.code})
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
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad a Producir</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="plannedStartDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha Planificada de Inicio</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="plannedEndDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fecha Planificada de Fin</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
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
                              <Textarea placeholder="Notas adicionales sobre la producción..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createOrderMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Crear Orden
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Production Orders List */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Factory className="mr-2 h-5 w-5" />
                  Órdenes de Producción ({filteredOrders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredOrders.length === 0 ? (
                  <div className="text-center py-12">
                    <Factory className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      No hay órdenes de producción
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {searchTerm ? "No se encontraron órdenes que coincidan con tu búsqueda." : "Comienza creando tu primera orden de producción."}
                    </p>
                    {!searchTerm && (
                      <div className="mt-6">
                        <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="mr-2 h-4 w-4" />
                          Nueva Orden
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Orden
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Producto
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Cantidad
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Fechas
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {order.number}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                #{order.id}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {getProductName(order.productId)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {order.quantity} unidades
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(order.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 dark:text-white">
                                {order.plannedStartDate ? new Date(order.plannedStartDate).toLocaleDateString("es-DO") : "Sin fecha"}
                              </div>
                              {order.plannedEndDate && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  → {new Date(order.plannedEndDate).toLocaleDateString("es-DO")}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <Button variant="ghost" size="sm">
                                  <Play className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Pause className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bom" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  Lista de Materiales (BOM)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="text-gray-500 dark:text-gray-400">
                    Funcionalidad BOM en desarrollo
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recipes" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">
                  Gestión de Recetas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="text-gray-500 dark:text-gray-400">
                    Funcionalidad de recetas en desarrollo
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
