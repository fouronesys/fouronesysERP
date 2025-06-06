import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { 
  FileText, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Building2,
  Search,
  Eye,
  Plus,
  Loader2,
  ShieldCheck,
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
  
  const { toast } = useToast();

  // Mock data for demo
  const ncfSequences = [];
  const comprobantes606 = [];
  const comprobantes607 = [];

  const filteredSequences = ncfSequences;
  const filteredComprobantes606 = comprobantes606;
  const filteredComprobantes607 = comprobantes607;

  const handleCreateSequence = () => {
    toast({
      title: "Nueva Secuencia",
      description: "Funcionalidad de creación de secuencias en desarrollo",
    });
  };

  const handleViewComprobante = (comprobante: any) => {
    toast({
      title: "Ver Comprobante",
      description: "Funcionalidad de visualización en desarrollo",
    });
  };

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
      const response = await fetch(`/api/verify-rnc/${rncToVerify}`);
      const result = await response.json();
      
      setRncVerificationResult(result);
      
      if (result.valid && result.data) {
        toast({
          title: "RNC Verificado",
          description: `Empresa encontrada: ${result.data.razonSocial}`,
        });
      } else {
        toast({
          title: "RNC No Encontrado",
          description: result.message || "No se pudo verificar el RNC en la DGII",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying RNC:", error);
      toast({
        title: "Error de Verificación",
        description: "No se pudo conectar con el servicio de verificación",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingRNC(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <Header 
        title="Comprobantes Fiscales" 
        subtitle="Gestión de NCF y cumplimiento fiscal dominicano" 
      />
      
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-1">
            <TabsTrigger value="ncf-sequences" className="text-xs sm:text-sm">Secuencias NCF</TabsTrigger>
            <TabsTrigger value="comprobantes-606" className="text-xs sm:text-sm">Comprobantes 606</TabsTrigger>
            <TabsTrigger value="comprobantes-607" className="text-xs sm:text-sm">Comprobantes 607</TabsTrigger>
            <TabsTrigger value="verify-rnc" className="text-xs sm:text-sm">Verificar RNC</TabsTrigger>
          </TabsList>

          {/* Tab: Secuencias NCF */}
          <TabsContent value="ncf-sequences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Receipt className="h-5 w-5" />
                  Secuencias NCF
                </CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <Button size="sm" onClick={handleCreateSequence} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Secuencia
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Comprobantes 606 */}
          <TabsContent value="comprobantes-606" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <FileText className="h-5 w-5" />
                  Comprobantes 606 - Compras
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Registro de compras para reporte 606 DGII
                </p>
              </CardHeader>
              <CardContent>
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
                            <TableCell className="font-medium text-xs sm:text-sm">{comprobante.ncf}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs sm:text-sm">{comprobante.proveedor}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs sm:text-sm">{comprobante.fecha}</TableCell>
                            <TableCell className="text-right text-xs sm:text-sm">${comprobante.monto?.toFixed(2)}</TableCell>
                            <TableCell className="hidden lg:table-cell text-right text-xs sm:text-sm">${comprobante.itbis?.toFixed(2)}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant={comprobante.estado === "procesado" ? "default" : "secondary"} className="text-xs">
                                {comprobante.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col sm:hidden text-xs text-muted-foreground mb-1">
                                <span>{comprobante.proveedor}</span>
                                <span>ITBIS: ${comprobante.itbis?.toFixed(2)}</span>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleViewComprobante(comprobante)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Comprobantes 607 */}
          <TabsContent value="comprobantes-607" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <FileText className="h-5 w-5" />
                  Comprobantes 607 - Ventas
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Registro de ventas para reporte 607 DGII
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">NCF</TableHead>
                        <TableHead className="hidden sm:table-cell min-w-[150px]">Cliente</TableHead>
                        <TableHead className="hidden md:table-cell min-w-[100px]">Fecha</TableHead>
                        <TableHead className="min-w-[100px] text-right">Monto</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[80px] text-right">ITBIS</TableHead>
                        <TableHead className="hidden lg:table-cell min-w-[80px]">Estado</TableHead>
                        <TableHead className="min-w-[80px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay comprobantes 607 registrados para este período
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Verificar RNC */}
          <TabsContent value="verify-rnc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <ShieldCheck className="h-5 w-5" />
                  Verificación de RNC
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Verifica la validez de un RNC en el registro de la DGII
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="rnc-verify">RNC a verificar</Label>
                    <Input
                      id="rnc-verify"
                      value={rncToVerify}
                      onChange={(e) => setRncToVerify(e.target.value)}
                      placeholder="Ej: 101234567"
                      maxLength={11}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleVerifyRNC}
                      disabled={isVerifyingRNC}
                      className="w-full sm:w-auto"
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
                  <div className="mt-6 p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      {rncVerificationResult.valid ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      )}
                      <h3 className="font-medium">
                        {rncVerificationResult.valid ? "RNC Verificado" : "RNC No Encontrado"}
                      </h3>
                    </div>
                    
                    {rncVerificationResult.valid && rncVerificationResult.data && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-muted-foreground">Razón Social</Label>
                          <p className="font-medium">{rncVerificationResult.data.razonSocial}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Nombre Comercial</Label>
                          <p className="font-medium">{rncVerificationResult.data.nombreComercial || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Estado</Label>
                          <p className="font-medium">{rncVerificationResult.data.estado}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Categoría</Label>
                          <p className="font-medium">{rncVerificationResult.data.categoria || "N/A"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}