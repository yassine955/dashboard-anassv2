# Firebase Security Rules Update Required

## Invoice Numbering Implementation

The custom invoice numbering with "AM" prefix has been implemented. The system now uses sequential numbering (AM00001, AM00002, etc.) instead of random numbers.

## Required Firestore Security Rule Addition

Please add the following rule to your Firebase Console > Firestore Database > Rules:

```javascript
// Add this rule to the existing rules
match /invoiceCounters/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## How it works

1. Each user gets their own counter document in the `invoiceCounters` collection
2. The document ID is the user's UID for security
3. The counter tracks the `lastInvoiceNumber` and increments atomically using transactions
4. Invoice numbers are formatted as `AM` + 5-digit padded number (AM00001, AM00002, etc.)
5. If the transaction fails, it falls back to timestamp-based numbering with AM prefix

## Implementation Details

- **File modified**: `src/lib/firebase-service.ts`
- **Method updated**: `generateInvoiceNumber()` - now async and uses Firestore transactions
- **New collection**: `invoiceCounters` - stores the sequential counter per user
- **Transaction safety**: Ensures no duplicate invoice numbers even with concurrent requests
- **Fallback mechanism**: Uses timestamp if transaction fails for reliability

## Testing

The implementation has been type-checked and is ready for use. The next invoice created will use the new numbering system.