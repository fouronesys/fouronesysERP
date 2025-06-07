import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, Clock, Bug, Database, Server, Smartphone, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ErrorLog {
  id: number;
  errorId: string;
  message: string;
  stack: string;
  type: 'frontend' | 'backend' | 'database' | 'api' | 'validation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: any;
  userId?: string;
  companyId?: number;
  resolved: boolean;
  aiAnalysis?: string;
  suggestedFix?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

interface ErrorStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
  unresolved: number;
  last24h: number;
}

const ErrorManagement = () => {
  const [filters, setFilters] = useState({
    severity: "",
    type: "",
    resolved: "",
    page: 1
  });
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch error statistics
  const { data: stats } = useQuery<ErrorStats>({
    queryKey: ['/api/errors/stats'],
  });

  // Fetch error logs
  const { data: errors, isLoading } = useQuery<ErrorLog[]>({
    queryKey: ['/api/errors', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.severity && filters.severity !== 'all') params.append('severity', filters.severity);
      if (filters.type && filters.type !== 'all') params.append('type', filters.type);
      if (filters.resolved && filters.resolved !== 'all') params.append('resolved', filters.resolved);
      params.append('page', filters.page.toString());
      
      const response = await fetch(`/api/errors?${params}`);
      if (!response.ok) throw new Error('Failed to fetch errors');
      return response.json();
    },
  });

  // Resolve error mutation
  const resolveErrorMutation = useMutation({
    mutationFn: async (errorId: string) => {
      return apiRequest(`/api/errors/${errorId}/resolve`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/errors'] });
      queryClient.invalidateQueries({ queryKey: ['/api/errors/stats'] });
      toast({
        title: "Error Resuelto",
        description: "El error ha sido marcado como resuelto exitosamente.",
      });
      setSelectedError(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo resolver el error. Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <Bug className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'frontend': return <Smartphone className="h-4 w-4" />;
      case 'backend': return <Server className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'api': return <Server className="h-4 w-4" />;
      case 'validation': return <AlertCircle className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-DO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Gestión de Errores</h1>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              AI Powered
            </Badge>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                <div className="text-sm text-gray-600">Críticos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
                <div className="text-sm text-gray-600">Altos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.medium}</div>
                <div className="text-sm text-gray-600">Medios</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.low}</div>
                <div className="text-sm text-gray-600">Bajos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-emerald-600">{stats.resolved}</div>
                <div className="text-sm text-gray-600">Resueltos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.unresolved}</div>
                <div className="text-sm text-gray-600">Pendientes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-indigo-600">{stats.last24h}</div>
                <div className="text-sm text-gray-600">Últimas 24h</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos los Errores</TabsTrigger>
          <TabsTrigger value="unresolved">No Resueltos</TabsTrigger>
          <TabsTrigger value="critical">Críticos</TabsTrigger>
          <TabsTrigger value="analytics">Análisis AI</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <Select 
                  value={filters.severity} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las severidades</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                    <SelectItem value="medium">Medio</SelectItem>
                    <SelectItem value="low">Bajo</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.type} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filtrar por tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="frontend">Frontend</SelectItem>
                    <SelectItem value="backend">Backend</SelectItem>
                    <SelectItem value="database">Base de Datos</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="validation">Validación</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={filters.resolved} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, resolved: value }))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Resueltos</SelectItem>
                    <SelectItem value="false">Pendientes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Error List */}
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">Cargando errores...</div>
            ) : errors && errors.length > 0 ? (
              <div className="grid gap-4">
                {errors.map((error) => (
                  <Card key={error.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4" onClick={() => setSelectedError(error)}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            {getSeverityIcon(error.severity)}
                            {getTypeIcon(error.type)}
                            <Badge className={getSeverityColor(error.severity)}>
                              {error.severity.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">
                              {error.type.toUpperCase()}
                            </Badge>
                            {error.resolved && (
                              <Badge className="bg-green-100 text-green-800">
                                RESUELTO
                              </Badge>
                            )}
                          </div>
                          <div className="font-medium text-sm">{error.errorId}</div>
                          <div className="text-sm text-gray-600 line-clamp-2">{error.message}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(error.createdAt)}
                            {error.context?.url && (
                              <span className="ml-2">• {error.context.url}</span>
                            )}
                          </div>
                        </div>
                        {!error.resolved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              resolveErrorMutation.mutate(error.errorId);
                            }}
                            disabled={resolveErrorMutation.isPending}
                          >
                            Resolver
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="text-gray-500">No se encontraron errores</div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="unresolved">
          <div className="text-center py-8 text-gray-500">
            Filtros para errores no resueltos se aplicarán automáticamente
          </div>
        </TabsContent>

        <TabsContent value="critical">
          <div className="text-center py-8 text-gray-500">
            Filtros para errores críticos se aplicarán automáticamente
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Análisis Inteligente con IA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-gray-600">
                Los errores de alta y crítica severidad son analizados automáticamente por IA para proporcionar:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Análisis detallado del problema</li>
                  <li>Soluciones sugeridas paso a paso</li>
                  <li>Medidas preventivas</li>
                  <li>Categorización automática</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

        {/* Error Detail Modal */}
        {selectedError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    {getSeverityIcon(selectedError.severity)}
                    <span>Error {selectedError.errorId}</span>
                  </CardTitle>
                  <Button variant="ghost" onClick={() => setSelectedError(null)}>×</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium">Tipo</div>
                    <Badge variant="outline">{selectedError.type.toUpperCase()}</Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Severidad</div>
                    <Badge className={getSeverityColor(selectedError.severity)}>
                      {selectedError.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Fecha</div>
                    <div className="text-sm">{formatDate(selectedError.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Estado</div>
                    <Badge className={selectedError.resolved ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {selectedError.resolved ? "RESUELTO" : "PENDIENTE"}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Mensaje de Error</div>
                  <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                    {selectedError.message}
                  </div>
                </div>

                {selectedError.aiAnalysis && (
                  <div>
                    <div className="text-sm font-medium mb-2">Análisis de IA</div>
                    <div className="bg-blue-50 p-3 rounded text-sm whitespace-pre-wrap">
                      {selectedError.aiAnalysis}
                    </div>
                  </div>
                )}

                {selectedError.suggestedFix && (
                  <div>
                    <div className="text-sm font-medium mb-2">Solución Sugerida</div>
                    <div className="bg-green-50 p-3 rounded text-sm whitespace-pre-wrap">
                      {selectedError.suggestedFix}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-sm font-medium mb-2">Stack Trace</div>
                  <div className="bg-gray-100 p-3 rounded text-xs font-mono max-h-40 overflow-auto">
                    {selectedError.stack}
                  </div>
                </div>

                {selectedError.context && (
                  <div>
                    <div className="text-sm font-medium mb-2">Contexto</div>
                    <div className="bg-gray-100 p-3 rounded text-xs font-mono max-h-40 overflow-auto">
                      {JSON.stringify(selectedError.context, null, 2)}
                    </div>
                  </div>
                )}

                {!selectedError.resolved && (
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setSelectedError(null)}>
                      Cerrar
                    </Button>
                    <Button
                      onClick={() => resolveErrorMutation.mutate(selectedError.errorId)}
                      disabled={resolveErrorMutation.isPending}
                    >
                      Marcar como Resuelto
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </Tabs>
      </div>
    </div>
  );
};

export default ErrorManagement;