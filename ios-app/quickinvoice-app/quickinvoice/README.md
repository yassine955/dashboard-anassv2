# QuickInvoice - Flutter Invoice Management App

A comprehensive Flutter application for managing clients, products, invoices, and financial analytics. This app replicates the functionality of the Next.js dashboard project with native mobile experience.

## Features

### Core Functionality
- ✅ **Authentication**: Firebase Authentication with email/password
- ✅ **Client Management**: Create, read, update, delete client records
- ✅ **Product Catalog**: Manage digital products and services
- ✅ **Invoice Generation**: Create professional invoices with automatic calculations
- ✅ **BTW/VAT Management**: Dutch BTW compliance with quarterly reports
- ✅ **Financial Analytics**: Revenue tracking and business insights
- ✅ **Settings Management**: User preferences and business configuration

### Payment Providers (Ready for Integration)
- Stripe
- Tikkie (ABN AMRO)
- PayPal
- Mollie
- ING Bank

### Technical Features
- Firebase Firestore for real-time data synchronization
- Provider state management
- Go Router for navigation
- Material Design 3
- Responsive UI with custom theme
- PDF generation capability
- Email integration ready
- Image picker for receipts/documents

## Project Structure

```
lib/
├── config/
│   ├── app_config.dart          # App-wide configuration
│   ├── firebase_config.dart     # Firebase initialization
│   └── theme_config.dart        # Material Design theme
├── models/
│   ├── user_model.dart          # User & business info models
│   ├── client_model.dart        # Client data model
│   ├── product_model.dart       # Product/service model
│   ├── invoice_model.dart       # Invoice & invoice items
│   └── btw_model.dart           # BTW/expenses models
├── services/
│   ├── auth_service.dart        # Authentication logic
│   └── firestore_service.dart   # Database operations (CRUD)
├── screens/
│   ├── auth/
│   │   ├── login_screen.dart    # Login page
│   │   └── register_screen.dart # Registration page
│   ├── dashboard/
│   │   └── dashboard_screen.dart # Main dashboard
│   ├── clients/
│   │   └── clients_screen.dart  # Client management
│   ├── products/
│   │   └── products_screen.dart # Product catalog
│   ├── invoices/
│   │   └── invoices_screen.dart # Invoice management
│   ├── analytics/
│   │   └── analytics_screen.dart # Financial analytics
│   └── settings/
│       └── settings_screen.dart # App settings
├── widgets/
│   └── common/
│       └── app_drawer.dart      # Navigation drawer
├── routes/
│   └── app_router.dart          # Go Router configuration
└── main.dart                    # App entry point
```

## Database Schema

### Collections

#### users
- uid, email, displayName, photoURL
- businessInfo (companyName, kvkNumber, vatNumber, address)
- preferences (currency, language, invoiceTemplate, paymentTerms)
- emailTemplates
- paymentSettings (stripe, tikkie, paypal, mollie, ing)

#### clients
- userId, firstName, lastName, email, phone
- companyName, kvkNumber, vatNumber
- address (street, city, postalCode, country)
- status (active/inactive/archived)
- notes

#### products
- userId, name, description, category
- basePrice, vatRate
- deliveryTime, fileFormats, revisionRounds
- status, usageCount

#### invoices
- userId, clientId, invoiceNumber
- invoiceDate, dueDate
- subtotal, vatAmount, totalAmount
- status (draft/sent/pending/paid/overdue/cancelled)
- items[] (productId, description, quantity, unitPrice, vatRate)
- paymentLink, paymentId, paymentProvider
- paidAt, paidAmount

#### btw_quarters
- userId, year, quarter
- totalRevenue, totalVATCharged, totalVATOwed
- expenses[]
- status (draft/filed/paid)

#### business_expenses
- userId, description, amount, vatAmount, vatRate
- category (equipment/software/office/travel/training/other)
- date, receiptUrl
- isRecurring, recurringFrequency

## Setup Instructions

See [SETUP.md](SETUP.md) for detailed setup instructions.

### Quick Start

1. **Install dependencies**:
   ```bash
   flutter pub get
   ```

2. **Download Firebase config**:
   - Get `GoogleService-Info.plist` from Firebase Console
   - Place in `ios/Runner/GoogleService-Info.plist`

3. **Install iOS dependencies**:
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Run the app**:
   ```bash
   flutter run
   ```

## Design System

### Colors
- **Primary**: Indigo (#6366F1)
- **Secondary**: Purple (#8B5CF6)
- **Accent**: Green (#10B981)
- **Error**: Red (#EF4444)
- **Warning**: Amber (#F59E0B)
- **Info**: Blue (#3B82F6)

### Typography
- Display: 32-24px, Bold
- Headline: 22-18px, Semibold
- Title: 16-12px, Medium/Semibold
- Body: 16-12px, Regular
- Label: 14-10px, Medium

### Components
- Cards with 12px border radius
- 1px borders with gray-200 color
- 8px input border radius
- Consistent 16px padding
- Material Design 3 elevation system

## State Management

Uses **Provider** for:
- AuthService (authentication state)
- FirestoreService (database operations)

## Navigation

Uses **GoRouter** with:
- Route-based navigation
- Auth guards (redirect unauthenticated users)
- Deep linking support

## Next Steps

### Immediate
1. Download `GoogleService-Info.plist` from Firebase
2. Update iOS reversed client ID in Info.plist
3. Test authentication flow

### Development
1. Implement complete Clients screen with CRUD
2. Implement complete Products screen with CRUD
3. Implement complete Invoices screen with:
   - Invoice creation wizard
   - PDF generation
   - Email sending
4. Implement Analytics screen with charts
5. Implement Settings screen with:
   - Business info editing
   - Payment provider setup
   - Email template customization
6. Add Payment provider integrations
7. Implement BTW calculations and reports
8. Add PDF viewing and sharing
9. Implement search and filtering
10. Add notifications

### Polish
1. Add loading states
2. Add error handling
3. Add form validation
4. Add animations
5. Add empty states
6. Add pull-to-refresh
7. Add offline support
8. Add analytics tracking
9. Add crash reporting
10. Optimize performance

## Testing

```bash
# Run all tests
flutter test

# Run specific test
flutter test test/widget_test.dart

# Run with coverage
flutter test --coverage
```

## Building

### iOS
```bash
flutter build ios --release
```

### Android (when needed)
```bash
flutter build apk --release
```

## Technologies

- **Flutter**: 3.9.2+
- **Firebase**: Core, Auth, Firestore, Storage
- **State Management**: Provider, Riverpod
- **Navigation**: Go Router
- **UI**: Material Design 3
- **Charts**: FL Chart
- **Forms**: Form Builder + Validators
- **PDF**: PDF package + Printing
- **Images**: Image Picker, Cached Network Image
- **HTTP**: Dio
- **Storage**: Hive, Shared Preferences, Secure Storage
- **Payments**: Stripe, Flutter Pay
- **Utils**: Intl, UUID, TimeAgo

## Firebase Configuration

Project: **anass-dash**
- Project ID: `anass-dash`
- Storage Bucket: `anass-dash.firebasestorage.app`
- App ID: `1:427162814798:web:5aa8d9b4938b34a7f5f61f`

## License

Private project for Anass Dashboard v2

## Support

For questions or issues, contact the development team.