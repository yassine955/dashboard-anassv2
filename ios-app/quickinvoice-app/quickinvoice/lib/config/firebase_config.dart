import 'package:firebase_core/firebase_core.dart';
import 'dart:io' show Platform;

class FirebaseConfig {
  // iOS configuration from GoogleService-Info.plist
  static const FirebaseOptions iosOptions = FirebaseOptions(
    apiKey: "AIzaSyDYEI7hxR9bfiH9s0kdaDrLzqGmuZrTfDg",
    appId: "1:427162814798:ios:0eab9bd91db69e8df5f61f",
    messagingSenderId: "427162814798",
    projectId: "anass-dash",
    storageBucket: "anass-dash.firebasestorage.app",
    iosBundleId: "com.quickinvoice",
    iosClientId: "427162814798-0m3dia4dvnjr6er91ina3ml3a4elbenk.apps.googleusercontent.com",
  );

  // Web configuration
  static const FirebaseOptions webOptions = FirebaseOptions(
    apiKey: "AIzaSyDZZTk4WJ2cLU8KGV-ngydRDBL6LLCEumw",
    authDomain: "anass-dash.firebaseapp.com",
    projectId: "anass-dash",
    storageBucket: "anass-dash.firebasestorage.app",
    messagingSenderId: "427162814798",
    appId: "1:427162814798:web:5aa8d9b4938b34a7f5f61f",
    measurementId: "G-2FXJBWKCHH",
  );

  static Future<void> initializeFirebase() async {
    if (Platform.isIOS) {
      await Firebase.initializeApp(options: iosOptions);
    } else if (Platform.isAndroid) {
      // Android uses google-services.json (automatic)
      await Firebase.initializeApp();
    } else {
      // Web configuration
      await Firebase.initializeApp(options: webOptions);
    }
  }
}