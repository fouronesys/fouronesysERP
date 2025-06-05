import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { 
  FileText, 
  Download, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Building2,
  TrendingUp
} from "lucide-react";

export default function FiscalDocuments() {
  const [activeTab, setActiveTab] = useState("reports");
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [generateType, setGenerateType] = useState<"606" | "607">("606");
  
  const { toast } = useToast();

  // Queries para reportes fiscales
  const { data: fiscalStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/fiscal-reports/stats"],
  });

  const { data: reports606, isLoading: loading606 } = useQuery({
    queryKey: ["/api/fiscal-reports/606"],
  });

  const { data: reports607, isLoading: loading607 } = useQuery({
    queryKey: ["/api/fiscal-reports/607"],
  });

  // Mutation para generar reportes
  const generateReportMutation = useMutation({
    mutationFn: async ({ type, period }: { type: string; period: string }) => {
      const response = await apiRequest("POST", "/api/fiscal-reports/generate", { type, period });
      
      // Create download link for the generated file
      const blob = new Blob([response], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_${type}_${period}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Reporte generado",
        description: "El archivo se ha descargado correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al generar reporte",
        description: error.message || "No se pudo generar el reporte",
        variant: "destructive",
      });
    },
  });

  const handleGenerateReport = () => {
    generateReportMutation.mutate({
      type: generateType,
      period: selectedPeriod
    });
  };

  const stats = fiscalStats || {
    report606Count: 0,
    report607Count: 0,
    lastGenerated606: null,
    lastGenerated607: null,
    pendingReports: 0
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Header 
        title="Documentos Fiscales"
        subtitle="Generación de reportes 606 y 607 según formatos oficiales DGII"
      />

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes 606</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.report606Count}</div>
            <p className="text-xs text-muted-foreground">
              Compras registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes 607</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.report607Count}</div>
            <p className="text-xs text-muted-foreground">
              Ventas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último 606</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastGenerated606 ? new Date(stats.lastGenerated606).toLocaleDateString() : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Fecha generación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último 607</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.lastGenerated607 ? new Date(stats.lastGenerated607).toLocaleDateString() : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Fecha generación
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports">Generar Reportes</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Generación de Reportes Fiscales DGII
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Genere reportes 606 (compras) y 607 (ventas) en formato oficial de la DGII
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="report-type">Tipo de Reporte</Label>
                  <Select value={generateType} onValueChange={(value: "606" | "607") => setGenerateType(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="606">606 - Compras</SelectItem>
                      <SelectItem value="607">607 - Ventas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period">Período</Label>
                  <Input
                    id="period"
                    type="month"
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button 
                    onClick={handleGenerateReport}
                    disabled={generateReportMutation.isPending}
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {generateReportMutation.isPending ? "Generando..." : "Generar Reporte"}
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Información sobre los reportes
                    </h4>
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                      <p><strong>Reporte 606:</strong> Compras realizadas en el período seleccionado</p>
                      <p><strong>Reporte 607:</strong> Ventas realizadas en el período seleccionado</p>
                      <p>Los archivos se generan en formato TXT según especificaciones oficiales de la DGII</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reportes 606 Generados</CardTitle>
              </CardHeader>
              <CardContent>
                {loading606 ? (
                  <div className="text-center py-4">Cargando...</div>
                ) : reports606 && reports606.length > 0 ? (
                  <div className="space-y-2">
                    {reports606.map((report: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{report.period}</span>
                        <Badge variant="secondary">606</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No hay reportes 606 generados
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reportes 607 Generados</CardTitle>
              </CardHeader>
              <CardContent>
                {loading607 ? (
                  <div className="text-center py-4">Cargando...</div>
                ) : reports607 && reports607.length > 0 ? (
                  <div className="space-y-2">
                    {reports607.map((report: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">{report.period}</span>
                        <Badge variant="secondary">607</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No hay reportes 607 generados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}