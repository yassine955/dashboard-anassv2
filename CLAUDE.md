# Adobe Editor Dashboard - Claude Development Guide v2.0

## Project Overview

**Project Name:** Adobe Editor Client & Invoice Management Dashboard
**Version:** 2.0
**Tech Stack:** Next.js 14, Firebase, Multiple Payment Providers, shadcn/ui, Framer Motion
**Target:** Nederlandse Adobe editors, ZZP'ers, en kleine creatieve agencies

Een complete web-gebaseerde dashboard applicatie voor het beheren van client relaties, digitale product catalogi, factuur generatie, en financiële analytics met BTW compliance en meerdere payment providers.

## Technology Stack

### Frontend
- **Framework:** Next.js 14 met TypeScript en App Router
- **UI Components:** shadcn/ui met Radix UI primitives
- **Animations:** Framer Motion voor smooth transitions
- **Styling:** Tailwind CSS met custom design system
- **State Management:** React Context + useReducer voor complex state
- **Form Handling:** React Hook Form met Zod validation
- **Charts:** Recharts voor financial analytics

### Backend & Database
- **Database:** Firebase Firestore (NoSQL document database)
- **Authentication:** Firebase Auth (Google OAuth + Email/Password)
- **Real-time Updates:** Firebase real-time listeners
- **File Storage:** Firebase Storage (voor PDFs, receipts, avatars)
- **API Routes:** Next.js API routes voor server-side logic

### Payment Providers
- **Stripe:** Payment Links + Checkout Sessions + Connect
- **Tikkie:** ABN AMRO Tikkie API (sandbox + productie)
- **PayPal:** PayPal Checkout Server SDK
- **Mollie:** Nederlandse payment methods (iDEAL, Bancontact, etc.)
- **ING Bank:** PSD2 Payment Initiation Service

### Additional Services
- **PDF Generation:** jsPDF + html2canvas voor client-side generatie
- **Email Service:** Nodemailer met SMTP configuratie
- **Sound Service:** Custom audio generation voor notifications
- **Analytics:** Custom financial analytics service

## Firebase Configuration

```javascript
// lib/firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyDZZTk4WJ2cLU8KGV-ngydRDBL6LLCEumw",
  authDomain: "anass-dash.firebaseapp.com",
  projectId: "anass-dash",
  storageBucket: "anass-dash.firebasestorage.app",
  messagingSenderId: "427162814798",
  appId: "1:427162814798:web:5aa8d9b4938b34a7f5f61f",
  measurementId: "G-2FXJBWKCHH"
};
```

## Project Setup

### 1. Initialize Next.js Project
```bash
npx create-next-app@latest anass-dashboard-v2 --typescript --tailwind --eslint --app
cd anass-dashboard-v2
```

### 2. Install Core Dependencies
```bash
# Firebase & Authentication
npm install firebase

# Payment Providers
npm install stripe @stripe/stripe-js
npm install @paypal/checkout-server-sdk @paypal/paypal-server-sdk

# UI Components & Styling
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-switch
npm install @radix-ui/react-tabs @radix-ui/react-avatar
npm install @radix-ui/react-alert-dialog @radix-ui/react-popover
npm install @radix-ui/react-navigation-menu @radix-ui/react-label
npm install @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge
npm install tailwindcss-animate
npm install lucide-react
npm install framer-motion

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Charts & Analytics
npm install recharts
npm install react-day-picker

# Utilities
npm install date-fns
npm install sonner # for toast notifications
npm install jspdf html2canvas
npm install react-pdf
npm install nodemailer
npm install jsonwebtoken
```

### 3. Development Dependencies
```bash
npm install -D @types/node @types/react @types/react-dom
npm install -D @types/nodemailer @types/jsonwebtoken
npm install -D puppeteer sharp
npm install -D typescript postcss autoprefixer
```

### 4. Setup shadcn/ui Components
```bash
# Initialize shadcn/ui (if not already done)
npx shadcn@latest init

# Add required components
npx shadcn@latest add button card input label textarea select
npx shadcn@latest add table dialog alert-dialog
npx shadcn@latest add form dropdown-menu avatar badge
npx shadcn@latest add tabs switch popover calendar
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server (kills port 3000 first)
npm run build            # Build for production
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
npm run type-check       # Run TypeScript type checking

# Production
npm run production:build # Full production build with lint + type-check
npm run production:start # Start production server

# Utilities
npm run clean            # Remove .next directory
npm run build:analyze    # Build with bundle analyzer
```

## Database Schema (Firebase Firestore)

