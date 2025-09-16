'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, FileText, Euro } from 'lucide-react';
import { motion } from 'framer-motion';

const stats = [
  {
    name: 'Totaal Klanten',
    value: '0',
    icon: Users,
    color: 'bg-blue-500',
  },
  {
    name: 'Actieve Producten',
    value: '0',
    icon: Package,
    color: 'bg-green-500',
  },
  {
    name: 'Openstaande Facturen',
    value: '0',
    icon: FileText,
    color: 'bg-yellow-500',
  },
  {
    name: 'Maandelijkse Omzet',
    value: '€0',
    icon: Euro,
    color: 'bg-purple-500',
  },
];

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
        {stats.map((stat, index) => {
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
              >
                <Users className="h-8 w-8 text-blue-500 mb-2" />
                <h3 className="font-semibold">Nieuwe Klant</h3>
                <p className="text-sm text-gray-600">Voeg een nieuwe klant toe aan je database</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <Package className="h-8 w-8 text-green-500 mb-2" />
                <h3 className="font-semibold">Nieuw Product</h3>
                <p className="text-sm text-gray-600">Maak een nieuw digitaal product aan</p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <FileText className="h-8 w-8 text-purple-500 mb-2" />
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
          <CardHeader>
            <CardTitle>Recente Activiteit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nog geen activiteit. Begin met het toevoegen van klanten en producten!</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}