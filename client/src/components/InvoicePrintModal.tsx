import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, FileText, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: number;
  saleNumber: string;
}

export default function InvoicePrintModal({ isOpen, onClose, saleId, saleNumber }: InvoicePrintModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("thermal");
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Thermal printing options
  const [thermalWidth, setThermalWidth] = useState("80mm");
  const [thermalShowLogo, setThermalShowLogo] = useState(true);
  const [thermalShowNCF, setThermalShowNCF] = useState(true);
  const [thermalShowQR, setThermalShowQR] = useState(true);
  const [thermalPaperCut, setThermalPaperCut] = useState(true);
  const [thermalCashDrawer, setThermalCashDrawer] = useState(false);

  // PDF options
  const [pdfFormat, setPdfFormat] = useState("letter");
  const [pdfOrientation, setPdfOrientation] = useState("portrait");
  const [pdfShowLogo, setPdfShowLogo] = useState(true);
  const [pdfShowNCF, setPdfShowNCF] = useState(true);
  const [pdfShowQR, setPdfShowQR] = useState(true);
  const [pdfWatermark, setPdfWatermark] = useState("");

  const handleThermalPrint = async () => {
    setIsPrinting(true);
    try {
      const response = await apiRequest("POST", `/api/pos/print-thermal/${saleId}`, {
        width: thermalWidth,
        showLogo: thermalShowLogo,
        showNCF: thermalShowNCF,
        showQR: thermalShowQR,
        paperCut: thermalPaperCut,
        cashDrawer: thermalCashDrawer
      });

      const result = await response.json();
      
      if (result.success) {
        // Create a new window/tab with the receipt text for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Recibo Térmico</title>
                <style>
                  body { font-family: 'Courier New', monospace; font-size: 12px; margin: 20px; white-space: pre-line; }
                  @media print { body { margin: 0; } }
                </style>
              </head>
              <body>${result.printData}</body>
            </html>
          `);
          printWindow.document.close();
          
          // Auto-print after a short delay
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }

        toast({
          title: "Recibo térmico generado",
          description: result.message || `Recibo de ${thermalWidth} generado correctamente`,
        });

        onClose();
      } else {
        throw new Error(result.message || "Failed to generate thermal receipt");
      }
    } catch (error) {
      toast({
        title: "Error al generar recibo térmico",
        description: "No se pudo generar el recibo térmico",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePDFGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await apiRequest("POST", `/api/pos/print-pdf/${saleId}`, {
        format: pdfFormat,
        orientation: pdfOrientation,
        showLogo: pdfShowLogo,
        showNCF: pdfShowNCF,
        showQR: pdfShowQR,
        watermark: pdfWatermark || undefined
      });

      const result = await response.json();
      
      if (result.success) {
        // Create a new window/tab with the HTML content for printing as PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(result.htmlContent);
          printWindow.document.close();
          
          // Auto-print after a short delay
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }

        toast({
          title: "PDF generado",
          description: result.message || `Factura en formato ${pdfFormat.toUpperCase()} generada correctamente`,
        });

        onClose();
      } else {
        throw new Error(result.message || "Failed to generate PDF");
      }
    } catch (error) {
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Imprimir Factura {saleNumber}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="thermal">
              <Printer className="w-4 h-4 mr-2" />
              Impresión Térmica
            </TabsTrigger>
            <TabsTrigger value="pdf">
              <FileText className="w-4 h-4 mr-2" />
              PDF / Carta
            </TabsTrigger>
          </TabsList>

          <TabsContent value="thermal" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Impresión Térmica</CardTitle>
                <CardDescription>
                  Configura las opciones para impresoras térmicas de 80mm y 56mm
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ancho del papel</Label>
                    <Select value={thermalWidth} onValueChange={setThermalWidth}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="80mm">80mm (Estándar)</SelectItem>
                        <SelectItem value="56mm">56mm (Compacto)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="thermal-logo">Mostrar logo</Label>
                      <Switch
                        id="thermal-logo"
                        checked={thermalShowLogo}
                        onCheckedChange={setThermalShowLogo}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="thermal-ncf">Mostrar NCF</Label>
                      <Switch
                        id="thermal-ncf"
                        checked={thermalShowNCF}
                        onCheckedChange={setThermalShowNCF}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="thermal-qr">Código QR</Label>
                      <Switch
                        id="thermal-qr"
                        checked={thermalShowQR}
                        onCheckedChange={setThermalShowQR}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="thermal-cut">Corte de papel</Label>
                    <Switch
                      id="thermal-cut"
                      checked={thermalPaperCut}
                      onCheckedChange={setThermalPaperCut}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="thermal-drawer">Abrir gaveta</Label>
                    <Switch
                      id="thermal-drawer"
                      checked={thermalCashDrawer}
                      onCheckedChange={setThermalCashDrawer}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleThermalPrint} 
                    disabled={isPrinting}
                    className="flex-1"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    {isPrinting ? "Generando..." : "Imprimir Recibo"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pdf" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de PDF</CardTitle>
                <CardDescription>
                  Genera facturas en PDF para impresión en papel carta o A4
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Formato de papel</Label>
                    <Select value={pdfFormat} onValueChange={setPdfFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="letter">Carta (8.5" x 11")</SelectItem>
                        <SelectItem value="a4">A4 (210mm x 297mm)</SelectItem>
                        <SelectItem value="legal">Legal (8.5" x 14")</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Orientación</Label>
                    <Select value={pdfOrientation} onValueChange={setPdfOrientation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portrait">Vertical</SelectItem>
                        <SelectItem value="landscape">Horizontal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pdf-logo">Mostrar logo</Label>
                      <Switch
                        id="pdf-logo"
                        checked={pdfShowLogo}
                        onCheckedChange={setPdfShowLogo}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="pdf-ncf">Mostrar NCF</Label>
                      <Switch
                        id="pdf-ncf"
                        checked={pdfShowNCF}
                        onCheckedChange={setPdfShowNCF}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="pdf-qr">Código QR</Label>
                      <Switch
                        id="pdf-qr"
                        checked={pdfShowQR}
                        onCheckedChange={setPdfShowQR}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="watermark">Marca de agua (opcional)</Label>
                    <Input
                      id="watermark"
                      placeholder="BORRADOR, COPIA, etc."
                      value={pdfWatermark}
                      onChange={(e) => setPdfWatermark(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handlePDFGenerate} 
                    disabled={isGenerating}
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {isGenerating ? "Generando..." : "Generar PDF"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}