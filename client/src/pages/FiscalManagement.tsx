import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, Search, FileText, Download, Upload, Calendar as CalendarIcon, 
  Receipt, Building2, TrendingUp, AlertTriangle, CheckCircle, X, Eye, Edit,
  Calculator, FileSpreadsheet, Shield, RefreshCw, Database, Settings
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const fiscalDocumentSchema = z.object({
  type: z.string().min(1, "Tipo de documento requerido"),
  series: z.string().min(1, "Serie requerida"),
  number: z.string().min(1, "Número requerido"),
  customerRnc: z.string().optional(),
  customerName: z.string().min(1, "Nombre del cliente requerido"),
  amount: z.string().min(1, "Monto requerido"),
  itbis: z.string().default("0"),
  date: z.date(),
  description: z.string().optional(),
});

const reportConfigSchema = z.object({
  type: z.enum(["606", "607"]),
  period: z.string().min(1, "Período requerido"),
  year: z.string().min(1, "Año requerido"),
  includeZeroValues: z.boolean().default(false),
  format: z.enum(["excel", "txt"]).default("excel"),
});

type FiscalDocumentFormData = z.infer<typeof fiscalDocumentSchema>;
type ReportConfigFormData = z.infer<typeof reportConfigSchema>;

interface FiscalDocument {
  id: number;
  type: string;
  series: string;
  number: string;
  customerRnc?: string;
  customerName: string;
  amount: number;
  itbis: number;
  date: string;
  description?: string;
  status: 'active' | 'cancelled' | 'pending';
  createdAt: string;
}

interface FiscalReport {
  id: number;
  type: '606' | '607';
  period: string;
  year: string;
  status: 'generated' | 'submitted' | 'draft';
  recordCount: number;
  totalAmount: number;
  generatedAt: string;
  fileName?: string;
}

