import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Shield, Star } from "lucide-react";
import logoImage from "@assets/Four One Solutions Logo_20250130_143033_0000.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <img 
              src={logoImage} 
              alt="Four One Solutions Logo" 
              className="w-20 h-20 object-contain"
            />
            <div className="ml-6">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Four One Solutions
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Sistema integral de gestión empresarial para República Dominicana
              </p>
            </div>
          </div>
          
          <div className="max-w-3xl mx-auto mb-8">
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-6">
              Gestiona tu empresa con todas las herramientas que necesitas: facturación, inventario, 
              producción y más. Adaptado específicamente para las normativas dominicanas.
            </p>
            
            <Button 
              onClick={() => window.location.href = "/api/login"}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              Comenzar Prueba Gratuita de 7 Días
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Facturación Completa
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                NCF automáticos, ITBIS, reportes para DGII y más
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Gestión de Inventario
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Control de stock, movimientos y alertas automáticas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Módulo de Producción
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                BOM, recetas, órdenes de producción y costos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Planes Diseñados Para Tu Empresa
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Comienza con 7 días gratis, sin compromiso
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Plan Mensual */}
            <Card className="border-2 border-gray-200 dark:border-gray-700">
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Plan Mensual</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Flexibilidad mes a mes</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">RD$ 25,000</span>
                    <span className="text-gray-600 dark:text-gray-400"> instalación</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-blue-600">RD$ 2,500</span>
                    <span className="text-gray-600 dark:text-gray-400">/mes</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    "Facturación completa con NCF",
                    "Punto de venta (POS)",
                    "Gestión de inventario",
                    "Clientes y proveedores",
                    "Reportes básicos",
                    "Hasta 5 usuarios"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => window.location.href = "/api/login"}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Comenzar Prueba Gratuita
                </Button>
              </CardContent>
            </Card>

            {/* Plan Anual */}
            <Card className="border-2 border-green-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                  <Star className="h-4 w-4 mr-1" />
                  Ahorra RD$ 6,000
                </div>
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Plan Anual</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">2 meses gratis al pagar anual</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">RD$ 35,000</span>
                    <span className="text-gray-600 dark:text-gray-400"> instalación</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-green-600">RD$ 24,000</span>
                    <span className="text-gray-600 dark:text-gray-400">/año</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400 line-through">RD$ 30,000/año</span>
                    <span className="text-sm text-green-600 ml-2 font-medium">¡Ahorra RD$ 6,000!</span>
                  </div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {[
                    "Todo del plan mensual incluido",
                    "Módulo de producción completo",
                    "Lista de materiales (BOM)",
                    "Gestión de recetas",
                    "Reportes avanzados",
                    "Usuarios ilimitados",
                    "Soporte prioritario",
                    "2 meses gratis",
                    "Descuentos en hosting"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-green-500 mr-3" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => window.location.href = "/api/login"}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Comenzar Prueba Gratuita
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-12">
            <div className="flex items-center justify-center text-gray-600 dark:text-gray-400 mb-4">
              <Shield className="h-5 w-5 text-green-500 mr-2" />
              7 días de prueba gratuita • Sin compromiso • Cancela cuando quieras
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cumplimos con todas las normativas de República Dominicana (DGII, ITBIS, NCF)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
