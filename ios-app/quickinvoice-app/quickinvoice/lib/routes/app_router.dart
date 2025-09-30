import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/clients/clients_screen.dart';
import '../screens/products/products_screen.dart';
import '../screens/invoices/invoices_screen.dart';
import '../screens/analytics/analytics_screen.dart';
import '../screens/settings/settings_screen.dart';
import '../screens/btw/btw_screen.dart';
import '../screens/settings/email_templates_screen.dart';
import '../screens/settings/payment_settings_screen.dart';

class AppRouter {
  static final GoRouter router = GoRouter(
    initialLocation: '/',
    redirect: (BuildContext context, GoRouterState state) {
      try {
        final user = FirebaseAuth.instance.currentUser;
        final isLoggedIn = user != null;

        final isLoggingIn = state.matchedLocation == '/login';
        final isRegistering = state.matchedLocation == '/register';
        final isAuthRoute = isLoggingIn || isRegistering;

        // If not logged in and not on auth route, redirect to login
        if (!isLoggedIn && !isAuthRoute) {
          return '/login';
        }

        // If logged in and on auth route, redirect to dashboard
        if (isLoggedIn && isAuthRoute) {
          return '/dashboard';
        }

        // Otherwise, continue to the requested route
        return null;
      } catch (e) {
        // If Firebase isn't ready yet, default to login page
        print('Router redirect error: $e');
        return state.matchedLocation == '/login' ? null : '/login';
      }
    },
    routes: [
      GoRoute(
        path: '/',
        redirect: (context, state) => '/dashboard',
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: '/clients',
        builder: (context, state) => const ClientsScreen(),
      ),
      GoRoute(
        path: '/products',
        builder: (context, state) => const ProductsScreen(),
      ),
      GoRoute(
        path: '/invoices',
        builder: (context, state) => const InvoicesScreen(),
      ),
      GoRoute(
        path: '/analytics',
        builder: (context, state) => const AnalyticsScreen(),
      ),
      GoRoute(
        path: '/btw',
        builder: (context, state) => const BTWScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
      GoRoute(
        path: '/email-templates',
        builder: (context, state) => const EmailTemplatesScreen(),
      ),
      GoRoute(
        path: '/payment-settings',
        builder: (context, state) => const PaymentSettingsScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('404 - Pagina niet gevonden'),
      ),
    ),
  );
}