import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Upload, 
  Plus, 
  Search, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Settings,
  Building2
} from "lucide-react";
import type { NCFSequence, Comprobante605, Comprobante606 } from "@shared/schema";

export default function FiscalDocuments() {
  const [activeTab, setActiveTab] = useState("ncf-sequences");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: ncfSequences, isLoading: ncfLoading } = useQuery<NCFSequence[]>({
    queryKey: ["/api/fiscal/ncf-sequences"],
  });

  const { data: comprobantes605, isLoading: loading605 } = useQuery<Comprobante605[]>({
    queryKey: ["/api/fiscal/comprobantes-605", selectedPeriod],
  });

  const { data: comprobantes606, isLoading: loading606 } = useQuery<Comprobante606[]>({
    queryKey: ["/api/fiscal/comprobantes-606", selectedPeriod],
  });

  // Mutations
  const createSequenceMutation = useMutation({
    mutationFn: async (data: any) => 
      await apiRequest("/api/fiscal/ncf-sequences", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiscal/ncf-sequences"] });
      toast({
        title: "Secuencia NCF creada",
        description: "La secuencia de NCF ha sido registrada exitosamente",
      });
    },
  });

  const generate605Mutation = useMutation({
    mutationFn: async (period: string) => 
      await apiRequest(`/api/fiscal/generate-605/${period}`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiscal/comprobantes-605"] });
      toast({
        title: "Reporte 605 generado",
        description: "Se ha generado el reporte de compras exitosamente",
      });
    },
  });

  const generate606Mutation = useMutation({
    mutationFn: async (period: string) => 
      await apiRequest(`/api/fiscal/generate-606/${period}`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fiscal/comprobantes-606"] });
      toast({
        title: "Reporte 606 generado",
        description: "Se ha generado el reporte de ventas exitosamente",
      });
    },
  });

  const downloadReportMutation = useMutation({
    mutationFn: async ({ type, period }: { type: string; period: string }) => {
      const response = await fetch(`/api/fiscal/download-${type}/${period}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${period}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Descarga completa",
        description: "El archivo ha sido descargado exitosamente",
      });
    },
  });

  // Filter functions
  const filteredSequences = ncfSequences?.filter(seq =>
    seq.ncfType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seq.authorizedFrom.includes(searchTerm) ||
    seq.authorizedTo.includes(searchTerm)
  ) || [];

  const activeSequences = filteredSequences.filter(seq => seq.isActive);
  const expiredSequences = filteredSequences.filter(seq => 
    new Date(seq.expirationDate) < new Date()
  );

  return (
    <div className="w-full">
      <Header 
        title="Comprobantes Fiscales" 
        subtitle="Gestión de NCF y reportes 605/606 DGII" 
      />
      
      <div className="p-4 sm:p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">NCF Activos</p>
                  <p className="text-xl font-bold">{activeSequences.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">NCF Vencidos</p>
                  <p className="text-xl font-bold">{expiredSequences.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Comprobantes 605</p>
                  <p className="text-xl font-bold">{comprobantes605?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Comprobantes 606</p>
                  <p className="text-xl font-bold">{comprobantes606?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="ncf-sequences">
              <Settings className="h-4 w-4 mr-2" />
              Secuencias NCF
            </TabsTrigger>
            <TabsTrigger value="report-605">
              <FileText className="h-4 w-4 mr-2" />
              Reporte 605
            </TabsTrigger>
            <TabsTrigger value="report-606">
              <FileText className="h-4 w-4 mr-2" />
              Reporte 606
            </TabsTrigger>
            <TabsTrigger value="rnc-verification">
              <Building2 className="h-4 w-4 mr-2" />
              Verificación RNC
            </TabsTrigger>
          </TabsList>

          {/* NCF Sequences Tab */}
          <TabsContent value="ncf-sequences" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Secuencias de NCF Autorizadas</CardTitle>
                  <NCFSequenceForm onSubmit={createSequenceMutation.mutate} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar secuencias..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    {filteredSequences.map((sequence) => (
                      <div
                        key={sequence.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant={sequence.isActive ? "default" : "secondary"}>
                              {sequence.ncfType}
                            </Badge>
                            <span className="font-medium">
                              {sequence.authorizedFrom} - {sequence.authorizedTo}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            Secuencia actual: {sequence.currentSequence.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-500">
                            Vence: {new Date(sequence.expirationDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {new Date(sequence.expirationDate) < new Date() && (
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                          )}
                          {sequence.isActive && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report 605 Tab */}
          <TabsContent value="report-605" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Reporte 605 - Compras y Servicios</CardTitle>
                  <div className="flex space-x-2">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {generatePeriodOptions().map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => generate605Mutation.mutate(selectedPeriod)}
                      disabled={generate605Mutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Generar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadReportMutation.mutate({ type: "605", period: selectedPeriod })}
                      disabled={!comprobantes605?.length}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ComprobantesTable 
                  data={comprobantes605 || []} 
                  type="605" 
                  isLoading={loading605}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report 606 Tab */}
          <TabsContent value="report-606" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Reporte 606 - Ventas</CardTitle>
                  <div className="flex space-x-2">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {generatePeriodOptions().map((period) => (
                          <SelectItem key={period.value} value={period.value}>
                            {period.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => generate606Mutation.mutate(selectedPeriod)}
                      disabled={generate606Mutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Generar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadReportMutation.mutate({ type: "606", period: selectedPeriod })}
                      disabled={!comprobantes606?.length}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ComprobantesTable 
                  data={comprobantes606 || []} 
                  type="606" 
                  isLoading={loading606}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* RNC Verification Tab */}
          <TabsContent value="rnc-verification" className="space-y-4">
            <RNCVerificationCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper Components
function NCFSequenceForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    ncfType: "",
    authorizedFrom: "",
    authorizedTo: "",
    expirationDate: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setOpen(false);
    setFormData({
      ncfType: "",
      authorizedFrom: "",
      authorizedTo: "",
      expirationDate: "",
    });
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Agregar Secuencia
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Nueva Secuencia NCF</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="ncfType">Tipo de NCF</Label>
              <Select
                value={formData.ncfType}
                onValueChange={(value) => setFormData({ ...formData, ncfType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="B01">B01 - Crédito Fiscal</SelectItem>
                  <SelectItem value="B02">B02 - Consumidor Final</SelectItem>
                  <SelectItem value="B03">B03 - Nota de Débito</SelectItem>
                  <SelectItem value="B04">B04 - Nota de Crédito</SelectItem>
                  <SelectItem value="B11">B11 - Compras</SelectItem>
                  <SelectItem value="B14">B14 - Régimen Especial</SelectItem>
                  <SelectItem value="B15">B15 - Gubernamental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromNumber">Desde (Número)</Label>
                <Input
                  id="fromNumber"
                  type="number"
                  value={formData.fromNumber}
                  onChange={(e) => setFormData({ ...formData, fromNumber: e.target.value })}
                  placeholder="1"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="toNumber">Hasta (Número)</Label>
                <Input
                  id="toNumber"
                  type="number"
                  value={formData.toNumber}
                  onChange={(e) => setFormData({ ...formData, toNumber: e.target.value })}
                  placeholder="1000"
                  min="1"
                  required
                />
              </div>
            </div>
            
            <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
              <p><strong>Vista previa:</strong></p>
              <p>Del: {formData.ncfType}{String(formData.fromNumber || 1).padStart(8, '0')}</p>
              <p>Al: {formData.ncfType}{String(formData.toNumber || 1000).padStart(8, '0')}</p>
            </div>
            
            <div>
              <Label htmlFor="expirationDate">Fecha de Vencimiento</Label>
              <Input
                id="expirationDate"
                type="date"
                value={formData.expirationDate}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                required
              />
            </div>
            
            <div className="flex space-x-2">
              <Button type="submit" className="flex-1">
                Crear Secuencia
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ComprobantesTable({ data, type, isLoading }: { 
  data: any[], 
  type: "605" | "606", 
  isLoading: boolean 
}) {
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Cargando comprobantes...</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay comprobantes registrados para este período
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">RNC/Cédula</th>
            <th className="text-left p-2">Tipo ID</th>
            <th className="text-left p-2">NCF</th>
            <th className="text-left p-2">Fecha</th>
            <th className="text-right p-2">Monto</th>
            <th className="text-right p-2">ITBIS</th>
            <th className="text-right p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="p-2 font-mono">{item.rncCedula}</td>
              <td className="p-2">{item.tipoIdentificacion === "1" ? "RNC" : "Cédula"}</td>
              <td className="p-2 font-mono">{item.ncf || "N/A"}</td>
              <td className="p-2">{new Date(item.fechaComprobante).toLocaleDateString()}</td>
              <td className="p-2 text-right">RD${parseFloat(item.montoFacturado).toLocaleString()}</td>
              <td className="p-2 text-right">RD${parseFloat(item.itbisFacturado).toLocaleString()}</td>
              <td className="p-2 text-right font-medium">RD${parseFloat(item.montoTotal).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RNCVerificationCard() {
  const [rnc, setRnc] = useState("");
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const verifyRNC = async () => {
    if (!rnc.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await apiRequest(`/api/fiscal/verify-rnc/${rnc.trim()}`);
      setResult(response);
    } catch (error) {
      setResult({ error: "RNC no encontrado o no válido" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verificación de RNC</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Ingrese RNC o cédula (ej: 101234567)"
            value={rnc}
            onChange={(e) => setRnc(e.target.value)}
            className="flex-1"
          />
          <Button onClick={verifyRNC} disabled={isLoading || !rnc.trim()}>
            {isLoading ? "Verificando..." : "Verificar"}
          </Button>
        </div>
        
        {result && (
          <div className="mt-4 p-4 border rounded-lg">
            {result.error ? (
              <div className="text-red-600">
                <AlertTriangle className="h-5 w-5 inline mr-2" />
                {result.error}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center text-green-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  RNC Verificado
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>RNC:</strong> {result.rnc}
                  </div>
                  <div>
                    <strong>Razón Social:</strong> {result.razonSocial}
                  </div>
                  <div>
                    <strong>Nombre Comercial:</strong> {result.nombreComercial || "N/A"}
                  </div>
                  <div>
                    <strong>Estado:</strong> {result.estado}
                  </div>
                  <div>
                    <strong>Categoría:</strong> {result.categoria || "N/A"}
                  </div>
                  <div>
                    <strong>Régimen:</strong> {result.regimen || "N/A"}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function generatePeriodOptions() {
  const options = [];
  const currentDate = new Date();
  
  for (let i = 0; i < 12; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('es-DO', { year: 'numeric', month: 'long' });
    options.push({ value, label });
  }
  
  return options;
}