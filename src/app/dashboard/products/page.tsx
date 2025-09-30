'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { productService } from '@/lib/firebase-service';
import { Product } from '@/types';
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
import { Plus, Search, Edit, Trash2, Package, Euro, Eye } from 'lucide-react';
import { toast } from '@/lib/toast-with-notification';
import { motion } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';

interface ProductFormData {
  name: string;
  description: string;
  basePrice: number;
  category: string;
  deliveryTime: string;
  fileFormats: string;
  revisionRounds: number;
  status: 'active' | 'inactive' | 'discontinued';
}

const initialFormData: ProductFormData = {
  name: '',
  description: '',
  basePrice: 0,
  category: '',
  deliveryTime: '',
  fileFormats: '',
  revisionRounds: 2,
  status: 'active'
};

const productCategories = [
  'Video Editing',
  'Photo Editing',
  'Graphic Design',
  'Logo Design',
  'Web Design',
  'Motion Graphics',
  'Color Grading',
  'Audio Editing',
  'Other'
];

export default function ProductsPage() {
  const { currentUser } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = productService.subscribeToProducts(currentUser.uid, (updatedProducts) => {
      setProducts(updatedProducts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSubmitting(true);
    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, {
          ...formData,
          updatedAt: Timestamp.now()
        }, currentUser?.uid);
        toast.success('Product succesvol bijgewerkt!');
      } else {
        await productService.createProduct(currentUser.uid, formData);
        toast.success('Product succesvol aangemaakt!');
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData(initialFormData);
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het opslaan van het product.');
      console.error('Error saving product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      category: product.category,
      deliveryTime: product.deliveryTime || '',
      fileFormats: product.fileFormats || '',
      revisionRounds: product.revisionRounds,
      status: product.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Weet je zeker dat je "${product.name}" wilt verwijderen?`)) {
      return;
    }

    try {
      await productService.deleteProduct(product.id, currentUser?.uid);
      toast.success('Product succesvol verwijderd!');
    } catch (error) {
      toast.error('Er is een fout opgetreden bij het verwijderen van het product.');
      console.error('Error deleting product:', error);
    }
  };

  const openNewProductDialog = () => {
    setEditingProduct(null);
    setFormData(initialFormData);
    setIsDialogOpen(true);
  };

  const handleView = (product: Product) => {
    setViewingProduct(product);
    setIsViewDialogOpen(true);
  };

  const totalValue = products.reduce((sum, product) => sum + product.basePrice, 0);
  const activeProducts = products.filter(p => p.status === 'active').length;

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
          <h1 className="text-3xl font-bold text-gray-900">Producten</h1>
          <p className="text-gray-600">Beheer je digitale producten en diensten</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewProductDialog} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Nieuw Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Product Bewerken' : 'Nieuw Product'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct ? 'Wijzig de productgegevens hieronder.' : 'Voeg een nieuw product toe aan je catalog.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Productnaam *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="bijv. Video Edit - Social Media"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Beschrijving *</label>
                <textarea
                  className="w-full min-h-[100px] px-3 py-2 border border-input rounded-md"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Uitgebreide beschrijving van het product en wat er inbegrepen is..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Basisprijs (€) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.basePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categorie *</label>
                  <select
                    className="w-full h-10 px-3 py-2 border border-input rounded-md"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    <option value="">Selecteer categorie</option>
                    {productCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Levertijd</label>
                  <Input
                    value={formData.deliveryTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                    placeholder="bijv. 3-5 werkdagen"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bestandsformaten</label>
                  <Input
                    value={formData.fileFormats}
                    onChange={(e) => setFormData(prev => ({ ...prev, fileFormats: e.target.value }))}
                    placeholder="bijv. MP4, MOV, AVI"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Revisierondes</label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.revisionRounds}
                    onChange={(e) => setFormData(prev => ({ ...prev, revisionRounds: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    className="w-full h-10 px-3 py-2 border border-input rounded-md"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'discontinued' }))}
                  >
                    <option value="active">Actief</option>
                    <option value="inactive">Inactief</option>
                    <option value="discontinued">Stopgezet</option>
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Opslaan...' : (editingProduct ? 'Bijwerken' : 'Aanmaken')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-6 md:grid-cols-3"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totaal Producten
            </CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Actieve Producten
            </CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts}</div>
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
            <div className="text-2xl font-bold">€{totalValue.toFixed(2)}</div>
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
            placeholder="Zoek producten..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Package className="h-4 w-4" />
          <span>{filteredProducts.length} producten</span>
        </div>
      </motion.div>

      {/* Products Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Producten Overzicht</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">
                  {searchTerm ? 'Geen producten gevonden voor je zoekopdracht.' : 'Nog geen producten toegevoegd. Voeg je eerste product toe!'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Prijs</TableHead>
                    <TableHead>Levertijd</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Gebruikt</TableHead>
                    <TableHead>Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {product.description}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{product.category}</TableCell>
                      <TableCell className="font-medium">€{product.basePrice.toFixed(2)}</TableCell>
                      <TableCell>{product.deliveryTime || '-'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.status === 'active' ? 'bg-green-100 text-green-800' :
                            product.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                          }`}>
                          {product.status === 'active' ? 'Actief' :
                            product.status === 'inactive' ? 'Inactief' : 'Stopgezet'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{product.usageCount}x</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(product)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* View Product Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Details van {viewingProduct?.name}
            </DialogDescription>
          </DialogHeader>
          {viewingProduct && (
            <div className="space-y-6">
              {/* Product Header */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Productnaam</label>
                    <p className="text-lg font-semibold">{viewingProduct.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Categorie</label>
                    <p className="text-sm">{viewingProduct.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Prijs</label>
                    <p className="text-lg font-semibold text-green-600">€{viewingProduct.basePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        viewingProduct.status === 'active' ? 'bg-green-100 text-green-800' :
                        viewingProduct.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingProduct.status === 'active' ? 'Actief' :
                         viewingProduct.status === 'inactive' ? 'Inactief' : 'Stopgezet'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Beschrijving</label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{viewingProduct.description}</p>
                </div>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Levertijd</label>
                    <p className="text-sm">{viewingProduct.deliveryTime || 'Niet opgegeven'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Bestandsformaten</label>
                    <p className="text-sm">{viewingProduct.fileFormats || 'Niet opgegeven'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Revisierondes</label>
                    <p className="text-sm">{viewingProduct.revisionRounds} keer</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Gebruikt in facturen</label>
                    <p className="text-sm font-semibold">{viewingProduct.usageCount}x</p>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-gray-700">Aangemaakt op</label>
                  <p className="text-sm">
                    {new Date(viewingProduct.createdAt.seconds * 1000).toLocaleString('nl-NL')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Laatst bijgewerkt</label>
                  <p className="text-sm">
                    {new Date(viewingProduct.updatedAt.seconds * 1000).toLocaleString('nl-NL')}
                  </p>
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Gebruiksstatistieken</label>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Totaal gebruikt in facturen:</span>
                    <span className="text-sm font-semibold">{viewingProduct.usageCount}x</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm">Totale omzet gegenereerd:</span>
                    <span className="text-sm font-semibold">€{(viewingProduct.usageCount * viewingProduct.basePrice).toFixed(2)}</span>
                  </div>
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