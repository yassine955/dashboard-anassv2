'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService, clientService } from '@/lib/firebase-service';
// Email functionality is handled via API route
import { Invoice, Client, User } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { validatePaymentAmount, validateInvoiceForPayment, formatPaymentError } from '@/lib/payment-validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Search, Mail, ExternalLink, CreditCard, CheckCircle, Clock, AlertCircle, Euro, Zap, Smartphone, Building2, RefreshCw, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { soundService } from '@/lib/sound-service';
import { PayPalIcon } from '@/components/icons/PayPalIcon';
import { MollieIcon } from '@/components/icons/MollieIcon';
import { TikkieIcon } from '@/components/icons/TikkieIcon';

// Helper functions for payment providers
const getProviderDisplayName = (provider: string): string => {
  switch (provider) {
    case 'stripe': return 'Stripe';
    case 'tikkie': return 'Tikkie';
    case 'ing': return 'ING';
    case 'paypal': return 'PayPal';
    case 'mollie': return 'Mollie';
    default: return provider;
  }
};

const getProviderIcon = (provider: string) => {
  switch (provider) {
    case 'stripe': return <CreditCard className="h-4 w-4" />;
    case 'tikkie': return <TikkieIcon className="h-4 w-4" />;
    case 'ing': return <Building2 className="h-4 w-4" />;
    case 'paypal': return <PayPalIcon className="h-4 w-4" />;
    case 'mollie': return <MollieIcon className="h-4 w-4" />;
    default: return <CreditCard className="h-4 w-4" />;
  }
};

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
  const [isPaymentReminderDialogOpen, setIsPaymentReminderDialogOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sendWithPaymentLink, setSendWithPaymentLink] = useState(false);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [refreshingStatus, setRefreshingStatus] = useState<string | null>(null);
  const [isAutoPolling, setIsAutoPolling] = useState(false);

  // Load user data and payment settings
  useEffect(() => {
    if (!currentUser) return;

    const loadUserData = async () => {
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const user = { uid: userDoc.id, ...userDoc.data() } as User;
          setUserData(user);

          // Determine available payment providers
          const providers: string[] = [];
          if (user.paymentSettings?.stripe?.isActive) providers.push('stripe');
          if (user.paymentSettings?.tikkie?.isActive) providers.push('tikkie');
          if (user.paymentSettings?.ing?.isActive) providers.push('ing');
          if (user.paymentSettings?.paypal?.isActive) providers.push('paypal');
          if (user.paymentSettings?.mollie?.isActive) providers.push('mollie');

          setAvailableProviders(providers);

          // Set default payment provider to first available
          if (providers.length > 0) {
            setSelectedPaymentProvider(providers[0]);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [currentUser]);

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

  // Auto-polling for pending payments
  useEffect(() => {
    if (!currentUser) return;

    const checkPendingPayments = async () => {
      const pendingPayments = invoices.filter(invoice =>
        invoice.status === 'sent' &&
        invoice.paymentId &&
        (invoice.paymentProvider === 'tikkie' || invoice.paymentLink?.includes('tikkie'))
      );

      if (pendingPayments.length > 0) {
        setIsAutoPolling(true);
      }

      for (const invoice of pendingPayments) {
        try {
          const response = await fetch('/api/check-tikkie-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await currentUser.getIdToken()}`,
            },
            body: JSON.stringify({
              paymentId: invoice.paymentId,
              invoiceId: invoice.id,
              userId: currentUser.uid,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.updated && result.invoiceStatus === 'paid') {
              // Firebase listener will handle the UI update and notification
              console.log(`Payment detected for invoice ${invoice.invoiceNumber}`);
            }
          }
        } catch (error) {
          console.error(`Error checking payment status for ${invoice.invoiceNumber}:`, error);
        }
      }

      if (pendingPayments.length === 0) {
        setIsAutoPolling(false);
      }
    };

    // Check immediately on load
    if (invoices.length > 0) {
      checkPendingPayments();
    }

    // Set up polling every 30 seconds for pending payments
    const pollInterval = setInterval(() => {
      if (invoices.some(inv => inv.status === 'sent' && inv.paymentId)) {
        checkPendingPayments();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [currentUser, invoices]);

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

  // Create payment link based on selected provider
  const createPaymentLinkForProvider = async (invoice: Invoice, provider: string): Promise<string | null> => {
    switch (provider) {
      case 'stripe':
        return await createPaymentLink(invoice);
      case 'tikkie':
        return await createTikkiePayment(invoice);
      case 'ing':
        return await createINGPayment(invoice);
      case 'paypal':
        return await createPayPalPayment(invoice);
      case 'mollie':
        return await createMolliePayment(invoice);
      default:
        toast.error(`Onbekende payment provider: ${provider}`);
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
      if (sendWithPaymentLink && selectedPaymentProvider) {
        paymentLink = selectedInvoice.paymentLink;
        // Check if existing payment link is for the same provider
        const needsNewPaymentLink = !paymentLink ||
          (selectedPaymentProvider === 'stripe' && !paymentLink.includes('checkout.stripe.com') && !paymentLink.includes('buy.stripe.com')) ||
          (selectedPaymentProvider === 'tikkie' && !paymentLink.includes('tikkie')) ||
          (selectedPaymentProvider === 'ing' && !paymentLink.includes('ing')) ||
          (selectedPaymentProvider === 'paypal' && !paymentLink.includes('paypal')) ||
          (selectedPaymentProvider === 'mollie' && !paymentLink.includes('mollie'));

        if (needsNewPaymentLink) {
          paymentLink = await createPaymentLinkForProvider(selectedInvoice, selectedPaymentProvider);
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
          userId: currentUser?.uid,
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
      setSendWithPaymentLink(availableProviders.length > 0);
      setSelectedPaymentProvider(availableProviders.length > 0 ? availableProviders[0] : null);
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
    setSendWithPaymentLink(availableProviders.length > 0);
    setSelectedPaymentProvider(availableProviders.length > 0 ? availableProviders[0] : null);
    setIsEmailDialogOpen(true);
  };

  const openPaymentMethodDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentMethodDialogOpen(true);
  };

  const openPaymentReminderDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCustomMessage('');
    setIsPaymentReminderDialogOpen(true);
  };

  const sendPaymentReminder = async () => {
    if (!selectedInvoice) return;

    setEmailSending(true);
    try {
      const client = clients.find(c => c.id === selectedInvoice.clientId);
      if (!client) {
        toast.error('Klant niet gevonden.');
        return;
      }

      // Use existing payment link if available
      const paymentLink = selectedInvoice.paymentLink || undefined;

      // Send payment reminder email
      const response = await fetch('/api/send-payment-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: client.email,
          invoiceId: selectedInvoice.id,
          clientId: client.id,
          userId: currentUser?.uid,
          paymentLink,
          customMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send payment reminder');
      }

      const result = await response.json();

      toast.success(`Betalingsherinnering succesvol verzonden naar ${client.email}!`);
      // Play email sent confirmation sound
      soundService.playEmailSent();
      setIsPaymentReminderDialogOpen(false);
      setSelectedInvoice(null);
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending payment reminder:', error);

      // Show specific error message to user
      const errorMessage = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het verzenden van de betalingsherinnering.';
      toast.error(errorMessage);
    } finally {
      setEmailSending(false);
    }
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

      // Update invoice with Tikkie payment link and payment info
      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        paymentId: paymentId,
        paymentProvider: 'tikkie',
        status: 'sent'
      }, currentUser?.uid);

      toast.success('Tikkie betaling succesvol aangemaakt!');

      // Start frequent polling for this payment (check every 5 seconds for first 2 minutes)
      let pollCount = 0;
      const maxPolls = 24; // 24 polls = 2 minutes at 5-second intervals

      const frequentPoll = setInterval(async () => {
        pollCount++;

        try {
          const pollResponse = await fetch('/api/check-tikkie-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await currentUser?.getIdToken()}`,
            },
            body: JSON.stringify({
              paymentId: paymentId,
              invoiceId: invoice.id,
              userId: currentUser?.uid,
            }),
          });

          if (pollResponse.ok) {
            const pollResult = await pollResponse.json();
            if (pollResult.updated && pollResult.invoiceStatus === 'paid') {
              clearInterval(frequentPoll);
              console.log(`Fast payment detection for invoice ${invoice.invoiceNumber}`);
            }
          }
        } catch (error) {
          console.error('Error in frequent poll:', error);
        }

        // Stop frequent polling after 2 minutes (regular 30s polling will continue)
        if (pollCount >= maxPolls) {
          clearInterval(frequentPoll);
        }
      }, 5000); // Poll every 5 seconds

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

  const refreshPaymentStatus = async (invoice: Invoice) => {
    if (!invoice.paymentId || !invoice.paymentLink) {
      toast.error('Geen betalingsinformatie beschikbaar om te vernieuwen.');
      return;
    }

    setRefreshingStatus(invoice.id);
    try {
      // Determine payment provider based on payment link URL
      let endpoint = '';
      let provider = '';

      if (invoice.paymentLink.includes('tikkie') || invoice.paymentProvider === 'tikkie') {
        endpoint = '/api/check-tikkie-payment';
        provider = 'Tikkie';
      } else if (invoice.paymentLink.includes('paypal') || invoice.paymentProvider === 'paypal') {
        endpoint = '/api/check-paypal-payment';
        provider = 'PayPal';
      } else if (invoice.paymentLink.includes('mollie') || invoice.paymentProvider === 'mollie') {
        endpoint = '/api/check-mollie-payment';
        provider = 'Mollie';
      } else {
        // Default to Stripe
        endpoint = '/api/check-stripe-payment';
        provider = 'Stripe';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.uid}`,
        },
        body: JSON.stringify({
          paymentId: invoice.paymentId,
          invoiceId: invoice.id,
          userId: currentUser?.uid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to check ${provider} payment status`);
      }

      const result = await response.json();

      if (result.updated) {
        toast.success(`Betalingsstatus bijgewerkt! Status: ${result.invoiceStatus}`);
        if (result.invoiceStatus === 'paid') {
          soundService.playPaymentReceived();
        }
      } else {
        toast.info(`Geen wijzigingen. Huidige status: ${result.paymentStatus}`);
      }

    } catch (error: any) {
      console.error('Error refreshing payment status:', error);
      toast.error(error.message || 'Er is een fout opgetreden bij het vernieuwen van de betalingsstatus.');
    } finally {
      setRefreshingStatus(null);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Betalingen</h1>
            <p className="text-gray-600">Overzicht van alle facturen en betalingen</p>
          </div>
          {isAutoPolling && (
            <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-full">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Live monitoring betalingen...
            </div>
          )}
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
                            {invoice.status === 'sent' &&
                             invoice.paymentId &&
                             (invoice.paymentProvider === 'tikkie' || invoice.paymentLink?.includes('tikkie')) && (
                              <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full" title="Live monitoring actief">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                                Live
                              </div>
                            )}
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
                                {(invoice.status === 'overdue' || invoice.status === 'sent') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openPaymentReminderDialog(invoice)}
                                    title="Verstuur betalingsherinnering"
                                    className="text-orange-600 hover:bg-orange-50"
                                  >
                                    <Bell className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPaymentMethodDialog(invoice)}
                                  title="Maak betaallink"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                                {invoice.paymentLink && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(invoice.paymentLink, '_blank')}
                                      title="Open betaallink"
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                    {(invoice.paymentId || invoice.paymentProvider) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => refreshPaymentStatus(invoice)}
                                        disabled={refreshingStatus === invoice.id}
                                        title="Vernieuw betalingsstatus"
                                        className="text-blue-600 hover:bg-blue-50"
                                      >
                                        <RefreshCw className={`h-4 w-4 ${refreshingStatus === invoice.id ? 'animate-spin' : ''}`} />
                                      </Button>
                                    )}
                                  </>
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
        if (!open) {
          setSendWithPaymentLink(availableProviders.length > 0);
          setSelectedPaymentProvider(availableProviders.length > 0 ? availableProviders[0] : null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Factuur Verzenden</DialogTitle>
            <DialogDescription>
              {sendWithPaymentLink && selectedPaymentProvider
                ? `Verstuur factuur ${selectedInvoice?.invoiceNumber} naar de klant met ${getProviderDisplayName(selectedPaymentProvider)} betaallink.`
                : `Verstuur factuur ${selectedInvoice?.invoiceNumber} naar de klant zonder betaallink.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Payment Provider Selection */}
            {availableProviders.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="include-payment-link" className="text-sm font-medium">
                    Betaallink toevoegen
                  </Label>
                  <Switch
                    id="include-payment-link"
                    checked={sendWithPaymentLink}
                    onCheckedChange={setSendWithPaymentLink}
                  />
                </div>

                {sendWithPaymentLink && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Betaalmethode</Label>
                    <Select value={selectedPaymentProvider || ''} onValueChange={setSelectedPaymentProvider}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Kies een betaalmethode" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.map((provider) => (
                          <SelectItem key={provider} value={provider}>
                            <div className="flex items-center space-x-2">
                              {getProviderIcon(provider)}
                              <span>{getProviderDisplayName(provider)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      De klant kan direct online betalen via {selectedPaymentProvider ? getProviderDisplayName(selectedPaymentProvider) : 'de gekozen methode'}
                    </p>
                  </div>
                )}

                {!sendWithPaymentLink && (
                  <p className="text-xs text-gray-500">
                    De klant ontvangt alleen de factuur zonder betaalmogelijkheid
                  </p>
                )}
              </div>
            )}

            {availableProviders.length === 0 && (
              <div className="p-3 bg-yellow-50 rounded-md">
                <p className="text-sm text-yellow-800">
                  Geen betaalmethodes geactiveerd. Ga naar instellingen om betaalmethodes te configureren.
                </p>
              </div>
            )}
            
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

      {/* Payment Reminder Dialog */}
      <Dialog open={isPaymentReminderDialogOpen} onOpenChange={setIsPaymentReminderDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Betalingsherinnering Versturen</DialogTitle>
            <DialogDescription>
              Verstuur een betalingsherinnering voor factuur {selectedInvoice?.invoiceNumber} naar de klant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Bell className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Factuurinformatie</span>
                </div>
                <div className="text-sm text-orange-700">
                  <p><strong>Factuur:</strong> {selectedInvoice.invoiceNumber}</p>
                  <p><strong>Bedrag:</strong> €{selectedInvoice.totalAmount.toFixed(2)}</p>
                  <p><strong>Vervaldatum:</strong> {new Date(selectedInvoice.dueDate.seconds * 1000).toLocaleDateString('nl-NL')}</p>
                  {selectedInvoice.paymentLink && (
                    <p><strong>Betaallink:</strong> Beschikbaar</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Persoonlijk bericht (optioneel)</label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Voeg een persoonlijk bericht toe aan de betalingsherinnering..."
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Let op:</strong> De betalingsherinnering wordt verzonden met een urgente toon.
                {selectedInvoice?.paymentLink ? ' De bestaande betaallink wordt automatisch toegevoegd.' : ' Er is geen betaallink beschikbaar voor deze factuur.'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPaymentReminderDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={sendPaymentReminder} disabled={emailSending} className="bg-orange-600 hover:bg-orange-700">
              {emailSending ? 'Verzenden...' : 'Herinnering Versturen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}