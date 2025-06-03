import { createContext, useContext } from 'react';

export type Language = 'es' | 'en';

export interface TranslationKeys {
  // Authentication
  'auth.login': string;
  'auth.register': string;
  'auth.email': string;
  'auth.password': string;
  'auth.firstName': string;
  'auth.lastName': string;
  'auth.companyName': string;
  'auth.welcome': string;
  'auth.welcomeBack': string;
  'auth.createAccount': string;
  'auth.alreadyHaveAccount': string;
  'auth.dontHaveAccount': string;
  'auth.forgotPassword': string;
  'auth.loginFailed': string;
  'auth.registrationFailed': string;
  'auth.invalidCredentials': string;
  
  // Navigation
  'nav.dashboard': string;
  'nav.products': string;
  'nav.customers': string;
  'nav.sales': string;
  'nav.inventory': string;
  'nav.warehouses': string;
  'nav.manufacturing': string;
  'nav.employees': string;
  'nav.payroll': string;
  'nav.billing': string;
  'nav.reports': string;
  'nav.settings': string;
  'nav.chat': string;
  'nav.aiInsights': string;
  'nav.pos': string;
  'nav.fiscalDocuments': string;
  'nav.notifications': string;
  'nav.profile': string;
  'nav.logout': string;
  
  // Dashboard
  'dashboard.title': string;
  'dashboard.totalSales': string;
  'dashboard.totalProducts': string;
  'dashboard.totalCustomers': string;
  'dashboard.pendingOrders': string;
  'dashboard.recentSales': string;
  'dashboard.topProducts': string;
  'dashboard.lowStock': string;
  'dashboard.salesTrend': string;
  
  // Common
  'common.loading': string;
  'common.save': string;
  'common.cancel': string;
  'common.delete': string;
  'common.edit': string;
  'common.add': string;
  'common.search': string;
  'common.filter': string;
  'common.export': string;
  'common.import': string;
  'common.print': string;
  'common.yes': string;
  'common.no': string;
  'common.confirm': string;
  'common.back': string;
  'common.next': string;
  'common.previous': string;
  'common.total': string;
  'common.subtotal': string;
  'common.tax': string;
  'common.discount': string;
  'common.quantity': string;
  'common.price': string;
  'common.amount': string;
  'common.date': string;
  'common.status': string;
  'common.active': string;
  'common.inactive': string;
  'common.pending': string;
  'common.completed': string;
  'common.cancelled': string;
  'common.actions': string;
  
  // Subscription Plans
  'plans.title': string;
  'plans.selectPlan': string;
  'plans.currentPlan': string;
  'plans.upgradePlan': string;
  'plans.monthly': string;
  'plans.annually': string;
  'plans.save': string;
  'plans.mostPopular': string;
  'plans.features': string;
  'plans.getStarted': string;
  'plans.contactSales': string;
  
  // Plan Names
  'plans.starter.name': string;
  'plans.starter.description': string;
  'plans.professional.name': string;
  'plans.professional.description': string;
  'plans.business.name': string;
  'plans.business.description': string;
  'plans.enterprise.name': string;
  'plans.enterprise.description': string;
  'plans.enterprise.plus.name': string;
  'plans.enterprise.plus.description': string;
  
  // Footer
  'footer.rights': string;
  'footer.company': string;
  'footer.support': string;
  'footer.legal': string;
  'footer.privacy': string;
  'footer.terms': string;
}

