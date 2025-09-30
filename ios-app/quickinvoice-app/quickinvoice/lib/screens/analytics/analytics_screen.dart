import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../config/theme_config.dart';
import '../../services/auth_service.dart';
import '../../models/invoice_model.dart';
import '../../models/btw_model.dart';
import '../../models/client_model.dart';
import '../../models/user_model.dart';
import '../../widgets/common/app_drawer.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  int _selectedYear = DateTime.now().year;
  DateTime? _startDate;
  DateTime? _endDate;

  @override
  void initState() {
    super.initState();
    // Default to current year date range
    _startDate = DateTime(_selectedYear, 1, 1);
    _endDate = DateTime(_selectedYear, 12, 31);
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final userId = authService.currentUserId;

    if (userId == null) {
      return const Scaffold(
        body: Center(child: Text('Niet ingelogd')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics & BTW'),
        actions: [
          // Export button
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () => _showExportDialog(context),
            tooltip: 'Exporteren',
          ),
          // Year selector
          PopupMenuButton<int>(
            initialValue: _selectedYear,
            onSelected: (year) {
              setState(() {
                _selectedYear = year;
                _startDate = DateTime(year, 1, 1);
                _endDate = DateTime(year, 12, 31);
              });
            },
            itemBuilder: (context) {
              final currentYear = DateTime.now().year;
              return List.generate(5, (index) {
                final year = currentYear - index;
                return PopupMenuItem(
                  value: year,
                  child: Text(year.toString()),
                );
              });
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Text(
                    _selectedYear.toString(),
                    style: const TextStyle(fontSize: 16),
                  ),
                  const Icon(Icons.arrow_drop_down),
                ],
              ),
            ),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: StreamBuilder<QuerySnapshot>(
        stream: _firestore
            .collection('invoices')
            .where('userId', isEqualTo: userId)
            .snapshots(),
        builder: (context, invoiceSnapshot) {
          if (invoiceSnapshot.hasError) {
            return Center(
              child: Text('Fout: ${invoiceSnapshot.error}'),
            );
          }

          if (!invoiceSnapshot.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final invoices = invoiceSnapshot.data!.docs
              .map((doc) => InvoiceModel.fromFirestore(doc))
              .toList();

          return StreamBuilder<QuerySnapshot>(
            stream: _firestore
                .collection('business_expenses')
                .where('userId', isEqualTo: userId)
                .snapshots(),
            builder: (context, expenseSnapshot) {
              if (expenseSnapshot.hasError) {
                return Center(
                  child: Text('Fout: ${expenseSnapshot.error}'),
                );
              }

              if (!expenseSnapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }

              final expenses = expenseSnapshot.data!.docs
                  .map((doc) => BusinessExpense.fromFirestore(doc))
                  .toList();

              return StreamBuilder<QuerySnapshot>(
                stream: _firestore
                    .collection('clients')
                    .where('userId', isEqualTo: userId)
                    .snapshots(),
                builder: (context, clientSnapshot) {
                  if (!clientSnapshot.hasData) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  final clients = clientSnapshot.data!.docs
                      .map((doc) => ClientModel.fromFirestore(doc))
                      .toList();

                  return _buildAnalyticsContent(
                    context,
                    invoices,
                    expenses,
                    clients,
                  );
                },
              );
            },
          );
        },
      ),
    );
  }

  void _showExportDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Data Exporteren'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Kies een export formaat:'),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf, color: Colors.red),
              title: const Text('PDF'),
              subtitle: const Text('Exporteer als PDF document'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('PDF export komt binnenkort beschikbaar'),
                  ),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.table_chart, color: Colors.green),
              title: const Text('CSV'),
              subtitle: const Text('Exporteer als CSV bestand'),
              onTap: () {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('CSV export komt binnenkort beschikbaar'),
                  ),
                );
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Annuleren'),
          ),
        ],
      ),
    );
  }

  Future<void> _selectDateRange(BuildContext context) async {
    final now = DateTime.now();
    final defaultStart = _startDate ?? DateTime(_selectedYear, 1, 1);
    final defaultEnd = _endDate ?? DateTime(_selectedYear, 12, 31);

    // Ensure dates are not after today
    final safeStart = defaultStart.isAfter(now) ? DateTime(now.year, 1, 1) : defaultStart;
    final safeEnd = defaultEnd.isAfter(now) ? now : defaultEnd;

    final DateTimeRange? picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: now,
      initialDateRange: DateTimeRange(
        start: safeStart,
        end: safeEnd,
      ),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
    }
  }

  Widget _buildAnalyticsContent(
    BuildContext context,
    List<InvoiceModel> allInvoices,
    List<BusinessExpense> allExpenses,
    List<ClientModel> clients,
  ) {
    // Filter by date range
    final invoices = allInvoices.where((inv) {
      return inv.invoiceDate.isAfter(_startDate!.subtract(const Duration(days: 1))) &&
          inv.invoiceDate.isBefore(_endDate!.add(const Duration(days: 1)));
    }).toList();

    final expenses = allExpenses.where((exp) {
      return exp.date.isAfter(_startDate!.subtract(const Duration(days: 1))) &&
          exp.date.isBefore(_endDate!.add(const Duration(days: 1)));
    }).toList();

    // Calculate totals
    final totalRevenue = invoices
        .where((inv) => inv.status == InvoiceStatus.paid)
        .fold<double>(0, (acc, inv) => acc + inv.totalAmount);

    final totalExpenses =
        expenses.fold<double>(0, (acc, exp) => acc + exp.amount);

    final totalProfit = totalRevenue - totalExpenses;

    // Calculate profit margin percentage
    final profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    final totalBTWOwed = invoices
        .where((inv) => inv.status == InvoiceStatus.paid)
        .fold<double>(0, (acc, inv) => acc + inv.vatAmount);

    final totalBTWDeductible =
        expenses.fold<double>(0, (acc, exp) => acc + exp.vatAmount);

    final netBTW = totalBTWOwed - totalBTWDeductible;

    return RefreshIndicator(
      onRefresh: () async {
        setState(() {});
      },
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Date Range Selector
            _buildDateRangeSelector(context),
            const SizedBox(height: 16),

            // Overview Cards (with profit margin)
            _buildOverviewCards(
              totalRevenue,
              totalExpenses,
              totalProfit,
              profitMargin.toDouble(),
              netBTW,
            ),
            const SizedBox(height: 24),

            // Pie Charts Row
            Row(
              children: [
                Expanded(
                  child: _buildInvoiceStatusPieChart(invoices),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildExpenseBreakdownPieChart(expenses),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Revenue vs Expenses Chart
            _buildRevenueExpensesChart(invoices, expenses),
            const SizedBox(height: 24),

            // Monthly Breakdown
            _buildMonthlyBreakdown(invoices, expenses),
            const SizedBox(height: 24),

            // BTW Quarterly Overview
            _buildBTWQuarterlyOverview(invoices, expenses),
            const SizedBox(height: 24),

            // Top Clients
            _buildTopClients(invoices, clients),
            const SizedBox(height: 24),

            // Recent Transactions
            _buildRecentTransactions(invoices, expenses),
          ],
        ),
      ),
    );
  }

  Widget _buildDateRangeSelector(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy', 'nl_NL');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const Icon(Icons.date_range, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${dateFormat.format(_startDate!)} - ${dateFormat.format(_endDate!)}',
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
            ),
            TextButton.icon(
              onPressed: () => _selectDateRange(context),
              icon: const Icon(Icons.edit_calendar, size: 18),
              label: const Text('Wijzig'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInvoiceStatusPieChart(List<InvoiceModel> invoices) {
    // Count invoices by status
    final statusCounts = <InvoiceStatus, int>{};
    for (final invoice in invoices) {
      statusCounts[invoice.status] = (statusCounts[invoice.status] ?? 0) + 1;
    }

    if (statusCounts.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text(
                'Factuur Status',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              const Text('Geen data beschikbaar'),
            ],
          ),
        ),
      );
    }

    final sections = [
      if (statusCounts[InvoiceStatus.paid] != null)
        PieChartSectionData(
          value: statusCounts[InvoiceStatus.paid]!.toDouble(),
          title: '${statusCounts[InvoiceStatus.paid]}',
          color: ThemeConfig.successColor,
          radius: 50,
          titleStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      if (statusCounts[InvoiceStatus.pending] != null)
        PieChartSectionData(
          value: statusCounts[InvoiceStatus.pending]!.toDouble(),
          title: '${statusCounts[InvoiceStatus.pending]}',
          color: ThemeConfig.warningColor,
          radius: 50,
          titleStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      if (statusCounts[InvoiceStatus.overdue] != null)
        PieChartSectionData(
          value: statusCounts[InvoiceStatus.overdue]!.toDouble(),
          title: '${statusCounts[InvoiceStatus.overdue]}',
          color: ThemeConfig.errorColor,
          radius: 50,
          titleStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      if (statusCounts[InvoiceStatus.draft] != null)
        PieChartSectionData(
          value: statusCounts[InvoiceStatus.draft]!.toDouble(),
          title: '${statusCounts[InvoiceStatus.draft]}',
          color: Colors.grey,
          radius: 50,
          titleStyle: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              'Factuur Status',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 150,
              child: PieChart(
                PieChartData(
                  sections: sections,
                  sectionsSpace: 2,
                  centerSpaceRadius: 30,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: [
                if (statusCounts[InvoiceStatus.paid] != null)
                  _buildLegendItem('Betaald', ThemeConfig.successColor),
                if (statusCounts[InvoiceStatus.pending] != null)
                  _buildLegendItem('In afwachting', ThemeConfig.warningColor),
                if (statusCounts[InvoiceStatus.overdue] != null)
                  _buildLegendItem('Verlopen', ThemeConfig.errorColor),
                if (statusCounts[InvoiceStatus.draft] != null)
                  _buildLegendItem('Concept', Colors.grey),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpenseBreakdownPieChart(List<BusinessExpense> expenses) {
    // Sum expenses by category
    final categoryTotals = <String, double>{};
    for (final expense in expenses) {
      final category = _getCategoryName(expense.category);
      categoryTotals[category] = (categoryTotals[category] ?? 0) + expense.amount;
    }

    if (categoryTotals.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text(
                'Kosten per Categorie',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
              const Text('Geen data beschikbaar'),
            ],
          ),
        ),
      );
    }

    final colors = [
      const Color(0xFF2196F3),
      const Color(0xFF4CAF50),
      const Color(0xFFFF9800),
      const Color(0xFF9C27B0),
      const Color(0xFFE91E63),
      const Color(0xFF00BCD4),
    ];

    final sections = categoryTotals.entries.toList().asMap().entries.map((entry) {
      final index = entry.key;
      final mapEntry = entry.value;
      final total = categoryTotals.values.fold<double>(0, (sum, val) => sum + val);
      final percentage = (mapEntry.value / total * 100).toInt();

      return PieChartSectionData(
        value: mapEntry.value,
        title: '$percentage%',
        color: colors[index % colors.length],
        radius: 50,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(
              'Kosten per Categorie',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 150,
              child: PieChart(
                PieChartData(
                  sections: sections,
                  sectionsSpace: 2,
                  centerSpaceRadius: 30,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              children: categoryTotals.entries.toList().asMap().entries.map((entry) {
                final index = entry.key;
                final mapEntry = entry.value;
                return _buildLegendItem(mapEntry.key, colors[index % colors.length]);
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  String _getCategoryName(ExpenseCategory category) {
    final categoryMap = <ExpenseCategory, String>{
      ExpenseCategory.equipment: 'Apparatuur',
      ExpenseCategory.software: 'Software',
      ExpenseCategory.office: 'Kantoor',
      ExpenseCategory.travel: 'Reizen',
      ExpenseCategory.training: 'Training',
      ExpenseCategory.other: 'Overig',
    };
    return categoryMap[category] ?? 'Overig';









  }

  Widget _buildOverviewCards(
    double revenue,
    double expenses,
    double profit,
    double profitMargin,
    double btw,
  ) {
    return Column(
      children: [
        // First row
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                'Totale Omzet',
                NumberFormat.currency(symbol: '€', decimalDigits: 2)
                    .format(revenue),
                Icons.trending_up,
                ThemeConfig.successColor,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildStatCard(
                'Totale Kosten',
                NumberFormat.currency(symbol: '€', decimalDigits: 2)
                    .format(expenses),
                Icons.trending_down,
                ThemeConfig.errorColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Second row
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                'Netto Winst',
                NumberFormat.currency(symbol: '€', decimalDigits: 2)
                    .format(profit),
                Icons.account_balance_wallet,
                profit >= 0 ? ThemeConfig.successColor : ThemeConfig.errorColor,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: _buildStatCard(
                'Winstmarge',
                '${profitMargin.toStringAsFixed(1)}%',
                Icons.percent,
                profitMargin >= 0
                    ? ThemeConfig.successColor
                    : ThemeConfig.errorColor,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        // Third row
        _buildStatCard(
          'BTW Te Betalen',
          NumberFormat.currency(symbol: '€', decimalDigits: 2).format(btw),
          Icons.receipt,
          ThemeConfig.warningColor,
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    label,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                Icon(icon, color: color, size: 20),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.bold,
                  ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRevenueExpensesChart(
    List<InvoiceModel> invoices,
    List<BusinessExpense> expenses,
  ) {
    // Calculate monthly data for the selected date range
    final months = <int>[];
    var currentDate = DateTime(_startDate!.year, _startDate!.month);
    while (currentDate.isBefore(_endDate!) ||
        currentDate.month == _endDate!.month) {
      months.add(currentDate.month);
      currentDate = DateTime(currentDate.year, currentDate.month + 1);
    }

    final monthlyRevenue = months.map((month) {
      return invoices
          .where((inv) =>
              inv.status == InvoiceStatus.paid &&
              inv.paidAt?.month == month &&
              inv.paidAt?.year == _selectedYear)
          .fold<double>(0, (acc, inv) => acc + inv.totalAmount);
    }).toList();

    final monthlyExpenses = months.map((month) {
      return expenses
          .where((exp) => exp.date.month == month && exp.date.year == _selectedYear)
          .fold<double>(0, (acc, exp) => acc + exp.amount);
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Omzet vs Kosten',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 250,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: _calculateMaxY(monthlyRevenue, monthlyExpenses),
                  barTouchData: BarTouchData(
                    enabled: true,
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipItem: (group, groupIndex, rod, rodIndex) {
                        final month = _getMonthName(months[groupIndex]);
                        final value = NumberFormat.currency(
                          symbol: '€',
                          decimalDigits: 0,
                        ).format(rod.toY);
                        return BarTooltipItem(
                          '$month\n$value',
                          const TextStyle(color: Colors.white),
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
                          if (value.toInt() >= months.length) return const Text('');
                          return Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              _getMonthAbbr(months[value.toInt()]),
                              style: const TextStyle(fontSize: 10),
                            ),
                          );
                        },
                      ),
                    ),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 50,
                        getTitlesWidget: (value, meta) {
                          if (value == 0) return const Text('€0');
                          return Text(
                            '€${(value / 1000).toStringAsFixed(0)}k',
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
                    horizontalInterval: _calculateMaxY(
                          monthlyRevenue,
                          monthlyExpenses,
                        ) /
                        5,
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: List.generate(months.length, (index) {
                    return BarChartGroupData(
                      x: index,
                      barRods: [
                        BarChartRodData(
                          toY: monthlyRevenue[index],
                          color: ThemeConfig.successColor,
                          width: 8,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(4),
                          ),
                        ),
                        BarChartRodData(
                          toY: monthlyExpenses[index],
                          color: ThemeConfig.errorColor,
                          width: 8,
                          borderRadius: const BorderRadius.vertical(
                            top: Radius.circular(4),
                          ),
                        ),
                      ],
                    );
                  }),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildLegendItem('Omzet', ThemeConfig.successColor),
                const SizedBox(width: 24),
                _buildLegendItem('Kosten', ThemeConfig.errorColor),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }

  Widget _buildMonthlyBreakdown(
    List<InvoiceModel> invoices,
    List<BusinessExpense> expenses,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Maandelijkse Overzicht',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...List.generate(12, (index) {
              final month = index + 1;
              final revenue = invoices
                  .where((inv) =>
                      inv.status == InvoiceStatus.paid &&
                      inv.paidAt?.month == month &&
                      inv.paidAt?.year == _selectedYear)
                  .fold<double>(0, (acc, inv) => acc + inv.totalAmount);

              final expense = expenses
                  .where((exp) => exp.date.month == month && exp.date.year == _selectedYear)
                  .fold<double>(0, (acc, exp) => acc + exp.amount);

              final profit = revenue - expense;

              if (revenue == 0 && expense == 0) return const SizedBox.shrink();

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    SizedBox(
                      width: 80,
                      child: Text(
                        _getMonthName(month),
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ),
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            NumberFormat.currency(symbol: '€', decimalDigits: 0)
                                .format(revenue),
                            style: const TextStyle(
                              color: ThemeConfig.successColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            NumberFormat.currency(symbol: '€', decimalDigits: 0)
                                .format(expense),
                            style: const TextStyle(
                              color: ThemeConfig.errorColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            NumberFormat.currency(symbol: '€', decimalDigits: 0)
                                .format(profit),
                            style: TextStyle(
                              color: profit >= 0
                                  ? ThemeConfig.successColor
                                  : ThemeConfig.errorColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildBTWQuarterlyOverview(
    List<InvoiceModel> invoices,
    List<BusinessExpense> expenses,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'BTW Kwartaaloverzicht',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.8,
              children: List.generate(4, (index) {
                final quarter = index + 1;
                final startMonth = (quarter - 1) * 3 + 1;
                final endMonth = quarter * 3;

                final btwCharged = invoices
                    .where((inv) =>
                        inv.status == InvoiceStatus.paid &&
                        inv.paidAt != null &&
                        inv.paidAt!.year == _selectedYear &&
                        inv.paidAt!.month >= startMonth &&
                        inv.paidAt!.month <= endMonth)
                    .fold<double>(0, (acc, inv) => acc + inv.vatAmount);

                final btwDeductible = expenses
                    .where((exp) =>
                        exp.date.year == _selectedYear &&
                        exp.date.month >= startMonth &&
                        exp.date.month <= endMonth)
                    .fold<double>(0, (acc, exp) => acc + exp.vatAmount);

                final netBTW = btwCharged - btwDeductible;

                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: ThemeConfig.bgSecondary,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: ThemeConfig.borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Q$quarter $_selectedYear',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      Text(
                        NumberFormat.currency(symbol: '€', decimalDigits: 2)
                            .format(netBTW),
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  color: ThemeConfig.warningColor,
                                  fontWeight: FontWeight.bold,
                                ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopClients(
    List<InvoiceModel> invoices,
    List<ClientModel> clients,
  ) {
    // Calculate revenue per client
    final clientRevenue = <String, double>{};
    for (final invoice in invoices) {
      if (invoice.status == InvoiceStatus.paid) {
        clientRevenue[invoice.clientId] =
            (clientRevenue[invoice.clientId] ?? 0) + invoice.totalAmount;
      }
    }

    // Sort by revenue
    final sortedClients = clientRevenue.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    // Take top 5
    final topClients = sortedClients.take(5).toList();

    if (topClients.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Top Klanten',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...topClients.map((entry) {
              final client = clients.firstWhere(
                (c) => c.id == entry.key,
                orElse: () => ClientModel(
                  id: entry.key,
                  userId: '',
                  firstName: 'Onbekend',
                  lastName: '',
                  email: '',
                  address: Address(
                    street: '',
                    city: '',
                    postalCode: '',
                    country: '',
                  ),
                  createdAt: DateTime.now(),
                  updatedAt: DateTime.now(),
                ),
              );

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        client.fullName,
                        style: Theme.of(context).textTheme.bodyMedium,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      NumberFormat.currency(symbol: '€', decimalDigits: 2)
                          .format(entry.value),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: ThemeConfig.successColor,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentTransactions(
    List<InvoiceModel> invoices,
    List<BusinessExpense> expenses,
  ) {
    // Combine and sort by date
    final transactions = <Map<String, dynamic>>[];

    for (final invoice in invoices) {
      if (invoice.status == InvoiceStatus.paid && invoice.paidAt != null) {
        transactions.add({
          'type': 'income',
          'date': invoice.paidAt!,
          'description': 'Factuur ${invoice.invoiceNumber}',
          'amount': invoice.totalAmount,
        });
      }
    }

    for (final expense in expenses) {
      transactions.add({
        'type': 'expense',
        'date': expense.date,
        'description': expense.description,
        'amount': expense.amount,
      });
    }

    transactions.sort((a, b) => (b['date'] as DateTime).compareTo(a['date']));

    final recentTransactions = transactions.take(10).toList();

    if (recentTransactions.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Recente Transacties',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...recentTransactions.map((transaction) {
              final isIncome = transaction['type'] == 'income';
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: isIncome
                            ? ThemeConfig.successColor.withValues(alpha: 0.1)
                            : ThemeConfig.errorColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        isIncome ? Icons.arrow_upward : Icons.arrow_downward,
                        color: isIncome
                            ? ThemeConfig.successColor
                            : ThemeConfig.errorColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            transaction['description'],
                            style: Theme.of(context).textTheme.bodyMedium,
                            overflow: TextOverflow.ellipsis,
                          ),
                          Text(
                            DateFormat('dd MMM yyyy', 'nl_NL')
                                .format(transaction['date']),
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${isIncome ? '+' : '-'}${NumberFormat.currency(symbol: '€', decimalDigits: 2).format(transaction['amount'])}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: isIncome
                            ? ThemeConfig.successColor
                            : ThemeConfig.errorColor,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  double _calculateMaxY(List<double> revenue, List<double> expenses) {
    final maxRevenue = revenue.isEmpty ? 0 : revenue.reduce((a, b) => a > b ? a : b);
    final maxExpense = expenses.isEmpty ? 0 : expenses.reduce((a, b) => a > b ? a : b);
    final max = maxRevenue > maxExpense ? maxRevenue : maxExpense;
    return max == 0 ? 1000 : (max * 1.2);
  }

  String _getMonthName(int month) {
    const months = [
      'Januari',
      'Februari',
      'Maart',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Augustus',
      'September',
      'Oktober',
      'November',
      'December'
    ];
    return months[month - 1];
  }

  String _getMonthAbbr(int month) {
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
    return months[month - 1];
  }
}