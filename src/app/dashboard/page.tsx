'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { clientService, productService, invoiceService } from '@/lib/firebase-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Package, FileText, Euro, Plus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Client, Product, Invoice } from '@/types';

interface DashboardStats {
  totalClients: number;
  activeProducts: number;
  pendingInvoices: number;
  monthlyRevenue: number;
}

export default function DashboardPage() {
  const { currentUser, userProfile } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeProducts: 0,
    pendingInvoices: 0,
    monthlyRevenue: 0
  });
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!currentUser || !mounted) return;

    const loadDashboardData = async () => {
      try {
        // Load all data in parallel
        const [clientsData, productsData, invoicesData] = await Promise.all([
          clientService.getClients(currentUser.uid),
          productService.getProducts(currentUser.uid),
          invoiceService.getInvoices(currentUser.uid)
        ]);

        setClients(clientsData);
        setProducts(productsData);
        setRecentInvoices(invoicesData.slice(0, 5)); // Get 5 most recent

        // Calculate stats
        const totalClients = clientsData.length;
        const activeProducts = productsData.filter(p => p.status === 'active').length;
        const pendingInvoices = invoicesData.filter(i => i.status !== 'paid' && i.status !== 'draft').length;

        // Calculate monthly revenue (current month)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyRevenue = invoicesData
          .filter(invoice => {
            if (invoice.status !== 'paid') return false;
            try {
              const invoiceDate = invoice.createdAt?.toDate ? invoice.createdAt.toDate() : new Date();
              return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
            } catch (error) {
              console.warn('Error parsing invoice date:', error);
              return false;
            }
          })
          .reduce((sum, invoice) => sum + invoice.totalAmount, 0);

        setStats({
          totalClients,
          activeProducts,
          pendingInvoices,
          monthlyRevenue
        });

        setLoading(false);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser, mounted]);

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statsConfig = [
    {
      name: 'Totaal Klanten',
      value: stats.totalClients.toString(),
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: 'Actieve Producten',
      value: stats.activeProducts.toString(),
      icon: Package,
      color: 'bg-green-500',
    },
    {
      name: 'Openstaande Facturen',
      value: stats.pendingInvoices.toString(),
      icon: FileText,
      color: 'bg-yellow-500',
    },
    {
      name: 'Maandelijkse Omzet',
      value: `€${stats.monthlyRevenue.toFixed(2)}`,
      icon: Euro,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Welkom terug, {userProfile?.displayName?.split(' ')[0] || 'User'}!
          </h1>
          <p className="text-gray-600">
            Hier is een overzicht van jouw Adobe Editor dashboard.
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsConfig.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.color} text-white`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Snelle Acties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push('/dashboard/clients')}
              >
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-8 w-8 text-blue-500" />
                  <Plus className="h-4 w-4 text-gray-400" />
                </div>
                <h3 className="font-semibold">Nieuwe Klant</h3>
                <p className="text-sm text-gray-600">Voeg een nieuwe klant toe aan je database</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push('/dashboard/products')}
              >
                <div className="flex items-center justify-between mb-2">
                  <Package className="h-8 w-8 text-green-500" />
                  <Plus className="h-4 w-4 text-gray-400" />
                </div>
                <h3 className="font-semibold">Nieuw Product</h3>
                <p className="text-sm text-gray-600">Maak een nieuw digitaal product aan</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => router.push('/dashboard/invoices')}
              >
                <div className="flex items-center justify-between mb-2">
                  <FileText className="h-8 w-8 text-purple-500" />
                  <Plus className="h-4 w-4 text-gray-400" />
                </div>
                <h3 className="font-semibold">Nieuwe Factuur</h3>
                <p className="text-sm text-gray-600">Genereer een nieuwe factuur voor een klant</p>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recente Activiteit</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/invoices')}
            >
              Bekijk alle facturen
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentInvoices.length > 0 ? (
              <div className="space-y-4">
                {recentInvoices.map((invoice, index) => (
                  <motion.div
                    key={invoice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${invoice.status === 'paid' ? 'bg-green-100' :
                          invoice.status === 'sent' ? 'bg-blue-100' :
                            invoice.status === 'overdue' ? 'bg-red-100' :
                              'bg-gray-100'
                        }`}>
                        <FileText className={`h-4 w-4 ${invoice.status === 'paid' ? 'text-green-600' :
                            invoice.status === 'sent' ? 'text-blue-600' :
                              invoice.status === 'overdue' ? 'text-red-600' :
                                'text-gray-600'
                          }`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">
                          {invoice.createdAt?.toDate ?
                            invoice.createdAt.toDate().toLocaleDateString('nl-NL') :
                            new Date().toLocaleDateString('nl-NL')
                          }
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">€{invoice.totalAmount.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {invoice.status === 'paid' ? 'Betaald' :
                          invoice.status === 'sent' ? 'Verzonden' :
                            invoice.status === 'overdue' ? 'Verlopen' :
                              invoice.status === 'draft' ? 'Concept' : 'Openstaand'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nog geen activiteit. Begin met het toevoegen van klanten en producten!</p>
                <Button
                  className="mt-4"
                  onClick={() => router.push('/dashboard/invoices')}
                >
                  Eerste factuur maken
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}