import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, CheckCircle, Search, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import logoImage from "@assets/Four One Solutions Logo_20250130_143401_0000.png";

const registrationSchema = z.object({
  companyName: z.string().min(1, "Nombre de empresa es requerido"),
  businessName: z.string().optional(),
  rnc: z.string().optional(),
  address: z.string().min(1, "Dirección es requerida"),
  phone: z.string().min(1, "Teléfono es requerido"),
  email: z.string().email("Email válido es requerido"),
  website: z.string().optional(),
  industry: z.string().min(1, "Industria es requerida"),
  subscriptionPlan: z.enum(["monthly", "annual"]),
  contactPersonName: z.string().min(1, "Nombre del contacto es requerido"),
  contactPersonPhone: z.string().min(1, "Teléfono del contacto es requerido"),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RNCValidationResult {
  valid: boolean;
  message: string;
  data?: {
    rnc: string;
    name?: string;
    razonSocial?: string;
    categoria?: string;
    estado?: string;
  };
}

interface RNCSuggestion {
  rnc: string;
  name: string;
  razonSocial?: string;
  categoria?: string;
  estado?: string;
}

export default function Register() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifyingRNC, setIsVerifyingRNC] = useState(false);
  const [rncValidationResult, setRncValidationResult] = useState<RNCValidationResult | null>(null);
  const [rncSuggestions, setRncSuggestions] = useState<RNCSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      subscriptionPlan: "monthly",
    },
  });

  const handleRNCVerification = async (rncValue: string) => {
    if (!rncValue || rncValue.length < 9) return;
    
    setIsVerifyingRNC(true);
    setRncValidationResult(null);
    
    try {
      const response = await apiRequest(`/api/dgii/rnc-lookup?rnc=${encodeURIComponent(rncValue)}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setRncValidationResult({
          valid: true,
          message: "RNC válido y encontrado en DGII",
          data: result.data
        });
        
        // Auto-llenar campos si están vacíos
        if (result.data.name && !form.getValues("companyName")) {
          form.setValue("companyName", result.data.name);
        }
        if (result.data.razonSocial && !form.getValues("businessName")) {
          form.setValue("businessName", result.data.razonSocial);
        }
        
        toast({
          title: "RNC Verificado",
          description: `Empresa: ${result.data.name || result.data.razonSocial}`,
        });
      } else {
        setRncValidationResult({
          valid: false,
          message: result.message || "RNC no encontrado en DGII"
        });
      }
    } catch (error) {
      console.error('Error verifying RNC:', error);
      setRncValidationResult({
        valid: false,
        message: "Error al verificar RNC. Intente nuevamente."
      });
    } finally {
      setIsVerifyingRNC(false);
    }
  };

  const searchRNCCompanies = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setRncSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await apiRequest(`/api/dgii/search-companies?query=${encodeURIComponent(searchTerm)}`);
      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        setRncSuggestions(result.data.slice(0, 5)); // Mostrar máximo 5 sugerencias
        setShowSuggestions(true);
      } else {
        setRncSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error searching companies:', error);
      setRncSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectRNCFromSuggestion = (suggestion: RNCSuggestion) => {
    form.setValue("rnc", suggestion.rnc);
    form.setValue("companyName", suggestion.name);
    if (suggestion.razonSocial) {
      form.setValue("businessName", suggestion.razonSocial);
    }
    
    setRncValidationResult({
      valid: true,
      message: "RNC seleccionado de la lista DGII",
      data: {
        rnc: suggestion.rnc,
        name: suggestion.name,
        razonSocial: suggestion.razonSocial,
        categoria: suggestion.categoria,
        estado: suggestion.estado
      }
    });
    
    setShowSuggestions(false);
    setRncSuggestions([]);
    
    toast({
      title: "Empresa Seleccionada",
      description: `${suggestion.name} - RNC: ${suggestion.rnc}`,
    });
  };

  const onSubmit = async (data: RegistrationFormData) => {
    setIsSubmitting(true);
    try {
      // En un entorno real, aquí se enviaría la información
      // Para el demo, simulamos el registro
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsSuccess(true);
    } catch (error) {
      console.error("Error en registro:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ¡Registro Exitoso!
            </h2>
            <p className="text-gray-600 mb-6">
              Hemos recibido tu solicitud de registro. Nuestro equipo se pondrá en contacto contigo en las próximas 24 horas para completar la configuración de tu cuenta.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Recibirás un email con los próximos pasos y la información de tu cuenta.
            </p>
            <Button 
              onClick={() => window.location.href = "/"} 
              className="w-full"
            >
              Volver al Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="outline"
            onClick={() => window.location.href = "/"}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Button>
          
          <div className="flex items-center justify-center mb-4">
            <img 
              src={logoImage} 
              alt="Four One Solutions" 
              className="w-16 h-16 object-contain mr-4"
            />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Registro de Empresa
              </h1>
              <p className="text-gray-600">
                Únete a Four One Solutions y transforma tu gestión empresarial
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  Información de la Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nombre Comercial *</Label>
                    <Input
                      id="companyName"
                      placeholder="Mi Empresa SRL"
                      {...form.register("companyName")}
                    />
                    {form.formState.errors.companyName && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessName">Razón Social</Label>
                    <Input
                      id="businessName"
                      placeholder="Mi Empresa Sociedad de Responsabilidad Limitada"
                      {...form.register("businessName")}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="rnc" className="flex items-center gap-2">
                      RNC (Registro Nacional del Contribuyente)
                      {isVerifyingRNC && <Search className="h-3 w-3 animate-spin" />}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="rnc"
                        placeholder="131-12345-6 o buscar por nombre"
                        {...form.register("rnc")}
                        onChange={(e) => {
                          form.setValue("rnc", e.target.value);
                          // Buscar empresas si se está escribiendo texto
                          if (isNaN(Number(e.target.value.replace(/\D/g, '')))) {
                            searchRNCCompanies(e.target.value);
                          } else {
                            setShowSuggestions(false);
                          }
                          // Limpiar validación anterior
                          if (rncValidationResult) {
                            setRncValidationResult(null);
                          }
                        }}
                        onBlur={(e) => {
                          const rncValue = e.target.value?.replace(/\D/g, '') || '';
                          if (rncValue && rncValue.length >= 9) {
                            handleRNCVerification(rncValue);
                          }
                          // Ocultar sugerencias después de un delay
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        className={`${
                          rncValidationResult?.valid === true 
                            ? "border-green-500 bg-green-50 dark:bg-green-950" 
                            : rncValidationResult?.valid === false 
                            ? "border-red-500 bg-red-50 dark:bg-red-950" 
                            : ""
                        } flex-1`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isVerifyingRNC || !form.watch("rnc")}
                        onClick={() => {
                          const rncValue = form.watch("rnc")?.replace(/\D/g, '') || '';
                          if (rncValue) {
                            handleRNCVerification(rncValue);
                          }
                        }}
                      >
                        {isVerifyingRNC ? (
                          <Search className="h-4 w-4 animate-spin" />
                        ) : (
                          "Verificar"
                        )}
                      </Button>
                    </div>
                    
                    {/* Mostrar estado de validación */}
                    {rncValidationResult && (
                      <div className={`flex items-center gap-2 text-sm ${
                        rncValidationResult.valid ? "text-green-600" : "text-red-600"
                      }`}>
                        {rncValidationResult.valid ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <span>{rncValidationResult.message}</span>
                        {rncValidationResult.valid && rncValidationResult.data && (
                          <Badge variant="secondary" className="ml-2">
                            {rncValidationResult.data.estado || "Activo"}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Mostrar sugerencias de empresas */}
                    {showSuggestions && rncSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        <div className="p-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          Selecciona una empresa de la lista DGII:
                        </div>
                        {rncSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            onClick={() => selectRNCFromSuggestion(suggestion)}
                          >
                            <div className="font-medium text-sm">{suggestion.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              RNC: {suggestion.rnc}
                              {suggestion.categoria && ` • ${suggestion.categoria}`}
                              {suggestion.estado && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {suggestion.estado}
                                </Badge>
                              )}
                            </div>
                            {suggestion.razonSocial && suggestion.razonSocial !== suggestion.name && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {suggestion.razonSocial}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Industria/Sector *</Label>
                    <Input
                      id="industry"
                      placeholder="Retail, Manufactura, Servicios, etc."
                      {...form.register("industry")}
                    />
                    {form.formState.errors.industry && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.industry.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Dirección Fiscal *</Label>
                  <Textarea
                    id="address"
                    placeholder="Dirección completa de la empresa"
                    {...form.register("address")}
                  />
                  {form.formState.errors.address && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.address.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      placeholder="(809) 123-4567"
                      {...form.register("phone")}
                    />
                    {form.formState.errors.phone && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Empresarial *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="contacto@empresa.com"
                      {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Sitio Web</Label>
                    <Input
                      id="website"
                      placeholder="www.empresa.com"
                      {...form.register("website")}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" onClick={() => setStep(2)}>
                    Siguiente: Contacto y Plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Información de Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactPersonName">Nombre del Contacto *</Label>
                      <Input
                        id="contactPersonName"
                        placeholder="Juan Pérez"
                        {...form.register("contactPersonName")}
                      />
                      {form.formState.errors.contactPersonName && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.contactPersonName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPersonPhone">Teléfono del Contacto *</Label>
                      <Input
                        id="contactPersonPhone"
                        placeholder="(809) 987-6543"
                        {...form.register("contactPersonPhone")}
                      />
                      {form.formState.errors.contactPersonPhone && (
                        <p className="text-sm text-red-500">
                          {form.formState.errors.contactPersonPhone.message}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Selección de Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        form.watch("subscriptionPlan") === "monthly" 
                          ? "border-black bg-gray-50" 
                          : "border-gray-200"
                      }`}
                      onClick={() => form.setValue("subscriptionPlan", "monthly")}
                    >
                      <h3 className="text-lg font-bold mb-2">Plan Mensual</h3>
                      <div className="text-2xl font-bold text-black mb-2">
                        RD$ 5,000 <span className="text-sm font-normal">instalación</span>
                      </div>
                      <div className="text-xl font-bold mb-4">
                        RD$ 3,500 <span className="text-sm font-normal">/mes</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Flexibilidad mes a mes, perfecto para empresas que prefieren pagos mensuales.
                      </p>
                    </div>

                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors relative ${
                        form.watch("subscriptionPlan") === "annual" 
                          ? "border-green-500 bg-green-50" 
                          : "border-gray-200"
                      }`}
                      onClick={() => form.setValue("subscriptionPlan", "annual")}
                    >
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                          Ahorra RD$ 18,000
                        </div>
                      </div>
                      <h3 className="text-lg font-bold mb-2">Plan Anual</h3>
                      <div className="text-2xl font-bold text-black mb-2">
                        RD$ 35,000 <span className="text-sm font-normal">instalación</span>
                      </div>
                      <div className="text-xl font-bold mb-2">
                        RD$ 24,000 <span className="text-sm font-normal">/año</span>
                      </div>
                      <div className="text-sm text-gray-500 mb-4">
                        <span className="line-through">RD$ 42,000/año</span>
                        <span className="text-green-600 font-medium ml-2">¡Ahorra RD$ 18,000!</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        El mejor valor, equivale a 10 meses por el precio de 12.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Anterior
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Completar Registro"}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}