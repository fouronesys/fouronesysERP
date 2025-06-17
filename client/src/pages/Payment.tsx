import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, CreditCard, Building, Phone, Mail, Copy, Check, AlertCircle, LogOut, Banknote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

// PayPal imports
import PayPalButton from '@/components/PayPalButton';

const paymentSchema = z.object({
  fullName: z.string().min(2, "El nombre completo es requerido"),
  document: z.string().min(8, "Cédula o RNC es requerido"),
  documentType: z.enum(["cedula", "rnc"]),
  companyName: z.string().min(2, "El nombre de la empresa es requerido"),
  plan: z.enum(["monthly", "annual"]),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Teléfono es requerido")
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const plans = {
  monthly: { name: "Plan Mensual", price: "RD$ 3,500/mes + RD$ 5,000 instalación", features: ["Sistema completo", "Soporte técnico", "Actualizaciones incluidas", "Capacitación inicial"] },
  annual: { name: "Plan Anual", price: "RD$ 35,000 instalación + RD$ 24,000/año", features: ["Sistema completo", "Soporte prioritario", "Actualizaciones incluidas", "Capacitación completa", "Descuento significativo"] }
};

const bankAccounts = [
  {
    bank: "Banco Popular Dominicano",
    accountType: "Cuenta de Ahorros",
    accountNumber: "844480111",
    accountHolder: "Jesús María García Cruz",
    cedula: "40215343837"
  },
  {
    bank: "Banco Popular Dominicano",
    accountType: "Cuenta Corriente",
    accountNumber: "838073138",
    accountHolder: "Jesús María García Cruz",
    cedula: "40215343837"
  },
  {
    bank: "Banreservas",
    accountType: "Cuenta Corriente",
    accountNumber: "4231803209",
    accountHolder: "Jesús María García Cruz",
    cedula: "40215343837"
  },
  {
    bank: "Banco BHD León",
    accountType: "Cuenta Corriente",
    accountNumber: "34860440011",
    accountHolder: "Jesús María García Cruz",
    cedula: "40215343837"
  },
  {
    bank: "Asociación Popular de Ahorros y Préstamos (APAP)",
    accountType: "Cuenta de Ahorros",
    accountNumber: "1034116428",
    accountHolder: "Jesús Cruz",
    cedula: "40215343837",
    note: "Desde APAP: Cuenta 1034116428 | Desde otros bancos: usar cédula y nombre"
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

  const handleLogout = async () => {
    try {
      // Call logout endpoint
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      // Clear React Query cache completely
      queryClient.clear();
      queryClient.invalidateQueries();
      queryClient.removeQueries();
      
      // Clear all browser storage
      window.localStorage.clear();
      window.sessionStorage.clear();
      
      // Clear IndexedDB if exists
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                const deleteReq = indexedDB.deleteDatabase(db.name);
                return new Promise<boolean>((resolve) => {
                  deleteReq.onsuccess = () => resolve(true);
                  deleteReq.onerror = () => resolve(false);
                });
              }
              return Promise.resolve(true);
            })
          );
        } catch (idbError) {
          console.log('IndexedDB cleanup skipped');
        }
      }
      
      // Clear service worker cache if available
      if ('serviceWorker' in navigator && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
        } catch (cacheError) {
          console.log('Cache cleanup skipped');
        }
      }
      
      // Force hard reload and redirect
      window.location.replace("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      // Force redirect even if logout fails
      window.location.replace("/auth");
    }
  };

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      fullName: "",
      document: "",
      documentType: "cedula",
      companyName: "",
      plan: "monthly",
      email: user?.email || "",
      phone: "8293519324"
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
      const response = await fetch(`/api/customers/verify-rnc/${encodeURIComponent(rnc)}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.isValid) {
        setRncValidation({
          isValid: true,
          companyName: data.razonSocial || data.companyName
        });
        if (data.razonSocial || data.companyName) {
          form.setValue("companyName", data.razonSocial || data.companyName);
        }
      } else {
        setRncValidation({
          isValid: false,
          error: data.message || "RNC no encontrado en el registro de la DGII"
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
                onClick={() => {
                  console.log("Button clicked, redirecting to landing page");
                  window.location.href = "/";
                }}
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
          
          {/* User info and logout option */}
          {user && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {(user as any)?.firstName?.[0] || (user as any)?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {(user as any)?.firstName && (user as any)?.lastName 
                        ? `${(user as any).firstName} ${(user as any).lastName}`
                        : (user as any)?.email || 'Usuario'
                      }
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {(user as any)?.email}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  Esta no es mi cuenta
                </Button>
              </div>
            </div>
          )}
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
                  <Select onValueChange={(value) => form.setValue("plan", value as "monthly" | "annual")}>
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

          {/* Opciones de Pago */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Método de Pago</CardTitle>
                <CardDescription>
                  Elige cómo deseas realizar tu pago
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="card" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="card" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Tarjeta de Crédito/Débito
                    </TabsTrigger>
                    <TabsTrigger value="transfer" className="flex items-center gap-2">
                      <Banknote className="h-4 w-4" />
                      Transferencia Bancaria
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="card" className="mt-6">
                    <PayPalPaymentForm 
                      planId={form.watch("plan")} 
                      amount={form.watch("plan") === "annual" ? 24000 : 3500}
                      formData={form.getValues()}
                    />
                  </TabsContent>
                  
                  <TabsContent value="transfer" className="mt-6">
                    <div className="space-y-4">
                      {bankAccounts.map((account, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {account.bank}
                            </h4>
                            <Badge variant="secondary">{account.accountType}</Badge>
                          </div>
                          
                          <div className="space-y-2 mb-3">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              <strong>Titular:</strong> {account.accountHolder}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              <strong>Cédula:</strong> {account.cedula}
                            </p>
                            {account.note && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                <strong>Nota:</strong> {account.note}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Número de Cuenta</p>
                              <span className="font-mono text-lg font-semibold">
                                {account.accountNumber}
                              </span>
                            </div>
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
                    </div>
                  </TabsContent>
                </Tabs>
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
                    <strong>Teléfono:</strong> (829) 351-9324
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

// PayPal Payment Form Component
function PayPalPaymentForm({ 
  planId, 
  amount, 
  formData 
}: { 
  planId: string; 
  amount: number; 
  formData: PaymentFormData 
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Custom PayPal component with enhanced integration
  const PayPalCustomButton = () => {
    const createOrder = async () => {
      const orderPayload = {
        amount: amount.toString(),
        currency: "USD", // PayPal funciona mejor con USD en RD
        intent: "CAPTURE",
      };
      
      try {
        const response = await fetch("/paypal/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });
        const output = await response.json();
        return { orderId: output.id };
      } catch (error) {
        setPaymentError("Error creando la orden de pago");
        throw error;
      }
    };

    const captureOrder = async (orderId: string) => {
      try {
        const response = await fetch(`/paypal/order/${orderId}/capture`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        return data;
      } catch (error) {
        setPaymentError("Error procesando el pago");
        throw error;
      }
    };

    const onApprove = async (data: any) => {
      setIsProcessing(true);
      try {
        const orderData = await captureOrder(data.orderId);
        
        if (orderData.status === 'COMPLETED') {
          // Update plan on backend
          const upgradeResponse = await apiRequest("POST", "/api/paypal/upgrade-plan", {
            orderID: data.orderId,
            planId
          });

          if (upgradeResponse.ok) {
            setPaymentSuccess(true);
            toast({
              title: "¡Pago Exitoso!",
              description: "Tu suscripción ha sido activada. Redirigiendo al dashboard...",
            });

            setTimeout(() => {
              setLocation("/dashboard");
            }, 2000);
          } else {
            setPaymentError("Error activando la suscripción");
          }
        }
      } catch (error) {
        setPaymentError("Error completando el pago");
      } finally {
        setIsProcessing(false);
      }
    };

    const onCancel = (data: any) => {
      setPaymentError("Pago cancelado por el usuario");
    };

    const onError = (error: any) => {
      setPaymentError("Error procesando el pago con PayPal");
      console.error("PayPal error:", error);
    };

    useEffect(() => {
      const loadPayPalSDK = async () => {
        try {
          if (!(window as any).paypal) {
            const script = document.createElement("script");
            script.src = import.meta.env.PROD
              ? "https://www.paypal.com/web-sdk/v6/core"
              : "https://www.sandbox.paypal.com/web-sdk/v6/core";
            script.async = true;
            script.onload = () => initPayPal();
            document.body.appendChild(script);
          } else {
            await initPayPal();
          }
        } catch (e) {
          setPaymentError("Error cargando PayPal SDK");
          console.error("Failed to load PayPal SDK", e);
        }
      };

      const initPayPal = async () => {
        try {
          const clientToken: string = await fetch("/paypal/setup")
            .then((res) => res.json())
            .then((data) => data.clientToken);
            
          const sdkInstance = await (window as any).paypal.createInstance({
            clientToken,
            components: ["paypal-payments"],
          });

          const paypalCheckout = sdkInstance.createPayPalOneTimePaymentSession({
            onApprove,
            onCancel,
            onError,
          });

          const onClick = async () => {
            try {
              setPaymentError(null);
              const checkoutOptionsPromise = createOrder();
              await paypalCheckout.start(
                { paymentFlow: "auto" },
                checkoutOptionsPromise,
              );
            } catch (e) {
              setPaymentError("Error iniciando el pago");
              console.error(e);
            }
          };

          const paypalButton = document.getElementById("paypal-button");
          if (paypalButton) {
            paypalButton.addEventListener("click", onClick);
          }

          return () => {
            if (paypalButton) {
              paypalButton.removeEventListener("click", onClick);
            }
          };
        } catch (e) {
          setPaymentError("Error inicializando PayPal");
          console.error(e);
        }
      };

      loadPayPalSDK();
    }, []);

    return <paypal-button id="paypal-button">Pagar con PayPal</paypal-button>;
  };

  if (!planId || !amount) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Selecciona un Plan</h3>
        <p className="text-gray-600">
          Por favor selecciona un plan antes de proceder al pago.
        </p>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">¡Pago Exitoso!</h3>
        <p className="text-gray-600 mb-4">
          Tu suscripción ha sido activada correctamente.
        </p>
        <p className="text-sm text-gray-500">
          Redirigiendo al dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">
            Pago Seguro con PayPal
          </h3>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Acepta tarjetas dominicanas e internacionales. Procesado de forma segura por PayPal.
        </p>
      </div>

      {/* Plan Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-semibold">
              {planId === 'annual' ? 'Plan Anual' : 'Plan Mensual'}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {planId === 'annual' ? 'Facturación anual' : 'Facturación mensual'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">
              RD${amount.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              {planId === 'annual' ? 'por año' : 'por mes'}
            </p>
          </div>
        </div>
      </div>

      {paymentError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700 dark:text-red-300 text-sm">{paymentError}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-lg font-semibold">Procesando Pago...</p>
              <p className="text-sm text-gray-500">No cierres esta ventana</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pagar con PayPal</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Haz clic en el botón para proceder al pago seguro
              </p>
              <div className="flex justify-center">
                <PayPalCustomButton />
              </div>
            </div>
          )}
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          Al proceder, aceptas nuestros términos de servicio y política de privacidad.
          Puedes pagar con cualquier tarjeta de crédito/débito sin necesidad de cuenta PayPal.
        </p>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Seguro SSL</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Tarjetas RD</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>PayPal Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}