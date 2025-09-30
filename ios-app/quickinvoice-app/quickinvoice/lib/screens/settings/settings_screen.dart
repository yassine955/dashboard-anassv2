import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme_config.dart';
import '../../services/auth_service.dart';
import '../../models/user_model.dart';
import '../../widgets/common/app_drawer.dart';
import '../../widgets/common/avatar_widget.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _accountFormKey = GlobalKey<FormState>();
  final _businessFormKey = GlobalKey<FormState>();
  final _preferencesFormKey = GlobalKey<FormState>();

  // Account controllers
  final _displayNameController = TextEditingController();

  // Business info controllers
  final _companyNameController = TextEditingController();
  final _kvkNumberController = TextEditingController();
  final _vatNumberController = TextEditingController();
  final _streetController = TextEditingController();
  final _cityController = TextEditingController();
  final _postalCodeController = TextEditingController();
  final _countryController = TextEditingController();
  final _phoneController = TextEditingController();
  final _websiteController = TextEditingController();

  // Preferences
  String _selectedCurrency = 'EUR';
  String _selectedLanguage = 'nl';
  String _selectedTemplate = 'default';
  double _paymentTerms = 30;

  bool _isLoading = false;
  bool _isLoadingBusiness = false;
  bool _isLoadingPreferences = false;
  UserModel? _userData;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _companyNameController.dispose();
    _kvkNumberController.dispose();
    _vatNumberController.dispose();
    _streetController.dispose();
    _cityController.dispose();
    _postalCodeController.dispose();
    _countryController.dispose();
    _phoneController.dispose();
    _websiteController.dispose();
    super.dispose();
  }

  Future<void> _loadUserData() async {
    setState(() => _isLoading = true);
    try {
      final authService = context.read<AuthService>();
      final userData = await authService.getUserData();

      if (userData != null && mounted) {
        setState(() {
          _userData = userData;
          _displayNameController.text = userData.displayName;
          _companyNameController.text = userData.businessInfo.companyName;
          _kvkNumberController.text = userData.businessInfo.kvkNumber;
          _vatNumberController.text = userData.businessInfo.vatNumber ?? '';
          _streetController.text = userData.businessInfo.address.street;
          _cityController.text = userData.businessInfo.address.city;
          _postalCodeController.text = userData.businessInfo.address.postalCode;
          _countryController.text = userData.businessInfo.address.country;
          _phoneController.text = userData.businessInfo.phone ?? '';
          _websiteController.text = userData.businessInfo.website ?? '';
          _selectedCurrency = userData.preferences.currency;
          _selectedLanguage = userData.preferences.language;
          _selectedTemplate = userData.preferences.invoiceTemplate;
          _paymentTerms = userData.preferences.defaultPaymentTerms.toDouble();
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fout bij laden gegevens: $e'),
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


  Future<void> _updateBusinessInfo() async {
    if (!_businessFormKey.currentState!.validate()) return;

    setState(() => _isLoadingBusiness = true);
    try {
      final authService = context.read<AuthService>();
      await authService.updateUserData({
        'businessInfo': {
          'companyName': _companyNameController.text.trim(),
          'kvkNumber': _kvkNumberController.text.trim(),
          'vatNumber': _vatNumberController.text.trim().isEmpty
              ? null
              : _vatNumberController.text.trim(),
          'address': {
            'street': _streetController.text.trim(),
            'city': _cityController.text.trim(),
            'postalCode': _postalCodeController.text.trim(),
            'country': _countryController.text.trim(),
          },
          'phone': _phoneController.text.trim().isEmpty
              ? null
              : _phoneController.text.trim(),
          'website': _websiteController.text.trim().isEmpty
              ? null
              : _websiteController.text.trim(),
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Bedrijfsgegevens succesvol bijgewerkt'),
            backgroundColor: ThemeConfig.successColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fout bij bijwerken: $e'),
            backgroundColor: ThemeConfig.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingBusiness = false);
      }
    }
  }

  Future<void> _updatePreferences() async {
    if (!_preferencesFormKey.currentState!.validate()) return;

    setState(() => _isLoadingPreferences = true);
    try {
      final authService = context.read<AuthService>();
      await authService.updateUserData({
        'preferences': {
          'currency': _selectedCurrency,
          'language': _selectedLanguage,
          'invoiceTemplate': _selectedTemplate,
          'defaultPaymentTerms': _paymentTerms.toInt(),
        }
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Voorkeuren succesvol bijgewerkt'),
            backgroundColor: ThemeConfig.successColor,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fout bij bijwerken: $e'),
            backgroundColor: ThemeConfig.errorColor,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingPreferences = false);
      }
    }
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Uitloggen'),
        content: const Text('Weet je zeker dat je wilt uitloggen?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Annuleren'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: ThemeConfig.errorColor,
            ),
            child: const Text('Uitloggen'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      final authService = context.read<AuthService>();
      await authService.signOut();
      if (mounted) {
        context.go('/login');
      }
    }
  }


  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Instellingen'),
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Account Settings
                  _buildSectionHeader('Account Instellingen'),
                  const SizedBox(height: 12),
                  _buildAccountSection(authService),
                  const SizedBox(height: 24),

                  // Business Info
                  _buildSectionHeader('Bedrijfsgegevens'),
                  const SizedBox(height: 12),
                  _buildBusinessSection(),
                  const SizedBox(height: 24),

                  // Preferences
                  _buildSectionHeader('Voorkeuren'),
                  const SizedBox(height: 12),
                  _buildPreferencesSection(),
                ],
              ),
            ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
    );
  }

  Widget _buildAccountSection(AuthService authService) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Name Field (Read-only)
            TextFormField(
              controller: _displayNameController,
              decoration: const InputDecoration(
                labelText: 'Naam',
                prefixIcon: Icon(Icons.person_outline),
                filled: true,
                fillColor: Color(0xFFF9FAFB),
              ),
              enabled: false,
            ),
            const Padding(
              padding: EdgeInsets.only(left: 48, top: 4, right: 16),
              child: Text(
                'Naam wordt automatisch overgenomen van je Google account',
                style: TextStyle(
                  fontSize: 12,
                  color: ThemeConfig.textSecondary,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Email Field (Read-only)
            TextFormField(
              initialValue: authService.currentUser?.email,
              decoration: const InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email_outlined),
                filled: true,
                fillColor: Color(0xFFF9FAFB),
              ),
              enabled: false,
            ),
            const Padding(
              padding: EdgeInsets.only(left: 48, top: 4, right: 16),
              child: Text(
                'Email kan niet worden gewijzigd',
                style: TextStyle(
                  fontSize: 12,
                  color: ThemeConfig.textSecondary,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Profile Photo (Read-only display)
            const Text(
              'Profielfoto',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: ThemeConfig.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                AvatarWidget(
                  imageUrl: _userData?.photoURL,
                  initials: _userData?.displayName.substring(0, 2) ?? 'U',
                  size: 48,
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Je profielfoto wordt automatisch gesynchroniseerd met je Google account',
                    style: TextStyle(
                      fontSize: 12,
                      color: ThemeConfig.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBusinessSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _businessFormKey,
          child: Column(
            children: [
              TextFormField(
                controller: _companyNameController,
                decoration: const InputDecoration(
                  labelText: 'Bedrijfsnaam',
                  prefixIcon: Icon(Icons.business_outlined),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Voer een bedrijfsnaam in';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _kvkNumberController,
                decoration: const InputDecoration(
                  labelText: 'KVK Nummer',
                  prefixIcon: Icon(Icons.numbers_outlined),
                ),
                keyboardType: TextInputType.number,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Voer een KVK nummer in';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _vatNumberController,
                decoration: const InputDecoration(
                  labelText: 'BTW Nummer (optioneel)',
                  prefixIcon: Icon(Icons.receipt_long_outlined),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _streetController,
                decoration: const InputDecoration(
                  labelText: 'Straat en huisnummer',
                  prefixIcon: Icon(Icons.home_outlined),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Voer een straat en huisnummer in';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    flex: 2,
                    child: TextFormField(
                      controller: _postalCodeController,
                      decoration: const InputDecoration(
                        labelText: 'Postcode',
                        prefixIcon: Icon(Icons.local_post_office_outlined),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Voer een postcode in';
                        }
                        return null;
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 3,
                    child: TextFormField(
                      controller: _cityController,
                      decoration: const InputDecoration(
                        labelText: 'Plaats',
                        prefixIcon: Icon(Icons.location_city_outlined),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Voer een plaats in';
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _countryController,
                decoration: const InputDecoration(
                  labelText: 'Land',
                  prefixIcon: Icon(Icons.public_outlined),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Voer een land in';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _phoneController,
                decoration: const InputDecoration(
                  labelText: 'Telefoonnummer (optioneel)',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
                keyboardType: TextInputType.phone,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _websiteController,
                decoration: const InputDecoration(
                  labelText: 'Website (optioneel)',
                  prefixIcon: Icon(Icons.language_outlined),
                ),
                keyboardType: TextInputType.url,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _isLoadingBusiness ? null : _updateBusinessInfo,
                  icon: _isLoadingBusiness
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
        ),
      ),
    );
  }

  Widget _buildPreferencesSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _preferencesFormKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              DropdownButtonFormField<String>(
                initialValue: _selectedCurrency,
                decoration: const InputDecoration(
                  labelText: 'Valuta',
                  prefixIcon: Icon(Icons.euro_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: 'EUR', child: Text('EUR (€)')),
                  DropdownMenuItem(value: 'USD', child: Text('USD (\$)')),
                  DropdownMenuItem(value: 'GBP', child: Text('GBP (£)')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedCurrency = value);
                  }
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _selectedLanguage,
                decoration: const InputDecoration(
                  labelText: 'Taal',
                  prefixIcon: Icon(Icons.language_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: 'nl', child: Text('Nederlands')),
                  DropdownMenuItem(value: 'en', child: Text('English')),
                  DropdownMenuItem(value: 'de', child: Text('Deutsch')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedLanguage = value);
                  }
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _selectedTemplate,
                decoration: const InputDecoration(
                  labelText: 'Factuur Template',
                  prefixIcon: Icon(Icons.description_outlined),
                ),
                items: const [
                  DropdownMenuItem(value: 'default', child: Text('Classic')),
                  DropdownMenuItem(value: 'modern', child: Text('Modern')),
                  DropdownMenuItem(value: 'minimal', child: Text('Minimal')),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() => _selectedTemplate = value);
                  }
                },
              ),
              const SizedBox(height: 24),
              Text(
                'Standaard betalingstermijn: ${_paymentTerms.toInt()} dagen',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              Slider(
                value: _paymentTerms,
                min: 7,
                max: 60,
                divisions: 53,
                label: '${_paymentTerms.toInt()} dagen',
                onChanged: (value) {
                  setState(() => _paymentTerms = value);
                },
              ),
              const SizedBox(height: 8),
              const Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('7 dagen', style: TextStyle(fontSize: 12)),
                  Text('60 dagen', style: TextStyle(fontSize: 12)),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed:
                      _isLoadingPreferences ? null : _updatePreferences,
                  icon: _isLoadingPreferences
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
        ),
      ),
    );
  }

}