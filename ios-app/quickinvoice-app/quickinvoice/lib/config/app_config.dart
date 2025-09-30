class AppConfig {
  // App Information
  static const String appName = 'QuickInvoice';
  static const String appVersion = '1.0.0';

  // Stripe Configuration
  static const String stripePublishableKey = 'pk_test_...'; // Add your key
  static const String stripeMerchantId = 'merchant.com.anass.quickinvoice';

  // PayPal Configuration
  static const String paypalClientId = 'your_paypal_client_id';
  static const String paypalEnvironment = 'sandbox'; // 'sandbox' or 'production'

  // Tikkie Configuration
  static const String tikkieApiKey = 'your_tikkie_api_key';
  static const bool tikkieSandboxMode = true;

  // Mollie Configuration
  static const String mollieApiKey = 'test_...';

  // ING Bank Configuration
  static const String ingClientId = 'your_ing_client_id';
  static const String ingClientSecret = 'your_ing_client_secret';

  // Email Configuration
  static const String smtpHost = 'smtp.gmail.com';
  static const int smtpPort = 587;
  static const String smtpUser = 'your_email@gmail.com';
  static const String smtpPass = 'your_app_password';

  // BTW Configuration
  static const double defaultVatRate = 0.21; // 21% Nederlandse BTW
  static const List<double> vatRates = [0.0, 0.09, 0.21]; // BTW tarieven

  // Currency
  static const String defaultCurrency = 'EUR';
  static const String currencySymbol = '€';

  // Invoice Configuration
  static const int defaultPaymentTerms = 30; // days
  static const String invoicePrefix = 'INV';

  // Pagination
  static const int itemsPerPage = 20;

  // Date Formats
  static const String dateFormat = 'dd-MM-yyyy';
  static const String dateTimeFormat = 'dd-MM-yyyy HH:mm';
}