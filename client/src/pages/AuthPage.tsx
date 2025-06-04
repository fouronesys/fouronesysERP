import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff, Building, Lock, Mail, User } from "lucide-react";

import fourOneLogo from "@assets/Four One Solutions Logo.png";
import { useLocation } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().min(1, "Company name is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [, setLocation] = useLocation();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      companyName: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("/api/login", {
        method: "POST",
        body: data,
      });
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies/current"] });
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      // Navigate to dashboard after successful login
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const response = await apiRequest("/api/register", {
        method: "POST",
        body: data,
      });
      return response.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome to Four One Solutions!",
        description: "Your account has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const onLogin = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterForm) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="flex min-h-screen">
        {/* Left Column - Hero Section */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8 xl:px-12 bg-gradient-to-br from-blue-600 to-indigo-800 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-black/10">
            <div className="absolute inset-0" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>
          
          <div className="relative z-10 max-w-md">
            <div className="mb-8">
              <img
                src={fourOneLogo}
                alt="Four One Solutions"
                className="h-20 w-auto mb-6 filter brightness-0 invert"
              />
              <h1 className="text-4xl font-bold text-white mb-4">
                Sistema de Gestión Empresarial
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                Solución integral para empresas dominicanas con módulos de manufactura, POS, inventario, RRHH y nómina.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Building className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Gestión Completa</h3>
                  <p className="text-blue-100">Manufactura, POS, inventario y más en una sola plataforma</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Seguro y Confiable</h3>
                  <p className="text-blue-100">Cumplimiento fiscal dominicano y seguridad de datos</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Multi-usuario</h3>
                  <p className="text-blue-100">Roles y permisos personalizados para tu equipo</p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-blue-400/30">
              <p className="text-blue-100 text-sm">
                "Four One Solutions ha transformado completamente nuestra operación empresarial"
              </p>
              <p className="text-blue-200 text-xs mt-2 font-medium">
                - Empresas líderes en República Dominicana
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Form */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-8 lg:hidden">
              <img
                src={fourOneLogo}
                alt="Four One Solutions Logo"
                className="h-16 w-auto mx-auto mb-4"
              />
            </div>
            
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Bienvenido de vuelta
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Accede a tu cuenta para continuar
              </p>
            </div>

            <Card className="bg-white/10 backdrop-blur-lg border-2 border-white/20 shadow-2xl rounded-3xl overflow-hidden">
              <CardHeader className="text-center pb-6 bg-gradient-to-b from-black/30 to-transparent border-b border-white/10">
                <div className="lg:hidden flex justify-center mb-4">
                  <img src="/attached_assets/Four One Solutions Logo_20250603_002341_0000.png" alt="Four One Solutions" className="h-16 w-auto" />
                </div>
                <CardTitle className="text-2xl font-bold text-white">Four One Solutions</CardTitle>
                <CardDescription className="text-gray-200">
                  Sistema de gestión empresarial
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-8 p-2 bg-black/40 backdrop-blur-sm border-2 border-white/20 rounded-xl shadow-lg">
                    <TabsTrigger 
                      value="login" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:border-2 data-[state=active]:border-blue-400/50 text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300 rounded-lg font-semibold py-3 px-4"
                    >
                      Iniciar Sesión
                    </TabsTrigger>
                    <TabsTrigger 
                      value="register" 
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:border-2 data-[state=active]:border-blue-400/50 text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-300 rounded-lg font-semibold py-3 px-4"
                    >
                      Registrarse
                    </TabsTrigger>
                  </TabsList>

                  {/* Login Tab */}
                  <TabsContent value="login">
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-white font-semibold text-sm">Correo Electrónico</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
                                  <Input
                                    type="email"
                                    placeholder="Ingresa tu email"
                                    className="pl-12 pr-4 py-4 bg-black/30 backdrop-blur-sm border-2 border-white/30 text-white placeholder-gray-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 rounded-xl transition-all duration-300 shadow-lg hover:border-white/40 text-base"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-300 font-medium" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={loginForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel className="text-white font-semibold text-sm">Contraseña</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-blue-400" />
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Ingresa tu contraseña"
                                    className="pl-12 pr-12 py-4 bg-black/30 backdrop-blur-sm border-2 border-white/30 text-white placeholder-gray-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-500/20 rounded-xl transition-all duration-300 shadow-lg hover:border-white/40 text-base"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-white/10 text-blue-400 hover:text-blue-300 rounded-lg"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-5 w-5" />
                                    ) : (
                                      <Eye className="h-5 w-5" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-300 font-medium" />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full py-4 mt-6 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-2 border-blue-400/30 text-base"
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? "Iniciando sesión..." : "Iniciar Sesión"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>

                  {/* Register Tab */}
                  <TabsContent value="register">
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 dark:text-gray-200">Nombre</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    <Input
                                      placeholder="Tu nombre"
                                      className="pl-10 bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage className="text-red-500 dark:text-red-400" />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 dark:text-gray-200">Apellido</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    <Input
                                      placeholder="Tu apellido"
                                      className="pl-10 bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage className="text-red-500 dark:text-red-400" />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={registerForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 dark:text-gray-200">Nombre de la Empresa</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  <Input
                                    placeholder="Nombre de tu empresa"
                                    className="pl-10 bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-500 dark:text-red-400" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 dark:text-gray-200">Correo Electrónico</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  <Input
                                    type="email"
                                    placeholder="Ingresa tu email"
                                    className="pl-10 bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-500 dark:text-red-400" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 dark:text-gray-200">Contraseña</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Ingresa tu contraseña"
                                    className="pl-10 pr-10 bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    onClick={() => setShowPassword(!showPassword)}
                                  >
                                    {showPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-500 dark:text-red-400" />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 dark:text-gray-200">Confirmar Contraseña</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                  <Input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirma tu contraseña"
                                    className="pl-10 pr-10 bg-gray-50 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500"
                                    {...field}
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  >
                                    {showConfirmPassword ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-red-500 dark:text-red-400" />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? "Creando cuenta..." : "Crear Cuenta"}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </Tabs>


              </CardContent>
            </Card>

            {/* Footer */}
            <div className="mt-8 text-center">
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  © 2025 Four One Solutions. Todos los derechos reservados.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Sistema ERP para empresas dominicanas
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Hero Section */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-white">
                  Solución ERP Integral para República Dominicana
                </h1>
                <p className="text-xl text-gray-300">
                  Gestiona tu empresa con tecnología de vanguardia. Sistema completo de gestión empresarial con facturación DGII, punto de venta, inventario y más.
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-blue-400 mb-2">Gestión de Inventario</h3>
                  <p className="text-gray-400">Control completo de productos, stock y almacenes en tiempo real</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-blue-400 mb-2">Punto de Venta</h3>
                  <p className="text-gray-400">Sistema POS moderno con impresión térmica y sincronización automática</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-blue-400 mb-2">Facturación DGII</h3>
                  <p className="text-gray-400">Cumplimiento total con regulaciones dominicanas y NCF automáticos</p>
                </div>
                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                  <h3 className="font-semibold text-blue-400 mb-2">Reportes Avanzados</h3>
                  <p className="text-gray-400">Análisis detallados y reportes personalizables para tomar mejores decisiones</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}