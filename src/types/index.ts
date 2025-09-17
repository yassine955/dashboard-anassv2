import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  businessInfo: {
    companyName: string;
    kvkNumber: string;
    vatNumber?: string;
    address: {
      street: string;
      city: string;
      postalCode: string;
      country: string;
    };
    phone?: string;
    website?: string;
  };
  preferences: {
    currency: string;
    language: string;
    invoiceTemplate: string;
    defaultPaymentTerms: number; // days
  };
  paymentSettings?: {
    stripe?: {
      // Stripe Connect fields
      accountId?: string;
      accessToken?: string;
      refreshToken?: string;
      publishableKey?: string;
      isActive: boolean;
      connectedAt?: string;
      disconnectedAt?: string;
      // Legacy manual API key fields (for backward compatibility)
      manualPublishableKey?: string;
      manualSecretKey?: string;
    };
    ing?: {
      clientId: string;
      clientSecret: string;
      creditorIban: string;
      isActive: boolean;
    };
  };
  stripeAccountId?: string; // Legacy field - keeping for backward compatibility
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Client {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  kvkNumber?: string;
  vatNumber?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  notes?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  deliveryTime?: string;
  fileFormats?: string;
  revisionRounds: number;
  status: 'active' | 'inactive' | 'discontinued';
  usageCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  clientId: string;
  client?: Client; // Populated for display
  invoiceDate: Timestamp;
  dueDate: Timestamp;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  paymentTerms?: string;
  paymentLink?: string;
  items: InvoiceItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  product?: Product; // Populated for display
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  lineTotal: number;
}

export interface PaymentSettings {
  stripeSecretKey?: string;
  stripePublishableKey?: string;
  emailSettings: {
    service: string;
    user: string;
    pass: string;
  };
}

// BTW (VAT) and Financial Analytics Types
export interface BTWQuarter {
  id: string;
  userId: string;
  year: number;
  quarter: number; // 1-4
  totalRevenue: number;
  totalVATCharged: number; // BTW charged to clients
  totalVATOwed: number; // BTW owed to tax authority
  expenses: BTWExpense[];
  status: 'draft' | 'filed' | 'paid';
  dueDate: Timestamp;
  filedDate?: Timestamp;
  paidDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BTWExpense {
  id: string;
  description: string;
  amount: number;
  vatAmount: number;
  vatRate: number;
  category: 'equipment' | 'software' | 'office' | 'travel' | 'training' | 'other';
  date: Timestamp;
  receiptUrl?: string;
}

export interface MonthlyFinancials {
  id: string;
  userId: string;
  year: number;
  month: number; // 1-12
  omzet: number; // Revenue
  kosten: number; // Costs/Expenses
  winst: number; // Profit (omzet - kosten)
  vatCharged: number; // BTW charged on revenue
  vatPaid: number; // BTW paid on expenses
  invoiceCount: number;
  expenseCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BusinessExpense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  vatAmount: number;
  vatRate: number;
  category: 'equipment' | 'software' | 'office' | 'travel' | 'training' | 'other';
  date: Timestamp;
  receiptUrl?: string;
  isRecurring: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}