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
import { Building2, ArrowLeft, CheckCircle } from "lucide-react";
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

export default function Register() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      subscriptionPlan: "monthly",
    },
  });

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
                  <div className="space-y-2">
                    <Label htmlFor="rnc">RNC</Label>
                    <Input
                      id="rnc"
                      placeholder="131-12345-6"
                      {...form.register("rnc")}
                    />
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
                        RD$ 25,000 <span className="text-sm font-normal">instalación</span>
                      </div>
                      <div className="text-xl font-bold mb-4">
                        RD$ 2,500 <span className="text-sm font-normal">/mes</span>
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
                          Ahorra RD$ 6,000
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
                        <span className="line-through">RD$ 30,000/año</span>
                        <span className="text-green-600 font-medium ml-2">¡Ahorra RD$ 6,000!</span>
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