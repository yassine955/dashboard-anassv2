import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../models/invoice_model.dart';
import '../../models/client_model.dart';
import '../../models/product_model.dart';
import '../../models/user_model.dart';
import '../../widgets/common/app_drawer.dart';
import '../../widgets/common/payment_provider_icons.dart';
import '../../widgets/invoices/send_email_dialog.dart';
import '../../config/theme_config.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  InvoiceStatus? _statusFilter;
  final Set<String> _selectedInvoiceIds = {};
  bool _isSelectionMode = false;

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final firestoreService = context.read<FirestoreService>();
    final userId = authService.currentUserId;

    if (userId == null) {
      return const Scaffold(body: Center(child: Text('Niet ingelogd')));
    }

    return Scaffold(
      appBar: AppBar(
        title: _isSelectionMode
            ? Text('${_selectedInvoiceIds.length} geselecteerd')
            : const Text('Facturen'),
        leading: _isSelectionMode
            ? IconButton(
                icon: const Icon(Icons.close),
                onPressed: () {
                  setState(() {
                    _isSelectionMode = false;
                    _selectedInvoiceIds.clear();
                  });
                },
              )
            : null,
        actions: [
          if (_isSelectionMode)
            IconButton(
              icon: const Icon(Icons.delete),
              onPressed: _selectedInvoiceIds.isEmpty
                  ? null
                  : () => _bulkDeleteInvoices(context, firestoreService),
              tooltip: 'Verwijder geselecteerde',
            )
          else ...[
            if (_statusFilter != null)
              IconButton(
                icon: const Icon(Icons.filter_alt_off),
                onPressed: () => setState(() => _statusFilter = null),
                tooltip: 'Filter wissen',
              ),
            PopupMenuButton<InvoiceStatus>(
              icon: const Icon(Icons.filter_list),
              tooltip: 'Filter op status',
              onSelected: (status) => setState(() => _statusFilter = status),
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: InvoiceStatus.draft,
                  child: Text('Concept'),
                ),
                const PopupMenuItem(
                  value: InvoiceStatus.sent,
                  child: Text('Verzonden'),
                ),
                const PopupMenuItem(
                  value: InvoiceStatus.paid,
                  child: Text('Betaald'),
                ),
                const PopupMenuItem(
                  value: InvoiceStatus.overdue,
                  child: Text('Verlopen'),
                ),
              ],
            ),
          ],
        ],
      ),
      drawer: const AppDrawer(),
      body: StreamBuilder<List<InvoiceModel>>(
        stream: firestoreService.streamInvoices(userId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Fout: ${snapshot.error}'));
          }

          final invoices = snapshot.data ?? [];

          // Apply status filter
          final filteredInvoices = _statusFilter == null
              ? invoices
              : invoices.where((inv) => inv.status == _statusFilter).toList();

          if (filteredInvoices.isEmpty) {
            return Center(
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
                    'Nog geen facturen',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: ThemeConfig.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Maak je eerste factuur',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: ThemeConfig.textSecondary,
                    ),
                  ),
                ],
              ),
            );
          }

          // Fetch clients to display names
          return StreamBuilder<List<ClientModel>>(
            stream: firestoreService.streamClients(userId),
            builder: (context, clientSnapshot) {
              final clients = clientSnapshot.data ?? [];

              return Column(
                children: [
                  // Select all header (only show in selection mode)
                  if (_isSelectionMode)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      color: Colors.grey.shade100,
                      child: Row(
                        children: [
                          Checkbox(
                            value: _selectedInvoiceIds.length == filteredInvoices.length,
                            tristate: true,
                            onChanged: (value) {
                              setState(() {
                                if (value == true) {
                                  _selectedInvoiceIds.addAll(
                                    filteredInvoices.map((inv) => inv.id),
                                  );
                                } else {
                                  _selectedInvoiceIds.clear();
                                }
                              });
                            },
                          ),
                          const Text(
                            'Selecteer alles',
                            style: TextStyle(fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filteredInvoices.length,
                      itemBuilder: (context, index) {
                        final invoice = filteredInvoices[index];
                        final client = clients.firstWhere(
                          (c) => c.id == invoice.clientId,
                          orElse: () => ClientModel(
                            id: '',
                            userId: userId,
                            firstName: 'Onbekend',
                            lastName: '',
                            email: '',
                            address: Address(street: '', city: '', postalCode: '', country: ''),
                            status: ClientStatus.active,
                            createdAt: DateTime.now(),
                            updatedAt: DateTime.now(),
                          ),
                        );
                        final isSelected = _selectedInvoiceIds.contains(invoice.id);

                        return _InvoiceCard(
                          invoice: invoice,
                          clientName: client.companyName ?? '${client.firstName} ${client.lastName}'.trim(),
                          isSelectionMode: _isSelectionMode,
                          isSelected: isSelected,
                          onSelectionChanged: (selected) {
                            setState(() {
                              if (selected) {
                                _selectedInvoiceIds.add(invoice.id);
                              } else {
                                _selectedInvoiceIds.remove(invoice.id);
                              }
                            });
                          },
                          onLongPress: () {
                            setState(() {
                              _isSelectionMode = true;
                              _selectedInvoiceIds.add(invoice.id);
                            });
                          },
                          onTap: () {
                            if (_isSelectionMode) {
                              setState(() {
                                if (isSelected) {
                                  _selectedInvoiceIds.remove(invoice.id);
                                } else {
                                  _selectedInvoiceIds.add(invoice.id);
                                }
                              });
                            } else {
                              _showInvoiceDetails(context, invoice, client);
                            }
                          },
                          onMarkPaid: () => _markInvoicePaid(context, invoice),
                          onMarkOverdue: () => _markAsOverdue(context, invoice),
                          onDuplicate: () => _duplicateInvoice(context, invoice),
                          onDelete: () => _deleteInvoice(context, invoice),
                          onSendEmail: () => _sendInvoiceEmail(context, invoice),
                          onGeneratePDF: () => _generatePDF(context, invoice),
                          onCreatePaymentLink: () => _createPaymentLink(context, invoice),
                          onCopyPaymentLink: () => _copyPaymentLink(context, invoice),
                          onSendReminder: () => _sendPaymentReminder(context, invoice),
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showInvoiceForm(context),
        icon: const Icon(Icons.add),
        label: const Text('Nieuwe Factuur'),
      ),
    );
  }

  void _showInvoiceForm(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const InvoiceFormScreen()),
    );
  }

  void _showInvoiceDetails(BuildContext context, InvoiceModel invoice, ClientModel client) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => InvoiceDetailsSheet(
        invoice: invoice,
        client: client,
      ),
    );
  }

  Future<void> _markInvoicePaid(
    BuildContext context,
    InvoiceModel invoice,
  ) async {
    try {
      await context.read<FirestoreService>().updateInvoice(invoice.id, {
        'status': 'paid',
        'paidAt': DateTime.now(),
        'paidAmount': invoice.totalAmount,
      });

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Factuur gemarkeerd als betaald')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Fout: $e')));
      }
    }
  }

  Future<void> _deleteInvoice(
    BuildContext context,
    InvoiceModel invoice,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Factuur verwijderen'),
        content: Text(
          'Weet je zeker dat je factuur ${invoice.invoiceNumber} wilt verwijderen?',
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
        await context.read<FirestoreService>().deleteInvoice(invoice.id);
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Factuur verwijderd')));
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Fout: $e')));
        }
      }
    }
  }

  // Duplicate invoice
  Future<void> _duplicateInvoice(
    BuildContext context,
    InvoiceModel invoice,
  ) async {
    try {
      final authService = context.read<AuthService>();
      final userId = authService.currentUserId;

      if (userId == null) {
        throw Exception('User not authenticated');
      }

      await context.read<FirestoreService>().duplicateInvoice(invoice, userId);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Factuur succesvol gedupliceerd!'),
            backgroundColor: ThemeConfig.successColor,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fout bij dupliceren factuur: $e')),
        );
      }
    }
  }

  // Mark invoice as overdue
  Future<void> _markAsOverdue(
    BuildContext context,
    InvoiceModel invoice,
  ) async {
    try {
      await context.read<FirestoreService>().updateInvoice(invoice.id, {
        'status': 'overdue',
      });

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Factuur gemarkeerd als verlopen!'),
            backgroundColor: ThemeConfig.successColor,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fout bij bijwerken factuur: $e')),
        );
      }
    }
  }

  // Bulk delete invoices
  Future<void> _bulkDeleteInvoices(
    BuildContext context,
    FirestoreService firestoreService,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Facturen verwijderen'),
        content: Text(
          'Weet je zeker dat je ${_selectedInvoiceIds.length} facturen wilt verwijderen?',
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
        // Delete all selected invoices
        for (final invoiceId in _selectedInvoiceIds) {
          await firestoreService.deleteInvoice(invoiceId);
        }

        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${_selectedInvoiceIds.length} facturen verwijderd'),
              backgroundColor: ThemeConfig.successColor,
            ),
          );
        }

        // Exit selection mode
        setState(() {
          _isSelectionMode = false;
          _selectedInvoiceIds.clear();
        });
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Fout bij verwijderen: $e')),
          );
        }
      }
    }
  }

  // Send invoice via email
  Future<void> _sendInvoiceEmail(
    BuildContext context,
    InvoiceModel invoice,
  ) async {
    try {
      // Get client data
      final firestoreService = context.read<FirestoreService>();
      final client = await firestoreService.getClient(invoice.clientId);

      if (client == null) {
        throw Exception('Klant niet gevonden');
      }

      if (!context.mounted) return;

      // Show email dialog
      bool isSending = false;
      String? paymentLink;

      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (dialogContext) => StatefulBuilder(
          builder: (context, setState) {
            return SendEmailDialog(
              invoice: invoice,
              client: client,
              isSending: isSending,
              onCancel: () {
                if (!isSending) {
                  Navigator.of(dialogContext).pop();
                }
              },
              onSend: (customMessage, includePaymentLink) async {
                setState(() => isSending = true);

                try {
                  // If user wants payment link, ensure we have one
                  if (includePaymentLink) {
                    paymentLink = invoice.paymentLink;

                    // Check if we need to create a new payment link
                    final needsNewPaymentLink = paymentLink == null ||
                        !paymentLink!.contains('tikkie');

                    if (needsNewPaymentLink) {
                      // Create payment link first
                      final authService = context.read<AuthService>();
                      final userId = authService.currentUserId;
                      final user = authService.currentUser;

                      if (userId == null || user == null) {
                        throw Exception('Gebruiker niet ingelogd');
                      }

                      final idToken = await user.getIdToken();

                      final paymentResponse = await http.post(
                        Uri.parse(
                            'https://quickinvoice-three.vercel.app/api/create-tikkie-payment'),
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': 'Bearer $idToken',
                        },
                        body: jsonEncode({
                          'invoiceId': invoice.id,
                          'amount': invoice.totalAmount,
                          'description': 'Factuur ${invoice.invoiceNumber}',
                          'clientId': invoice.clientId,
                          'userId': userId,
                          'metadata': {
                            'invoiceId': invoice.id,
                            'clientId': invoice.clientId,
                            'invoiceNumber': invoice.invoiceNumber,
                          },
                        }),
                      );

                      if (paymentResponse.statusCode != 200) {
                        final errorData = jsonDecode(paymentResponse.body);
                        throw Exception(errorData['error'] ??
                            'Failed to create payment link');
                      }

                      final responseData = jsonDecode(paymentResponse.body);
                      paymentLink = responseData['url'];

                      // Update invoice with payment link
                      await firestoreService.updateInvoice(invoice.id, {
                        'paymentLink': paymentLink,
                        'paymentId': responseData['paymentId'],
                        'paymentProvider': 'tikkie',
                      });
                    }
                  }

                  // Send email via backend API
                  final authService = context.read<AuthService>();
                  final userId = authService.currentUserId;

                  if (userId == null) {
                    throw Exception('Gebruiker niet ingelogd');
                  }

                  final emailResponse = await http.post(
                    Uri.parse(
                        'https://quickinvoice-three.vercel.app/api/send-email'),
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: jsonEncode({
                      'to': client.email,
                      'subject': 'Factuur ${invoice.invoiceNumber}',
                      'invoiceId': invoice.id,
                      'clientId': client.id,
                      'userId': userId,
                      'paymentLink': paymentLink,
                      'customMessage': customMessage.isNotEmpty ? customMessage : null,
                    }),
                  );

                  if (emailResponse.statusCode != 200) {
                    final errorData = jsonDecode(emailResponse.body);
                    throw Exception(
                        errorData['error'] ?? 'Failed to send email');
                  }

                  // Update invoice status to sent
                  await firestoreService.updateInvoice(invoice.id, {
                    'status': 'sent',
                  });

                  if (context.mounted) {
                    Navigator.of(dialogContext).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                            'Factuur succesvol verzonden naar ${client.email}!'),
                        backgroundColor: ThemeConfig.successColor,
                      ),
                    );
                  }
                } catch (e) {
                  setState(() => isSending = false);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Fout bij verzenden email: $e'),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
            );
          },
        ),
      );
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fout bij verzenden email: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  // View invoice details (PDF view)
  void _generatePDF(BuildContext context, InvoiceModel invoice) {
    // Get client info
    final firestoreService = context.read<FirestoreService>();

    // Show invoice view dialog
    showDialog(
      context: context,
      builder: (context) => Dialog(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 900, maxHeight: 700),
          child: FutureBuilder<ClientModel?>(
            future: firestoreService.getClient(invoice.clientId),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              final client = snapshot.data;
              if (client == null) {
                return const Center(child: Text('Client niet gevonden'));
              }

              return _buildInvoiceViewDialog(invoice, client);
            },
          ),
        ),
      ),
    );
  }

  Widget _buildInvoiceViewDialog(InvoiceModel invoice, ClientModel client) {
    final currencyFormat = NumberFormat.currency(locale: 'nl_NL', symbol: '€');
    final dateFormat = DateFormat('dd MMM yyyy', 'nl_NL');

    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: ThemeConfig.primaryColor,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(12),
              topRight: Radius.circular(12),
            ),
          ),
          child: Row(
            children: [
              const Expanded(
                child: Text(
                  'Factuur Inzien',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
        ),

        // Content
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Invoice Header
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Factuurnummer',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: ThemeConfig.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              invoice.invoiceNumber,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Status',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: ThemeConfig.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                InvoiceStatusIcon(
                                  status: invoice.status.toString().split('.').last,
                                  size: 16,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  _getStatusText(invoice.status),
                                  style: const TextStyle(fontSize: 14),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Klant',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w500,
                                color: ThemeConfig.textSecondary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${client.firstName} ${client.lastName}',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (client.companyName != null) ...[
                              const SizedBox(height: 2),
                              Text(
                                client.companyName!,
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: ThemeConfig.textSecondary,
                                ),
                              ),
                            ],
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Factuurdatum',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: ThemeConfig.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        dateFormat.format(invoice.invoiceDate),
                                        style: const TextStyle(fontSize: 14),
                                      ),
                                    ],
                                  ),
                                ),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Vervaldatum',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w500,
                                          color: ThemeConfig.textSecondary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        dateFormat.format(invoice.dueDate),
                                        style: const TextStyle(fontSize: 14),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Invoice Items
                const Text(
                  'Factuurregels',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Table(
                    border: TableBorder(
                      horizontalInside: BorderSide(color: Colors.grey.shade300),
                    ),
                    columnWidths: const {
                      0: FlexColumnWidth(3),
                      1: FlexColumnWidth(1),
                      2: FlexColumnWidth(1),
                      3: FlexColumnWidth(1),
                      4: FlexColumnWidth(1),
                    },
                    children: [
                      // Header
                      TableRow(
                        decoration: BoxDecoration(color: Colors.grey.shade50),
                        children: const [
                          Padding(
                            padding: EdgeInsets.all(12),
                            child: Text(
                              'Beschrijving',
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.all(12),
                            child: Text(
                              'Aantal',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.all(12),
                            child: Text(
                              'Prijs',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.all(12),
                            child: Text(
                              'BTW %',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                          Padding(
                            padding: EdgeInsets.all(12),
                            child: Text(
                              'Totaal',
                              textAlign: TextAlign.right,
                              style: TextStyle(fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                      // Items
                      ...invoice.items.map((item) => TableRow(
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text(item.description),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text(
                              item.quantity.toString(),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text(
                              currencyFormat.format(item.unitPrice),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text(
                              '${item.vatRate.toStringAsFixed(0)}%',
                              textAlign: TextAlign.center,
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Text(
                              currencyFormat.format(item.total),
                              textAlign: TextAlign.right,
                            ),
                          ),
                        ],
                      )),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Totals
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Subtotaal:'),
                          Text(
                            currencyFormat.format(invoice.subtotal),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('BTW:'),
                          Text(
                            currencyFormat.format(invoice.vatAmount),
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      const Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Totaal:',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            currencyFormat.format(invoice.totalAmount),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: ThemeConfig.primaryColor,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Notes
                if (invoice.notes != null && invoice.notes!.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  const Text(
                    'Opmerkingen',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(invoice.notes!),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  String _getStatusText(InvoiceStatus status) {
    switch (status) {
      case InvoiceStatus.draft:
        return 'Concept';
      case InvoiceStatus.sent:
        return 'Verzonden';
      case InvoiceStatus.paid:
        return 'Betaald';
      case InvoiceStatus.overdue:
        return 'Verlopen';
      default:
        return '';
    }
  }

  // NEW FEATURE: Create payment link
  Future<void> _createPaymentLink(
    BuildContext context,
    InvoiceModel invoice,
  ) async {
    // Only Tikkie is available as payment provider
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Betaallink aanmaken'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const TikkieIcon(size: 48),
            const SizedBox(height: 16),
            const Text(
              'Wil je een Tikkie betaallink aanmaken voor deze factuur?',
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuleren'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: ThemeConfig.primaryColor,
            ),
            child: const Text('Aanmaken'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      try {
        // Get authenticated user and token
        final authService = context.read<AuthService>();
        final userId = authService.currentUserId;
        final user = authService.currentUser;

        if (userId == null || user == null) {
          throw Exception('Gebruiker niet ingelogd');
        }

        // Get Firebase ID token for authorization
        final idToken = await user.getIdToken();

        // Call backend API to create real Tikkie payment
        final response = await http.post(
          Uri.parse(
              'https://quickinvoice-three.vercel.app/api/create-tikkie-payment'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $idToken',
          },
          body: jsonEncode({
            'invoiceId': invoice.id,
            'amount': invoice.totalAmount,
            'description': 'Factuur ${invoice.invoiceNumber}',
            'clientId': invoice.clientId,
            'userId': userId,
            'metadata': {
              'invoiceId': invoice.id,
              'clientId': invoice.clientId,
              'invoiceNumber': invoice.invoiceNumber,
            },
          }),
        );

        if (response.statusCode != 200) {
          final errorData = jsonDecode(response.body);
          throw Exception(errorData['error'] ?? 'Failed to create Tikkie payment');
        }

        final responseData = jsonDecode(response.body);
        final paymentUrl = responseData['url'];
        final paymentId = responseData['paymentId'];

        // Update invoice with real payment data
        if (context.mounted) {
          await context.read<FirestoreService>().updateInvoice(invoice.id, {
            'paymentLink': paymentUrl,
            'paymentId': paymentId,
            'paymentProvider': 'tikkie',
            'status': 'sent',
          });

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Tikkie betaallink succesvol aangemaakt!'),
              backgroundColor: ThemeConfig.successColor,
            ),
          );
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Fout bij aanmaken betaallink: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  // NEW FEATURE: Copy payment link to clipboard
  Future<void> _copyPaymentLink(
    BuildContext context,
    InvoiceModel invoice,
  ) async {
    if (invoice.paymentLink == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Geen betaallink beschikbaar')),
      );
      return;
    }

    await Clipboard.setData(ClipboardData(text: invoice.paymentLink!));

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Betaallink gekopieerd naar klembord'),
          backgroundColor: ThemeConfig.successColor,
        ),
      );
    }
  }

  // NEW FEATURE: Send payment reminder
  Future<void> _sendPaymentReminder(
    BuildContext context,
    InvoiceModel invoice,
  ) async {
    try {
      // TODO: Implement actual reminder email with backend API
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Betalingsherinnering verzonden! (Placeholder)'),
            backgroundColor: ThemeConfig.successColor,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fout bij verzenden herinnering: $e')),
        );
      }
    }
  }
}

class _InvoiceCard extends StatelessWidget {
  final InvoiceModel invoice;
  final String clientName;
  final bool isSelectionMode;
  final bool isSelected;
  final ValueChanged<bool> onSelectionChanged;
  final VoidCallback onLongPress;
  final VoidCallback onTap;
  final VoidCallback onMarkPaid;
  final VoidCallback onMarkOverdue;
  final VoidCallback onDuplicate;
  final VoidCallback onDelete;
  final VoidCallback onSendEmail;
  final VoidCallback onGeneratePDF;
  final VoidCallback onCreatePaymentLink;
  final VoidCallback onCopyPaymentLink;
  final VoidCallback onSendReminder;

  const _InvoiceCard({
    required this.invoice,
    required this.clientName,
    this.isSelectionMode = false,
    this.isSelected = false,
    required this.onSelectionChanged,
    required this.onLongPress,
    required this.onTap,
    required this.onMarkPaid,
    required this.onMarkOverdue,
    required this.onDuplicate,
    required this.onDelete,
    required this.onSendEmail,
    required this.onGeneratePDF,
    required this.onCreatePaymentLink,
    required this.onCopyPaymentLink,
    required this.onSendReminder,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'nl_NL', symbol: '€');
    final dateFormat = DateFormat('dd MMM yyyy', 'nl_NL');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Checkbox in selection mode
                  if (isSelectionMode) ...[
                    Checkbox(
                      value: isSelected,
                      onChanged: (value) => onSelectionChanged(value ?? false),
                    ),
                    const SizedBox(width: 8),
                  ],
                  // Status icon
                  InvoiceStatusIcon(
                    status: invoice.status.toString().split('.').last,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          invoice.invoiceNumber,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          clientName,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: ThemeConfig.primaryColor,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          dateFormat.format(invoice.invoiceDate),
                          style: TextStyle(
                            color: ThemeConfig.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  _StatusBadge(status: invoice.status),
                  const SizedBox(width: 8),
                  // Hide menu button in selection mode
                  if (!isSelectionMode)
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert),
                      onSelected: (value) {
                      switch (value) {
                        case 'pdf':
                          onGeneratePDF();
                          break;
                        case 'edit':
                          // TODO: Implement edit invoice screen (requires full form with items editing)
                          // This would require navigating to invoice form screen pre-filled with data
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Edit functionaliteit: Gebruik "Dupliceer" en pas de nieuwe factuur aan'),
                              duration: Duration(seconds: 3),
                            ),
                          );
                          break;
                        case 'duplicate':
                          onDuplicate();
                          break;
                        case 'payment_link':
                          onCreatePaymentLink();
                          break;
                        case 'copy_link':
                          onCopyPaymentLink();
                          break;
                        case 'email':
                          onSendEmail();
                          break;
                        case 'reminder':
                          onSendReminder();
                          break;
                        case 'paid':
                          onMarkPaid();
                          break;
                        case 'overdue':
                          onMarkOverdue();
                          break;
                        case 'delete':
                          onDelete();
                          break;
                      }
                    },
                    itemBuilder: (context) => [
                      // View/Download PDF - Always available
                      const PopupMenuItem(
                        value: 'pdf',
                        child: Row(
                          children: [
                            Icon(
                              Icons.picture_as_pdf,
                              size: 20,
                              color: Colors.red,
                            ),
                            SizedBox(width: 8),
                            Text('Bekijk factuur'),
                          ],
                        ),
                      ),
                      // Edit - Only for non-paid invoices
                      if (invoice.status != InvoiceStatus.paid)
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit, size: 20, color: Colors.blue),
                              SizedBox(width: 8),
                              Text('Bewerk factuur'),
                            ],
                          ),
                        ),
                      // Duplicate - Always available
                      const PopupMenuItem(
                        value: 'duplicate',
                        child: Row(
                          children: [
                            Icon(Icons.copy_all, size: 20, color: Colors.teal),
                            SizedBox(width: 8),
                            Text('Dupliceer factuur'),
                          ],
                        ),
                      ),

                      // Payment options - Only for non-paid invoices
                      if (invoice.status != InvoiceStatus.paid) ...[
                        const PopupMenuDivider(),
                        // Create Payment Link
                        if (invoice.paymentLink == null)
                          const PopupMenuItem(
                            value: 'payment_link',
                            child: Row(
                              children: [
                                Icon(Icons.link, size: 20, color: Colors.purple),
                                SizedBox(width: 8),
                                Text('Maak betaallink'),
                              ],
                            ),
                          ),
                        // Copy Payment Link
                        if (invoice.paymentLink != null)
                          const PopupMenuItem(
                            value: 'copy_link',
                            child: Row(
                              children: [
                                Icon(
                                  Icons.content_copy,
                                  size: 20,
                                  color: Colors.purple,
                                ),
                                SizedBox(width: 8),
                                Text('Kopieer betaallink'),
                              ],
                            ),
                          ),
                        // Send Email
                        const PopupMenuItem(
                          value: 'email',
                          child: Row(
                            children: [
                              Icon(Icons.email, size: 20, color: Colors.blue),
                              SizedBox(width: 8),
                              Text('Verstuur per email'),
                            ],
                          ),
                        ),
                        // Send Reminder (only for overdue)
                        if (invoice.isOverdue)
                          const PopupMenuItem(
                            value: 'reminder',
                            child: Row(
                              children: [
                                Icon(
                                  Icons.notification_important,
                                  size: 20,
                                  color: Colors.orange,
                                ),
                                SizedBox(width: 8),
                                Text('Herinnering sturen'),
                              ],
                            ),
                          ),
                        const PopupMenuDivider(),
                        // Mark as Paid
                        const PopupMenuItem(
                          value: 'paid',
                          child: Row(
                            children: [
                              Icon(
                                Icons.check_circle,
                                size: 20,
                                color: Colors.green,
                              ),
                              SizedBox(width: 8),
                              Text('Markeer als betaald'),
                            ],
                          ),
                        ),
                        // Mark as Overdue (for draft/sent invoices)
                        if (invoice.status == InvoiceStatus.draft ||
                            invoice.status == InvoiceStatus.sent)
                          const PopupMenuItem(
                            value: 'overdue',
                            child: Row(
                              children: [
                                Icon(
                                  Icons.warning,
                                  size: 20,
                                  color: Colors.orange,
                                ),
                                SizedBox(width: 8),
                                Text('Markeer als verlopen'),
                              ],
                            ),
                          ),
                      ],

                      const PopupMenuDivider(),
                      // Delete - Always available
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
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Totaal',
                    style: TextStyle(
                      color: ThemeConfig.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                  Text(
                    currencyFormat.format(invoice.totalAmount),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: ThemeConfig.primaryColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.access_time, size: 14, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    'Vervalt: ${dateFormat.format(invoice.dueDate)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: invoice.isOverdue ? Colors.red : Colors.grey[600],
                    ),
                  ),
                  // Payment provider indicator
                  if (invoice.paymentProvider != null) ...[
                    const Spacer(),
                    PaymentProviderIcon(
                      provider: invoice.paymentProvider!
                          .toString()
                          .split('.')
                          .last,
                      size: 18,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      invoice.paymentProvider!.toString().split('.').last,
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ],
              ),
              // Open payment link button - Only for non-paid invoices
              if (invoice.paymentLink != null && invoice.status != InvoiceStatus.paid) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () async {
                      final url = Uri.parse(invoice.paymentLink!);
                      if (await canLaunchUrl(url)) {
                        await launchUrl(
                          url,
                          mode: LaunchMode.externalApplication,
                        );
                      }
                    },
                    icon: const Icon(Icons.open_in_new, size: 16),
                    label: const Text('Open betaallink'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                    ),
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
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class InvoiceDetailsSheet extends StatefulWidget {
  final InvoiceModel invoice;
  final ClientModel client;

  const InvoiceDetailsSheet({
    super.key,
    required this.invoice,
    required this.client,
  });

  @override
  State<InvoiceDetailsSheet> createState() => _InvoiceDetailsSheetState();
}

class _InvoiceDetailsSheetState extends State<InvoiceDetailsSheet> {
  late TextEditingController _notesController;
  bool _isEditingNotes = false;

  @override
  void initState() {
    super.initState();
    _notesController = TextEditingController(text: widget.invoice.notes ?? '');
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _saveNotes() async {
    try {
      await context.read<FirestoreService>().updateInvoice(widget.invoice.id, {
        'notes': _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
      });

      setState(() => _isEditingNotes = false);

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Notities opgeslagen')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Fout bij opslaan: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'nl_NL', symbol: '€');
    final dateFormat = DateFormat('dd MMM yyyy', 'nl_NL');

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
                    InvoiceStatusIcon(
                      status: widget.invoice.status.toString().split('.').last,
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      widget.invoice.invoiceNumber,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const Spacer(),
                    _StatusBadge(status: widget.invoice.status),
                    const SizedBox(width: 12),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              const Divider(),

              // Details
              Expanded(
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.all(20),
                  children: [
                    // Client Details Section
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.person_outline,
                                size: 20,
                                color: ThemeConfig.primaryColor,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Klantgegevens',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: ThemeConfig.primaryColor,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          const Divider(height: 1),
                          const SizedBox(height: 12),
                          if (widget.client.companyName != null) ...[
                            Text(
                              widget.client.companyName!,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                          ],
                          Text(
                            '${widget.client.firstName} ${widget.client.lastName}',
                            style: const TextStyle(fontSize: 14),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.email_outlined, size: 16, color: Colors.grey),
                              const SizedBox(width: 6),
                              Text(
                                widget.client.email,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey.shade700,
                                ),
                              ),
                            ],
                          ),
                          if (widget.client.phone != null) ...[
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(Icons.phone_outlined, size: 16, color: Colors.grey),
                                const SizedBox(width: 6),
                                Text(
                                  widget.client.phone!,
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade700,
                                  ),
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 8),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.location_on_outlined, size: 16, color: Colors.grey),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '${widget.client.address.street}\n${widget.client.address.postalCode} ${widget.client.address.city}\n${widget.client.address.country}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey.shade700,
                                    height: 1.4,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Dates
                    Row(
                      children: [
                        Expanded(
                          child: _DetailItem(
                            label: 'Factuurdatum',
                            value: dateFormat.format(
                              widget.invoice.invoiceDate,
                            ),
                          ),
                        ),
                        Expanded(
                          child: _DetailItem(
                            label: 'Vervaldatum',
                            value: dateFormat.format(widget.invoice.dueDate),
                          ),
                        ),
                      ],
                    ),

                    // Payment info if available
                    if (widget.invoice.paymentLink != null) ...[
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.blue.shade200),
                        ),
                        child: Row(
                          children: [
                            if (widget.invoice.paymentProvider != null)
                              PaymentProviderIcon(
                                provider: widget.invoice.paymentProvider!
                                    .toString()
                                    .split('.')
                                    .last,
                                size: 24,
                              ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Betaallink actief',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  if (widget.invoice.paymentProvider != null)
                                    Text(
                                      'via ${widget.invoice.paymentProvider!.toString().split('.').last}',
                                      style: const TextStyle(fontSize: 12),
                                    ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.open_in_new),
                              onPressed: () async {
                                final url = Uri.parse(
                                  widget.invoice.paymentLink!,
                                );
                                if (await canLaunchUrl(url)) {
                                  await launchUrl(
                                    url,
                                    mode: LaunchMode.externalApplication,
                                  );
                                }
                              },
                            ),
                            IconButton(
                              icon: const Icon(Icons.content_copy),
                              onPressed: () async {
                                await Clipboard.setData(
                                  ClipboardData(
                                    text: widget.invoice.paymentLink!,
                                  ),
                                );
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Link gekopieerd'),
                                    ),
                                  );
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),
                    const Divider(),
                    const SizedBox(height: 16),

                    // Line Items
                    Text(
                      'Posten',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 12),
                    ...widget.invoice.items.map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.description,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  Text(
                                    '${item.quantity}x ${currencyFormat.format(item.unitPrice)}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: ThemeConfig.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              currencyFormat.format(item.subtotal),
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 16),

                    // Totals
                    _TotalRow(
                      label: 'Subtotaal',
                      amount: currencyFormat.format(widget.invoice.subtotal),
                    ),
                    const SizedBox(height: 8),
                    _TotalRow(
                      label: 'BTW',
                      amount: currencyFormat.format(widget.invoice.vatAmount),
                    ),
                    const SizedBox(height: 8),
                    const Divider(),
                    const SizedBox(height: 8),
                    _TotalRow(
                      label: 'Totaal',
                      amount: currencyFormat.format(widget.invoice.totalAmount),
                      isBold: true,
                    ),

                    // Editable Notes
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Notities',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (!_isEditingNotes)
                          TextButton.icon(
                            onPressed: () =>
                                setState(() => _isEditingNotes = true),
                            icon: const Icon(Icons.edit, size: 18),
                            label: const Text('Bewerken'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    if (_isEditingNotes)
                      Column(
                        children: [
                          TextFormField(
                            controller: _notesController,
                            decoration: const InputDecoration(
                              hintText: 'Voeg notities toe...',
                              border: OutlineInputBorder(),
                            ),
                            maxLines: 4,
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              TextButton(
                                onPressed: () {
                                  _notesController.text =
                                      widget.invoice.notes ?? '';
                                  setState(() => _isEditingNotes = false);
                                },
                                child: const Text('Annuleren'),
                              ),
                              const SizedBox(width: 8),
                              ElevatedButton(
                                onPressed: _saveNotes,
                                child: const Text('Opslaan'),
                              ),
                            ],
                          ),
                        ],
                      )
                    else
                      Text(
                        widget.invoice.notes?.isEmpty ?? true
                            ? 'Geen notities'
                            : widget.invoice.notes!,
                        style: TextStyle(
                          color: widget.invoice.notes?.isEmpty ?? true
                              ? ThemeConfig.textSecondary
                              : null,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _DetailItem extends StatelessWidget {
  final String label;
  final String value;

  const _DetailItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 12, color: ThemeConfig.textSecondary),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
        ),
      ],
    );
  }
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String amount;
  final bool isBold;

  const _TotalRow({
    required this.label,
    required this.amount,
    this.isBold = false,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: isBold ? 18 : 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          ),
        ),
        Text(
          amount,
          style: TextStyle(
            fontSize: isBold ? 18 : 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

// Invoice Form Screen (separate screen due to complexity)
class InvoiceFormScreen extends StatefulWidget {
  const InvoiceFormScreen({super.key});

  @override
  State<InvoiceFormScreen> createState() => _InvoiceFormScreenState();
}

class _InvoiceFormScreenState extends State<InvoiceFormScreen> {
  final _formKey = GlobalKey<FormState>();
  ClientModel? _selectedClient;
  DateTime _invoiceDate = DateTime.now();
  DateTime _dueDate = DateTime.now().add(const Duration(days: 14));
  final TextEditingController _notesController = TextEditingController();
  final List<InvoiceItemData> _items = [];
  bool _isLoading = false;

  double get _subtotal =>
      _items.fold(0, (sum, item) => sum + item.quantity * item.unitPrice);
  double get _vatAmount => _items.fold(
    0,
    (sum, item) => sum + (item.quantity * item.unitPrice * item.vatRate),
  );
  double get _total => _subtotal + _vatAmount;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nieuwe Factuur')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Client Selection
            Text('Klant', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            _ClientSelector(
              selectedClient: _selectedClient,
              onClientSelected: (client) {
                setState(() => _selectedClient = client);
              },
            ),

            const SizedBox(height: 24),
            // Dates
            Text('Datums', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _DatePicker(
                    label: 'Factuurdatum',
                    date: _invoiceDate,
                    onDateSelected: (date) {
                      setState(() => _invoiceDate = date);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _DatePicker(
                    label: 'Vervaldatum',
                    date: _dueDate,
                    onDateSelected: (date) {
                      setState(() => _dueDate = date);
                    },
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),
            // Line Items
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Posten', style: Theme.of(context).textTheme.titleMedium),
                TextButton.icon(
                  onPressed: _addLineItem,
                  icon: const Icon(Icons.add),
                  label: const Text('Toevoegen'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ..._items.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              return _LineItemCard(
                item: item,
                onRemove: () => setState(() => _items.removeAt(index)),
                onChanged: () => setState(() {}),
              );
            }),

            if (_items.isEmpty)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey[300]!),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Text(
                    'Geen posten toegevoegd',
                    style: TextStyle(color: ThemeConfig.textSecondary),
                  ),
                ),
              ),

            const SizedBox(height: 24),
            // Totals
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _TotalRow(
                      label: 'Subtotaal',
                      amount: NumberFormat.currency(
                        locale: 'nl_NL',
                        symbol: '€',
                      ).format(_subtotal),
                    ),
                    const SizedBox(height: 8),
                    _TotalRow(
                      label: 'BTW',
                      amount: NumberFormat.currency(
                        locale: 'nl_NL',
                        symbol: '€',
                      ).format(_vatAmount),
                    ),
                    const Divider(height: 24),
                    _TotalRow(
                      label: 'Totaal',
                      amount: NumberFormat.currency(
                        locale: 'nl_NL',
                        symbol: '€',
                      ).format(_total),
                      isBold: true,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),
            // Notes
            Text('Notities', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notesController,
              decoration: const InputDecoration(
                hintText: 'Optionele notities...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),

            const SizedBox(height: 24),
            // Submit Button
            ElevatedButton(
              onPressed: _isLoading ? null : _saveInvoice,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Factuur Aanmaken'),
            ),
          ],
        ),
      ),
    );
  }

  void _addLineItem() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => LineItemFormSheet(
        onItemAdded: (item) {
          setState(() => _items.add(item));
        },
      ),
    );
  }

  Future<void> _saveInvoice() async {
    if (_selectedClient == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Selecteer een klant')));
      return;
    }

    if (_items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Voeg minimaal één post toe')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final firestoreService = context.read<FirestoreService>();
      final userId = authService.currentUserId!;

      // Generate invoice number
      final invoiceNumber = await firestoreService.generateInvoiceNumber(
        userId,
      );

      // Convert items
      final invoiceItems = _items
          .map(
            (item) => InvoiceItem(
              productId: item.productId ?? '',
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate,
            ),
          )
          .toList();

      // Create invoice
      final invoice = InvoiceModel(
        id: '',
        userId: userId,
        invoiceNumber: invoiceNumber,
        clientId: _selectedClient!.id,
        invoiceDate: _invoiceDate,
        dueDate: _dueDate,
        subtotal: _subtotal,
        vatAmount: _vatAmount,
        totalAmount: _total,
        status: InvoiceStatus.draft,
        notes: _notesController.text.trim().isEmpty
            ? null
            : _notesController.text.trim(),
        items: invoiceItems,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      await firestoreService.createInvoice(invoice, userId);

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Factuur aangemaakt')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Fout: $e')));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}

class InvoiceItemData {
  String? productId;
  String description;
  int quantity;
  double unitPrice;
  double vatRate;

  InvoiceItemData({
    this.productId,
    required this.description,
    this.quantity = 1,
    required this.unitPrice,
    this.vatRate = 0.21,
  });
}

class _ClientSelector extends StatelessWidget {
  final ClientModel? selectedClient;
  final Function(ClientModel) onClientSelected;

  const _ClientSelector({
    required this.selectedClient,
    required this.onClientSelected,
  });

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final firestoreService = context.read<FirestoreService>();
    final userId = authService.currentUserId;

    if (userId == null) return const SizedBox();

    return StreamBuilder<List<ClientModel>>(
      stream: firestoreService.streamClients(userId),
      builder: (context, snapshot) {
        final clients = snapshot.data ?? [];

        if (clients.isEmpty) {
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Geen klanten gevonden. Voeg eerst een klant toe.',
                style: TextStyle(color: ThemeConfig.textSecondary),
              ),
            ),
          );
        }

        return DropdownButtonFormField<ClientModel>(
          initialValue: selectedClient,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: 'Selecteer een klant',
          ),
          items: clients.map((client) {
            return DropdownMenuItem(
              value: client,
              child: Text(client.fullName),
            );
          }).toList(),
          onChanged: (client) {
            if (client != null) onClientSelected(client);
          },
          validator: (value) => value == null ? 'Verplicht' : null,
        );
      },
    );
  }
}

class _DatePicker extends StatelessWidget {
  final String label;
  final DateTime date;
  final Function(DateTime) onDateSelected;

  const _DatePicker({
    required this.label,
    required this.date,
    required this.onDateSelected,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM yyyy', 'nl_NL');

    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: date,
          firstDate: DateTime(2020),
          lastDate: DateTime(2030),
        );
        if (picked != null) onDateSelected(picked);
      },
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          suffixIcon: const Icon(Icons.calendar_today),
        ),
        child: Text(dateFormat.format(date)),
      ),
    );
  }
}

class _LineItemCard extends StatelessWidget {
  final InvoiceItemData item;
  final VoidCallback onRemove;
  final VoidCallback onChanged;

  const _LineItemCard({
    required this.item,
    required this.onRemove,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'nl_NL', symbol: '€');

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.description,
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${item.quantity}x ${currencyFormat.format(item.unitPrice)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: ThemeConfig.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Text(
              currencyFormat.format(item.quantity * item.unitPrice),
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            IconButton(
              icon: const Icon(Icons.delete, size: 20),
              onPressed: onRemove,
              color: Colors.red,
            ),
          ],
        ),
      ),
    );
  }
}

class LineItemFormSheet extends StatefulWidget {
  final Function(InvoiceItemData) onItemAdded;

  const LineItemFormSheet({super.key, required this.onItemAdded});

  @override
  State<LineItemFormSheet> createState() => _LineItemFormSheetState();
}

class _LineItemFormSheetState extends State<LineItemFormSheet> {
  final _formKey = GlobalKey<FormState>();
  ProductModel? _selectedProduct;
  final _descriptionController = TextEditingController();
  final _quantityController = TextEditingController(text: '1');
  final _unitPriceController = TextEditingController();
  final _vatRateController = TextEditingController(text: '21');

  @override
  void dispose() {
    _descriptionController.dispose();
    _quantityController.dispose();
    _unitPriceController.dispose();
    _vatRateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final firestoreService = context.read<FirestoreService>();
    final userId = authService.currentUserId;

    return DraggableScrollableSheet(
      initialChildSize: 0.8,
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
                      'Post toevoegen',
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
                      // Product Selection
                      if (userId != null)
                        StreamBuilder<List<ProductModel>>(
                          stream: firestoreService.streamProducts(userId),
                          builder: (context, snapshot) {
                            final products = snapshot.data ?? [];

                            if (products.isNotEmpty) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Of kies een bestaand product',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.bodySmall,
                                  ),
                                  const SizedBox(height: 8),
                                  DropdownButtonFormField<ProductModel>(
                                    initialValue: _selectedProduct,
                                    decoration: const InputDecoration(
                                      border: OutlineInputBorder(),
                                      hintText: 'Selecteer product (optioneel)',
                                    ),
                                    items: products.map((product) {
                                      return DropdownMenuItem(
                                        value: product,
                                        child: Text(product.name),
                                      );
                                    }).toList(),
                                    onChanged: (product) {
                                      setState(() {
                                        _selectedProduct = product;
                                        if (product != null) {
                                          _descriptionController.text =
                                              product.name;
                                          _unitPriceController.text = product
                                              .basePrice
                                              .toString();
                                          _vatRateController.text =
                                              (product.vatRate * 100)
                                                  .toString();
                                        }
                                      });
                                    },
                                  ),
                                  const SizedBox(height: 16),
                                  const Divider(),
                                  const SizedBox(height: 16),
                                ],
                              );
                            }
                            return const SizedBox();
                          },
                        ),

                      // Description
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

                      // Quantity & Unit Price
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _quantityController,
                              decoration: const InputDecoration(
                                labelText: 'Aantal *',
                                border: OutlineInputBorder(),
                              ),
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                              ],
                              validator: (value) {
                                if (value?.isEmpty ?? true) return 'Verplicht';
                                if (int.tryParse(value!) == null) {
                                  return 'Ongeldig';
                                }
                                return null;
                              },
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: _unitPriceController,
                              decoration: const InputDecoration(
                                labelText: 'Prijs per stuk (€) *',
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
                                  return 'Ongeldig';
                                }
                                return null;
                              },
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // VAT Rate
                      TextFormField(
                        controller: _vatRateController,
                        decoration: const InputDecoration(
                          labelText: 'BTW % *',
                          border: OutlineInputBorder(),
                          suffixText: '%',
                        ),
                        keyboardType: const TextInputType.numberWithOptions(
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

                      const SizedBox(height: 24),
                      // Add Button
                      ElevatedButton(
                        onPressed: _addItem,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: const Text('Toevoegen'),
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

  void _addItem() {
    if (!_formKey.currentState!.validate()) return;

    final item = InvoiceItemData(
      productId: _selectedProduct?.id,
      description: _descriptionController.text.trim(),
      quantity: int.parse(_quantityController.text.trim()),
      unitPrice: double.parse(_unitPriceController.text.trim()),
      vatRate: double.parse(_vatRateController.text.trim()) / 100,
    );

    widget.onItemAdded(item);
    Navigator.pop(context);
  }
}
