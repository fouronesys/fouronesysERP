import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, Settings, 
  Package, Truck, AlertCircle, CheckCircle, Clock, Search,
  FileSpreadsheet, Filter, Plus, Edit, Trash2
} from "lucide-react";
import type { Product, Warehouse } from "@shared/schema";

// Movement Schema with enhanced validation
const movementSchema = z.object({
  type: z.enum(["ENTRADA", "SALIDA", "TRANSFERENCIA", "AJUSTE", "DEVOLUCION", "MERMA"]),
  warehouseFromId: z.string().optional(),
  warehouseToId: z.string().min(1, "El almacén es requerido"),
  reference: z.string().min(1, "La referencia es requerida"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "El producto es requerido"),
    quantity: z.number().min(1, "La cantidad debe ser mayor a 0"),
    unitCost: z.number().optional(),
    reason: z.string().optional(),
    lotNumber: z.string().optional(),
    expiryDate: z.string().optional(),
  })).min(1, "Debe agregar al menos un producto")
});

type MovementFormData = z.infer<typeof movementSchema>;

// Movement types configuration
const MOVEMENT_TYPES = {
  ENTRADA: { label: "Entrada", icon: ArrowDownCircle, color: "text-green-600" },
  SALIDA: { label: "Salida", icon: ArrowUpCircle, color: "text-red-600" },
  TRANSFERENCIA: { label: "Transferencia", icon: ArrowLeftRight, color: "text-blue-600" },
  AJUSTE: { label: "Ajuste", icon: Settings, color: "text-orange-600" },
  DEVOLUCION: { label: "Devolución", icon: Package, color: "text-purple-600" },
  MERMA: { label: "Merma", icon: AlertCircle, color: "text-yellow-600" }
};

