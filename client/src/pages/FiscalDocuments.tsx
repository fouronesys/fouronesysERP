import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  TrendingUp,
  Search,
  Eye,
  Plus,
  Loader2,
  ShieldCheck,
  Users,
  Receipt
} from "lucide-react";

export default function FiscalDocuments() {
  const [activeTab, setActiveTab] = useState("ncf-sequences");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [rncToVerify, setRncToVerify] = useState("");
  const [isVerifyingRNC, setIsVerifyingRNC] = useState(false);
  const [rncVerificationResult, setRncVerificationResult] = useState<any>(null);
  const [selectedComprobante, setSelectedComprobante] = useState<any>(null);
  const [showComprobanteDialog, setShowComprobanteDialog] = useState(false);
  const [showNewSequenceDialog, setShowNewSequenceDialog] = useState(false);
  const [newSequenceForm, setNewSequenceForm] = useState({
    ncfType: "B01",
    currentSequence: 1,
    maxSequence: 50000000,
    fiscalPeriod: new Date().getFullYear().toString(),
    isActive: true
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const { data: ncfSequences, isLoading: ncfLoading } = useQuery({
    queryKey: ["/api/fiscal/ncf-sequences"],
  });

  const { data: comprobantes606, isLoading: loading606 } = useQuery({
    queryKey: ["/api/fiscal/comprobantes-606", selectedPeriod],
  });

  const { data: comprobantes607, isLoading: loading607 } = useQuery({
    queryKey: ["/api/fiscal/comprobantes-607", selectedPeriod],
  });

  // Mutations
  const createNCFSequenceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/fiscal/ncf-sequences", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Secuencia NCF creada",
        description: "La secuencia NCF se ha creado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fiscal/ncf-sequences"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear secuencia",
        description: error.message || "No se pudo crear la secuencia NCF",
        variant: "destructive",
      });
    },
  });

  // Verificación de RNC
  const handleVerifyRNC = async () => {
    if (!rncToVerify.trim()) {
      toast({
        title: "RNC requerido",
        description: "Por favor ingrese un RNC para verificar",
        variant: "destructive",
      });
      return;
    }

    setIsVerifyingRNC(true);
    try {
      const response = await fetch(`/api/fiscal/verify-rnc?rnc=${rncToVerify}`);
      const result = await response.json();
      
      if (response.ok) {
        setRncVerificationResult(result);
        toast({
          title: "RNC verificado",
          description: result.isValid ? "RNC válido encontrado en DGII" : "RNC no encontrado o inválido",
          variant: result.isValid ? "default" : "destructive",
        });
      } else {
        throw new Error(result.message || "Error al verificar RNC");
      }
    } catch (error: any) {
      toast({
        title: "Error de verificación",
        description: error.message || "No se pudo verificar el RNC",
        variant: "destructive",
      });
      setRncVerificationResult(null);
    } finally {
      setIsVerifyingRNC(false);
    }
  };

  const handleViewComprobante = (comprobante: any) => {
    setSelectedComprobante(comprobante);
    setShowComprobanteDialog(true);
  };

  const handleCreateSequence = () => {
    const currentDate = new Date();
    const fiscalPeriod = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}${String(currentDate.getDate()).padStart(2, '0')}`;
    
    setNewSequenceForm({
      ...newSequenceForm,
      fiscalPeriod
    });
    setShowNewSequenceDialog(true);
  };

  const handleSubmitNewSequence = () => {
    createNCFSequenceMutation.mutate(newSequenceForm);
    setShowNewSequenceDialog(false);
  };

  const filteredSequences = Array.isArray(ncfSequences) ? ncfSequences.filter((seq: any) =>
    seq.ncfType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seq.fiscalPeriod?.includes(searchTerm)
  ) : [];

  const filteredComprobantes606 = Array.isArray(comprobantes606) ? comprobantes606.filter((comp: any) =>
    comp.ncf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.proveedor?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredComprobantes607 = Array.isArray(comprobantes607) ? comprobantes607.filter((comp: any) =>
    comp.ncf?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    comp.cliente?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Header 
        title="Documentos Fiscales"
        subtitle="Gestión de NCF, verificación de RNC y comprobantes fiscales"
      />

      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por NCF, RNC o período..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="ncf-sequences">Secuencias NCF</TabsTrigger>
          <TabsTrigger value="comprobantes-606">Comprobantes 606</TabsTrigger>
          <TabsTrigger value="comprobantes-607">Comprobantes 607</TabsTrigger>
          <TabsTrigger value="verify-rnc">Verificar RNC</TabsTrigger>
        </TabsList>

        {/* Tab: Secuencias NCF */}
        <TabsContent value="ncf-sequences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Secuencias de Numeración de Comprobantes Fiscales (NCF)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleCreateSequence}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Secuencia
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {ncfLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Tipo NCF</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[100px]">Secuencia</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[100px]">Máximo</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[100px]">Período</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[80px]">Estado</TableHead>
                        <TableHead className="min-w-[80px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSequences.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No hay secuencias NCF registradas
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSequences.map((sequence: any) => (
                          <TableRow key={sequence.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">{sequence.ncfType}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{sequence.currentSequence || "0"}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs sm:text-sm">{sequence.maxSequence || "N/A"}</TableCell>
                            <TableCell className="hidden lg:table-cell text-xs sm:text-sm">{sequence.fiscalPeriod}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant={sequence.isActive ? "default" : "secondary"} className="text-xs">
                                {sequence.isActive ? "Activa" : "Inactiva"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col sm:hidden text-xs text-muted-foreground mb-1">
                                <span>Sec: {sequence.currentSequence || "0"}</span>
                                <Badge variant={sequence.isActive ? "default" : "secondary"} className="text-xs w-fit">
                                  {sequence.isActive ? "Activa" : "Inactiva"}
                                </Badge>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Comprobantes 606 */}
        <TabsContent value="comprobantes-606" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Comprobantes Fiscales 606 - Compras
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Registro de compras para reporte 606 DGII
              </p>
            </CardHeader>
            <CardContent>
              {loading606 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">NCF</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[150px]">Proveedor</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[100px]">Fecha</TableHead>
                        <TableHead className="min-w-[100px] text-right">Monto</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[80px] text-right">ITBIS</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[80px]">Estado</TableHead>
                        <TableHead className="min-w-[80px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                  <TableBody>
                    {filteredComprobantes606.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay comprobantes 606 registrados para este período
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredComprobantes606.map((comprobante: any) => (
                        <TableRow key={comprobante.id}>
                          <TableCell className="font-medium">{comprobante.ncf}</TableCell>
                          <TableCell>{comprobante.proveedor}</TableCell>
                          <TableCell>{comprobante.fecha}</TableCell>
                          <TableCell>${comprobante.monto?.toFixed(2)}</TableCell>
                          <TableCell>${comprobante.itbis?.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={comprobante.estado === "procesado" ? "default" : "secondary"}>
                              {comprobante.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewComprobante(comprobante)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Comprobantes 607 */}
        <TabsContent value="comprobantes-607" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Comprobantes Fiscales 607 - Ventas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Registro de ventas para reporte 607 DGII
              </p>
            </CardHeader>
            <CardContent>
              {loading607 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>NCF</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>ITBIS</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComprobantes607.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay comprobantes 607 registrados para este período
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredComprobantes607.map((comprobante: any) => (
                        <TableRow key={comprobante.id}>
                          <TableCell className="font-medium">{comprobante.ncf}</TableCell>
                          <TableCell>{comprobante.cliente}</TableCell>
                          <TableCell>{comprobante.fecha}</TableCell>
                          <TableCell>${comprobante.monto?.toFixed(2)}</TableCell>
                          <TableCell>${comprobante.itbis?.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={comprobante.estado === "procesado" ? "default" : "secondary"}>
                              {comprobante.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewComprobante(comprobante)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Verificar RNC */}
        <TabsContent value="verify-rnc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Verificación de RNC
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Verifique la validez de un RNC contra el registro oficial de DGII
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="rnc-input">RNC a verificar</Label>
                  <Input
                    id="rnc-input"
                    value={rncToVerify}
                    onChange={(e) => setRncToVerify(e.target.value)}
                    placeholder="Ej: 101234567"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleVerifyRNC}
                    disabled={isVerifyingRNC || !rncToVerify.trim()}
                  >
                    {isVerifyingRNC ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Verificar
                  </Button>
                </div>
              </div>

              {rncVerificationResult && (
                <div className={`p-4 rounded-lg ${rncVerificationResult.isValid ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'}`}>
                  <div className="flex items-start gap-3">
                    {rncVerificationResult.isValid ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                    <div className="space-y-2">
                      <h4 className={`font-medium ${rncVerificationResult.isValid ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                        {rncVerificationResult.isValid ? "RNC Válido" : "RNC No Válido"}
                      </h4>
                      {rncVerificationResult.isValid && (
                        <div className="text-sm text-green-700 dark:text-green-300">
                          <p><strong>Razón Social:</strong> {rncVerificationResult.razonSocial}</p>
                          <p><strong>Estado:</strong> {rncVerificationResult.estado}</p>
                          <p><strong>Tipo:</strong> {rncVerificationResult.tipo}</p>
                        </div>
                      )}
                      {!rncVerificationResult.isValid && (
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Este RNC no se encuentra registrado en DGII o está inactivo
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para ver detalles del comprobante */}
      <Dialog open={showComprobanteDialog} onOpenChange={setShowComprobanteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Comprobante Fiscal</DialogTitle>
          </DialogHeader>
          {selectedComprobante && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>NCF</Label>
                  <p className="text-sm font-medium">{selectedComprobante.ncf}</p>
                </div>
                <div>
                  <Label>Fecha</Label>
                  <p className="text-sm">{selectedComprobante.fecha}</p>
                </div>
                <div>
                  <Label>Monto</Label>
                  <p className="text-sm">${selectedComprobante.monto?.toFixed(2)}</p>
                </div>
                <div>
                  <Label>ITBIS</Label>
                  <p className="text-sm">${selectedComprobante.itbis?.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Nueva Secuencia NCF */}
      <Dialog open={showNewSequenceDialog} onOpenChange={setShowNewSequenceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Secuencia NCF</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ncfType">Tipo de NCF</Label>
              <select
                id="ncfType"
                value={newSequenceForm.ncfType}
                onChange={(e) => setNewSequenceForm({...newSequenceForm, ncfType: e.target.value})}
                className="w-full p-2 border rounded-md"
              >
                <option value="B01">B01 - Crédito Fiscal</option>
                <option value="B02">B02 - Consumidor Final</option>
                <option value="B03">B03 - Nota de Débito</option>
                <option value="B04">B04 - Nota de Crédito</option>
                <option value="B11">B11 - Compras Menores</option>
                <option value="B12">B12 - Registro Único de Ingresos</option>
                <option value="B13">B13 - Gastos Menores</option>
                <option value="B14">B14 - Regímenes Especiales</option>
                <option value="B15">B15 - Gubernamental</option>
                <option value="B16">B16 - Exportaciones</option>
              </select>
            </div>
            <div>
              <Label htmlFor="currentSequence">Secuencia Inicial</Label>
              <input
                id="currentSequence"
                type="number"
                value={newSequenceForm.currentSequence}
                onChange={(e) => setNewSequenceForm({...newSequenceForm, currentSequence: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-md"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="maxSequence">Secuencia Máxima</Label>
              <input
                id="maxSequence"
                type="number"
                value={newSequenceForm.maxSequence}
                onChange={(e) => setNewSequenceForm({...newSequenceForm, maxSequence: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-md"
                min="1"
              />
            </div>
            <div>
              <Label htmlFor="fiscalPeriod">Período Fiscal</Label>
              <input
                id="fiscalPeriod"
                type="month"
                value={newSequenceForm.fiscalPeriod.length === 4 ? `${newSequenceForm.fiscalPeriod}-01` : newSequenceForm.fiscalPeriod}
                onChange={(e) => {
                  const [year, month] = e.target.value.split('-');
                  setNewSequenceForm({...newSequenceForm, fiscalPeriod: `${year}-${month}`});
                }}
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            {/* Vista previa del NCF */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Vista Previa del NCF</Label>
              <div className="mt-2 font-mono text-lg text-gray-900 dark:text-gray-100">
                {newSequenceForm.ncfType}{String(newSequenceForm.currentSequence).padStart(8, '0')}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Formato: {newSequenceForm.ncfType} + secuencia de 8 dígitos
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="isActive"
                type="checkbox"
                checked={newSequenceForm.isActive}
                onChange={(e) => setNewSequenceForm({...newSequenceForm, isActive: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="isActive">Secuencia Activa</Label>
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowNewSequenceDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmitNewSequence}
              disabled={createNCFSequenceMutation.isPending}
            >
              {createNCFSequenceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear Secuencia"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}