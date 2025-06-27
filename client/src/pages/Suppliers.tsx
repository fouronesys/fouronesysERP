import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { insertSupplierSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Building, Plus, Search, Edit, Eye, Download, Send, Printer, 
  Calculator, Package, Calendar, AlertTriangle, CheckCircle,
  DollarSign, Receipt, User, CreditCard, Clock, Filter,
  ArrowUp, ArrowDown, RotateCcw, Copy, Trash2, ExternalLink,
  Building2, MapPin, Phone, Mail, UserCheck, UserX, UserPlus,
  FileText, History, Star, TrendingUp, TrendingDown, AlertCircle,
  Globe, Smartphone, Flag, Shield, Settings, Target, Zap, Truck,
  Factory, Store, Users, Trophy, BarChart3
} from "lucide-react";

// Enhanced Supplier Schema with Dominican Requirements
const supplierSchema = z.object({
  // Basic Information
  supplierType: z.enum(["business", "individual"], {
    required_error: "El tipo de proveedor es requerido"
  }),
  code: z.string().min(1, "El código es requerido"),
  name: z.string().min(1, "El nombre es requerido"),
  businessName: z.string().optional(),
  rnc: z.string().optional(),
  cedula: z.string().optional(),
  
  // Contact Information
  email: z.string().email("Email inválido").optional(),
  phone: z.string().min(1, "El teléfono es requerido"),
  mobile: z.string().optional(),
  website: z.string().optional(),
  
  // Address Information
  address: z.string().min(1, "La dirección es requerida"),
  neighborhood: z.string().optional(),
  city: z.string().min(1, "La ciudad es requerida"),
  province: z.string().min(1, "La provincia es requerida"),
  postalCode: z.string().optional(),
  country: z.string().default("República Dominicana"),
  
  // Business Information
  supplierCategory: z.enum(["materials", "services", "equipment", "utilities", "other"]).default("materials"),
  paymentTerms: z.number().min(0).default(30), // days
  creditLimit: z.number().min(0).default(0),
  currency: z.enum(["DOP", "USD", "EUR"]).default("DOP"),
  taxWithholding: z.boolean().default(false),
  
  // Classification
  status: z.enum(["active", "inactive", "suspended", "blacklisted"]).default("active"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  
  // Contact Persons
  contactPersons: z.array(z.object({
    name: z.string(),
    position: z.string(),
    department: z.string().optional(),
    phone: z.string(),
    email: z.string().email(),
    isPrimary: z.boolean().default(false)
  })).default([]),
  
  // Banking Information
  bankAccounts: z.array(z.object({
    bankName: z.string(),
    accountNumber: z.string(),
    accountType: z.enum(["checking", "savings"]),
    currency: z.enum(["DOP", "USD", "EUR"]),
    isPrimary: z.boolean().default(false)
  })).default([]),
  
  // Certificates and Documents
  certificates: z.array(z.object({
    type: z.string(),
    number: z.string(),
    issueDate: z.string(),
    expirationDate: z.string(),
    status: z.enum(["valid", "expired", "pending"]).default("valid")
  })).default([]),
  
  // Additional Information
  industry: z.string().optional(),
  services: z.array(z.string()).default([]),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  
  // Quality and Performance
  qualityRating: z.number().min(1).max(5).default(3),
  onTimeDeliveryRate: z.number().min(0).max(100).default(100),
  
  // Dominican Specific
  dgiiCategory: z.enum(["normal", "large", "special", "simplified"]).default("normal"),
  hasDGIICertificates: z.boolean().default(false),
  
  // Preferences
  preferredContactMethod: z.enum(["email", "phone", "whatsapp", "sms"]).default("email"),
  allowsPurchaseOrders: z.boolean().default(true),
  requiresContracts: z.boolean().default(false)
});

const Suppliers = () => {
  const [activeTab, setActiveTab] = useState("suppliers");
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rncValidating, setRncValidating] = useState(false);
  const [contactPersons, setContactPersons] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data queries
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['/api/suppliers'],
  });

  const { data: supplierStats = { total: 0, expiringCertificates: [] } } = useQuery({
    queryKey: ['/api/suppliers/statistics'],
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['/api/purchase-orders'],
  });

  const { data: supplierPerformance = [] } = useQuery({
    queryKey: ['/api/suppliers/performance'],
  });

  // Forms
  const supplierForm = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      supplierType: "business",
      code: "",
      name: "",
      businessName: "",
      rnc: "",
      cedula: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      province: "",
      country: "República Dominicana",
      supplierCategory: "materials",
      paymentTerms: 30,
      creditLimit: 0,
      currency: "DOP",
      taxWithholding: false,
      status: "active",
      priority: "medium",
      contactPersons: [],
      bankAccounts: [],
      certificates: [],
      services: [],
      notes: "",
      internalNotes: "",
      qualityRating: 3,
      onTimeDeliveryRate: 100,
      dgiiCategory: "normal",
      hasDGIICertificates: false,
      preferredContactMethod: "email",
      allowsPurchaseOrders: true,
      requiresContracts: false
    }
  });

  // Mutations
  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify({ 
        ...data, 
        contactPersons, 
        bankAccounts, 
        certificates 
      })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers/statistics'] });
      setShowSupplierDialog(false);
      resetDialogState();
      toast({ title: "Proveedor creado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al crear proveedor", description: error.message, variant: "destructive" });
    }
  });

  const updateSupplierMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/suppliers/${editingSupplier.id}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        ...data, 
        contactPersons, 
        bankAccounts, 
        certificates 
      })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers/statistics'] });
      setShowSupplierDialog(false);
      setEditingSupplier(null);
      resetDialogState();
      toast({ title: "Proveedor actualizado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar proveedor", description: error.message, variant: "destructive" });
    }
  });

  const validateRNCMutation = useMutation({
    mutationFn: (rnc: string) => apiRequest('/api/dgii/validate-rnc', {
      method: 'POST',
      body: JSON.stringify({ rnc })
    }),
    onSuccess: (data: any) => {
      if (data.valid) {
        supplierForm.setValue("businessName", data.businessName || "");
        toast({ 
          title: "RNC Válido", 
          description: `Contribuyente: ${data.businessName}` 
        });
      } else {
        toast({ 
          title: "RNC No Válido", 
          description: "El RNC no existe en el registro de DGII",
          variant: "destructive" 
        });
      }
      setRncValidating(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error validando RNC", 
        description: error.message, 
        variant: "destructive" 
      });
      setRncValidating(false);
    }
  });

  // Utility functions
  const resetDialogState = () => {
    setContactPersons([]);
    setBankAccounts([]);
    setCertificates([]);
    supplierForm.reset();
  };

  const validateRNC = (rnc: string) => {
    if (rnc && rnc.length >= 9) {
      setRncValidating(true);
      validateRNCMutation.mutate(rnc);
    }
  };

  const generateSupplierCode = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `SUPP${timestamp}`;
  };

  const getSupplierStatusBadge = (status: string) => {
    const statuses = {
      active: { label: "Activo", color: "bg-green-100 text-green-800", icon: CheckCircle },
      inactive: { label: "Inactivo", color: "bg-gray-100 text-gray-800", icon: UserX },
      suspended: { label: "Suspendido", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
      blacklisted: { label: "Lista Negra", color: "bg-red-100 text-red-800", icon: Shield }
    };
    const statusConfig = statuses[status as keyof typeof statuses] || statuses.active;
    const IconComponent = statusConfig.icon;
    return (
      <Badge className={`${statusConfig.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const getSupplierCategoryBadge = (category: string) => {
    const categories = {
      materials: { label: "Materiales", color: "bg-blue-100 text-blue-800", icon: Package },
      services: { label: "Servicios", color: "bg-purple-100 text-purple-800", icon: Settings },
      equipment: { label: "Equipos", color: "bg-orange-100 text-orange-800", icon: Factory },
      utilities: { label: "Utilidades", color: "bg-green-100 text-green-800", icon: Zap },
      other: { label: "Otros", color: "bg-gray-100 text-gray-800", icon: Building }
    };
    const categoryConfig = categories[category as keyof typeof categories] || categories.other;
    const IconComponent = categoryConfig.icon;
    return (
      <Badge className={`${categoryConfig.color} flex items-center gap-1`}>
        <IconComponent className="h-3 w-3" />
        {categoryConfig.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorities = {
      high: { label: "Alta", color: "bg-red-100 text-red-800" },
      medium: { label: "Media", color: "bg-yellow-100 text-yellow-800" },
      low: { label: "Baja", color: "bg-green-100 text-green-800" }
    };
    const priorityConfig = priorities[priority as keyof typeof priorities] || priorities.medium;
    return <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = "DOP") => {
    const symbols = { DOP: "RD$", USD: "$", EUR: "€" };
    return `${symbols[currency as keyof typeof symbols] || "RD$"} ${amount.toLocaleString()}`;
  };

  // Contact persons management
  const addContactPerson = () => {
    setContactPersons([...contactPersons, {
      name: "",
      position: "",
      department: "",
      phone: "",
      email: "",
      isPrimary: contactPersons.length === 0
    }]);
  };

  const updateContactPerson = (index: number, field: string, value: any) => {
    const updated = [...contactPersons];
    updated[index] = { ...updated[index], [field]: value };
    
    // Ensure only one primary contact
    if (field === "isPrimary" && value) {
      updated.forEach((contact, i) => {
        if (i !== index) contact.isPrimary = false;
      });
    }
    
    setContactPersons(updated);
  };

  const removeContactPerson = (index: number) => {
    setContactPersons(contactPersons.filter((_, i) => i !== index));
  };

  // Bank accounts management
  const addBankAccount = () => {
    setBankAccounts([...bankAccounts, {
      bankName: "",
      accountNumber: "",
      accountType: "checking",
      currency: "DOP",
      isPrimary: bankAccounts.length === 0
    }]);
  };

  const updateBankAccount = (index: number, field: string, value: any) => {
    const updated = [...bankAccounts];
    updated[index] = { ...updated[index], [field]: value };
    
    // Ensure only one primary account
    if (field === "isPrimary" && value) {
      updated.forEach((account, i) => {
        if (i !== index) account.isPrimary = false;
      });
    }
    
    setBankAccounts(updated);
  };

  const removeBankAccount = (index: number) => {
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  };

  // Certificates management
  const addCertificate = () => {
    setCertificates([...certificates, {
      type: "",
      number: "",
      issueDate: "",
      expirationDate: "",
      status: "valid"
    }]);
  };

  const updateCertificate = (index: number, field: string, value: any) => {
    const updated = [...certificates];
    updated[index] = { ...updated[index], [field]: value };
    setCertificates(updated);
  };

  const removeCertificate = (index: number) => {
    setCertificates(certificates.filter((_, i) => i !== index));
  };

  // Filter suppliers
  const filteredSuppliers = suppliers?.filter((supplier: any) => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.rnc?.includes(searchTerm) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || supplier.supplierCategory === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Dominican provinces
  const dominicanProvinces = [
    "Azua", "Baoruco", "Barahona", "Dajabón", "Distrito Nacional", "Duarte",
    "Elías Piña", "El Seibo", "Espaillat", "Hato Mayor", "Hermanas Mirabal",
    "Independencia", "La Altagracia", "La Romana", "La Vega", "María Trinidad Sánchez",
    "Monseñor Nouel", "Monte Cristi", "Monte Plata", "Pedernales", "Peravia",
    "Puerto Plata", "Samaná", "San Cristóbal", "San José de Ocoa", "San Juan",
    "San Pedro de Macorís", "Sánchez Ramírez", "Santiago", "Santiago Rodríguez",
    "Santo Domingo", "Valverde"
  ];

  const dominicanBanks = [
    "Banco Popular Dominicano", "Banco de Reservas", "Banco BHD León",
    "Banco Santa Cruz", "Banco Múltiple López de Haro", "Banco Promerica",
    "Scotiabank", "Citibank", "Banco Caribe", "Banco Vimenca",
    "Banco Adopem", "Asociación Cibao de Ahorros y Préstamos",
    "Asociación Popular de Ahorros y Préstamos", "Banco del Progreso"
  ];

  if (isLoadingSuppliers) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="Gestión de Proveedores" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="Gestión de Proveedores" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Building className="h-8 w-8 text-blue-600" />
                Gestión de Proveedores
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Sistema completo de gestión de proveedores con validación DGII y documentos
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowSupplierDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proveedor
              </Button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Proveedores</p>
                  <p className="text-2xl font-bold">{supplierStats?.total || suppliers?.length || 0}</p>
                </div>
                <Building className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Proveedores Activos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {suppliers?.filter((s: any) => s.status === 'active').length || 0}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Órdenes Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {purchaseOrders?.filter((po: any) => po.status === 'pending').length || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Certificados por Vencer</p>
                  <p className="text-2xl font-bold text-red-600">
                    {supplierStats?.expiringCertificates || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="suppliers" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Proveedores
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rendimiento
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Análisis
            </TabsTrigger>
          </TabsList>

          {/* Main Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Directorio de Proveedores
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar por nombre, código, RNC..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-80"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="active">Activos</SelectItem>
                        <SelectItem value="inactive">Inactivos</SelectItem>
                        <SelectItem value="suspended">Suspendidos</SelectItem>
                        <SelectItem value="blacklisted">Lista Negra</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        <SelectItem value="materials">Materiales</SelectItem>
                        <SelectItem value="services">Servicios</SelectItem>
                        <SelectItem value="equipment">Equipos</SelectItem>
                        <SelectItem value="utilities">Utilidades</SelectItem>
                        <SelectItem value="other">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => setShowSupplierDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Proveedor
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredSuppliers?.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay proveedores registrados</p>
                      <Button 
                        onClick={() => setShowSupplierDialog(true)} 
                        className="mt-4"
                        variant="outline"
                      >
                        Crear primer proveedor
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Proveedor</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Ubicación</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Términos</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSuppliers?.map((supplier: any) => (
                            <TableRow key={supplier.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{supplier.name}</div>
                                  {supplier.businessName && (
                                    <div className="text-sm text-gray-500">{supplier.businessName}</div>
                                  )}
                                  <div className="text-sm text-gray-500">Código: {supplier.code}</div>
                                  {supplier.rnc && (
                                    <div className="text-sm text-gray-500">RNC: {supplier.rnc}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  {supplier.email && (
                                    <div className="flex items-center gap-1 text-sm">
                                      <Mail className="h-3 w-3" />
                                      {supplier.email}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-sm">
                                    <Phone className="h-3 w-3" />
                                    {supplier.phone}
                                  </div>
                                  {supplier.website && (
                                    <div className="flex items-center gap-1 text-sm text-blue-600">
                                      <Globe className="h-3 w-3" />
                                      <a href={supplier.website} target="_blank" rel="noopener noreferrer">
                                        Web
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3 w-3" />
                                    {supplier.city}
                                  </div>
                                  <div className="text-sm text-gray-500">{supplier.province}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  {getSupplierCategoryBadge(supplier.supplierCategory)}
                                  {getPriorityBadge(supplier.priority)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="text-sm">
                                    {supplier.paymentTerms} días
                                  </div>
                                  {supplier.creditLimit > 0 && (
                                    <div className="text-sm text-gray-500">
                                      Límite: {formatCurrency(supplier.creditLimit, supplier.currency)}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getSupplierStatusBadge(supplier.status)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedSupplier(supplier)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setEditingSupplier(supplier);
                                      setContactPersons(supplier.contactPersons || []);
                                      setBankAccounts(supplier.bankAccounts || []);
                                      setCertificates(supplier.certificates || []);
                                      supplierForm.reset(supplier);
                                      setShowSupplierDialog(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm">
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            {/* Performance Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Performance Metrics */}
              <div className="lg:col-span-3 space-y-6">
                {/* Key Performance Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Tiempo de Entrega</p>
                          <p className="text-2xl font-bold">7.2 días</p>
                        </div>
                        <Clock className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <ArrowDown className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">-1.5 días</span>
                        <span className="text-gray-600 ml-1">vs. mes anterior</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Cumplimiento</p>
                          <p className="text-2xl font-bold">95.8%</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">+2.3%</span>
                        <span className="text-gray-600 ml-1">este mes</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Calidad</p>
                          <p className="text-2xl font-bold">4.7/5.0</p>
                        </div>
                        <Star className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">+0.2</span>
                        <span className="text-gray-600 ml-1">promedio</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Ahorro</p>
                          <p className="text-2xl font-bold">RD$2.1M</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">+15%</span>
                        <span className="text-gray-600 ml-1">anual</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Performing Suppliers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Top Proveedores por Rendimiento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {suppliers?.slice(0, 5).map((supplier: any, index: number) => (
                        <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Badge variant={index === 0 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                                {index + 1}
                              </Badge>
                              <div>
                                <h4 className="font-medium">{supplier.name}</h4>
                                <p className="text-sm text-gray-600">{supplier.category || 'Materiales'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-medium text-green-600">98.5%</p>
                              <p className="text-gray-600">Cumplimiento</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-blue-600">4.8</p>
                              <p className="text-gray-600">Calidad</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-purple-600">5.2d</p>
                              <p className="text-gray-600">Entrega</p>
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )) || []}
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Categories */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Rendimiento por Categoría
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            <h4 className="font-medium">Materiales</h4>
                          </div>
                          <Badge variant="outline">{suppliers?.filter((s: any) => s.category === 'materials').length || 8} proveedores</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Cumplimiento</span>
                            <span className="font-medium text-green-600">96.2%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Calidad</span>
                            <span className="font-medium text-yellow-600">4.6/5</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tiempo Entrega</span>
                            <span className="font-medium text-blue-600">6.8 días</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-green-600" />
                            <h4 className="font-medium">Servicios</h4>
                          </div>
                          <Badge variant="outline">{suppliers?.filter((s: any) => s.category === 'services').length || 5} proveedores</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Cumplimiento</span>
                            <span className="font-medium text-green-600">94.7%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Calidad</span>
                            <span className="font-medium text-yellow-600">4.8/5</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tiempo Entrega</span>
                            <span className="font-medium text-blue-600">3.2 días</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Factory className="h-5 w-5 text-purple-600" />
                            <h4 className="font-medium">Equipos</h4>
                          </div>
                          <Badge variant="outline">{suppliers?.filter((s: any) => s.category === 'equipment').length || 3} proveedores</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Cumplimiento</span>
                            <span className="font-medium text-green-600">97.1%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Calidad</span>
                            <span className="font-medium text-yellow-600">4.9/5</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tiempo Entrega</span>
                            <span className="font-medium text-blue-600">12.5 días</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Insights Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Alertas de Rendimiento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">Entrega Tardía</p>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          3 proveedores con retrasos superiores a 7 días este mes
                        </p>
                      </div>
                      
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Calidad Baja</p>
                        </div>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          2 proveedores con calificación inferior a 4.0 necesitan revisión
                        </p>
                      </div>
                      
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">Rendimiento Excelente</p>
                        </div>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          5 proveedores superan todas las métricas objetivo
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Recomendadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Trophy className="h-4 w-4 mr-2" />
                        Programa Incentivos
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Revisar Contratos
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Auditoría Calidad
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Reporte
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            {/* Document Management Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Documents Section */}
              <div className="lg:col-span-3 space-y-6">
                {/* Document Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Contratos</p>
                          <p className="text-2xl font-bold">24</p>
                        </div>
                        <FileText className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">18 vigentes</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Certificados</p>
                          <p className="text-2xl font-bold">15</p>
                        </div>
                        <Shield className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 mr-1" />
                        <span className="text-yellow-600">3 por vencer</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Licencias</p>
                          <p className="text-2xl font-bold">8</p>
                        </div>
                        <Flag className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">Todas válidas</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Documentos RNC</p>
                          <p className="text-2xl font-bold">12</p>
                        </div>
                        <Building className="h-8 w-8 text-orange-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <Clock className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-blue-600">Actualizado</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Documents */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documentos Recientes
                      </CardTitle>
                      <Button onClick={() => setShowDocumentDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Documento
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Sample Documents */}
                      {[
                        { id: 1, name: "Contrato de Suministro - Materiales Construcción S.A.", type: "Contrato", date: "2024-06-20", status: "vigente", expires: "2025-06-20" },
                        { id: 2, name: "Certificado ISO 9001 - TechSupply Corp", type: "Certificado", date: "2024-06-15", status: "vigente", expires: "2025-06-15" },
                        { id: 3, name: "Licencia Operación - ServiTech RD", type: "Licencia", date: "2024-06-10", status: "vigente", expires: "2026-06-10" },
                        { id: 4, name: "RNC Actualizado - Global Supplies", type: "RNC", date: "2024-06-05", status: "vigente", expires: "N/A" },
                        { id: 5, name: "Seguro Responsabilidad Civil - MegaSupplier", type: "Seguro", date: "2024-05-30", status: "por_vencer", expires: "2024-07-30" }
                      ].map((doc, index) => (
                        <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                              <FileText className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{doc.name}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span>Tipo: {doc.type}</span>
                                <span>Fecha: {doc.date}</span>
                                <span>Vence: {doc.expires}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={doc.status === 'vigente' ? 'default' : doc.status === 'por_vencer' ? 'destructive' : 'secondary'}
                              className={
                                doc.status === 'vigente' ? 'bg-green-100 text-green-800' :
                                doc.status === 'por_vencer' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }
                            >
                              {doc.status === 'vigente' ? 'Vigente' : doc.status === 'por_vencer' ? 'Por Vencer' : 'Vencido'}
                            </Badge>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Document Requirements by Category */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Requisitos Documentales por Categoría
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Package className="h-5 w-5 text-blue-600" />
                          Proveedores de Materiales
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span>RNC Vigente</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Certificado Calidad</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Seguro Responsabilidad</span>
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Contrato Marco</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Settings className="h-5 w-5 text-green-600" />
                          Proveedores de Servicios
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span>RNC Vigente</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Licencia Operación</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Personal Certificado</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Póliza Seguro</span>
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Factory className="h-5 w-5 text-purple-600" />
                          Proveedores de Equipos
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span>RNC Vigente</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Certificado Técnico</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Garantía Equipos</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Soporte Técnico</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Documents Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Alertas de Vencimiento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <p className="text-sm font-medium text-red-800 dark:text-red-200">Vencimiento Urgente</p>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400">
                          2 documentos vencen en los próximos 7 días
                        </p>
                      </div>
                      
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Próximo Vencimiento</p>
                        </div>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">
                          5 documentos vencen en los próximos 30 días
                        </p>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Documentos Faltantes</p>
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          3 proveedores necesitan actualizar documentación
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <FileText className="h-4 w-4 mr-2" />
                        Subir Documento
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Calendar className="h-4 w-4 mr-2" />
                        Programar Renovación
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Mail className="h-4 w-4 mr-2" />
                        Notificar Proveedor
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Download className="h-4 w-4 mr-2" />
                        Reporte Vencimientos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Supplier Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Analytics */}
              <div className="lg:col-span-3 space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Proveedores</p>
                          <p className="text-2xl font-bold">{suppliers?.length || 0}</p>
                        </div>
                        <Building className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">+8</span>
                        <span className="text-gray-600 ml-1">este mes</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Activos</p>
                          <p className="text-2xl font-bold">
                            {suppliers?.filter((s: any) => s.status === 'active').length || 0}
                          </p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <span className="text-gray-600">
                          {Math.round(((suppliers?.filter((s: any) => s.status === 'active').length || 0) / (suppliers?.length || 1)) * 100)}% del total
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Gasto Mensual</p>
                          <p className="text-2xl font-bold">RD$2.8M</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">+12%</span>
                        <span className="text-gray-600 ml-1">vs. mes anterior</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Ahorro Anual</p>
                          <p className="text-2xl font-bold">RD$340K</p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">+18%</span>
                        <span className="text-gray-600 ml-1">eficiencia</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Supplier Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Análisis de Proveedores
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-4">Distribución por Categoría</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">Materiales</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${((suppliers?.filter((s: any) => s.category === 'materials').length || 0) / (suppliers?.length || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                {suppliers?.filter((s: any) => s.category === 'materials').length || 8}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Settings className="h-4 w-4 text-green-600" />
                              <span className="text-sm">Servicios</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${((suppliers?.filter((s: any) => s.category === 'services').length || 0) / (suppliers?.length || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                {suppliers?.filter((s: any) => s.category === 'services').length || 5}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Factory className="h-4 w-4 text-purple-600" />
                              <span className="text-sm">Equipos</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-600 h-2 rounded-full" 
                                  style={{ width: `${((suppliers?.filter((s: any) => s.category === 'equipment').length || 0) / (suppliers?.length || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                {suppliers?.filter((s: any) => s.category === 'equipment').length || 3}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-4">Estado de Proveedores</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Activos</span>
                            <Badge className="bg-green-100 text-green-800">
                              {suppliers?.filter((s: any) => s.status === 'active').length || 12}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Suspendidos</span>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {suppliers?.filter((s: any) => s.status === 'suspended').length || 2}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Inactivos</span>
                            <Badge className="bg-gray-100 text-gray-800">
                              {suppliers?.filter((s: any) => s.status === 'inactive').length || 1}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Lista Negra</span>
                            <Badge className="bg-red-100 text-red-800">
                              {suppliers?.filter((s: any) => s.status === 'blacklisted').length || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Suppliers by Spending */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Top Proveedores por Gasto
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {suppliers?.slice(0, 5).map((supplier: any, index: number) => (
                        <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Badge variant={index === 0 ? "default" : "secondary"} className="w-8 h-8 rounded-full flex items-center justify-center">
                                {index + 1}
                              </Badge>
                              <div>
                                <h4 className="font-medium">{supplier.name}</h4>
                                <p className="text-sm text-gray-600">{supplier.category || 'Materiales'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-center">
                              <p className="font-medium text-green-600">RD${(Math.random() * 500000 + 100000).toLocaleString('es-DO', { maximumFractionDigits: 0 })}</p>
                              <p className="text-gray-600">Gasto Anual</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-blue-600">{Math.floor(Math.random() * 50 + 10)}</p>
                              <p className="text-gray-600">Órdenes</p>
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-purple-600">{(Math.random() * 30 + 10).toFixed(1)} días</p>
                              <p className="text-gray-600">Promedio Pago</p>
                            </div>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )) || []}
                    </div>
                  </CardContent>
                </Card>

                {/* Geographic and Payment Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Análisis Geográfico y Términos de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3">Distribución Geográfica</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Santo Domingo</span>
                            <Badge variant="outline">
                              {suppliers?.filter((s: any) => s.city?.toLowerCase().includes('santo domingo')).length || 8}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Santiago</span>
                            <Badge variant="outline">
                              {suppliers?.filter((s: any) => s.city?.toLowerCase().includes('santiago')).length || 3}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Otras Ciudades</span>
                            <Badge variant="outline">
                              {suppliers?.filter((s: any) => s.city && !s.city?.toLowerCase().includes('santo') && !s.city?.toLowerCase().includes('santiago')).length || 4}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3">Términos de Pago</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>0-15 días</span>
                            <Badge variant="outline">5 proveedores</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>30 días</span>
                            <Badge variant="outline">8 proveedores</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>60+ días</span>
                            <Badge variant="outline">2 proveedores</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3">Monedas de Facturación</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Pesos (DOP)</span>
                            <Badge variant="outline">12 proveedores</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Dólares (USD)</span>
                            <Badge variant="outline">3 proveedores</Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Euros (EUR)</span>
                            <Badge variant="outline">0 proveedores</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Analytics Insights Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Insights Estratégicos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                          💡 Oportunidad de Negociación
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          El 60% de tus proveedores están en Santo Domingo. Considera negociar descuentos por volumen.
                        </p>
                      </div>
                      
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                          📊 Diversificación
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Los proveedores de materiales representan el 65% del gasto. Considera diversificar por riesgo.
                        </p>
                      </div>
                      
                      <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                          💰 Optimización de Costos
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          Los términos de pago promedio de 30 días pueden optimizarse para mejorar el flujo de caja.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Análisis Predictivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">+15%</div>
                        <p className="text-sm text-gray-600">Crecimiento proyectado</p>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Riesgo de Dependencia</span>
                          <Badge className="bg-yellow-100 text-yellow-800">Medio</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Estabilidad de Precios</span>
                          <Badge className="bg-green-100 text-green-800">Alta</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Eficiencia de Pago</span>
                          <Badge className="bg-blue-100 text-blue-800">Buena</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acciones Recomendadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Target className="h-4 w-4 mr-2" />
                        Plan Optimización
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Calculator className="h-4 w-4 mr-2" />
                        Análisis de Costos
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Proyección Anual
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Download className="h-4 w-4 mr-2" />
                        Reporte Ejecutivo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Supplier Dialog */}
        <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
              </DialogTitle>
              <DialogDescription>
                Complete la información del proveedor con validación automática de RNC
              </DialogDescription>
            </DialogHeader>

            <Form {...supplierForm}>
              <form onSubmit={supplierForm.handleSubmit((data) => {
                if (editingSupplier) {
                  updateSupplierMutation.mutate(data);
                } else {
                  createSupplierMutation.mutate(data);
                }
              })} className="space-y-6">
                
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={supplierForm.control}
                    name="supplierType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Proveedor</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="business">Empresa</SelectItem>
                            <SelectItem value="individual">Persona Física</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input {...field} placeholder="SUPP001" />
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => field.onChange(generateSupplierCode())}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre del proveedor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {supplierForm.watch("supplierType") === "business" && (
                    <FormField
                      control={supplierForm.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Razón Social</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Razón social" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* RNC/Cédula Field */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supplierForm.watch("supplierType") === "business" ? (
                    <FormField
                      control={supplierForm.control}
                      name="rnc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RNC</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="RNC del proveedor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <FormField
                      control={supplierForm.control}
                      name="cedula"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cédula</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Cédula del proveedor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={supplierForm.control}
                    name="supplierCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="materials">Materiales</SelectItem>
                            <SelectItem value="services">Servicios</SelectItem>
                            <SelectItem value="equipment">Equipos</SelectItem>
                            <SelectItem value="utilities">Utilidades</SelectItem>
                            <SelectItem value="other">Otros</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <Separator />
                <h3 className="text-lg font-semibold">Información de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={supplierForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="email@proveedor.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(809) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Móvil</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(829) 123-4567" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={supplierForm.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sitio Web</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://www.proveedor.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Information */}
                <Separator />
                <h3 className="text-lg font-semibold">Dirección</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={supplierForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Dirección completa del proveedor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="neighborhood"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sector/Barrio</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Sector o barrio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ciudad" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="province"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provincia</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione provincia" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Distrito Nacional">Distrito Nacional</SelectItem>
                            <SelectItem value="Santo Domingo">Santo Domingo</SelectItem>
                            <SelectItem value="Santiago">Santiago</SelectItem>
                            <SelectItem value="La Altagracia">La Altagracia</SelectItem>
                            <SelectItem value="Puerto Plata">Puerto Plata</SelectItem>
                            <SelectItem value="La Romana">La Romana</SelectItem>
                            <SelectItem value="San Cristóbal">San Cristóbal</SelectItem>
                            <SelectItem value="Duarte">Duarte</SelectItem>
                            <SelectItem value="La Vega">La Vega</SelectItem>
                            <SelectItem value="Azua">Azua</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Postal</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Código postal" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Business Terms */}
                <Separator />
                <h3 className="text-lg font-semibold">Términos Comerciales</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={supplierForm.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Términos de Pago (días)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="0"
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                            placeholder="30" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="creditLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Límite de Crédito</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="0"
                            step="0.01"
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            placeholder="0.00" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Moneda</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DOP">Peso Dominicano (DOP)</SelectItem>
                            <SelectItem value="USD">Dólar Americano (USD)</SelectItem>
                            <SelectItem value="EUR">Euro (EUR)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={supplierForm.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prioridad</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="medium">Media</SelectItem>
                            <SelectItem value="low">Baja</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <FormField
                    control={supplierForm.control}
                    name="taxWithholding"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Aplica retención de impuestos
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowSupplierDialog(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                  >
                    {createSupplierMutation.isPending || updateSupplierMutation.isPending 
                      ? "Guardando..." 
                      : editingSupplier ? "Actualizar" : "Crear Proveedor"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Suppliers;