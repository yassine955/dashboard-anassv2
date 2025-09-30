'use client';

import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll, isLoading } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'loading':
        return '⏳';
      default:
        return '📌';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'loading':
        return 'bg-gray-50 border-gray-200 text-gray-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return '';

    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: nl });
    } catch (error) {
      return '';
    }
  };

  const groupNotificationsByDate = (notifications: Notification[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups: { title: string; notifications: Notification[] }[] = [
      { title: 'Vandaag', notifications: [] },
      { title: 'Gisteren', notifications: [] },
      { title: 'Ouder', notifications: [] },
    ];

    notifications.forEach(notification => {
      try {
        const notifDate = notification.createdAt.toDate ? notification.createdAt.toDate() : new Date(notification.createdAt);
        const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

        if (notifDay.getTime() === today.getTime()) {
          groups[0].notifications.push(notification);
        } else if (notifDay.getTime() === yesterday.getTime()) {
          groups[1].notifications.push(notification);
        } else {
          groups[2].notifications.push(notification);
        }
      } catch (error) {
        groups[2].notifications.push(notification);
      }
    });

    return groups.filter(group => group.notifications.length > 0);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-gray-100 transition-all"
        >
          <Bell className="h-5 w-5 text-gray-600" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge
                  variant="destructive"
                  className="h-5 min-w-[20px] flex items-center justify-center px-1 text-[10px] font-semibold"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-400 opacity-20"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.1, 0.2],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[380px] sm:w-[420px] p-0 max-h-[600px] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-base">Meldingen</h3>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 px-2 text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Markeer alles
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Wis alles
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[500px]">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Laden...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">Geen meldingen</p>
              <p className="text-xs text-gray-400 mt-1">
                Je bent helemaal bij!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {groupedNotifications.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <div className="px-4 py-2 bg-gray-50">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {group.title}
                    </p>
                  </div>
                  <div>
                    {group.notifications.map((notification) => (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={cn(
                          "p-4 cursor-pointer transition-all border-l-4",
                          notification.read
                            ? "bg-white hover:bg-gray-50 border-l-transparent"
                            : "bg-blue-50/30 hover:bg-blue-50/50 border-l-blue-500",
                          getNotificationColor(notification.type)
                        )}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="text-xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm",
                              !notification.read && "font-medium"
                            )}>
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-gray-500">
                                {formatTimestamp(notification.createdAt)}
                              </p>
                              {!notification.read && (
                                <Badge
                                  variant="secondary"
                                  className="h-4 px-1.5 text-[9px] bg-blue-100 text-blue-700"
                                >
                                  NIEUW
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}