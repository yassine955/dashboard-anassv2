import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { BTWQuarter, BTWExpense, BusinessExpense, Invoice } from '@/types';

class BTWService {
  // BTW Quarter Management
  async createBTWQuarter(userId: string, year: number, quarter: number): Promise<string> {
    try {
      const quarterRef = collection(db, 'btwQuarters');
      const docRef = await addDoc(quarterRef, {
        userId,
        year,
        quarter,
        totalRevenue: 0,
        totalVATCharged: 0,
        totalVATOwed: 0,
        expenses: [],
        status: 'draft',
        dueDate: this.calculateDueDate(year, quarter),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating BTW quarter:', error);
      throw error;
    }
  }

  async getBTWQuarters(userId: string): Promise<BTWQuarter[]> {
    try {
      const q = query(
        collection(db, 'btwQuarters'),
        where('userId', '==', userId),
        orderBy('year', 'desc'),
        orderBy('quarter', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BTWQuarter[];
    } catch (error) {
      console.error('Error fetching BTW quarters:', error);
      throw error;
    }
  }

  async getCurrentBTWQuarter(userId: string): Promise<BTWQuarter | null> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const quarter = Math.ceil((now.getMonth() + 1) / 3);

      const q = query(
        collection(db, 'btwQuarters'),
        where('userId', '==', userId),
        where('year', '==', year),
        where('quarter', '==', quarter)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Create current quarter if it doesn't exist
        const quarterId = await this.createBTWQuarter(userId, year, quarter);
        const quarterDoc = await getDoc(doc(db, 'btwQuarters', quarterId));
        return { id: quarterId, ...quarterDoc.data() } as BTWQuarter;
      }

      const quarterDoc = querySnapshot.docs[0];
      return { id: quarterDoc.id, ...quarterDoc.data() } as BTWQuarter;
    } catch (error) {
      console.error('Error getting current BTW quarter:', error);
      throw error;
    }
  }

  async calculateBTWForQuarter(userId: string, year: number, quarter: number): Promise<BTWQuarter> {
    try {
      // Get all invoices for the quarter
      const startDate = new Date(year, (quarter - 1) * 3, 1);
      const endDate = new Date(year, quarter * 3, 0, 23, 59, 59);

      console.log(`Calculating BTW for Q${quarter} ${year}:`, { startDate, endDate });

      // Get all invoices for the user first, then filter by date and status
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

      // Filter invoices by date and relevant statuses
      const relevantStatuses = ['paid', 'sent', 'overdue', 'pending'];
      const quarterInvoices = allInvoices.filter(invoice => {
        if (!relevantStatuses.includes(invoice.status)) {
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

        const isInQuarter = invoiceDate >= startDate && invoiceDate <= endDate;
        if (isInQuarter) {
          console.log(`Invoice ${invoice.id} included:`, {
            status: invoice.status,
            date: invoiceDate,
            subtotal: invoice.subtotal,
            vatAmount: invoice.vatAmount
          });
        }
        return isInQuarter;
      });

      console.log(`Invoices in Q${quarter} ${year}:`, quarterInvoices.length);

      // Calculate totals from invoices
      const totalRevenue = quarterInvoices.reduce((sum, invoice) => sum + (invoice.subtotal || 0), 0);
      const totalVATCharged = quarterInvoices.reduce((sum, invoice) => sum + (invoice.vatAmount || 0), 0);

      console.log('BTW Calculation Results:', { totalRevenue, totalVATCharged });

      // Get business expenses for the quarter
      const expenses = await this.getExpensesForQuarter(userId, year, quarter);
      const totalVATPaid = expenses.reduce((sum, expense) => sum + expense.vatAmount, 0);

      // Calculate BTW owed (VAT charged - VAT paid)
      const totalVATOwed = totalVATCharged - totalVATPaid;

      // Update or create BTW quarter record
      const existingQuarter = await this.getBTWQuarter(userId, year, quarter);
      const quarterData = {
        userId,
        year,
        quarter,
        totalRevenue,
        totalVATCharged,
        totalVATOwed,
        expenses: expenses.map(exp => ({
          id: exp.id,
          description: exp.description,
          amount: exp.amount,
          vatAmount: exp.vatAmount,
          vatRate: exp.vatRate,
          category: exp.category,
          date: exp.date
        })) as BTWExpense[],
        status: existingQuarter?.status || 'draft' as const,
        dueDate: this.calculateDueDate(year, quarter),
        updatedAt: serverTimestamp()
      };

      if (existingQuarter) {
        await updateDoc(doc(db, 'btwQuarters', existingQuarter.id), quarterData);
        return { id: existingQuarter.id, ...quarterData } as BTWQuarter;
      } else {
        const quarterId = await this.createBTWQuarter(userId, year, quarter);
        await updateDoc(doc(db, 'btwQuarters', quarterId), quarterData);
        const updatedDoc = await getDoc(doc(db, 'btwQuarters', quarterId));
        return { id: quarterId, ...updatedDoc.data() } as BTWQuarter;
      }
    } catch (error) {
      console.error('Error calculating BTW for quarter:', error);
      throw error;
    }
  }

  private async getBTWQuarter(userId: string, year: number, quarter: number): Promise<BTWQuarter | null> {
    try {
      const q = query(
        collection(db, 'btwQuarters'),
        where('userId', '==', userId),
        where('year', '==', year),
        where('quarter', '==', quarter)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) return null;

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as BTWQuarter;
    } catch (error) {
      console.error('Error getting BTW quarter:', error);
      throw error;
    }
  }

  private calculateDueDate(year: number, quarter: number): Timestamp {
    // BTW filing deadline is typically the last day of the month following the quarter
    let month: number;
    switch (quarter) {
      case 1: month = 4; break; // Q1 due April 30
      case 2: month = 7; break; // Q2 due July 31
      case 3: month = 10; break; // Q3 due October 31
      case 4: month = 1; year += 1; break; // Q4 due January 31 of next year
      default: month = 4;
    }

    const dueDate = new Date(year, month - 1, 30); // Last day of the month
    return Timestamp.fromDate(dueDate);
  }

  // Business Expenses Management
  async createExpense(userId: string, expense: Omit<BusinessExpense, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const expensesRef = collection(db, 'businessExpenses');
      const docRef = await addDoc(expensesRef, {
        ...expense,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  async getExpenses(userId: string): Promise<BusinessExpense[]> {
    try {
      const q = query(
        collection(db, 'businessExpenses'),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BusinessExpense[];
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  async getExpensesForQuarter(userId: string, year: number, quarter: number): Promise<BusinessExpense[]> {
    try {
      const startDate = new Date(year, (quarter - 1) * 3, 1);
      const endDate = new Date(year, quarter * 3, 0, 23, 59, 59);

      const q = query(
        collection(db, 'businessExpenses'),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BusinessExpense[];
    } catch (error) {
      console.error('Error fetching quarterly expenses:', error);
      throw error;
    }
  }

  async updateExpense(expenseId: string, updates: Partial<BusinessExpense>): Promise<void> {
    try {
      const expenseRef = doc(db, 'businessExpenses', expenseId);
      await updateDoc(expenseRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  }

  async deleteExpense(expenseId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'businessExpenses', expenseId));
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  }

  // Manually open/create a new quarter
  async openNewQuarter(userId: string, year: number, quarter: number): Promise<BTWQuarter> {
    try {
      // Check if quarter already exists
      const existingQuarter = await this.getBTWQuarter(userId, year, quarter);
      if (existingQuarter) {
        throw new Error(`Kwartaal Q${quarter} ${year} bestaat al`);
      }

      // Create new quarter
      const quarterId = await this.createBTWQuarter(userId, year, quarter);
      const quarterDoc = await getDoc(doc(db, 'btwQuarters', quarterId));
      return { id: quarterId, ...quarterDoc.data() } as BTWQuarter;
    } catch (error) {
      console.error('Error opening new quarter:', error);
      throw error;
    }
  }

  // Get available quarters to open (current and next quarters only)
  getAvailableQuartersToOpen(): Array<{year: number, quarter: number, name: string, dueDate: Date}> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

    const available = [];

    // Current quarter
    available.push({
      year: currentYear,
      quarter: currentQuarter,
      name: `Q${currentQuarter} ${currentYear}`,
      dueDate: this.calculateDueDateAsDate(currentYear, currentQuarter)
    });

    // Next quarter
    let nextQuarter = currentQuarter + 1;
    let nextYear = currentYear;
    if (nextQuarter > 4) {
      nextQuarter = 1;
      nextYear++;
    }

    available.push({
      year: nextYear,
      quarter: nextQuarter,
      name: `Q${nextQuarter} ${nextYear}`,
      dueDate: this.calculateDueDateAsDate(nextYear, nextQuarter)
    });

    // Previous quarter (if not closed)
    let prevQuarter = currentQuarter - 1;
    let prevYear = currentYear;
    if (prevQuarter < 1) {
      prevQuarter = 4;
      prevYear--;
    }

    available.unshift({
      year: prevYear,
      quarter: prevQuarter,
      name: `Q${prevQuarter} ${prevYear}`,
      dueDate: this.calculateDueDateAsDate(prevYear, prevQuarter)
    });

    return available;
  }

  private calculateDueDateAsDate(year: number, quarter: number): Date {
    let month: number;
    switch (quarter) {
      case 1: month = 4; break; // Q1 due April 30
      case 2: month = 7; break; // Q2 due July 31
      case 3: month = 10; break; // Q3 due October 31
      case 4: month = 1; year += 1; break; // Q4 due January 31 of next year
      default: month = 4;
    }
    return new Date(year, month - 1, 30);
  }

  // Update quarter status (draft -> filed -> paid)
  async updateQuarterStatus(userId: string, quarterId: string, status: BTWQuarter['status']): Promise<BTWQuarter> {
    try {
      const quarterRef = doc(db, 'btwQuarters', quarterId);
      const quarterDoc = await getDoc(quarterRef);

      if (!quarterDoc.exists()) {
        throw new Error('Quarter not found');
      }

      const quarterData = quarterDoc.data() as BTWQuarter;

      // Verify this quarter belongs to the user
      if (quarterData.userId !== userId) {
        throw new Error('Unauthorized to update this quarter');
      }

      const updateData: any = {
        status,
        updatedAt: serverTimestamp()
      };

      // Add timestamps based on status
      if (status === 'filed' && quarterData.status === 'draft') {
        updateData.filedAt = serverTimestamp();
      } else if (status === 'paid' && quarterData.status === 'filed') {
        updateData.paidAt = serverTimestamp();
      }

      await updateDoc(quarterRef, updateData);

      // Return updated quarter data
      const updatedDoc = await getDoc(quarterRef);
      return { id: quarterId, ...updatedDoc.data() } as BTWQuarter;
    } catch (error) {
      console.error('Error updating quarter status:', error);
      throw error;
    }
  }

  // Close a quarter (mark as filed/completed)
  async closeQuarter(userId: string, quarterId: string): Promise<BTWQuarter> {
    try {
      const quarterRef = doc(db, 'btwQuarters', quarterId);
      const quarterDoc = await getDoc(quarterRef);

      if (!quarterDoc.exists()) {
        throw new Error('Quarter not found');
      }

      const quarterData = quarterDoc.data() as BTWQuarter;

      // Verify this quarter belongs to the user
      if (quarterData.userId !== userId) {
        throw new Error('Unauthorized to close this quarter');
      }

      // Update status to filed and add closed date
      await updateDoc(quarterRef, {
        status: 'filed' as const,
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Return updated quarter data
      const updatedDoc = await getDoc(quarterRef);
      return { id: quarterId, ...updatedDoc.data() } as BTWQuarter;
    } catch (error) {
      console.error('Error closing quarter:', error);
      throw error;
    }
  }

  // Get closed quarters (history)
  async getClosedQuarters(userId: string): Promise<BTWQuarter[]> {
    try {
      const q = query(
        collection(db, 'btwQuarters'),
        where('userId', '==', userId),
        where('status', 'in', ['filed', 'paid']),
        orderBy('year', 'desc'),
        orderBy('quarter', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BTWQuarter[];
    } catch (error) {
      console.error('Error fetching closed quarters:', error);
      throw error;
    }
  }

  // Get active quarters (draft status)
  async getActiveQuarters(userId: string): Promise<BTWQuarter[]> {
    try {
      const q = query(
        collection(db, 'btwQuarters'),
        where('userId', '==', userId),
        where('status', '==', 'draft'),
        orderBy('year', 'desc'),
        orderBy('quarter', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BTWQuarter[];
    } catch (error) {
      console.error('Error fetching active quarters:', error);
      throw error;
    }
  }

  // Force recalculate all quarters for a user
  async recalculateAllQuarters(userId: string): Promise<BTWQuarter[]> {
    try {
      console.log('Starting recalculation of all quarters for user:', userId);

      const results: BTWQuarter[] = [];

      // Also calculate current year quarters if they don't exist
      const currentYear = new Date().getFullYear();
      const quarterPromises: Promise<BTWQuarter>[] = [];

      // Calculate all 4 quarters for current year and previous year
      for (let year = currentYear - 1; year <= currentYear; year++) {
        for (let quarter = 1; quarter <= 4; quarter++) {
          quarterPromises.push(this.calculateBTWForQuarter(userId, year, quarter));
        }
      }

      const calculatedQuarters = await Promise.all(quarterPromises);
      results.push(...calculatedQuarters);

      console.log(`Successfully recalculated ${results.length} quarters`);
      return results;
    } catch (error) {
      console.error('Error recalculating all quarters:', error);
      throw error;
    }
  }

  // Utility methods
  getQuarterFromMonth(month: number): number {
    return Math.ceil(month / 3);
  }

  getQuarterName(quarter: number): string {
    return `Q${quarter}`;
  }

  getQuarterDateRange(year: number, quarter: number): { start: Date; end: Date } {
    const start = new Date(year, (quarter - 1) * 3, 1);
    const end = new Date(year, quarter * 3, 0, 23, 59, 59);
    return { start, end };
  }
}

export const btwService = new BTWService();