export const translations: Record<Language, TranslationKeys> = {
  es: {
    // Authentication
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Registrarse',
    'auth.email': 'Correo Electrónico',
    'auth.password': 'Contraseña',
    'auth.firstName': 'Nombre',
    'auth.lastName': 'Apellido',
    'auth.companyName': 'Nombre de la Empresa',
    'auth.welcome': 'Bienvenido a Four One Solutions',
    'auth.welcomeBack': 'Bienvenido de vuelta',
    'auth.createAccount': 'Crear Cuenta',
    'auth.alreadyHaveAccount': '¿Ya tienes una cuenta?',
    'auth.dontHaveAccount': '¿No tienes una cuenta?',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.loginFailed': 'Error al iniciar sesión',
    'auth.registrationFailed': 'Error al registrarse',
    'auth.invalidCredentials': 'Credenciales inválidas',
    
    // Navigation
    'nav.dashboard': 'Panel Principal',
    'nav.products': 'Productos',
    'nav.customers': 'Clientes',
    'nav.sales': 'Ventas',
    'nav.inventory': 'Inventario',
    'nav.warehouses': 'Almacenes',
    'nav.manufacturing': 'Manufactura',
    'nav.employees': 'Empleados',
    'nav.payroll': 'Nómina',
    'nav.billing': 'Facturación',
    'nav.reports': 'Reportes',
    'nav.settings': 'Configuración',
    'nav.chat': 'Chat',
    'nav.aiInsights': 'IA Insights',
    'nav.pos': 'Punto de Venta',
    'nav.fiscalDocuments': 'Documentos Fiscales',
    'nav.notifications': 'Notificaciones',
    'nav.profile': 'Perfil',
    'nav.logout': 'Cerrar Sesión',
    
    // Dashboard
    'dashboard.title': 'Panel Principal',
    'dashboard.totalSales': 'Ventas Totales',
    'dashboard.totalProducts': 'Productos Totales',
    'dashboard.totalCustomers': 'Clientes Totales',
    'dashboard.pendingOrders': 'Órdenes Pendientes',
    'dashboard.recentSales': 'Ventas Recientes',
    'dashboard.topProducts': 'Productos Destacados',
    'dashboard.lowStock': 'Stock Bajo',
    'dashboard.salesTrend': 'Tendencia de Ventas',
    
    // Common
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.add': 'Agregar',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    'common.print': 'Imprimir',
    'common.yes': 'Sí',
    'common.no': 'No',
    'common.confirm': 'Confirmar',
    'common.back': 'Atrás',
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.total': 'Total',
    'common.subtotal': 'Subtotal',
    'common.tax': 'Impuesto',
    'common.discount': 'Descuento',
    'common.quantity': 'Cantidad',
    'common.price': 'Precio',
    'common.amount': 'Monto',
    'common.date': 'Fecha',
    'common.status': 'Estado',
    'common.active': 'Activo',
    'common.inactive': 'Inactivo',
    'common.pending': 'Pendiente',
    'common.completed': 'Completado',
    'common.cancelled': 'Cancelado',
    'common.actions': 'Acciones',
    
    // Subscription Plans
    'plans.title': 'Planes de Suscripción',
    'plans.selectPlan': 'Seleccionar Plan',
    'plans.currentPlan': 'Plan Actual',
    'plans.upgradePlan': 'Actualizar Plan',
    'plans.monthly': 'Mensual',
    'plans.annually': 'Anual',
    'plans.save': 'Ahorras',
    'plans.mostPopular': 'Más Popular',
    'plans.features': 'Características',
    'plans.getStarted': 'Comenzar',
    'plans.contactSales': 'Contactar Ventas',
    
    // Plan Names
    'plans.starter.name': 'Iniciador',
    'plans.starter.description': 'Perfecto para pequeños negocios que están comenzando',
    'plans.professional.name': 'Profesional',
    'plans.professional.description': 'Ideal para empresas en crecimiento con necesidades avanzadas',
    'plans.business.name': 'Empresarial',
    'plans.business.description': 'Para empresas establecidas que requieren funcionalidades completas',
    'plans.enterprise.name': 'Corporativo',
    'plans.enterprise.description': 'Solución completa para grandes corporaciones',
    'plans.enterprise.plus.name': 'Corporativo Plus',
    'plans.enterprise.plus.description': 'Máximo nivel con soporte 24/7 y consultoría personalizada',
    
    // Footer
    'footer.rights': 'Todos los derechos reservados',
    'footer.company': 'Four One Solutions',
    'footer.support': 'Soporte',
    'footer.legal': 'Legal',
    'footer.privacy': 'Privacidad',
    'footer.terms': 'Términos',
  },
  
  en: {
    // Authentication
    'auth.login': 'Sign In',
    'auth.register': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.firstName': 'First Name',
    'auth.lastName': 'Last Name',
    'auth.companyName': 'Company Name',
    'auth.welcome': 'Welcome to Four One Solutions',
    'auth.welcomeBack': 'Welcome back',
    'auth.createAccount': 'Create Account',
    'auth.alreadyHaveAccount': 'Already have an account?',
    'auth.dontHaveAccount': "Don't have an account?",
    'auth.forgotPassword': 'Forgot your password?',
    'auth.loginFailed': 'Login failed',
    'auth.registrationFailed': 'Registration failed',
    'auth.invalidCredentials': 'Invalid credentials',
    
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.products': 'Products',
    'nav.customers': 'Customers',
    'nav.sales': 'Sales',
    'nav.inventory': 'Inventory',
    'nav.warehouses': 'Warehouses',
    'nav.manufacturing': 'Manufacturing',
    'nav.employees': 'Employees',
    'nav.payroll': 'Payroll',
    'nav.billing': 'Billing',
    'nav.reports': 'Reports',
    'nav.settings': 'Settings',
    'nav.chat': 'Chat',
    'nav.aiInsights': 'AI Insights',
    'nav.pos': 'Point of Sale',
    'nav.fiscalDocuments': 'Fiscal Documents',
    'nav.notifications': 'Notifications',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalSales': 'Total Sales',
    'dashboard.totalProducts': 'Total Products',
    'dashboard.totalCustomers': 'Total Customers',
    'dashboard.pendingOrders': 'Pending Orders',
    'dashboard.recentSales': 'Recent Sales',
    'dashboard.topProducts': 'Top Products',
    'dashboard.lowStock': 'Low Stock',
    'dashboard.salesTrend': 'Sales Trend',
    
    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.print': 'Print',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.confirm': 'Confirm',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.total': 'Total',
    'common.subtotal': 'Subtotal',
    'common.tax': 'Tax',
    'common.discount': 'Discount',
    'common.quantity': 'Quantity',
    'common.price': 'Price',
    'common.amount': 'Amount',
    'common.date': 'Date',
    'common.status': 'Status',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.pending': 'Pending',
    'common.completed': 'Completed',
    'common.cancelled': 'Cancelled',
    'common.actions': 'Actions',
    
    // Subscription Plans
    'plans.title': 'Subscription Plans',
    'plans.selectPlan': 'Select Plan',
    'plans.currentPlan': 'Current Plan',
    'plans.upgradePlan': 'Upgrade Plan',
    'plans.monthly': 'Monthly',
    'plans.annually': 'Annually',
    'plans.save': 'Save',
    'plans.mostPopular': 'Most Popular',
    'plans.features': 'Features',
    'plans.getStarted': 'Get Started',
    'plans.contactSales': 'Contact Sales',
    
    // Plan Names
    'plans.starter.name': 'Starter',
    'plans.starter.description': 'Perfect for small businesses getting started',
    'plans.professional.name': 'Professional',
    'plans.professional.description': 'Ideal for growing companies with advanced needs',
    'plans.business.name': 'Business',
    'plans.business.description': 'For established businesses requiring full functionality',
    'plans.enterprise.name': 'Enterprise',
    'plans.enterprise.description': 'Complete solution for large corporations',
    'plans.enterprise.plus.name': 'Enterprise Plus',
    'plans.enterprise.plus.description': 'Ultimate tier with 24/7 support and custom consulting',
    
    // Footer
    'footer.rights': 'All rights reserved',
    'footer.company': 'Four One Solutions',
    'footer.support': 'Support',
    'footer.legal': 'Legal',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
  }
};

export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
}>({
  language: 'es',
  setLanguage: () => {},
  t: () => ''
});

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};