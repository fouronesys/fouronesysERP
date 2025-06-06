import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: number;
  saleNumber: string;
}

export default function InvoicePrintModal({ isOpen, onClose, saleId, saleNumber }: InvoicePrintModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // HTML invoice generation
  const handleHTMLInvoice = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/pos/print-html/${saleId}`, {
        method: "POST",
        credentials: 'include'
      });

      if (response.ok) {
        const htmlContent = await response.text();
        
        // Open in new window/tab for printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
        }

        toast({
          title: "Factura generada",
          description: "Factura profesional abierta en nueva ventana",
        });

        onClose();
      } else {
        throw new Error("Failed to generate HTML invoice");
      }
    } catch (error) {
      toast({
        title: "Error al generar factura",
        description: "No se pudo generar la factura",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar Factura {saleNumber}</DialogTitle>
        </DialogHeader>

        <Card>
          <CardHeader>
            <CardTitle>Factura Profesional</CardTitle>
            <CardDescription>
              Genera una factura con diseño profesional que incluye logo, QR code y formato optimizado para impresión
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Características incluidas:</h4>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <li>• Logo de la empresa en alta calidad</li>
                <li>• Código QR de verificación</li>
                <li>• Diseño negro profesional</li>
                <li>• Información completa del cliente y empresa</li>
                <li>• Formato listo para imprimir o guardar como PDF</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleHTMLInvoice} 
                disabled={isGenerating}
                className="flex-1 bg-black hover:bg-gray-800 text-white"
                size="lg"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isGenerating ? "Generando..." : "Generar Factura"}
              </Button>
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              La factura se abrirá en una nueva ventana lista para imprimir o guardar como PDF
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}