import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileSpreadsheet, 
  Download, 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  FileText
} from "lucide-react";
import { format } from "date-fns";

export default function FinancialReports() {
  const [selectedReport, setSelectedReport] = useState("balance-sheet");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Query for financial data
  const { data: balanceSheet, isLoading: isLoadingBalance } = useQuery({
    queryKey: ["/api/accounting/reports/balance-sheet", endDate],
    enabled: selectedReport === "balance-sheet",
  });

  const { data: incomeStatement, isLoading: isLoadingIncome } = useQuery({
    queryKey: ["/api/accounting/reports/income-statement", startDate, endDate],
    enabled: selectedReport === "income-statement",
  });

  const { data: trialBalance, isLoading: isLoadingTrial } = useQuery({
    queryKey: ["/api/accounting/reports/trial-balance", endDate],
    enabled: selectedReport === "trial-balance",
  });

  const { data: generalLedger, isLoading: isLoadingLedger } = useQuery({
    queryKey: ["/api/accounting/reports/general-ledger", startDate, endDate],
    enabled: selectedReport === "general-ledger",
  });

  const exportReport = (format: 'pdf' | 'excel') => {
    // Implementar exportación
    console.log(`Exportando reporte ${selectedReport} en formato ${format}`);
  };

  const renderBalanceSheet = () => {
    if (isLoadingBalance) return <div className="text-center py-4">Cargando balance general...</div>;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* Activos */}
          <Card>
            <CardHeader className="bg-blue-50 dark:bg-blue-900/20">
              <CardTitle className="text-blue-700 dark:text-blue-300">Activos</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Activos Corrientes</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Efectivo y Bancos</span>
                      <span className="font-mono">$125,450.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Cuentas por Cobrar</span>
                      <span className="font-mono">$45,200.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Inventarios</span>
                      <span className="font-mono">$78,900.00</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Activos Corrientes</span>
                      <span className="font-mono">$249,550.00</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Activos No Corrientes</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Propiedad, Planta y Equipo</span>
                      <span className="font-mono">$350,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Depreciación Acumulada</span>
                      <span className="font-mono text-red-600">($45,000.00)</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Activos No Corrientes</span>
                      <span className="font-mono">$305,000.00</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-lg border-t-2 pt-4">
                  <span>TOTAL ACTIVOS</span>
                  <span className="font-mono">$554,550.00</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pasivos y Patrimonio */}
          <Card>
            <CardHeader className="bg-red-50 dark:bg-red-900/20">
              <CardTitle className="text-red-700 dark:text-red-300">Pasivos y Patrimonio</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Pasivos Corrientes</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Cuentas por Pagar</span>
                      <span className="font-mono">$32,100.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Impuestos por Pagar</span>
                      <span className="font-mono">$8,500.00</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Pasivos Corrientes</span>
                      <span className="font-mono">$40,600.00</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Pasivos No Corrientes</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Préstamos a Largo Plazo</span>
                      <span className="font-mono">$150,000.00</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Pasivos No Corrientes</span>
                      <span className="font-mono">$150,000.00</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Patrimonio</h4>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Capital Social</span>
                      <span className="font-mono">$300,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Utilidades Retenidas</span>
                      <span className="font-mono">$63,950.00</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Patrimonio</span>
                      <span className="font-mono">$363,950.00</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between font-bold text-lg border-t-2 pt-4">
                  <span>TOTAL PASIVOS Y PATRIMONIO</span>
                  <span className="font-mono">$554,550.00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderIncomeStatement = () => {
    if (isLoadingIncome) return <div className="text-center py-4">Cargando estado de resultados...</div>;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de Resultados</CardTitle>
          <p className="text-sm text-muted-foreground">
            Del {format(new Date(startDate), "dd/MM/yyyy")} al {format(new Date(endDate), "dd/MM/yyyy")}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Ingresos por Ventas</span>
                <span className="font-mono">$450,000.00</span>
              </div>
              <div className="flex justify-between pl-4">
                <span className="text-sm text-muted-foreground">Ventas de Productos</span>
                <span className="font-mono text-sm">$380,000.00</span>
              </div>
              <div className="flex justify-between pl-4">
                <span className="text-sm text-muted-foreground">Ventas de Servicios</span>
                <span className="font-mono text-sm">$70,000.00</span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-2">
              <div className="flex justify-between">
                <span>Costo de Ventas</span>
                <span className="font-mono text-red-600">($270,000.00)</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Utilidad Bruta</span>
                <span className="font-mono">$180,000.00</span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-2">
              <div className="flex justify-between">
                <span>Gastos Operativos</span>
                <span className="font-mono text-red-600">($120,000.00)</span>
              </div>
              <div className="flex justify-between pl-4">
                <span className="text-sm text-muted-foreground">Gastos de Administración</span>
                <span className="font-mono text-sm text-red-600">($50,000.00)</span>
              </div>
              <div className="flex justify-between pl-4">
                <span className="text-sm text-muted-foreground">Gastos de Ventas</span>
                <span className="font-mono text-sm text-red-600">($40,000.00)</span>
              </div>
              <div className="flex justify-between pl-4">
                <span className="text-sm text-muted-foreground">Otros Gastos Operativos</span>
                <span className="font-mono text-sm text-red-600">($30,000.00)</span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-2">
              <div className="flex justify-between font-semibold">
                <span>Utilidad Operativa</span>
                <span className="font-mono">$60,000.00</span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-2">
              <div className="flex justify-between">
                <span>Gastos Financieros</span>
                <span className="font-mono text-red-600">($8,000.00)</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Utilidad Antes de Impuestos</span>
                <span className="font-mono">$52,000.00</span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-2">
              <div className="flex justify-between">
                <span>Impuesto Sobre la Renta (27%)</span>
                <span className="font-mono text-red-600">($14,040.00)</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t-2 pt-2">
                <span>UTILIDAD NETA</span>
                <span className="font-mono text-green-600">$37,960.00</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reportes Financieros</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button variant="outline" onClick={() => exportReport('excel')}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Configuración de Reportes</CardTitle>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span className="text-muted-foreground">hasta</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={selectedReport} onValueChange={setSelectedReport}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Balance General
          </TabsTrigger>
          <TabsTrigger value="income-statement" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Estado de Resultados
          </TabsTrigger>
          <TabsTrigger value="trial-balance" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Balanza de Comprobación
          </TabsTrigger>
          <TabsTrigger value="general-ledger" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Libro Mayor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="balance-sheet" className="mt-6">
          {renderBalanceSheet()}
        </TabsContent>

        <TabsContent value="income-statement" className="mt-6">
          {renderIncomeStatement()}
        </TabsContent>

        <TabsContent value="trial-balance" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Balanza de Comprobación</CardTitle>
              <p className="text-sm text-muted-foreground">Al {format(new Date(endDate), "dd/MM/yyyy")}</p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Reporte en desarrollo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general-ledger" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Libro Mayor</CardTitle>
              <p className="text-sm text-muted-foreground">
                Del {format(new Date(startDate), "dd/MM/yyyy")} al {format(new Date(endDate), "dd/MM/yyyy")}
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Reporte en desarrollo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}