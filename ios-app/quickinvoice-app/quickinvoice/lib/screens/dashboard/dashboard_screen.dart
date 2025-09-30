import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../models/client_model.dart';
import '../../models/product_model.dart';
import '../../models/invoice_model.dart';
import '../../config/theme_config.dart';
import '../../widgets/common/app_drawer.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final firestoreService = context.read<FirestoreService>();
    final userId = authService.currentUserId;

    if (userId == null) {
      return const Scaffold(
        body: Center(child: Text('Niet ingelogd')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {},
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Welcome Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welkom terug!',
                      style: Theme.of(context).textTheme.headlineMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      authService.currentUser?.displayName ?? 'Gebruiker',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      DateFormat('EEEE d MMMM yyyy', 'nl_NL').format(DateTime.now()),
                      style: TextStyle(
                        color: ThemeConfig.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Quick Stats
            Text(
              'Overzicht',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            _StatsGrid(userId: userId),

            const SizedBox(height: 24),

            // Monthly Revenue Chart
            Text(
              'Omzet per maand',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            _MonthlyRevenueChart(userId: userId),

            const SizedBox(height: 24),

            // Recent Invoices
            Text(
              'Recente facturen',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            _RecentInvoices(userId: userId),

            const SizedBox(height: 24),

            // Quick Actions
            Text(
              'Snelle acties',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 16),
            _QuickActions(),

            const SizedBox(height: 80), // Space for FAB
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/invoices'),
        icon: const Icon(Icons.add),
        label: const Text('Nieuwe Factuur'),
      ),
    );
  }
}

class _StatsGrid extends StatelessWidget {
  final String userId;

  const _StatsGrid({required this.userId});

  @override
  Widget build(BuildContext context) {
    final firestoreService = context.read<FirestoreService>();

    return StreamBuilder<List<ClientModel>>(
      stream: firestoreService.streamClients(userId),
      builder: (context, clientSnapshot) {
        return StreamBuilder<List<ProductModel>>(
          stream: firestoreService.streamProducts(userId),
          builder: (context, productSnapshot) {
            return StreamBuilder<List<InvoiceModel>>(
              stream: firestoreService.streamInvoices(userId),
              builder: (context, invoiceSnapshot) {
                final clients = clientSnapshot.data ?? [];
                final products = productSnapshot.data ?? [];
                final invoices = invoiceSnapshot.data ?? [];

                final totalRevenue = invoices
                    .where((inv) => inv.status == InvoiceStatus.paid)
                    .fold(0.0, (sum, inv) => sum + inv.totalAmount);

                final paidInvoices = invoices
                    .where((inv) => inv.status == InvoiceStatus.paid)
                    .length;

                return Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            title: 'Klanten',
                            value: '${clients.length}',
                            icon: Icons.people_outline,
                            color: ThemeConfig.primaryColor,
                            onTap: () => context.go('/clients'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatCard(
                            title: 'Facturen',
                            value: '${invoices.length}',
                            subtitle: '$paidInvoices betaald',
                            icon: Icons.receipt_long_outlined,
                            color: ThemeConfig.secondaryColor,
                            onTap: () => context.go('/invoices'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: _StatCard(
                            title: 'Producten',
                            value: '${products.length}',
                            icon: Icons.inventory_2_outlined,
                            color: ThemeConfig.accentColor,
                            onTap: () => context.go('/products'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _StatCard(
                            title: 'Omzet',
                            value: NumberFormat.compactCurrency(
                              locale: 'nl_NL',
                              symbol: '€',
                              decimalDigits: 0,
                            ).format(totalRevenue),
                            subtitle: 'Betaald',
                            icon: Icons.euro_outlined,
                            color: ThemeConfig.successColor,
                            onTap: () => context.go('/analytics'),
                          ),
                        ),
                      ],
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String? subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _StatCard({
    required this.title,
    required this.value,
    this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 32),
              const SizedBox(height: 12),
              Text(
                title,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle!,
                  style: TextStyle(
                    fontSize: 12,
                    color: ThemeConfig.textSecondary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _MonthlyRevenueChart extends StatelessWidget {
  final String userId;

  const _MonthlyRevenueChart({required this.userId});

  @override
  Widget build(BuildContext context) {
    final firestoreService = context.read<FirestoreService>();

    return StreamBuilder<List<InvoiceModel>>(
      stream: firestoreService.streamInvoices(userId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Card(
            child: SizedBox(
              height: 250,
              child: Center(child: CircularProgressIndicator()),
            ),
          );
        }

        final invoices = snapshot.data ?? [];

        if (invoices.isEmpty) {
          return Card(
            child: Container(
              height: 250,
              padding: const EdgeInsets.all(32),
              child: Center(
                child: Text(
                  'Nog geen omzetgegevens',
                  style: TextStyle(color: ThemeConfig.textSecondary),
                ),
              ),
            ),
          );
        }

        // Calculate last 6 months revenue
        final now = DateTime.now();
        final monthlyData = <int, double>{};

        for (int i = 5; i >= 0; i--) {
          final month = DateTime(now.year, now.month - i, 1);
          final monthKey = month.month;
          monthlyData[monthKey] = 0;
        }

        for (final invoice in invoices) {
          if (invoice.status == InvoiceStatus.paid) {
            final monthKey = invoice.paidAt?.month ?? invoice.invoiceDate.month;
            final year = invoice.paidAt?.year ?? invoice.invoiceDate.year;

            if (year == now.year && monthlyData.containsKey(monthKey)) {
              monthlyData[monthKey] = monthlyData[monthKey]! + invoice.totalAmount;
            }
          }
        }

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: SizedBox(
              height: 250,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: monthlyData.values.isEmpty
                      ? 100
                      : monthlyData.values.reduce((a, b) => a > b ? a : b) * 1.2,
                  barTouchData: BarTouchData(
                    enabled: true,
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        return BarTooltipItem(
                          NumberFormat.currency(locale: 'nl_NL', symbol: '€')
                              .format(rod.toY),
                          const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        );
                      },
                    ),
                  ),
                  titlesData: FlTitlesData(
                    show: true,
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const months = [
                            'Jan',
                            'Feb',
                            'Mrt',
                            'Apr',
                            'Mei',
                            'Jun',
                            'Jul',
                            'Aug',
                            'Sep',
                            'Okt',
                            'Nov',
                            'Dec'
                          ];
                          final monthIndex = value.toInt();
                          if (monthIndex >= 1 && monthIndex <= 12) {
                            return Text(
                              months[monthIndex - 1],
                              style: const TextStyle(fontSize: 12),
                            );
                          }
                          return const Text('');
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 40,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            NumberFormat.compactCurrency(
                              locale: 'nl_NL',
                              symbol: '€',
                              decimalDigits: 0,
                            ).format(value),
                            style: const TextStyle(fontSize: 10),
                          );
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    horizontalInterval: () {
                      if (monthlyData.values.isEmpty) return 100.0;
                      final maxValue = monthlyData.values.reduce((a, b) => a > b ? a : b);
                      if (maxValue == 0) return 100.0;
                      return (maxValue * 1.2) / 5;
                    }(),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: monthlyData.entries
                      .map(
                        (entry) => BarChartGroupData(
                          x: entry.key,
                          barRods: [
                            BarChartRodData(
                              toY: entry.value,
                              color: ThemeConfig.primaryColor,
                              width: 20,
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(6),
                              ),
                            ),
                          ],
                        ),
                      )
                      .toList(),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _RecentInvoices extends StatelessWidget {
  final String userId;

  const _RecentInvoices({required this.userId});

  @override
  Widget build(BuildContext context) {
    final firestoreService = context.read<FirestoreService>();

    return StreamBuilder<List<InvoiceModel>>(
      stream: firestoreService.streamInvoices(userId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            ),
          );
        }

        final invoices = snapshot.data ?? [];

        if (invoices.isEmpty) {
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Center(
                child: Text(
                  'Nog geen facturen',
                  style: TextStyle(color: ThemeConfig.textSecondary),
                ),
              ),
            ),
          );
        }

        // Take last 5 invoices
        final recentInvoices = invoices.take(5).toList();
        final currencyFormat = NumberFormat.currency(locale: 'nl_NL', symbol: '€');
        final dateFormat = DateFormat('dd MMM', 'nl_NL');

        return Card(
          child: Column(
            children: recentInvoices.map((invoice) {
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: _getStatusColor(invoice.status).withOpacity(0.1),
                  child: Icon(
                    Icons.receipt,
                    color: _getStatusColor(invoice.status),
                    size: 20,
                  ),
                ),
                title: Text(invoice.invoiceNumber),
                subtitle: Text(dateFormat.format(invoice.invoiceDate)),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      currencyFormat.format(invoice.totalAmount),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    _StatusBadge(status: invoice.status),
                  ],
                ),
                onTap: () => context.go('/invoices'),
              );
            }).toList(),
          ),
        );
      },
    );
  }

  Color _getStatusColor(InvoiceStatus status) {
    switch (status) {
      case InvoiceStatus.draft:
        return Colors.grey;
      case InvoiceStatus.sent:
        return Colors.blue;
      case InvoiceStatus.pending:
        return ThemeConfig.warningColor;
      case InvoiceStatus.paid:
        return ThemeConfig.successColor;
      case InvoiceStatus.overdue:
        return Colors.red;
      case InvoiceStatus.cancelled:
        return ThemeConfig.textSecondary;
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final InvoiceStatus status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (status) {
      case InvoiceStatus.draft:
        color = Colors.grey;
        label = 'Concept';
        break;
      case InvoiceStatus.sent:
        color = Colors.blue;
        label = 'Verzonden';
        break;
      case InvoiceStatus.pending:
        color = ThemeConfig.warningColor;
        label = 'In behandeling';
        break;
      case InvoiceStatus.paid:
        color = ThemeConfig.successColor;
        label = 'Betaald';
        break;
      case InvoiceStatus.overdue:
        color = Colors.red;
        label = 'Verlopen';
        break;
      case InvoiceStatus.cancelled:
        color = ThemeConfig.textSecondary;
        label = 'Geannuleerd';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _ActionCard(
            icon: Icons.person_add,
            label: 'Nieuwe Klant',
            color: ThemeConfig.primaryColor,
            onTap: () => context.go('/clients'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ActionCard(
            icon: Icons.inventory_2,
            label: 'Nieuw Product',
            color: ThemeConfig.accentColor,
            onTap: () => context.go('/products'),
          ),
        ),
      ],
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
          child: Column(
            children: [
              Icon(icon, color: color, size: 32),
              const SizedBox(height: 8),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}