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
import { useToast } from "@/hooks/use-toast";
import { 
  Building, Plus, Search, Edit, Eye, Download, Send, Printer, 
  Calculator, Package, Calendar, AlertTriangle, CheckCircle,
  DollarSign, Receipt, User, CreditCard, Clock, Filter,
  ArrowUp, ArrowDown, RotateCcw, Copy, Trash2, ExternalLink,
  Building2, MapPin, Phone, Mail, UserCheck, UserX, UserPlus,
  FileText, History, Star, TrendingUp, TrendingDown, AlertCircle,
  Globe, Smartphone, Flag, Shield, Settings, Target, Zap, Truck,
  Factory, Store, Users
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
  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['/api/suppliers'],
  });

  const { data: supplierStats } = useQuery({
    queryKey: ['/api/suppliers/statistics'],
  });

  const { data: purchaseOrders } = useQuery({
    queryKey: ['/api/purchase-orders'],
  });

  const { data: supplierPerformance } = useQuery({
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Rendimiento de Proveedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Métricas de rendimiento en desarrollo</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Gestión de Documentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Gestión de documentos en desarrollo</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Análisis de Proveedores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Análisis avanzado en desarrollo</p>
                </div>
              </CardContent>
            </Card>
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

                {/* Rest of the form continues... */}
                {/* This is a simplified version - the full form would include all fields */}

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