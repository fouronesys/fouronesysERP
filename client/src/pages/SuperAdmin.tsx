import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertCompanySchema, type Company } from "@shared/schema";
import { z } from "zod";
import { 
  Plus, 
  Building2, 
  Users, 
  Settings, 
  Edit, 
  Trash2, 
  Crown,
  Calendar,
  DollarSign,
  Globe,
  Shield
} from "lucide-react";
import { formatDominicanDateTime } from "@/lib/dominican";

const companySchema = insertCompanySchema.extend({
  name: z.string().min(1, "Nombre es requerido"),
  rnc: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true; // Allow empty RNC
    const rncPattern = /^[0-9]{9}$|^[0-9]{11}$/;
    return rncPattern.test(val);
  }, "El RNC debe tener 9 o 11 dígitos"),
  subscriptionPlan: z.enum(["trial", "monthly", "annual"]),
  ownerEmail: z.string().email("Email válido es requerido"),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function SuperAdmin() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [planFilter, setPlanFilter] = useState<"all" | "trial" | "monthly" | "annual">("all");
  const [sortBy, setSortBy] = useState<"name" | "created" | "revenue">("created");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isVerifyingRNC, setIsVerifyingRNC] = useState(false);
  const [rncValidationResult, setRncValidationResult] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: "",
      businessName: "",
      rnc: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      industry: "",
      subscriptionPlan: "trial",
      isActive: true,
      ownerEmail: "",
    },
  });

  const { data: companies, isLoading } = useQuery<Company[]>({
    queryKey: ["/api/admin/companies"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const response = await apiRequest("/api/admin/companies", {
        method: "POST",
        body: data,
      });
      return await response.json();
    },
    onSuccess: (result) => {
      const emailStatus = result.emailSent ? "Invitación enviada exitosamente." : "Empresa creada, pero no se pudo enviar la invitación por email.";
      toast({
        title: "Empresa creada",
        description: emailStatus,
        variant: result.emailSent ? "default" : "destructive",
      });
      setIsDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear la empresa.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CompanyFormData) => {
      const response = await apiRequest(`/api/admin/companies/${editingCompany?.id}`, {
        method: "PUT",
        body: data,
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Empresa actualizada",
        description: "La empresa ha sido actualizada exitosamente.",
      });
      setIsDialogOpen(false);
      setEditingCompany(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la empresa.",
        variant: "destructive",
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await apiRequest(`/api/admin/companies/${id}/status`, {
        method: "PATCH",
        body: { isActive },
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Estado actualizado",
        description: "El estado de la empresa ha sido actualizado.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (companyId: number) => {
      const response = await apiRequest(`/api/admin/companies/${companyId}`, {
        method: "DELETE",
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Empresa eliminada",
        description: "La empresa ha sido eliminada exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar la empresa.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CompanyFormData) => {
    if (editingCompany) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    form.reset({
      name: company.name,
      businessName: company.businessName || "",
      rnc: company.rnc || "",
      address: company.address || "",
      phone: company.phone || "",
      email: company.email || "",
      website: company.website || "",
      industry: company.industry || "",
      subscriptionPlan: company.subscriptionPlan as "trial" | "monthly" | "annual",
      isActive: company.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleNewCompany = () => {
    setEditingCompany(null);
    form.reset();
    setRncValidationResult(null);
    setIsDialogOpen(true);
  };

  const handleRNCVerification = async (rnc: string) => {
    if (!rnc || rnc.trim() === '') {
      setRncValidationResult(null);
      return;
    }

    // Remove any formatting and validate basic format
    const cleanRNC = rnc.replace(/\D/g, '');
    if (!/^[0-9]{9}$|^[0-9]{11}$/.test(cleanRNC)) {
      setRncValidationResult({
        valid: false,
        message: "El RNC debe tener 9 o 11 dígitos"
      });
      return;
    }

    setIsVerifyingRNC(true);
    try {
      const response = await fetch(`/api/rnc/${cleanRNC}`);
      const result = await response.json();
      
      if (response.ok) {
        setRncValidationResult({
          valid: true,
          data: result,
          message: "RNC verificado exitosamente"
        });
        
        // Auto-fill form fields with DGII data
        form.setValue("name", result.name);
        form.setValue("businessName", result.businessName);
        form.setValue("rnc", result.rnc);
        
        toast({
          title: "RNC Verificado",
          description: `Datos de empresa cargados: ${result.name}`,
        });
      } else {
        setRncValidationResult({
          valid: false,
          message: result.message || "RNC no encontrado",
          data: null
        });
        
        if (response.status === 409) {
          toast({
            title: "RNC ya registrado",
            description: result.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "RNC no encontrado",
            description: result.message || "No se encontró en el registro de DGII",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Error verifying RNC:", error);
      setRncValidationResult({
        valid: false,
        message: "Error al verificar RNC",
        data: null
      });
      toast({
        title: "Error de verificación",
        description: "No se pudo conectar con el servicio de verificación",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingRNC(false);
    }
  };

  // Bulk operations mutations
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ companyIds, isActive }: { companyIds: number[]; isActive: boolean }) => {
      const promises = companyIds.map(id => 
        apiRequest(`/api/admin/companies/${id}/status`, {
          method: "PATCH",
          body: { isActive },
        })
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Operación completada",
        description: "El estado de las empresas seleccionadas ha sido actualizado.",
      });
      setSelectedCompanies([]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de algunas empresas.",
        variant: "destructive",
      });
    },
  });

  const bulkPlanMutation = useMutation({
    mutationFn: async ({ companyIds, plan }: { companyIds: number[]; plan: string }) => {
      const promises = companyIds.map(id => 
        apiRequest(`/api/admin/companies/${id}`, {
          method: "PUT",
          body: { subscriptionPlan: plan },
        })
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Planes actualizados",
        description: "Los planes de suscripción han sido actualizados.",
      });
      setSelectedCompanies([]);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar los planes de algunas empresas.",
        variant: "destructive",
      });
    },
  });

  // Enhanced filtering and sorting
  const filteredCompanies = companies?.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.rnc && company.rnc.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && company.isActive) ||
      (statusFilter === "inactive" && !company.isActive);
    
    const matchesPlan = planFilter === "all" || company.subscriptionPlan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  }).sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "created":
        comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        break;
      case "revenue":
        const planValues = { trial: 0, starter: 29, professional: 79, business: 149, enterprise: 299 };
        const aValue = planValues[a.subscriptionPlan as keyof typeof planValues] || 0;
        const bValue = planValues[b.subscriptionPlan as keyof typeof planValues] || 0;
        comparison = aValue - bValue;
        break;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  }) || [];

  const handleSelectAll = () => {
    if (selectedCompanies.length === filteredCompanies.length) {
      setSelectedCompanies([]);
    } else {
      setSelectedCompanies(filteredCompanies.map(c => c.id));
    }
  };

  const handleSelectCompany = (companyId: number) => {
    setSelectedCompanies(prev => 
      prev.includes(companyId) 
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    );
  };

  const handleBulkActivate = () => {
    bulkStatusMutation.mutate({ companyIds: selectedCompanies, isActive: true });
  };

  const handleBulkDeactivate = () => {
    bulkStatusMutation.mutate({ companyIds: selectedCompanies, isActive: false });
  };

  const handleBulkPlanChange = (plan: string) => {
    bulkPlanMutation.mutate({ companyIds: selectedCompanies, plan });
  };

  const getSubscriptionBadge = (plan: string) => {
    const colors = {
      trial: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
      monthly: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
      annual: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    };
    const labels = {
      trial: "Prueba",
      monthly: "Mensual",
      annual: "Anual",
    };
    return (
      <Badge className={colors[plan as keyof typeof colors] || ""}>
        {labels[plan as keyof typeof labels] || plan}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <Header title="Panel de Administración" subtitle="Gestiona todas las empresas del sistema" />
        <div className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <Header title="Panel de Administración" subtitle="Gestiona todas las empresas registradas en Four One Solutions" />
      
      <div className="p-6 space-y-6">
        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{companies?.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                {companies?.filter(c => c.isActive).length || 0} activas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companies?.filter(c => c.subscriptionPlan !== "trial" && c.isActive).length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                empresas con plan pagado
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pruebas Gratuitas</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {companies?.filter(c => c.subscriptionPlan === "trial").length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                empresas en periodo de prueba
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                RD$ {((companies?.filter(c => c.subscriptionPlan === "monthly").length || 0) * 1800 +
                     (companies?.filter(c => c.subscriptionPlan === "annual").length || 0) * 1250).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                ingresos recurrentes estimados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gestión de Empresas */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Empresas Registradas
              </CardTitle>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Input
                  placeholder="Buscar empresas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64"
                />
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleNewCompany}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Empresa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCompany ? "Editar Empresa" : "Registrar Nueva Empresa"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingCompany 
                          ? "Modifica la información de la empresa seleccionada."
                          : "Registra una nueva empresa en el sistema Four One Solutions."
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {/* RNC Field with Auto-fill */}
                      <div className="space-y-2">
                        <Label htmlFor="rnc">RNC (Registro Nacional del Contribuyente)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="rnc"
                            placeholder="Ej: 131123456 o 13112345678"
                            {...form.register("rnc")}
                            onBlur={(e) => {
                              const rncValue = e.target.value;
                              if (rncValue && rncValue.trim().length >= 9) {
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
                                <p>Empresa: {rncValidationResult.data?.name}</p>
                                {rncValidationResult.data?.category && (
                                  <p>Categoría: {rncValidationResult.data.category}</p>
                                )}
                                {rncValidationResult.data?.status && (
                                  <p>Estado: {rncValidationResult.data.status}</p>
                                )}
                              </div>
                            ) : (
                              <p>✗ {rncValidationResult.message}</p>
                            )}
                          </div>
                        )}
                        {form.formState.errors.rnc && (
                          <p className="text-sm text-red-500">{form.formState.errors.rnc.message}</p>
                        )}
                      </div>

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
                          <Label htmlFor="rnc">RNC</Label>
                          <Input
                            id="rnc"
                            placeholder="Ej: 131-12345-6"
                            {...form.register("rnc")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="industry">Industria</Label>
                          <Input
                            id="industry"
                            placeholder="Ej: Retail, Manufactura"
                            {...form.register("industry")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Textarea
                          id="address"
                          placeholder="Dirección completa de la empresa"
                          {...form.register("address")}
                        />
                      </div>

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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="subscriptionPlan">Plan de Suscripción*</Label>
                          <Select
                            value={form.watch("subscriptionPlan")}
                            onValueChange={(value) => form.setValue("subscriptionPlan", value as "trial" | "monthly" | "annual")}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="trial">Prueba Gratuita (7 días)</SelectItem>
                              <SelectItem value="monthly">Mensual - RD$ 1,800/mes</SelectItem>
                              <SelectItem value="annual">Anual - RD$ 15,000/año</SelectItem>
                            </SelectContent>
                          </Select>
                          {form.formState.errors.subscriptionPlan && (
                            <p className="text-sm text-red-500">{form.formState.errors.subscriptionPlan.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ownerEmail">Email del Propietario*</Label>
                          <Input
                            id="ownerEmail"
                            type="email"
                            placeholder="propietario@empresa.com"
                            {...form.register("ownerEmail")}
                          />
                          {form.formState.errors.ownerEmail && (
                            <p className="text-sm text-red-500">{form.formState.errors.ownerEmail.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={form.watch("isActive")}
                          onCheckedChange={(checked) => form.setValue("isActive", checked)}
                        />
                        <Label htmlFor="isActive">Empresa activa al crearla</Label>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="w-full sm:w-auto"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          {editingCompany ? "Actualizar" : "Registrar"} Empresa
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredCompanies && filteredCompanies.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Empresa</TableHead>
                      <TableHead className="hidden sm:table-cell">RNC</TableHead>
                      <TableHead className="hidden md:table-cell">Industria</TableHead>
                      <TableHead className="hidden lg:table-cell">Plan</TableHead>
                      <TableHead className="hidden xl:table-cell">Registrado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right min-w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          {company.businessName && (
                            <div className="text-sm text-gray-500">{company.businessName}</div>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                            {company.rnc && (
                              <Badge variant="outline" className="text-xs">{company.rnc}</Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {company.industry || "Sin industria"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {company.rnc ? (
                          <Badge variant="outline">{company.rnc}</Badge>
                        ) : (
                          <span className="text-gray-400">Sin RNC</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {company.industry || "No especificada"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {getSubscriptionBadge(company.subscriptionPlan)}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {formatDominicanDateTime(company.createdAt!)}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={company.isActive}
                          onCheckedChange={(checked) => 
                            toggleStatusMutation.mutate({ id: company.id, isActive: checked })
                          }
                          disabled={toggleStatusMutation.isPending}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(company)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                            onClick={() => {
                              if (confirm("¿Estás seguro de que quieres eliminar esta empresa? Esta acción no se puede deshacer.")) {
                                deleteCompanyMutation.mutate(company.id);
                              }
                            }}
                            disabled={deleteCompanyMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
                  {searchTerm ? "No se encontraron empresas" : "No hay empresas registradas"}
                </h3>
                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  {searchTerm 
                    ? "Intenta con otros términos de búsqueda."
                    : "Comienza registrando la primera empresa en el sistema."
                  }
                </p>
                {!searchTerm && (
                  <Button className="mt-4" onClick={handleNewCompany}>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Primera Empresa
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}