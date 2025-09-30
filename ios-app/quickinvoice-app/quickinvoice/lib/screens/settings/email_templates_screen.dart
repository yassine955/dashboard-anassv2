import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme_config.dart';
import '../../services/auth_service.dart';
import '../../widgets/common/app_drawer.dart';

class EmailTemplatesScreen extends StatefulWidget {
  const EmailTemplatesScreen({super.key});

  @override
  State<EmailTemplatesScreen> createState() => _EmailTemplatesScreenState();
}

class _EmailTemplatesScreenState extends State<EmailTemplatesScreen> {
  final _invoiceFormKey = GlobalKey<FormState>();
  final _reminderFormKey = GlobalKey<FormState>();

  late TextEditingController _invoiceSubjectController;
  late TextEditingController _invoiceContentController;
  late TextEditingController _reminderSubjectController;
  late TextEditingController _reminderContentController;

  bool _isLoading = false;
  bool _isSavingInvoice = false;
  bool _isSavingReminder = false;

  // Default templates
  static const String defaultInvoiceSubject = 'Nieuwe factuur {{invoice_number}}';
  static const String defaultInvoiceContent = '''Beste {{client_name}},

Hartelijk dank voor je opdracht! Hierbij ontva ng je factuur {{invoice_number}}.

Factuurbedrag: {{amount}}
Vervaldatum: {{due_date}}

Je kunt de factuur betalen via de volgende link:
{{payment_link}}

Bij vragen kun je altijd contact met ons opnemen.

Met vriendelijke groet,
{{company_name}}''';

  static const String defaultReminderSubject =
      'Betalingsherinnering factuur {{invoice_number}}';
  static const String defaultReminderContent = '''Beste {{client_name}},

We willen je vriendelijk herinneren aan factuur {{invoice_number}} die op {{due_date}} vervallen is.

Factuurbedrag: {{amount}}

Als je de factuur al hebt betaald, kun je deze email negeren.

Je kunt de factuur betalen via:
{{payment_link}}

Bij vragen staan we voor je klaar.

Met vriendelijke groet,
{{company_name}}''';

  @override
  void initState() {
    super.initState();
    _invoiceSubjectController = TextEditingController();
    _invoiceContentController = TextEditingController();
    _reminderSubjectController = TextEditingController();
    _reminderContentController = TextEditingController();
    _loadTemplates();
  }

  @override
  void dispose() {
    _invoiceSubjectController.dispose();
    _invoiceContentController.dispose();
    _reminderSubjectController.dispose();
    _reminderContentController.dispose();
    super.dispose();
  }

  Future<void> _loadTemplates() async {
    setState(() => _isLoading = true);
    try {
      final authService = context.read<AuthService>();
      final userData = await authService.getUserData();

      if (userData != null && mounted) {
        setState(() {
          _invoiceSubjectController.text =
              userData.emailTemplates?.invoiceEmail.subject ??
                  defaultInvoiceSubject;
          _invoiceContentController.text =
              userData.emailTemplates?.invoiceEmail.content ??
                  defaultInvoiceContent;
          _reminderSubjectController.text =
              userData.emailTemplates?.paymentReminder.subject ??
                  defaultReminderSubject;
          _reminderContentController.text =
              userData.emailTemplates?.paymentReminder.content ??
                  defaultReminderContent;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fout bij laden templates: $e'),
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

  Future<void> _saveInvoiceTemplate() async {
    if (!_invoiceFormKey.currentState!.validate()) return;

    setState(() => _isSavingInvoice = true);
    try {
      final authService = context.read<AuthService>();
      await authService.updateUserData({
        'emailTemplates.invoiceEmail': {
          'subject': _invoiceSubjectController.text.trim(),
          'content': _invoiceContentController.text.trim(),
          'isCustom': true,
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Factuur email template opgeslagen'),
            backgroundColor: ThemeConfig.successColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fout bij opslaan: $e'),
            backgroundColor: ThemeConfig.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSavingInvoice = false);
      }
    }
  }

  Future<void> _saveReminderTemplate() async {
    if (!_reminderFormKey.currentState!.validate()) return;

    setState(() => _isSavingReminder = true);
    try {
      final authService = context.read<AuthService>();
      await authService.updateUserData({
        'emailTemplates.paymentReminder': {
          'subject': _reminderSubjectController.text.trim(),
          'content': _reminderContentController.text.trim(),
          'isCustom': true,
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Herinnering email template opgeslagen'),
            backgroundColor: ThemeConfig.successColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fout bij opslaan: $e'),
            backgroundColor: ThemeConfig.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSavingReminder = false);
      }
    }
  }

  void _resetInvoiceTemplate() {
    setState(() {
      _invoiceSubjectController.text = defaultInvoiceSubject;
      _invoiceContentController.text = defaultInvoiceContent;
    });
  }

  void _resetReminderTemplate() {
    setState(() {
      _reminderSubjectController.text = defaultReminderSubject;
      _reminderContentController.text = defaultReminderContent;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Email Templates'),
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Available Variables Info
                  Card(
                    color: ThemeConfig.primaryColor.withValues(alpha: 0.1),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.info_outline,
                                color: ThemeConfig.primaryColor,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Beschikbare variabelen',
                                style: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.copyWith(
                                      color: ThemeConfig.primaryColor,
                                      fontWeight: FontWeight.bold,
                                    ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _VariableChip('{{client_name}}'),
                              _VariableChip('{{invoice_number}}'),
                              _VariableChip('{{amount}}'),
                              _VariableChip('{{due_date}}'),
                              _VariableChip('{{payment_link}}'),
                              _VariableChip('{{company_name}}'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Invoice Email Template
                  Text(
                    'Factuur Email Template',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                  _buildInvoiceTemplateForm(),
                  const SizedBox(height: 32),

                  // Payment Reminder Template
                  Text(
                    'Betalingsherinnering Template',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                  const SizedBox(height: 12),
                  _buildReminderTemplateForm(),
                ],
              ),
            ),
    );
  }

  Widget _buildInvoiceTemplateForm() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _invoiceFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _invoiceSubjectController,
                decoration: const InputDecoration(
                  labelText: 'Email Onderwerp *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Verplicht' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _invoiceContentController,
                decoration: const InputDecoration(
                  labelText: 'Email Inhoud *',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                maxLines: 12,
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Verplicht' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _resetInvoiceTemplate,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Standaard herstellen'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _isSavingInvoice ? null : _saveInvoiceTemplate,
                      icon: _isSavingInvoice
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.save),
                      label: const Text('Opslaan'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReminderTemplateForm() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _reminderFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextFormField(
                controller: _reminderSubjectController,
                decoration: const InputDecoration(
                  labelText: 'Email Onderwerp *',
                  border: OutlineInputBorder(),
                ),
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Verplicht' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _reminderContentController,
                decoration: const InputDecoration(
                  labelText: 'Email Inhoud *',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                maxLines: 12,
                validator: (value) =>
                    value?.isEmpty ?? true ? 'Verplicht' : null,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _resetReminderTemplate,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Standaard herstellen'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed:
                          _isSavingReminder ? null : _saveReminderTemplate,
                      icon: _isSavingReminder
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.save),
                      label: const Text('Opslaan'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VariableChip extends StatelessWidget {
  final String variable;

  const _VariableChip(this.variable);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ThemeConfig.primaryColor),
      ),
      child: Text(
        variable,
        style: const TextStyle(
          fontSize: 12,
          fontFamily: 'monospace',
          color: ThemeConfig.primaryColor,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}