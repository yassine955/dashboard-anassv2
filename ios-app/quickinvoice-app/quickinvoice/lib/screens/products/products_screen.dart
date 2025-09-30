import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../models/product_model.dart';
import '../../models/invoice_model.dart';
import '../../widgets/common/app_drawer.dart';
import '../../widgets/common/avatar_widget.dart';
import '../../config/theme_config.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  String _searchQuery = '';
  String? _categoryFilter;

  final List<String> _categories = [
    'Video Editing',
    'Grafisch Ontwerp',
    'Motion Graphics',
    'Color Grading',
    'Sound Design',
    'Photography',
    'Overig',
  ];

  // Category colors for colored chips
  Color _getCategoryColor(String category) {
    final categoryColors = {
      'Video Editing': const Color(0xFF2196F3),
      'Grafisch Ontwerp': const Color(0xFF9C27B0),
      'Motion Graphics': const Color(0xFFFF9800),
      'Color Grading': const Color(0xFF00BCD4),
      'Sound Design': const Color(0xFF4CAF50),
      'Photography': const Color(0xFFE91E63),
      'Overig': const Color(0xFF607D8B),
    };
    return categoryColors[category] ?? ThemeConfig.textSecondary;
  }

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
        title: const Text('Producten & Diensten'),
        actions: [
          if (_categoryFilter != null)
            IconButton(
              icon: const Icon(Icons.filter_alt_off),
              onPressed: () => setState(() => _categoryFilter = null),
              tooltip: 'Filter wissen',
            ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filter op categorie',
            onSelected: (category) =>
                setState(() => _categoryFilter = category),
            itemBuilder: (context) => _categories
                .map((cat) => PopupMenuItem(value: cat, child: Text(cat)))
                .toList(),
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
                hintText: 'Zoek producten...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
              ),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),

          // Products List
          Expanded(
            child: StreamBuilder<List<ProductModel>>(
              stream: firestoreService.streamProducts(userId),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return Center(child: Text('Fout: ${snapshot.error}'));
                }

                final products = snapshot.data ?? [];

                // Apply filters
                final filteredProducts = products.where((product) {
                  final matchesSearch =
                      _searchQuery.isEmpty ||
                      product.name.toLowerCase().contains(
                        _searchQuery.toLowerCase(),
                      ) ||
                      product.description.toLowerCase().contains(
                        _searchQuery.toLowerCase(),
                      );

                  final matchesCategory =
                      _categoryFilter == null ||
                      product.category == _categoryFilter;

                  return matchesSearch && matchesCategory;
                }).toList();

                if (filteredProducts.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.inventory_2_outlined,
                          size: 64,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _searchQuery.isEmpty
                              ? 'Nog geen producten'
                              : 'Geen producten gevonden',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(color: ThemeConfig.textSecondary),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Voeg je eerste product of dienst toe',
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
                  itemCount: filteredProducts.length,
                  itemBuilder: (context, index) {
                    final product = filteredProducts[index];
                    return _ProductCard(
                      product: product,
                      categoryColor: _getCategoryColor(product.category),
                      onEdit: () => _showProductForm(context, product: product),
                      onDelete: () => _deleteProduct(context, product),
                      onDuplicate: () => _duplicateProduct(context, product),
                      onViewDetails: () => _showProductDetails(context, product),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showProductForm(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showProductForm(BuildContext context, {ProductModel? product}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) =>
          ProductFormSheet(product: product, categories: _categories),
    );
  }

  void _showProductDetails(BuildContext context, ProductModel product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ProductDetailsSheet(product: product),
    );
  }

  Future<void> _deleteProduct(
    BuildContext context,
    ProductModel product,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Product verwijderen'),
        content: Text('Weet je zeker dat je ${product.name} wilt verwijderen?'),
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
        await context.read<FirestoreService>().deleteProduct(product.id);
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Product verwijderd')));
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

  Future<void> _duplicateProduct(
    BuildContext context,
    ProductModel product,
  ) async {
    try {
      final authService = context.read<AuthService>();
      final firestoreService = context.read<FirestoreService>();
      final userId = authService.currentUserId!;

      final duplicated = ProductModel(
        id: '',
        userId: userId,
        name: '${product.name} (Copy)',
        description: product.description,
        basePrice: product.basePrice,
        category: product.category,
        deliveryTime: product.deliveryTime,
        fileFormats: product.fileFormats,
        revisionRounds: product.revisionRounds,
        vatRate: product.vatRate,
        status: product.status,
        imageUrl: product.imageUrl,
        discount: product.discount,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      await firestoreService.createProduct(duplicated, userId);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Product gedupliceerd')),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fout: $e')),
        );
      }
    }
  }
}

