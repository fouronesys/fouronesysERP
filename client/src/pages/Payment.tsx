import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, Building2, Phone, Mail, Copy, Check } from 'lucide-react';

const paymentSchema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email válido requerido'),
  phone: z.string().min(10, 'Teléfono requerido'),
  company: z.string().min(2, 'Nombre de empresa requerido'),
  rnc: z.string().optional(),
  paymentMethod: z.enum(['deposit', 'transfer']),
  bankAccount: z.string().min(1, 'Selecciona una cuenta bancaria'),
  amount: z.number().min(1, 'Monto debe ser mayor a 0'),
  reference: z.string().min(3, 'Referencia de pago requerida'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

const bankAccounts = [
  {
    id: 'popular_savings',
    bank: 'Banco Popular',
    type: 'Cuenta de Ahorros',
    account: '844480111',
    holder: 'Jesús María García Cruz',
    cedula: '40215343837'
  },
  {
    id: 'popular_checking',
    bank: 'Banco Popular',
    type: 'Cuenta Corriente',
    account: '838073138',
    holder: 'Jesús María García Cruz',
    cedula: '40215343837'
  },
  {
    id: 'banreservas_checking',
    bank: 'Banreservas',
    type: 'Cuenta Corriente',
    account: '4231803209',
    holder: 'Jesús María García Cruz',
    cedula: '40215343837'
  },
  {
    id: 'bhd_checking',
    bank: 'BHD León',
    type: 'Cuenta Corriente',
    account: '34860440011',
    holder: 'Jesús María García Cruz',
    cedula: '40215343837'
  },
  {
    id: 'apap_savings',
    bank: 'APAP',
    type: 'Cuenta de Ahorros',
    account: '1034116428',
    holder: 'Jesús Cruz',
    cedula: '40215343837',
    instructions: 'Desde APAP: Cuenta - 1034116428\nDesde otros bancos: Cuenta de ahorro - 1034116428'
  }
];

export default function Payment() {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [copied, setCopied] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      rnc: '',
      paymentMethod: 'deposit',
      bankAccount: '',
      amount: 0,
      reference: '',
      notes: '',
    },
  });

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
    toast({
      title: "Copiado",
      description: `${type} copiado al portapapeles`,
    });
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const response = await apiRequest('POST', '/api/payments/submit', data);
      
      if (response.ok) {
        toast({
          title: "Pago Registrado",
          description: "Hemos recibido tu información de pago. Te contactaremos pronto para activar tu cuenta.",
        });
        form.reset();
      } else {
        throw new Error('Error al registrar el pago');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago. Intenta nuevamente.",
        variant: "destructive",
      });
    }
  };

  const selectedBankAccount = bankAccounts.find(acc => acc.id === selectedAccount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Four One System
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Sistema de Gestión Empresarial para República Dominicana
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Pricing Card */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Plan Empresarial</CardTitle>
              <CardDescription className="text-center">
                Sistema completo de gestión empresarial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  $99 USD
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Pago único / Licencia permanente
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">POS completo con NCF</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Gestión de inventario</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Reportes fiscales DGII</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Validación RNC automática</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Contabilidad integrada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Soporte técnico incluido</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">Soporte Técnico</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  WhatsApp: +1 (809) 555-0123
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">admin@fourone.com.do</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Información de Pago
              </CardTitle>
              <CardDescription>
                Completa tus datos y realiza el depósito/transferencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Tu nombre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="tu@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <Input placeholder="809-555-0123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empresa</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre de tu empresa" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="rnc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RNC (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="123456789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankAccount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selecciona Cuenta Bancaria</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedAccount(value);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una cuenta" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bankAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.bank} - {account.type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedBankAccount && (
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        <span className="font-medium">{selectedBankAccount.bank}</span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span>Tipo:</span>
                          <span className="font-medium">{selectedBankAccount.type}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Cuenta:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{selectedBankAccount.account}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedBankAccount.account, 'Cuenta')}
                            >
                              {copied === 'Cuenta' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Titular:</span>
                          <span className="font-medium">{selectedBankAccount.holder}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Cédula:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{selectedBankAccount.cedula}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedBankAccount.cedula, 'Cédula')}
                            >
                              {copied === 'Cédula' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                        {selectedBankAccount.instructions && (
                          <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border-l-4 border-yellow-400">
                            <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                              Instrucciones especiales:
                            </div>
                            <div className="text-xs text-yellow-700 dark:text-yellow-300 whitespace-pre-line">
                              {selectedBankAccount.instructions}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto (USD)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="99"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referencia de Pago</FormLabel>
                          <FormControl>
                            <Input placeholder="Número de referencia" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas Adicionales (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Comentarios adicionales sobre el pago"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" size="lg">
                    Registrar Pago
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Después de realizar el pago, nos pondremos en contacto contigo en un plazo de 24 horas 
            para activar tu cuenta y proporcionarte acceso completo al sistema.
          </p>
        </div>
      </div>
    </div>
  );
}