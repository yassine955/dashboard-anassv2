'use client';

import { useState, useEffect } from 'react';
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
import { Settings, User, Building, CreditCard, Mail, Save, Eye, EyeOff, CheckCircle, AlertTriangle, FileText, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/ui/avatar';
import { TikkieIcon } from '@/components/icons/TikkieIcon';

export default function SettingsPage() {
  const { userProfile, updateUserProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isTikkieDialogOpen, setIsTikkieDialogOpen] = useState(false);
  const [isEmailTemplateDialogOpen, setIsEmailTemplateDialogOpen] = useState(false);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState<'invoice' | 'paymentReminder' | null>(null);

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
  const [tikkieSettings, setTikkieSettings] = useState({
    apiKey: userProfile?.paymentSettings?.tikkie?.apiKey || '',
    appToken: userProfile?.paymentSettings?.tikkie?.appToken || '',
    sandboxMode: userProfile?.paymentSettings?.tikkie?.sandboxMode || false,
    isActive: userProfile?.paymentSettings?.tikkie?.isActive || false
  });

  // Email Template State
  const [emailTemplates, setEmailTemplates] = useState({
    invoiceEmail: {
      subject: userProfile?.emailTemplates?.invoiceEmail?.subject || '',
      content: userProfile?.emailTemplates?.invoiceEmail?.content || '',
      isCustom: userProfile?.emailTemplates?.invoiceEmail?.isCustom || false
    },
    paymentReminder: {
      subject: userProfile?.emailTemplates?.paymentReminder?.subject || '',
      content: userProfile?.emailTemplates?.paymentReminder?.content || '',
      isCustom: userProfile?.emailTemplates?.paymentReminder?.isCustom || false
    }
  });

  // Sync state with userProfile changes
  useEffect(() => {
    if (userProfile) {
      setBusinessInfo({
        companyName: userProfile.businessInfo?.companyName || '',
        kvkNumber: userProfile.businessInfo?.kvkNumber || '',
        vatNumber: userProfile.businessInfo?.vatNumber || '',
        phone: userProfile.businessInfo?.phone || '',
        website: userProfile.businessInfo?.website || '',
        address: {
          street: userProfile.businessInfo?.address?.street || '',
          city: userProfile.businessInfo?.address?.city || '',
          postalCode: userProfile.businessInfo?.address?.postalCode || '',
          country: userProfile.businessInfo?.address?.country || 'Netherlands'
        }
      });

      setPreferences({
        currency: userProfile.preferences?.currency || 'EUR',
        language: userProfile.preferences?.language || 'nl',
        invoiceTemplate: userProfile.preferences?.invoiceTemplate || 'default',
        defaultPaymentTerms: userProfile.preferences?.defaultPaymentTerms || 30
      });

      setTikkieSettings({
        apiKey: userProfile.paymentSettings?.tikkie?.apiKey || '',
        appToken: userProfile.paymentSettings?.tikkie?.appToken || '',
        sandboxMode: userProfile.paymentSettings?.tikkie?.sandboxMode || false,
        isActive: userProfile.paymentSettings?.tikkie?.isActive || false
      });

      setEmailTemplates({
        invoiceEmail: {
          subject: userProfile.emailTemplates?.invoiceEmail?.subject || '',
          content: userProfile.emailTemplates?.invoiceEmail?.content || '',
          isCustom: userProfile.emailTemplates?.invoiceEmail?.isCustom || false
        },
        paymentReminder: {
          subject: userProfile.emailTemplates?.paymentReminder?.subject || '',
          content: userProfile.emailTemplates?.paymentReminder?.content || '',
          isCustom: userProfile.emailTemplates?.paymentReminder?.isCustom || false
        }
      });
    }
  }, [userProfile]);

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


  const handleCreateSandboxAppToken = async () => {
    setLoading(true);
    try {
      if (!currentUser?.uid) {
        throw new Error('User not authenticated');
      }

      if (!tikkieSettings.apiKey) {
        toast.error('Vul eerst een API sleutel in voordat je een App Token genereert.');
        return;
      }

      const response = await fetch('/api/tikkie-sandbox-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser.getIdToken()}`,
        },
        body: JSON.stringify({
          userId: currentUser.uid,
          apiKey: tikkieSettings.apiKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create sandbox app token');
      }

      const result = await response.json();

      // Update local state with the new app token
      setTikkieSettings(prev => ({
        ...prev,
        appToken: result.appToken,
        sandboxMode: true,
        isActive: true,
      }));

      toast.success('Sandbox App Token succesvol gegenereerd! Je kunt nu sandbox betalingen testen.');
    } catch (error: any) {
      console.error('Error creating sandbox app token:', error);
      toast.error(error.message || 'Er is een fout opgetreden bij het genereren van de App Token.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTikkieSettings = async () => {
    setLoading(true);
    try {
      await updateUserProfile({
        paymentSettings: {
          ...userProfile?.paymentSettings,
          tikkie: tikkieSettings
        }
      });

      toast.success('Tikkie configuratie succesvol opgeslagen!');
      setIsTikkieDialogOpen(false);
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het opslaan van Tikkie instellingen.');
      console.error('Error saving Tikkie settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEmailTemplateDialog = (templateType: 'invoice' | 'paymentReminder') => {
    setEditingEmailTemplate(templateType);
    setIsEmailTemplateDialogOpen(true);
  };

  const handleSaveEmailTemplate = async () => {
    if (!editingEmailTemplate) return;

    setLoading(true);
    try {
      const templateData = {
        subject: editingEmailTemplate === 'invoice'
          ? emailTemplates.invoiceEmail.subject
          : emailTemplates.paymentReminder.subject,
        content: editingEmailTemplate === 'invoice'
          ? emailTemplates.invoiceEmail.content
          : emailTemplates.paymentReminder.content,
        isCustom: true
      };

      await updateUserProfile({
        emailTemplates: {
          invoiceEmail: editingEmailTemplate === 'invoice'
            ? templateData
            : userProfile?.emailTemplates?.invoiceEmail || { subject: '', content: '', isCustom: false },
          paymentReminder: editingEmailTemplate === 'paymentReminder'
            ? templateData
            : userProfile?.emailTemplates?.paymentReminder || { subject: '', content: '', isCustom: false }
        }
      });

      toast.success('Email template succesvol opgeslagen!');
      setIsEmailTemplateDialogOpen(false);
      setEditingEmailTemplate(null);
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het opslaan van de email template.');
      console.error('Error saving email template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetEmailTemplate = async () => {
    if (!editingEmailTemplate) return;

    setLoading(true);
    try {
      const resetData = { subject: '', content: '', isCustom: false };

      await updateUserProfile({
        emailTemplates: {
          invoiceEmail: editingEmailTemplate === 'invoice'
            ? resetData
            : userProfile?.emailTemplates?.invoiceEmail || resetData,
          paymentReminder: editingEmailTemplate === 'paymentReminder'
            ? resetData
            : userProfile?.emailTemplates?.paymentReminder || resetData
        }
      });

      // Reset local state
      if (editingEmailTemplate === 'invoice') {
        setEmailTemplates(prev => ({
          ...prev,
          invoiceEmail: { subject: '', content: '', isCustom: false }
        }));
      } else {
        setEmailTemplates(prev => ({
          ...prev,
          paymentReminder: { subject: '', content: '', isCustom: false }
        }));
      }

      toast.success('Email template gereset naar standaard!');
      setIsEmailTemplateDialogOpen(false);
      setEditingEmailTemplate(null);
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het resetten van de email template.');
      console.error('Error resetting email template:', error);
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
                    <TikkieIcon className="h-8 w-8" />
                    <div>
                      <h4 className="font-medium flex items-center">
                        Tikkie
                        {userProfile?.paymentSettings?.tikkie?.isActive && (
                          <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                        )}
                      </h4>
                      <p className="text-sm text-gray-500">Tikkie betalingen via ABN AMRO</p>
                      {userProfile?.paymentSettings?.tikkie?.apiKey && (
                        <p className="text-xs text-gray-400 mt-1">
                          API Key: {userProfile.paymentSettings.tikkie.apiKey.slice(0, 8)}***
                        </p>
                      )}
                      {userProfile?.paymentSettings?.tikkie?.appToken && (
                        <p className="text-xs text-gray-400 mt-1">
                          App Token: {userProfile.paymentSettings.tikkie.appToken.slice(0, 8)}***
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={userProfile?.paymentSettings?.tikkie?.isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsTikkieDialogOpen(true)}
                    className={userProfile?.paymentSettings?.tikkie?.isActive ? "bg-tikkie hover:bg-tikkie/90" : ""}
                    style={userProfile?.paymentSettings?.tikkie?.isActive ? { backgroundColor: '#007bc7' } : {}}
                  >
                    {userProfile?.paymentSettings?.tikkie?.isActive ? 'Bewerken' : 'Configureren'}
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
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Factuur Verzenden</span>
                      <span className="text-xs text-gray-500">
                        {userProfile?.emailTemplates?.invoiceEmail?.isCustom ? 'Aangepaste template' : 'Standaard template'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEmailTemplateDialog('invoice')}
                    >
                      Bewerken
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Betalingsherinnering</span>
                      <span className="text-xs text-gray-500">
                        {userProfile?.emailTemplates?.paymentReminder?.isCustom ? 'Aangepaste template' : 'Standaard template'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEmailTemplateDialog('paymentReminder')}
                    >
                      Bewerken
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>


      {/* Tikkie Configuration Dialog */}
      <Dialog open={isTikkieDialogOpen} onOpenChange={setIsTikkieDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tikkie Configureren</DialogTitle>
            <DialogDescription>
              Configureer je Tikkie API sleutel voor betalingen in sandbox of productie modus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">API Sleutel *</label>
              <Input
                placeholder="KGlSlQbY35aT7rnQ7IsZ75lDa6f9oqL5"
                value={tikkieSettings.apiKey}
                onChange={(e) => setTikkieSettings(prev => ({ ...prev, apiKey: e.target.value }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Van ABN AMRO Developer Portal
              </p>
            </div>

            {/* Sandbox Mode Toggle */}
            <div>
              <label className="block text-sm font-medium mb-2">Modus</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tikkie-sandbox"
                  checked={tikkieSettings.sandboxMode}
                  onChange={(e) => setTikkieSettings(prev => ({ ...prev, sandboxMode: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="tikkie-sandbox" className="text-sm">
                  Sandbox modus (voor testen)
                </label>
              </div>
            </div>

            {/* App Token Section */}
            <div>
              <label className="block text-sm font-medium mb-1">App Token *</label>
              {tikkieSettings.sandboxMode ? (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Sandbox App Token (automatisch gegenereerd)"
                      value={tikkieSettings.appToken}
                      onChange={(e) => setTikkieSettings(prev => ({ ...prev, appToken: e.target.value }))}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCreateSandboxAppToken}
                      disabled={loading || !tikkieSettings.apiKey}
                      className="whitespace-nowrap"
                    >
                      {loading ? 'Genereren...' : 'Genereer'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Klik op &quot;Genereer&quot; om automatisch een sandbox App Token aan te maken
                  </p>
                </div>
              ) : (
                <div>
                  <Input
                    placeholder="Your Tikkie App Token"
                    value={tikkieSettings.appToken}
                    onChange={(e) => setTikkieSettings(prev => ({ ...prev, appToken: e.target.value }))}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Van Tikkie Business Portal (Instellingen → APIs → Create token)
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="tikkie-active"
                checked={tikkieSettings.isActive}
                onChange={(e) => setTikkieSettings(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="tikkie-active" className="text-sm">
                Tikkie integratie activeren
              </label>
            </div>

            {/* Instructions */}
            <div className={`p-3 border rounded-lg ${tikkieSettings.sandboxMode ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-start space-x-2">
                <AlertTriangle className={`h-4 w-4 mt-0.5 ${tikkieSettings.sandboxMode ? 'text-amber-600' : 'text-blue-600'}`} />
                <div>
                  <p className={`text-sm font-medium ${tikkieSettings.sandboxMode ? 'text-amber-800' : 'text-blue-800'}`}>
                    {tikkieSettings.sandboxMode ? 'Sandbox Setup' : 'Productie Setup'}
                  </p>
                  {tikkieSettings.sandboxMode ? (
                    <p className="text-xs text-amber-700 mt-1">
                      1. Vul je API sleutel in van developer.abnamro.com<br/>
                      2. Klik op &quot;Genereer&quot; om een sandbox App Token te maken<br/>
                      3. Test betalingen met de iDEAL simulator<br/>
                      4. Schakel naar productie modus wanneer je klaar bent
                    </p>
                  ) : (
                    <p className="text-xs text-blue-700 mt-1">
                      1. Registreer een app op developer.abnamro.com<br/>
                      2. Upload je public key en krijg een API sleutel<br/>
                      3. Maak een App Token in Tikkie Business Portal<br/>
                      4. Test eerst in sandbox mode voordat je live gaat
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsTikkieDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleSaveTikkieSettings}
              disabled={loading || !tikkieSettings.apiKey || !tikkieSettings.appToken}
            >
              {loading ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Template Configuration Dialog */}
      <Dialog open={isEmailTemplateDialogOpen} onOpenChange={setIsEmailTemplateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              {editingEmailTemplate === 'invoice' ? 'Factuur Email Template' : 'Betalingsherinnering Template'}
            </DialogTitle>
            <DialogDescription>
              Pas je email template aan. Gebruik variabelen zoals {'{{clientName}}'} of {'{clientName}'}, {'{{invoiceNumber}}'} of {'{invoiceNumber}'}, enz. Beide formaten werken.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Template Variables Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Beschikbare Variabelen</h4>
              <p className="text-xs text-blue-600 mb-3">Je kunt zowel {'{{variableName}}'} als {'{variableName}'} gebruiken</p>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <p><code>{'{{clientName}}'}</code> - Volledige naam klant</p>
                  <p><code>{'{{clientFirstName}}'}</code> - Voornaam klant</p>
                  <p><code>{'{{invoiceNumber}}'}</code> - Factuurnummer</p>
                  <p><code>{'{{totalAmount}}'}</code> - Totaalbedrag</p>
                </div>
                <div>
                  <p><code>{'{{invoiceDate}}'}</code> - Factuurdatum</p>
                  <p><code>{'{{dueDate}}'}</code> - Vervaldatum</p>
                  <p><code>{'{{companyName}}'}</code> - Bedrijfsnaam</p>
                  <p><code>{'{{paymentLink}}'}</code> - Betaallink (indien beschikbaar)</p>
                </div>
              </div>
            </div>

            {/* Subject Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Onderwerp</label>
              <Input
                value={editingEmailTemplate === 'invoice'
                  ? emailTemplates.invoiceEmail.subject
                  : emailTemplates.paymentReminder.subject}
                onChange={(e) => {
                  if (editingEmailTemplate === 'invoice') {
                    setEmailTemplates(prev => ({
                      ...prev,
                      invoiceEmail: { ...prev.invoiceEmail, subject: e.target.value }
                    }));
                  } else {
                    setEmailTemplates(prev => ({
                      ...prev,
                      paymentReminder: { ...prev.paymentReminder, subject: e.target.value }
                    }));
                  }
                }}
                placeholder={editingEmailTemplate === 'invoice'
                  ? 'Factuur {{invoiceNumber}}'
                  : 'Betalingsherinnering - Factuur {{invoiceNumber}}'}
              />
            </div>

            {/* Content Field */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Inhoud (HTML)</label>
              <textarea
                className="w-full h-96 px-3 py-2 border border-input rounded-md font-mono text-sm"
                value={editingEmailTemplate === 'invoice'
                  ? emailTemplates.invoiceEmail.content
                  : emailTemplates.paymentReminder.content}
                onChange={(e) => {
                  if (editingEmailTemplate === 'invoice') {
                    setEmailTemplates(prev => ({
                      ...prev,
                      invoiceEmail: { ...prev.invoiceEmail, content: e.target.value }
                    }));
                  } else {
                    setEmailTemplates(prev => ({
                      ...prev,
                      paymentReminder: { ...prev.paymentReminder, content: e.target.value }
                    }));
                  }
                }}
                placeholder="Voer je HTML email template in..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Gebruik HTML voor opmaak. Variabelen worden automatisch vervangen bij het verzenden.
              </p>
            </div>

            {/* Preview Section */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Voorbeeld</h4>
              <div className="border rounded-lg p-4 bg-gray-50 max-h-64 overflow-y-auto">
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      const content = editingEmailTemplate === 'invoice'
                        ? emailTemplates.invoiceEmail.content
                        : emailTemplates.paymentReminder.content;

                      // Normalize single braces to double braces first
                      const normalizeVariables = (template: string): string => {
                        const singleBracePattern = /\{([^{}]+)\}/g;
                        return template.replace(singleBracePattern, (match, variableName) => {
                          if (match.startsWith('{{') || !/^[a-zA-Z][a-zA-Z0-9]*$/.test(variableName.trim())) {
                            return match;
                          }
                          return `{{${variableName}}}`;
                        });
                      };

                      return normalizeVariables(content)
                        .replace(/{{clientName}}/g, 'Jan Jansen')
                        .replace(/{{invoiceNumber}}/g, 'FAC-2024-001')
                        .replace(/{{totalAmount}}/g, '€500.00')
                        .replace(/{{invoiceDate}}/g, new Date().toLocaleDateString('nl-NL'))
                        .replace(/{{dueDate}}/g, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('nl-NL'))
                        .replace(/{{companyName}}/g, userProfile?.businessInfo?.companyName || 'Je Bedrijf')
                        .replace(/{{paymentLink}}/g, 'https://betaal.link/voorbeeld');
                    })()
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setIsEmailTemplateDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetEmailTemplate}
              className="text-red-600 hover:bg-red-50"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset naar Standaard
            </Button>
            <Button onClick={handleSaveEmailTemplate} disabled={loading}>
              {loading ? 'Opslaan...' : 'Template Opslaan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}