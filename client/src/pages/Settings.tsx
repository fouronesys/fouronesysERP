import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Settings as SettingsIcon, 
  Palette, 
  Globe, 
  Lock, 
  Database,
  Monitor,
  Moon,
  Sun,
  Smartphone,
  Save,
  RefreshCw,
  Download,
  Upload,
  Shield,
  Key,
  Eye,
  EyeOff
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useThemeContext } from "@/components/ThemeProvider";

interface SystemSettings {
  theme: "light" | "dark" | "system";
  language: "es" | "en";
  currency: "DOP" | "USD";
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  timeFormat: "12h" | "24h";
  autoSave: boolean;
  autoBackup: boolean;
  showTooltips: boolean;
  compactMode: boolean;
  highContrast: boolean;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  loginNotifications: boolean;
  allowRemoteAccess: boolean;
}

interface POSSettings {
  printerWidth: "58mm" | "80mm";
  showNCF: boolean;
  autoOpenCashDrawer: boolean;
  requireCustomer: boolean;
  defaultPaymentMethod: "cash" | "card" | "transfer";
  receiptFooter: string;
  showCompanyLogo: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { theme, setTheme } = useThemeContext();
  
  const [activeTab, setActiveTab] = useState<"system" | "security" | "pos" | "backup">("system");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    theme: "light",
    language: "es",
    currency: "DOP",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    autoSave: true,
    autoBackup: true,
    showTooltips: true,
    compactMode: false,
    highContrast: false,
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginNotifications: true,
    allowRemoteAccess: true,
  });

  const [posSettings, setPosSettings] = useState<POSSettings>({
    printerWidth: "80mm",
    showNCF: true,
    autoOpenCashDrawer: false,
    requireCustomer: false,
    defaultPaymentMethod: "cash",
    receiptFooter: "¡Gracias por su compra!",
    showCompanyLogo: true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const updateSystemMutation = useMutation({
    mutationFn: async (settings: SystemSettings) => {
      return await apiRequest("/api/settings/system", {
        method: "PUT",
        body: settings
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuración actualizada",
        description: "Las preferencias del sistema han sido guardadas.",
      });
    },
  });

  const updateSecurityMutation = useMutation({
    mutationFn: async (settings: SecuritySettings) => {
      return await apiRequest("/api/settings/security", {
        method: "PUT",
        body: settings
      });
    },
    onSuccess: () => {
      toast({
        title: "Configuración de seguridad actualizada",
        description: "Los ajustes de seguridad han sido guardados.",
      });
    },
  });

  const updatePOSMutation = useMutation({
    mutationFn: async (settings: POSSettings) => {
      await apiRequest("PUT", "/api/pos/print-settings", settings);
    },
    onSuccess: () => {
      toast({
        title: "Configuración del POS actualizada",
        description: "Los ajustes del punto de venta han sido guardados.",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      await apiRequest("PUT", "/api/auth/change-password", data);
    },
    onSuccess: () => {
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente.",
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo cambiar la contraseña. Verifica tu contraseña actual.",
        variant: "destructive",
      });
    },
  });

  const handleSystemSettingChange = (key: keyof SystemSettings, value: any) => {
    const newSettings = { ...systemSettings, [key]: value };
    setSystemSettings(newSettings);
    
    if (key === "theme") {
      setTheme(value);
    }
    
    updateSystemMutation.mutate(newSettings);
  };

  const handleSecuritySettingChange = (key: keyof SecuritySettings, value: any) => {
    const newSettings = { ...securitySettings, [key]: value };
    setSecuritySettings(newSettings);
    updateSecurityMutation.mutate(newSettings);
  };

  const handlePOSSettingChange = (key: keyof POSSettings, value: any) => {
    const newSettings = { ...posSettings, [key]: value };
    setPosSettings(newSettings);
    updatePOSMutation.mutate(newSettings);
  };

  const handlePasswordChange = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden.",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    changePasswordMutation.mutate(passwordForm);
  };

  const exportSettings = () => {
    const allSettings = {
      system: systemSettings,
      security: { ...securitySettings, twoFactorEnabled: false }, // Don't export 2FA
      pos: posSettings,
      exportDate: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(allSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `four-one-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Configuración exportada",
      description: "El archivo de configuración ha sido descargado.",
    });
  };

  const tabs = [
    { id: "system", label: "Sistema", icon: SettingsIcon },
    { id: "security", label: "Seguridad", icon: Shield },
    { id: "pos", label: "Punto de Venta", icon: Monitor },
    { id: "backup", label: "Respaldo", icon: Database },
  ];

  return (
    <div className="h-screen flex flex-col">
      <Header title="Configuración" subtitle="Personaliza tu experiencia y ajustes del sistema" />
      
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 pb-32">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center gap-2 flex-1 sm:flex-initial"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Button>
            );
          })}
        </div>

        {activeTab === "system" && (
          <div className="space-y-6">
            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Apariencia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Tema</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Selecciona el tema de la interfaz
                    </p>
                  </div>
                  <Select
                    value={systemSettings.theme}
                    onValueChange={(value) => handleSystemSettingChange("theme", value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-2">
                          <Sun className="h-4 w-4" />
                          Claro
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-2">
                          <Moon className="h-4 w-4" />
                          Oscuro
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Sistema
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Modo Compacto</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Reduce el espaciado entre elementos
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.compactMode}
                    onCheckedChange={(checked) => handleSystemSettingChange("compactMode", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alto Contraste</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Mejora la visibilidad con mayor contraste
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.highContrast}
                    onCheckedChange={(checked) => handleSystemSettingChange("highContrast", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Regional Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Configuración Regional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Idioma</Label>
                    <Select
                      value={systemSettings.language}
                      onValueChange={(value) => handleSystemSettingChange("language", value)}
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

                  <div>
                    <Label>Moneda</Label>
                    <Select
                      value={systemSettings.currency}
                      onValueChange={(value) => handleSystemSettingChange("currency", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOP">Peso Dominicano (DOP)</SelectItem>
                        <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Formato de Fecha</Label>
                    <Select
                      value={systemSettings.dateFormat}
                      onValueChange={(value) => handleSystemSettingChange("dateFormat", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Formato de Hora</Label>
                    <Select
                      value={systemSettings.timeFormat}
                      onValueChange={(value) => handleSystemSettingChange("timeFormat", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="12h">12 horas (AM/PM)</SelectItem>
                        <SelectItem value="24h">24 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* General Preferences */}
            <Card>
              <CardHeader>
                <CardTitle>Preferencias Generales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Guardado Automático</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Guarda automáticamente los cambios
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.autoSave}
                    onCheckedChange={(checked) => handleSystemSettingChange("autoSave", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Mostrar Consejos</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Muestra consejos útiles en la interfaz
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.showTooltips}
                    onCheckedChange={(checked) => handleSystemSettingChange("showTooltips", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-6">
            {/* Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Cambiar Contraseña
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña Actual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Ingresa tu contraseña actual"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Ingresa tu nueva contraseña"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirma tu nueva contraseña"
                  />
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={changePasswordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="w-full"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Cambiar Contraseña
                </Button>
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Configuración de Seguridad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Autenticación de Dos Factores</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Añade una capa extra de seguridad a tu cuenta
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorEnabled}
                    onCheckedChange={(checked) => handleSecuritySettingChange("twoFactorEnabled", checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificaciones de Inicio de Sesión</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Recibe alertas cuando alguien acceda a tu cuenta
                    </p>
                  </div>
                  <Switch
                    checked={securitySettings.loginNotifications}
                    onCheckedChange={(checked) => handleSecuritySettingChange("loginNotifications", checked)}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Tiempo de Sesión (minutos)</Label>
                    <Select
                      value={securitySettings.sessionTimeout.toString()}
                      onValueChange={(value) => handleSecuritySettingChange("sessionTimeout", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutos</SelectItem>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="240">4 horas</SelectItem>
                        <SelectItem value="480">8 horas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Expiración de Contraseña (días)</Label>
                    <Select
                      value={securitySettings.passwordExpiry.toString()}
                      onValueChange={(value) => handleSecuritySettingChange("passwordExpiry", parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 días</SelectItem>
                        <SelectItem value="60">60 días</SelectItem>
                        <SelectItem value="90">90 días</SelectItem>
                        <SelectItem value="180">180 días</SelectItem>
                        <SelectItem value="365">1 año</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "pos" && (
          <div className="space-y-6">
            {/* Printer Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Impresión</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Ancho de Impresora</Label>
                    <Select
                      value={posSettings.printerWidth}
                      onValueChange={(value) => handlePOSSettingChange("printerWidth", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="58mm">58mm</SelectItem>
                        <SelectItem value="80mm">80mm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Método de Pago por Defecto</Label>
                    <Select
                      value={posSettings.defaultPaymentMethod}
                      onValueChange={(value) => handlePOSSettingChange("defaultPaymentMethod", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receipt-footer">Pie de Página del Recibo</Label>
                  <Input
                    id="receipt-footer"
                    value={posSettings.receiptFooter}
                    onChange={(e) => handlePOSSettingChange("receiptFooter", e.target.value)}
                    placeholder="Mensaje que aparece al final del recibo"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar NCF</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Incluir Número de Comprobante Fiscal en los recibos
                      </p>
                    </div>
                    <Switch
                      checked={posSettings.showNCF}
                      onCheckedChange={(checked) => handlePOSSettingChange("showNCF", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar Logo de la Empresa</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Incluir el logo en los recibos impresos
                      </p>
                    </div>
                    <Switch
                      checked={posSettings.showCompanyLogo}
                      onCheckedChange={(checked) => handlePOSSettingChange("showCompanyLogo", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Abrir Cajón Automáticamente</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Abrir el cajón de dinero al completar una venta
                      </p>
                    </div>
                    <Switch
                      checked={posSettings.autoOpenCashDrawer}
                      onCheckedChange={(checked) => handlePOSSettingChange("autoOpenCashDrawer", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Requerir Cliente</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Obligar a seleccionar un cliente para cada venta
                      </p>
                    </div>
                    <Switch
                      checked={posSettings.requireCustomer}
                      onCheckedChange={(checked) => handlePOSSettingChange("requireCustomer", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "backup" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Respaldo y Restauración
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Respaldo Automático</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Crear respaldos automáticos de la configuración
                    </p>
                  </div>
                  <Switch
                    checked={systemSettings.autoBackup}
                    onCheckedChange={(checked) => handleSystemSettingChange("autoBackup", checked)}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Button onClick={exportSettings} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Exportar Configuración
                  </Button>

                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Importar Configuración
                  </Button>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Nota:</strong> La importación de configuración sobrescribirá tus ajustes actuales. 
                    Se recomienda exportar la configuración actual antes de importar.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}