class _ProductCard extends StatelessWidget {
  final ProductModel product;
  final Color categoryColor;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onDuplicate;
  final VoidCallback onViewDetails;

  const _ProductCard({
    required this.product,
    required this.categoryColor,
    required this.onEdit,
    required this.onDelete,
    required this.onDuplicate,
    required this.onViewDetails,
  });

  @override
  Widget build(BuildContext context) {
    final currencyFormat = NumberFormat.currency(locale: 'nl_NL', symbol: '€');

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onViewDetails,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Product thumbnail
                  AvatarWidget(
                    imageUrl: product.imageUrl,
                    initials: product.name.substring(0, 2),
                    size: 48,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        // Colored category chip
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: categoryColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                              color: categoryColor.withOpacity(0.3),
                            ),
                          ),
                          child: Text(
                            product.category,
                            style: TextStyle(
                              color: categoryColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      if (product.discount > 0) ...[
                        Text(
                          currencyFormat.format(product.basePrice),
                          style: TextStyle(
                            fontSize: 14,
                            color: ThemeConfig.textSecondary,
                            decoration: TextDecoration.lineThrough,
                          ),
                        ),
                        Text(
                          currencyFormat.format(
                            product.basePrice * (1 - product.discount / 100),
                          ),
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: ThemeConfig.successColor,
                          ),
                        ),
                      ] else
                        Text(
                          currencyFormat.format(product.basePrice),
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: ThemeConfig.primaryColor,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(width: 8),
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
                        value: 'duplicate',
                        onTap: onDuplicate,
                        child: const Row(
                          children: [
                            Icon(Icons.content_copy, size: 20),
                            SizedBox(width: 8),
                            Text('Dupliceren'),
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
              const SizedBox(height: 12),
              Text(
                product.description,
                style: TextStyle(color: ThemeConfig.textSecondary, fontSize: 14),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _InfoChip(
                    icon: Icons.sync,
                    label: '${product.revisionRounds} revisies',
                  ),
                  if (product.deliveryTime != null)
                    _InfoChip(
                      icon: Icons.access_time,
                      label: product.deliveryTime!,
                    ),
                  _InfoChip(
                    icon: Icons.receipt,
                    label: 'BTW ${(product.vatRate * 100).toInt()}%',
                  ),
                  if (product.discount > 0)
                    _InfoChip(
                      icon: Icons.local_offer,
                      label: '${product.discount.toInt()}% korting',
                      color: ThemeConfig.successColor,
                    ),
                  if (product.usageCount > 0)
                    _InfoChip(
                      icon: Icons.trending_up,
                      label: '${product.usageCount}x gebruikt',
                      color: ThemeConfig.successColor,
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

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;

  const _InfoChip({required this.icon, required this.label, this.color});

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? ThemeConfig.textSecondary;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: chipColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: chipColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: chipColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// Product Details Sheet with Usage Statistics
class ProductDetailsSheet extends StatelessWidget {
  final ProductModel product;

  const ProductDetailsSheet({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    final authService = context.read<AuthService>();
    final userId = authService.currentUserId;

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.5,
      maxChildSize: 0.9,
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
                    AvatarWidget(
                      imageUrl: product.imageUrl,
                      initials: product.name.substring(0, 2),
                      size: 56,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        product.name,
                        style: Theme.of(context).textTheme.headlineSmall,
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

              // Content with statistics
              Expanded(
                child: StreamBuilder<QuerySnapshot>(
                  stream: FirebaseFirestore.instance
                      .collection('invoices')
                      .where('userId', isEqualTo: userId)
                      .snapshots(),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }

                    // Calculate usage statistics
                    int timesUsed = 0;
                    double totalRevenue = 0;
                    DateTime? lastUsed;

                    for (final doc in snapshot.data!.docs) {
                      final invoice = InvoiceModel.fromFirestore(doc);
                      for (final item in invoice.items) {
                        if (item.productId == product.id) {
                          timesUsed += item.quantity;
                          if (invoice.status == InvoiceStatus.paid) {
                            totalRevenue += item.total;
                          }
                          if (lastUsed == null ||
                              invoice.invoiceDate.isAfter(lastUsed)) {
                            lastUsed = invoice.invoiceDate;
                          }
                        }
                      }
                    }

                    final currencyFormat = NumberFormat.currency(
                      locale: 'nl_NL',
                      symbol: '€',
                    );
                    final dateFormat = DateFormat('dd MMM yyyy', 'nl_NL');

                    return ListView(
                      controller: scrollController,
                      padding: const EdgeInsets.all(20),
                      children: [
                        // Usage Statistics Section
                        Text(
                          'Gebruiksstatistieken',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 16),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              children: [
                                _StatRow(
                                  icon: Icons.shopping_cart,
                                  label: 'Keer gebruikt',
                                  value: timesUsed.toString(),
                                  color: ThemeConfig.primaryColor,
                                ),
                                const Divider(),
                                _StatRow(
                                  icon: Icons.euro,
                                  label: 'Totale omzet',
                                  value: currencyFormat.format(totalRevenue),
                                  color: ThemeConfig.successColor,
                                ),
                                const Divider(),
                                _StatRow(
                                  icon: Icons.calendar_today,
                                  label: 'Laatst gebruikt',
                                  value: lastUsed != null
                                      ? dateFormat.format(lastUsed)
                                      : 'Nog niet gebruikt',
                                  color: ThemeConfig.textSecondary,
                                ),
                              ],
                            ),
                          ),
                        ),

                        const SizedBox(height: 24),

                        // Product Details Section
                        Text(
                          'Product Details',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 16),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                _DetailRow(
                                  label: 'Beschrijving',
                                  value: product.description,
                                ),
                                const Divider(),
                                _DetailRow(
                                  label: 'Categorie',
                                  value: product.category,
                                ),
                                const Divider(),
                                _DetailRow(
                                  label: 'Basisprijs',
                                  value: currencyFormat.format(product.basePrice),
                                ),
                                if (product.discount > 0) ...[
                                  const Divider(),
                                  _DetailRow(
                                    label: 'Korting',
                                    value: '${product.discount.toInt()}%',
                                  ),
                                  const Divider(),
                                  _DetailRow(
                                    label: 'Prijs na korting',
                                    value: currencyFormat.format(
                                      product.basePrice *
                                          (1 - product.discount / 100),
                                    ),
                                  ),
                                ],
                                const Divider(),
                                _DetailRow(
                                  label: 'BTW tarief',
                                  value: '${(product.vatRate * 100).toInt()}%',
                                ),
                                if (product.deliveryTime != null) ...[
                                  const Divider(),
                                  _DetailRow(
                                    label: 'Levertijd',
                                    value: product.deliveryTime!,
                                  ),
                                ],
                                if (product.fileFormats != null) ...[
                                  const Divider(),
                                  _DetailRow(
                                    label: 'Bestandsformaten',
                                    value: product.fileFormats!,
                                  ),
                                ],
                                const Divider(),
                                _DetailRow(
                                  label: 'Revisierondes',
                                  value: product.revisionRounds.toString(),
                                ),
                                const Divider(),
                                _DetailRow(
                                  label: 'Status',
                                  value: _getStatusText(product.status),
                                ),
                              ],
                            ),
                          ),
                        ),
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

  String _getStatusText(ProductStatus status) {
    switch (status) {
      case ProductStatus.active:
        return 'Actief';
      case ProductStatus.inactive:
        return 'Inactief';
      case ProductStatus.discontinued:
        return 'Stopgezet';
    }
  }
}

class _StatRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;

  const _DetailRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                color: ThemeConfig.textSecondary,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ProductFormSheet extends StatefulWidget {
  final ProductModel? product;
  final List<String> categories;

  const ProductFormSheet({super.key, this.product, required this.categories});

  @override
  State<ProductFormSheet> createState() => _ProductFormSheetState();
}

class _ProductFormSheetState extends State<ProductFormSheet> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _nameController;
  late TextEditingController _descriptionController;
  late TextEditingController _basePriceController;
  late TextEditingController _deliveryTimeController;
  late TextEditingController _fileFormatsController;
  late TextEditingController _revisionRoundsController;
  late TextEditingController _vatRateController;
  late TextEditingController _imageUrlController;
  late TextEditingController _discountController;
  late String _category;
  late ProductStatus _status;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final product = widget.product;
    _nameController = TextEditingController(text: product?.name);
    _descriptionController = TextEditingController(text: product?.description);
    _basePriceController = TextEditingController(
      text: product?.basePrice.toString() ?? '',
    );
    _deliveryTimeController = TextEditingController(
      text: product?.deliveryTime,
    );
    _fileFormatsController = TextEditingController(text: product?.fileFormats);
    _revisionRoundsController = TextEditingController(
      text: product?.revisionRounds.toString() ?? '2',
    );
    _vatRateController = TextEditingController(
      text: ((product?.vatRate ?? 0.21) * 100).toString(),
    );
    _imageUrlController = TextEditingController(text: product?.imageUrl);
    _discountController = TextEditingController(
      text: product?.discount.toString() ?? '0',
    );
    // Ensure category is valid, default to first if not found
    _category = (product?.category != null && widget.categories.contains(product!.category))
        ? product.category
        : widget.categories.first;
    _status = product?.status ?? ProductStatus.active;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _basePriceController.dispose();
    _deliveryTimeController.dispose();
    _fileFormatsController.dispose();
    _revisionRoundsController.dispose();
    _vatRateController.dispose();
    _imageUrlController.dispose();
    _discountController.dispose();
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
                      widget.product == null
                          ? 'Nieuw product'
                          : 'Product bewerken',
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
                      // Basic Info
                      Text(
                        'Basis informatie',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _nameController,
                        decoration: const InputDecoration(
                          labelText: 'Product naam *',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) =>
                            value?.isEmpty ?? true ? 'Verplicht' : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _descriptionController,
                        decoration: const InputDecoration(
                          labelText: 'Beschrijving *',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 3,
                        validator: (value) =>
                            value?.isEmpty ?? true ? 'Verplicht' : null,
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        initialValue: _category,
                        decoration: const InputDecoration(
                          labelText: 'Categorie *',
                          border: OutlineInputBorder(),
                        ),
                        items: widget.categories
                            .map(
                              (cat) => DropdownMenuItem(
                                value: cat,
                                child: Text(cat),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          if (value != null) setState(() => _category = value);
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _imageUrlController,
                        decoration: const InputDecoration(
                          labelText: 'Afbeelding URL (optioneel)',
                          hintText: 'https://...',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.image),
                        ),
                        keyboardType: TextInputType.url,
                      ),

                      const SizedBox(height: 24),
                      // Pricing
                      Text(
                        'Prijzen',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            flex: 2,
                            child: TextFormField(
                              controller: _basePriceController,
                              decoration: const InputDecoration(
                                labelText: 'Basisprijs (€) *',
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
                      TextFormField(
                        controller: _discountController,
                        decoration: const InputDecoration(
                          labelText: 'Korting (%)',
                          hintText: '0-100',
                          border: OutlineInputBorder(),
                          suffixText: '%',
                          helperText: 'Kortingspercentage op basisprijs',
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
                          if (value == null || value.isEmpty) return null;
                          final discount = double.tryParse(value);
                          if (discount == null ||
                              discount < 0 ||
                              discount > 100) {
                            return 'Moet tussen 0 en 100 zijn';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 24),
                      // Details
                      Text(
                        'Details',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _deliveryTimeController,
                        decoration: const InputDecoration(
                          labelText: 'Levertijd',
                          hintText: 'bijv. 3-5 werkdagen',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _fileFormatsController,
                        decoration: const InputDecoration(
                          labelText: 'Bestandsformaten',
                          hintText: 'bijv. MP4, MOV, ProRes',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _revisionRoundsController,
                        decoration: const InputDecoration(
                          labelText: 'Aantal revisierondes *',
                          border: OutlineInputBorder(),
                        ),
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        validator: (value) {
                          if (value?.isEmpty ?? true) return 'Verplicht';
                          final rounds = int.tryParse(value!);
                          if (rounds == null || rounds < 0) {
                            return 'Ongeldig aantal';
                          }
                          return null;
                        },
                      ),

                      const SizedBox(height: 24),
                      // Status
                      Text(
                        'Status',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<ProductStatus>(
                        initialValue: _status,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(
                            value: ProductStatus.active,
                            child: Text('Actief'),
                          ),
                          DropdownMenuItem(
                            value: ProductStatus.inactive,
                            child: Text('Inactief'),
                          ),
                          DropdownMenuItem(
                            value: ProductStatus.discontinued,
                            child: Text('Stopgezet'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value != null) setState(() => _status = value);
                        },
                      ),

                      const SizedBox(height: 24),
                      // Submit Button
                      ElevatedButton(
                        onPressed: _isLoading ? null : _saveProduct,
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
                                widget.product == null
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

  Future<void> _saveProduct() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final firestoreService = context.read<FirestoreService>();
      final userId = authService.currentUserId!;

      if (widget.product == null) {
        // Create new product
        final product = ProductModel(
          id: '',
          userId: userId,
          name: _nameController.text.trim(),
          description: _descriptionController.text.trim(),
          basePrice: double.parse(_basePriceController.text.trim()),
          category: _category,
          deliveryTime: _deliveryTimeController.text.trim().isEmpty
              ? null
              : _deliveryTimeController.text.trim(),
          fileFormats: _fileFormatsController.text.trim().isEmpty
              ? null
              : _fileFormatsController.text.trim(),
          revisionRounds: int.parse(_revisionRoundsController.text.trim()),
          vatRate: double.parse(_vatRateController.text.trim()) / 100,
          status: _status,
          imageUrl: _imageUrlController.text.trim().isEmpty
              ? null
              : _imageUrlController.text.trim(),
          discount: _discountController.text.trim().isEmpty
              ? 0
              : double.parse(_discountController.text.trim()),
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        await firestoreService.createProduct(product, userId);

        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Product toegevoegd')));
        }
      } else {
        // Update existing product
        final updateData = {
          'name': _nameController.text.trim(),
          'description': _descriptionController.text.trim(),
          'basePrice': double.parse(_basePriceController.text.trim()),
          'category': _category,
          'deliveryTime': _deliveryTimeController.text.trim().isEmpty
              ? null
              : _deliveryTimeController.text.trim(),
          'fileFormats': _fileFormatsController.text.trim().isEmpty
              ? null
              : _fileFormatsController.text.trim(),
          'revisionRounds': int.parse(_revisionRoundsController.text.trim()),
          'vatRate': double.parse(_vatRateController.text.trim()) / 100,
          'status': _status.toString().split('.').last,
          'imageUrl': _imageUrlController.text.trim().isEmpty
              ? null
              : _imageUrlController.text.trim(),
          'discount': _discountController.text.trim().isEmpty
              ? 0
              : double.parse(_discountController.text.trim()),
        };

        await firestoreService.updateProduct(widget.product!.id, updateData);

        if (mounted) {
          Navigator.pop(context);
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Product bijgewerkt')));
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