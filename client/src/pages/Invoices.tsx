import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Download, 
  Send,
  Calendar,
  DollarSign,
  Eye,
  Plus,
  Minus
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [invoiceData, setInvoiceData] = useState({
    customerId: "",
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    notes: "",
    items: [{ productId: "", quantity: 1, price: 0, description: "" }]
  });
  const { toast } = useToast();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices", filterStatus, dateRange],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: typeof invoiceData) => {
      return apiRequest("/api/invoices", {
        method: "POST",
        body: {
          customerId: parseInt(data.customerId),
          date: data.date,
          dueDate: data.dueDate,
          notes: data.notes,
          items: data.items.map(item => ({
            productId: parseInt(item.productId),
            quantity: item.quantity,
            price: item.price,
            description: item.description
          }))
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Factura creada",
        description: "La factura ha sido creada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setShowCreateModal(false);
      setInvoiceData({
        customerId: "",
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        notes: "",
        items: [{ productId: "", quantity: 1, price: 0, description: "" }]
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la factura.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "overdue": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      paid: "Pagada",
      pending: "Pendiente",
      overdue: "Vencida",
      draft: "Borrador"
    };
    return labels[status] || status;
  };

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter((invoice: any) => {
    const matchesSearch = 
      invoice.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || invoice.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <div className="h-screen overflow-y-auto space-y-6 p-6 max-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Facturas</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <FileText className="mr-2 h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Facturado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$485,230</div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">$125,450</div>
            <p className="text-xs text-muted-foreground">32 facturas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">$45,200</div>
            <p className="text-xs text-muted-foreground">8 facturas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cobrado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$314,580</div>
            <p className="text-xs text-muted-foreground">78% del total</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listado de Facturas</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Buscar facturas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
                // prefix={<Search className="h-4 w-4" />}
              />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="paid">Pagadas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                  <SelectItem value="draft">Borradores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Cargando facturas...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No se encontraron facturas</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>NCF</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice: any) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(invoice.date), "dd/MM/yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(invoice.dueDate), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right font-mono">
                      ${parseFloat(invoice.total).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{invoice.ncf || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(invoice.status)}>
                        {getStatusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Send className="h-4 w-4" />
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

      {/* Create Invoice Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Nueva Factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">Cliente</Label>
                <Select value={invoiceData.customerId} onValueChange={(value) => setInvoiceData(prev => ({ ...prev, customerId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(customers) && customers.map((customer: any) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name} - {customer.rnc || customer.cedula}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={invoiceData.date}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Input
                  id="notes"
                  value={invoiceData.notes}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notas adicionales"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <Label>Productos/Servicios</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInvoiceData(prev => ({
                    ...prev,
                    items: [...prev.items, { productId: "", quantity: 1, price: 0, description: "" }]
                  }))}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
              
              <div className="space-y-3">
                {invoiceData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-3 border rounded">
                    <div>
                      <Select 
                        value={item.productId} 
                        onValueChange={(value) => {
                          const product = Array.isArray(products) ? products.find((p: any) => p.id.toString() === value) : null;
                          setInvoiceData(prev => ({
                            ...prev,
                            items: prev.items.map((itm, idx) => idx === index ? {
                              ...itm,
                              productId: value,
                              price: product?.price || 0,
                              description: product?.name || ""
                            } : itm)
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.isArray(products) && products.map((product: any) => (
                            <SelectItem key={product.id} value={product.id.toString()}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          items: prev.items.map((itm, idx) => idx === index ? { ...itm, quantity: parseInt(e.target.value) || 1 } : itm)
                        }))}
                        placeholder="Cant."
                        min="1"
                      />
                    </div>
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          items: prev.items.map((itm, idx) => idx === index ? { ...itm, price: parseFloat(e.target.value) || 0 } : itm)
                        }))}
                        placeholder="Precio"
                      />
                    </div>
                    <div>
                      <Input
                        value={item.description}
                        onChange={(e) => setInvoiceData(prev => ({
                          ...prev,
                          items: prev.items.map((itm, idx) => idx === index ? { ...itm, description: e.target.value } : itm)
                        }))}
                        placeholder="Descripción"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        ${(item.quantity * item.price).toFixed(2)}
                      </span>
                      {invoiceData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInvoiceData(prev => ({
                            ...prev,
                            items: prev.items.filter((_, idx) => idx !== index)
                          }))}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-right">
                <div className="text-lg font-semibold">
                  Total: ${invoiceData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => createInvoiceMutation.mutate(invoiceData)}
                disabled={!invoiceData.customerId || invoiceData.items.length === 0 || createInvoiceMutation.isPending}
              >
                Crear Factura
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}