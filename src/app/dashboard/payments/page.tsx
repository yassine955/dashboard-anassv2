'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService, clientService } from '@/lib/firebase-service';
// Email functionality is handled via API route
import { Invoice, Client } from '@/types';
import { validatePaymentAmount, validateInvoiceForPayment, formatPaymentError } from '@/lib/payment-validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Search, Mail, ExternalLink, CreditCard, CheckCircle, Clock, AlertCircle, Euro, Zap, Smartphone, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { soundService } from '@/lib/sound-service';
import { PayPalIcon } from '@/components/icons/PayPalIcon';
import { MollieIcon } from '@/components/icons/MollieIcon';
import { TikkieIcon } from '@/components/icons/TikkieIcon';

export default function PaymentsPage() {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sendWithPaymentLink, setSendWithPaymentLink] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to invoices with real-time updates
    const unsubscribeInvoices = invoiceService.subscribeToInvoices(currentUser.uid, (updatedInvoices) => {
      setInvoices(updatedInvoices);
      setLoading(false);

      // Check for newly paid invoices and show notifications
      updatedInvoices.forEach(invoice => {
        if (invoice.status === 'paid') {
          const wasUnpaid = invoices.find(i => i.id === invoice.id && i.status !== 'paid');
          if (wasUnpaid) {
            soundService.playPaymentReceived();
            toast.success(`Factuur ${invoice.invoiceNumber} is betaald! 🎉`);
          }
        }
      });
    });

    // Load clients
    const loadClients = async () => {
      try {
        const clientsData = await clientService.getClients(currentUser.uid);
        setClients(clientsData);
      } catch (error) {
        console.error('Error loading clients:', error);
      }
    };

    loadClients();

    return () => unsubscribeInvoices();
  }, [currentUser, invoices]);

  useEffect(() => {
    const filtered = invoices.filter(invoice => {
      const client = clients.find(c => c.id === invoice.clientId);
      return (
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client && `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
    setFilteredInvoices(filtered);
  }, [invoices, clients, searchTerm]);

  const createPaymentLink = async (invoice: Invoice, useCheckoutSession = false) => {
    try {
      // Validate invoice and amount before creating payment link
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      // Create Stripe payment link or checkout session
      const response = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid}`, // Add auth header
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          description: `Factuur ${invoice.invoiceNumber}`,
          clientId: invoice.clientId,
          useCheckoutSession,
          userId: currentUser?.uid,
          metadata: {
            invoiceId: invoice.id,
            clientId: invoice.clientId,
            invoiceNumber: invoice.invoiceNumber,
          },
        }),
      });

      if (!response.ok) {
        // Try to parse error response as JSON, but handle case where it might be HTML
        let errorMessage = 'Failed to create payment link';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          // If JSON parsing fails, it might be an HTML error page
          console.error('Failed to parse error response as JSON:', jsonError);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        const formattedError = formatPaymentError(errorMessage);
        throw new Error(formattedError);
      }

      const { url, type } = await response.json();

      // Update invoice with payment link
      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        status: 'sent'
      }, currentUser?.uid);

      const message = type === 'checkout_session'
        ? 'Checkout sessie succesvol aangemaakt!'
        : 'Betaallink succesvol aangemaakt!';
      toast.success(message);
      return url;
    } catch (error) {
      const formattedError = formatPaymentError(error);
      toast.error(formattedError);
      console.error('Error creating payment link:', error);
      return null;
    }
  };

  const sendInvoiceEmail = async () => {
    if (!selectedInvoice) return;

    setEmailSending(true);
    try {
      const client = clients.find(c => c.id === selectedInvoice.clientId);
      if (!client) {
        toast.error('Klant niet gevonden.');
        return;
      }

      // Only create payment link if user chose to send with payment link
      let paymentLink = null;
      if (sendWithPaymentLink) {
        paymentLink = selectedInvoice.paymentLink;
        if (!paymentLink) {
          paymentLink = await createPaymentLink(selectedInvoice);
          if (!paymentLink) return;
        }
      }

      // Send email with or without payment link based on user choice
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: client.email,
          subject: `Factuur ${selectedInvoice.invoiceNumber}`,
          invoiceId: selectedInvoice.id,
          clientId: client.id,
          paymentLink, // Will be null if sendWithPaymentLink is false
          customMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      // Update invoice status
      await invoiceService.updateInvoice(selectedInvoice.id, {
        status: 'sent'
      }, currentUser?.uid);

      toast.success(`Factuur succesvol verzonden naar ${client.email}!`);
      // Play email sent confirmation sound
      soundService.playEmailSent();
      setIsEmailDialogOpen(false);
      setSelectedInvoice(null);
      setCustomMessage('');
      setSendWithPaymentLink(true); // Reset to default
    } catch (error) {
      console.error('Error sending email:', error);

      // Show specific error message to user
      const errorMessage = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het verzenden van de email.';
      toast.error(errorMessage);
    } finally {
      setEmailSending(false);
    }
  };

  const markAsPaid = async (invoice: Invoice) => {
    try {
      await invoiceService.updateInvoice(invoice.id, {
        status: 'paid'
      }, currentUser?.uid);
      soundService.playPaymentReceived();
      toast.success('Factuur gemarkeerd als betaald!');
    } catch (error) {
      soundService.playWarning();
      toast.error('Er is een fout opgetreden bij het bijwerken van de factuur.');
      console.error('Error updating invoice:', error);
    }
  };

  const markAsOverdue = async (invoice: Invoice) => {
    try {
      await invoiceService.updateInvoice(invoice.id, {
        status: 'overdue'
      }, currentUser?.uid);
      toast.success('Factuur gemarkeerd als verlopen!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het bijwerken van de factuur.');
      console.error('Error updating invoice:', error);
    }
  };

  const openEmailDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCustomMessage('');
    setSendWithPaymentLink(true); // Default to sending with payment link
    setIsEmailDialogOpen(true);
  };

  const openPaymentMethodDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentMethodDialogOpen(true);
  };

  const createPaymentWithMethod = async (method: 'payment_link' | 'checkout_session' | 'ing' | 'paypal' | 'mollie' | 'tikkie') => {
    if (!selectedInvoice) return;

    switch (method) {
      case 'ing':
        await createINGPayment(selectedInvoice);
        break;
      case 'paypal':
        await createPayPalPayment(selectedInvoice);
        break;
      case 'mollie':
        await createMolliePayment(selectedInvoice);
        break;
      case 'tikkie':
        await createTikkiePayment(selectedInvoice);
        break;
      case 'checkout_session':
        const url1 = await createPaymentLink(selectedInvoice, true);
        if (url1) {
          setIsPaymentMethodDialogOpen(false);
          setSelectedInvoice(null);
        }
        break;
      default: // 'payment_link'
        const url2 = await createPaymentLink(selectedInvoice, false);
        if (url2) {
          setIsPaymentMethodDialogOpen(false);
          setSelectedInvoice(null);
        }
        break;
    }
  };

  const createINGPayment = async (invoice: Invoice) => {
    try {
      // Validate invoice and amount before creating ING payment
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      // Create ING payment request
      const response = await fetch('/api/create-ing-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid}`,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          description: `Factuur ${invoice.invoiceNumber}`,
          clientId: invoice.clientId,
          userId: currentUser?.uid,
          metadata: {
            invoiceId: invoice.id,
            clientId: invoice.clientId,
            invoiceNumber: invoice.invoiceNumber,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const formattedError = formatPaymentError(errorData.error || 'Failed to create ING payment');
        throw new Error(formattedError);
      }

      const { url, paymentId } = await response.json();

      // Update invoice with ING payment link
      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        status: 'sent'
      }, currentUser?.uid);

      toast.success('ING betaling succesvol aangemaakt!');
      setIsPaymentMethodDialogOpen(false);
      setSelectedInvoice(null);
      return url;
    } catch (error) {
      const formattedError = formatPaymentError(error);
      toast.error(formattedError);
      console.error('Error creating ING payment:', error);
      return null;
    }
  };

  const createPayPalPayment = async (invoice: Invoice) => {
    try {
      // Validate invoice and amount before creating PayPal payment
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      // Create PayPal payment request
      const response = await fetch('/api/create-paypal-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid}`,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          description: `Factuur ${invoice.invoiceNumber}`,
          clientId: invoice.clientId,
          userId: currentUser?.uid,
          metadata: {
            invoiceId: invoice.id,
            clientId: invoice.clientId,
            invoiceNumber: invoice.invoiceNumber,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const formattedError = formatPaymentError(errorData.error || 'Failed to create PayPal payment');
        throw new Error(formattedError);
      }

      const { url, paymentId } = await response.json();

      // Update invoice with PayPal payment link
      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        status: 'sent'
      }, currentUser?.uid);

      toast.success('PayPal betaling succesvol aangemaakt!');
      setIsPaymentMethodDialogOpen(false);
      setSelectedInvoice(null);
      return url;
    } catch (error) {
      const formattedError = formatPaymentError(error);
      toast.error(formattedError);
      console.error('Error creating PayPal payment:', error);
      return null;
    }
  };

  const createMolliePayment = async (invoice: Invoice) => {
    try {
      // Validate invoice and amount before creating Mollie payment
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      // Create Mollie payment request
      const response = await fetch('/api/create-mollie-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid}`,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          description: `Factuur ${invoice.invoiceNumber}`,
          clientId: invoice.clientId,
          userId: currentUser?.uid,
          metadata: {
            invoiceId: invoice.id,
            clientId: invoice.clientId,
            invoiceNumber: invoice.invoiceNumber,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const formattedError = formatPaymentError(errorData.error || 'Failed to create Mollie payment');
        throw new Error(formattedError);
      }

      const { url, paymentId } = await response.json();

      // Update invoice with Mollie payment link
      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        status: 'sent'
      }, currentUser?.uid);

      toast.success('Mollie betaling succesvol aangemaakt!');
      setIsPaymentMethodDialogOpen(false);
      setSelectedInvoice(null);
      return url;
    } catch (error) {
      const formattedError = formatPaymentError(error);
      toast.error(formattedError);
      console.error('Error creating Mollie payment:', error);
      return null;
    }
  };

  const createTikkiePayment = async (invoice: Invoice) => {
    try {
      // Validate invoice and amount before creating Tikkie payment
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return null;
      }

      // Create Tikkie payment request
      const response = await fetch('/api/create-tikkie-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid}`,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          description: `Factuur ${invoice.invoiceNumber}`,
          clientId: invoice.clientId,
          userId: currentUser?.uid,
          metadata: {
            invoiceId: invoice.id,
            clientId: invoice.clientId,
            invoiceNumber: invoice.invoiceNumber,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const formattedError = formatPaymentError(errorData.error || 'Failed to create Tikkie payment');
        throw new Error(formattedError);
      }

      const { url, paymentId } = await response.json();

      // Update invoice with Tikkie payment link
      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        status: 'sent'
      }, currentUser?.uid);

      toast.success('Tikkie betaling succesvol aangemaakt!');
      setIsPaymentMethodDialogOpen(false);
      setSelectedInvoice(null);
      return url;
    } catch (error) {
      const formattedError = formatPaymentError(error);
      toast.error(formattedError);
      console.error('Error creating Tikkie payment:', error);
      return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'sent':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
  const pendingPayments = invoices.filter(i => i.status !== 'paid' && i.status !== 'draft').reduce((sum, i) => sum + i.totalAmount, 0);
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Betalingen</h1>
          <p className="text-gray-600">Overzicht van alle facturen en betalingen</p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-6 md:grid-cols-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totale Omzet
            </CardTitle>
            <Euro className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Betaalde facturen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Openstaand
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{pendingPayments.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Te ontvangen bedrag</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Betaalde Facturen
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidInvoices}</div>
            <p className="text-xs text-muted-foreground">Succesvol ontvangen</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verlopen
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueInvoices}</div>
            <p className="text-xs text-muted-foreground">Actie vereist</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Zoek facturen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <CreditCard className="h-4 w-4" />
          <span>{filteredInvoices.length} facturen</span>
        </div>
      </motion.div>

      {/* Payments Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Betalingen Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">
                  {searchTerm ? 'Geen facturen gevonden voor je zoekopdracht.' : 'Nog geen facturen aangemaakt.'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factuur</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Bedrag</TableHead>
                    <TableHead>Vervaldatum</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const client = clients.find(c => c.id === invoice.clientId);
                    const isOverdue = new Date(invoice.dueDate.seconds * 1000) < new Date() && invoice.status !== 'paid';

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {client ? `${client.firstName} ${client.lastName}` : 'Onbekende klant'}
                        </TableCell>
                        <TableCell className="font-medium">€{invoice.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(invoice.dueDate.seconds * 1000).toLocaleDateString('nl-NL')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(invoice.status)}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                              {invoice.status === 'paid' ? 'Betaald' :
                                invoice.status === 'sent' ? 'Verzonden' :
                                  invoice.status === 'overdue' ? 'Verlopen' :
                                    invoice.status === 'draft' ? 'Concept' : 'Openstaand'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {invoice.status !== 'paid' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEmailDialog(invoice)}
                                  title="Verstuur per email"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPaymentMethodDialog(invoice)}
                                  title="Maak betaallink"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                                {invoice.paymentLink && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(invoice.paymentLink, '_blank')}
                                    title="Open betaallink"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAsPaid(invoice)}
                                  title="Markeer als betaald"
                                  className="text-green-600 hover:bg-green-50"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                {invoice.status !== 'overdue' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => markAsOverdue(invoice)}
                                    title="Markeer als verlopen"
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={(open) => {
        setIsEmailDialogOpen(open);
        if (!open) setSendWithPaymentLink(true); // Reset to default when closing
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Factuur Verzenden</DialogTitle>
            <DialogDescription>
              {sendWithPaymentLink 
                ? `Verstuur factuur ${selectedInvoice?.invoiceNumber} naar de klant met een betaallink.` 
                : `Verstuur factuur ${selectedInvoice?.invoiceNumber} naar de klant zonder betaallink.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payment Link Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <p className="text-sm font-medium">Betaallink toevoegen</p>
                <p className="text-xs text-gray-500">
                  {sendWithPaymentLink 
                    ? "De klant kan direct online betalen" 
                    : "De klant ontvangt alleen de factuur"}
                </p>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  name="toggle"
                  id="toggle"
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                  checked={sendWithPaymentLink}
                  onChange={() => setSendWithPaymentLink(!sendWithPaymentLink)}
                />
                <label
                  htmlFor="toggle"
                  className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"
                ></label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Persoonlijk bericht (optioneel)</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Voeg een persoonlijk bericht toe aan de email..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={sendInvoiceEmail} disabled={emailSending}>
              {emailSending ? 'Verzenden...' : 'Factuur Verzenden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Dialog */}
      <Dialog open={isPaymentMethodDialogOpen} onOpenChange={setIsPaymentMethodDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Betaalmethode Kiezen</DialogTitle>
            <DialogDescription>
              Kies hoe u de betaallink wilt aanmaken voor factuur {selectedInvoice?.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2"
                onClick={() => createPaymentWithMethod('payment_link')}
              >
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span className="font-medium">Payment Link</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Eenvoudige betaallink die direct kan worden gedeeld
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2"
                onClick={() => createPaymentWithMethod('checkout_session')}
              >
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span className="font-medium">Checkout Session</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Geavanceerde checkout met meer betaalmethoden (iDEAL, SEPA, etc.)
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2"
                onClick={() => createPaymentWithMethod('paypal')}
              >
                <div className="flex items-center space-x-2">
                  <PayPalIcon className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">PayPal</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Betalingen via PayPal account
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2"
                onClick={() => createPaymentWithMethod('mollie')}
              >
                <div className="flex items-center space-x-2">
                  <MollieIcon className="h-5 w-5" />
                  <span className="font-medium">Mollie</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Betalingen via Mollie (iDEAL, Creditcard, Bancontact, etc.)
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2"
                onClick={() => createPaymentWithMethod('tikkie')}
              >
                <div className="flex items-center space-x-2">
                  <TikkieIcon className="h-5 w-5" />
                  <span className="font-medium">Tikkie</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Betalingen via Tikkie (ABN AMRO)
                </p>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start space-y-2"
                onClick={() => createPaymentWithMethod('ing')}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">ING Bank</span>
                </div>
                <p className="text-sm text-gray-600 text-left">
                  Direct betalen via ING Bank met PSD2 Payment Initiation
                </p>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPaymentMethodDialogOpen(false)}>
              Annuleren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}