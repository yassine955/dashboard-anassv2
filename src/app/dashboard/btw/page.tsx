'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { btwService } from '@/lib/btw-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
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
  Clock,
  Archive,
  Eye,
  X,
  FolderOpen,
  Settings,
  Send,
  CreditCard,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { soundService } from '@/lib/sound-service';
import { toast } from 'sonner';
import { BTWQuarter, BusinessExpense } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { ResponsiveContainer, ResponsiveGrid, FluidText, ResponsiveSpacer } from '@/components/ui/responsive-container';
import { useResponsive } from '@/hooks/useResponsive';

export default function BTWPage() {
  const { currentUser } = useAuth();
  const { isMobile, isTablet, responsive } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [currentQuarter, setCurrentQuarter] = useState<BTWQuarter | null>(null);
  const [allQuarters, setAllQuarters] = useState<BTWQuarter[]>([]);
  const [closedQuarters, setClosedQuarters] = useState<BTWQuarter[]>([]);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [fullRecalculating, setFullRecalculating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<BTWQuarter | null>(null);
  const [showQuarterDetails, setShowQuarterDetails] = useState(false);
  const [showOpenQuarter, setShowOpenQuarter] = useState(false);
  const [opening, setOpening] = useState(false);
  const [availableQuarters, setAvailableQuarters] = useState<Array<{ year: number, quarter: number, name: string, dueDate: Date }>>([]);
  const [selectedQuarterToOpen, setSelectedQuarterToOpen] = useState<{ year: number, quarter: number } | null>(null);
  const [activeQuarter, setActiveQuarter] = useState<BTWQuarter | null>(null);
  const [deletingQuarter, setDeletingQuarter] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [quarterToDelete, setQuarterToDelete] = useState<BTWQuarter | null>(null);

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
      const [current, quarters, closed, userExpenses] = await Promise.all([
        btwService.getCurrentBTWQuarter(currentUser.uid),
        btwService.getActiveQuarters(currentUser.uid),
        btwService.getClosedQuarters(currentUser.uid),
        btwService.getExpenses(currentUser.uid)
      ]);

      setCurrentQuarter(current);
      setAllQuarters(quarters);
      setClosedQuarters(closed);
      setExpenses(userExpenses);
      setActiveQuarter(current);

      // Load available quarters to open
      const available = btwService.getAvailableQuartersToOpen();
      setAvailableQuarters(available);
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
      const [activeQuarters, closedQuartersData] = await Promise.all([
        btwService.getActiveQuarters(currentUser.uid),
        btwService.getClosedQuarters(currentUser.uid)
      ]);
      setAllQuarters(activeQuarters);
      setClosedQuarters(closedQuartersData);
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

  const handleCloseQuarter = async () => {
    if (!currentUser || !currentQuarter) return;

    try {
      setClosing(true);
      const closedQuarter = await btwService.closeQuarter(currentUser.uid, currentQuarter.id);

      // Reload all data
      await loadBTWData();

      console.log('Quarter closed successfully:', closedQuarter);
    } catch (error) {
      console.error('Error closing quarter:', error);
    } finally {
      setClosing(false);
    }
  };

  const handleViewQuarterDetails = (quarter: BTWQuarter) => {
    setSelectedQuarter(quarter);
    setShowQuarterDetails(true);
  };

  const handleOpenNewQuarter = async () => {
    if (!currentUser || !selectedQuarterToOpen) return;

    try {
      setOpening(true);
      const newQuarter = await btwService.openNewQuarter(
        currentUser.uid,
        selectedQuarterToOpen.year,
        selectedQuarterToOpen.quarter
      );

      // Set as active quarter and reload data
      setActiveQuarter(newQuarter);
      setCurrentQuarter(newQuarter);
      await loadBTWData();

      setShowOpenQuarter(false);
      setSelectedQuarterToOpen(null);
      console.log('New quarter opened successfully:', newQuarter);
    } catch (error) {
      console.error('Error opening new quarter:', error);
    } finally {
      setOpening(false);
    }
  };

  const handleUpdateQuarterStatus = async (quarterId: string, newStatus: BTWQuarter['status']) => {
    if (!currentUser) return;

    try {
      const updatedQuarter = await btwService.updateQuarterStatus(currentUser.uid, quarterId, newStatus);

      // Play sound based on status
      if (newStatus === 'filed') {
        soundService.playNotification();
        toast.success('Kwartaal succesvol ingediend bij Belastingdienst!');
      } else if (newStatus === 'paid') {
        soundService.playPaymentReceived();
        toast.success('Betaling geregistreerd! 🎉');
      }

      // Update the current quarter if it's the one being updated
      if (currentQuarter?.id === quarterId) {
        setCurrentQuarter(updatedQuarter);
        setActiveQuarter(updatedQuarter);
      }

      await loadBTWData();
      console.log('Quarter status updated:', updatedQuarter);
    } catch (error) {
      console.error('Error updating quarter status:', error);
      toast.error('Fout bij updaten kwartaal status');
    }
  };

  const handleDeleteQuarter = async () => {
    if (!currentUser || !quarterToDelete) return;

    try {
      setDeletingQuarter(quarterToDelete.id);
      await btwService.deleteQuarter(currentUser.uid, quarterToDelete.id);

      soundService.playDelete();
      toast.success(`Kwartaal Q${quarterToDelete.quarter} ${quarterToDelete.year} verwijderd`);

      // If we deleted the current quarter, reset it
      if (currentQuarter?.id === quarterToDelete.id) {
        setCurrentQuarter(null);
        setActiveQuarter(null);
      }

      await loadBTWData();
      setShowDeleteConfirm(false);
      setQuarterToDelete(null);
    } catch (error) {
      console.error('Error deleting quarter:', error);
      soundService.playWarning();
      toast.error(error instanceof Error ? error.message : 'Fout bij verwijderen kwartaal');
    } finally {
      setDeletingQuarter(null);
    }
  };

  const confirmDeleteQuarter = (quarter: BTWQuarter) => {
    setQuarterToDelete(quarter);
    setShowDeleteConfirm(true);
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
      <ResponsiveContainer>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ResponsiveContainer>
    );
  }

  const { quarterName, dueDate } = getCurrentQuarterInfo();

  return (
    <ResponsiveContainer>
      <div className="space-y-6 sm:space-y-8">
        {/* Enhanced Header with mobile-first design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
            <div className="min-w-0">
              <FluidText variant="h1" as="h1" className="text-gray-900">
                BTW Beheer
              </FluidText>
              <FluidText variant="body" className="text-gray-600 mt-1 sm:mt-2">
                Beheer je BTW-aangiften en zakelijke uitgaven
              </FluidText>
            </div>
            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 shrink-0">
              <Dialog open={showOpenQuarter} onOpenChange={setShowOpenQuarter}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="touch-manipulation active:scale-95 transition-transform text-sm"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Open Nieuw Kwartaal</span>
                    <span className="sm:hidden">Nieuw Kwartaal</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nieuw BTW Kwartaal Openen</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Selecteer een kwartaal om te openen. Je kunt alleen kwartalen openen die nog niet bestaan.
                    </p>
                    <div>
                      <label className="text-sm font-medium">Beschikbare Kwartalen</label>
                      <div className="mt-2 space-y-2">
                        {availableQuarters.map((quarter) => {
                          const exists = allQuarters.some(q => q.year === quarter.year && q.quarter === quarter.quarter) ||
                            closedQuarters.some(q => q.year === quarter.year && q.quarter === quarter.quarter);
                          const isOverdue = new Date() > quarter.dueDate;

                          return (
                            <label key={`${quarter.year}-${quarter.quarter}`} className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name="quarter"
                                disabled={exists}
                                onChange={() => setSelectedQuarterToOpen({ year: quarter.year, quarter: quarter.quarter })}
                                className="form-radio"
                              />
                              <div className="flex-1">
                                <span className={`font-medium ${exists ? 'text-gray-400' : ''}`}>
                                  {quarter.name}
                                </span>
                                <p className="text-xs text-gray-500">
                                  Inleverdatum: {quarter.dueDate.toLocaleDateString('nl-NL')}
                                  {isOverdue && <span className="text-red-600 ml-2">(Verlopen)</span>}
                                  {exists && <span className="text-gray-400 ml-2">(Bestaat al)</span>}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowOpenQuarter(false)}>
                      Annuleren
                    </Button>
                    <Button
                      onClick={handleOpenNewQuarter}
                      disabled={!selectedQuarterToOpen || opening}
                    >
                      {opening ? 'Openen...' : 'Kwartaal Openen'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button onClick={handleCalculateBTW} disabled={calculating || fullRecalculating}>
                <Calculator className="h-4 w-4 mr-2" />
                {calculating ? 'Berekenen...' : 'Huidige Kwartaal'}
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

        {/* Enhanced Current Quarter Overview with mobile optimization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base lg:text-lg">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                  <span className="truncate">
                    <span className="hidden sm:inline">Huidig Kwartaal: {quarterName}</span>
                    <span className="sm:hidden">{quarterName}</span>
                  </span>
                </CardTitle>
                {currentQuarter && (
                  <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                    {currentQuarter.status === 'draft' && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          onClick={() => handleUpdateQuarterStatus(currentQuarter.id, 'filed')}
                          disabled={closing || calculating || fullRecalculating}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation active:scale-95 text-sm"
                        >
                          <motion.div
                            animate={calculating ? { rotate: 360 } : { rotate: 0 }}
                            transition={{ duration: 1, repeat: calculating ? Infinity : 0, ease: "linear" }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                          </motion.div>
                          <span className="hidden sm:inline">Indienen bij Belastingdienst</span>
                          <span className="sm:hidden">Indienen</span>
                        </Button>
                      </motion.div>
                    )}
                    {currentQuarter.status === 'filed' && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          onClick={() => handleUpdateQuarterStatus(currentQuarter.id, 'paid')}
                          disabled={closing || calculating || fullRecalculating}
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white transition-all duration-200 shadow-sm hover:shadow-md touch-manipulation active:scale-95 text-sm"
                        >
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                          </motion.div>
                          <span className="hidden sm:inline">Markeer als Betaald</span>
                          <span className="sm:hidden">Betaald</span>
                        </Button>
                      </motion.div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Status: {
                        currentQuarter.status === 'draft' ? 'Concept' :
                          currentQuarter.status === 'filed' ? 'Ingediend' :
                            currentQuarter.status === 'paid' ? 'Betaald' : 'Onbekend'
                      }
                    </Button>
                  </div>
                )}
              </div>
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
                  <p className={`text-2xl font-bold ${(currentQuarter?.totalVATOwed || 0) > 0 ? 'text-red-600' : 'text-green-600'
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

        {/* Active Quarters */}
        {allQuarters.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Actieve Kwartalen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allQuarters.map((quarter) => (
                    <Card
                      key={quarter.id}
                      className={`relative group transition-all hover:shadow-md ${currentQuarter?.id === quarter.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setCurrentQuarter(quarter);
                          setActiveQuarter(quarter);
                        }}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">
                              Q{quarter.quarter} {quarter.year}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(quarter.status)}>
                                {getStatusIcon(quarter.status)}
                                <span className="ml-1">
                                  {quarter.status === 'draft' ? 'Concept' :
                                    quarter.status === 'filed' ? 'Ingediend' :
                                      quarter.status === 'paid' ? 'Betaald' : 'Concept'}
                                </span>
                              </Badge>
                              {/* Delete Button - Only for draft status */}
                              {quarter.status === 'draft' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDeleteQuarter(quarter);
                                  }}
                                  disabled={deletingQuarter === quarter.id}
                                >
                                  {deletingQuarter === quarter.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Omzet:</span>
                              <span className="font-medium text-green-600">
                                €{quarter.totalRevenue.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">BTW te betalen:</span>
                              <span className={`font-medium ${quarter.totalVATOwed >= 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                €{quarter.totalVATOwed.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Deadline:</span>
                              <span>
                                {quarter.dueDate?.toDate ?
                                  quarter.dueDate.toDate().toLocaleDateString('nl-NL') :
                                  'Niet beschikbaar'
                                }
                              </span>
                            </div>
                          </div>
                          {currentQuarter?.id === quarter.id && (
                            <div className="mt-3 text-center">
                              <Badge className="bg-blue-100 text-blue-800">
                                <Eye className="h-3 w-3 mr-1" />
                                Nu Actief
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Closed Quarters History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Afgesloten Kwartalen
              </CardTitle>
            </CardHeader>
            <CardContent>
              {closedQuarters.length > 0 ? (
                <div className="space-y-4">
                  {closedQuarters.map((quarter) => (
                    <div
                      key={quarter.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-semibold">Q{quarter.quarter} {quarter.year}</h4>
                          <p className="text-sm text-gray-600">
                            Omzet: €{quarter.totalRevenue.toFixed(2)} • BTW: €{quarter.totalVATCharged.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewQuarterDetails(quarter)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Details
                        </Button>
                        <div className="text-right">
                          <p className={`font-semibold ${quarter.totalVATOwed >= 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                            €{quarter.totalVATOwed.toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {quarter.totalVATOwed >= 0 ? 'Te betalen' : 'Terug te vorderen'}
                          </p>
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
                  <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nog geen afgesloten kwartalen.</p>
                  <p className="text-sm">Sluit een kwartaal af om het hier te zien.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quarter Details Dialog */}
        <Dialog open={showQuarterDetails} onOpenChange={setShowQuarterDetails}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Kwartaal Details: Q{selectedQuarter?.quarter} {selectedQuarter?.year}
              </DialogTitle>
            </DialogHeader>
            {selectedQuarter && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      €{selectedQuarter.totalRevenue.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Omzet (excl. BTW)</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      €{selectedQuarter.totalVATCharged.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">BTW Gefactureerd</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      €{selectedQuarter.expenses?.reduce((sum, exp) => sum + exp.vatAmount, 0).toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-gray-600">BTW Betaald</p>
                  </div>
                  <div className={`text-center p-4 rounded-lg ${selectedQuarter.totalVATOwed >= 0 ? 'bg-red-50' : 'bg-green-50'
                    }`}>
                    <p className={`text-2xl font-bold ${selectedQuarter.totalVATOwed >= 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                      €{selectedQuarter.totalVATOwed.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedQuarter.totalVATOwed >= 0 ? 'Te Betalen' : 'Terug te Vorderen'}
                    </p>
                  </div>
                </div>

                {/* Expenses */}
                {selectedQuarter.expenses && selectedQuarter.expenses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Zakelijke Uitgaven</h3>
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
                        {selectedQuarter.expenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>
                              {expense.date.toDate ? expense.date.toDate().toLocaleDateString('nl-NL') :
                                new Date(expense.date as any).toLocaleDateString('nl-NL')}
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
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQuarterDetails(false)}>
                <X className="h-4 w-4 mr-2" />
                Sluiten
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Kwartaal Verwijderen
              </DialogTitle>
            </DialogHeader>
            {quarterToDelete && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>Waarschuwing:</strong> Je staat op het punt om kwartaal{' '}
                    <strong>Q{quarterToDelete.quarter} {quarterToDelete.year}</strong> permanent te verwijderen.
                  </p>
                </div>

                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>Dit kwartaal bevat:</strong></p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>Omzet: €{quarterToDelete.totalRevenue.toFixed(2)}</li>
                    <li>BTW bedrag: €{quarterToDelete.totalVATCharged.toFixed(2)}</li>
                    <li>Uitgaven: {quarterToDelete.expenses?.length || 0} items</li>
                  </ul>
                </div>

                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-800">
                    <strong>Let op:</strong> Deze actie kan niet ongedaan gemaakt worden. Alleen concept kwartalen kunnen worden verwijderd.
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setQuarterToDelete(null);
                }}
                disabled={!!deletingQuarter}
              >
                Annuleren
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteQuarter}
                disabled={!!deletingQuarter}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletingQuarter ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verwijderen...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Permanent Verwijderen
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResponsiveContainer>
  );
}