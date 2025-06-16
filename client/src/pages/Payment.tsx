import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard, Building, Phone, Mail, Copy, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

const paymentSchema = z.object({
  fullName: z.string().min(2, "El nombre completo es requerido"),
  document: z.string().min(8, "Cédula o RNC es requerido"),
  documentType: z.enum(["cedula", "rnc"]),
  companyName: z.string().min(2, "El nombre de la empresa es requerido"),
  plan: z.enum(["starter", "professional", "enterprise"]),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Teléfono es requerido")
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const plans = {
  starter: { name: "Plan Starter", price: "RD$ 2,500", features: ["Hasta 100 facturas/mes", "1 usuario", "Soporte básico"] },
  professional: { name: "Plan Professional", price: "RD$ 4,500", features: ["Hasta 500 facturas/mes", "3 usuarios", "Soporte prioritario", "Reportes avanzados"] },
  enterprise: { name: "Plan Enterprise", price: "RD$ 8,500", features: ["Facturas ilimitadas", "Usuarios ilimitados", "Soporte 24/7", "API personalizada"] }
};

const bankAccounts = [
  {
    bank: "Banco Popular Dominicano",
    accountType: "Cuenta Corriente",
    accountNumber: "764-123456-7",
    accountHolder: "Four One Solutions SRL"
  },
  {
    bank: "Banco BHD León",
    accountType: "Cuenta Corriente", 
    accountNumber: "20-456789-1",
    accountHolder: "Four One Solutions SRL"
  }
];

export default function Payment() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [rncValidation, setRncValidation] = useState<{ isValid?: boolean; companyName?: string; error?: string } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      fullName: "",
      document: "",
      documentType: "cedula",
      companyName: "",
      plan: "starter",
      email: user?.email || "",
      phone: ""
    }
  });

  const copyToClipboard = async (text: string, accountInfo: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAccount(accountInfo);
      toast({
        title: "Copiado",
        description: "Número de cuenta copiado al portapapeles"
      });
      setTimeout(() => setCopiedAccount(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "destructive"
      });
    }
  };

  const validateRNC = async (rnc: string) => {
    if (rnc.length < 9) {
      setRncValidation(null);
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/validate-rnc", { rnc });
      const data = await response.json();
      
      if (data.isValid) {
        setRncValidation({
          isValid: true,
          companyName: data.companyName
        });
        if (data.companyName) {
          form.setValue("companyName", data.companyName);
        }
      } else {
        setRncValidation({
          isValid: false,
          error: "RNC no encontrado en el registro de la DGII"
        });
      }
    } catch (error) {
      setRncValidation({
        isValid: false,
        error: "Error al validar RNC"
      });
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    if (data.documentType === "rnc" && !rncValidation?.isValid) {
      toast({
        title: "Error",
        description: "Debe validar el RNC antes de continuar",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/submit-payment", {
        ...data,
        userId: user?.id
      });

      setShowSuccess(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al enviar los datos de pago",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                ¡Gracias por preferirnos!
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Tus datos de acceso serán enviados al correo que ingresaste una vez que se confirme tu pago.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Nuestro equipo revisará tu pago y te contactará pronto.
              </p>
              <Button 
                onClick={() => setLocation("/")}
                className="w-full"
              >
                Volver al inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Información de Pago
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Completa la información y realiza tu pago para activar tu cuenta
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Formulario de Datos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Datos de Pago
              </CardTitle>
              <CardDescription>
                Ingresa la información requerida para procesar tu suscripción
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    {...form.register("fullName")}
                    placeholder="Tu nombre completo"
                  />
                  {form.formState.errors.fullName && (
                    <p className="text-sm text-red-500">{form.formState.errors.fullName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="documentType">Tipo de Documento</Label>
                    <Select onValueChange={(value) => form.setValue("documentType", value as "cedula" | "rnc")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cedula">Cédula</SelectItem>
                        <SelectItem value="rnc">RNC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">Número de Documento</Label>
                    <Input
                      id="document"
                      {...form.register("document")}
                      placeholder="123-4567890-1"
                      onChange={(e) => {
                        form.register("document").onChange(e);
                        if (form.getValues("documentType") === "rnc") {
                          validateRNC(e.target.value);
                        }
                      }}
                    />
                  </div>
                </div>

                {form.watch("documentType") === "rnc" && rncValidation && (
                  <div className={`p-3 rounded-lg border ${rncValidation.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {rncValidation.isValid ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">RNC válido: {rncValidation.companyName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">{rncValidation.error}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la Empresa</Label>
                  <Input
                    id="companyName"
                    {...form.register("companyName")}
                    placeholder="Nombre de tu empresa"
                  />
                  {form.formState.errors.companyName && (
                    <p className="text-sm text-red-500">{form.formState.errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register("email")}
                    placeholder="tu@email.com"
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    placeholder="(809) 123-4567"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-500">{form.formState.errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan">Plan Seleccionado</Label>
                  <Select onValueChange={(value) => form.setValue("plan", value as "starter" | "professional" | "enterprise")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar plan" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(plans).map(([key, plan]) => (
                        <SelectItem key={key} value={key}>
                          {plan.name} - {plan.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Enviando..." : "Enviar Datos de Pago"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Información de Cuentas Bancarias */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Cuentas Bancarias
                </CardTitle>
                <CardDescription>
                  Realiza tu pago a cualquiera de estas cuentas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bankAccounts.map((account, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {account.bank}
                      </h4>
                      <Badge variant="secondary">{account.accountType}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {account.accountHolder}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-lg font-semibold">
                        {account.accountNumber}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(account.accountNumber, account.bank)}
                      >
                        {copiedAccount === account.bank ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Plan Seleccionado */}
            {form.watch("plan") && (
              <Card>
                <CardHeader>
                  <CardTitle>Plan Seleccionado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">{plans[form.watch("plan") as keyof typeof plans].name}</h4>
                      <span className="text-xl font-bold text-blue-600">
                        {plans[form.watch("plan") as keyof typeof plans].price}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {plans[form.watch("plan") as keyof typeof plans].features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contacto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Soporte:</strong> soporte@fourone.com.do
                  </p>
                  <p>
                    <strong>Información:</strong> info@fourone.com.do
                  </p>
                  <p>
                    <strong>Teléfono:</strong> (809) 555-0123
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}