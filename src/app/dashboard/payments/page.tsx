'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService, clientService } from '@/lib/firebase-service';
import { sendEmail, generateInvoiceEmailHTML } from '@/lib/email';
import { Invoice, Client } from '@/types';
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
import { Search, Mail, ExternalLink, CreditCard, CheckCircle, Clock, AlertCircle, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function PaymentsPage() {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to invoices
    const unsubscribeInvoices = invoiceService.subscribeToInvoices(currentUser.uid, (updatedInvoices) => {
      setInvoices(updatedInvoices);
      setLoading(false);
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
  }, [currentUser]);

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

  const createPaymentLink = async (invoice: Invoice) => {
    try {
      // Create Stripe payment link
      const response = await fetch('/api/create-payment-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          description: `Factuur ${invoice.invoiceNumber}`,
          metadata: {
            invoiceId: invoice.id,
            clientId: invoice.clientId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment link');
      }

      const { url } = await response.json();

      // Update invoice with payment link
      await invoiceService.updateInvoice(invoice.id, {
        paymentLink: url,
        status: 'sent'
      });

      toast.success('Betaallink succesvol aangemaakt!');
      return url;
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het aanmaken van de betaallink.');
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

      // Create payment link if it doesn't exist
      let paymentLink = selectedInvoice.paymentLink;
      if (!paymentLink) {
        paymentLink = await createPaymentLink(selectedInvoice);
        if (!paymentLink) return;
      }

      // Generate email HTML
      const emailHTML = generateInvoiceEmailHTML(selectedInvoice, client, paymentLink);

      // Send email
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: client.email,
          subject: `Factuur ${selectedInvoice.invoiceNumber}`,
          html: emailHTML,
          customMessage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      // Update invoice status
      await invoiceService.updateInvoice(selectedInvoice.id, {
        status: 'sent'
      });

      toast.success(`Factuur succesvol verzonden naar ${client.email}!`);
      setIsEmailDialogOpen(false);
      setSelectedInvoice(null);
      setCustomMessage('');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het verzenden van de email.');
      console.error('Error sending email:', error);
    } finally {
      setEmailSending(false);
    }
  };

  const markAsPaid = async (invoice: Invoice) => {
    try {
      await invoiceService.updateInvoice(invoice.id, {
        status: 'paid'
      });
      toast.success('Factuur gemarkeerd als betaald!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het bijwerken van de factuur.');
      console.error('Error updating invoice:', error);
    }
  };

  const openEmailDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setCustomMessage('');
    setIsEmailDialogOpen(true);
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
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                                {invoice.paymentLink && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(invoice.paymentLink, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markAsPaid(invoice)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
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
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Factuur Verzenden</DialogTitle>
            <DialogDescription>
              Verstuur factuur {selectedInvoice?.invoiceNumber} naar de klant met een betaallink.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
    </div>
  );
}