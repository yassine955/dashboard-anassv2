'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '@/lib/firebase-service';
import { Notification } from '@/types';
import { toast as sonnerToast } from 'sonner';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (type: Notification['type'], category: Notification['category'], message: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to notifications in real-time
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = notificationService.subscribeToNotifications(
      currentUser.uid,
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = async (
    type: Notification['type'],
    category: Notification['category'],
    message: string
  ) => {
    if (!currentUser) return;

    try {
      await notificationService.saveNotification(currentUser.uid, type, category, message);
    } catch (error) {
      console.error('Failed to save notification:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;

    try {
      await notificationService.markAllAsRead(currentUser.uid);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const clearAll = async () => {
    if (!currentUser) return;

    try {
      await notificationService.clearAllNotifications(currentUser.uid);
      sonnerToast.success('Alle meldingen gewist');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      sonnerToast.error('Kon meldingen niet wissen');
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        isLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}