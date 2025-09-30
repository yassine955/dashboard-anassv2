# Notification System Documentation

## Overview

The notification system provides a persistent history of all toast notifications shown to users. It captures success messages, errors, warnings, and other important events, storing them in Firebase Firestore for later review.

## Features

- **Bell Icon** in dashboard header with unread count badge
- **Real-time Updates** using Firebase listeners
- **Automatic Capture** of all toast notifications
- **Categorization** (payment, invoice, client, product, system)
- **Grouped Display** (Today, Yesterday, Older)
- **Mark as Read** individual or all notifications
- **Clear All** notifications option
- **Responsive Design** works on mobile and desktop

## Usage

### For Developers

#### Using the Enhanced Toast

Import and use the enhanced toast instead of the regular Sonner toast:

```typescript
// Instead of:
import { toast } from 'sonner';

// Use:
import { toast } from '@/lib/toast-with-notification';

// Usage is exactly the same:
toast.success('Payment received!');
toast.error('Failed to save invoice');
toast.info('New feature available');
toast.warning('Your trial expires soon');
```

The enhanced toast will:
1. Show the toast notification as normal
2. Automatically save it to Firebase for the notification history
3. Categorize it based on keywords in the message

#### Manual Notification Saving

If you need more control, use the notification context directly:

```typescript
import { useNotifications } from '@/contexts/NotificationContext';

function MyComponent() {
  const { addNotification } = useNotifications();

  const handlePayment = async () => {
    // Your payment logic...

    // Save notification manually
    await addNotification('success', 'payment', 'Payment of €150 received');
  };
}
```

### Notification Categories

The system automatically categorizes notifications based on keywords:

- **payment**: betaal, payment, tikkie, stripe, mollie
- **invoice**: factuur, invoice
- **client**: klant, client
- **product**: product
- **system**: Everything else

### Notification Types

- `success` ✅ - Green background
- `error` ❌ - Red background
- `warning` ⚠️ - Yellow background
- `info` ℹ️ - Blue background
- `loading` ⏳ - Gray background

## Architecture

### Components

1. **NotificationBell** (`/components/NotificationBell.tsx`)
   - Bell icon with badge in header
   - Popover dropdown with notification list
   - Grouped by date (Today, Yesterday, Older)
   - Click to mark as read, buttons to mark all/clear all

2. **NotificationContext** (`/contexts/NotificationContext.tsx`)
   - React context managing notification state
   - Real-time Firebase listener
   - CRUD operations for notifications

3. **Toast Wrapper** (`/lib/toast-with-notification.ts`)
   - Intercepts toast calls
   - Automatically saves to Firebase
   - Smart categorization

4. **Firebase Service** (`/lib/firebase-service.ts`)
   - `notificationService` with methods:
     - `saveNotification()`
     - `getNotifications()`
     - `markAsRead()`
     - `markAllAsRead()`
     - `clearAllNotifications()`
     - `subscribeToNotifications()`

### Database Schema

**Collection:** `notifications`

```typescript
{
  id: string;
  userId: string;
  type: 'success' | 'error' | 'info' | 'loading' | 'warning';
  category: 'payment' | 'invoice' | 'client' | 'product' | 'system' | 'other';
  message: string;
  read: boolean;
  createdAt: Timestamp;
}
```

### Firebase Security Rules

Add to `firestore.rules`:

```javascript
match /notifications/{notificationId} {
  allow read, write: if request.auth != null &&
    resource.data.userId == request.auth.uid;
}
```

## Migration Guide

### Updating Existing Code

To automatically capture notifications from existing code:

**Before:**
```typescript
import { toast } from 'sonner';

toast.success('Invoice created!');
```

**After:**
```typescript
import { toast } from '@/lib/toast-with-notification';

toast.success('Invoice created!');
```

That's it! No other changes needed. The notification will be automatically saved.

### Benefits of Migration

- **Zero-effort history**: All messages automatically captured
- **User insights**: See what actions users are taking
- **Support tool**: Users can review past notifications
- **Audit trail**: Track important system events
- **No breaking changes**: API is identical to Sonner

## UI Screenshots

### Bell Icon with Badge
- Location: Dashboard header, next to "Welkom"
- Badge: Red circle with unread count
- Animation: Pulse effect when unread notifications exist

### Notification Panel
- Width: 380-420px depending on screen size
- Max height: 600px with scroll
- Sections: Today, Yesterday, Older
- Each notification shows:
  - Icon (emoji based on type)
  - Message text
  - Timestamp ("2 min ago")
  - "NIEUW" badge if unread
  - Background color based on type
  - Blue left border if unread

### Actions
- **Click notification**: Mark as read
- **Mark all button**: Mark all as read
- **Clear all button**: Delete all notifications

## Performance Considerations

- **Real-time listener**: Only active when user is logged in
- **Automatic cleanup**: Firestore indexes handle query performance
- **Lazy saving**: Notifications saved async, don't block UI
- **LocalStorage caching**: UserId cached for faster access

## Future Enhancements

Potential improvements:

1. **Filtering**: Filter by category or type
2. **Search**: Search through notification history
3. **Pagination**: Load more notifications on scroll
4. **Settings**: User preferences for which notifications to save
5. **Export**: Download notification history as CSV
6. **Push notifications**: Browser push for important events
7. **Retention policy**: Auto-delete old notifications after X days

## Troubleshooting

### Notifications not appearing

1. Check Firebase connection
2. Verify user is logged in
3. Check browser console for errors
4. Ensure Firestore security rules allow access

### Notifications not saving

1. Check localStorage has `currentUserId`
2. Verify Firebase permissions
3. Check network tab for failed requests
4. Ensure notification service is imported correctly

### Bell icon not showing

1. Check NotificationProvider wraps app
2. Verify import in DashboardLayout
3. Check for React hydration errors
4. Ensure AuthContext provides user

## Support

For issues or questions, check:
- Firebase Console for errors
- Browser developer console
- Network tab for API calls
- React DevTools for component tree