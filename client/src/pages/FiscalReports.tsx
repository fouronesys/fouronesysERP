import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Calendar, Building2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Interfaces basadas en las plantillas oficiales DGII
interface Report606Data {
  rnc: string;
  periodo: string;
  secuencia: number;
  compras: {
    rncProveedor: string;
    tipoId: string;
    numeroFactura: string;
    ncf: string;
    fechaFactura: string;
    fechaPago: string;
    montoFacturado: number;
    itbisFacturado: number;
    itbisRetenido?: number;
    itbisPercibido?: number;
    retencionRenta?: number;
    propina?: number;
    efectivo?: number;
    cheque?: number;
    tarjeta?: number;
    credito?: number;
    bonos?: number;
    permuta?: number;
    otrasFormas?: number;
  }[];
}

interface Report607Data {
  rnc: string;
  periodo: string;
  secuencia: number;
  ventas: {
    rncCliente: string;
    tipoId: string;
    numeroFactura: string;
    ncf: string;
    fechaFactura: string;
    fechaVencimiento: string;
    montoFacturado: number;
    itbisFacturado: number;
    itbisRetenido?: number;
    retencionRenta?: number;
    itbisPercibido?: number;
    propina?: number;
    efectivo?: number;
    cheque?: number;
    tarjeta?: number;
    credito?: number;
    bonos?: number;
    permuta?: number;
    otrasFormas?: number;
  }[];
}

interface FiscalReportStats {
  report606Count: number;
  report607Count: number;
  lastGenerated606?: string;
  lastGenerated607?: string;
  pendingReports: number;
}

export default function FiscalReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [reportType, setReportType] = useState<"606" | "607">("606");
  const [isGenerating, setIsGenerating] = useState(false);

  // Consultas para obtener estadísticas y datos
  const { data: stats, isLoading: statsLoading } = useQuery<FiscalReportStats>({
    queryKey: ["/api/fiscal-reports/stats"],
  });

  const { data: reports606 = [], isLoading: loading606 } = useQuery<Report606Data[]>({
    queryKey: ["/api/fiscal-reports/606"],
  });

  const { data: reports607 = [], isLoading: loading607 } = useQuery<Report607Data[]>({
    queryKey: ["/api/fiscal-reports/607"],
  });

  const generateReport = async () => {
    if (!selectedPeriod) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/fiscal-reports/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          period: selectedPeriod
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_${selectedPeriod}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error generando reporte:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes Fiscales</h1>
          <p className="text-muted-foreground">
            Generación de reportes 606 y 607 según formatos oficiales DGII
          </p>
        </div>
        <Button onClick={generateReport} disabled={!selectedPeriod || isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Generar Reporte
        </Button>
      </div>

      {/* Controles de generación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Nuevo Reporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportType">Tipo de Reporte</Label>
              <Select value={reportType} onValueChange={(value: "606" | "607") => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="606">Reporte 606 - Compras</SelectItem>
                  <SelectItem value="607">Reporte 607 - Ventas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period">Período</Label>
              <Input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                placeholder="YYYY-MM"
              />
            </div>

            <div className="space-y-2">
              <Label>Formato</Label>
              <div className="flex items-center h-10 px-3 py-2 border rounded-md bg-muted">
                <span className="text-sm text-muted-foreground">Formato DGII Oficial</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-600">
              Los reportes se generan siguiendo las especificaciones oficiales de DGII
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes 606</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.report606Count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total generados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes 607</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.report607Count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total generados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último 606</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {statsLoading ? "..." : 
                stats?.lastGenerated606 ? 
                  format(new Date(stats.lastGenerated606), "dd/MM/yyyy", { locale: es }) : 
                  "Nunca"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Fecha generación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último 607</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {statsLoading ? "..." : 
                stats?.lastGenerated607 ? 
                  format(new Date(stats.lastGenerated607), "dd/MM/yyyy", { locale: es }) : 
                  "Nunca"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Fecha generación
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historial de reportes */}
      <Tabs defaultValue="606" className="space-y-4">
        <TabsList>
          <TabsTrigger value="606">Reportes 606 (Compras)</TabsTrigger>
          <TabsTrigger value="607">Reportes 607 (Ventas)</TabsTrigger>
        </TabsList>

        <TabsContent value="606" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Reportes 606</CardTitle>
            </CardHeader>
            <CardContent>
              {loading606 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : reports606.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay reportes 606 generados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports606.map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">Período: {report.periodo}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.compras.length} transacciones de compra
                        </p>
                        <Badge variant="outline">Secuencia: {report.secuencia}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="607" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Reportes 607</CardTitle>
            </CardHeader>
            <CardContent>
              {loading607 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : reports607.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No hay reportes 607 generados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports607.map((report, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">Período: {report.periodo}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.ventas.length} transacciones de venta
                        </p>
                        <Badge variant="outline">Secuencia: {report.secuencia}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}