### Users Collection
```typescript
interface User {
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
  emailTemplates?: {
    invoiceEmail: {
      subject: string;
      content: string;
      isCustom: boolean;
    };
    paymentReminder: {
      subject: string;
      content: string;
      isCustom: boolean;
    };
  };
  paymentSettings?: {
    stripe?: {
      accountId?: string;
      accessToken?: string;
      refreshToken?: string;
      publishableKey?: string;
      isActive: boolean;
    };
    tikkie?: {
      apiKey: string;
      appToken?: string;
      sandboxMode: boolean;
      isActive: boolean;
    };
    paypal?: {
      clientId: string;
      clientSecret: string;
      webhookId?: string;
      isActive: boolean;
    };
    mollie?: {
      apiKey: string;
      profileId?: string;
      isActive: boolean;
    };
    ing?: {
      clientId: string;
      clientSecret: string;
      creditorIban: string;
      isActive: boolean;
    };
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Clients Collection
```typescript
interface Client {
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
```

### Products Collection
```typescript
interface Product {
  id: string;
  userId: string;
  name: string;
  description: string;
  basePrice: number;
  category: string;
  deliveryTime?: string;
  fileFormats?: string;
  revisionRounds: number;
  vatRate?: number;
  status: 'active' | 'inactive' | 'discontinued';
  usageCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Invoices Collection
```typescript
interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  clientId: string;
  invoiceDate: Timestamp;
  dueDate: Timestamp;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  paymentTerms?: string;
  paymentLink?: string;
  paymentId?: string;
  paymentProvider?: 'stripe' | 'tikkie' | 'mollie' | 'paypal' | 'ing';
  paidAt?: Timestamp;
  paidAmount?: number;
  items: InvoiceItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### BTW & Financial Collections
```typescript
interface BTWQuarter {
  id: string;
  userId: string;
  year: number;
  quarter: number; // 1-4
  totalRevenue: number;
  totalVATCharged: number;
  totalVATOwed: number;
  expenses: BTWExpense[];
  status: 'draft' | 'filed' | 'paid';
  dueDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface BusinessExpense {
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
```

## API Routes Structure

### Payment APIs
- `/api/create-payment-link` - Stripe payment link creation
- `/api/create-tikkie-payment` - Tikkie payment requests
- `/api/create-paypal-payment` - PayPal order creation
- `/api/create-mollie-payment` - Mollie payment creation
- `/api/create-ing-payment` - ING bank transfer initiation

### Webhook Endpoints
- `/api/stripe-webhook` - Stripe event processing
- `/api/tikkie-webhook` - Tikkie payment status updates
- `/api/paypal-webhook` - PayPal transaction notifications
- `/api/mollie-webhook` - Mollie payment status changes
- `/api/ing-webhook` - ING payment confirmations

### Status & Management
- `/api/check-tikkie-payment` - Manual payment status refresh
- `/api/stripe-status` - Stripe account status
- `/api/tikkie-sandbox-token` - Tikkie token management
- `/api/stripe-connect/authorize` - Stripe Connect OAuth
- `/api/stripe-connect/oauth` - Stripe Connect callback
- `/api/stripe-connect/disconnect` - Stripe Connect disconnect

### Communication
- `/api/send-email` - Invoice email sending
- `/api/send-payment-reminder` - Payment reminder emails

### Utilities
- `/api/health` - Health check endpoint
- `/api/test-stripe-connection` - Test Stripe connectivity
## Key Features Implemented

### 1. Multi-Payment Provider Support
- **Stripe**: Payment Links, Checkout Sessions, Connect integration
- **Tikkie**: ABN AMRO integration met sandbox/productie omgeving
- **PayPal**: Complete integration met webhooks
- **Mollie**: Nederlandse payment methods (iDEAL, Bancontact)
- **ING Bank**: PSD2 compliant payment initiation

### 2. Financial Analytics & BTW Management
- **BTW Compliance**: Automatische Nederlandse BTW berekening
- **Quarterly Reports**: Q1-Q4 BTW overzichten
- **Business Expenses**: Tracking met categorieën en receipts
- **Financial Dashboard**: Interactive charts met Recharts
- **Monthly Analytics**: Omzet, kosten, winst tracking

### 3. Email Automation
- **Custom Templates**: Factuur en reminder templates
- **Automatic Sending**: Email met PDF bijlagen
- **Payment Links**: Automatische integratie in emails
- **Delivery Tracking**: Confirmatie van verzending

### 4. Real-time Features
- **Payment Monitoring**: Live payment status updates
- **Sound Notifications**: Audio alerts bij betalingen
- **Auto-polling**: Automatic status checks voor Tikkie
- **Webhook Processing**: Real-time updates van alle providers

### 5. Responsive Design
- **Mobile First**: Optimized voor alle screen sizes
- **Touch Friendly**: Proper touch targets
- **Custom Components**: Responsive containers en tables
- **Progressive Enhancement**: Werkt zonder JavaScript

## Environment Variables Required

```bash
# Create .env.local file

# Firebase Configuration (already in lib/firebase.ts)
# No additional Firebase env vars needed voor client-side

# Stripe (optioneel voor server-side)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_WEBHOOK_ID=your_paypal_webhook_id

# Mollie
MOLLIE_API_KEY=test_...

# Tikkie (ABN AMRO)
TIKKIE_API_KEY=your_tikkie_api_key
TIKKIE_SANDBOX_MODE=true

# ING Bank
ING_CLIENT_ID=your_ing_client_id
ING_CLIENT_SECRET=your_ing_client_secret

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# JWT Secret voor tokens
JWT_SECRET=your_jwt_secret_key

# Next.js
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

## Development Workflow

### 1. Start Development
```bash
git clone <repository>
cd anass-dashboard-v2
npm install
cp .env.example .env.local  # Add your environment variables
npm run dev
```

### 2. Testing Payment Providers
- **Stripe**: Use test mode met test card numbers
- **Tikkie**: Use sandbox environment
- **PayPal**: Use sandbox accounts
- **Mollie**: Use test API keys
- **ING**: Use sandbox credentials

### 3. Code Quality
```bash
# Before committing
npm run lint:fix
npm run type-check
npm run build  # Test build locally
```

### 4. Production Deployment
```bash
npm run production:build  # Full production build
# Deploy to Vercel or your preferred platform
```

## Firebase Security Rules

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Clients are user-specific
    match /clients/{clientId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }

    // Products are user-specific
    match /products/{productId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }

    // Invoices are user-specific
    match /invoices/{invoiceId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }

    // BTW data is user-specific
    match /btw_quarters/{quarterId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }

    match /business_expenses/{expenseId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
  }
}
```

## Troubleshooting

### Common Issues

**1. Firebase Connection Issues**
```bash
# Check Firebase config
node -e "console.log(require('./src/lib/firebase.js'))"
```

**2. Payment Provider Issues**
- Check API keys in environment variables
- Verify webhook URLs zijn correct geconfigureerd
- Test met sandbox/test modes eerst

**3. Build Issues**
```bash
# Clear Next.js cache
npm run clean
npm run build
```

**4. TypeScript Errors**
```bash
# Full type check
npm run type-check
# Check specific file
npx tsc --noEmit src/path/to/file.ts
```

**5. Email Sending Issues**
- Verify SMTP credentials
- Check firewall/security settings
- Test met Gmail app passwords

### Performance Optimization

**1. Bundle Analysis**
```bash
npm run build:analyze
```

**2. Image Optimization**
- Use Next.js Image component
- Optimize SVG icons
- Use WebP format waar mogelijk

**3. Database Optimization**
- Use proper Firebase indexes
- Implement pagination voor large lists
- Cache frequently accessed data

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard pages
│   │   ├── analytics/     # Financial analytics
│   │   ├── btw/          # BTW management
│   │   ├── clients/       # Client management
│   │   ├── invoices/      # Invoice creation
│   │   ├── payments/      # Payment management
│   │   ├── products/      # Product catalog
│   │   └── settings/      # User settings
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # Reusable components
│   ├── icons/            # Custom icons (PayPal, Mollie, Tikkie)
│   └── ui/               # shadcn/ui components
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
├── hooks/                # Custom hooks
│   └── useResponsive.ts  # Responsive design hook
├── lib/                  # Utility libraries
│   ├── firebase.ts       # Firebase configuration
│   ├── firebase-service.ts # Firestore operations
│   ├── stripe-server.ts  # Stripe server functions
│   ├── tikkie-server.ts  # Tikkie integration
│   ├── paypal-server.ts  # PayPal integration
│   ├── mollie-server.ts  # Mollie integration
│   ├── ing-server.ts     # ING bank integration
│   ├── email.ts          # Email services
│   ├── pdf.ts            # PDF generation
│   ├── sound-service.ts  # Audio notifications
│   ├── btw-service.ts    # BTW calculations
│   └── financial-analytics-service.ts
└── types/                # TypeScript definitions
    └── index.ts          # Main type definitions
```

---

**Important Notes:**
- Dit project gebruikt Firebase voor data persistence (geen Supabase)
- Alle payment providers zijn volledig geïntegreerd en getest
- Nederlandse BTW compliance is volledig geïmplementeerd
- Real-time features werken via Firebase listeners en webhooks
- Audio notifications zijn geïmplementeerd voor betaling events
- Responsive design is geoptimaliseerd voor alle devices

**Development Commands:**
- `npm run dev` - Start development (preferred)
- `npm run production:build` - Full production build met checks
- `npm run lint:fix` - Fix linting issues
- `npm run type-check` - TypeScript validation
