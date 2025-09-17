import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { MonthlyFinancials, Invoice, BusinessExpense } from '@/types';

class FinancialAnalyticsService {
  // Monthly Financials Management
  async calculateMonthlyFinancials(userId: string, year: number, month: number): Promise<MonthlyFinancials> {
    try {
      // Get date range for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      console.log(`Calculating monthly financials for ${year}-${month}:`, { startDate, endDate });

      // Get all invoices for the user first, then filter
      const allInvoicesQuery = query(
        collection(db, 'invoices'),
        where('userId', '==', userId)
      );

      const invoicesSnapshot = await getDocs(allInvoicesQuery);
      const allInvoices = invoicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];

      console.log(`Total invoices found for user: ${allInvoices.length}`);

      // Filter invoices by date and relevant statuses (include sent, paid, overdue for revenue)
      const revenueStatuses = ['paid', 'sent', 'overdue', 'pending'];
      const monthInvoices = allInvoices.filter(invoice => {
        if (!revenueStatuses.includes(invoice.status)) {
          return false;
        }

        // Handle different date field formats
        let invoiceDate: Date;
        if (invoice.invoiceDate) {
          if (invoice.invoiceDate.toDate) {
            // Firestore Timestamp
            invoiceDate = invoice.invoiceDate.toDate();
          } else if (invoice.invoiceDate.seconds) {
            // Firestore Timestamp object
            invoiceDate = new Date(invoice.invoiceDate.seconds * 1000);
          } else {
            // Regular Date or string - handle any type
            invoiceDate = new Date(invoice.invoiceDate as any);
          }
        } else if (invoice.createdAt) {
          // Fallback to createdAt if invoiceDate is not available
          if (invoice.createdAt.toDate) {
            invoiceDate = invoice.createdAt.toDate();
          } else if (invoice.createdAt.seconds) {
            invoiceDate = new Date(invoice.createdAt.seconds * 1000);
          } else {
            invoiceDate = new Date(invoice.createdAt as any);
          }
        } else {
          console.warn('Invoice without date found:', invoice.id);
          return false;
        }

        const isInMonth = invoiceDate >= startDate && invoiceDate <= endDate;
        if (isInMonth) {
          console.log(`Invoice ${invoice.id} included in month ${month}:`, {
            status: invoice.status,
            date: invoiceDate,
            subtotal: invoice.subtotal,
            vatAmount: invoice.vatAmount
          });
        }
        return isInMonth;
      });

      console.log(`Invoices in ${year}-${month}:`, monthInvoices.length);

      const omzet = monthInvoices.reduce((sum, invoice) => sum + (invoice.subtotal || 0), 0);
      const vatCharged = monthInvoices.reduce((sum, invoice) => sum + (invoice.vatAmount || 0), 0);
      const invoiceCount = monthInvoices.length;

      console.log('Monthly Revenue Calculation:', { omzet, vatCharged, invoiceCount });

      // Get business expenses for the month (Kosten - Costs)
      const expensesQuery = query(
        collection(db, 'businessExpenses'),
        where('userId', '==', userId)
      );

      const expensesSnapshot = await getDocs(expensesQuery);
      const allExpenses = expensesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BusinessExpense[];

      console.log(`Total expenses found for user: ${allExpenses.length}`);

      // Filter expenses by date
      const monthExpenses = allExpenses.filter(expense => {
        // Handle different date field formats
        let expenseDate: Date;
        if (expense.date) {
          if (expense.date.toDate) {
            // Firestore Timestamp
            expenseDate = expense.date.toDate();
          } else if (expense.date.seconds) {
            // Firestore Timestamp object
            expenseDate = new Date(expense.date.seconds * 1000);
          } else {
            // Regular Date or string - handle any type
            expenseDate = new Date(expense.date as any);
          }
        } else {
          console.warn('Expense without date found:', expense.id);
          return false;
        }

        const isInMonth = expenseDate >= startDate && expenseDate <= endDate;
        if (isInMonth) {
          console.log(`Expense ${expense.id} included in month ${month}:`, {
            date: expenseDate,
            amount: expense.amount,
            vatAmount: expense.vatAmount
          });
        }
        return isInMonth;
      });

      const kosten = monthExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
      const vatPaid = monthExpenses.reduce((sum, expense) => sum + (expense.vatAmount || 0), 0);
      const expenseCount = monthExpenses.length;

      console.log('Monthly Expenses Calculation:', { kosten, vatPaid, expenseCount });

      // Calculate profit (Winst = Omzet - Kosten)
      const winst = omzet - kosten;

      const monthlyData: Omit<MonthlyFinancials, 'id'> = {
        userId,
        year,
        month,
        omzet,
        kosten,
        winst,
        vatCharged,
        vatPaid,
        invoiceCount,
        expenseCount,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Check if record already exists
      const existingRecord = await this.getMonthlyFinancials(userId, year, month);

      if (existingRecord) {
        // Update existing record
        await updateDoc(doc(db, 'monthlyFinancials', existingRecord.id), {
          ...monthlyData,
          updatedAt: serverTimestamp()
        });
        return { id: existingRecord.id, ...monthlyData } as MonthlyFinancials;
      } else {
        // Create new record
        const docRef = await addDoc(collection(db, 'monthlyFinancials'), {
          ...monthlyData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return { id: docRef.id, ...monthlyData } as MonthlyFinancials;
      }
    } catch (error) {
      console.error('Error calculating monthly financials:', error);
      throw error;
    }
  }

  async getMonthlyFinancials(userId: string, year: number, month: number): Promise<MonthlyFinancials | null> {
    try {
      const q = query(
        collection(db, 'monthlyFinancials'),
        where('userId', '==', userId),
        where('year', '==', year),
        where('month', '==', month)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as MonthlyFinancials;
    } catch (error) {
      console.error('Error getting monthly financials:', error);
      throw error;
    }
  }

  async getAllMonthlyFinancials(userId: string): Promise<MonthlyFinancials[]> {
    try {
      const q = query(
        collection(db, 'monthlyFinancials'),
        where('userId', '==', userId),
        orderBy('year', 'desc'),
        orderBy('month', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MonthlyFinancials[];
    } catch (error) {
      console.error('Error fetching all monthly financials:', error);
      throw error;
    }
  }

  async getYearlyFinancials(userId: string, year: number): Promise<MonthlyFinancials[]> {
    try {
      const q = query(
        collection(db, 'monthlyFinancials'),
        where('userId', '==', userId),
        where('year', '==', year),
        orderBy('month', 'asc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MonthlyFinancials[];
    } catch (error) {
      console.error('Error fetching yearly financials:', error);
      throw error;
    }
  }

  async calculateAndStoreCurrentMonth(userId: string): Promise<MonthlyFinancials> {
    const now = new Date();
    return this.calculateMonthlyFinancials(userId, now.getFullYear(), now.getMonth() + 1);
  }

  async calculateAndStoreLastTwelveMonths(userId: string): Promise<MonthlyFinancials[]> {
    const now = new Date();
    const results: MonthlyFinancials[] = [];

    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      try {
        const monthlyData = await this.calculateMonthlyFinancials(userId, year, month);
        results.push(monthlyData);
      } catch (error) {
        console.error(`Error calculating financials for ${year}-${month}:`, error);
      }
    }

    return results.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  async recalculateAllFinancials(userId: string): Promise<MonthlyFinancials[]> {
    try {
      console.log('Starting recalculation of all monthly financials for user:', userId);

      const now = new Date();
      const currentYear = now.getFullYear();
      const results: MonthlyFinancials[] = [];

      // Calculate all months for current year and previous year
      const monthPromises: Promise<MonthlyFinancials>[] = [];

      for (let year = currentYear - 1; year <= currentYear; year++) {
        for (let month = 1; month <= 12; month++) {
          // Don't calculate future months
          if (year === currentYear && month > now.getMonth() + 1) {
            continue;
          }
          monthPromises.push(this.calculateMonthlyFinancials(userId, year, month));
        }
      }

      const calculatedMonths = await Promise.all(monthPromises);
      results.push(...calculatedMonths);

      console.log(`Successfully recalculated ${results.length} months`);
      return results.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    } catch (error) {
      console.error('Error recalculating all financials:', error);
      throw error;
    }
  }

  // Analytics and reporting methods
  async getFinancialSummary(userId: string): Promise<{
    currentMonth: MonthlyFinancials | null;
    lastMonth: MonthlyFinancials | null;
    yearToDate: {
      totalOmzet: number;
      totalKosten: number;
      totalWinst: number;
      totalVATCharged: number;
      totalVATPaid: number;
    };
    trends: {
      omzetGrowth: number;
      kostenGrowth: number;
      winstGrowth: number;
    };
  }> {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

      // Get current and last month data
      const [currentMonthData, lastMonthData, yearlyData] = await Promise.all([
        this.calculateMonthlyFinancials(userId, currentYear, currentMonth),
        this.getMonthlyFinancials(userId, lastMonthYear, lastMonth),
        this.getYearlyFinancials(userId, currentYear)
      ]);

      // Calculate year-to-date totals
      const yearToDate = yearlyData.reduce(
        (acc, month) => ({
          totalOmzet: acc.totalOmzet + month.omzet,
          totalKosten: acc.totalKosten + month.kosten,
          totalWinst: acc.totalWinst + month.winst,
          totalVATCharged: acc.totalVATCharged + month.vatCharged,
          totalVATPaid: acc.totalVATPaid + month.vatPaid
        }),
        { totalOmzet: 0, totalKosten: 0, totalWinst: 0, totalVATCharged: 0, totalVATPaid: 0 }
      );

      // Calculate growth trends
      const trends = {
        omzetGrowth: lastMonthData && lastMonthData.omzet > 0
          ? ((currentMonthData.omzet - lastMonthData.omzet) / lastMonthData.omzet) * 100
          : 0,
        kostenGrowth: lastMonthData && lastMonthData.kosten > 0
          ? ((currentMonthData.kosten - lastMonthData.kosten) / lastMonthData.kosten) * 100
          : 0,
        winstGrowth: lastMonthData && lastMonthData.winst !== 0
          ? ((currentMonthData.winst - lastMonthData.winst) / Math.abs(lastMonthData.winst)) * 100
          : 0
      };

      return {
        currentMonth: currentMonthData,
        lastMonth: lastMonthData,
        yearToDate,
        trends
      };
    } catch (error) {
      console.error('Error getting financial summary:', error);
      throw error;
    }
  }

  // Utility methods
  getMonthName(month: number, language: 'nl' | 'en' = 'nl'): string {
    const monthNames = {
      nl: [
        'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
        'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
      ],
      en: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]
    };
    return monthNames[language][month - 1];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  formatPercentage(value: number): string {
    return new Intl.NumberFormat('nl-NL', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value / 100);
  }
}

export const financialAnalyticsService = new FinancialAnalyticsService();