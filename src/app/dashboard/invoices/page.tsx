'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService, clientService, productService } from '@/lib/firebase-service';
import { generateInvoicePDF, downloadPDF } from '@/lib/pdf';
import { Invoice, Client, Product, InvoiceItem, User } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { validatePaymentAmount, validateInvoiceForPayment, formatPaymentError } from '@/lib/payment-validation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Search, Edit, Trash2, FileText, Download, Mail, Eye, Euro, Copy, CreditCard, ExternalLink, CheckCircle, Clock, AlertCircle, RefreshCw, Bell, Zap, Smartphone, Building2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';
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

export default function InvoicesPage() {
  const { currentUser, userProfile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Invoice creation state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Payment functionality state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isPaymentMethodDialogOpen, setIsPaymentMethodDialogOpen] = useState(false);
  const [isPaymentReminderDialogOpen, setIsPaymentReminderDialogOpen] = useState(false);
  const [isDirectSendDialogOpen, setIsDirectSendDialogOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [sendWithPaymentLink, setSendWithPaymentLink] = useState(false);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<string | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [refreshingStatus, setRefreshingStatus] = useState<string | null>(null);
  const [isAutoPolling, setIsAutoPolling] = useState(false);
  const [pendingInvoiceData, setPendingInvoiceData] = useState<any>(null);
  const [duplicatingInvoice, setDuplicatingInvoice] = useState<string | null>(null);

  // Invoice editing state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingItems, setEditingItems] = useState<InvoiceItem[]>([]);
  const [editingSelectedClientId, setEditingSelectedClientId] = useState('');
  const [editingInvoiceDate, setEditingInvoiceDate] = useState('');
  const [editingDueDate, setEditingDueDate] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [updatingInvoice, setUpdatingInvoice] = useState(false);

  // Invoice viewing state
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Bulk selection state
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [isSelectAllChecked, setIsSelectAllChecked] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Payment notification deduplication
  const [notifiedPayments, setNotifiedPayments] = useState<Set<string>>(new Set());

  // Loading states for individual operations
  const [markingAsPaid, setMarkingAsPaid] = useState<Set<string>>(new Set());
  const [markingAsOverdue, setMarkingAsOverdue] = useState<Set<string>>(new Set());
  const [creatingPayment, setCreatingPayment] = useState(false);

  // Helper function to show payment notification only once per invoice
  const showPaymentNotification = (invoiceNumber: string, message: string) => {
    if (!notifiedPayments.has(invoiceNumber)) {
      const newNotifiedPayments = new Set(notifiedPayments);
      newNotifiedPayments.add(invoiceNumber);
      setNotifiedPayments(newNotifiedPayments);

      soundService.playPaymentReceived();
      toast.success(message);

      // Remove from notified set after 5 minutes to allow new notifications for the same invoice
      setTimeout(() => {
        setNotifiedPayments(prev => {
          const updated = new Set(prev);
          updated.delete(invoiceNumber);
          return updated;
        });
      }, 5 * 60 * 1000); // 5 minutes
    }
  };

  // Additional state for the complete invoice form
  const [selectedClientId, setSelectedClientId] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    unitPrice: 0,
    vatRate: 21,
    lineTotal: 0
  }]);
  const [userSettings, setUserSettings] = useState<User | null>(null);

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
            setSendWithPaymentLink(true);
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
            showPaymentNotification(invoice.invoiceNumber, `Factuur ${invoice.invoiceNumber} is betaald! 🎉`);
          }
        }
      });
    });

    // Load clients and products
    const loadData = async () => {
      try {
        const [clientsData, productsData] = await Promise.all([
          clientService.getClients(currentUser.uid),
          productService.getProducts(currentUser.uid)
        ]);
        setClients(clientsData);
        setProducts(productsData);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();

    return () => unsubscribeInvoices();
  }, [currentUser, invoices]);

  // Filter invoices based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredInvoices(invoices);
    } else {
      const filtered = invoices.filter(invoice => {
        const client = clients.find(c => c.id === invoice.clientId);
        const clientName = client ? `${client.firstName} ${client.lastName}` : '';

        return (
          invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
      setFilteredInvoices(filtered);
    }
  }, [invoices, clients, searchTerm]);

  // Enhanced auto-polling for pending payments (all providers)
  useEffect(() => {
    if (!currentUser) return;

    const checkPendingPayments = async () => {
      const pendingPayments = invoices.filter(invoice =>
        invoice.status === 'sent' &&
        invoice.paymentId &&
        invoice.paymentProvider
      );

      if (pendingPayments.length > 0) {
        setIsAutoPolling(true);
      }

      for (const invoice of pendingPayments) {
        try {
          let endpoint = '';

          // Determine the correct API endpoint based on payment provider
          switch (invoice.paymentProvider) {
            case 'tikkie':
              endpoint = '/api/check-tikkie-payment';
              break;
            case 'stripe':
              endpoint = '/api/check-stripe-payment';
              break;
            case 'paypal':
              endpoint = '/api/check-paypal-payment';
              break;
            case 'mollie':
              endpoint = '/api/check-mollie-payment';
              break;
            case 'ing':
              endpoint = '/api/check-ing-payment';
              break;
            default:
              console.log(`Unknown payment provider: ${invoice.paymentProvider}`);
              continue;
          }

          const response = await fetch(endpoint, {
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
              console.log(`Payment detected for invoice ${invoice.invoiceNumber} via ${invoice.paymentProvider}`);
              showPaymentNotification(invoice.invoiceNumber, `💰 Betaling ontvangen voor factuur ${invoice.invoiceNumber}!`);
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

    if (invoices.length > 0) {
      checkPendingPayments();
    }

    // Enhanced polling with adaptive intervals
    const pollInterval = setInterval(() => {
      const hasPendingPayments = invoices.some(inv =>
        inv.status === 'sent' && inv.paymentId && inv.paymentProvider
      );

      if (hasPendingPayments) {
        checkPendingPayments();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(pollInterval);
  }, [currentUser, invoices]);

  // Basic functionality
  const calculateTotals = () => {
    // Use the new items state instead of invoiceItems
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const vatAmount = items.reduce((sum, item) =>
      sum + ((item.quantity * item.unitPrice) * item.vatRate / 100), 0
    );
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  };

  // Invoice form management functions
  const addInvoiceItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 21,
      lineTotal: 0
    }]);
  };

  const removeInvoiceItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updatedItems = items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate lineTotal when quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.lineTotal = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    });
    setItems(updatedItems);
  };

  const addProductToInvoice = (product: Product) => {
    setItems([...items, {
      id: crypto.randomUUID(),
      productId: product.id,
      product: product,
      description: product.name,
      quantity: 1,
      unitPrice: product.basePrice,
      vatRate: product.vatRate || 21,
      lineTotal: product.basePrice
    }]);
  };

  // Sync userSettings with userData
  useEffect(() => {
    if (userData) {
      setUserSettings(userData);
    }
  }, [userData]);

  const createInvoice = async () => {
    // Validation using the new form state
    if (!currentUser || !selectedClientId || items.length === 0) {
      toast.error('Selecteer een klant en voeg items toe aan de factuur.');
      return;
    }

    // Check if all items are valid
    const hasInvalidItems = items.some(item =>
      !item.description || item.quantity <= 0 || item.unitPrice <= 0
    );

    if (hasInvalidItems) {
      toast.error('Vul alle verplichte velden in voor alle factuurregels.');
      return;
    }

    const { subtotal, vatAmount, total } = calculateTotals();

    // Items are already in the correct InvoiceItem format
    const invoiceItems: InvoiceItem[] = items;

    const invoiceData = {
      clientId: selectedClientId,
      invoiceDate: Timestamp.fromDate(new Date(invoiceDate)),
      dueDate: Timestamp.fromDate(new Date(dueDate)),
      subtotal,
      vatAmount,
      totalAmount: total,
      items: invoiceItems,
      notes,
      status: 'draft' as const
    };

    setPendingInvoiceData(invoiceData);
    setIsCreateDialogOpen(false);
    setIsDirectSendDialogOpen(true);
  };

  const confirmCreateInvoice = async (shouldSendDirectly: boolean) => {
    if (!currentUser || !pendingInvoiceData) return;

    setSubmitting(true);
    try {
      const createdInvoice = await invoiceService.createInvoice(currentUser.uid, pendingInvoiceData);

      if (shouldSendDirectly) {
        setSelectedInvoice(createdInvoice);
        setCustomMessage('');
        setSendWithPaymentLink(availableProviders.length > 0);
        setSelectedPaymentProvider(availableProviders.length > 0 ? availableProviders[0] : null);
        setIsEmailDialogOpen(true);
      }

      setSelectedClient(null);
      setInvoiceItems([]);
      setNotes('');
      setIsCreateDialogOpen(false);
      setIsDirectSendDialogOpen(false);
      setPendingInvoiceData(null);

      toast.success(shouldSendDirectly ? 'Factuur aangemaakt! Kies je verzendopties.' : 'Factuur succesvol aangemaakt!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het aanmaken van de factuur.');
      console.error('Error creating invoice:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // PDF and utility functions
  const handleDownloadPDF = async (invoice: Invoice) => {
    if (!userProfile || !clients.find(c => c.id === invoice.clientId)) {
      toast.error('Kan PDF niet genereren: onvolledige gegevens');
      return;
    }

    try {
      const client = clients.find(c => c.id === invoice.clientId)!;
      const pdfBytes = await generateInvoicePDF(invoice, client, userProfile);

      // Trigger download
      downloadPDF(pdfBytes, `Factuur-${invoice.invoiceNumber}.pdf`);
      toast.success('PDF download gestart!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het genereren van de PDF');
      console.error('Error generating PDF:', error);
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!currentUser) {
      toast.error('Je moet ingelogd zijn om een factuur te verwijderen.');
      return;
    }

    if (!confirm('Weet je zeker dat je deze factuur wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
      return;
    }

    try {
      await invoiceService.deleteInvoice(invoice.id, currentUser.uid);
      toast.success('Factuur succesvol verwijderd!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het verwijderen van de factuur.');
      console.error('Error deleting invoice:', error);
    }
  };

  const handleDuplicate = async (invoice: Invoice) => {
    if (!currentUser) {
      toast.error('Je moet ingelogd zijn om een factuur te dupliceren.');
      return;
    }

    setDuplicatingInvoice(invoice.id);
    try {
      await invoiceService.duplicateInvoice(invoice, currentUser.uid);
      toast.success('✅ Factuur succesvol gedupliceerd!');
      soundService.playSuccess && soundService.playSuccess();
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het dupliceren van de factuur.');
      console.error('Error duplicating invoice:', error);
    } finally {
      setDuplicatingInvoice(null);
    }
  };

  // Invoice editing functions
  const openEditDialog = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setEditingItems([...invoice.items]);
    setEditingSelectedClientId(invoice.clientId);
    setEditingInvoiceDate(new Date(invoice.invoiceDate.seconds * 1000).toISOString().split('T')[0]);
    setEditingDueDate(new Date(invoice.dueDate.seconds * 1000).toISOString().split('T')[0]);
    setEditingNotes(invoice.notes || '');
    setIsEditDialogOpen(true);
  };

  const calculateEditingTotals = () => {
    const subtotal = editingItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const vatAmount = editingItems.reduce((sum, item) =>
      sum + ((item.quantity * item.unitPrice) * item.vatRate / 100), 0
    );
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  };

  const addEditingInvoiceItem = () => {
    setEditingItems([...editingItems, {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 21,
      lineTotal: 0
    }]);
  };

  const removeEditingInvoiceItem = (index: number) => {
    if (editingItems.length > 1) {
      setEditingItems(editingItems.filter((_, i) => i !== index));
    }
  };

  const updateEditingInvoiceItem = (index: number, field: string, value: any) => {
    const updatedItems = editingItems.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate lineTotal when quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.lineTotal = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    });
    setEditingItems(updatedItems);
  };

  const addEditingProductToInvoice = (product: Product) => {
    setEditingItems([...editingItems, {
      id: crypto.randomUUID(),
      productId: product.id,
      product: product,
      description: product.name,
      quantity: 1,
      unitPrice: product.basePrice,
      vatRate: product.vatRate || 21,
      lineTotal: product.basePrice
    }]);
  };

  const updateInvoice = async () => {
    if (!currentUser || !editingInvoice || !editingSelectedClientId || editingItems.length === 0) {
      toast.error('Vul alle verplichte velden in.');
      return;
    }

    // Check if all items are valid
    const hasInvalidItems = editingItems.some(item =>
      !item.description || item.quantity <= 0 || item.unitPrice <= 0
    );

    if (hasInvalidItems) {
      toast.error('Vul alle verplichte velden in voor alle factuurregels.');
      return;
    }

    const { subtotal, vatAmount, total } = calculateEditingTotals();

    setUpdatingInvoice(true);
    try {
      const updatedInvoiceData = {
        clientId: editingSelectedClientId,
        invoiceDate: Timestamp.fromDate(new Date(editingInvoiceDate)),
        dueDate: Timestamp.fromDate(new Date(editingDueDate)),
        subtotal,
        vatAmount,
        totalAmount: total,
        items: editingItems,
        notes: editingNotes,
      };

      await invoiceService.updateInvoice(editingInvoice.id, updatedInvoiceData, currentUser.uid);

      toast.success('Factuur succesvol bijgewerkt!');
      setIsEditDialogOpen(false);
      setEditingInvoice(null);
      setEditingItems([]);
      setEditingSelectedClientId('');
      setEditingNotes('');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het bijwerken van de factuur.');
      console.error('Error updating invoice:', error);
    } finally {
      setUpdatingInvoice(false);
    }
  };

  // Invoice viewing functions
  const openViewDialog = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setIsViewDialogOpen(true);
  };

  // Bulk selection functions
  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelectedIds = new Set(selectedInvoiceIds);
    if (checked) {
      newSelectedIds.add(invoiceId);
    } else {
      newSelectedIds.delete(invoiceId);
      setIsSelectAllChecked(false);
    }
    setSelectedInvoiceIds(newSelectedIds);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allInvoiceIds = new Set(filteredInvoices.map(invoice => invoice.id));
      setSelectedInvoiceIds(allInvoiceIds);
      setIsSelectAllChecked(true);
    } else {
      setSelectedInvoiceIds(new Set());
      setIsSelectAllChecked(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoiceIds.size === 0) {
      toast.error('Selecteer facturen om te verwijderen.');
      return;
    }

    const confirmed = confirm(
      `Weet je zeker dat je ${selectedInvoiceIds.size} factuur${selectedInvoiceIds.size === 1 ? '' : 'en'} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`
    );

    if (!confirmed) return;

    if (!currentUser) {
      toast.error('Je moet ingelogd zijn om facturen te verwijderen.');
      return;
    }

    setIsDeletingBulk(true);
    try {
      // Delete invoices one by one to ensure proper authorization checks
      const deletePromises = Array.from(selectedInvoiceIds).map(invoiceId =>
        invoiceService.deleteInvoice(invoiceId, currentUser.uid)
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedInvoiceIds.size} factuur${selectedInvoiceIds.size === 1 ? '' : 'en'} succesvol verwijderd!`);
      setSelectedInvoiceIds(new Set());
      setIsSelectAllChecked(false);
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het verwijderen van de facturen.');
      console.error('Error bulk deleting invoices:', error);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Payment functionality methods
  const createPaymentLink = async (invoice: Invoice, useCheckoutSession = false) => {
    try {
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return false;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return false;
      }

      const response = await fetch('/api/create-payment-link', {
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
        let errorMessage = 'Failed to create payment link';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('Failed to parse error response as JSON:', jsonError);
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        const formattedError = formatPaymentError(errorMessage);
        throw new Error(formattedError);
      }

      const { url, type } = await response.json();

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

  const createTikkiePayment = async (invoice: Invoice) => {
    try {
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return false;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return false;
      }

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

      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        paymentId: paymentId,
        paymentProvider: 'tikkie',
        status: 'sent'
      }, currentUser?.uid);

      toast.success('Tikkie betaling succesvol aangemaakt!');

      // Start frequent polling for fast payment detection
      let pollCount = 0;
      const maxPolls = 24;

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

        if (pollCount >= maxPolls) {
          clearInterval(frequentPoll);
        }
      }, 5000);

      return true;
    } catch (error) {
      const formattedError = formatPaymentError(error);
      toast.error(formattedError);
      console.error('Error creating Tikkie payment:', error);
      return false;
    }
  };

  const createPayPalPayment = async (invoice: Invoice) => {
    try {
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return false;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return false;
      }

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

      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        paymentId: paymentId,
        paymentProvider: 'paypal',
        status: 'sent'
      }, currentUser?.uid);

      toast.success('PayPal betaling succesvol aangemaakt!');
      return true;
    } catch (error) {
      const formattedError = formatPaymentError(error);
      toast.error(formattedError);
      console.error('Error creating PayPal payment:', error);
      return false;
    }
  };

  const createMolliePayment = async (invoice: Invoice) => {
    try {
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return false;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return false;
      }

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

      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        paymentId: paymentId,
        paymentProvider: 'mollie',
        status: 'sent'
      }, currentUser?.uid);

      toast.success('Mollie betaling succesvol aangemaakt!');
      return true;
    } catch (error) {
      const formattedError = formatPaymentError(error);
      toast.error(formattedError);
      console.error('Error creating Mollie payment:', error);
      return false;
    }
  };

  const createINGPayment = async (invoice: Invoice) => {
    try {
      const invoiceValidation = validateInvoiceForPayment(invoice);
      if (!invoiceValidation.isValid) {
        invoiceValidation.errors.forEach(error => toast.error(error));
        return false;
      }

      const amountValidation = validatePaymentAmount(invoice.totalAmount);
      if (!amountValidation.isValid) {
        amountValidation.errors.forEach(error => toast.error(error));
        return false;
      }

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

      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        paymentId: paymentId,
        paymentProvider: 'ing',
        status: 'sent'
      }, currentUser?.uid);

      toast.success('ING betaling succesvol aangemaakt!');
      return true;
    } catch (error) {
      const formattedError = formatPaymentError(error);
      toast.error(formattedError);
      console.error('Error creating ING payment:', error);
      return false;
    }
  };

  const createPaymentLinkForProvider = async (invoice: Invoice, provider: string): Promise<boolean> => {
    switch (provider) {
      case 'stripe':
        const stripeResult = await createPaymentLink(invoice);
        return !!stripeResult;
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
        return false;
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

      let paymentLink = null;
      if (sendWithPaymentLink && selectedPaymentProvider) {
        paymentLink = selectedInvoice.paymentLink;
        const needsNewPaymentLink = !paymentLink ||
          (selectedPaymentProvider === 'stripe' && !paymentLink.includes('checkout.stripe.com') && !paymentLink.includes('buy.stripe.com')) ||
          (selectedPaymentProvider === 'tikkie' && !paymentLink.includes('tikkie')) ||
          (selectedPaymentProvider === 'ing' && !paymentLink.includes('ing')) ||
          (selectedPaymentProvider === 'paypal' && !paymentLink.includes('paypal')) ||
          (selectedPaymentProvider === 'mollie' && !paymentLink.includes('mollie'));

        if (needsNewPaymentLink) {
          const success = await createPaymentLinkForProvider(selectedInvoice, selectedPaymentProvider);
          if (!success) return;

          // Refetch the updated invoice to get the new payment link
          const updatedInvoice = await invoiceService.getInvoice(selectedInvoice.id, currentUser?.uid);
          paymentLink = updatedInvoice.paymentLink;
        }
      }

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
          paymentLink,
          customMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      await invoiceService.updateInvoice(selectedInvoice.id, {
        status: 'sent'
      }, currentUser?.uid);

      toast.success(`Factuur succesvol verzonden naar ${client.email}!`);
      soundService.playEmailSent();
      setIsEmailDialogOpen(false);
      setSelectedInvoice(null);
      setCustomMessage('');
      setSendWithPaymentLink(availableProviders.length > 0);
      setSelectedPaymentProvider(availableProviders.length > 0 ? availableProviders[0] : null);
    } catch (error) {
      console.error('Error sending email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het verzenden van de email.';
      toast.error(errorMessage);
    } finally {
      setEmailSending(false);
    }
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

      const paymentLink = selectedInvoice.paymentLink || undefined;

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

      toast.success(`Betalingsherinnering succesvol verzonden naar ${client.email}!`);
      soundService.playEmailSent();
      setIsPaymentReminderDialogOpen(false);
      setSelectedInvoice(null);
      setCustomMessage('');
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Er is een fout opgetreden bij het verzenden van de betalingsherinnering.';
      toast.error(errorMessage);
    } finally {
      setEmailSending(false);
    }
  };

  const markAsPaid = async (invoice: Invoice) => {
    // Set loading state
    setMarkingAsPaid(prev => new Set(prev).add(invoice.id));

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
    } finally {
      // Remove loading state
      setMarkingAsPaid(prev => {
        const updated = new Set(prev);
        updated.delete(invoice.id);
        return updated;
      });
    }
  };

  const markAsOverdue = async (invoice: Invoice) => {
    // Set loading state
    setMarkingAsOverdue(prev => new Set(prev).add(invoice.id));

    try {
      await invoiceService.updateInvoice(invoice.id, {
        status: 'overdue'
      }, currentUser?.uid);
      toast.success('Factuur gemarkeerd als verlopen!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het bijwerken van de factuur.');
      console.error('Error updating invoice:', error);
    } finally {
      // Remove loading state
      setMarkingAsOverdue(prev => {
        const updated = new Set(prev);
        updated.delete(invoice.id);
        return updated;
      });
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

  const createPaymentWithMethod = async (method: 'payment_link' | 'checkout_session' | 'ing' | 'paypal' | 'mollie' | 'tikkie') => {
    if (!selectedInvoice) return;

    setCreatingPayment(true);

    try {
      let success = false;

      switch (method) {
        case 'ing':
          success = await createINGPayment(selectedInvoice);
          break;
        case 'paypal':
          success = await createPayPalPayment(selectedInvoice);
          break;
        case 'mollie':
          success = await createMolliePayment(selectedInvoice);
          break;
        case 'tikkie':
          success = await createTikkiePayment(selectedInvoice);
          break;
        case 'checkout_session':
          const url1 = await createPaymentLink(selectedInvoice, true);
          success = !!url1;
          break;
        default:
          const url2 = await createPaymentLink(selectedInvoice, false);
          success = !!url2;
          break;
      }

      // Close dialog if payment creation was successful
      if (success) {
        setIsPaymentMethodDialogOpen(false);
        setSelectedInvoice(null);
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      // Dialog stays open on error so user can try again
    } finally {
      setCreatingPayment(false);
    }
  };

  const refreshPaymentStatus = async (invoice: Invoice) => {
    if (!invoice.paymentId || !invoice.paymentLink) {
      toast.error('Geen betalingsinformatie beschikbaar om te vernieuwen.');
      return;
    }

    setRefreshingStatus(invoice.id);
    try {
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
        if (result.invoiceStatus === 'paid') {
          showPaymentNotification(invoice.invoiceNumber, `💰 Factuur ${invoice.invoiceNumber} is nu betaald!`);
        } else {
          toast.success(`Betalingsstatus bijgewerkt! Status: ${result.invoiceStatus}`);
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

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { subtotal, vatAmount, total } = calculateTotals();
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
  const pendingPayments = invoices.filter(i => i.status !== 'paid' && i.status !== 'draft').reduce((sum, i) => sum + i.totalAmount, 0);
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facturen</h1>
            <p className="text-gray-600">Beheer je facturen en betalingen</p>
          </div>
          {isAutoPolling && (
            <div className="flex items-center text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-full">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Live monitoring betalingen...
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Bulk delete button - only show when invoices are selected */}
          {selectedInvoiceIds.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeletingBulk
                ? 'Verwijderen...'
                : `${selectedInvoiceIds.size} factuur${selectedInvoiceIds.size === 1 ? '' : 'en'} verwijderen`
              }
            </Button>
          )}

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nieuwe Factuur
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nieuwe Factuur Maken</DialogTitle>
              <DialogDescription>
                Selecteer een klant en voeg producten/diensten toe aan de factuur.
              </DialogDescription>
            </DialogHeader>
            {/* Complete Invoice Creation Form */}
            <div className="space-y-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Klant *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecteer een klant...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} {client.companyName ? `(${client.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Factuurdatum *</label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vervaldatum *</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Factuurregels</h3>
                  <Button type="button" onClick={addInvoiceItem} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Regel Toevoegen
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Regel {index + 1}</h4>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeInvoiceItem(index)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Beschrijving *</label>
                        <input
                          type="text"
                          placeholder="Beschrijving van product/dienst"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Aantal *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Prijs per stuk (€) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">BTW %</label>
                        <select
                          value={item.vatRate}
                          onChange={(e) => updateInvoiceItem(index, 'vatRate', parseFloat(e.target.value))}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value={0}>0% (BTW-vrij)</option>
                          <option value={9}>9% (Laag tarief)</option>
                          <option value={21}>21% (Hoog tarief)</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-600">
                      Subtotaal: €{(item.quantity * item.unitPrice).toFixed(2)} |
                      BTW: €{((item.quantity * item.unitPrice) * (item.vatRate / 100)).toFixed(2)} |
                      Totaal: €{((item.quantity * item.unitPrice) * (1 + item.vatRate / 100)).toFixed(2)}
                    </div>
                  </div>
                ))}

                {/* Quick Add Products */}
                {products.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-3">Snelle selectie uit je producten</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {products.map(product => (
                        <Button
                          key={product.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addProductToInvoice(product)}
                          className="justify-start h-auto py-2 px-3"
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">{product.name}</div>
                            <div className="text-xs text-gray-500">€{product.basePrice.toFixed(2)}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Invoice Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Opmerkingen (optioneel)</label>
                <textarea
                  placeholder="Aanvullende informatie voor de factuur..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Invoice Totals */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Factuurtotaal</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotaal (excl. BTW):</span>
                    <span>€{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTW:</span>
                    <span>€{vatAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                    <span>Totaal (incl. BTW):</span>
                    <span>€{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Validation Messages */}
              {!selectedClientId && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">Selecteer een klant om door te gaan.</p>
                </div>
              )}
              {items.some(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0) && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700">Vul alle verplichte velden in voor alle factuurregels.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuleren
              </Button>
              <Button onClick={createInvoice} disabled={submitting}>
                {submitting ? 'Aanmaken...' : 'Factuur Aanmaken'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
        className="flex items-center space-x-4 mb-6"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Zoek facturen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* Invoice Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Facturen Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isSelectAllChecked}
                        onCheckedChange={handleSelectAll}
                        aria-label="Selecteer alle facturen"
                      />
                    </TableHead>
                    <TableHead>Factuurnummer</TableHead>
                    <TableHead>Klant</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Vervaldatum</TableHead>
                    <TableHead>Bedrag</TableHead>
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
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoiceIds.has(invoice.id)}
                            onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                            aria-label={`Selecteer factuur ${invoice.invoiceNumber}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {client ? `${client.firstName} ${client.lastName}` : 'Onbekende klant'}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.invoiceDate.seconds * 1000).toLocaleDateString('nl-NL')}
                        </TableCell>
                        <TableCell>
                          <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(invoice.dueDate.seconds * 1000).toLocaleDateString('nl-NL')}
                          </span>
                        </TableCell>
                        <TableCell>
                          €{invoice.totalAmount.toFixed(2)}
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
                             invoice.paymentProvider && (
                              <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full" title={`Live monitoring actief voor ${getProviderDisplayName(invoice.paymentProvider)}`}>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-1"></div>
                                Live
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Quick actions - always visible */}
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadPDF(invoice)}
                                title="Download PDF"
                                className="hover:bg-blue-50"
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              {/* Primary action based on status */}
                              {invoice.status !== 'paid' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEmailDialog(invoice)}
                                  title="Verstuur per email"
                                  className="text-blue-600 hover:bg-blue-50"
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                              )}
                            </div>

                            {/* More actions dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-gray-50"
                                  title="Meer acties"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Acties</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {/* Invoice actions */}
                                <DropdownMenuItem
                                  onClick={() => openViewDialog(invoice)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Inzien factuur
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => openEditDialog(invoice)}
                                  className="cursor-pointer"
                                  disabled={invoice.status === 'paid'}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Bewerk factuur
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => handleDuplicate(invoice)}
                                  disabled={duplicatingInvoice === invoice.id}
                                  className="cursor-pointer"
                                >
                                  <Copy className="mr-2 h-4 w-4" />
                                  {duplicatingInvoice === invoice.id ? 'Dupliceren...' : 'Dupliceer factuur'}
                                </DropdownMenuItem>

                                {invoice.status !== 'paid' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Betalingen</DropdownMenuLabel>

                                    <DropdownMenuItem
                                      onClick={() => openPaymentMethodDialog(invoice)}
                                      className="cursor-pointer"
                                    >
                                      <CreditCard className="mr-2 h-4 w-4" />
                                      Maak betaallink
                                    </DropdownMenuItem>

                                    {invoice.paymentLink && (
                                      <DropdownMenuItem
                                        onClick={() => window.open(invoice.paymentLink, '_blank')}
                                        className="cursor-pointer"
                                      >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open betaallink
                                      </DropdownMenuItem>
                                    )}

                                    {(invoice.paymentId || invoice.paymentProvider) && (
                                      <DropdownMenuItem
                                        onClick={() => refreshPaymentStatus(invoice)}
                                        disabled={refreshingStatus === invoice.id}
                                        className="cursor-pointer"
                                      >
                                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshingStatus === invoice.id ? 'animate-spin' : ''}`} />
                                        {refreshingStatus === invoice.id ? 'Vernieuwen...' : 'Vernieuw status'}
                                      </DropdownMenuItem>
                                    )}

                                    {(invoice.status === 'overdue' || invoice.status === 'sent') && (
                                      <DropdownMenuItem
                                        onClick={() => openPaymentReminderDialog(invoice)}
                                        className="cursor-pointer text-orange-600"
                                      >
                                        <Bell className="mr-2 h-4 w-4" />
                                        Betalingsherinnering
                                      </DropdownMenuItem>
                                    )}

                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Status wijzigen</DropdownMenuLabel>

                                    <DropdownMenuItem
                                      onClick={() => markAsPaid(invoice)}
                                      disabled={markingAsPaid.has(invoice.id)}
                                      className="cursor-pointer text-green-600"
                                    >
                                      <CheckCircle className={`mr-2 h-4 w-4 ${markingAsPaid.has(invoice.id) ? 'animate-spin' : ''}`} />
                                      {markingAsPaid.has(invoice.id) ? 'Markeren...' : 'Markeer als betaald'}
                                    </DropdownMenuItem>

                                    {invoice.status !== 'overdue' && (
                                      <DropdownMenuItem
                                        onClick={() => markAsOverdue(invoice)}
                                        disabled={markingAsOverdue.has(invoice.id)}
                                        className="cursor-pointer text-red-600"
                                      >
                                        <AlertCircle className={`mr-2 h-4 w-4 ${markingAsOverdue.has(invoice.id) ? 'animate-spin' : ''}`} />
                                        {markingAsOverdue.has(invoice.id) ? 'Markeren...' : 'Markeer als verlopen'}
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}

                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(invoice)}
                                  className="cursor-pointer text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Verwijder factuur
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">
                  {searchTerm ? 'Geen facturen gevonden voor je zoekopdracht.' : 'Geen facturen gevonden. Maak je eerste factuur aan!'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Direct Send Confirmation Dialog */}
      <Dialog open={isDirectSendDialogOpen} onOpenChange={setIsDirectSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Factuur Aangemaakt!</DialogTitle>
            <DialogDescription>
              Wil je deze factuur direct naar de klant verzenden?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Ja:</strong> Verstuur factuur direct met betaalmogelijkheden<br />
                <strong>Nee:</strong> Bewaar als concept voor later
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => confirmCreateInvoice(false)}>
              Bewaar als Concept
            </Button>
            <Button onClick={() => confirmCreateInvoice(true)} className="bg-blue-600 hover:bg-blue-700">
              Direct Verzenden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Selection Dialog */}
      <Dialog open={isPaymentMethodDialogOpen} onOpenChange={setIsPaymentMethodDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kies Betaalmethode</DialogTitle>
            <DialogDescription>
              Selecteer een betaalprovider om een betaallink te maken voor factuur {selectedInvoice?.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {/* Stripe Options */}
              {userSettings?.paymentSettings?.stripe?.isActive && (
                <>
                  <Button
                    variant="outline"
                    className="h-16 justify-start space-x-3 hover:bg-purple-50 border-purple-200"
                    onClick={() => createPaymentWithMethod('payment_link')}
                    disabled={creatingPayment}
                  >
                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Stripe Payment Link</div>
                      <div className="text-sm text-gray-500">Directe betaallink (aanbevolen)</div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-16 justify-start space-x-3 hover:bg-purple-50 border-purple-200"
                    onClick={() => createPaymentWithMethod('checkout_session')}
                  >
                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Stripe Checkout</div>
                      <div className="text-sm text-gray-500">Hosted checkout pagina</div>
                    </div>
                  </Button>
                </>
              )}

              {/* Tikkie */}
              {userSettings?.paymentSettings?.tikkie?.isActive && (
                <Button
                  variant="outline"
                  className="h-16 justify-start space-x-3 hover:bg-blue-50 border-blue-200"
                  onClick={() => createPaymentWithMethod('tikkie')}
                >
                  <TikkieIcon className="w-8 h-8" />
                  <div className="text-left">
                    <div className="font-medium">Tikkie (ABN AMRO)</div>
                    <div className="text-sm text-gray-500">Nederlandse betaalverzoeken</div>
                  </div>
                </Button>
              )}

              {/* PayPal */}
              {userSettings?.paymentSettings?.paypal?.isActive && (
                <Button
                  variant="outline"
                  className="h-16 justify-start space-x-3 hover:bg-blue-50 border-blue-200"
                  onClick={() => createPaymentWithMethod('paypal')}
                >
                  <PayPalIcon className="w-8 h-8" />
                  <div className="text-left">
                    <div className="font-medium">PayPal</div>
                    <div className="text-sm text-gray-500">Internationale betalingen</div>
                  </div>
                </Button>
              )}

              {/* Mollie */}
              {userSettings?.paymentSettings?.mollie?.isActive && (
                <Button
                  variant="outline"
                  className="h-16 justify-start space-x-3 hover:bg-green-50 border-green-200"
                  onClick={() => createPaymentWithMethod('mollie')}
                >
                  <MollieIcon className="w-8 h-8" />
                  <div className="text-left">
                    <div className="font-medium">Mollie</div>
                    <div className="text-sm text-gray-500">iDEAL, Bancontact, SEPA</div>
                  </div>
                </Button>
              )}

              {/* ING Bank */}
              {userSettings?.paymentSettings?.ing?.isActive && (
                <Button
                  variant="outline"
                  className="h-16 justify-start space-x-3 hover:bg-orange-50 border-orange-200"
                  onClick={() => createPaymentWithMethod('ing')}
                >
                  <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">ING Bank</div>
                    <div className="text-sm text-gray-500">Direct banktransfer</div>
                  </div>
                </Button>
              )}
            </div>

            {availableProviders.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Geen betaalproviders geconfigureerd.</p>
                <p className="text-sm text-gray-400 mt-1">
                  Ga naar Instellingen om je betaalproviders in te stellen.
                </p>
              </div>
            )}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Betalingsherinnering Verzenden</DialogTitle>
            <DialogDescription>
              Verstuur een herinnering voor factuur {selectedInvoice?.invoiceNumber} naar {clients.find(c => c.id === selectedInvoice?.clientId)?.firstName} {clients.find(c => c.id === selectedInvoice?.clientId)?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-800">Betalingsherinnering</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Deze factuur is verlopen en nog niet betaald. Een vriendelijke herinnering kan helpen.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">PDF bijlage inbegrepen</p>
                <p className="text-sm text-green-700">De factuur wordt automatisch als PDF bijgevoegd</p>
              </div>
            </div>

            <div className="space-y-3">
              <label htmlFor="reminder-message" className="text-sm font-medium">
                Persoonlijk bericht (optioneel)
              </label>
              <textarea
                id="reminder-message"
                placeholder="Voeg een persoonlijk bericht toe aan de herinnering..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {selectedInvoice && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Factuurdetails</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Factuurnummer:</span> {selectedInvoice.invoiceNumber}</p>
                  <p><span className="font-medium">Bedrag:</span> €{selectedInvoice.totalAmount.toFixed(2)}</p>
                  <p><span className="font-medium">Vervaldatum:</span> {new Date(selectedInvoice.dueDate.seconds * 1000).toLocaleDateString('nl-NL')}</p>
                  <p><span className="font-medium">Status:</span> {selectedInvoice.status === 'overdue' ? 'Verlopen' : 'Verzonden'}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPaymentReminderDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={() => selectedInvoice && sendPaymentReminder()}
              disabled={emailSending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {emailSending ? 'Verzenden...' : 'Herinnering Verzenden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Dialog - Complete */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Factuur Verzenden</DialogTitle>
            <DialogDescription>
              Verstuur factuur {selectedInvoice?.invoiceNumber} naar {clients.find(c => c.id === selectedInvoice?.clientId)?.firstName} {clients.find(c => c.id === selectedInvoice?.clientId)?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Email wordt verzonden naar:</p>
                <p className="text-sm text-blue-700">{clients.find(c => c.id === selectedInvoice?.clientId)?.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">PDF bijlage inbegrepen</p>
                <p className="text-sm text-green-700">De factuur wordt automatisch als PDF bijgevoegd</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-payment-link"
                  checked={sendWithPaymentLink}
                  onChange={(e) => setSendWithPaymentLink(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor="include-payment-link" className="text-sm font-medium">
                  Voeg betaallink toe aan email
                </label>
              </div>

              {sendWithPaymentLink && availableProviders.length > 0 && (
                <div className="pl-6 space-y-2">
                  <label className="text-sm font-medium">Kies betaalprovider:</label>
                  <select
                    value={selectedPaymentProvider || ''}
                    onChange={(e) => setSelectedPaymentProvider(e.target.value || null)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {availableProviders.map(provider => (
                      <option key={provider} value={provider}>
                        {provider === 'stripe' ? 'Stripe' :
                         provider === 'tikkie' ? 'Tikkie (ABN AMRO)' :
                         provider === 'paypal' ? 'PayPal' :
                         provider === 'mollie' ? 'Mollie' :
                         provider === 'ing' ? 'ING Bank' : provider}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label htmlFor="email-message" className="text-sm font-medium">
                Persoonlijk bericht (optioneel)
              </label>
              <textarea
                id="email-message"
                placeholder="Voeg een persoonlijk bericht toe aan de email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {selectedInvoice && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Factuurdetails</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Factuurnummer:</span> {selectedInvoice.invoiceNumber}</p>
                  <p><span className="font-medium">Bedrag:</span> €{selectedInvoice.totalAmount.toFixed(2)}</p>
                  <p><span className="font-medium">Vervaldatum:</span> {new Date(selectedInvoice.dueDate.seconds * 1000).toLocaleDateString('nl-NL')}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={() => selectedInvoice && sendInvoiceEmail()}
              disabled={emailSending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {emailSending ? 'Verzenden...' : 'Factuur Verzenden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Factuur Bewerken</DialogTitle>
            <DialogDescription>
              Bewerk factuur {editingInvoice?.invoiceNumber}. Let op: betaalde facturen kunnen niet worden bewerkt.
            </DialogDescription>
          </DialogHeader>
          {editingInvoice && (
            <div className="space-y-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Klant *</label>
                <select
                  value={editingSelectedClientId}
                  onChange={(e) => setEditingSelectedClientId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecteer een klant...</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName} {client.companyName ? `(${client.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Factuurdatum *</label>
                  <input
                    type="date"
                    value={editingInvoiceDate}
                    onChange={(e) => setEditingInvoiceDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vervaldatum *</label>
                  <input
                    type="date"
                    value={editingDueDate}
                    onChange={(e) => setEditingDueDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Factuurregels</h3>
                  <Button type="button" onClick={addEditingInvoiceItem} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Regel Toevoegen
                  </Button>
                </div>

                {editingItems.map((item, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">Regel {index + 1}</h4>
                      {editingItems.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeEditingInvoiceItem(index)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Beschrijving *</label>
                        <input
                          type="text"
                          placeholder="Beschrijving van product/dienst"
                          value={item.description}
                          onChange={(e) => updateEditingInvoiceItem(index, 'description', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Aantal *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) => updateEditingInvoiceItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">Prijs per stuk (€) *</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) => updateEditingInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">BTW %</label>
                        <select
                          value={item.vatRate}
                          onChange={(e) => updateEditingInvoiceItem(index, 'vatRate', parseFloat(e.target.value))}
                          className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value={0}>0% (BTW-vrij)</option>
                          <option value={9}>9% (Laag tarief)</option>
                          <option value={21}>21% (Hoog tarief)</option>
                        </select>
                      </div>
                    </div>

                    <div className="text-right text-sm text-gray-600">
                      Subtotaal: €{(item.quantity * item.unitPrice).toFixed(2)} |
                      BTW: €{((item.quantity * item.unitPrice) * (item.vatRate / 100)).toFixed(2)} |
                      Totaal: €{((item.quantity * item.unitPrice) * (1 + item.vatRate / 100)).toFixed(2)}
                    </div>
                  </div>
                ))}

                {/* Quick Add Products */}
                {products.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-3">Snelle selectie uit je producten</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {products.map(product => (
                        <Button
                          key={product.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addEditingProductToInvoice(product)}
                          className="justify-start h-auto py-2 px-3"
                        >
                          <div className="text-left">
                            <div className="font-medium text-sm">{product.name}</div>
                            <div className="text-xs text-gray-500">€{product.basePrice.toFixed(2)}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Invoice Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Opmerkingen (optioneel)</label>
                <textarea
                  placeholder="Aanvullende informatie voor de factuur..."
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  className="w-full min-h-[80px] p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Invoice Totals */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Factuurtotaal</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotaal (excl. BTW):</span>
                    <span>€{calculateEditingTotals().subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BTW:</span>
                    <span>€{calculateEditingTotals().vatAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                    <span>Totaal (incl. BTW):</span>
                    <span>€{calculateEditingTotals().total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Validation Messages */}
              {!editingSelectedClientId && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">Selecteer een klant om door te gaan.</p>
                </div>
              )}
              {editingItems.some(item => !item.description || item.quantity <= 0 || item.unitPrice <= 0) && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-700">Vul alle verplichte velden in voor alle factuurregels.</p>
                </div>
              )}
              {editingInvoice?.status === 'paid' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">Let op: Deze factuur is al betaald. Wijzigingen kunnen gevolgen hebben voor je administratie.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuleren
            </Button>
            <Button onClick={updateInvoice} disabled={updatingInvoice || editingInvoice?.status === 'paid'}>
              {updatingInvoice ? 'Bijwerken...' : 'Factuur Bijwerken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Factuur Inzien</DialogTitle>
            <DialogDescription>
              Details van factuur {viewingInvoice?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Factuurnummer</label>
                    <p className="text-lg font-semibold">{viewingInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {viewingInvoice.status === 'paid' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {viewingInvoice.status === 'pending' && (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                      {viewingInvoice.status === 'overdue' && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {viewingInvoice.status === 'draft' && (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                      <span className="text-sm">
                        {viewingInvoice.status === 'paid' && 'Betaald'}
                        {viewingInvoice.status === 'pending' && 'In afwachting'}
                        {viewingInvoice.status === 'overdue' && 'Vervallen'}
                        {viewingInvoice.status === 'draft' && 'Concept'}
                        {viewingInvoice.status === 'sent' && 'Verzonden'}
                      </span>
                    </div>
                  </div>
                  {viewingInvoice.paymentProvider && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Betaalwijze</label>
                      <p className="text-sm capitalize">{viewingInvoice.paymentProvider}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Klant</label>
                    {clients.find(c => c.id === viewingInvoice.clientId) && (
                      <p className="text-sm">
                        {clients.find(c => c.id === viewingInvoice.clientId)!.firstName} {clients.find(c => c.id === viewingInvoice.clientId)!.lastName}
                        {clients.find(c => c.id === viewingInvoice.clientId)!.companyName && (
                          <span className="block text-xs text-gray-600">
                            {clients.find(c => c.id === viewingInvoice.clientId)!.companyName}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Factuurdatum</label>
                      <p className="text-sm">
                        {new Date(viewingInvoice.invoiceDate.seconds * 1000).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Vervaldatum</label>
                      <p className="text-sm">
                        {new Date(viewingInvoice.dueDate.seconds * 1000).toLocaleDateString('nl-NL')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Factuurregels</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">Beschrijving</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">Aantal</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">Prijs</th>
                        <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">BTW %</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-sm font-medium">Totaal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingInvoice.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-sm">{item.description}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.quantity}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center text-sm">€{item.unitPrice.toFixed(2)}</td>
                          <td className="border border-gray-300 px-3 py-2 text-center text-sm">{item.vatRate}%</td>
                          <td className="border border-gray-300 px-3 py-2 text-right text-sm">
                            €{(item.quantity * item.unitPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Invoice Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Subtotaal (excl. BTW):</span>
                    <span>€{viewingInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>BTW:</span>
                    <span>€{viewingInvoice.vatAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t border-gray-300 pt-2">
                    <span>Totaal (incl. BTW):</span>
                    <span>€{viewingInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                  {viewingInvoice.paidAmount && viewingInvoice.paidAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600 border-t border-gray-300 pt-2">
                      <span>Betaald bedrag:</span>
                      <span>€{viewingInvoice.paidAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {viewingInvoice.notes && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Opmerkingen</h4>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    {viewingInvoice.notes}
                  </div>
                </div>
              )}

              {/* Payment Information */}
              {viewingInvoice.paidAt && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Betalingsinformatie</h4>
                  <div className="p-3 bg-green-50 rounded-lg text-sm">
                    <p>Betaald op: {new Date(viewingInvoice.paidAt.seconds * 1000).toLocaleString('nl-NL')}</p>
                    {viewingInvoice.paymentId && (
                      <p>Betaling ID: {viewingInvoice.paymentId}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Sluiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}