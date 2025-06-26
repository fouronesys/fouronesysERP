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
  Users, Plus, Search, Edit, Eye, Download, Send, Printer, 
  Calculator, Package, Calendar, AlertTriangle, CheckCircle,
  DollarSign, Receipt, Building, User, CreditCard, Clock, Filter,
  ArrowUp, ArrowDown, RotateCcw, Copy, Trash2, ExternalLink,
  Building2, MapPin, Phone, Mail, UserCheck, UserX, UserPlus,
  FileText, History, Star, TrendingUp, TrendingDown, AlertCircle,
  Globe, Smartphone, Flag, Shield, Settings, Target, Zap
} from "lucide-react";

// Enhanced Customer Schema with Dominican Requirements
const customerSchema = z.object({
  // Basic Information
  customerType: z.enum(["individual", "business", "government"], {
    required_error: "El tipo de cliente es requerido"
  }),
  name: z.string().min(1, "El nombre es requerido"),
  businessName: z.string().optional(),
  rnc: z.string().optional(),
  cedula: z.string().optional(),
  passport: z.string().optional(),
  
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
  customerGroup: z.enum(["regular", "vip", "wholesale", "special_regime"]).default("regular"),
  creditLimit: z.number().min(0).default(0),
  paymentTerms: z.number().min(0).default(0), // days
  currency: z.enum(["DOP", "USD", "EUR"]).default("DOP"),
  taxExempt: z.boolean().default(false),
  
  // Classification
  status: z.enum(["active", "inactive", "overdue", "blocked"]).default("active"),
  salesRepId: z.string().optional(),
  priceListId: z.string().optional(),
  discountPercentage: z.number().min(0).max(100).default(0),
  
  // Contact Persons
  contactPersons: z.array(z.object({
    name: z.string(),
    position: z.string(),
    phone: z.string(),
    email: z.string().email(),
    isPrimary: z.boolean().default(false)
  })).default([]),
  
  // Additional Information
  industry: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  
  // Dominican Specific
  municipalRegistration: z.string().optional(),
  dgiiCategory: z.enum(["normal", "large", "special", "simplified"]).default("normal"),
  
  // Preferences
  preferredContactMethod: z.enum(["email", "phone", "whatsapp", "sms"]).default("email"),
  marketingOptIn: z.boolean().default(false),
  invoiceByEmail: z.boolean().default(true)
});

