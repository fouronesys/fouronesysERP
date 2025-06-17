import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  User, 
  Mail, 
  Calendar, 
  Building2, 
  Crown, 
  Edit3, 
  Save, 
  X,
  Camera
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType, Company } from "@shared/schema";

export default function Profile() {
  const { user } = useAuth();
  const { currentPlan, planConfig, daysUntilExpiry } = useSubscription();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
  });

  const { data: company } = useQuery<Company>({
    queryKey: ["/api/companies/current"],
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      await apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Perfil actualizado",
        description: "Tu información ha sido actualizada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el perfil.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    });
    setIsEditing(false);
  };

  const getInitials = () => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  const getPlanBadgeColor = () => {
    switch (currentPlan) {
      case "annual":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300";
      case "monthly":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
      case "trial":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <Header title="Mi Perfil" subtitle="Gestiona tu información personal y configuración" />
      
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 pb-32">
        {/* Profile Overview */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage src={user?.profileImageUrl} />
                  <AvatarFallback className="text-lg sm:text-xl bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full p-0"
                >
                  <Camera className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </h2>
                  <Badge className={getPlanBadgeColor()}>
                    {currentPlan === "trial" ? "Prueba" : 
                     currentPlan === "monthly" ? "Mensual" : "Anual"}
                  </Badge>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                  {user?.email}
                </p>
                {company && (
                  <p className="text-gray-500 dark:text-gray-500 text-sm flex items-center gap-1 mt-1">
                    <Building2 className="h-3 w-3" />
                    {company.name}
                  </p>
                )}
              </div>
              
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant={isEditing ? "outline" : "default"}
                size="sm"
                className="self-start"
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Ingresa tu nombre"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Ingresa tu apellido"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Ingresa tu email"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Nombre completo</p>
                      <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium">{user?.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Miembro desde</p>
                      <p className="font-medium">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-DO') : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Información de Suscripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-semibold">{planConfig?.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Plan actual</p>
                </div>
                <Badge className={getPlanBadgeColor()}>
                  {currentPlan === "trial" ? "Prueba" : 
                   currentPlan === "monthly" ? "Mensual" : "Anual"}
                </Badge>
              </div>

              {daysUntilExpiry > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Tu suscripción expira en {daysUntilExpiry} días
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Funcionalidades incluidas:
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {planConfig?.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm">
                      <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                      <span className="capitalize">{feature.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />
              
              <div className="space-y-2">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Actualizar Plan
                </Button>
                <Button variant="outline" className="w-full">
                  Ver Historial de Facturación
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Information */}
        {company && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Información de la Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Nombre</p>
                  <p className="font-medium">{company.name}</p>
                </div>
                
                {company.businessName && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Razón Social</p>
                    <p className="font-medium">{company.businessName}</p>
                  </div>
                )}
                
                {company.rnc && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">RNC</p>
                    <p className="font-medium">{company.rnc}</p>
                  </div>
                )}
                
                {company.industry && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Industria</p>
                    <p className="font-medium">{company.industry}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Estado</p>
                  <Badge variant={company.isActive ? "default" : "destructive"}>
                    {company.isActive ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}