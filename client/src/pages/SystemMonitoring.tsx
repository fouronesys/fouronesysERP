import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, XCircle, Clock, Activity, Database, Server, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuditLog {
  id: number;
  userId?: string;
  companyId?: number;
  module: string;
  action: string;
  entityType: string;
  entityId?: string;
  timestamp: string;
  success: boolean;
  errorMessage?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

interface ErrorStats {
  total: number;
  byModule: Record<string, number>;
  bySeverity: Record<string, number>;
  recent: number;
}

interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  authentication: 'healthy' | 'warning' | 'error';
  modules: Record<string, 'healthy' | 'warning' | 'error'>;
  uptime: number;
  errors24h: number;
}

export default function SystemMonitoring() {
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const queryClient = useQueryClient();

  // Auto-refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/audit/logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/system/health'] });
      queryClient.invalidateQueries({ queryKey: ['/api/errors/stats'] });
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, queryClient]);

  const { data: auditLogs, isLoading: logsLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit/logs'],
    queryFn: async () => {
      const response = await fetch('/api/audit/logs?limit=50');
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    }
  });

  const { data: systemHealth, isLoading: healthLoading } = useQuery<SystemHealth>({
    queryKey: ['/api/system/health'],
    queryFn: async () => {
      const response = await fetch('/api/system/health');
      if (!response.ok) throw new Error('Failed to fetch system health');
      return response.json();
    }
  });

  const { data: errorStats, isLoading: statsLoading } = useQuery<ErrorStats>({
    queryKey: ['/api/errors/stats'],
    queryFn: async () => {
      const response = await fetch('/api/errors/stats');
      if (!response.ok) throw new Error('Failed to fetch error stats');
      return response.json();
    }
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'error': return 'bg-red-400';
      case 'warning': return 'bg-yellow-400';
      case 'info': return 'bg-blue-400';
      default: return 'bg-gray-400';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'error': return <XCircle className="h-5 w-5" />;
      default: return <Clock className="h-5 w-5" />;
    }
  };

  if (logsLoading || healthLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Cargando datos del sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto">
      <div className="container mx-auto p-6 space-y-6 pb-20">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Monitoreo del Sistema</h1>
          <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries();
            }}
          >
            <Activity className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Badge variant="secondary">
            Auto-refresh: {refreshInterval / 1000}s
          </Badge>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Base de Datos</CardTitle>
            <Database className={`h-4 w-4 ${getHealthColor(systemHealth?.database || 'error')}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getHealthIcon(systemHealth?.database || 'error')}
              <span className={`text-sm font-medium ${getHealthColor(systemHealth?.database || 'error')}`}>
                {systemHealth?.database === 'healthy' ? 'Operacional' : 
                 systemHealth?.database === 'warning' ? 'Advertencia' : 'Error'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Autenticación</CardTitle>
            <Users className={`h-4 w-4 ${getHealthColor(systemHealth?.authentication || 'error')}`} />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getHealthIcon(systemHealth?.authentication || 'error')}
              <span className={`text-sm font-medium ${getHealthColor(systemHealth?.authentication || 'error')}`}>
                {systemHealth?.authentication === 'healthy' ? 'Operacional' : 
                 systemHealth?.authentication === 'warning' ? 'Advertencia' : 'Error'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errores 24h</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {systemHealth?.errors24h || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Activo</CardTitle>
            <Server className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {systemHealth?.uptime ? Math.round(systemHealth.uptime / 3600) + 'h' : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Health Status */}
      {systemHealth?.modules && typeof systemHealth.modules === 'object' && (
        <Card>
          <CardHeader>
            <CardTitle>Estado de Módulos</CardTitle>
            <CardDescription>Estado operacional de cada módulo del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(systemHealth.modules || {}).map(([module, status]) => (
                <div key={module} className="flex items-center space-x-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  {getHealthIcon(status)}
                  <div>
                    <p className="text-sm font-medium">{module}</p>
                    <p className={`text-xs ${getHealthColor(status)}`}>
                      {status === 'healthy' ? 'OK' : 
                       status === 'warning' ? 'Advertencia' : 'Error'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Statistics */}
      {errorStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Errores por Módulo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(errorStats.byModule || {}).map(([module, count]) => (
                  <div key={module} className="flex justify-between items-center">
                    <span className="text-sm">{module}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Errores por Severidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(errorStats.bySeverity || {}).map(([severity, count]) => (
                  <div key={severity} className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${getSeverityColor(severity)}`}></div>
                      <span className="text-sm capitalize">{severity}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Logs */}
      <Tabs defaultValue="recent" className="w-full">
        <TabsList>
          <TabsTrigger value="recent">Actividad Reciente</TabsTrigger>
          <TabsTrigger value="errors">Solo Errores</TabsTrigger>
          <TabsTrigger value="all">Todos los Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente del Sistema</CardTitle>
              <CardDescription>Últimas 50 acciones registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {auditLogs?.slice(0, 20).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${getSeverityColor(log.severity)}`}></div>
                        <div>
                          <p className="text-sm font-medium">
                            {log.module} - {log.action}
                          </p>
                          <p className="text-xs text-gray-500">
                            {log.entityType} {log.entityId && `#${log.entityId}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                        {!log.success && (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Errores</CardTitle>
              <CardDescription>Solo eventos con errores o advertencias</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {auditLogs?.filter(log => !log.success || log.severity === 'error' || log.severity === 'critical').map((log) => (
                    <Alert key={log.id} variant={log.severity === 'critical' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex justify-between items-start">
                          <div>
                            <strong>{log.module} - {log.action}</strong>
                            <p className="text-sm">{log.errorMessage}</p>
                            <p className="text-xs text-gray-500">
                              {log.entityType} {log.entityId && `#${log.entityId}`}
                            </p>
                          </div>
                          <Badge variant={log.severity === 'critical' ? 'destructive' : 'secondary'}>
                            {log.severity}
                          </Badge>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registro Completo de Auditoría</CardTitle>
              <CardDescription>Todos los eventos del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-1">
                  {auditLogs?.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-2 border rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${getSeverityColor(log.severity)}`}></div>
                        <span className="font-medium">{log.module}</span>
                        <span className="text-gray-500">→</span>
                        <span>{log.action}</span>
                        <span className="text-gray-400">({log.entityType})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!log.success && (
                          <Badge variant="destructive" className="text-xs">
                            Error
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}