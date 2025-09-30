import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../config/theme_config.dart';
import '../../services/auth_service.dart';
import '../../models/btw_model.dart';
import '../../widgets/common/app_drawer.dart';

class BTWScreen extends StatefulWidget {
  const BTWScreen({super.key});

  @override
  State<BTWScreen> createState() => _BTWScreenState();
}

class _BTWScreenState extends State<BTWScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  ExpenseCategory? _categoryFilter;
  int _selectedYear = DateTime.now().year;

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
        title: const Text('BTW & Kosten'),
        actions: [
          if (_categoryFilter != null)
            IconButton(
              icon: const Icon(Icons.filter_alt_off),
              onPressed: () => setState(() => _categoryFilter = null),
              tooltip: 'Filter wissen',
            ),
          PopupMenuButton<ExpenseCategory>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter op categorie',
            onSelected: (category) => setState(() => _categoryFilter = category),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: ExpenseCategory.equipment,
                child: Text('Apparatuur'),
              ),
              const PopupMenuItem(
                value: ExpenseCategory.software,
                child: Text('Software'),
              ),
              const PopupMenuItem(
                value: ExpenseCategory.office,
                child: Text('Kantoor'),
              ),
              const PopupMenuItem(
                value: ExpenseCategory.travel,
                child: Text('Reizen'),
              ),
              const PopupMenuItem(
                value: ExpenseCategory.training,
                child: Text('Training'),
              ),
              const PopupMenuItem(
                value: ExpenseCategory.other,
                child: Text('Overig'),
              ),
            ],
          ),
          PopupMenuButton<int>(
            initialValue: _selectedYear,
            onSelected: (year) => setState(() => _selectedYear = year),
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
            .collection('business_expenses')
            .where('userId', isEqualTo: userId)
            .snapshots(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Fout: ${snapshot.error}'));
          }

          final expenses = snapshot.data?.docs
                  .map((doc) => BusinessExpense.fromFirestore(doc))
                  .toList() ??
              [];

          // Apply filters
          final filteredExpenses = expenses.where((expense) {
            final matchesCategory =
                _categoryFilter == null || expense.category == _categoryFilter;
            final matchesYear = expense.date.year == _selectedYear;
            return matchesCategory && matchesYear;
          }).toList();

          return Column(
            children: [
              // BTW Quarterly Overview
              _buildBTWQuarterlyOverview(expenses),
              const Divider(height: 1),

              // Expenses List
              Expanded(
                child: filteredExpenses.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.receipt_long_outlined,
                              size: 64,
                              color: Colors.grey[400],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Geen zakelijke kosten',
                              style: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.copyWith(
                                    color: ThemeConfig.textSecondary,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Voeg je eerste kost toe',
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyMedium
                                  ?.copyWith(
                                    color: ThemeConfig.textSecondary,
                                  ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: filteredExpenses.length,
                        itemBuilder: (context, index) {
                          final expense = filteredExpenses[index];
                          return _ExpenseCard(
                            expense: expense,
                            onEdit: () => _showExpenseForm(
                              context,
                              expense: expense,
                            ),
                            onDelete: () => _deleteExpense(context, expense),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showExpenseForm(context),
        icon: const Icon(Icons.add),
        label: const Text('Nieuwe Kost'),
      ),
    );
  }

  Widget _buildBTWQuarterlyOverview(List<BusinessExpense> expenses) {
    // Filter expenses by selected year
    final yearExpenses = expenses.where((e) => e.date.year == _selectedYear).toList();

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'BTW Kwartaaloverzicht $_selectedYear',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: List.generate(4, (index) {
                final quarter = index + 1;
                final startMonth = (quarter - 1) * 3 + 1;
                final endMonth = quarter * 3;

                final quarterExpenses = yearExpenses
                    .where((exp) =>
                        exp.date.month >= startMonth &&
                        exp.date.month <= endMonth)
                    .toList();

                final totalAmount =
                    quarterExpenses.fold<double>(0, (acc, exp) => acc + exp.amount);
                final totalVAT =
                    quarterExpenses.fold<double>(0, (acc, exp) => acc + exp.vatAmount);

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
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Q$quarter',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          Text(
                            '${quarterExpenses.length}',
                            style: TextStyle(
                              fontSize: 12,
                              color: ThemeConfig.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            NumberFormat.currency(symbol: '€', decimalDigits: 2)
                                .format(totalAmount),
                            style: Theme.of(context)
                                .textTheme
                                .titleLarge
                                ?.copyWith(
                                  color: ThemeConfig.errorColor,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          Text(
                            'BTW: ${NumberFormat.currency(symbol: '€', decimalDigits: 2).format(totalVAT)}',
                            style: TextStyle(
                              fontSize: 11,
                              color: ThemeConfig.textSecondary,
                            ),
                          ),
                        ],
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

  void _showExpenseForm(BuildContext context, {BusinessExpense? expense}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ExpenseFormSheet(expense: expense),
    );
  }

  Future<void> _deleteExpense(
    BuildContext context,
    BusinessExpense expense,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Kost verwijderen'),
        content: Text(
          'Weet je zeker dat je deze kost wilt verwijderen?\n\n${expense.description}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuleren'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Verwijderen'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      try {
        await _firestore.collection('business_expenses').doc(expense.id).delete();
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Kost verwijderd'),
              backgroundColor: ThemeConfig.successColor,
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Fout: $e'),
              backgroundColor: ThemeConfig.errorColor,
            ),
          );
        }
      }
    }
  }
}

class _ExpenseCard extends StatelessWidget {
  final BusinessExpense expense;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _ExpenseCard({
    required this.expense,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'nl_NL', symbol: '€');
    final dateFormat = DateFormat('dd MMM yyyy', 'nl_NL');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: _getCategoryColor(expense.category).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    _getCategoryIcon(expense.category),
                    color: _getCategoryColor(expense.category),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        expense.description,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            _getCategoryLabel(expense.category),
                            style: TextStyle(
                              fontSize: 12,
                              color: ThemeConfig.textSecondary,
                            ),
                          ),
                          const Text(' • '),
                          Text(
                            dateFormat.format(expense.date),
                            style: TextStyle(
                              fontSize: 12,
                              color: ThemeConfig.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      currencyFormat.format(expense.amount),
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: ThemeConfig.errorColor,
                      ),
                    ),
                    Text(
                      'BTW: ${currencyFormat.format(expense.vatAmount)}',
                      style: TextStyle(
                        fontSize: 11,
                        color: ThemeConfig.textSecondary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 8),
                PopupMenuButton<String>(
                  icon: const Icon(Icons.more_vert),
                  onSelected: (value) {
                    if (value == 'edit') {
                      onEdit();
                    } else if (value == 'delete') {
                      onDelete();
                    }
                  },
                  itemBuilder: (context) => [
                    const PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(Icons.edit, size: 20),
                          SizedBox(width: 8),
                          Text('Bewerken'),
                        ],
                      ),
                    ),
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete, size: 20, color: Colors.red),
                          SizedBox(width: 8),
                          Text(
                            'Verwijderen',
                            style: TextStyle(color: Colors.red),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            if (expense.isRecurring) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: ThemeConfig.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.repeat,
                      size: 14,
                      color: ThemeConfig.primaryColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Terugkerend: ${expense.recurringFrequency ?? ""}',
                      style: const TextStyle(
                        fontSize: 12,
                        color: ThemeConfig.primaryColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  IconData _getCategoryIcon(ExpenseCategory category) {
    switch (category) {
      case ExpenseCategory.equipment:
        return Icons.devices;
      case ExpenseCategory.software:
        return Icons.code;
      case ExpenseCategory.office:
        return Icons.business;
      case ExpenseCategory.travel:
        return Icons.flight;
      case ExpenseCategory.training:
        return Icons.school;
      case ExpenseCategory.other:
        return Icons.more_horiz;
    }
  }

  Color _getCategoryColor(ExpenseCategory category) {
    switch (category) {
      case ExpenseCategory.equipment:
        return Colors.purple;
      case ExpenseCategory.software:
        return Colors.blue;
      case ExpenseCategory.office:
        return Colors.orange;
      case ExpenseCategory.travel:
        return Colors.green;
      case ExpenseCategory.training:
        return Colors.red;
      case ExpenseCategory.other:
        return Colors.grey;
    }
  }

  String _getCategoryLabel(ExpenseCategory category) {
    switch (category) {
      case ExpenseCategory.equipment:
        return 'Apparatuur';
      case ExpenseCategory.software:
        return 'Software';
      case ExpenseCategory.office:
        return 'Kantoor';
      case ExpenseCategory.travel:
        return 'Reizen';
      case ExpenseCategory.training:
        return 'Training';
      case ExpenseCategory.other:
        return 'Overig';
    }
  }
}

class ExpenseFormSheet extends StatefulWidget {
  final BusinessExpense? expense;

  const ExpenseFormSheet({super.key, this.expense});

  @override
  State<ExpenseFormSheet> createState() => _ExpenseFormSheetState();
}

class _ExpenseFormSheetState extends State<ExpenseFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _descriptionController;
  late TextEditingController _amountController;
  late TextEditingController _vatRateController;
  late TextEditingController _receiptUrlController;
  late ExpenseCategory _category;
  late DateTime _date;
  late bool _isRecurring;
  String? _recurringFrequency;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final expense = widget.expense;
    _descriptionController = TextEditingController(text: expense?.description);
    _amountController = TextEditingController(
      text: expense?.amount.toString() ?? '',
    );
    _vatRateController = TextEditingController(
      text: ((expense?.vatRate ?? 0.21) * 100).toString(),
    );
    _receiptUrlController = TextEditingController(text: expense?.receiptUrl);
    _category = expense?.category ?? ExpenseCategory.other;
    _date = expense?.date ?? DateTime.now();
    _isRecurring = expense?.isRecurring ?? false;
    _recurringFrequency = expense?.recurringFrequency;
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    _amountController.dispose();
    _vatRateController.dispose();
    _receiptUrlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Handle
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),

              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    Text(
                      widget.expense == null
                          ? 'Nieuwe Kost'
                          : 'Kost Bewerken',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              const Divider(),

              // Form
              Expanded(
                child: Form(
                  key: _formKey,
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.all(20),
                    children: [
                      TextFormField(
                        controller: _descriptionController,
                        decoration: const InputDecoration(
                          labelText: 'Beschrijving *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) =>
                            value?.isEmpty ?? true ? 'Verplicht' : null,
                      ),
                      const SizedBox(height: 16),

                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: _amountController,
                              decoration: const InputDecoration(
                                labelText: 'Bedrag (€) *',
                                border: OutlineInputBorder(),
                                prefixText: '€ ',
                              ),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(
                                  RegExp(r'^\d+\.?\d{0,2}'),
                                ),
                              ],
                              validator: (value) {
                                if (value?.isEmpty ?? true) return 'Verplicht';
                                if (double.tryParse(value!) == null) {
                                  return 'Ongeldig bedrag';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _vatRateController,
                              decoration: const InputDecoration(
                                labelText: 'BTW % *',
                                border: OutlineInputBorder(),
                                suffixText: '%',
                              ),
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                decimal: true,
                              ),
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(
                                  RegExp(r'^\d+\.?\d{0,2}'),
                                ),
                              ],
                              validator: (value) {
                                if (value?.isEmpty ?? true) return 'Verplicht';
                                final rate = double.tryParse(value!);
                                if (rate == null || rate < 0 || rate > 100) {
                                  return 'Ongeldig';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      DropdownButtonFormField<ExpenseCategory>(
                        initialValue: _category,
                        decoration: const InputDecoration(
                          labelText: 'Categorie *',
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: ExpenseCategory.equipment,
                            child: Text('Apparatuur'),
                          ),
                          DropdownMenuItem(
                            value: ExpenseCategory.software,
                            child: Text('Software'),
                          ),
                          DropdownMenuItem(
                            value: ExpenseCategory.office,
                            child: Text('Kantoor'),
                          ),
                          DropdownMenuItem(
                            value: ExpenseCategory.travel,
                            child: Text('Reizen'),
                          ),
                          DropdownMenuItem(
                            value: ExpenseCategory.training,
                            child: Text('Training'),
                          ),
                          DropdownMenuItem(
                            value: ExpenseCategory.other,
                            child: Text('Overig'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) setState(() => _category = value);
                        },
                      ),
                      const SizedBox(height: 16),

                      InkWell(
                        onTap: () async {
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _date,
                            firstDate: DateTime(2020),
                            lastDate: DateTime.now(),
                          );
                          if (picked != null) {
                            setState(() => _date = picked);
                          }
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: 'Datum *',
                            border: OutlineInputBorder(),
                            suffixIcon: Icon(Icons.calendar_today),
                          ),
                          child: Text(
                            DateFormat('dd MMM yyyy', 'nl_NL').format(_date),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      TextFormField(
                        controller: _receiptUrlController,
                        decoration: const InputDecoration(
                          labelText: 'Bonnetje URL (optioneel)',
                          border: OutlineInputBorder(),
                          hintText: 'https://...',
                        ),
                        keyboardType: TextInputType.url,
                      ),
                      const SizedBox(height: 24),

                      SwitchListTile(
                        title: const Text('Terugkerende kost'),
                        value: _isRecurring,
                        onChanged: (value) {
                          setState(() => _isRecurring = value);
                          if (!value) _recurringFrequency = null;
                        },
                        contentPadding: EdgeInsets.zero,
                      ),

                      if (_isRecurring) ...[
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          initialValue: _recurringFrequency,
                          decoration: const InputDecoration(
                            labelText: 'Frequentie *',
                            border: OutlineInputBorder(),
                          ),
                          items: const [
                            DropdownMenuItem(
                              value: 'monthly',
                              child: Text('Maandelijks'),
                            ),
                            DropdownMenuItem(
                              value: 'quarterly',
                              child: Text('Per kwartaal'),
                            ),
                            DropdownMenuItem(
                              value: 'yearly',
                              child: Text('Jaarlijks'),
                            ),
                          ],
                          onChanged: (value) {
                            setState(() => _recurringFrequency = value);
                          },
                          validator: (value) =>
                              _isRecurring && (value?.isEmpty ?? true)
                                  ? 'Verplicht'
                                  : null,
                        ),
                      ],

                      const SizedBox(height: 24),
                      ElevatedButton(
                        onPressed: _isLoading ? null : _saveExpense,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : Text(
                                widget.expense == null
                                    ? 'Toevoegen'
                                    : 'Opslaan',
                              ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _saveExpense() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final userId = authService.currentUserId!;

      final amount = double.parse(_amountController.text.trim());
      final vatRate = double.parse(_vatRateController.text.trim()) / 100;
      final vatAmount = amount * vatRate;

      final data = {
        'userId': userId,
        'description': _descriptionController.text.trim(),
        'amount': amount,
        'vatAmount': vatAmount,
        'vatRate': vatRate,
        'category': _category.toString().split('.').last,
        'date': Timestamp.fromDate(_date),
        'receiptUrl': _receiptUrlController.text.trim().isEmpty
            ? null
            : _receiptUrlController.text.trim(),
        'isRecurring': _isRecurring,
        'recurringFrequency': _recurringFrequency,
        'updatedAt': Timestamp.now(),
      };

      if (widget.expense == null) {
        data['createdAt'] = Timestamp.now();
        await FirebaseFirestore.instance
            .collection('business_expenses')
            .add(data);

        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Kost toegevoegd'),
              backgroundColor: ThemeConfig.successColor,
            ),
          );
        }
      } else {
        await FirebaseFirestore.instance
            .collection('business_expenses')
            .doc(widget.expense!.id)
            .update(data);

        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Kost bijgewerkt'),
              backgroundColor: ThemeConfig.successColor,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fout: $e'),
            backgroundColor: ThemeConfig.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}