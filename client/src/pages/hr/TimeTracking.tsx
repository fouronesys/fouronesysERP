import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, Calendar, User, LogIn, LogOut, Coffee, Activity } from "lucide-react";
import { format } from "date-fns";

export default function TimeTracking() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const { toast } = useToast();

  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  const { data: timeRecords = [], isLoading } = useQuery({
    queryKey: ["/api/time-tracking", selectedDate, selectedEmployee],
  });

  const { data: currentStatus } = useQuery({
    queryKey: ["/api/time-tracking/current-status"],
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  const clockInMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/time-tracking/clock-in", {
        method: "POST",
        body: JSON.stringify({ timestamp: new Date() }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-tracking/current-status"] });
      toast({
        title: "Entrada registrada",
        description: "Se ha registrado tu entrada exitosamente.",
      });
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/time-tracking/clock-out", {
        method: "POST",
        body: JSON.stringify({ timestamp: new Date() }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-tracking"] });
      queryClient.invalidateQueries({ queryKey: ["/api/time-tracking/current-status"] });
      toast({
        title: "Salida registrada",
        description: "Se ha registrado tu salida exitosamente.",
      });
    },
  });

  const breakStartMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/time-tracking/break-start", {
        method: "POST",
        body: JSON.stringify({ timestamp: new Date() }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-tracking/current-status"] });
      toast({
        title: "Descanso iniciado",
        description: "Se ha iniciado tu tiempo de descanso.",
      });
    },
  });

  const breakEndMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/time-tracking/break-end", {
        method: "POST",
        body: JSON.stringify({ timestamp: new Date() }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-tracking/current-status"] });
      toast({
        title: "Descanso finalizado",
        description: "Se ha finalizado tu tiempo de descanso.",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "working": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "break": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "out": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "";
    }
  };

  const calculateTotalHours = (records: any[]) => {
    let totalMinutes = 0;
    records.forEach(record => {
      if (record.clockIn && record.clockOut) {
        const start = new Date(record.clockIn);
        const end = new Date(record.clockOut);
        totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
        
        // Restar tiempo de descanso
        if (record.breakStart && record.breakEnd) {
          const breakStart = new Date(record.breakStart);
          const breakEnd = new Date(record.breakEnd);
          totalMinutes -= (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
        }
      }
    });
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Control de Tiempo</h1>
        <div className="flex gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">Todos los empleados</option>
            {Array.isArray(employees) && employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Panel de control rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mi Estado Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Estado:</span>
                </div>
                <Badge className={getStatusColor((currentStatus as any)?.status || "out")}>
                  {(currentStatus as any)?.status === "working" ? "Trabajando" :
                   (currentStatus as any)?.status === "break" ? "En descanso" : "Fuera"}
                </Badge>
              </div>
              
              {(currentStatus as any)?.clockInTime && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LogIn className="h-5 w-5 text-muted-foreground" />
                    <span>Entrada:</span>
                  </div>
                  <span className="font-mono">
                    {format(new Date((currentStatus as any).clockInTime), "HH:mm")}
                  </span>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                {!(currentStatus as any)?.status || (currentStatus as any)?.status === "out" ? (
                  <Button 
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending}
                    className="flex-1"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Marcar Entrada
                  </Button>
                ) : (currentStatus as any)?.status === "working" ? (
                  <>
                    <Button 
                      onClick={() => breakStartMutation.mutate()}
                      disabled={breakStartMutation.isPending}
                      variant="outline"
                      className="flex-1"
                    >
                      <Coffee className="mr-2 h-4 w-4" />
                      Iniciar Descanso
                    </Button>
                    <Button 
                      onClick={() => clockOutMutation.mutate()}
                      disabled={clockOutMutation.isPending}
                      variant="destructive"
                      className="flex-1"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Marcar Salida
                    </Button>
                  </>
                ) : (currentStatus as any)?.status === "break" && (
                  <Button 
                    onClick={() => breakEndMutation.mutate()}
                    disabled={breakEndMutation.isPending}
                    className="flex-1"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Terminar Descanso
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen del Día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trabajado</p>
                  <p className="text-2xl font-bold">{calculateTotalHours((timeRecords as any) || [])}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Registros</p>
                  <p className="text-2xl font-bold">{(timeRecords as any)?.length || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de registros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Registros de Tiempo</CardTitle>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {format(new Date(selectedDate), "dd/MM/yyyy")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Cargando registros...</div>
          ) : ((timeRecords as any) || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay registros para esta fecha</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Inicio Descanso</TableHead>
                  <TableHead>Fin Descanso</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {((timeRecords as any) || []).map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {record.employeeName}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.clockIn && format(new Date(record.clockIn), "HH:mm")}
                    </TableCell>
                    <TableCell>
                      {record.breakStart && format(new Date(record.breakStart), "HH:mm")}
                    </TableCell>
                    <TableCell>
                      {record.breakEnd && format(new Date(record.breakEnd), "HH:mm")}
                    </TableCell>
                    <TableCell>
                      {record.clockOut && format(new Date(record.clockOut), "HH:mm")}
                    </TableCell>
                    <TableCell className="font-mono">
                      {record.totalHours || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(record.status)}>
                        {record.status === "working" ? "Trabajando" :
                         record.status === "break" ? "En descanso" : 
                         record.status === "completed" ? "Completado" : "Incompleto"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}