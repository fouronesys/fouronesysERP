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
  rnc: z.string().optional(),
  subscriptionPlan: z.enum(["trial", "monthly", "annual"]),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function SuperAdmin() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
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
      await apiRequest(`/api/admin/companies`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Empresa creada",
        description: "La empresa ha sido creada exitosamente.",
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
      await apiRequest(`/api/admin/companies/${editingCompany?.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
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
      await apiRequest(`/api/admin/companies/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
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
    setIsDialogOpen(true);
  };

  const filteredCompanies = companies?.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (company.rnc && company.rnc.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

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
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Empresas Registradas
              </CardTitle>
              <div className="flex items-center space-x-4">
                <Input
                  placeholder="Buscar empresas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={handleNewCompany}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva Empresa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
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
                      <div className="grid grid-cols-2 gap-4">
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

                      <div className="grid grid-cols-2 gap-4">
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

                      <div className="grid grid-cols-3 gap-4">
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

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="subscriptionPlan">Plan de Suscripción</Label>
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
                        </div>

                        <div className="flex items-center space-x-2 pt-8">
                          <Switch
                            id="isActive"
                            checked={form.watch("isActive")}
                            onCheckedChange={(checked) => form.setValue("isActive", checked)}
                          />
                          <Label htmlFor="isActive">Empresa activa</Label>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createMutation.isPending || updateMutation.isPending}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>RNC</TableHead>
                    <TableHead>Industria</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Registrado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
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
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.rnc ? (
                          <Badge variant="outline">{company.rnc}</Badge>
                        ) : (
                          <span className="text-gray-400">Sin RNC</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {company.industry || "No especificada"}
                      </TableCell>
                      <TableCell>
                        {getSubscriptionBadge(company.subscriptionPlan)}
                      </TableCell>
                      <TableCell>
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
                        <div className="flex justify-end space-x-2">
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
                            onClick={() => {/* Implementar vista de detalles */}}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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