export default function InventoryMovements() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<keyof typeof MOVEMENT_TYPES>("ENTRADA");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [movementItems, setMovementItems] = useState<any[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: "ENTRADA",
      warehouseToId: "",
      reference: "",
      notes: "",
      items: []
    },
  });

  // Queries
  const { data: movements, isLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory/movements"],
  });

  const { data: warehouses } = useQuery<Warehouse[]>({
    queryKey: ["/api/warehouses"],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Create movement mutation
  const createMovementMutation = useMutation({
    mutationFn: async (data: MovementFormData) => {
      await apiRequest("/api/inventory/movements", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Movimiento registrado",
        description: "El movimiento ha sido registrado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setIsDialogOpen(false);
      form.reset();
      setMovementItems([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el movimiento.",
        variant: "destructive",
      });
    },
  });

  // Add item to movement
  const addMovementItem = () => {
    setMovementItems([...movementItems, {
      productId: "",
      quantity: 1,
      unitCost: 0,
      reason: "",
      lotNumber: "",
      expiryDate: ""
    }]);
  };

  // Remove item from movement
  const removeMovementItem = (index: number) => {
    setMovementItems(movementItems.filter((_, i) => i !== index));
  };

  // Update item in movement
  const updateMovementItem = (index: number, field: string, value: any) => {
    const updated = [...movementItems];
    updated[index] = { ...updated[index], [field]: value };
    setMovementItems(updated);
  };

  // Handle form submission
  const onSubmit = (data: MovementFormData) => {
    if (movementItems.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un producto al movimiento.",
        variant: "destructive",
      });
      return;
    }

    const formData = {
      ...data,
      items: movementItems.map(item => ({
        ...item,
        productId: parseInt(item.productId),
        quantity: parseInt(item.quantity)
      }))
    };

    createMovementMutation.mutate(formData);
  };

  // Filter movements
  const filteredMovements = movements?.filter(movement => {
    const matchesSearch = movement.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesWarehouse = filterWarehouse === "all" || 
                           movement.warehouseToId === parseInt(filterWarehouse) ||
                           movement.warehouseFromId === parseInt(filterWarehouse);
    const matchesType = filterType === "all" || movement.type === filterType;
    return matchesSearch && matchesWarehouse && matchesType;
  }) || [];

  // Get movement statistics
  const getMovementStats = () => {
    if (!movements) return { total: 0, entries: 0, exits: 0, transfers: 0 };
    
    return {
      total: movements.length,
      entries: movements.filter(m => m.type === "ENTRADA").length,
      exits: movements.filter(m => m.type === "SALIDA").length,
      transfers: movements.filter(m => m.type === "TRANSFERENCIA").length
    };
  };

  const stats = getMovementStats();

  return (
    <div className="h-screen overflow-y-auto">
      <Header 
        title="Gestión de Bodegas" 
        subtitle="Control completo de movimientos de inventario" 
      />
      
      <div className="p-4 sm:p-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Movimientos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Package className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Entradas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.entries}</p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Salidas</p>
                  <p className="text-2xl font-bold text-red-600">{stats.exits}</p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Transferencias</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.transfers}</p>
                </div>
                <ArrowLeftRight className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="movements" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="movements">Movimientos</TabsTrigger>
            <TabsTrigger value="warehouses">Bodegas</TabsTrigger>
            <TabsTrigger value="stock">Stock por Bodega</TabsTrigger>
          </TabsList>

          {/* Movements Tab */}
          <TabsContent value="movements" className="space-y-4">
            {/* Filters and Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por referencia o notas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterWarehouse} onValueChange={setFilterWarehouse}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todas las bodegas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las bodegas</SelectItem>
                    {warehouses?.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {Object.entries(MOVEMENT_TYPES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button variant="outline">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Movimiento
                </Button>
              </div>
            </div>

            {/* Movements Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead>Hacia</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMovements.map((movement) => {
                      const typeConfig = MOVEMENT_TYPES[movement.type as keyof typeof MOVEMENT_TYPES];
                      const Icon = typeConfig?.icon || Package;
                      
                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="font-medium">
                            {movement.reference}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${typeConfig?.color}`} />
                              <span>{typeConfig?.label || movement.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {movement.warehouseFrom?.name || "-"}
                          </TableCell>
                          <TableCell>
                            {movement.warehouseTo?.name || "-"}
                          </TableCell>
                          <TableCell>
                            {movement.items?.length || 0} items
                          </TableCell>
                          <TableCell>
                            <Badge variant={movement.status === "completed" ? "default" : "secondary"}>
                              {movement.status === "completed" ? "Completado" : "Pendiente"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(movement.createdAt).toLocaleDateString('es-DO')}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              Ver detalles
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Warehouses Tab */}
          <TabsContent value="warehouses">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Bodegas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Configuración de bodegas y ubicaciones</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stock by Warehouse Tab */}
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle>Stock por Bodega</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Vista de inventario distribuido por bodega</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Movement Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo Movimiento de Inventario</DialogTitle>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Movement Type Selection */}
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(MOVEMENT_TYPES).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedType(key as keyof typeof MOVEMENT_TYPES);
                          form.setValue("type", key as any);
                        }}
                        className={`p-4 border rounded-lg text-center transition-colors ${
                          selectedType === key 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-8 w-8 mx-auto mb-2 ${config.color}`} />
                        <span className="font-medium">{config.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Movement Details */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedType === "TRANSFERENCIA" && (
                    <FormField
                      control={form.control}
                      name="warehouseFromId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bodega Origen *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione bodega origen" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {warehouses?.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                  {warehouse.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="warehouseToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {selectedType === "SALIDA" ? "Bodega Origen" : "Bodega Destino"} *
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione bodega" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {warehouses?.map((warehouse) => (
                              <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                {warehouse.name}
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
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referencia *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: ORD-001, FAC-123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Products Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Productos</h3>
                    <Button type="button" onClick={addMovementItem} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Producto
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {movementItems.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                          <div className="col-span-2">
                            <Label>Producto</Label>
                            <Select 
                              value={item.productId} 
                              onValueChange={(value) => updateMovementItem(index, 'productId', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione producto" />
                              </SelectTrigger>
                              <SelectContent>
                                {products?.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    {product.name} - {product.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Cantidad</Label>
                            <Input 
                              type="number" 
                              min="1" 
                              value={item.quantity}
                              onChange={(e) => updateMovementItem(index, 'quantity', e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Costo Unitario</Label>
                            <Input 
                              type="number" 
                              min="0" 
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) => updateMovementItem(index, 'unitCost', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label>Lote (Opcional)</Label>
                            <Input 
                              value={item.lotNumber}
                              onChange={(e) => updateMovementItem(index, 'lotNumber', e.target.value)}
                              placeholder="Número de lote"
                            />
                          </div>

                          <div>
                            <Label>Fecha Vencimiento (Opcional)</Label>
                            <Input 
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => updateMovementItem(index, 'expiryDate', e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Razón</Label>
                            <Input 
                              value={item.reason}
                              onChange={(e) => updateMovementItem(index, 'reason', e.target.value)}
                              placeholder="Motivo del movimiento"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => removeMovementItem(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observaciones adicionales..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Form Actions */}
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      form.reset();
                      setMovementItems([]);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMovementMutation.isPending || movementItems.length === 0}
                  >
                    Registrar Movimiento
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