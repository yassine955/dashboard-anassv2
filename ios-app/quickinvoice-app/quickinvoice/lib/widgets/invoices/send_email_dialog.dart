import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/invoice_model.dart';
import '../../models/client_model.dart';
import '../../config/theme_config.dart';
import '../common/payment_provider_icons.dart';

class SendEmailDialog extends StatefulWidget {
  final InvoiceModel invoice;
  final ClientModel client;
  final VoidCallback onCancel;
  final Function(String customMessage, bool includePaymentLink) onSend;
  final bool isSending;

  const SendEmailDialog({
    super.key,
    required this.invoice,
    required this.client,
    required this.onCancel,
    required this.onSend,
    this.isSending = false,
  });

  @override
  State<SendEmailDialog> createState() => _SendEmailDialogState();
}

class _SendEmailDialogState extends State<SendEmailDialog> {
  final TextEditingController _messageController = TextEditingController();
  bool _includePaymentLink = false;

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'nl_NL', symbol: '€');

    return Dialog(
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 700),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: ThemeConfig.primaryColor.withOpacity(0.1),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(12),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.email,
                    color: ThemeConfig.primaryColor,
                    size: 28,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Factuur Verzenden',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Verstuur factuur ${widget.invoice.invoiceNumber}',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: widget.isSending ? null : widget.onCancel,
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),

            // Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Email recipient info
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.mail_outline,
                              color: Colors.blue.shade700, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Email wordt verzonden naar:',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: Colors.blue.shade900,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  widget.client.email,
                                  style: TextStyle(
                                    color: Colors.blue.shade700,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 16),

                    // PDF attachment notice
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.picture_as_pdf,
                              color: Colors.green.shade700, size: 24),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'PDF bijlage inbegrepen',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: Colors.green.shade900,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'De factuur wordt automatisch als PDF bijgevoegd',
                                  style: TextStyle(
                                    color: Colors.green.shade700,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Payment link checkbox
                    CheckboxListTile(
                      value: _includePaymentLink,
                      onChanged: widget.isSending
                          ? null
                          : (value) {
                              setState(() {
                                _includePaymentLink = value ?? false;
                              });
                            },
                      title: const Text(
                        'Voeg betaallink toe aan email',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                      contentPadding: EdgeInsets.zero,
                    ),

                    if (_includePaymentLink) ...[
                      Padding(
                        padding: const EdgeInsets.only(left: 40, top: 8),
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey.shade300),
                          ),
                          child: Row(
                            children: [
                              const TikkieIcon(size: 32),
                              const SizedBox(width: 12),
                              const Text(
                                'Tikkie (ABN AMRO)',
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 20),

                    // Custom message
                    const Text(
                      'Persoonlijk bericht (optioneel)',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _messageController,
                      enabled: !widget.isSending,
                      maxLines: 4,
                      decoration: InputDecoration(
                        hintText:
                            'Voeg een persoonlijk bericht toe aan de email...',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        filled: true,
                        fillColor: Colors.grey.shade50,
                      ),
                    ),

                    const SizedBox(height: 20),

                    // Invoice details
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Factuurdetails',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 12),
                          _buildDetailRow('Factuurnummer',
                              widget.invoice.invoiceNumber),
                          const SizedBox(height: 8),
                          _buildDetailRow('Bedrag',
                              currencyFormat.format(widget.invoice.totalAmount)),
                          const SizedBox(height: 8),
                          _buildDetailRow(
                            'Vervaldatum',
                            DateFormat('dd MMM yyyy', 'nl_NL')
                                .format(widget.invoice.dueDate),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Footer buttons
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(12),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton(
                    onPressed: widget.isSending ? null : widget.onCancel,
                    child: const Text('Annuleren'),
                  ),
                  const SizedBox(width: 12),
                  ElevatedButton(
                    onPressed: widget.isSending
                        ? null
                        : () {
                            widget.onSend(
                              _messageController.text,
                              _includePaymentLink,
                            );
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ThemeConfig.primaryColor,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 12,
                      ),
                    ),
                    child: widget.isSending
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Text(
                            'Factuur Verzenden',
                            style: TextStyle(color: Colors.white),
                          ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 14,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 14),
          ),
        ),
      ],
    );
  }
}