export default function FiscalManagement() {
  const [activeTab, setActiveTab] = useState("documents");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [reportType, setReportType] = useState<'606' | '607'>('606');
  const [period606, setPeriod606] = useState("");
  const [period607, setPeriod607] = useState("");
  const [isGenerating606, setIsGenerating606] = useState(false);
  const [isGenerating607, setIsGenerating607] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: fiscalDocuments, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/fiscal/documents'],
  });

  const { data: fiscalReports, isLoading: reportsLoading } = useQuery({
    queryKey: ['/api/fiscal/reports'],
  });

  const { data: companyInfo } = useQuery({
    queryKey: ['/api/company/info'],
  });

  const documentForm = useForm<FiscalDocumentFormData>({
    resolver: zodResolver(fiscalDocumentSchema),
    defaultValues: {
      type: "",
      series: "",
      number: "",
      customerRnc: "",
      customerName: "",
      amount: "",
      itbis: "0",
      date: new Date(),
      description: "",
    },
  });

  const reportForm = useForm<ReportConfigFormData>({
    resolver: zodResolver(reportConfigSchema),
    defaultValues: {
      type: "606",
      period: "",
      year: new Date().getFullYear().toString(),
      includeZeroValues: false,
      format: "excel",
    },
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: FiscalDocumentFormData) => {
      return await apiRequest("/api/fiscal/documents", {
        method: "POST",
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiscal/documents'] });
      setShowDocumentDialog(false);
      documentForm.reset();
      toast({
        title: "Documento fiscal creado",
        description: "El documento ha sido registrado exitosamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el documento fiscal.",
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (data: ReportConfigFormData) => {
      // Generate DGII-compliant .txt file
      const response = await fetch("/api/fiscal-reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: data.type,
          period: `${data.year}${data.period.padStart(2, '0')}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate fiscal report");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.type}_${data.year}${data.period.padStart(2, '0')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/fiscal/reports'] });
      setShowReportDialog(false);
      reportForm.reset();
      toast({
        title: "Reporte DGII generado",
        description: "El archivo .txt ha sido descargado con formato DGII oficial.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo generar el reporte fiscal.",
        variant: "destructive",
      });
    },
  });

  const onSubmitDocument = (data: FiscalDocumentFormData) => {
    createDocumentMutation.mutate(data);
  };

  const onSubmitReport = (data: ReportConfigFormData) => {
    generateReportMutation.mutate(data);
  };

  const generateDGIIReport = async (type: '606' | '607', period: string) => {
    if (!period || period.length !== 6) {
      toast({
        title: "Error",
        description: "El período debe tener formato AAAAMM (ejemplo: 202412)",
        variant: "destructive",
      });
      return;
    }

    const setLoading = type === '606' ? setIsGenerating606 : setIsGenerating607;
    setLoading(true);

    try {
      const response = await fetch("/api/fiscal-reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          period,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate fiscal report");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `DGII_F_${type}_${period}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Reporte DGII generado",
        description: `El archivo ${type}_${period}.txt ha sido descargado exitosamente.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el reporte fiscal.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDocumentStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: "Activo", color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" },
      cancelled: { label: "Anulado", color: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" },
      pending: { label: "Pendiente", color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getReportStatusBadge = (status: string) => {
    const statusConfig = {
      generated: { label: "Generado", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" },
      submitted: { label: "Enviado", color: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" },
      draft: { label: "Borrador", color: "bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredDocuments = (fiscalDocuments as FiscalDocument[] | undefined)?.filter((doc: FiscalDocument) =>
    doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.customerRnc?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredReports = (fiscalReports as FiscalReport[] | undefined)?.filter((report: FiscalReport) =>
    report.type.includes(searchTerm) ||
    report.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.year.includes(searchTerm)
  ) || [];

  const documentTypes = [
    { value: "01", label: "Factura de Crédito Fiscal" },
    { value: "02", label: "Factura de Consumo" },
    { value: "03", label: "Nota de Débito" },
    { value: "04", label: "Nota de Crédito" },
    { value: "11", label: "Factura de Régimen Especial" },
    { value: "12", label: "Factura Gubernamental" },
    { value: "13", label: "Factura de Exportación" },
    { value: "14", label: "Factura para Regímenes Especiales" },
    { value: "15", label: "Comprobante de Compras" },
  ];

  const months = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ];

  if (documentsLoading || reportsLoading) {
    return (
      <div className="h-screen overflow-y-auto">
        <div className="container mx-auto p-4 space-y-6 pb-20">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando información fiscal...</p>
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
              Gestión Fiscal
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Administra documentos fiscales y genera reportes 606/607
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="documents">Documentos Fiscales</TabsTrigger>
            <TabsTrigger value="reports">Reportes 606/607</TabsTrigger>
            <TabsTrigger value="analytics">Herramienta DGII</TabsTrigger>
            <TabsTrigger value="settings">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar documentos por número, cliente o RNC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Documento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear Documento Fiscal</DialogTitle>
                  </DialogHeader>
                  <Form {...documentForm}>
                    <form onSubmit={documentForm.handleSubmit(onSubmitDocument)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={documentForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tipo de Documento</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar tipo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {documentTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={documentForm.control}
                          name="series"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Serie</FormLabel>
                              <FormControl>
                                <Input placeholder="B01" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={documentForm.control}
                          name="number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número</FormLabel>
                              <FormControl>
                                <Input placeholder="00000001" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={documentForm.control}
                          name="customerRnc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>RNC/Cédula Cliente</FormLabel>
                              <FormControl>
                                <Input placeholder="131234567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={documentForm.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del Cliente</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre completo del cliente" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={documentForm.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monto</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={documentForm.control}
                          name="itbis"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ITBIS</FormLabel>
                              <FormControl>
                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={documentForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Fecha</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP", { locale: es })
                                    ) : (
                                      <span>Seleccionar fecha</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={documentForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Descripción adicional del documento..."
                                rows={3}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowDocumentDialog(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createDocumentMutation.isPending}>
                          {createDocumentMutation.isPending ? "Creando..." : "Crear Documento"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Documentos Fiscales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Serie/Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>RNC</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>ITBIS</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDocuments.map((doc: FiscalDocument) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <Badge variant="outline">{doc.type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {doc.series}{doc.number}
                          </TableCell>
                          <TableCell>{doc.customerName}</TableCell>
                          <TableCell className="font-mono">{doc.customerRnc || "N/A"}</TableCell>
                          <TableCell>RD$ {doc.amount.toLocaleString()}</TableCell>
                          <TableCell>RD$ {doc.itbis.toLocaleString()}</TableCell>
                          <TableCell>{format(new Date(doc.date), "dd/MM/yyyy")}</TableCell>
                          <TableCell>{getDocumentStatusBadge(doc.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar reportes por tipo, período o año..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Generar Reportes (606/607)
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Generar Reporte Fiscal</DialogTitle>
                    </DialogHeader>
                  <Form {...reportForm}>
                    <form onSubmit={reportForm.handleSubmit(onSubmitReport)} className="space-y-4">
                      <FormField
                        control={reportForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Reporte</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="606">Reporte 606 - Compras</SelectItem>
                                <SelectItem value="607">Reporte 607 - Ventas</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={reportForm.control}
                          name="period"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Período</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Mes" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {months.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                      {month.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={reportForm.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Año</FormLabel>
                              <FormControl>
                                <Input placeholder="2024" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={reportForm.control}
                        name="format"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Formato</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar formato" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                                <SelectItem value="txt">Texto (.txt)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowReportDialog(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={generateReportMutation.isPending}>
                          {generateReportMutation.isPending ? "Generando..." : "Generar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reportes 606</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(fiscalReports as FiscalReport[] | undefined)?.filter((r: FiscalReport) => r.type === '606').length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Compras generadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Reportes 607</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(fiscalReports as FiscalReport[] | undefined)?.filter((r: FiscalReport) => r.type === '607').length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Ventas generadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(fiscalDocuments as FiscalDocument[] | undefined)?.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Registrados este mes</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Reportes Generados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Año</TableHead>
                        <TableHead>Registros</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Generado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report: FiscalReport) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <Badge variant={report.type === '606' ? 'secondary' : 'default'}>
                              {report.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{report.period}</TableCell>
                          <TableCell>{report.year}</TableCell>
                          <TableCell>{report.recordCount.toLocaleString()}</TableCell>
                          <TableCell>RD$ {report.totalAmount.toLocaleString()}</TableCell>
                          <TableCell>{getReportStatusBadge(report.status)}</TableCell>
                          <TableCell>{format(new Date(report.generatedAt), "dd/MM/yyyy HH:mm")}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Herramienta de Generación DGII
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Replica las herramientas oficiales de DGII para generar reportes 606 y 607 con validación automática
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Formato 606 - Compras */}
                  <Card className="border-2 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-blue-700 dark:text-blue-300">
                        Formato 606 - Compras
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Compras de Bienes y Servicios (NG-07-2018)
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Período (AAAAMM)</label>
                        <Input
                          placeholder="202412"
                          maxLength={6}
                          className="font-mono"
                          value={period606}
                          onChange={(e) => setPeriod606(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">RNC/Cédula Empresa</label>
                        <Input
                          value={(companyInfo as any)?.rnc || ""}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Campos incluidos:</h4>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          <li>• RNC/Cédula del proveedor</li>
                          <li>• Tipo de bienes y servicios</li>
                          <li>• NCF del comprobante</li>
                          <li>• Montos facturados y ITBIS</li>
                          <li>• Formas de pago</li>
                        </ul>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => generateDGIIReport('606', period606)}
                        disabled={isGenerating606}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {isGenerating606 ? "Generando..." : "Generar Formato 606"}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Formato 607 - Ventas */}
                  <Card className="border-2 border-green-200 dark:border-green-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-green-700 dark:text-green-300">
                        Formato 607 - Ventas
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Ventas de Bienes y Servicios (NG-07-2018)
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Período (AAAAMM)</label>
                        <Input
                          placeholder="202412"
                          maxLength={6}
                          className="font-mono"
                          value={period607}
                          onChange={(e) => setPeriod607(e.target.value.replace(/\D/g, ''))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">RNC/Cédula Empresa</label>
                        <Input
                          value={(companyInfo as any)?.rnc || ""}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                        <h4 className="font-medium text-sm mb-2">Campos incluidos:</h4>
                        <ul className="text-xs space-y-1 text-muted-foreground">
                          <li>• RNC/Cédula del cliente</li>
                          <li>• NCF del comprobante</li>
                          <li>• Montos de servicios y bienes</li>
                          <li>• ITBIS y retenciones</li>
                          <li>• Formas de pago</li>
                        </ul>
                      </div>
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => generateDGIIReport('607', period607)}
                        disabled={isGenerating607}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        {isGenerating607 ? "Generando..." : "Generar Formato 607"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Validación y Envío */}
                <Card className="border border-orange-200 dark:border-orange-800">
                  <CardHeader>
                    <CardTitle className="text-orange-700 dark:text-orange-300">
                      Validación y Envío
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button variant="outline" className="w-full">
                        <Shield className="h-4 w-4 mr-2" />
                        Pre-validar Datos
                      </Button>
                      <Button variant="outline" className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        Generar TXT
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Upload className="h-4 w-4 mr-2" />
                        Preparar Envío
                      </Button>
                    </div>
                    <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Instrucciones de Envío:</h4>
                      <ol className="text-xs space-y-1 text-muted-foreground list-decimal list-inside">
                        <li>Complete los datos del período correspondiente</li>
                        <li>Valide que todos los comprobantes tengan NCF válidos</li>
                        <li>Pre-valide los datos antes de generar el archivo</li>
                        <li>Genere el archivo TXT con formato oficial DGII</li>
                        <li>Envíe a través de la Oficina Virtual de DGII</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración Fiscal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Información de la Empresa</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">RNC:</span>
                        <span className="text-sm font-mono">{(companyInfo as any)?.rnc || "No configurado"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Razón Social:</span>
                        <span className="text-sm">{(companyInfo as any)?.name || "No configurado"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Categoría:</span>
                        <span className="text-sm">{(companyInfo as any)?.category || "No configurado"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Configuración de Reportes</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Formato por defecto:</span>
                        <span className="text-sm">Excel</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Auto-generar reportes:</span>
                        <span className="text-sm">Deshabilitado</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Incluir valores cero:</span>
                        <span className="text-sm">No</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Actualizar Configuración
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}