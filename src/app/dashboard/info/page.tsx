'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Info,
  CheckCircle,
  Wrench,
  Sparkles,
  Rocket,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Calculator,
  CreditCard,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface Update {
  id: string;
  title: string;
  description: string;
  category: 'bug-fix' | 'new-feature' | 'improvement' | 'analytics';
  date: string;
  version: string;
  details?: string[];
  relatedPage?: string;
}

const updates: Update[] = [
  {
    id: 'btw-analytics-fix',
    title: 'BTW Analytics Zero Values Opgelost',
    description: 'Belangrijke fix voor BTW berekeningen die voorheen 0 toonden terwijl er wel facturen waren.',
    category: 'bug-fix',
    date: '2024-09-17',
    version: '0.1.1',
    details: [
      'Invoice status filter uitgebreid naar alle relevante statussen (paid, sent, overdue, pending)',
      'Verbeterde datum handling voor Firestore Timestamps',
      'Robuuste error handling toegevoegd voor datum conversies',
      'Uitgebreide debug logging voor troubleshooting',
      'Fallback naar createdAt wanneer invoiceDate ontbreekt'
    ],
    relatedPage: '/dashboard/btw'
  },
  {
    id: 'manual-recalculation',
    title: 'Handmatige Herberekening Toegevoegd',
    description: 'Nieuwe functionaliteit om BTW en financiële analytics handmatig opnieuw te berekenen.',
    category: 'new-feature',
    date: '2024-09-17',
    version: '0.1.1',
    details: [
      '"Alle Data Herberekenen" knop in BTW Beheer',
      '"Alle Data Herberekenen" knop in Analytics',
      'Parallelle berekening van alle kwartalen en maanden',
      'Automatische data refresh na herberekening',
      'Progress indicatoren tijdens herberekening'
    ],
    relatedPage: '/dashboard/analytics'
  },
  {
    id: 'overdue-button',
    title: 'Markeer als Verlopen Functionaliteit',
    description: 'Nieuwe knop om facturen te markeren als verlopen wanneer klanten niet hebben betaald.',
    category: 'new-feature',
    date: '2024-09-17',
    version: '0.1.1',
    details: [
      'Rode "Markeer als Verlopen" knop naast "Markeer als Betaald"',
      'Smart UI logica - knop verschijnt alleen voor relevante facturen',
      'Visuele styling met AlertCircle icoon',
      'Toast notificaties voor bevestiging',
      'Hover effecten voor betere gebruikerservaring'
    ],
    relatedPage: '/dashboard/payments'
  },
  {
    id: 'btw-analytics-system',
    title: 'BTW Beheer Systeem',
    description: 'Volledig BTW management systeem voor kwartaal tracking en zakelijke uitgaven.',
    category: 'analytics',
    date: '2024-09-17',
    version: '0.1.0',
    details: [
      'Automatische kwartaal BTW berekeningen',
      'Zakelijke uitgaven tracking met BTW terugvordering',
      'Historisch overzicht van alle kwartalen',
      'BTW vervaldatum tracking',
      'Geïntegreerd met factuur data'
    ],
    relatedPage: '/dashboard/btw'
  },
  {
    id: 'financial-analytics',
    title: 'Financiële Analytics Dashboard',
    description: 'Uitgebreide financiële analytics met grafieken voor omzet, kosten en winst tracking.',
    category: 'analytics',
    date: '2024-09-17',
    version: '0.1.0',
    details: [
      'Maandelijkse omzet, kosten en winst tracking',
      'Interactieve bar charts en line charts',
      'Pie charts voor omzet vs kosten verdeling',
      'Growth trends met percentage vergelijkingen',
      'Jaar-tot-datum samenvattingen'
    ],
    relatedPage: '/dashboard/analytics'
  }
];

