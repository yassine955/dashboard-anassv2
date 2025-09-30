import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../models/client_model.dart';
import '../../models/user_model.dart';
import '../../models/invoice_model.dart';
import '../../widgets/common/app_drawer.dart';
import '../../widgets/common/avatar_widget.dart';
import '../../config/theme_config.dart';

class ClientsScreen extends StatefulWidget {
  const ClientsScreen({super.key});

  @override
  State<ClientsScreen> createState() => _ClientsScreenState();
}

class _ClientsScreenState extends State<ClientsScreen> {
  String _searchQuery = '';
  ClientStatus? _statusFilter;

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
        title: const Text('Klanten'),
        actions: [
          if (_statusFilter != null)
            IconButton(
              icon: const Icon(Icons.filter_alt_off),
              onPressed: () => setState(() => _statusFilter = null),
              tooltip: 'Filter wissen',
            ),
          PopupMenuButton<ClientStatus>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter op status',
            onSelected: (status) => setState(() => _statusFilter = status),
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: ClientStatus.active,
                child: Text('Actief'),
              ),
              const PopupMenuItem(
                value: ClientStatus.inactive,
                child: Text('Inactief'),
              ),
              const PopupMenuItem(
                value: ClientStatus.archived,
                child: Text('Gearchiveerd'),
              ),
            ],
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Zoek klanten...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
              ),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),

          // Clients List
          Expanded(
            child: StreamBuilder<List<ClientModel>>(
              stream: firestoreService.streamClients(userId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return Center(child: Text('Fout: ${snapshot.error}'));
                }

                final clients = snapshot.data ?? [];

                // Apply filters
                final filteredClients = clients.where((client) {
                  final matchesSearch =
                      _searchQuery.isEmpty ||
                      client.fullName.toLowerCase().contains(
                        _searchQuery.toLowerCase(),
                      ) ||
                      client.email.toLowerCase().contains(
                        _searchQuery.toLowerCase(),
                      ) ||
                      (client.companyName?.toLowerCase().contains(
                            _searchQuery.toLowerCase(),
                          ) ??
                          false);

                  final matchesStatus =
                      _statusFilter == null || client.status == _statusFilter;

                  return matchesSearch && matchesStatus;
                }).toList();

                if (filteredClients.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.people_outline,
                          size: 64,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _searchQuery.isEmpty
                              ? 'Nog geen klanten'
                              : 'Geen klanten gevonden',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(color: ThemeConfig.textSecondary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Voeg je eerste klant toe',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: ThemeConfig.textSecondary),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  itemCount: filteredClients.length,
                  itemBuilder: (context, index) {
                    final client = filteredClients[index];
                    return _ClientCard(
                      client: client,
                      onTap: () => _showClientDetails(context, client),
                      onEdit: () => _showClientForm(context, client: client),
                      onDelete: () => _deleteClient(context, client),
                      onEmail: () => _sendEmail(context, client),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showClientForm(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showClientDetails(BuildContext context, ClientModel client) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ClientDetailsSheet(client: client),
    );
  }

  void _showClientForm(BuildContext context, {ClientModel? client}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ClientFormSheet(client: client),
    );
  }

  void _sendEmail(BuildContext context, ClientModel client) {
    // Email functionality placeholder
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Email naar ${client.email} wordt voorbereid...'),
        backgroundColor: ThemeConfig.primaryColor,
      ),
    );
  }

  Future<void> _deleteClient(BuildContext context, ClientModel client) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Klant verwijderen'),
        content: Text(
          'Weet je zeker dat je ${client.fullName} wilt verwijderen?',
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
        await context.read<FirestoreService>().deleteClient(client.id);
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Klant verwijderd')));
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
}

class _ClientCard extends StatelessWidget {
  final ClientModel client;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onEmail;

  const _ClientCard({
    required this.client,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
    required this.onEmail,
  });

  @override
  Widget build(BuildContext context) {
    // Generate initials from first and last name
    final initials =
        '${client.firstName[0]}${client.lastName.isNotEmpty ? client.lastName[0] : ''}';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Avatar with initials
              AvatarWidget(initials: initials, size: 48),
              const SizedBox(width: 12),
              // Client info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      client.fullName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      client.email,
                      style: TextStyle(
                        color: ThemeConfig.textSecondary,
                        fontSize: 14,
                      ),
                    ),
                    if (client.companyName != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        client.companyName!,
                        style: TextStyle(
                          color: ThemeConfig.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              // Actions
              IconButton(
                icon: const Icon(Icons.email_outlined, size: 20),
                onPressed: onEmail,
                tooltip: 'Email versturen',
              ),
              _StatusBadge(status: client.status),
              const SizedBox(width: 4),
              PopupMenuButton(
                icon: const Icon(Icons.more_vert),
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: 'edit',
                    onTap: onEdit,
                    child: const Row(
                      children: [
                        Icon(Icons.edit, size: 20),
                        SizedBox(width: 8),
                        Text('Bewerken'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'delete',
                    onTap: onDelete,
                    child: const Row(
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
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final ClientStatus status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (status) {
      case ClientStatus.active:
        color = ThemeConfig.successColor;
        label = 'Actief';
        break;
      case ClientStatus.inactive:
        color = ThemeConfig.warningColor;
        label = 'Inactief';
        break;
      case ClientStatus.archived:
        color = ThemeConfig.textSecondary;
        label = 'Gearchiveerd';
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

/// Client Details Sheet with statistics and actions
class ClientDetailsSheet extends StatelessWidget {
  final ClientModel client;

  const ClientDetailsSheet({super.key, required this.client});

  @override
  Widget build(BuildContext context) {
    final authService = context.read<AuthService>();
    final userId = authService.currentUserId!;

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

              // Header with avatar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    AvatarWidget(
                      initials:
                          '${client.firstName[0]}${client.lastName.isNotEmpty ? client.lastName[0] : ''}',
                      size: 60,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            client.fullName,
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          Text(
                            client.email,
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(color: ThemeConfig.textSecondary),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              const Divider(),

              // Statistics from invoices
              Expanded(
                child: StreamBuilder<QuerySnapshot>(
                  stream: FirebaseFirestore.instance
                      .collection('invoices')
                      .where('userId', isEqualTo: userId)
                      .where('clientId', isEqualTo: client.id)
                      .snapshots(),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    final invoices = snapshot.data!.docs
                        .map((doc) => InvoiceModel.fromFirestore(doc))
                        .toList();

                    final totalInvoices = invoices.length;
                    final totalRevenue = invoices
                        .where((inv) => inv.status == InvoiceStatus.paid)
                        .fold<double>(0, (sum, inv) => sum + inv.totalAmount);
                    final pendingAmount = invoices
                        .where(
                          (inv) =>
                              inv.status != InvoiceStatus.paid &&
                              inv.status != InvoiceStatus.cancelled,
                        )
                        .fold<double>(0, (sum, inv) => sum + inv.totalAmount);
                    final lastInvoiceDate = invoices.isNotEmpty
                        ? invoices
                              .reduce(
                                (a, b) => a.invoiceDate.isAfter(b.invoiceDate)
                                    ? a
                                    : b,
                              )
                              .invoiceDate
                        : null;

                    return ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.all(20),
                      children: [
                        // Statistics Section
                        Text(
                          'Statistieken',
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
                          children: [
                            _buildStatCard(
                              context,
                              'Totaal Facturen',
                              totalInvoices.toString(),
                              Icons.receipt_long,
                              ThemeConfig.primaryColor,
                            ),
                            _buildStatCard(
                              context,
                              'Totale Omzet',
                              NumberFormat.currency(
                                symbol: '€',
                                decimalDigits: 0,
                              ).format(totalRevenue),
                              Icons.euro,
                              ThemeConfig.successColor,
                            ),
                            _buildStatCard(
                              context,
                              'Openstaand',
                              NumberFormat.currency(
                                symbol: '€',
                                decimalDigits: 0,
                              ).format(pendingAmount),
                              Icons.pending,
                              ThemeConfig.warningColor,
                            ),
                            _buildStatCard(
                              context,
                              'Laatste Factuur',
                              lastInvoiceDate != null
                                  ? DateFormat(
                                      'dd MMM',
                                      'nl',
                                    ).format(lastInvoiceDate)
                                  : 'Geen',
                              Icons.calendar_today,
                              ThemeConfig.textSecondary,
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // View Invoices Button
                        if (totalInvoices > 0)
                          ElevatedButton.icon(
                            onPressed: () {
                              Navigator.pop(context);
                              context.go('/invoices?clientId=${client.id}');
                            },
                            icon: const Icon(Icons.receipt),
                            label: Text('Bekijk facturen ($totalInvoices)'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                          ),

                        const SizedBox(height: 24),

                        // Client Details
                        Text(
                          'Klantgegevens',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 16),
                        _buildDetailRow(
                          Icons.business,
                          'Bedrijf',
                          client.companyName ?? 'Niet opgegeven',
                        ),
                        _buildDetailRow(
                          Icons.phone,
                          'Telefoon',
                          client.phone ?? 'Niet opgegeven',
                        ),
                        _buildDetailRow(
                          Icons.location_on,
                          'Adres',
                          '${client.address.street}, ${client.address.postalCode} ${client.address.city}',
                        ),
                        if (client.kvkNumber != null)
                          _buildDetailRow(
                            Icons.business_center,
                            'KVK',
                            client.kvkNumber!,
                          ),
                        if (client.vatNumber != null)
                          _buildDetailRow(
                            Icons.receipt,
                            'BTW',
                            client.vatNumber!,
                          ),

                        const SizedBox(height: 24),

                        // Notes Section
                        if (client.notes != null &&
                            client.notes!.isNotEmpty) ...[
                          Text(
                            'Notities',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: ThemeConfig.bgSecondary,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(client.notes!),
                          ),
                        ],
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatCard(
    BuildContext context,
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: color,
              fontWeight: FontWeight.bold,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            label,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: ThemeConfig.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: ThemeConfig.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: ThemeConfig.textSecondary,
                  ),
                ),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ClientFormSheet extends StatefulWidget {
  final ClientModel? client;

  const ClientFormSheet({super.key, this.client});

  @override
  State<ClientFormSheet> createState() => _ClientFormSheetState();
}

class _ClientFormSheetState extends State<ClientFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _firstNameController;
  late TextEditingController _lastNameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;
  late TextEditingController _companyNameController;
  late TextEditingController _kvkNumberController;
  late TextEditingController _vatNumberController;
  late TextEditingController _streetController;
  late TextEditingController _cityController;
  late TextEditingController _postalCodeController;
  late TextEditingController _countryController;
  late TextEditingController _notesController;
  late ClientStatus _status;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final client = widget.client;
    _firstNameController = TextEditingController(text: client?.firstName);
    _lastNameController = TextEditingController(text: client?.lastName);
    _emailController = TextEditingController(text: client?.email);
    _phoneController = TextEditingController(text: client?.phone);
    _companyNameController = TextEditingController(text: client?.companyName);
    _kvkNumberController = TextEditingController(text: client?.kvkNumber);
    _vatNumberController = TextEditingController(text: client?.vatNumber);
    _streetController = TextEditingController(text: client?.address.street);
    _cityController = TextEditingController(text: client?.address.city);
    _postalCodeController = TextEditingController(
      text: client?.address.postalCode,
    );
    _countryController = TextEditingController(
      text: client?.address.country ?? 'Nederland',
    );
    _notesController = TextEditingController(text: client?.notes);
    _status = client?.status ?? ClientStatus.active;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _companyNameController.dispose();
    _kvkNumberController.dispose();
    _vatNumberController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    _countryController.dispose();
    _notesController.dispose();
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
                      widget.client == null ? 'Nieuwe klant' : 'Klant bewerken',
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
                      // Personal Info
                      Text(
                        'Persoonlijke gegevens',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _firstNameController,
                              decoration: const InputDecoration(
                                labelText: 'Voornaam *',
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) =>
                                  value?.isEmpty ?? true ? 'Verplicht' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _lastNameController,
                              decoration: const InputDecoration(
                                labelText: 'Achternaam *',
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) =>
                                  value?.isEmpty ?? true ? 'Verplicht' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _emailController,
                        decoration: const InputDecoration(
                          labelText: 'Email *',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.emailAddress,
                        validator: (value) {
                          if (value?.isEmpty ?? true) return 'Verplicht';
                          if (!value!.contains('@')) return 'Ongeldig email';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _phoneController,
                        decoration: const InputDecoration(
                          labelText: 'Telefoon',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.phone,
                      ),

                      const SizedBox(height: 24),
                      // Company Info
                      Text(
                        'Bedrijfsgegevens',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _companyNameController,
                        decoration: const InputDecoration(
                          labelText: 'Bedrijfsnaam',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _kvkNumberController,
                              decoration: const InputDecoration(
                                labelText: 'KVK nummer',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              controller: _vatNumberController,
                              decoration: const InputDecoration(
                                labelText: 'BTW nummer',
                                border: OutlineInputBorder(),
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),
                      // Address
                      Text(
                        'Adres',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _streetController,
                        decoration: const InputDecoration(
                          labelText: 'Straat en huisnummer *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) =>
                            value?.isEmpty ?? true ? 'Verplicht' : null,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              controller: _postalCodeController,
                              decoration: const InputDecoration(
                                labelText: 'Postcode *',
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) =>
                                  value?.isEmpty ?? true ? 'Verplicht' : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: _cityController,
                              decoration: const InputDecoration(
                                labelText: 'Plaats *',
                                border: OutlineInputBorder(),
                              ),
                              validator: (value) =>
                                  value?.isEmpty ?? true ? 'Verplicht' : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _countryController,
                        decoration: const InputDecoration(
                          labelText: 'Land *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) =>
                            value?.isEmpty ?? true ? 'Verplicht' : null,
                      ),

                      const SizedBox(height: 24),
                      // Status
                      Text(
                        'Status',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<ClientStatus>(
                        initialValue: _status,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: ClientStatus.active,
                            child: Text('Actief'),
                          ),
                          DropdownMenuItem(
                            value: ClientStatus.inactive,
                            child: Text('Inactief'),
                          ),
                          DropdownMenuItem(
                            value: ClientStatus.archived,
                            child: Text('Gearchiveerd'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) setState(() => _status = value);
                        },
                      ),

                      const SizedBox(height: 24),
                      // Notes (Enhanced with larger field)
                      Text(
                        'Notities',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _notesController,
                        decoration: const InputDecoration(
                          labelText: 'Notities',
                          border: OutlineInputBorder(),
                          hintText: 'Voeg notities toe over deze klant...',
                        ),
                        maxLines: 5,
                      ),

                      const SizedBox(height: 24),
                      // Submit Button
                      ElevatedButton(
                        onPressed: _isLoading ? null : _saveClient,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : Text(
                                widget.client == null ? 'Toevoegen' : 'Opslaan',
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

  Future<void> _saveClient() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final firestoreService = context.read<FirestoreService>();
      final userId = authService.currentUserId!;

      final address = Address(
        street: _streetController.text.trim(),
        city: _cityController.text.trim(),
        postalCode: _postalCodeController.text.trim(),
        country: _countryController.text.trim(),
      );

      if (widget.client == null) {
        // Create new client
        final client = ClientModel(
          id: '',
          userId: userId,
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          email: _emailController.text.trim(),
          phone: _phoneController.text.trim().isEmpty
              ? null
              : _phoneController.text.trim(),
          companyName: _companyNameController.text.trim().isEmpty
              ? null
              : _companyNameController.text.trim(),
          kvkNumber: _kvkNumberController.text.trim().isEmpty
              ? null
              : _kvkNumberController.text.trim(),
          vatNumber: _vatNumberController.text.trim().isEmpty
              ? null
              : _vatNumberController.text.trim(),
          address: address,
          notes: _notesController.text.trim().isEmpty
              ? null
              : _notesController.text.trim(),
          status: _status,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        await firestoreService.createClient(client, userId);

        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Klant toegevoegd')));
        }
      } else {
        // Update existing client
        final updateData = {
          'firstName': _firstNameController.text.trim(),
          'lastName': _lastNameController.text.trim(),
          'email': _emailController.text.trim(),
          'phone': _phoneController.text.trim().isEmpty
              ? null
              : _phoneController.text.trim(),
          'companyName': _companyNameController.text.trim().isEmpty
              ? null
              : _companyNameController.text.trim(),
          'kvkNumber': _kvkNumberController.text.trim().isEmpty
              ? null
              : _kvkNumberController.text.trim(),
          'vatNumber': _vatNumberController.text.trim().isEmpty
              ? null
              : _vatNumberController.text.trim(),
          'address': address.toMap(),
          'notes': _notesController.text.trim().isEmpty
              ? null
              : _notesController.text.trim(),
          'status': _status.toString().split('.').last,
        };

        await firestoreService.updateClient(widget.client!.id, updateData);

        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Klant bijgewerkt')));
        }
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
