import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../../config/theme_config.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: ThemeConfig.primaryColor,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: Colors.white,
                  backgroundImage: authService.currentUser?.photoURL != null
                      ? NetworkImage(authService.currentUser!.photoURL!)
                      : null,
                  child: authService.currentUser?.photoURL == null
                      ? Text(
                          (authService.currentUser?.displayName ?? 'U')[0]
                              .toUpperCase(),
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: ThemeConfig.primaryColor,
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: 12),
                Text(
                  authService.currentUser?.displayName ?? 'Gebruiker',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  authService.currentUser?.email ?? '',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ),
          _DrawerTile(
            icon: Icons.dashboard_outlined,
            title: 'Dashboard',
            onTap: () {
              Navigator.pop(context);
              context.go('/dashboard');
            },
          ),
          _DrawerTile(
            icon: Icons.people_outline,
            title: 'Klanten',
            onTap: () {
              Navigator.pop(context);
              context.go('/clients');
            },
          ),
          _DrawerTile(
            icon: Icons.inventory_2_outlined,
            title: 'Producten',
            onTap: () {
              Navigator.pop(context);
              context.go('/products');
            },
          ),
          _DrawerTile(
            icon: Icons.receipt_long_outlined,
            title: 'Facturen',
            onTap: () {
              Navigator.pop(context);
              context.go('/invoices');
            },
          ),
          _DrawerTile(
            icon: Icons.bar_chart_outlined,
            title: 'Analytics',
            onTap: () {
              Navigator.pop(context);
              context.go('/analytics');
            },
          ),
          _DrawerTile(
            icon: Icons.account_balance_wallet_outlined,
            title: 'BTW & Kosten',
            onTap: () {
              Navigator.pop(context);
              context.go('/btw');
            },
          ),
          const Divider(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'INSTELLINGEN',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: ThemeConfig.textSecondary,
              ),
            ),
          ),
          _DrawerTile(
            icon: Icons.settings_outlined,
            title: 'Algemeen',
            onTap: () {
              Navigator.pop(context);
              context.go('/settings');
            },
          ),
          _DrawerTile(
            icon: Icons.email_outlined,
            title: 'Email Templates',
            onTap: () {
              Navigator.pop(context);
              context.go('/email-templates');
            },
          ),
          _DrawerTile(
            icon: Icons.payment_outlined,
            title: 'Betalingsinstellingen',
            onTap: () {
              Navigator.pop(context);
              context.go('/payment-settings');
            },
          ),
          const Divider(),
          _DrawerTile(
            icon: Icons.logout_outlined,
            title: 'Uitloggen',
            onTap: () async {
              await authService.signOut();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _DrawerTile({
    required this.icon,
    required this.title,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      onTap: onTap,
    );
  }
}