import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Calculator, DollarSign, Calendar, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/Header";
import { FeatureGuard } from "@/components/FeatureGuard";
import type { PayrollPeriod, PayrollEntry, Employee } from "@shared/schema";

export default function Payroll() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<PayrollPeriod | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: periods = [], isLoading: loadingPeriods } = useQuery({
    queryKey: ["/api/payroll/periods"],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: entries = [], isLoading: loadingEntries } = useQuery({
    queryKey: ["/api/payroll/entries", selectedPeriod?.id],
    enabled: !!selectedPeriod,
  });

  const createPeriodMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/payroll/periods", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/periods"] });
      setIsDialogOpen(false);
      setEditingPeriod(null);
      toast({
        title: "Período creado",
        description: "El período de nómina ha sido creado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePeriodMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/payroll/periods/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/periods"] });
      setIsDialogOpen(false);
      setEditingPeriod(null);
      toast({
        title: "Período actualizado",
        description: "El período de nómina ha sido actualizado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generatePayrollMutation = useMutation({
    mutationFn: (periodId: number) => apiRequest(`/api/payroll/generate/${periodId}`, {
      method: "POST",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll/entries", selectedPeriod?.id] });
      toast({
        title: "Nómina generada",
        description: "La nómina ha sido generada exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      periodName: formData.get("periodName"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      payDate: formData.get("payDate"),
      status: formData.get("status"),
    };

    if (editingPeriod) {
      updatePeriodMutation.mutate({ id: editingPeriod.id, data });
    } else {
      createPeriodMutation.mutate(data);
    }
  };

  const handleEdit = (period: PayrollPeriod) => {
    setEditingPeriod(period);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      processing: "default",
      paid: "default",
      closed: "outline",
    } as const;
    
    const labels = {
      draft: "Borrador",
      processing: "Procesando",
      paid: "Pagado",
      closed: "Cerrado",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const calculateTotalPay = (entries: PayrollEntry[]) => {
    return entries.reduce((sum, entry) => sum + parseFloat(entry.netPay), 0);
  };

  const getEmployeeName = (employeeId: number) => {
    const employee = (employees as Employee[]).find((emp: Employee) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Empleado no encontrado";
  };

  return (
    <div className="h-screen overflow-y-auto">
      <div className="container mx-auto p-4 space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Sistema de Nómina
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Gestiona períodos de nómina y pagos de empleados
            </p>
          </div>
        </div>

        <Tabs defaultValue="periods" className="w-full">
          <TabsList>
            <TabsTrigger value="periods">Períodos de Nómina</TabsTrigger>
            <TabsTrigger value="entries">Entradas de Nómina</TabsTrigger>
          </TabsList>

          <TabsContent value="periods" className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingPeriod(null)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Período
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingPeriod ? "Editar Período" : "Nuevo Período"}
                    </DialogTitle>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="periodName">Nombre del Período</Label>
                      <Input
                        id="periodName"
                        name="periodName"
                        defaultValue={editingPeriod?.periodName || ""}
                        placeholder="Ej: Enero 2024"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Fecha de Inicio</Label>
                        <Input
                          id="startDate"
                          name="startDate"
                          type="date"
                          defaultValue={editingPeriod?.startDate ? new Date(editingPeriod.startDate).toISOString().split('T')[0] : ""}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">Fecha de Fin</Label>
                        <Input
                          id="endDate"
                          name="endDate"
                          type="date"
                          defaultValue={editingPeriod?.endDate ? new Date(editingPeriod.endDate).toISOString().split('T')[0] : ""}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="payDate">Fecha de Pago</Label>
                        <Input
                          id="payDate"
                          name="payDate"
                          type="date"
                          defaultValue={editingPeriod?.payDate ? new Date(editingPeriod.payDate).toISOString().split('T')[0] : ""}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Estado</Label>
                        <Select name="status" defaultValue={editingPeriod?.status || "draft"}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Borrador</SelectItem>
                            <SelectItem value="processing">Procesando</SelectItem>
                            <SelectItem value="paid">Pagado</SelectItem>
                            <SelectItem value="closed">Cerrado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createPeriodMutation.isPending || updatePeriodMutation.isPending}
                      >
                        {editingPeriod ? "Actualizar" : "Crear"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {loadingPeriods ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid gap-4">
                {(periods as PayrollPeriod[]).map((period: PayrollPeriod) => (
                  <Card key={period.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{period.periodName}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(period.status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPeriod(period)}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Ver Entradas
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(period)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Pago: {new Date(period.payDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calculator className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            Estado: {period.status}
                          </span>
                        </div>
                        {period.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => generatePayrollMutation.mutate(period.id)}
                            disabled={generatePayrollMutation.isPending}
                          >
                            <Calculator className="w-4 h-4 mr-1" />
                            Generar Nómina
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {(periods as PayrollPeriod[]).length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No hay períodos de nómina</h3>
                      <p className="text-muted-foreground mb-4">
                        Comienza creando tu primer período de nómina.
                      </p>
                      <Button onClick={() => setIsDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Período
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="entries" className="space-y-6">
            {selectedPeriod ? (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium">{selectedPeriod.periodName}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedPeriod.startDate).toLocaleDateString()} - {new Date(selectedPeriod.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total a Pagar</p>
                      <p className="text-lg font-semibold">
                        DOP ${calculateTotalPay(entries).toLocaleString()}
                      </p>
                    </div>
                    {getStatusBadge(selectedPeriod.status)}
                  </div>
                </div>

                {loadingEntries ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {entries.map((entry: PayrollEntry) => (
                      <Card key={entry.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">
                                {getEmployeeName(entry.employeeId)}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">
                                Salario Base: DOP ${parseFloat(entry.baseSalary).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold">
                                DOP ${parseFloat(entry.netPay).toLocaleString()}
                              </p>
                              <p className="text-sm text-muted-foreground">Pago Neto</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Horas Trabajadas</p>
                              <p className="font-medium">{entry.hoursWorked || 0}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Horas Extras</p>
                              <p className="font-medium">{entry.overtimeHours || 0}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Bonificaciones</p>
                              <p className="font-medium">DOP ${parseFloat(entry.bonuses || "0").toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Pago Bruto</p>
                              <p className="font-medium">DOP ${parseFloat(entry.grossPay).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">TSS</p>
                              <p className="font-medium">DOP ${parseFloat(entry.tssDeduction || "0").toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">SFS</p>
                              <p className="font-medium">DOP ${parseFloat(entry.sfsDeduction || "0").toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">INFOTEP</p>
                              <p className="font-medium">DOP ${parseFloat(entry.infotepDeduction || "0").toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Total Deducciones</p>
                              <p className="font-medium">DOP ${parseFloat(entry.totalDeductions).toLocaleString()}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {entries.length === 0 && (
                      <Card>
                        <CardContent className="text-center py-12">
                          <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">No hay entradas de nómina</h3>
                          <p className="text-muted-foreground mb-4">
                            {selectedPeriod.status === "draft" 
                              ? "Genera la nómina para este período para ver las entradas."
                              : "No se encontraron entradas para este período."
                            }
                          </p>
                          {selectedPeriod.status === "draft" && (
                            <Button onClick={() => generatePayrollMutation.mutate(selectedPeriod.id)}>
                              <Calculator className="w-4 h-4 mr-2" />
                              Generar Nómina
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Selecciona un período</h3>
                  <p className="text-muted-foreground">
                    Selecciona un período de nómina para ver sus entradas.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}