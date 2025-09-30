'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { clientService } from '@/lib/firebase-service';
import { Client } from '@/types';
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
import { Plus, Search, Edit, Trash2, Users, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';

interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  kvkNumber: string;
  vatNumber: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  notes: string;
  status: 'active' | 'inactive' | 'archived';
}

const initialFormData: ClientFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  companyName: '',
  kvkNumber: '',
  vatNumber: '',
  address: {
    street: '',
    city: '',
    postalCode: '',
    country: 'Netherlands'
  },
  notes: '',
  status: 'active'
};

export default function ClientsPage() {
  const { currentUser } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = clientService.subscribeToClients(currentUser.uid, (updatedClients) => {
      setClients(updatedClients);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const filtered = clients.filter(client =>
      client.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.companyName && client.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredClients(filtered);
  }, [clients, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSubmitting(true);
    try {
      if (editingClient) {
        await clientService.updateClient(editingClient.id, {
          ...formData,
          updatedAt: Timestamp.now()
        }, currentUser?.uid);
        toast.success('Klant succesvol bijgewerkt!');
      } else {
        await clientService.createClient(currentUser.uid, formData);
        toast.success('Klant succesvol aangemaakt!');
      }

      setIsDialogOpen(false);
      setEditingClient(null);
      setFormData(initialFormData);
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het opslaan van de klant.');
      console.error('Error saving client:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone || '',
      companyName: client.companyName || '',
      kvkNumber: client.kvkNumber || '',
      vatNumber: client.vatNumber || '',
      address: client.address,
      notes: client.notes || '',
      status: client.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Weet je zeker dat je ${client.firstName} ${client.lastName} wilt verwijderen?`)) {
      return;
    }

    try {
      await clientService.deleteClient(client.id, currentUser?.uid);
      toast.success('Klant succesvol verwijderd!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het verwijderen van de klant.');
      console.error('Error deleting client:', error);
    }
  };

  const openNewClientDialog = () => {
    setEditingClient(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleView = (client: Client) => {
    setViewingClient(client);
    setIsViewDialogOpen(true);
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Klanten</h1>
          <p className="text-gray-600">Beheer je klanten en hun gegevens</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewClientDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nieuwe Klant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Klant Bewerken' : 'Nieuwe Klant'}
              </DialogTitle>
              <DialogDescription>
                {editingClient ? 'Wijzig de klantgegevens hieronder.' : 'Voeg een nieuwe klant toe aan je database.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Voornaam *</label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Achternaam *</label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefoon</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Bedrijfsnaam</label>
                  <Input
                    value={formData.companyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">KvK Nummer</label>
                  <Input
                    value={formData.kvkNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, kvkNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">BTW Nummer</label>
                <Input
                  value={formData.vatNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, vatNumber: e.target.value }))}
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Adresgegevens</h4>
                <div>
                  <label className="block text-sm font-medium mb-1">Straat + Huisnummer</label>
                  <Input
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, street: e.target.value }
                    }))}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Postcode</label>
                    <Input
                      value={formData.address.postalCode}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, postalCode: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Stad</label>
                    <Input
                      value={formData.address.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, city: e.target.value }
                      }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Land</label>
                    <Input
                      value={formData.address.country}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        address: { ...prev.address, country: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Opmerkingen</label>
                <textarea
                  className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Eventuele opmerkingen over deze klant..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Opslaan...' : (editingClient ? 'Bijwerken' : 'Aanmaken')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Search & Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Zoek klanten..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>{filteredClients.length} klanten</span>
        </div>
      </motion.div>

      {/* Clients Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Klanten Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredClients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">
                  {searchTerm ? 'Geen klanten gevonden voor je zoekopdracht.' : 'Nog geen klanten toegevoegd. Voeg je eerste klant toe!'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Naam</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Bedrijf</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aangemaakt</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => {
                    console.log(client)
                    return <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        {client.firstName} {client.lastName}
                      </TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.companyName || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${client.status === 'active' ? 'bg-green-100 text-green-800' :
                          client.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {client.status === 'active' ? 'Actief' :
                            client.status === 'inactive' ? 'Inactief' : 'Gearchiveerd'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(client?.createdAt?.seconds * 1000).toLocaleDateString('nl-NL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(client)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(client)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* View Client Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Klant Details</DialogTitle>
            <DialogDescription>
              Details van {viewingClient?.firstName} {viewingClient?.lastName}
            </DialogDescription>
          </DialogHeader>
          {viewingClient && (
            <div className="space-y-6">
              {/* Client Header */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Volledige naam</label>
                    <p className="text-lg font-semibold">{viewingClient.firstName} {viewingClient.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        viewingClient.status === 'active' ? 'bg-green-100 text-green-800' :
                        viewingClient.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingClient.status === 'active' ? 'Actief' :
                         viewingClient.status === 'inactive' ? 'Inactief' : 'Gearchiveerd'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm">{viewingClient.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Telefoon</label>
                    <p className="text-sm">{viewingClient.phone || 'Niet opgegeven'}</p>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              {(viewingClient.companyName || viewingClient.kvkNumber || viewingClient.vatNumber) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Bedrijfsgegevens</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {viewingClient.companyName && (
                      <div className="mb-2">
                        <span className="text-sm font-medium">Bedrijfsnaam: </span>
                        <span className="text-sm">{viewingClient.companyName}</span>
                      </div>
                    )}
                    {viewingClient.kvkNumber && (
                      <div className="mb-2">
                        <span className="text-sm font-medium">KvK Nummer: </span>
                        <span className="text-sm">{viewingClient.kvkNumber}</span>
                      </div>
                    )}
                    {viewingClient.vatNumber && (
                      <div>
                        <span className="text-sm font-medium">BTW Nummer: </span>
                        <span className="text-sm">{viewingClient.vatNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Address Information */}
              {(viewingClient.address.street || viewingClient.address.city || viewingClient.address.postalCode) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Adres</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    {viewingClient.address.street && (
                      <p className="text-sm">{viewingClient.address.street}</p>
                    )}
                    <div className="flex gap-2">
                      {viewingClient.address.postalCode && (
                        <span className="text-sm">{viewingClient.address.postalCode}</span>
                      )}
                      {viewingClient.address.city && (
                        <span className="text-sm">{viewingClient.address.city}</span>
                      )}
                    </div>
                    {viewingClient.address.country && (
                      <p className="text-sm">{viewingClient.address.country}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {viewingClient.notes && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Opmerkingen</label>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{viewingClient.notes}</p>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Klant sinds</label>
                  <p className="text-sm">
                    {new Date(viewingClient.createdAt.seconds * 1000).toLocaleString('nl-NL')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Laatst bijgewerkt</label>
                  <p className="text-sm">
                    {new Date(viewingClient.updatedAt.seconds * 1000).toLocaleString('nl-NL')}
                  </p>
                </div>
              </div>
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