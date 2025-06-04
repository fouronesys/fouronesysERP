import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Check, Star, Crown, Zap, Building2, Globe } from 'lucide-react';

import fourOneLogo from '@assets/Four One Solutions Logo.png';

interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isPopular?: boolean;
  icon: typeof Star;
  features: PlanFeature[];
  maxUsers: number;
  maxCompanies: number;
  storage: string;
  support: string;
  integrations: number;
}

export default function SubscriptionPlans() {
  const { t } = useTranslation();
  const [isYearly, setIsYearly] = useState(false);

  const plans: SubscriptionPlan[] = [
    {
      id: 'starter',
      name: t('plans.starter.name'),
      description: t('plans.starter.description'),
      monthlyPrice: 29,
      yearlyPrice: 290, // 2 meses gratis
      icon: Zap,
      maxUsers: 3,
      maxCompanies: 1,
      storage: '5 GB',
      support: 'Email',
      integrations: 5,
      features: [
        { name: 'Gestión básica de productos', included: true },
        { name: 'Punto de venta (POS)', included: true },
        { name: 'Facturación básica', included: true },
        { name: 'Inventario simple', included: true },
        { name: 'Reportes básicos', included: true },
        { name: 'Chat interno', included: true },
        { name: 'Documentos fiscales', included: true },
        { name: 'Manufactura avanzada', included: false },
        { name: 'Nómina y RRHH', included: false },
        { name: 'IA Insights', included: false },
        { name: 'Multi-almacén', included: false },
        { name: 'API avanzada', included: false },
      ]
    },
    {
      id: 'professional',
      name: t('plans.professional.name'),
      description: t('plans.professional.description'),
      monthlyPrice: 79,
      yearlyPrice: 790, // 2 meses gratis
      isPopular: true,
      icon: Star,
      maxUsers: 10,
      maxCompanies: 3,
      storage: '50 GB',
      support: 'Email + Chat',
      integrations: 15,
      features: [
        { name: 'Todo del plan Iniciador', included: true },
        { name: 'Manufactura y BOM', included: true },
        { name: 'Gestión de almacenes', included: true },
        { name: 'Nómina básica', included: true },
        { name: 'IA Insights básico', included: true },
        { name: 'Reportes avanzados', included: true },
        { name: 'Integraciones API', included: true },
        { name: 'Multiempresa (3 max)', included: true },
        { name: 'Soporte prioritario', included: true },
        { name: 'Backup automático', included: true },
        { name: 'RRHH avanzado', included: false },
        { name: 'Consultoría personalizada', included: false },
      ]
    },
    {
      id: 'business',
      name: t('plans.business.name'),
      description: t('plans.business.description'),
      monthlyPrice: 149,
      yearlyPrice: 1490, // 2 meses gratis
      icon: Building2,
      maxUsers: 25,
      maxCompanies: 10,
      storage: '200 GB',
      support: 'Email + Chat + Teléfono',
      integrations: 50,
      features: [
        { name: 'Todo del plan Profesional', included: true },
        { name: 'RRHH completo', included: true },
        { name: 'Nómina avanzada', included: true },
        { name: 'IA Insights avanzado', included: true },
        { name: 'Multi-almacén ilimitado', included: true },
        { name: 'API completa', included: true },
        { name: 'Multiempresa (10 max)', included: true },
        { name: 'Reportes ejecutivos', included: true },
        { name: 'Integraciones avanzadas', included: true },
        { name: 'Soporte telefónico', included: true },
        { name: 'Entrenamiento online', included: true },
        { name: 'Soporte 24/7', included: false },
      ]
    },
    {
      id: 'enterprise',
      name: t('plans.enterprise.name'),
      description: t('plans.enterprise.description'),
      monthlyPrice: 299,
      yearlyPrice: 2990, // 2 meses gratis
      icon: Crown,
      maxUsers: 100,
      maxCompanies: 25,
      storage: '1 TB',
      support: '24/7 Dedicado',
      integrations: 100,
      features: [
        { name: 'Todo del plan Empresarial', included: true },
        { name: 'Soporte 24/7 dedicado', included: true },
        { name: 'Consultoría mensual', included: true },
        { name: 'Desarrollo personalizado', included: true },
        { name: 'Integraciones ilimitadas', included: true },
        { name: 'Servidor dedicado', included: true },
        { name: 'Multiempresa ilimitado', included: true },
        { name: 'IA Insights premium', included: true },
        { name: 'Analíticas avanzadas', included: true },
        { name: 'Migración asistida', included: true },
        { name: 'SLA garantizado', included: true },
        { name: 'Onboarding premium', included: true },
      ]
    },
    {
      id: 'enterprise-plus',
      name: t('plans.enterprise.plus.name'),
      description: t('plans.enterprise.plus.description'),
      monthlyPrice: 599,
      yearlyPrice: 5990, // 2 meses gratis
      icon: Globe,
      maxUsers: 999,
      maxCompanies: 999,
      storage: 'Ilimitado',
      support: 'Gerente de Cuenta',
      integrations: 999,
      features: [
        { name: 'Todo del plan Corporativo', included: true },
        { name: 'Gerente de cuenta dedicado', included: true },
        { name: 'Consultoría semanal', included: true },
        { name: 'Desarrollo personalizado ilimitado', included: true },
        { name: 'Infraestructura dedicada', included: true },
        { name: 'Respaldo en tiempo real', included: true },
        { name: 'Cumplimiento regulatorio', included: true },
        { name: 'Auditorías de seguridad', included: true },
        { name: 'Implementación in-situ', included: true },
        { name: 'Entrenamiento presencial', included: true },
        { name: 'Soporte white-label', included: true },
        { name: 'ROI garantizado', included: true },
      ]
    }
  ];

  const getPrice = (plan: SubscriptionPlan) => {
    const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    const monthlyEquivalent = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
    return { price, monthlyEquivalent };
  };

  const getSavings = (plan: SubscriptionPlan) => {
    if (!isYearly) return 0;
    const yearlySavings = (plan.monthlyPrice * 12) - plan.yearlyPrice;
    return Math.round((yearlySavings / (plan.monthlyPrice * 12)) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <img src={fourOneLogo} alt="Four One Solutions" className="h-12 w-12" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('plans.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Elige el plan perfecto para tu negocio
              </p>
            </div>
          </div>
          <LanguageSelector />
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${!isYearly ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
            {t('plans.monthly')}
          </span>
          <Switch
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-blue-600"
          />
          <span className={`text-sm font-medium ${isYearly ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
            {t('plans.annually')}
          </span>
          {isYearly && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              {t('plans.save')} 17%
            </Badge>
          )}
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {plans.map((plan) => {
            const { price, monthlyEquivalent } = getPrice(plan);
            const savings = getSavings(plan);
            const Icon = plan.icon;

            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                  plan.isPopular 
                    ? 'border-2 border-blue-500 shadow-xl scale-105' 
                    : 'border border-gray-200 dark:border-gray-700'
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      {t('plans.mostPopular')}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-3">
                    <div className={`p-3 rounded-full ${
                      plan.isPopular 
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-sm h-12 flex items-center justify-center">
                    {plan.description}
                  </CardDescription>
                  
                  <div className="mt-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        ${isYearly ? monthlyEquivalent : price}
                      </span>
                      <span className="text-gray-500 text-sm">/mes</span>
                    </div>
                    {isYearly && savings > 0 && (
                      <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                        ${price}/año • Ahorras {savings}%
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Plan limits */}
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <div className="flex justify-between">
                      <span>Usuarios:</span>
                      <span className="font-medium">{plan.maxUsers === 999 ? 'Ilimitado' : plan.maxUsers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Empresas:</span>
                      <span className="font-medium">{plan.maxCompanies === 999 ? 'Ilimitadas' : plan.maxCompanies}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Almacenamiento:</span>
                      <span className="font-medium">{plan.storage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Soporte:</span>
                      <span className="font-medium">{plan.support}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-sm mb-3">{t('plans.features')}:</h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check 
                            className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              feature.included 
                                ? 'text-green-500' 
                                : 'text-gray-300 dark:text-gray-600'
                            }`} 
                          />
                          <span className={
                            feature.included 
                              ? 'text-gray-700 dark:text-gray-300' 
                              : 'text-gray-400 dark:text-gray-600 line-through'
                          }>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    className={`w-full mt-6 ${
                      plan.isPopular 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100'
                    }`}
                  >
                    {plan.id === 'enterprise-plus' ? t('plans.contactSales') : t('plans.getStarted')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-4">¿Por qué elegir Four One Solutions?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="font-semibold mb-2">Implementación Rápida</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Configure su sistema en menos de 24 horas con nuestro proceso de onboarding optimizado.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="font-semibold mb-2">Soporte Especializado</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Equipo de expertos en ERP con conocimiento específico del mercado dominicano.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="font-semibold mb-2">ROI Garantizado</h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Garantizamos retorno de inversión en los primeros 6 meses o le devolvemos su dinero.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">¿Necesita un plan personalizado?</h3>
          <p className="mb-6 opacity-90">
            Contacte nuestro equipo de ventas para crear una solución que se adapte perfectamente a sus necesidades específicas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Llamar: +1 (809) 555-0123
            </Button>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-600">
              Enviar Email
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}