const Customers = () => {
  const [activeTab, setActiveTab] = useState("customers");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [rncValidating, setRncValidating] = useState(false);
  const [contactPersons, setContactPersons] = useState<any[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Data queries
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/customers'],
  });

  const { data: salesReps } = useQuery({
    queryKey: ['/api/employees', { department: 'sales' }],
  });

  const { data: priceLists } = useQuery({
    queryKey: ['/api/price-lists'],
  });

  const { data: customerStats } = useQuery({
    queryKey: ['/api/customers/statistics'],
  });

  const { data: customerHistory } = useQuery({
    queryKey: ['/api/customers', selectedCustomer?.id, 'history'],
    enabled: !!selectedCustomer?.id
  });

  // Forms
  const customerForm = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customerType: "business",
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
      customerGroup: "regular",
      creditLimit: 0,
      paymentTerms: 0,
      currency: "DOP",
      taxExempt: false,
      status: "active",
      discountPercentage: 0,
      contactPersons: [],
      notes: "",
      internalNotes: "",
      tags: [],
      dgiiCategory: "normal",
      preferredContactMethod: "email",
      marketingOptIn: false,
      invoiceByEmail: true
    }
  });

  // Mutations
  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/customers', {
      method: 'POST',
      body: JSON.stringify({ ...data, contactPersons })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/statistics'] });
      setShowCustomerDialog(false);
      setContactPersons([]);
      customerForm.reset();
      toast({ title: "Cliente creado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al crear cliente", description: error.message, variant: "destructive" });
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/customers/${editingCustomer.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data, contactPersons })
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers/statistics'] });
      setShowCustomerDialog(false);
      setEditingCustomer(null);
      setContactPersons([]);
      customerForm.reset();
      toast({ title: "Cliente actualizado exitosamente" });
    },
    onError: (error: any) => {
      toast({ title: "Error al actualizar cliente", description: error.message, variant: "destructive" });
    }
  });

  const validateRNCMutation = useMutation({
    mutationFn: (rnc: string) => apiRequest('/api/dgii/validate-rnc', {
      method: 'POST',
      body: JSON.stringify({ rnc })
    }),
    onSuccess: (data: any) => {
      if (data.valid) {
        customerForm.setValue("businessName", data.businessName || "");
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
  const validateRNC = (rnc: string) => {
    if (rnc && rnc.length >= 9) {
      setRncValidating(true);
      validateRNCMutation.mutate(rnc);
    }
  };

  const getCustomerStatusBadge = (status: string) => {
    const statuses = {
      active: { label: "Activo", color: "bg-green-100 text-green-800", icon: CheckCircle },
      inactive: { label: "Inactivo", color: "bg-gray-100 text-gray-800", icon: UserX },
      overdue: { label: "Moroso", color: "bg-red-100 text-red-800", icon: AlertTriangle },
      blocked: { label: "Bloqueado", color: "bg-red-200 text-red-900", icon: Shield }
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

  const getCustomerGroupBadge = (group: string) => {
    const groups = {
      regular: { label: "Regular", color: "bg-blue-100 text-blue-800" },
      vip: { label: "VIP", color: "bg-purple-100 text-purple-800" },
      wholesale: { label: "Mayorista", color: "bg-orange-100 text-orange-800" },
      special_regime: { label: "Régimen Especial", color: "bg-indigo-100 text-indigo-800" }
    };
    const groupConfig = groups[group as keyof typeof groups] || groups.regular;
    return <Badge className={groupConfig.color}>{groupConfig.label}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = "DOP") => {
    const symbols = { DOP: "RD$", USD: "$", EUR: "€" };
    return `${symbols[currency as keyof typeof symbols] || "RD$"} ${amount.toLocaleString()}`;
  };

  const addContactPerson = () => {
    setContactPersons([...contactPersons, {
      name: "",
      position: "",
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

  // Filter customers
  const filteredCustomers = customers?.filter((customer: any) => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.rnc?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    const matchesGroup = groupFilter === "all" || customer.customerGroup === groupFilter;
    
    return matchesSearch && matchesStatus && matchesGroup;
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

  if (isLoadingCustomers) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="Gestión de Clientes" />
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
      <Header title="Gestión de Clientes" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                Gestión de Clientes
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Sistema completo de CRM con validación DGII y clasificación inteligente
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowCustomerDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Cliente
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
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clientes</p>
                  <p className="text-2xl font-bold">{customerStats?.total || customers?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clientes Activos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {customers?.filter((c: any) => c.status === 'active').length || 0}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clientes VIP</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {customers?.filter((c: any) => c.customerGroup === 'vip').length || 0}
                  </p>
                </div>
                <Star className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Clientes Morosos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {customers?.filter((c: any) => c.status === 'overdue').length || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Grupos y Segmentación
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Análisis y Reportes
            </TabsTrigger>
          </TabsList>

          {/* Main Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Directorio de Clientes
                  </CardTitle>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Buscar por nombre, RNC, email..."
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
                        <SelectItem value="overdue">Morosos</SelectItem>
                        <SelectItem value="blocked">Bloqueados</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={groupFilter} onValueChange={setGroupFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los grupos</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="wholesale">Mayorista</SelectItem>
                        <SelectItem value="special_regime">Régimen Especial</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={() => setShowCustomerDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Cliente
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredCustomers?.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No hay clientes registrados</p>
                      <Button 
                        onClick={() => setShowCustomerDialog(true)} 
                        className="mt-4"
                        variant="outline"
                      >
                        Crear primer cliente
                      </Button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Ubicación</TableHead>
                            <TableHead>Grupo</TableHead>
                            <TableHead>Límite Crédito</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCustomers?.map((customer: any) => (
                            <TableRow key={customer.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{customer.name}</div>
                                  {customer.businessName && (
                                    <div className="text-sm text-gray-500">{customer.businessName}</div>
                                  )}
                                  {customer.rnc && (
                                    <div className="text-sm text-gray-500">RNC: {customer.rnc}</div>
                                  )}
                                  {customer.customerType === "individual" && customer.cedula && (
                                    <div className="text-sm text-gray-500">Cédula: {customer.cedula}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  {customer.email && (
                                    <div className="flex items-center gap-1 text-sm">
                                      <Mail className="h-3 w-3" />
                                      {customer.email}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-1 text-sm">
                                    <Phone className="h-3 w-3" />
                                    {customer.phone}
                                  </div>
                                  {customer.mobile && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                      <Smartphone className="h-3 w-3" />
                                      {customer.mobile}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="flex items-center gap-1 text-sm">
                                    <MapPin className="h-3 w-3" />
                                    {customer.city}
                                  </div>
                                  <div className="text-sm text-gray-500">{customer.province}</div>
                                  {customer.neighborhood && (
                                    <div className="text-sm text-gray-500">{customer.neighborhood}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getCustomerGroupBadge(customer.customerGroup)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">
                                    {formatCurrency(customer.creditLimit, customer.currency)}
                                  </div>
                                  {customer.paymentTerms > 0 && (
                                    <div className="text-sm text-gray-500">
                                      {customer.paymentTerms} días
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {getCustomerStatusBadge(customer.status)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setSelectedCustomer(customer)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setEditingCustomer(customer);
                                      setContactPersons(customer.contactPersons || []);
                                      customerForm.reset(customer);
                                      setShowCustomerDialog(true);
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

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-6">
            {/* Customer Groups Management */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5" />
                          Grupos de Clientes
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          Organiza y segmenta tus clientes por características específicas
                        </p>
                      </div>
                      <Button onClick={() => setShowGroupDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Grupo
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {/* Default Groups */}
                      <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Clientes VIP</h3>
                            <p className="text-sm text-blue-600 dark:text-blue-400">Clientes con compras superiores a RD$500,000</p>
                          </div>
                          <Badge variant="secondary">
                            {customers?.filter((c: any) => (c.totalPurchases || 0) > 500000).length || 0} clientes
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-green-800 dark:text-green-200">Empresas</h3>
                            <p className="text-sm text-green-600 dark:text-green-400">Clientes con RNC registrado</p>
                          </div>
                          <Badge variant="secondary">
                            {customers?.filter((c: any) => c.rnc && c.rnc.length >= 9).length || 0} clientes
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-orange-800 dark:text-orange-200">Nuevos Clientes</h3>
                            <p className="text-sm text-orange-600 dark:text-orange-400">Registrados en los últimos 30 días</p>
                          </div>
                          <Badge variant="secondary">
                            {customers?.filter((c: any) => {
                              const createdDate = new Date(c.createdAt);
                              const thirtyDaysAgo = new Date();
                              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                              return createdDate > thirtyDaysAgo;
                            }).length || 0} clientes
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-red-800 dark:text-red-200">Clientes Inactivos</h3>
                            <p className="text-sm text-red-600 dark:text-red-400">Sin compras en los últimos 90 días</p>
                          </div>
                          <Badge variant="secondary">
                            {customers?.filter((c: any) => {
                              if (!c.lastPurchaseDate) return true;
                              const lastPurchase = new Date(c.lastPurchaseDate);
                              const ninetyDaysAgo = new Date();
                              ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                              return lastPurchase < ninetyDaysAgo;
                            }).length || 0} clientes
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Advanced Segmentation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Segmentación Inteligente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Por Ubicación Geográfica</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Santo Domingo</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.city?.toLowerCase().includes('santo domingo')).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Santiago</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.city?.toLowerCase().includes('santiago')).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>La Romana</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.city?.toLowerCase().includes('romana')).length || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-2">Por Industria</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Retail/Comercio</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.industry?.toLowerCase().includes('retail') || c.industry?.toLowerCase().includes('comercio')).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Servicios</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.industry?.toLowerCase().includes('servicio')).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Manufactura</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.industry?.toLowerCase().includes('manufactura') || c.industry?.toLowerCase().includes('industrial')).length || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Customer Insights Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen de Segmentación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{customers?.length || 0}</div>
                        <p className="text-sm text-gray-600">Total de Clientes</p>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Activos</span>
                          <Badge className="bg-green-100 text-green-800">
                            {customers?.filter((c: any) => c.status === 'active').length || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Con RNC</span>
                          <Badge className="bg-blue-100 text-blue-800">
                            {customers?.filter((c: any) => c.rnc && c.rnc.length >= 9).length || 0}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Con Email</span>
                          <Badge className="bg-purple-100 text-purple-800">
                            {customers?.filter((c: any) => c.email && c.email.includes('@')).length || 0}
                          </Badge>
                        </div>
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
                      <Button variant="outline" className="w-full justify-start">
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Email Masivo
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Segmento
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Target className="h-4 w-4 mr-2" />
                        Crear Campaña
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Customer Analytics Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Analytics */}
              <div className="lg:col-span-3 space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                          <p className="text-2xl font-bold">{customers?.length || 0}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <ArrowUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">+12%</span>
                        <span className="text-gray-600 ml-1">este mes</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Clientes Activos</p>
                          <p className="text-2xl font-bold">
                            {customers?.filter((c: any) => c.status === 'active').length || 0}
                          </p>
                        </div>
                        <UserCheck className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <span className="text-gray-600">
                          {Math.round(((customers?.filter((c: any) => c.status === 'active').length || 0) / (customers?.length || 1)) * 100)}% del total
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Valor Promedio</p>
                          <p className="text-2xl font-bold">RD$85,420</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-green-600">+8.5%</span>
                        <span className="text-gray-600 ml-1">vs. mes anterior</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">Nuevos Este Mes</p>
                          <p className="text-2xl font-bold">
                            {customers?.filter((c: any) => {
                              const createdDate = new Date(c.createdAt);
                              const thisMonth = new Date();
                              return createdDate.getMonth() === thisMonth.getMonth() && 
                                     createdDate.getFullYear() === thisMonth.getFullYear();
                            }).length || 0}
                          </p>
                        </div>
                        <UserPlus className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <Clock className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-gray-600">Últimos 30 días</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Customer Behavior Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Análisis de Comportamiento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-4">Distribución por Tipo</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Building className="h-4 w-4 text-blue-600" />
                              <span className="text-sm">Empresas</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${((customers?.filter((c: any) => c.customerType === 'business').length || 0) / (customers?.length || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                {customers?.filter((c: any) => c.customerType === 'business').length || 0}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-green-600" />
                              <span className="text-sm">Individuales</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${((customers?.filter((c: any) => c.customerType === 'individual').length || 0) / (customers?.length || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                {customers?.filter((c: any) => c.customerType === 'individual').length || 0}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-purple-600" />
                              <span className="text-sm">Gobierno</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-600 h-2 rounded-full" 
                                  style={{ width: `${((customers?.filter((c: any) => c.customerType === 'government').length || 0) / (customers?.length || 1)) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                {customers?.filter((c: any) => c.customerType === 'government').length || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-4">Estado de Cuentas</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Al día</span>
                            <Badge className="bg-green-100 text-green-800">
                              {customers?.filter((c: any) => c.paymentStatus === 'current' || !c.paymentStatus).length || 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Vencidas 1-30 días</span>
                            <Badge className="bg-yellow-100 text-yellow-800">
                              {customers?.filter((c: any) => c.paymentStatus === 'overdue_30').length || 0}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Vencidas +30 días</span>
                            <Badge className="bg-red-100 text-red-800">
                              {customers?.filter((c: any) => c.paymentStatus === 'overdue_60').length || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Geographic Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Distribución Geográfica
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3">Top Ciudades</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Santo Domingo</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.city?.toLowerCase().includes('santo domingo')).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Santiago</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.city?.toLowerCase().includes('santiago')).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>La Romana</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.city?.toLowerCase().includes('romana')).length || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3">Top Provincias</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Distrito Nacional</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.province?.toLowerCase().includes('distrito')).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Santo Domingo</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.province?.toLowerCase().includes('santo')).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Santiago</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.province?.toLowerCase().includes('santiago')).length || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium mb-3">Contacto Digital</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Con Email</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.email && c.email.includes('@')).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Con Móvil</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.mobile && c.mobile.length > 0).length || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Con Website</span>
                            <Badge variant="outline">
                              {customers?.filter((c: any) => c.website && c.website.length > 0).length || 0}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Insights Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Insights Destacados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                          📊 Oportunidad de Crecimiento
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          El 65% de tus clientes no tienen email registrado. Considera una campaña de actualización de datos.
                        </p>
                      </div>
                      
                      <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                          💼 Foco Empresarial
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Los clientes empresariales representan mayor valor promedio. Considera programas de lealtad corporativa.
                        </p>
                      </div>
                      
                      <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                        <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                          🎯 Retención
                        </p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">
                          {customers?.filter((c: any) => {
                            if (!c.lastPurchaseDate) return true;
                            const lastPurchase = new Date(c.lastPurchaseDate);
                            const ninetyDaysAgo = new Date();
                            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                            return lastPurchase < ninetyDaysAgo;
                          }).length || 0} clientes están inactivos. Implementa campañas de reactivación.
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
                        <Mail className="h-4 w-4 mr-2" />
                        Campaña de Email
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Smartphone className="h-4 w-4 mr-2" />
                        SMS Promocional
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm">
                        <Star className="h-4 w-4 mr-2" />
                        Programa VIP
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
        </Tabs>

        {/* Customer Dialog */}
        <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
              </DialogTitle>
              <DialogDescription>
                Complete la información del cliente con validación automática de RNC
              </DialogDescription>
            </DialogHeader>

            <Form {...customerForm}>
              <form onSubmit={customerForm.handleSubmit((data) => {
                if (editingCustomer) {
                  updateCustomerMutation.mutate(data);
                } else {
                  createCustomerMutation.mutate(data);
                }
              })} className="space-y-6">
                
                {/* Customer Type and Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={customerForm.control}
                    name="customerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Cliente</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="business">Empresa</SelectItem>
                            <SelectItem value="individual">Persona Física</SelectItem>
                            <SelectItem value="government">Gobierno</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={customerForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Completo</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nombre del cliente" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {customerForm.watch("customerType") === "business" && (
                    <FormField
                      control={customerForm.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Comercial</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Razón social" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Identification Documents */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {customerForm.watch("customerType") === "business" && (
                    <FormField
                      control={customerForm.control}
                      name="rnc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>RNC</FormLabel>
                          <FormControl>
                            <div className="flex gap-2">
                              <Input 
                                {...field} 
                                placeholder="123456789"
                                onBlur={(e) => validateRNC(e.target.value)}
                              />
                              {rncValidating && (
                                <Button type="button" disabled size="sm">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                </Button>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {customerForm.watch("customerType") === "individual" && (
                    <FormField
                      control={customerForm.control}
                      name="cedula"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cédula</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="00000000000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={customerForm.control}
                    name="passport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pasaporte (Opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="A12345678" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <FormField
                    control={customerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="cliente@email.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={customerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono Principal</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(809) 000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={customerForm.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Móvil (Opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(849) 000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={customerForm.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sitio Web (Opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="www.ejemplo.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Dirección</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dirección Completa</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Calle, número, sector..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={customerForm.control}
                        name="neighborhood"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sector/Barrio</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Sector..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={customerForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ciudad</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Ciudad..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={customerForm.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provincia</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar provincia" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {dominicanProvinces.map((province) => (
                                  <SelectItem key={province} value={province}>
                                    {province}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={customerForm.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código Postal</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="00000" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Business Configuration */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Configuración Comercial</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={customerForm.control}
                      name="customerGroup"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grupo de Cliente</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="regular">Regular</SelectItem>
                              <SelectItem value="vip">VIP</SelectItem>
                              <SelectItem value="wholesale">Mayorista</SelectItem>
                              <SelectItem value="special_regime">Régimen Especial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="creditLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Límite de Crédito</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="paymentTerms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Términos de Pago (días)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
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
                              <SelectItem value="DOP">Peso Dominicano (RD$)</SelectItem>
                              <SelectItem value="USD">Dólar Americano ($)</SelectItem>
                              <SelectItem value="EUR">Euro (€)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Contact Persons */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Personas de Contacto</h3>
                    <Button type="button" onClick={addContactPerson} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Contacto
                    </Button>
                  </div>

                  {contactPersons.map((contact, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Nombre</Label>
                          <Input
                            value={contact.name}
                            onChange={(e) => updateContactPerson(index, 'name', e.target.value)}
                            placeholder="Nombre completo"
                          />
                        </div>
                        <div>
                          <Label>Cargo</Label>
                          <Input
                            value={contact.position}
                            onChange={(e) => updateContactPerson(index, 'position', e.target.value)}
                            placeholder="Cargo o posición"
                          />
                        </div>
                        <div>
                          <Label>Teléfono</Label>
                          <Input
                            value={contact.phone}
                            onChange={(e) => updateContactPerson(index, 'phone', e.target.value)}
                            placeholder="Teléfono"
                          />
                        </div>
                        <div>
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={contact.email}
                            onChange={(e) => updateContactPerson(index, 'email', e.target.value)}
                            placeholder="Email"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={contact.isPrimary}
                            onCheckedChange={(checked) => 
                              updateContactPerson(index, 'isPrimary', checked)
                            }
                          />
                          <label className="text-sm">Contacto principal</label>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeContactPerson(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Additional Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={customerForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas (Públicas)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Notas visibles para el equipo..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={customerForm.control}
                    name="internalNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas Internas</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Notas internas confidenciales..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Status and Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={customerForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                            <SelectItem value="overdue">Moroso</SelectItem>
                            <SelectItem value="blocked">Bloqueado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={customerForm.control}
                    name="preferredContactMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de Contacto Preferido</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Teléfono</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={customerForm.control}
                      name="taxExempt"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Exento de ITBIS</FormLabel>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="marketingOptIn"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Acepta Marketing</FormLabel>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={customerForm.control}
                      name="invoiceByEmail"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Facturar por Email</FormLabel>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowCustomerDialog(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                  >
                    {createCustomerMutation.isPending || updateCustomerMutation.isPending 
                      ? "Guardando..." 
                      : editingCustomer ? "Actualizar" : "Crear Cliente"
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

export default Customers;