export default function InfoPage() {
  const [expandedUpdates, setExpandedUpdates] = useState<string[]>([]);

  const toggleExpanded = (updateId: string) => {
    setExpandedUpdates(prev =>
      prev.includes(updateId)
        ? prev.filter(id => id !== updateId)
        : [...prev, updateId]
    );
  };

  const getCategoryIcon = (category: Update['category']) => {
    switch (category) {
      case 'bug-fix': return <Wrench className="h-4 w-4" />;
      case 'new-feature': return <Sparkles className="h-4 w-4" />;
      case 'improvement': return <Rocket className="h-4 w-4" />;
      case 'analytics': return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: Update['category']) => {
    switch (category) {
      case 'bug-fix': return 'bg-red-100 text-red-800';
      case 'new-feature': return 'bg-green-100 text-green-800';
      case 'improvement': return 'bg-blue-100 text-blue-800';
      case 'analytics': return 'bg-purple-100 text-purple-800';
    }
  };

  const getCategoryLabel = (category: Update['category']) => {
    switch (category) {
      case 'bug-fix': return 'Bug Fix';
      case 'new-feature': return 'Nieuwe Feature';
      case 'improvement': return 'Verbetering';
      case 'analytics': return 'Analytics';
    }
  };

  const recentUpdates = updates.filter(update =>
    new Date(update.date) >= new Date('2024-09-17')
  );
  const olderUpdates = updates.filter(update =>
    new Date(update.date) < new Date('2024-09-17')
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Info className="h-8 w-8 text-blue-600" />
              Laatste Updates & Fixes
            </h1>
            <p className="text-gray-600 mt-2">
              Overzicht van de nieuwste verbeteringen en bug fixes in je Adobe Editor Dashboard
            </p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-sm">
              Versie 0.1.1
            </Badge>
            <p className="text-sm text-gray-500 mt-1">
              Laatste update: {new Date().toLocaleDateString('nl-NL')}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Application Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Adobe Editor Dashboard v0.1.1
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">
              Een uitgebreide web-based dashboard applicatie voor het beheren van klantrelaties,
              digitale productcatalogi en factuurprocessen met real-time betalingsverwerking,
              speciaal ontworpen voor freelance Adobe editors en kleine creatieve bureaus.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                <p className="text-sm font-medium">BTW Beheer</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600 mx-auto mb-1" />
                <p className="text-sm font-medium">Analytics</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                <p className="text-sm font-medium">Betalingen</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Calculator className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                <p className="text-sm font-medium">Facturen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Updates */}
      {recentUpdates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-600" />
                Recente Updates
                <Badge className="bg-yellow-100 text-yellow-800">Nieuw</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentUpdates.map((update, index) => (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <UpdateCard
                      update={update}
                      isExpanded={expandedUpdates.includes(update.id)}
                      onToggle={() => toggleExpanded(update.id)}
                      getCategoryIcon={getCategoryIcon}
                      getCategoryColor={getCategoryColor}
                      getCategoryLabel={getCategoryLabel}
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Previous Updates */}
      {olderUpdates.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                Eerdere Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {olderUpdates.map((update, index) => (
                  <motion.div
                    key={update.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <UpdateCard
                      update={update}
                      isExpanded={expandedUpdates.includes(update.id)}
                      onToggle={() => toggleExpanded(update.id)}
                      getCategoryIcon={getCategoryIcon}
                      getCategoryColor={getCategoryColor}
                      getCategoryLabel={getCategoryLabel}
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

interface UpdateCardProps {
  update: Update;
  isExpanded: boolean;
  onToggle: () => void;
  getCategoryIcon: (category: Update['category']) => JSX.Element;
  getCategoryColor: (category: Update['category']) => string;
  getCategoryLabel: (category: Update['category']) => string;
}

function UpdateCard({
  update,
  isExpanded,
  onToggle,
  getCategoryIcon,
  getCategoryColor,
  getCategoryLabel
}: UpdateCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Badge className={getCategoryColor(update.category)}>
              {getCategoryIcon(update.category)}
              <span className="ml-1">{getCategoryLabel(update.category)}</span>
            </Badge>
            <Badge variant="outline">{update.version}</Badge>
            <span className="text-sm text-gray-500">
              {new Date(update.date).toLocaleDateString('nl-NL')}
            </span>
          </div>
          <h3 className="font-semibold text-lg mb-1">{update.title}</h3>
          <p className="text-gray-700 mb-3">{update.description}</p>

          {isExpanded && update.details && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <ul className="space-y-1">
                {update.details.map((detail, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          <div className="flex items-center gap-2">
            {update.details && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="text-blue-600 hover:bg-blue-50"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Minder details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Meer details
                  </>
                )}
              </Button>
            )}
            {update.relatedPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = update.relatedPage!}
                className="text-gray-600 hover:bg-gray-100"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Bekijk feature
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}