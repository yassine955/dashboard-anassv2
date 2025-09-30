# QuickInvoice Flutter App - Setup Instructions

## Prerequisites

- Flutter SDK (latest stable version)
- Xcode (for iOS development)
- CocoaPods
- Firebase project

## Firebase Setup

### 1. Download GoogleService-Info.plist

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **anass-dash**
3. Go to Project Settings (gear icon)
4. Under "Your apps", select the iOS app
5. Download `GoogleService-Info.plist`
6. Place it in: `ios/Runner/GoogleService-Info.plist`

### 2. Update Firebase iOS Client ID

After downloading `GoogleService-Info.plist`, update the reversed client ID in:

**File**: `ios/Runner/Info.plist`

Find this line:
```xml
<string>com.googleusercontent.apps.427162814798-xxxxxxxxxx</string>
```

Replace `xxxxxxxxxx` with the actual reversed client ID from your `GoogleService-Info.plist` file.

Look for the `REVERSED_CLIENT_ID` key in your `GoogleService-Info.plist` and copy its value.

## Installation Steps

### 1. Install Flutter Dependencies

```bash
flutter pub get
```

### 2. Install iOS Dependencies

```bash
cd ios
pod install
pod update
cd ..
```

### 3. Run the App

```bash
# iOS
flutter run -d iphone

# Or open in Xcode
open ios/Runner.xcworkspace
```

## Environment Variables

Create a `.env` file in the root directory (optional for production):

```env
# Stripe
STRIPE_PUBLISHABLE_KEY=pk_test_...

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id

# Tikkie
TIKKIE_API_KEY=your_tikkie_api_key

# Mollie
MOLLIE_API_KEY=test_...
```

## Project Structure

```
lib/
├── config/           # Configuration files
├── models/           # Data models
├── services/         # Business logic & API services
├── screens/          # UI screens
├── widgets/          # Reusable widgets
├── routes/           # Navigation & routing
└── utils/            # Utility functions
```

## Features Implemented

- ✅ Firebase Authentication (Email/Password)
- ✅ Client Management
- ✅ Product Catalog
- ✅ Invoice Generation
- ✅ BTW/VAT Management
- ✅ Financial Analytics
- ✅ Multiple Payment Providers (Stripe, Tikkie, PayPal, Mollie)
- ✅ PDF Generation
- ✅ Email Integration

## Development

### Hot Reload

Press `r` in the terminal or use your IDE's hot reload button.

### Format Code

```bash
flutter format .
```

### Analyze Code

```bash
flutter analyze
```

### Run Tests

```bash
flutter test
```

## Build for Production

### iOS

```bash
flutter build ios --release
```

Then open Xcode and archive the app:

```bash
open ios/Runner.xcworkspace
```

Product > Archive > Distribute App

## Troubleshooting

### Pod Install Issues

```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Clean Build

```bash
flutter clean
flutter pub get
cd ios && pod install && cd ..
flutter run
```

### Firebase Connection Issues

1. Verify `GoogleService-Info.plist` is in `ios/Runner/`
2. Check bundle identifier matches Firebase console
3. Ensure Info.plist has correct reversed client ID

## Support

For issues or questions, contact the development team.