import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  CreditCard,
  Mail,
  Phone,
  Search
} from "lucide-react";

interface Company {
  id: number;
  name: string;
  businessName?: string;
  email?: string;
  phone?: string;
  rnc?: string;
  isActive: boolean;
  ownerEmail?: string;
  subscriptionPlan?: string;
  createdAt: string;
  paymentStatus?: string;
  lastActivity?: string;
}

export default function CompanyManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activationNotes, setActivationNotes] = useState("");
  const { toast } = useToast();

  // Fetch companies
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["/api/admin/companies"],
    retry: false,
  });

  // Activate/Deactivate company mutation
  const activateMutation = useMutation({
    mutationFn: async ({ companyId, isActive, notes }: { 
      companyId: number; 
      isActive: boolean; 
      notes?: string 
    }) => {
      const response = await apiRequest("PATCH", `/api/admin/companies/${companyId}/status`, {
        isActive,
        notes
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/companies"] });
      toast({
        title: "Estado actualizado",
        description: "El estado de la empresa ha sido actualizado exitosamente.",
      });
      setSelectedCompany(null);
      setActivationNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al actualizar el estado de la empresa.",
        variant: "destructive",
      });
    },
  });

  // Filter companies
  const filteredCompanies = companies.filter((company: Company) => {
    const matchesSearch = 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.rnc?.includes(searchTerm);
    
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "active" && company.isActive) ||
      (statusFilter === "inactive" && !company.isActive) ||
      (statusFilter === "pending" && !company.isActive && company.paymentStatus === "confirmed");
    
    return matchesSearch && matchesStatus;
  });

  const handleActivateCompany = (company: Company, activate: boolean) => {
    setSelectedCompany(company);
    activateMutation.mutate({
      companyId: company.id,
      isActive: activate,
      notes: activationNotes
    });
  };

  const getStatusBadge = (company: Company) => {
    if (company.isActive) {
      return <Badge className="bg-green-100 text-green-800">Activa</Badge>;
    } else if (company.paymentStatus === "confirmed") {
      return <Badge className="bg-yellow-100 text-yellow-800">Pendiente Activación</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Inactiva</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Sin Pago</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Empresas</h1>
          <p className="text-muted-foreground">
            Administra las empresas registradas y sus estados de activación
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empresas Activas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {companies.filter((c: Company) => c.isActive).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {companies.filter((c: Company) => !c.isActive && c.paymentStatus === "confirmed").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Pago</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {companies.filter((c: Company) => !c.paymentStatus || c.paymentStatus === "pending").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por nombre, email o RNC..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="inactive">Inactivas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Empresas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>RNC</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company: Company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{company.name}</div>
                        {company.businessName && (
                          <div className="text-sm text-muted-foreground">{company.businessName}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {company.ownerEmail && (
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {company.ownerEmail}
                          </div>
                        )}
                        {company.phone && (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {company.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{company.rnc || "-"}</TableCell>
                    <TableCell>{getStatusBadge(company)}</TableCell>
                    <TableCell>{getPaymentBadge(company.paymentStatus)}</TableCell>
                    <TableCell>
                      {new Date(company.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!company.isActive && company.paymentStatus === "confirmed" && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                Activar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Activar Empresa</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p>¿Está seguro que desea activar la empresa <strong>{company.name}</strong>?</p>
                                <div>
                                  <Label htmlFor="notes">Notas (opcional)</Label>
                                  <Textarea
                                    id="notes"
                                    placeholder="Notas sobre la activación..."
                                    value={activationNotes}
                                    onChange={(e) => setActivationNotes(e.target.value)}
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    onClick={() => handleActivateCompany(company, true)}
                                    disabled={activateMutation.isPending}
                                  >
                                    Confirmar Activación
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        
                        {company.isActive && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                Desactivar
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Desactivar Empresa</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <p>¿Está seguro que desea desactivar la empresa <strong>{company.name}</strong>?</p>
                                <div>
                                  <Label htmlFor="deactivation-notes">Motivo (requerido)</Label>
                                  <Textarea
                                    id="deactivation-notes"
                                    placeholder="Motivo de la desactivación..."
                                    value={activationNotes}
                                    onChange={(e) => setActivationNotes(e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleActivateCompany(company, false)}
                                    disabled={activateMutation.isPending || !activationNotes.trim()}
                                  >
                                    Confirmar Desactivación
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}