# Adobe Editor Dashboard - Claude Development Guide

## Project Overview

**Project Name:** Adobe Editor Client & Invoice Management Dashboard
**Version:** 1.0
**Tech Stack:** Next.js 14, Firebase, Stripe, shadcn/ui, animate-ui
**Target:** Freelance Adobe editors and small creative agencies

A comprehensive web-based dashboard application for managing client relationships, digital product catalogs, and invoice generation with real-time payment processing.

## Technology Stack

### Frontend
- **Framework:** Next.js 14 with TypeScript and App Router
- **UI Components:** shadcn/ui with MCP server integration
- **Animations:** animate-ui.com components
- **Styling:** Tailwind CSS
- **State Management:** React Context + useReducer / Zustand

### Backend & Database
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth (Google OAuth + Email/Password)
- **Real-time:** Firebase real-time listeners
- **File Storage:** Firebase Storage (for PDFs, avatars)

### Integrations
- **Payments:** Stripe with payment links and webhooks
- **PDF Generation:** jsPDF or React-PDF
- **Email:** Firebase Functions with SendGrid
- **Animations:** animate-ui.com library

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
npx create-next-app@latest adobe-editor-dashboard --typescript --tailwind --eslint --app
cd adobe-editor-dashboard
```

### 2. Install Dependencies
```bash
# Core dependencies
npm install firebase
npm install stripe
npm install @stripe/stripe-js

# UI and Animations
pnpm dlx shadcn@latest mcp init --client claude
npm install framer-motion
npm install lucide-react

# PDF and Email
npm install jspdf html2canvas
npm install react-pdf
npm install @react-email/components

# Utilities
npm install date-fns
npm install zod
npm install react-hook-form @hookform/resolvers
npm install sonner # for toast notifications
```

### 3. Setup shadcn/ui with MCP
```bash
pnpm dlx shadcn@latest mcp init --client claude
pnpm dlx shadcn@latest add button card input label textarea select
pnpm dlx shadcn@latest add table dialog alert-dialog sheet
pnpm dlx shadcn@latest add form dropdown-menu avatar badge
pnpm dlx shadcn@latest add tabs navigation-menu sidebar
```

### 4. Setup animate-ui Components
```bash
# Install animate-ui for smooth animations
npm install @animate-ui/react
```

## Database Schema (Firestore)

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
  stripeAccountId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Clients Collection
```typescript
interface Client {
  id: string;
  userId: string; // reference to user
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
???LINES MISSING
???LINES MISSING
???LINES MISSING
???LINES MISSING
???LINES MISSING
???LINES MISSING
???LINES MISSING
???LINES MISSING
???LINES MISSING
???LINES MISSING
???LINES MISSING
???LINES MISSING
