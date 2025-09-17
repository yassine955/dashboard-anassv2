'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Settings, User, Building, CreditCard, Mail, Save, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';

export default function SettingsPage() {
  const { userProfile, updateUserProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showStripeKeys, setShowStripeKeys] = useState(false);
  const [isStripeDialogOpen, setIsStripeDialogOpen] = useState(false);
  const [isINGDialogOpen, setIsINGDialogOpen] = useState(false);

  // Business Info State
  const [businessInfo, setBusinessInfo] = useState({
    companyName: userProfile?.businessInfo?.companyName || '',
    kvkNumber: userProfile?.businessInfo?.kvkNumber || '',
    vatNumber: userProfile?.businessInfo?.vatNumber || '',
    phone: userProfile?.businessInfo?.phone || '',
    website: userProfile?.businessInfo?.website || '',
    address: {
      street: userProfile?.businessInfo?.address?.street || '',
      city: userProfile?.businessInfo?.address?.city || '',
      postalCode: userProfile?.businessInfo?.address?.postalCode || '',
      country: userProfile?.businessInfo?.address?.country || 'Netherlands'
    }
  });

  // Preferences State
  const [preferences, setPreferences] = useState({
    currency: userProfile?.preferences?.currency || 'EUR',
    language: userProfile?.preferences?.language || 'nl',
    invoiceTemplate: userProfile?.preferences?.invoiceTemplate || 'default',
    defaultPaymentTerms: userProfile?.preferences?.defaultPaymentTerms || 30
  });

  // Payment Settings State
  const [stripeSettings, setStripeSettings] = useState({
    publishableKey: userProfile?.paymentSettings?.stripe?.manualPublishableKey || '',
    secretKey: userProfile?.paymentSettings?.stripe?.manualSecretKey || '',
    accountId: userProfile?.paymentSettings?.stripe?.accountId || '',
    isActive: userProfile?.paymentSettings?.stripe?.isActive || false
  });

  const [ingSettings, setINGSettings] = useState({
    clientId: userProfile?.paymentSettings?.ing?.clientId || '',
    clientSecret: userProfile?.paymentSettings?.ing?.clientSecret || '',
    creditorIban: userProfile?.paymentSettings?.ing?.creditorIban || '',
    isActive: userProfile?.paymentSettings?.ing?.isActive || false
  });

  const handleSaveBusinessInfo = async () => {
    setLoading(true);
    try {
      await updateUserProfile({
        businessInfo
      });
      toast.success('Bedrijfsgegevens succesvol opgeslagen!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het opslaan van de bedrijfsgegevens.');
      console.error('Error saving business info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      await updateUserProfile({
        preferences
      });
      toast.success('Voorkeuren succesvol opgeslagen!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het opslaan van de voorkeuren.');
      console.error('Error saving preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe-connect/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser?.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate Stripe authorization URL');
      }

      const { authorizeUrl } = await response.json();

      // Redirect to Stripe Connect OAuth
      window.location.href = authorizeUrl;
    } catch (error: any) {
      toast.error(error.message || 'Er is een fout opgetreden bij het verbinden met Stripe.');
      console.error('Error connecting to Stripe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectStripe = async () => {
    if (!confirm('Weet je zeker dat je je Stripe account wilt ontkoppelen?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stripe-connect/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser?.uid,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Stripe account');
      }

      toast.success('Stripe account succesvol ontkoppeld!');

      // Refresh user profile to update UI
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Er is een fout opgetreden bij het ontkoppelen van Stripe.');
      console.error('Error disconnecting Stripe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStripeSettings = async () => {
    setLoading(true);
    try {
      // Test Stripe connection first
      const testResponse = await fetch('/api/test-stripe-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publishableKey: stripeSettings.publishableKey,
          secretKey: stripeSettings.secretKey,
        }),
      });

      if (!testResponse.ok) {
        throw new Error('Stripe configuratie test mislukt. Controleer je API sleutels.');
      }

      await updateUserProfile({
        paymentSettings: {
          ...userProfile?.paymentSettings,
          stripe: {
            ...userProfile?.paymentSettings?.stripe,
            manualPublishableKey: stripeSettings.publishableKey,
            manualSecretKey: stripeSettings.secretKey,
            isActive: stripeSettings.isActive,
          }
        }
      });

      toast.success('Stripe configuratie succesvol opgeslagen!');
      setIsStripeDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Er is een fout opgetreden bij het opslaan van Stripe instellingen.');
      console.error('Error saving Stripe settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveINGSettings = async () => {
    setLoading(true);
    try {
      await updateUserProfile({
        paymentSettings: {
          ...userProfile?.paymentSettings,
          ing: ingSettings
        }
      });

      toast.success('ING configuratie succesvol opgeslagen!');
      setIsINGDialogOpen(false);
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het opslaan van ING instellingen.');
      console.error('Error saving ING settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Instellingen</h1>
          <p className="text-gray-600">Beheer je account en bedrijfsgegevens</p>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Account Informatie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Naam</label>
                <Input
                  value={currentUser?.displayName || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Naam wordt automatisch overgenomen van je Google account
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  value={currentUser?.email || ''}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email kan niet worden gewijzigd
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Profielfoto</label>
                <div className="flex items-center space-x-3">
                  <Avatar src={currentUser?.photoURL || ""} alt={currentUser?.displayName || "User"} fallback={currentUser?.displayName || "U"} size="md" />
                  <div>
                    <p className="text-sm">Je profielfoto wordt automatisch gesynchroniseerd met je Google account</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Business Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Bedrijfsgegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Bedrijfsnaam *</label>
                <Input
                  value={businessInfo.companyName}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Je bedrijfsnaam"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">KvK Nummer</label>
                  <Input
                    value={businessInfo.kvkNumber}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, kvkNumber: e.target.value }))}
                    placeholder="12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">BTW Nummer</label>
                  <Input
                    value={businessInfo.vatNumber}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, vatNumber: e.target.value }))}
                    placeholder="NL123456789B01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Telefoon</label>
                  <Input
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+31 6 12345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Website</label>
                  <Input
                    value={businessInfo.website}
                    onChange={(e) => setBusinessInfo(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="www.jebedrijf.nl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Straat + Huisnummer</label>
                <Input
                  value={businessInfo.address.street}
                  onChange={(e) => setBusinessInfo(prev => ({
                    ...prev,
                    address: { ...prev.address, street: e.target.value }
                  }))}
                  placeholder="Voorbeeldstraat 123"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Postcode</label>
                  <Input
                    value={businessInfo.address.postalCode}
                    onChange={(e) => setBusinessInfo(prev => ({
                      ...prev,
                      address: { ...prev.address, postalCode: e.target.value }
                    }))}
                    placeholder="1234 AB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stad</label>
                  <Input
                    value={businessInfo.address.city}
                    onChange={(e) => setBusinessInfo(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    placeholder="Amsterdam"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Land</label>
                  <Input
                    value={businessInfo.address.country}
                    onChange={(e) => setBusinessInfo(prev => ({
                      ...prev,
                      address: { ...prev.address, country: e.target.value }
                    }))}
                    placeholder="Nederland"
                  />
                </div>
              </div>
              <Button onClick={handleSaveBusinessInfo} disabled={loading} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Opslaan...' : 'Bedrijfsgegevens Opslaan'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Invoice Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Factuur Voorkeuren
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Valuta</label>
                  <select
                    className="w-full h-10 px-3 py-2 border border-input rounded-md"
                    value={preferences.currency}
                    onChange={(e) => setPreferences(prev => ({ ...prev, currency: e.target.value }))}
                  >
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="GBP">British Pound (£)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Taal</label>
                  <select
                    className="w-full h-10 px-3 py-2 border border-input rounded-md"
                    value={preferences.language}
                    onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                  >
                    <option value="nl">Nederlands</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Standaard Betalingstermijn (dagen)</label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={preferences.defaultPaymentTerms}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    defaultPaymentTerms: parseInt(e.target.value) || 30
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Factuur Template</label>
                <select
                  className="w-full h-10 px-3 py-2 border border-input rounded-md"
                  value={preferences.invoiceTemplate}
                  onChange={(e) => setPreferences(prev => ({ ...prev, invoiceTemplate: e.target.value }))}
                >
                  <option value="default">Standaard Template</option>
                  <option value="modern">Modern Template</option>
                  <option value="classic">Klassiek Template</option>
                </select>
              </div>
              <Button onClick={handleSavePreferences} disabled={loading} className="w-full">
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Opslaan...' : 'Voorkeuren Opslaan'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment Integration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Betaalintegraties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="font-medium flex items-center">
                        Stripe
                        {userProfile?.paymentSettings?.stripe?.isActive && (
                          <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">Online betalingen accepteren</p>
                      {userProfile?.paymentSettings?.stripe?.accountId && (
                        <p className="text-xs text-gray-400 mt-1">
                          Account: {userProfile.paymentSettings.stripe.accountId.slice(0, 12)}***
                        </p>
                      )}
                      {userProfile?.paymentSettings?.stripe?.connectedAt && (
                        <p className="text-xs text-green-600 mt-1">
                          Verbonden via Stripe Connect
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {userProfile?.paymentSettings?.stripe?.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisconnectStripe}
                        disabled={loading}
                      >
                        Ontkoppelen
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleConnectStripe}
                        disabled={loading}
                        className="bg-stripe hover:bg-stripe/90"
                        style={{ backgroundColor: '#635bff' }}
                      >
                        Verbinden met Stripe
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsStripeDialogOpen(true)}
                      className="text-xs"
                    >
                      Geavanceerd
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h4 className="font-medium flex items-center">
                        ING Bank
                        {userProfile?.paymentSettings?.ing?.isActive && (
                          <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">Directe bankoverschrijvingen via PSD2</p>
                      {userProfile?.paymentSettings?.ing?.creditorIban && (
                        <p className="text-xs text-gray-400 mt-1">
                          IBAN: {userProfile.paymentSettings.ing.creditorIban.slice(0, 8)}***
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={userProfile?.paymentSettings?.ing?.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsINGDialogOpen(true)}
                  >
                    {userProfile?.paymentSettings?.ing?.isActive ? 'Bewerken' : 'Configureren'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Email Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                Email Configuratie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">Email service is geconfigureerd</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  youngkesinova@gmail.com is actief en klaar voor gebruik
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Email Templates</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm">Factuur Verzenden</span>
                    <Button variant="outline" size="sm">Bewerken</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <span className="text-sm">Betalingsherinnering</span>
                    <Button variant="outline" size="sm">Bewerken</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Stripe Configuration Dialog */}
      <Dialog open={isStripeDialogOpen} onOpenChange={setIsStripeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Stripe Configureren</DialogTitle>
            <DialogDescription>
              Configureer je Stripe API sleutels om betalingen te accepteren.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Publishable Key *</label>
              <Input
                placeholder="pk_test_..."
                value={stripeSettings.publishableKey}
                onChange={(e) => setStripeSettings(prev => ({ ...prev, publishableKey: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Je publieke Stripe sleutel (begint met pk_)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Secret Key *</label>
              <div className="relative">
                <Input
                  type={showStripeKeys ? "text" : "password"}
                  placeholder="sk_test_..."
                  value={stripeSettings.secretKey}
                  onChange={(e) => setStripeSettings(prev => ({ ...prev, secretKey: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowStripeKeys(!showStripeKeys)}
                >
                  {showStripeKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Je geheime Stripe sleutel (begint met sk_)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account ID (optioneel)</label>
              <Input
                placeholder="acct_..."
                value={stripeSettings.accountId}
                onChange={(e) => setStripeSettings(prev => ({ ...prev, accountId: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Voor Stripe Connect accounts
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="stripe-active"
                checked={stripeSettings.isActive}
                onChange={(e) => setStripeSettings(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="stripe-active" className="text-sm">
                Stripe integratie activeren
              </label>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Belangrijke informatie</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Je API sleutels worden veilig opgeslagen en gebruikt voor het verwerken van betalingen.
                    Gebruik test sleutels (pk_test_, sk_test_) voor development.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsStripeDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveStripeSettings}
              disabled={loading || !stripeSettings.publishableKey || !stripeSettings.secretKey}
            >
              {loading ? 'Opslaan...' : 'Opslaan & Testen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ING Configuration Dialog */}
      <Dialog open={isINGDialogOpen} onOpenChange={setIsINGDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>ING Bank Configureren</DialogTitle>
            <DialogDescription>
              Configureer je ING Developer API gegevens voor PSD2 betalingen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Client ID *</label>
              <Input
                placeholder="8f8ef068-770b-405e-9b21-f8da01924c4d"
                value={ingSettings.clientId}
                onChange={(e) => setINGSettings(prev => ({ ...prev, clientId: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Client Secret *</label>
              <Input
                type="password"
                placeholder="Your ING client secret"
                value={ingSettings.clientSecret}
                onChange={(e) => setINGSettings(prev => ({ ...prev, clientSecret: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Creditor IBAN *</label>
              <Input
                placeholder="NL90ABNA0585619023"
                value={ingSettings.creditorIban}
                onChange={(e) => setINGSettings(prev => ({ ...prev, creditorIban: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Je bedrijfs IBAN waar betalingen naartoe gaan
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="ing-active"
                checked={ingSettings.isActive}
                onChange={(e) => setINGSettings(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="ing-active" className="text-sm">
                ING integratie activeren
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsINGDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveINGSettings}
              disabled={loading || !ingSettings.clientId || !ingSettings.clientSecret || !ingSettings.creditorIban}
            >
              {loading ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}