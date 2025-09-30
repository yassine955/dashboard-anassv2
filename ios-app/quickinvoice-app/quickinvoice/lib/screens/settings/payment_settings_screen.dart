import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../config/theme_config.dart';
import '../../services/auth_service.dart';
import '../../widgets/common/app_drawer.dart';

class PaymentSettingsScreen extends StatefulWidget {
  const PaymentSettingsScreen({super.key});

  @override
  State<PaymentSettingsScreen> createState() => _PaymentSettingsScreenState();
}

class _PaymentSettingsScreenState extends State<PaymentSettingsScreen> {
  final _tikkieFormKey = GlobalKey<FormState>();

  // Tikkie only
  late TextEditingController _tikkieApiKeyController;
  late TextEditingController _tikkieAppTokenController;
  bool _tikkieActive = false;
  bool _tikkieSandboxMode = true;
  bool _isGeneratingToken = false;

  bool _isLoading = false;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _tikkieApiKeyController = TextEditingController();
    _tikkieAppTokenController = TextEditingController();
    _loadSettings();
  }

  @override
  void dispose() {
    _tikkieApiKeyController.dispose();
    _tikkieAppTokenController.dispose();
    super.dispose();
  }

  Future<void> _loadSettings() async {
    setState(() => _isLoading = true);
    try {
      final authService = context.read<AuthService>();
      final userData = await authService.getUserData();

      if (userData != null && mounted) {
        setState(() {
          _tikkieApiKeyController.text =
              userData.paymentSettings?.tikkie?.apiKey ?? '';
          _tikkieAppTokenController.text =
              userData.paymentSettings?.tikkie?.appToken ?? '';
          _tikkieActive = userData.paymentSettings?.tikkie?.isActive ?? false;
          _tikkieSandboxMode =
              userData.paymentSettings?.tikkie?.sandboxMode ?? true;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Fout bij laden instellingen: $e'),
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

  Future<void> _generateSandboxAppToken() async {
    if (_tikkieApiKeyController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vul eerst een API sleutel in voordat je een App Token genereert.'),
          backgroundColor: ThemeConfig.errorColor,
        ),
      );
      return;
    }

    setState(() => _isGeneratingToken = true);

    try {
      final authService = context.read<AuthService>();
      final userId = authService.currentUserId;
      final user = authService.currentUser;

      if (userId == null || user == null) {
        throw Exception('User not authenticated');
      }

      // Get the ID token from Firebase User
      final idToken = await user.getIdToken();

      if (idToken == null) {
        throw Exception('Failed to get authentication token');
      }

      print('Generating sandbox token for user: $userId');
      print('API Key provided: ${_tikkieApiKeyController.text.trim().isNotEmpty}');

      final response = await http.post(
        Uri.parse('https://quickinvoice-three.vercel.app/api/tikkie-sandbox-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
        body: jsonEncode({
          'userId': userId,
          'apiKey': _tikkieApiKeyController.text.trim(),
        }),
      ).timeout(
        const Duration(seconds: 30),
        onTimeout: () {
          throw Exception('Request timeout - server took too long to respond');
        },
      );

      print('Response status: ${response.statusCode}');
      print('Response body: ${response.body}');

      if (response.statusCode != 200) {
        String errorMessage = 'Failed to create sandbox app token';
        try {
          final error = jsonDecode(response.body);
          errorMessage = error['error'] ?? errorMessage;
        } catch (e) {
          errorMessage = 'Server error: ${response.body}';
        }
        throw Exception(errorMessage);
      }

      final result = jsonDecode(response.body);

      // Update local state with the new app token
      setState(() {
        _tikkieAppTokenController.text = result['appToken'];
        _tikkieSandboxMode = true;
        _tikkieActive = true;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Sandbox App Token succesvol gegenereerd! Je kunt nu sandbox betalingen testen.'),
            backgroundColor: ThemeConfig.successColor,
            duration: Duration(seconds: 4),
          ),
        );
      }
    } catch (e) {
      print('Error generating Tikkie token: $e');

      String errorMessage = 'Fout bij genereren App Token';

      if (e.toString().contains('Failed host lookup')) {
        errorMessage = 'Geen internetverbinding. Controleer je netwerk en probeer opnieuw.';
      } else if (e.toString().contains('SocketException')) {
        errorMessage = 'Netwerkfout. Kan niet verbinden met de server.';
      } else if (e.toString().contains('timeout')) {
        errorMessage = 'Time-out. De server reageert niet.';
      } else if (e.toString().contains('Exception:')) {
        // Extract the exception message
        errorMessage = e.toString().replaceAll('Exception:', '').trim();
      } else {
        errorMessage = 'Fout: $e';
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: ThemeConfig.errorColor,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isGeneratingToken = false);
      }
    }
  }

  Future<void> _saveTikkieSettings() async {
    if (!_tikkieFormKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      final authService = context.read<AuthService>();
      await authService.updateUserData({
        'paymentSettings.tikkie': {
          'apiKey': _tikkieApiKeyController.text.trim(),
          'appToken': _tikkieAppTokenController.text.trim(),
          'sandboxMode': _tikkieSandboxMode,
          'isActive': _tikkieActive,
        },
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tikkie configuratie succesvol opgeslagen!'),
            backgroundColor: ThemeConfig.successColor,
          ),
        );
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
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Betaalintegraties'),
        backgroundColor: ThemeConfig.primaryColor,
        foregroundColor: Colors.white,
      ),
      drawer: const AppDrawer(),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Info Card
                  Card(
                    color: ThemeConfig.primaryColor.withValues(alpha: 0.1),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.info_outline,
                            color: ThemeConfig.primaryColor,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Configureer je Tikkie API sleutel voor betalingen in sandbox of productie modus.',
                              style: Theme.of(context).textTheme.bodyMedium,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Tikkie Only
                  _buildTikkieSection(),
                ],
              ),
            ),
    );
  }

  Widget _buildTikkieSection() {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00AEEF).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.phone_android,
                    color: Color(0xFF00AEEF),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Tikkie',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          if (_tikkieActive) ...[
                            const SizedBox(width: 8),
                            const Icon(
                              Icons.check_circle,
                              color: ThemeConfig.successColor,
                              size: 20,
                            ),
                          ],
                        ],
                      ),
                      const Text(
                        'Tikkie betalingen via ABN AMRO',
                        style: TextStyle(
                          fontSize: 12,
                          color: ThemeConfig.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _tikkieActive,
                  onChanged: (value) => setState(() => _tikkieActive = value),
                  activeTrackColor: ThemeConfig.successColor,
                ),
              ],
            ),

            if (_tikkieActive) ...[
              const SizedBox(height: 16),
              const Divider(),
              const SizedBox(height: 16),
              _buildTikkieForm(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildTikkieForm() {
    return Form(
      key: _tikkieFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // API Key
          TextFormField(
            controller: _tikkieApiKeyController,
            decoration: const InputDecoration(
              labelText: 'API Sleutel *',
              hintText: 'KGlSlQbY35aT7rnQ7IsZ75lDa6f9oqL5',
              border: OutlineInputBorder(),
              helperText: 'Van ABN AMRO Developer Portal',
            ),
            validator: (value) =>
                value?.trim().isEmpty ?? true ? 'API sleutel is verplicht' : null,
          ),
          const SizedBox(height: 16),

          // Sandbox Mode Toggle
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              children: [
                Checkbox(
                  value: _tikkieSandboxMode,
                  onChanged: (value) =>
                      setState(() => _tikkieSandboxMode = value ?? true),
                  activeColor: ThemeConfig.primaryColor,
                ),
                const Expanded(
                  child: Text(
                    'Sandbox modus (voor testen)',
                    style: TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // App Token Field with Generate Button
          const Text(
            'App Token *',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: ThemeConfig.textPrimary,
            ),
          ),
          const SizedBox(height: 8),

          if (_tikkieSandboxMode) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _tikkieAppTokenController,
                    decoration: const InputDecoration(
                      hintText: 'Sandbox App Token (automatisch gegenereerd)',
                      border: OutlineInputBorder(),
                    ),
                    validator: (value) =>
                        value?.trim().isEmpty ?? true ? 'App Token is verplicht' : null,
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  height: 56,
                  child: ElevatedButton(
                    onPressed: _isGeneratingToken ? null : _generateSandboxAppToken,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: ThemeConfig.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    child: _isGeneratingToken
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text('Genereer'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Klik op "Genereer" om automatisch een sandbox App Token aan te maken',
              style: TextStyle(
                fontSize: 12,
                color: ThemeConfig.textSecondary,
              ),
            ),
          ] else ...[
            TextFormField(
              controller: _tikkieAppTokenController,
              decoration: const InputDecoration(
                hintText: 'Your Tikkie App Token',
                border: OutlineInputBorder(),
                helperText: 'Van Tikkie Business Portal (Instellingen → APIs → Create token)',
              ),
              validator: (value) =>
                  value?.trim().isEmpty ?? true ? 'App Token is verplicht' : null,
            ),
          ],
          const SizedBox(height: 20),

          // Instructions
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _tikkieSandboxMode
                  ? Colors.amber.shade50
                  : Colors.blue.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: _tikkieSandboxMode
                    ? Colors.amber.shade200
                    : Colors.blue.shade200,
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  Icons.info_outline,
                  size: 20,
                  color: _tikkieSandboxMode
                      ? Colors.amber.shade700
                      : Colors.blue.shade700,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _tikkieSandboxMode ? 'Sandbox Setup' : 'Productie Setup',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: _tikkieSandboxMode
                              ? Colors.amber.shade900
                              : Colors.blue.shade900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (_tikkieSandboxMode)
                        const Text(
                          '1. Vul je API sleutel in van developer.abnamro.com\n'
                          '2. Klik op "Genereer" om een sandbox App Token te maken\n'
                          '3. Test betalingen met de iDEAL simulator\n'
                          '4. Schakel naar productie modus wanneer je klaar bent',
                          style: TextStyle(fontSize: 11),
                        )
                      else
                        const Text(
                          '1. Registreer een app op developer.abnamro.com\n'
                          '2. Upload je public key en krijg een API sleutel\n'
                          '3. Maak een App Token in Tikkie Business Portal\n'
                          '4. Test eerst in sandbox mode voordat je live gaat',
                          style: TextStyle(fontSize: 11),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Save Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: (_isSaving ||
                          _tikkieApiKeyController.text.trim().isEmpty ||
                          _tikkieAppTokenController.text.trim().isEmpty)
                  ? null
                  : _saveTikkieSettings,
              icon: _isSaving
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Icon(Icons.save),
              label: Text(_isSaving ? 'Opslaan...' : 'Opslaan'),
              style: ElevatedButton.styleFrom(
                backgroundColor: ThemeConfig.primaryColor,
                foregroundColor: Colors.white,
                disabledBackgroundColor: Colors.grey.shade300,
                disabledForegroundColor: Colors.grey.shade600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}