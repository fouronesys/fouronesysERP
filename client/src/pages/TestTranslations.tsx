import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/LanguageSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestTranslations() {
  const { t, language } = useTranslation();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Translation Test</h1>
        <LanguageSelector />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Language: {language}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Navigation</h3>
              <ul className="space-y-1">
                <li>{t('nav.dashboard')}</li>
                <li>{t('nav.products')}</li>
                <li>{t('nav.customers')}</li>
                <li>{t('nav.sales')}</li>
                <li>{t('nav.inventory')}</li>
                <li>{t('nav.warehouses')}</li>
                <li>{t('nav.manufacturing')}</li>
                <li>{t('nav.employees')}</li>
                <li>{t('nav.payroll')}</li>
                <li>{t('nav.billing')}</li>
                <li>{t('nav.reports')}</li>
                <li>{t('nav.settings')}</li>
                <li>{t('nav.chat')}</li>
                <li>{t('nav.aiInsights')}</li>
                <li>{t('nav.pos')}</li>
                <li>{t('nav.fiscalDocuments')}</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Common Terms</h3>
              <ul className="space-y-1">
                <li>{t('common.loading')}</li>
                <li>{t('common.save')}</li>
                <li>{t('common.cancel')}</li>
                <li>{t('common.delete')}</li>
                <li>{t('common.edit')}</li>
                <li>{t('common.add')}</li>
                <li>{t('common.search')}</li>
                <li>{t('common.filter')}</li>
                <li>{t('common.export')}</li>
                <li>{t('common.import')}</li>
                <li>{t('common.print')}</li>
                <li>{t('common.yes')}</li>
                <li>{t('common.no')}</li>
                <li>{t('common.confirm')}</li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Landing Page</h3>
            <div className="space-y-2">
              <p><strong>Title:</strong> {t('landing.hero.title')}</p>
              <p><strong>Subtitle:</strong> {t('landing.hero.subtitle')}</p>
              <p><strong>Inventory:</strong> {t('landing.features.inventory')}</p>
              <p><strong>Description:</strong> {t('landing.features.inventoryDesc')}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Authentication</h3>
            <div className="space-y-2">
              <p>{t('auth.login')} / {t('auth.register')}</p>
              <p>{t('auth.email')} / {t('auth.password')}</p>
              <p>{t('auth.welcome')}</p>
              <p>{t('auth.welcomeBack')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}