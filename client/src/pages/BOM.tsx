import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, List, Package, Edit, Trash2, Calculator, Factory } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product, BOM } from "@shared/schema";

const bomSchema = z.object({
  productId: z.string().min(1, "Selecciona un producto"),
  materialId: z.string().min(1, "Selecciona un material"),
  quantity: z.string().min(1, "La cantidad es requerida"),
  unit: z.string().min(1, "La unidad es requerida"),
});

type BOMFormData = z.infer<typeof bomSchema>;

export default function BOM() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: bomItems, isLoading } = useQuery<BOM[]>({
    queryKey: ["/api/bom", selectedProductId],
    enabled: !!selectedProductId,
    queryFn: () => fetch(`/api/bom/${selectedProductId}`).then(res => res.json()),
  });

  const form = useForm<BOMFormData>({
    resolver: zodResolver(bomSchema),
    defaultValues: {
      productId: "",
      materialId: "",
      quantity: "",
      unit: "unit",
    },
  });

  const createBOMMutation = useMutation({
    mutationFn: async (data: BOMFormData) => {
      await apiRequest("POST", "/api/bom", {
        productId: parseInt(data.productId),
        materialId: parseInt(data.materialId),
        quantity: parseFloat(data.quantity),
        unit: data.unit,
      });
    },
    onSuccess: () => {
      toast({
        title: "Material agregado",
        description: "El material ha sido agregado a la lista de materiales.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bom", selectedProductId] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo agregar el material.",
        variant: "destructive",
      });
    },
  });

  const updateBOMMutation = useMutation({
    mutationFn: async (data: BOMFormData) => {
      if (!editingBOM) return;
      await apiRequest("PUT", `/api/bom/${editingBOM.id}`, {
        productId: parseInt(data.productId),
        materialId: parseInt(data.materialId),
        quantity: parseFloat(data.quantity),
        unit: data.unit,
      });
    },
    onSuccess: () => {
      toast({
        title: "Material actualizado",
        description: "El material ha sido actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bom", selectedProductId] });
      setIsDialogOpen(false);
      setEditingBOM(null);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el material.",
        variant: "destructive",
      });
    },
  });

  const deleteBOMMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/bom/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Material eliminado",
        description: "El material ha sido eliminado de la lista.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bom", selectedProductId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el material.",
        variant: "destructive",
      });
    },
  });

  const manufacturedProducts = products?.filter(p => p.isManufactured) || [];
  const materialProducts = products?.filter(p => !p.isManufactured) || [];

  const filteredBOMItems = bomItems?.filter(item => {
    const material = products?.find(p => p.id === item.materialId);
    return material?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           material?.code.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const onSubmit = (data: BOMFormData) => {
    if (editingBOM) {
      updateBOMMutation.mutate(data);
    } else {
      createBOMMutation.mutate(data);
    }
  };

  const handleEdit = (bom: BOM) => {
    setEditingBOM(bom);
    form.reset({
      productId: bom.productId.toString(),
      materialId: bom.materialId.toString(),
      quantity: bom.quantity,
      unit: bom.unit,
    });
    setIsDialogOpen(true);
  };

  const handleNewBOM = () => {
    setEditingBOM(null);
    form.reset({
      productId: selectedProductId?.toString() || "",
      materialId: "",
      quantity: "",
      unit: "unit",
    });
    setIsDialogOpen(true);
  };

  const getProductName = (productId: number) => {
    const product = products?.find(p => p.id === productId);
    return product?.name || `Producto #${productId}`;
  };

  const getProductCode = (productId: number) => {
    const product = products?.find(p => p.id === productId);
    return product?.code || "";
  };

  const calculateTotalCost = () => {
    if (!bomItems || !products) return 0;
    
    return bomItems.reduce((total, item) => {
      const material = products.find(p => p.id === item.materialId);
      const cost = material?.cost ? parseFloat(material.cost) : 0;
      return total + (cost * parseFloat(item.quantity));
    }, 0);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <Header title="Lista de Materiales (BOM)" subtitle="Gestiona los materiales e ingredientes de tus productos manufacturados" />
      
      <div className="p-6">
        <Tabs defaultValue="bom" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bom">Lista de Materiales</TabsTrigger>
            <TabsTrigger value="calculator">Calculadora de Costos</TabsTrigger>
          </TabsList>

          <TabsContent value="bom" className="space-y-6">
            {/* Product Selection */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Factory className="mr-2 h-5 w-5" />
                  Seleccionar Producto a Manufacturar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select 
                  value={selectedProductId?.toString() || undefined} 
                  onValueChange={(value) => setSelectedProductId(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un producto manufacturado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {manufacturedProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name} ({product.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {manufacturedProducts.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    No hay productos manufacturados. Marca productos como "manufacturados" en la sección de productos.
                  </p>
                )}
              </CardContent>
            </Card>

            {selectedProductId && (
              <>
                {/* Actions and Search */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar materiales..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={handleNewBOM} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Material
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingBOM ? "Editar Material" : "Agregar Material a BOM"}
                        </DialogTitle>
                      </DialogHeader>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="productId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Producto Final</FormLabel>
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
                            name="materialId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Material/Ingrediente</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar material" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {materialProducts.map((product) => (
                                      <SelectItem key={product.id} value={product.id.toString()}>
                                        {product.name} ({product.code}) - {product.unit}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="quantity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Cantidad Necesaria</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.0001" placeholder="1.5" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="unit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unidad</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar unidad" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="unit">Unidad</SelectItem>
                                      <SelectItem value="kg">Kilogramo</SelectItem>
                                      <SelectItem value="lb">Libra</SelectItem>
                                      <SelectItem value="l">Litro</SelectItem>
                                      <SelectItem value="ml">Mililitro</SelectItem>
                                      <SelectItem value="m">Metro</SelectItem>
                                      <SelectItem value="cm">Centímetro</SelectItem>
                                      <SelectItem value="g">Gramo</SelectItem>
                                      <SelectItem value="oz">Onza</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

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
                              disabled={createBOMMutation.isPending || updateBOMMutation.isPending}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {editingBOM ? "Actualizar" : "Agregar"} Material
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* BOM List */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <List className="mr-2 h-5 w-5" />
                        BOM para: {getProductName(selectedProductId)} ({getProductCode(selectedProductId)})
                      </div>
                      <div className="text-sm font-normal text-gray-500 dark:text-gray-400">
                        {filteredBOMItems.length} materiales
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando materiales...</p>
                      </div>
                    ) : filteredBOMItems.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                          No hay materiales en la BOM
                        </h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {searchTerm ? "No se encontraron materiales que coincidan con tu búsqueda." : "Comienza agregando materiales a este producto."}
                        </p>
                        {!searchTerm && (
                          <div className="mt-6">
                            <Button onClick={handleNewBOM} className="bg-blue-600 hover:bg-blue-700 text-white">
                              <Plus className="mr-2 h-4 w-4" />
                              Agregar Material
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
                                Material/Ingrediente
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Código
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Cantidad
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Costo Unitario
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Costo Total
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredBOMItems.map((item) => {
                              const material = products?.find(p => p.id === item.materialId);
                              const unitCost = material?.cost ? parseFloat(material.cost) : 0;
                              const totalCost = unitCost * parseFloat(item.quantity);
                              
                              return (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {material?.name || `Material #${item.materialId}`}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {material?.code || "N/A"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {item.quantity} {item.unit}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {new Intl.NumberFormat("es-DO", {
                                      style: "currency",
                                      currency: "DOP",
                                    }).format(unitCost)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {new Intl.NumberFormat("es-DO", {
                                      style: "currency",
                                      currency: "DOP",
                                    }).format(totalCost)}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex items-center justify-end space-x-2">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleEdit(item)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => deleteBOMMutation.mutate(item.id)}
                                        disabled={deleteBOMMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <td colSpan={4} className="px-6 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                                Costo Total de Materiales:
                              </td>
                              <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">
                                {new Intl.NumberFormat("es-DO", {
                                  style: "currency",
                                  currency: "DOP",
                                }).format(calculateTotalCost())}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900 dark:text-white">
                  <Calculator className="mr-2 h-5 w-5" />
                  Calculadora de Costos de Producción
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Calculator className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Calculadora de Costos
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Próximamente: herramientas avanzadas para calcular costos de producción, márgenes y precios sugeridos.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}