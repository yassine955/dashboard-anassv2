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
  stripeAccountId?: string;
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