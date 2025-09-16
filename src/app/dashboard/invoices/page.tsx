'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { invoiceService, clientService, productService } from '@/lib/firebase-service';
import { generateInvoicePDF, downloadPDF } from '@/lib/pdf';
import { Invoice, Client, Product, InvoiceItem } from '@/types';
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
import { Plus, Search, Edit, Trash2, FileText, Download, Mail, Eye, Euro } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';

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
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to invoices
    const unsubscribeInvoices = invoiceService.subscribeToInvoices(currentUser.uid, (updatedInvoices) => {
      setInvoices(updatedInvoices);
      setLoading(false);
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

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: 21,
      lineTotal: 0
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const updateInvoiceItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updatedItems = [...invoiceItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate line total
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].lineTotal = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }

    setInvoiceItems(updatedItems);
  };

  const removeInvoiceItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const addProductToInvoice = (product: Product) => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      productId: product.id,
      description: product.name,
      quantity: 1,
      unitPrice: product.basePrice,
      vatRate: 21,
      lineTotal: product.basePrice
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const vatAmount = invoiceItems.reduce((sum, item) =>
      sum + (item.lineTotal * item.vatRate / 100), 0
    );
    const total = subtotal + vatAmount;

    return { subtotal, vatAmount, total };
  };

  const createInvoice = async () => {
    if (!currentUser || !selectedClient || invoiceItems.length === 0) {
      toast.error('Selecteer een klant en voeg items toe aan de factuur.');
      return;
    }

    setSubmitting(true);
    try {
      const { subtotal, vatAmount, total } = calculateTotals();

      const invoiceData = {
        clientId: selectedClient.id,
        invoiceDate: Timestamp.fromDate(new Date(invoiceDate)),
        dueDate: Timestamp.fromDate(new Date(dueDate)),
        subtotal,
        vatAmount,
        totalAmount: total,
        items: invoiceItems,
        notes,
        status: 'draft' as const
      };

      await invoiceService.createInvoice(currentUser.uid, invoiceData);

      // Reset form
      setSelectedClient(null);
      setInvoiceItems([]);
      setNotes('');
      setIsCreateDialogOpen(false);

      toast.success('Factuur succesvol aangemaakt!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het aanmaken van de factuur.');
      console.error('Error creating invoice:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      const client = clients.find(c => c.id === invoice.clientId);
      if (!client || !userProfile) {
        toast.error('Klant- of gebruikersgegevens niet gevonden.');
        return;
      }

      const pdfBuffer = generateInvoicePDF(invoice, client, userProfile);
      downloadPDF(pdfBuffer, `Factuur-${invoice.invoiceNumber}.pdf`);
      toast.success('PDF gedownload!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het genereren van de PDF.');
      console.error('Error generating PDF:', error);
    }
  };

  const handleDelete = async (invoice: Invoice) => {
    if (!confirm(`Weet je zeker dat je factuur ${invoice.invoiceNumber} wilt verwijderen?`)) {
      return;
    }

    try {
      await invoiceService.deleteInvoice(invoice.id);
      toast.success('Factuur succesvol verwijderd!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het verwijderen van de factuur.');
      console.error('Error deleting invoice:', error);
    }
  };

  const openCreateDialog = () => {
    setSelectedClient(null);
    setInvoiceItems([]);
    setNotes('');
    setIsCreateDialogOpen(true);
  };

  const { subtotal, vatAmount, total } = calculateTotals();
  const totalInvoicesValue = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const paidInvoices = invoices.filter(i => i.status === 'paid').length;

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
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturen</h1>
          <p className="text-gray-600">Beheer je facturen en betalingen</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="w-full sm:w-auto">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left side - Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Klant selecteren *</label>
                  <select
                    className="w-full h-10 px-3 py-2 border border-input rounded-md"
                    value={selectedClient?.id || ''}
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value);
                      setSelectedClient(client || null);
                    }}
                  >
                    <option value="">Selecteer een klant</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.firstName} {client.lastName} {client.companyName && `(${client.companyName})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Factuurdatum</label>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Vervaldatum</label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Producten toevoegen</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {products.filter(p => p.status === 'active').map(product => (
                      <Button
                        key={product.id}
                        variant="outline"
                        size="sm"
                        className="justify-start h-auto p-2"
                        onClick={() => addProductToInvoice(product)}
                      >
                        <div className="text-left">
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-gray-500">€{product.basePrice.toFixed(2)}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Factuurregels</label>
                    <Button size="sm" onClick={addInvoiceItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Regel toevoegen
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {invoiceItems.map((item, index) => (
                      <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                        <div className="col-span-4">
                          <Input
                            placeholder="Beschrijving"
                            value={item.description}
                            onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Aantal"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Prijs"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          />
                        </div>
                        <div className="col-span-2">
                          <select
                            className="w-full h-9 px-2 py-1 border border-input rounded text-sm"
                            value={item.vatRate}
                            onChange={(e) => updateInvoiceItem(index, 'vatRate', parseFloat(e.target.value))}
                          >
                            <option value={0}>0%</option>
                            <option value={9}>9%</option>
                            <option value={21}>21%</option>
                          </select>
                        </div>
                        <div className="col-span-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeInvoiceItem(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="col-span-1 text-right text-sm font-medium">
                          €{item.lineTotal.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Opmerkingen</label>
                  <textarea
                    className="w-full min-h-[80px] px-3 py-2 border border-input rounded-md"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Eventuele opmerkingen voor deze factuur..."
                  />
                </div>
              </div>

              {/* Right side - Preview */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-4">Factuur Preview</h4>

                {selectedClient && (
                  <div className="mb-4 p-3 bg-white rounded border">
                    <h5 className="font-medium text-sm text-gray-600 mb-2">Klantgegevens</h5>
                    <div className="text-sm">
                      <div>{selectedClient.firstName} {selectedClient.lastName}</div>
                      {selectedClient.companyName && <div>{selectedClient.companyName}</div>}
                      <div>{selectedClient.email}</div>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded border p-3">
                  <h5 className="font-medium text-sm text-gray-600 mb-2">Factuurdetails</h5>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotaal:</span>
                      <span>€{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BTW:</span>
                      <span>€{vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Totaal:</span>
                      <span>€{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
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
              Totaal Facturen
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Betaald
            </CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paidInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Openstaand
            </CardTitle>
            <FileText className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length - paidInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totale Waarde
            </CardTitle>
            <Euro className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalInvoicesValue.toFixed(2)}</div>
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
          <FileText className="h-4 w-4" />
          <span>{filteredInvoices.length} facturen</span>
        </div>
      </motion.div>

      {/* Invoices Table */}
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
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">
                  {searchTerm ? 'Geen facturen gevonden voor je zoekopdracht.' : 'Nog geen facturen aangemaakt. Maak je eerste factuur aan!'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
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
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {client ? `${client.firstName} ${client.lastName}` : 'Onbekende klant'}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.invoiceDate.seconds * 1000).toLocaleDateString('nl-NL')}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.dueDate.seconds * 1000).toLocaleDateString('nl-NL')}
                        </TableCell>
                        <TableCell className="font-medium">€{invoice.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                            invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                            invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.status === 'paid' ? 'Betaald' :
                             invoice.status === 'sent' ? 'Verzonden' :
                             invoice.status === 'overdue' ? 'Verlopen' :
                             invoice.status === 'draft' ? 'Concept' : 'Openstaand'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPDF(invoice)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(invoice)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
    </div>
  );
}