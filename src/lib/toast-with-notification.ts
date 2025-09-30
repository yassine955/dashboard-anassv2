import { toast as sonnerToast } from 'sonner';
import { notificationService } from './firebase-service';
import { Notification } from '@/types';

// Helper to determine category from message content
function determineCategory(message: string): Notification['category'] {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('betaal') || lowerMessage.includes('payment') || lowerMessage.includes('tikkie') || lowerMessage.includes('stripe') || lowerMessage.includes('mollie')) {
    return 'payment';
  }
  if (lowerMessage.includes('factuur') || lowerMessage.includes('invoice')) {
    return 'invoice';
  }
  if (lowerMessage.includes('klant') || lowerMessage.includes('client')) {
    return 'client';
  }
  if (lowerMessage.includes('product')) {
    return 'product';
  }

  return 'other';
}

// Enhanced toast that saves to notification history
export const toast = {
  success: (message: string, options?: any) => {
    sonnerToast.success(message, options);

    // Save to notifications (async, don't block UI)
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId');
      if (userId) {
        const category = determineCategory(message);
        notificationService.saveNotification(userId, 'success', category, message).catch(console.error);
      }
    }
  },

  error: (message: string, options?: any) => {
    sonnerToast.error(message, options);

    // Save to notifications
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId');
      if (userId) {
        const category = determineCategory(message);
        notificationService.saveNotification(userId, 'error', category, message).catch(console.error);
      }
    }
  },

  info: (message: string, options?: any) => {
    sonnerToast.info(message, options);

    // Save to notifications
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId');
      if (userId) {
        const category = determineCategory(message);
        notificationService.saveNotification(userId, 'info', category, message).catch(console.error);
      }
    }
  },

  warning: (message: string, options?: any) => {
    sonnerToast.warning(message, options);

    // Save to notifications
    if (typeof window !== 'undefined') {
      const userId = localStorage.getItem('currentUserId');
      if (userId) {
        const category = determineCategory(message);
        notificationService.saveNotification(userId, 'warning', category, message).catch(console.error);
      }
    }
  },

  loading: (message: string, options?: any) => {
    return sonnerToast.loading(message, options);
  },

  // Custom method for saving notification with userId
  saveNotification: async (userId: string, type: Notification['type'], category: Notification['category'], message: string) => {
    try {
      await notificationService.saveNotification(userId, type, category, message);
    } catch (error) {
      console.error('Failed to save notification:', error);
    }
  }
};