import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter/services.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'config/firebase_config.dart';
import 'config/theme_config.dart';
import 'routes/app_router.dart';
import 'services/auth_service.dart';
import 'services/firestore_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );

  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  runApp(const QuickInvoiceApp());
}

class QuickInvoiceApp extends StatefulWidget {
  const QuickInvoiceApp({super.key});

  @override
  State<QuickInvoiceApp> createState() => _QuickInvoiceAppState();
}

class _QuickInvoiceAppState extends State<QuickInvoiceApp> {
  bool _initialized = false;
  bool _error = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializeFirebase();
  }

  Future<void> _initializeFirebase() async {
    try {
      // Initialize Firebase
      await FirebaseConfig.initializeFirebase();

      // Initialize Dutch locale for date formatting
      await initializeDateFormatting('nl_NL', null);

      setState(() {
        _initialized = true;
      });
    } catch (e) {
      print('Firebase initialization error: $e');
      setState(() {
        _error = true;
        _errorMessage = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Show error screen
    if (_error) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 16),
                const Text(
                  'Firebase Initialization Fout',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(_errorMessage ?? 'Onbekende fout'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // Show loading screen
    if (!_initialized) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: const [
                CircularProgressIndicator(),
                SizedBox(height: 16),
                Text('QuickInvoice wordt geladen...'),
              ],
            ),
          ),
        ),
      );
    }

    // Firebase initialized successfully, show the main app
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
        Provider(create: (_) => FirestoreService()),
      ],
      child: MaterialApp.router(
        title: 'QuickInvoice',
        debugShowCheckedModeBanner: false,
        theme: ThemeConfig.lightTheme,
        routerConfig: AppRouter.router,
      ),
    );
  }
}
