import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertCompanySchema, type Company } from "@shared/schema";
import { z } from "zod";
import { 
  Building2, 
  Upload, 
  Save, 
  Globe, 
  Mail, 
  Phone,
  MapPin,
  FileText,
  Image,
  Settings
} from "lucide-react";

const companySettingsSchema = insertCompanySchema.extend({
  name: z.string().min(1, "Nombre es requerido"),
  rnc: z.string().optional(),
});

type CompanySettingsFormData = z.infer<typeof companySettingsSchema>;

export default function CompanySettings() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isVerifyingRNC, setIsVerifyingRNC] = useState(false);
  const [rncValidationResult, setRncValidationResult] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      name: "",
      businessName: "",
      rnc: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      industry: "",
      taxRegime: "general",
      currency: "DOP",
      timezone: "America/Santo_Domingo",
    },
  });

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/companies/current"]
  });

  // Use useEffect to handle form reset when company data loads
  React.useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        businessName: company.businessName ?? "",
        rnc: company.rnc ?? "",
        address: company.address ?? "",
        phone: company.phone ?? "",
        email: company.email ?? "",
        website: company.website ?? "",
        industry: company.industry ?? "",
        taxRegime: company.taxRegime ?? "general",
        currency: company.currency ?? "DOP",
        timezone: company.timezone ?? "America/Santo_Domingo",
      });
      
      if (company.logoUrl) {
        setLogoPreview(company.logoUrl);
      }
    }
  }, [company, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: CompanySettingsFormData & { logoUrl?: string }) => {
      console.log("🚀 Starting company update mutation with data:", data);
      try {
        const response = await apiRequest('/api/companies/current', {
          method: 'PUT',
          body: data,
        });
        console.log("✅ API response received:", response);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al actualizar la empresa');
        }
        
        const result = await response.json();
        console.log("📋 Parsed response data:", result);
        return result;
      } catch (error: any) {
        console.error("❌ Mutation error:", error);
        throw new Error(error.message || 'Error de conexión');
      }
    },
    onSuccess: (updatedCompany: any) => {
      console.log("🎉 Company update successful:", updatedCompany);
      
      const savedFields = [];
      if (updatedCompany.name) savedFields.push("Nombre comercial");
      if (updatedCompany.businessName) savedFields.push("Razón social");
      if (updatedCompany.rnc) savedFields.push("RNC");
      if (updatedCompany.address) savedFields.push("Dirección");
      if (updatedCompany.phone) savedFields.push("Teléfono");
      if (updatedCompany.email) savedFields.push("Email");
      if (updatedCompany.website) savedFields.push("Sitio web");
      if (updatedCompany.industry) savedFields.push("Industria");
      if (updatedCompany.taxRegime) savedFields.push("Régimen tributario");
      if (updatedCompany.currency) savedFields.push("Moneda");
      if (updatedCompany.timezone) savedFields.push("Zona horaria");
      if (updatedCompany.logoUrl) savedFields.push("Logo");

      const description = savedFields.length > 0 
        ? `Se guardaron: ${savedFields.join(", ")}`
        : "Se actualizó la configuración de la empresa";

      toast({
        title: "Configuración guardada exitosamente",
        description: description,
        duration: 5000,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/companies/current"] });
    },
    onError: (error: any) => {
      console.error("❌ Update error:", error);
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo actualizar la configuración de la empresa.",
        variant: "destructive",
      });
    },
  });

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Archivo muy grande",
          description: "El logo debe ser menor a 5MB.",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato no válido",
          description: "Por favor selecciona una imagen válida.",
          variant: "destructive",
        });
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;

    const formData = new FormData();
    formData.append('logo', logoFile);

    try {
      const response = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      return result.url;
    } catch (error) {
      toast({
        title: "Error al subir logo",
        description: "No se pudo subir el logo. Intenta nuevamente.",
        variant: "destructive",
      });
      return null;
    }
  };

  // RNC Verification function
  const handleRNCVerification = async (rnc: string) => {
    if (!rnc || rnc.length < 9) {
      setRncValidationResult(null);
      return;
    }

    setIsVerifyingRNC(true);
    try {
      const response = await fetch(`/api/verify-rnc/${rnc}`);
      const result = await response.json();
      
      setRncValidationResult(result);
      
      if (result.valid && result.data) {
        // Auto-fill business name if verified
        form.setValue("businessName", result.data.razonSocial);
        
        toast({
          title: "RNC Verificado",
          description: `Empresa encontrada: ${result.data.razonSocial}`,
        });
      } else {
        toast({
          title: "RNC No Encontrado",
          description: result.message || "No se pudo verificar el RNC en la DGII",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying RNC:", error);
      toast({
        title: "Error de Verificación",
        description: "No se pudo conectar con el servicio de verificación",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingRNC(false);
    }
  };

  const onSubmit = async (data: CompanySettingsFormData) => {
    console.log("🔄 Form submitted with data:", data);
    console.log("🔍 Form errors:", form.formState.errors);
    console.log("✅ Form is valid:", form.formState.isValid);
    console.log("📋 Form dirty fields:", form.formState.dirtyFields);
    
    if (!form.formState.isValid) {
      console.error("❌ Form validation failed");
      toast({
        title: "Error de validación",
        description: "Por favor revisa los campos marcados en rojo.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      let logoUrl = company?.logoUrl ?? undefined;

      if (logoFile) {
        console.log("📸 Uploading logo...");
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
          console.log("✅ Logo uploaded:", uploadedUrl);
        }
      }

      const submitData = { ...data, logoUrl };
      console.log("🚀 Calling mutation with final data:", submitData);
      
      updateMutation.mutate(submitData);
    } catch (error) {
      console.error("❌ Form submission error:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al preparar los datos para guardar.",
        variant: "destructive",
      });
    }
  };



  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <Header title="Configuración de Empresa" subtitle="Gestiona la información y configuración de tu empresa" />
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando configuración...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <Header title="Configuración de Empresa" subtitle="Personaliza la información fiscal y visual de tu empresa" />
      
      <div className="p-6 space-y-6">
        <form onSubmit={(e) => {
          console.log("🔥 Form submit event triggered!");
          console.log("Form errors before submit:", form.formState.errors);
          console.log("Form isValid:", form.formState.isValid);
          e.preventDefault();
          
          // Force call onSubmit regardless of validation
          const formData = form.getValues();
          console.log("Force calling onSubmit with:", formData);
          onSubmit(formData);
        }} className="space-y-6">
          {/* Logo de la Empresa */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Image className="mr-2 h-5 w-5" />
                Logo de la Empresa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-6">
                <div className="shrink-0">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-20 w-20 object-contain border-2 border-gray-200 dark:border-gray-600 rounded-lg bg-white"
                    />
                  ) : (
                    <div className="h-20 w-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                      <Image className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Label htmlFor="logo" className="cursor-pointer">
                    <div className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-500">
                      <Upload className="h-4 w-4" />
                      <span>Subir nuevo logo</span>
                    </div>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </Label>
                  <p className="mt-1 text-sm text-gray-500">
                    PNG, JPG, GIF hasta 5MB. Recomendado: 200x200px
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Comercial*</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Mi Empresa"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName">Razón Social</Label>
                  <Input
                    id="businessName"
                    placeholder="Ej: Mi Empresa SRL"
                    {...form.register("businessName")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rnc">RNC (Registro Nacional del Contribuyente)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="rnc"
                      placeholder="Ej: 131-12345-6"
                      {...form.register("rnc")}
                      onBlur={(e) => {
                        const rncValue = e.target.value;
                        if (rncValue && rncValue.length >= 9) {
                          handleRNCVerification(rncValue);
                        }
                      }}
                      className={rncValidationResult?.valid === true ? "border-green-500" : 
                                rncValidationResult?.valid === false ? "border-red-500" : ""}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isVerifyingRNC || !form.watch("rnc")}
                      onClick={() => handleRNCVerification(form.watch("rnc") || "")}
                    >
                      {isVerifyingRNC ? "Verificando..." : "Verificar"}
                    </Button>
                  </div>
                  {rncValidationResult && (
                    <div className={`text-sm p-2 rounded ${
                      rncValidationResult.valid 
                        ? "bg-green-50 text-green-700 border border-green-200" 
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}>
                      {rncValidationResult.valid ? (
                        <div>
                          <p className="font-medium">✓ RNC Verificado en DGII</p>
                          <p>Empresa: {rncValidationResult.data?.razonSocial}</p>
                          {rncValidationResult.data?.categoria && (
                            <p>Categoría: {rncValidationResult.data.categoria}</p>
                          )}
                          {rncValidationResult.data?.estado && (
                            <p>Estado: {rncValidationResult.data.estado}</p>
                          )}
                        </div>
                      ) : (
                        <p>✗ {rncValidationResult.message}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industria/Sector</Label>
                  <Input
                    id="industry"
                    placeholder="Ej: Retail, Manufactura, Servicios"
                    {...form.register("industry")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Tipo de Negocio</Label>
                  <Select
                    value={form.watch("businessType") ?? ""}
                    onValueChange={(value) => form.setValue("businessType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="restaurant">Restaurante</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección Fiscal</Label>
                <Textarea
                  id="address"
                  placeholder="Dirección completa de la empresa"
                  {...form.register("address")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información de Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Phone className="mr-2 h-5 w-5" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="(809) 123-4567"
                    {...form.register("phone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contacto@empresa.com"
                    {...form.register("email")}
                  />
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
            </CardContent>
          </Card>

          {/* Configuración Fiscal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Configuración Fiscal y Regional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRegime">Régimen Tributario</Label>
                  <Select
                    value={form.watch("taxRegime") ?? "general"}
                    onValueChange={(value) => form.setValue("taxRegime", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Régimen General</SelectItem>
                      <SelectItem value="simplified">Régimen Simplificado</SelectItem>
                      <SelectItem value="pst">Procedimiento Simplificado de Tributación (PST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={form.watch("currency") ?? "DOP"}
                    onValueChange={(value) => form.setValue("currency", value)}
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

                <div className="space-y-2">
                  <Label htmlFor="timezone">Zona Horaria</Label>
                  <Select
                    value={form.watch("timezone") ?? "America/Santo_Domingo"}
                    onValueChange={(value) => form.setValue("timezone", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Santo_Domingo">República Dominicana (AST)</SelectItem>
                      <SelectItem value="America/New_York">Nueva York (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Los Ángeles (PST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botón de Guardar */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              size="lg"
              onClick={(e) => {
                console.log("🖱️ Save button clicked!");
                console.log("Form state:", form.formState);
                console.log("Form values:", form.getValues());
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}