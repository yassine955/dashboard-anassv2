'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Settings, User, Building, CreditCard, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { userProfile, updateUserProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

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
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-medium">
                    {currentUser?.displayName?.charAt(0) || 'U'}
                  </div>
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
                  <div>
                    <h4 className="font-medium">Stripe</h4>
                    <p className="text-sm text-gray-500">Online betalingen accepteren</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configureren
                  </Button>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">ING Bank</h4>
                    <p className="text-sm text-gray-500">Bankrekening integratie</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configureren
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
    </div>
  );
}