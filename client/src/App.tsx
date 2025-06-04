import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/Sidebar";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

// Pages
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import Billing from "@/pages/Billing";
import Customers from "@/pages/Customers";
import Products from "@/pages/Products";
import Chat from "@/pages/Chat";
import UserManagement from "@/pages/UserManagement";
import Manufacturing from "@/pages/Manufacturing";
import BOM from "@/pages/BOM";
import POS from "@/pages/POS";
import Setup from "@/pages/Setup";
import SuperAdmin from "@/pages/SuperAdmin";
import CompanySettings from "@/pages/CompanySettings";
import SalesReports from "@/pages/SalesReports";
import POSSales from "@/pages/POSSales";
import Warehouses from "@/pages/Warehouses";
import Movements from "@/pages/Movements";
import Profile from "@/pages/Profile";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import Employees from "@/pages/Employees";
import Payroll from "@/pages/Payroll";
import FiscalDocuments from "@/pages/FiscalDocuments";
import AIInsights from "@/pages/AIInsights";
import SubscriptionPlans from "@/pages/SubscriptionPlans";
import CompanyAnalytics from "@/pages/CompanyAnalytics";
import NotFound from "@/pages/not-found";
import LoginAnimation from "@/components/LoginAnimation";

function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType }) {
  // Check user authentication status
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  const { toast } = useToast();
  const isAuthenticated = !!user;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Acceso no autorizado",
        description: "Debes iniciar sesión para acceder a esta página.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center z-50">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-8">
            <div className="relative">
              <div className="w-24 h-24 mx-auto border-4 border-blue-300 border-t-white rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="text-blue-900 font-bold text-xl">41</div>
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">Four One Solutions</h1>
          <p className="text-blue-200 mb-8 text-lg">Soluciones Empresariales Dominicanas</p>
          
          <div className="w-full bg-blue-800 rounded-full h-2 mb-6">
            <div className="bg-gradient-to-r from-blue-400 to-white h-2 rounded-full animate-pulse"></div>
          </div>
          
          <p className="text-blue-300 text-xs">© 2025 Four One Solutions - Tecnología Empresarial Dominicana</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6">
          <Component {...props} />
        </div>
      </main>
    </div>
  );
}

function Router() {
  // Check user authentication status
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  const [setupComplete, setSetupComplete] = useState(false);
  const isAuthenticated = !!user;
  
  // Check if user has company configured
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["/api/companies/current"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Show loading during authentication check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Show auth page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Show setup page if no company is configured
  if (!companyLoading && company && (!company.name || company.name === "Mi Empresa") && !setupComplete) {
    return <Setup onComplete={() => setSetupComplete(true)} />;
  }

  // Show authenticated routes
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/billing" component={() => <ProtectedRoute component={Billing} />} />
      <Route path="/customers" component={() => <ProtectedRoute component={Customers} />} />
      <Route path="/products" component={() => <ProtectedRoute component={Products} />} />
      <Route path="/manufacturing" component={() => <ProtectedRoute component={Manufacturing} />} />
      <Route path="/pos" component={() => <ProtectedRoute component={POS} />} />
      
      {/* Active functional routes */}
      <Route path="/sales-reports" component={() => <ProtectedRoute component={SalesReports} />} />
      <Route path="/pos-sales" component={() => <ProtectedRoute component={POSSales} />} />
      <Route path="/warehouses" component={() => <ProtectedRoute component={Warehouses} />} />
      <Route path="/bom" component={() => <ProtectedRoute component={BOM} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={SuperAdmin} />} />
      <Route path="/companies" component={() => <ProtectedRoute component={CompanySettings} />} />
      <Route path="/company-settings" component={() => <ProtectedRoute component={CompanySettings} />} />
      
      {/* Active functional routes continued */}
      <Route path="/movements" component={() => <ProtectedRoute component={Movements} />} />
      <Route path="/recipes" component={() => <ProtectedRoute component={Manufacturing} />} />
      <Route path="/suppliers" component={() => <ProtectedRoute component={Customers} />} />
      <Route path="/purchase-orders" component={() => <ProtectedRoute component={Dashboard} />} />
      
      {/* HR and Payroll routes */}
      <Route path="/employees" component={() => <ProtectedRoute component={Employees} />} />
      <Route path="/payroll" component={() => <ProtectedRoute component={Payroll} />} />
      
      {/* Fiscal Documents route */}
      <Route path="/fiscal-documents" component={() => <ProtectedRoute component={FiscalDocuments} />} />
      
      {/* AI Integration route */}
      <Route path="/ai-insights" component={() => <ProtectedRoute component={AIInsights} />} />
      
      {/* Subscription Plans route */}
      <Route path="/plans" component={SubscriptionPlans} />
      
      {/* Communication routes */}
      <Route path="/chat" component={() => <ProtectedRoute component={Chat} />} />
      <Route path="/user-management" component={() => <ProtectedRoute component={UserManagement} />} />
      
      {/* Admin routes */}
      <Route path="/super-admin" component={() => <ProtectedRoute component={SuperAdmin} />} />
      <Route path="/company-analytics" component={() => <ProtectedRoute component={CompanyAnalytics} />} />
      
      {/* Profile menu routes */}
      <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
      <Route path="/notifications" component={() => <ProtectedRoute component={Notifications} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
