'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/NotificationBell';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Package,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Calculator,
  BarChart3,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast-with-notification';
import { soundService } from '@/lib/sound-service';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isNew?: boolean;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Klanten', href: '/dashboard/clients', icon: Users },
  { name: 'Producten', href: '/dashboard/products', icon: Package },
  { name: 'Facturen', href: '/dashboard/invoices', icon: FileText },
  { name: 'BTW Beheer', href: '/dashboard/btw', icon: Calculator, isNew: true },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, isNew: true },
  { name: 'Updates & Info', href: '/dashboard/info', icon: Info },
  { name: 'Instellingen', href: '/dashboard/settings', icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth');
      toast.success('Successfully logged out');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Enhanced Sidebar with better mobile support */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 sm:w-80 lg:w-64 bg-white shadow-xl lg:shadow-lg transform transition-all duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Enhanced Header with responsive logo */}
          <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 border-b border-gray-200">
            <div className="flex items-center space-x-3 min-w-0">
              <Image
                src="/dashboard.png"
                alt="QuickInvoice Logo"
                width={160}
                height={36}
                className="h-8 sm:h-10 lg:h-12 w-auto"
                priority
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Enhanced Navigation with touch-friendly design */}
          <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-2 overflow-y-auto">
            {navigation.map((item, index) => {
              const isActive = pathname === item.href;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start h-12 sm:h-12 md:h-11 lg:h-12 relative transition-all duration-200 group touch-manipulation",
                      "text-sm sm:text-base px-3 sm:px-4",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                      item.isNew && !isActive && [
                        "border border-transparent hover:border-blue-200",
                        "hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-blue-50/30",
                        "hover:shadow-sm"
                      ],
                      "rounded-lg active:scale-95"
                    )}
                    onClick={() => {
                      soundService.playButtonClick();
                      router.push(item.href);
                      setSidebarOpen(false);
                    }}
                  >
                    <motion.div
                      className="mr-3"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <item.icon className={cn(
                        "h-5 w-5 transition-colors duration-200",
                        item.isNew && !isActive && "text-blue-600 group-hover:text-blue-700"
                      )} />
                    </motion.div>
                    <span className={cn(
                      "flex-1 text-left transition-colors duration-200 truncate",
                      item.isNew && !isActive && "font-medium"
                    )}>
                      {item.name}
                    </span>

                    {/* Professional NEW Badge */}
                    <AnimatePresence>
                      {item.isNew && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0, x: 10 }}
                          animate={{ scale: 1, opacity: 1, x: 0 }}
                          exit={{ scale: 0.9, opacity: 0, x: 10 }}
                          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                          className="flex items-center"
                        >
                          {/* Linear-inspired notification dot */}
                          <motion.div
                            className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2.5"
                            animate={{
                              opacity: [0.6, 1, 0.6],
                            }}
                            transition={{
                              duration: 1.8,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />

                          {/* Clean, minimal badge inspired by Vercel/Linear */}
                          <div className="relative group/badge">
                            <Badge
                              variant="outline"
                              className="
                                px-1.5 py-0 h-5 text-[9px] font-semibold tracking-wide
                                bg-blue-50/80 hover:bg-blue-100/80
                                text-blue-700 border-blue-300/50
                                transition-all duration-200 ease-out
                                rounded-md
                                shadow-none hover:shadow-sm
                                backdrop-blur-sm
                              "
                            >
                              NEW
                            </Badge>

                            {/* Subtle glow on hover */}
                            <div className="absolute inset-0 bg-blue-400/20 rounded-md opacity-0 group-hover/badge:opacity-100 transition-opacity duration-300 blur-[1px] -z-10" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              );
            })}
          </nav>

          {/* Enhanced User Profile & Logout */}
          <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50/50">
            <div className="flex items-center space-x-3 mb-3 sm:mb-4">
              <Avatar
                src={currentUser?.photoURL || ""}
                alt={currentUser?.displayName || "User"}
                fallback={currentUser?.displayName || "U"}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                  {currentUser?.displayName || 'User'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {currentUser?.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start h-10 sm:h-11 text-sm touch-manipulation active:scale-95 transition-transform"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 sm:mr-3 h-4 w-4" />
              Uitloggen
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content with responsive design */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0 min-w-0">
        {/* Enhanced Top bar with responsive header */}
        <header className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-gray-100 touch-manipulation active:scale-95 transition-all"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
              </h2>
            </div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <NotificationBell />
            <span className="hidden sm:inline text-sm text-gray-500 truncate">
              Welkom, {currentUser?.displayName?.split(' ')[0] || 'User'}
            </span>
            {/* Mobile user indicator */}
            <div className="sm:hidden">
              <Avatar
                src={currentUser?.photoURL || ""}
                alt={currentUser?.displayName || "User"}
                fallback={currentUser?.displayName || "U"}
                size="sm"
              />
            </div>
          </div>
        </header>

        {/* Enhanced Content with responsive padding */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-gray-50">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Enhanced overlay with better mobile interaction */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          onTouchStart={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}