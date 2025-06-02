import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/dialog";
import { formatDOP, formatDominicanDateTime } from "@/lib/dominican";
import { POSSale } from "@shared/schema";
import { Search, Receipt, CreditCard, Banknote, Eye, TrendingUp } from "lucide-react";

export default function POSSales() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<POSSale | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: sales, isLoading } = useQuery<POSSale[]>({
    queryKey: ["/api/pos/sales"],
  });

  const { data: saleItems } = useQuery({
    queryKey: ["/api/pos/sale-items", selectedSale?.id],
    enabled: !!selectedSale,
  });

  const filteredSales = sales?.filter(sale =>
    sale.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sale.ncf && sale.ncf.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const getTotalSales = () => {
    return sales?.reduce((sum, sale) => sum + parseFloat(sale.total), 0) || 0;
  };

  const getTodaySales = () => {
    const today = new Date().toDateString();
    return sales?.filter(sale => 
      new Date(sale.createdAt!).toDateString() === today
    ).length || 0;
  };

  const handleViewDetails = (sale: POSSale) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <Header title="Ventas POS" subtitle="Historial de ventas del punto de venta" />
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando ventas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <Header title="Ventas POS" subtitle="Historial de ventas del punto de venta" />
      
      <div className="p-6 space-y-6">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sales?.length || 0}</div>
              <p className="text-xs text-muted-foreground">ventas registradas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTodaySales()}</div>
              <p className="text-xs text-muted-foreground">transacciones del día</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDOP(getTotalSales())}</div>
              <p className="text-xs text-muted-foreground">ingresos acumulados</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio por Venta</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDOP(sales?.length ? getTotalSales() / sales.length : 0)}
              </div>
              <p className="text-xs text-muted-foreground">ticket promedio</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Ventas */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Historial de Ventas</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número de venta o NCF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-80"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredSales && filteredSales.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>NCF</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>ITBIS</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Receipt className="mr-2 h-4 w-4 text-gray-500" />
                          {sale.saleNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDominicanDateTime(sale.createdAt!)}
                      </TableCell>
                      <TableCell>
                        {sale.ncf ? (
                          <Badge variant="outline">{sale.ncf}</Badge>
                        ) : (
                          <span className="text-gray-400">Sin NCF</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDOP(parseFloat(sale.subtotal))}</TableCell>
                      <TableCell>{formatDOP(parseFloat(sale.itbis))}</TableCell>
                      <TableCell className="font-medium">
                        {formatDOP(parseFloat(sale.total))}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {sale.paymentMethod === "cash" ? (
                            <Banknote className="mr-1 h-3 w-3" />
                          ) : (
                            <CreditCard className="mr-1 h-3 w-3" />
                          )}
                          {sale.paymentMethod === "cash" ? "Efectivo" : "Tarjeta"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={sale.status === "completed" ? "default" : "secondary"}
                          className={sale.status === "completed"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : ""
                          }
                        >
                          {sale.status === "completed" ? "Completada" : sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Receipt className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                  {searchTerm ? "No se encontraron ventas" : "No hay ventas registradas"}
                </h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {searchTerm 
                    ? "Intenta con otros términos de búsqueda."
                    : "Las ventas realizadas desde el POS aparecerán aquí."
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalles */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalles de Venta {selectedSale?.saleNumber}</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Fecha</p>
                  <p>{formatDominicanDateTime(selectedSale.createdAt!)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">NCF</p>
                  <p>{selectedSale.ncf || "Sin NCF"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Método de Pago</p>
                  <p>{selectedSale.paymentMethod === "cash" ? "Efectivo" : "Tarjeta"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Estado</p>
                  <Badge variant={selectedSale.status === "completed" ? "default" : "secondary"}>
                    {selectedSale.status === "completed" ? "Completada" : selectedSale.status}
                  </Badge>
                </div>
              </div>

              {selectedSale.paymentMethod === "cash" && selectedSale.cashReceived && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Efectivo Recibido</p>
                    <p>{formatDOP(parseFloat(selectedSale.cashReceived))}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cambio</p>
                    <p>{formatDOP(parseFloat(selectedSale.cashChange || "0"))}</p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span>Subtotal:</span>
                  <span>{formatDOP(parseFloat(selectedSale.subtotal))}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span>ITBIS (18%):</span>
                  <span>{formatDOP(parseFloat(selectedSale.itbis))}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatDOP(parseFloat(selectedSale.total))}</span>
                </div>
              </div>

              {selectedSale.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Notas</p>
                  <p className="text-sm">{selectedSale.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}