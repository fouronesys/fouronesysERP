import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Database, 
  Server, 
  HardDrive,
  Activity,
  Download,
  Upload,
  RefreshCw,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function System() {
  const [isBackupRunning, setIsBackupRunning] = useState(false);
  const { toast } = useToast();

  const { data: systemInfo, isLoading: isLoadingSystem } = useQuery({
    queryKey: ["/api/system/info"],
    refetchInterval: 30000, // Actualizar cada 30 segundos
  });

  const { data: systemConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["/api/system/config"],
  });

  const { data: backupHistory } = useQuery({
    queryKey: ["/api/system/backups"],
  });

  const updateConfigMutation = useMutation({
    mutationFn: (config: any) =>
      apiRequest("/api/system/config", {
        method: "PATCH",
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/config"] });
      toast({
        title: "Configuración actualizada",
        description: "Los cambios han sido guardados exitosamente.",
      });
    },
  });

  const createBackupMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/system/backup", {
        method: "POST",
      }),
    onMutate: () => {
      setIsBackupRunning(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system/backups"] });
      toast({
        title: "Respaldo creado",
        description: "El respaldo se ha creado exitosamente.",
      });
    },
    onSettled: () => {
      setIsBackupRunning(false);
    },
  });

  const restoreBackupMutation = useMutation({
    mutationFn: (backupId: string) =>
      apiRequest(`/api/system/restore/${backupId}`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast({
        title: "Restauración completada",
        description: "El sistema ha sido restaurado exitosamente.",
      });
    },
  });

  const updateDGIIMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/system/dgii/update", {
        method: "POST",
      }),
    onSuccess: () => {
      toast({
        title: "Actualización DGII",
        description: "El registro RNC ha sido actualizado.",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-600";
      case "warning": return "text-yellow-600";
      case "error": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Estado del Servidor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(systemInfo?.status || "unknown")}`}>
              {systemInfo?.status === "healthy" ? "Saludable" : 
               systemInfo?.status === "warning" ? "Advertencia" : "Error"}
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {systemInfo?.uptime || "0h"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemInfo?.database?.connections || 0}/{systemInfo?.database?.maxConnections || 100}
            </div>
            <p className="text-xs text-muted-foreground">
              Conexiones activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Almacenamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemInfo?.storage?.usedPercentage || 0}%
            </div>
            <Progress value={systemInfo?.storage?.usedPercentage || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatBytes(systemInfo?.storage?.used || 0)} / {formatBytes(systemInfo?.storage?.total || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Rendimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemInfo?.performance?.cpu || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              RAM: {systemInfo?.performance?.memory || 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="backup">Respaldos</TabsTrigger>
          <TabsTrigger value="dgii">DGII</TabsTrigger>
          <TabsTrigger value="advanced">Avanzado</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>
                Ajustes básicos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="system-name">Nombre del Sistema</Label>
                  <Input
                    id="system-name"
                    value={systemConfig?.name || "Four One Solutions"}
                    onChange={(e) => updateConfigMutation.mutate({ name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select 
                    value={systemConfig?.timezone || "America/Santo_Domingo"}
                    onValueChange={(value) => updateConfigMutation.mutate({ timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Santo_Domingo">Santo Domingo</SelectItem>
                      <SelectItem value="America/New_York">New York</SelectItem>
                      <SelectItem value="America/Mexico_City">Ciudad de México</SelectItem>
                      <SelectItem value="America/Bogota">Bogotá</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select 
                    value={systemConfig?.currency || "DOP"}
                    onValueChange={(value) => updateConfigMutation.mutate({ currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DOP">DOP - Peso Dominicano</SelectItem>
                      <SelectItem value="USD">USD - Dólar Americano</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Idioma</Label>
                  <Select 
                    value={systemConfig?.language || "es"}
                    onValueChange={(value) => updateConfigMutation.mutate({ language: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="maintenance-mode">Modo de Mantenimiento</Label>
                    <p className="text-sm text-muted-foreground">
                      Bloquea el acceso a usuarios no administradores
                    </p>
                  </div>
                  <Switch
                    id="maintenance-mode"
                    checked={systemConfig?.maintenanceMode || false}
                    onCheckedChange={(checked) => updateConfigMutation.mutate({ maintenanceMode: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-backup">Respaldo Automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Realiza respaldos diarios automáticamente
                    </p>
                  </div>
                  <Switch
                    id="auto-backup"
                    checked={systemConfig?.autoBackup || false}
                    onCheckedChange={(checked) => updateConfigMutation.mutate({ autoBackup: checked })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gestión de Respaldos</CardTitle>
                  <CardDescription>
                    Crea y restaura copias de seguridad del sistema
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => createBackupMutation.mutate()}
                  disabled={isBackupRunning || createBackupMutation.isPending}
                >
                  {isBackupRunning ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Crear Respaldo
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(backupHistory) && backupHistory.length > 0 ? (
                  backupHistory.map((backup: any) => (
                    <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{backup.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(backup.createdAt).toLocaleString()} - {formatBytes(backup.size)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (confirm("¿Estás seguro de restaurar este respaldo?")) {
                              restoreBackupMutation.mutate(backup.id);
                            }
                          }}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Restaurar
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="mr-2 h-4 w-4" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No hay respaldos disponibles</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dgii" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración DGII</CardTitle>
              <CardDescription>
                Ajustes para el cumplimiento fiscal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Estado del Registro RNC</p>
                  <p className="text-sm text-muted-foreground">
                    Última actualización: {systemInfo?.dgii?.lastUpdate || "Nunca"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {systemInfo?.dgii?.status === "online" ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => updateDGIIMutation.mutate()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualizar
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dgii-auto-update">Actualización Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Actualiza el registro RNC diariamente
                    </p>
                  </div>
                  <Switch
                    id="dgii-auto-update"
                    checked={systemConfig?.dgii?.autoUpdate || false}
                    onCheckedChange={(checked) => 
                      updateConfigMutation.mutate({ dgii: { autoUpdate: checked } })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Registros RNC</Label>
                    <div className="text-2xl font-bold">{systemInfo?.dgii?.totalRecords || 0}</div>
                    <p className="text-xs text-muted-foreground">Total en base de datos</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tamaño del Registro</Label>
                    <div className="text-2xl font-bold">{formatBytes(systemInfo?.dgii?.size || 0)}</div>
                    <p className="text-xs text-muted-foreground">Espacio utilizado</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración Avanzada</CardTitle>
              <CardDescription>
                Ajustes técnicos del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Tiempo de Sesión (minutos)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    value={systemConfig?.sessionTimeout || 30}
                    onChange={(e) => updateConfigMutation.mutate({ sessionTimeout: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-file-size">Tamaño Máximo de Archivo (MB)</Label>
                  <Input
                    id="max-file-size"
                    type="number"
                    value={systemConfig?.maxFileSize || 10}
                    onChange={(e) => updateConfigMutation.mutate({ maxFileSize: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log-retention">Retención de Logs (días)</Label>
                  <Input
                    id="log-retention"
                    type="number"
                    value={systemConfig?.logRetention || 90}
                    onChange={(e) => updateConfigMutation.mutate({ logRetention: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Información del Sistema</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Versión:</span>
                    <span className="ml-2 font-mono">{systemInfo?.version || "1.0.0"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Entorno:</span>
                    <span className="ml-2 font-mono">{systemInfo?.environment || "production"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Node.js:</span>
                    <span className="ml-2 font-mono">{systemInfo?.nodeVersion || "20.x"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base de Datos:</span>
                    <span className="ml-2 font-mono">PostgreSQL {systemInfo?.database?.version || "15.x"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}