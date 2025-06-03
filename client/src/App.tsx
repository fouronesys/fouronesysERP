import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";

// Pages
import Landing from "@/pages/Landing";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Billing from "@/pages/Billing";
import Customers from "@/pages/Customers";
import Products from "@/pages/Products";
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
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component, ...props }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Acceso no autorizado",
        description: "Debes iniciar sesión para acceder a esta página.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
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
  const { isAuthenticated, isLoading } = useAuth();
  const [setupComplete, setSetupComplete] = useState(false);
  
  // Check if user has company configured
  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ["/api/companies/current"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Show landing page for unauthenticated users or while loading
  if (isLoading || !isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/register" component={Register} />
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
      
      {/* Active functional routes continued */}
      <Route path="/movements" component={() => <ProtectedRoute component={Movements} />} />
      <Route path="/recipes" component={() => <ProtectedRoute component={Manufacturing} />} />
      <Route path="/suppliers" component={() => <ProtectedRoute component={Customers} />} />
      <Route path="/purchase-orders" component={() => <ProtectedRoute component={Dashboard} />} />
      
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
