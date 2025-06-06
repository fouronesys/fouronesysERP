import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AnimatedProgressIndicator from "./AnimatedProgressIndicator";

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: number;
  saleNumber: string;
}

export default function InvoicePrintModal({ isOpen, onClose, saleId, saleNumber }: InvoicePrintModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  // HTML invoice generation
  const handleHTMLInvoice = async () => {
    setIsGenerating(true);
    setShowProgress(true);
    
    try {
      // Start the progress animation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(`/api/pos/print-html/${saleId}`, {
        method: "POST",
        credentials: 'include'
      });

      if (response.ok) {
        const htmlContent = await response.text();
        
        // Wait for progress animation to complete before opening invoice
        await new Promise(resolve => setTimeout(resolve, 4500));
        
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

        // Reset states and close modal
        setShowProgress(false);
        setIsGenerating(false);
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
      setShowProgress(false);
      setIsGenerating(false);
    }
  };

  // 80mm POS receipt generation with robust popup handling
  const handlePOS80mmReceipt = async () => {
    setIsGenerating(true);
    setShowProgress(true);
    
    try {
      // Start the progress animation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(`/api/pos/print-pos-80mm/${saleId}`, {
        method: "POST",
        credentials: 'include'
      });

      if (response.ok) {
        const htmlContent = await response.text();
        console.log('POS receipt HTML received, length:', htmlContent.length);
        
        // Wait for progress animation to complete
        await new Promise(resolve => setTimeout(resolve, 4500));
        
        // Create data URL and open in new window
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Open in new window
        const printWindow = window.open(url, '_blank', 'width=400,height=800,scrollbars=yes,resizable=yes');
        
        if (printWindow) {
          printWindow.focus();
          console.log('POS receipt window opened successfully');
          
          // Clean up the URL after window is opened
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 3000);
        } else {
          // Fallback: navigate to the URL directly
          window.open(url, '_blank');
          console.log('POS receipt opened in new tab');
          
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 3000);
        }

        toast({
          title: "Recibo POS generado",
          description: "Recibo de 80mm abierto en nueva ventana",
        });

        // Reset states and close modal
        setShowProgress(false);
        setIsGenerating(false);
        onClose();
      } else {
        const errorText = await response.text();
        console.error('Error response:', response.status, errorText);
        throw new Error(`Error del servidor: ${response.status}`);
      }
    } catch (error) {
      console.error('Error generating POS receipt:', error);
      toast({
        title: "Error al generar recibo",
        description: error instanceof Error ? error.message : "No se pudo generar el recibo POS",
        variant: "destructive",
      });
      setShowProgress(false);
      setIsGenerating(false);
    }
  };

  const handleProgressComplete = () => {
    // This will be called when the progress animation completes
    setShowProgress(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generar Factura {saleNumber}</DialogTitle>
        </DialogHeader>

        {showProgress ? (
          <AnimatedProgressIndicator 
            isActive={showProgress} 
            onComplete={handleProgressComplete}
          />
        ) : (
          <div className="space-y-4">
            {/* Professional Invoice Option */}
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Factura Profesional
                </CardTitle>
                <CardDescription>
                  Genera una factura con diseño profesional que incluye logo, QR code y formato optimizado para impresión
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Logo de la empresa en alta calidad</li>
                    <li>• Código QR de verificación</li>
                    <li>• Diseño negro profesional</li>
                    <li>• Formato completo tamaño carta</li>
                  </ul>
                </div>

                <Button 
                  onClick={handleHTMLInvoice} 
                  disabled={isGenerating}
                  className="w-full bg-black hover:bg-gray-800 text-white transition-all duration-300 hover:scale-105"
                  size="lg"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isGenerating ? "Iniciando..." : "Generar Factura Profesional"}
                </Button>
              </CardContent>
            </Card>

            {/* 80mm POS Receipt Option */}
            <Card className="animate-slide-up animation-delay-200">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Receipt className="w-5 h-5 mr-2" />
                  Recibo POS 80mm
                </CardTitle>
                <CardDescription>
                  Genera un recibo optimizado para impresoras térmicas de 80mm con logo y diseño compacto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>• Logo en encabezado optimizado</li>
                    <li>• Código QR de verificación</li>
                    <li>• Formato 80mm para impresoras térmicas</li>
                    <li>• Diseño compacto y legible</li>
                  </ul>
                </div>

                <Button 
                  onClick={handlePOS80mmReceipt} 
                  disabled={isGenerating}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white transition-all duration-300 hover:scale-105"
                  size="lg"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  {isGenerating ? "Iniciando..." : "Generar Recibo POS 80mm"}
                </Button>
              </CardContent>
            </Card>

            <div className="text-xs text-muted-foreground text-center animate-fade-in">
              Los documentos se abrirán en una nueva ventana listos para imprimir o guardar como PDF
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}