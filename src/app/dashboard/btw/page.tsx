'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { btwService } from '@/lib/btw-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import {
  Calculator,
  Calendar,
  Euro,
  FileText,
  Plus,
  Receipt,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { BTWQuarter, BusinessExpense } from '@/types';
import { Timestamp } from 'firebase/firestore';

export default function BTWPage() {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentQuarter, setCurrentQuarter] = useState<BTWQuarter | null>(null);
  const [allQuarters, setAllQuarters] = useState<BTWQuarter[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [fullRecalculating, setFullRecalculating] = useState(false);

  // Form state for new expense
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    vatRate: '21',
    category: 'office' as BusinessExpense['category'],
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!currentUser) return;
    loadBTWData();
  }, [currentUser]);

  const loadBTWData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const [current, quarters, userExpenses] = await Promise.all([
        btwService.getCurrentBTWQuarter(currentUser.uid),
        btwService.getBTWQuarters(currentUser.uid),
        btwService.getExpenses(currentUser.uid)
      ]);

      setCurrentQuarter(current);
      setAllQuarters(quarters);
      setExpenses(userExpenses);
    } catch (error) {
      console.error('Error loading BTW data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateBTW = async () => {
    if (!currentUser || !currentQuarter) return;

    try {
      setCalculating(true);
      const updated = await btwService.calculateBTWForQuarter(
        currentUser.uid,
        currentQuarter.year,
        currentQuarter.quarter
      );
      setCurrentQuarter(updated);

      // Refresh all quarters
      const quarters = await btwService.getBTWQuarters(currentUser.uid);
      setAllQuarters(quarters);
    } catch (error) {
      console.error('Error calculating BTW:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleFullRecalculation = async () => {
    if (!currentUser) return;

    try {
      setFullRecalculating(true);
      console.log('Starting full BTW recalculation...');

      // Recalculate all quarters
      await btwService.recalculateAllQuarters(currentUser.uid);

      // Reload all data
      await loadBTWData();

      console.log('Full BTW recalculation completed');
    } catch (error) {
      console.error('Error in full recalculation:', error);
    } finally {
      setFullRecalculating(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      const amount = parseFloat(newExpense.amount);
      const vatRate = parseFloat(newExpense.vatRate) / 100;
      const vatAmount = amount * vatRate;

      await btwService.createExpense(currentUser.uid, {
        description: newExpense.description,
        amount,
        vatAmount,
        vatRate,
        category: newExpense.category,
        date: Timestamp.fromDate(new Date(newExpense.date)),
        isRecurring: false
      });

      // Reset form and close dialog
      setNewExpense({
        description: '',
        amount: '',
        vatRate: '21',
        category: 'office',
        date: new Date().toISOString().split('T')[0]
      });
      setShowAddExpense(false);

      // Reload data
      await loadBTWData();
    } catch (error) {
      console.error('Error adding expense:', error);
    }
  };

  const getStatusIcon = (status: BTWQuarter['status']) => {
    switch (status) {
      case 'draft': return <Clock className="h-4 w-4" />;
      case 'filed': return <FileText className="h-4 w-4" />;
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: BTWQuarter['status']) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'filed': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrentQuarterInfo = () => {
    const now = new Date();
    let year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    const quarterName = `Q${quarter} ${year}`;

    // Calculate due date
    let dueMonth: number;
    switch (quarter) {
      case 1: dueMonth = 4; break;
      case 2: dueMonth = 7; break;
      case 3: dueMonth = 10; break;
      case 4: dueMonth = 1; year++; break;
      default: dueMonth = 4;
    }

    const dueDate = new Date(year, dueMonth - 1, 30);

    return { quarterName, dueDate };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { quarterName, dueDate } = getCurrentQuarterInfo();

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">BTW Beheer</h1>
            <p className="text-gray-600">
              Beheer je BTW-aangiften en zakelijke uitgaven
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCalculateBTW} disabled={calculating || fullRecalculating}>
              <Calculator className="h-4 w-4 mr-2" />
              {calculating ? 'Berekenen...' : 'Huidig Kwartaal'}
            </Button>
            <Button
              variant="outline"
              onClick={handleFullRecalculation}
              disabled={calculating || fullRecalculating}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {fullRecalculating ? 'Herberekenen...' : 'Alle Data Herberekenen'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Current Quarter Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Huidig Kwartaal: {quarterName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Omzet (excl. BTW)</p>
                <p className="text-2xl font-bold text-green-600">
                  €{(currentQuarter?.totalRevenue || 0).toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">BTW Gefactureerd</p>
                <p className="text-2xl font-bold text-blue-600">
                  €{(currentQuarter?.totalVATCharged || 0).toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">BTW te Betalen</p>
                <p className={`text-2xl font-bold ${
                  (currentQuarter?.totalVATOwed || 0) > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  €{(currentQuarter?.totalVATOwed || 0).toFixed(2)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Inleverdatum</p>
                <p className="text-lg font-semibold text-gray-900">
                  {dueDate.toLocaleDateString('nl-NL')}
                </p>
                <Badge className={getStatusColor(currentQuarter?.status || 'draft')}>
                  {getStatusIcon(currentQuarter?.status || 'draft')}
                  <span className="ml-1">
                    {currentQuarter?.status === 'draft' ? 'Concept' :
                     currentQuarter?.status === 'filed' ? 'Ingediend' :
                     currentQuarter?.status === 'paid' ? 'Betaald' : 'Concept'}
                  </span>
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Expenses Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Zakelijke Uitgaven
              </CardTitle>
              <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Uitgave Toevoegen
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuwe Zakelijke Uitgave</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddExpense} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Omschrijving</label>
                      <Input
                        value={newExpense.description}
                        onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Bedrag (excl. BTW)</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">BTW %</label>
                        <select
                          value={newExpense.vatRate}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, vatRate: e.target.value }))}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="0">0%</option>
                          <option value="9">9%</option>
                          <option value="21">21%</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Categorie</label>
                        <select
                          value={newExpense.category}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value as BusinessExpense['category'] }))}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="office">Kantoor</option>
                          <option value="software">Software</option>
                          <option value="equipment">Apparatuur</option>
                          <option value="travel">Reizen</option>
                          <option value="training">Training</option>
                          <option value="other">Overig</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Datum</label>
                        <Input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowAddExpense(false)}>
                        Annuleren
                      </Button>
                      <Button type="submit">Toevoegen</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead>Categorie</TableHead>
                    <TableHead>Bedrag</TableHead>
                    <TableHead>BTW</TableHead>
                    <TableHead>Totaal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.slice(0, 10).map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {expense.date.toDate().toLocaleDateString('nl-NL')}
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {expense.category === 'office' ? 'Kantoor' :
                           expense.category === 'software' ? 'Software' :
                           expense.category === 'equipment' ? 'Apparatuur' :
                           expense.category === 'travel' ? 'Reizen' :
                           expense.category === 'training' ? 'Training' : 'Overig'}
                        </Badge>
                      </TableCell>
                      <TableCell>€{expense.amount.toFixed(2)}</TableCell>
                      <TableCell>€{expense.vatAmount.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">
                        €{(expense.amount + expense.vatAmount).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nog geen uitgaven toegevoegd.</p>
                <p className="text-sm">Voeg uitgaven toe om BTW terug te kunnen vorderen.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Historical Quarters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Kwartaal Geschiedenis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {allQuarters.length > 0 ? (
              <div className="space-y-4">
                {allQuarters.map((quarter) => (
                  <div
                    key={quarter.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-semibold">Q{quarter.quarter} {quarter.year}</h4>
                        <p className="text-sm text-gray-600">
                          Omzet: €{quarter.totalRevenue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold">€{quarter.totalVATOwed.toFixed(2)}</p>
                        <p className="text-sm text-gray-600">BTW verschuldigd</p>
                      </div>
                      <Badge className={getStatusColor(quarter.status)}>
                        {getStatusIcon(quarter.status)}
                        <span className="ml-1">
                          {quarter.status === 'draft' ? 'Concept' :
                           quarter.status === 'filed' ? 'Ingediend' :
                           quarter.status === 'paid' ? 'Betaald' : 'Concept'}
                        </span>
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nog geen kwartaal gegevens beschikbaar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}