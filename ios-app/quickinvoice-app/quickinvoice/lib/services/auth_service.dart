import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../models/user_model.dart';

class AuthService extends ChangeNotifier {
  // Use lazy getters to avoid accessing Firebase before initialization
  FirebaseAuth get _auth => FirebaseAuth.instance;
  FirebaseFirestore get _firestore => FirebaseFirestore.instance;

  // GoogleSignIn instance with iOS client ID
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    clientId: '427162814798-0m3dia4dvnjr6er91ina3ml3a4elbenk.apps.googleusercontent.com',
  );

  User? get currentUser => _auth.currentUser;
  bool get isAuthenticated => currentUser != null;
  String? get currentUserId => currentUser?.uid;

  Stream<User?> get authStateChanges => _auth.authStateChanges();

  AuthService() {
    // Delay auth state listening to allow Firebase to initialize
    Future.delayed(const Duration(milliseconds: 500), () {
      try {
        _auth.authStateChanges().listen((User? user) {
          notifyListeners();
        });
      } catch (e) {
        print('Auth state listener error: $e');
      }
    });
  }

  // Sign up with email and password
  Future<UserCredential> signUpWithEmailAndPassword({
    required String email,
    required String password,
    required String displayName,
    required BusinessInfo businessInfo,
  }) async {
    try {
      final UserCredential credential =
          await _auth.createUserWithEmailAndPassword(
        email: email,
        password: password,
      );

      await credential.user?.updateDisplayName(displayName);

      // Create user document in Firestore
      if (credential.user != null) {
        final userModel = UserModel(
          uid: credential.user!.uid,
          email: email,
          displayName: displayName,
          businessInfo: businessInfo,
          preferences: UserPreferences(),
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        await _firestore
            .collection('users')
            .doc(credential.user!.uid)
            .set(userModel.toMap());
      }

      return credential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // Sign in with email and password
  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      return await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // Sign in with Google
  Future<UserCredential> signInWithGoogle() async {
    try {
      // Trigger the authentication flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        throw 'Google inloggen geannuleerd';
      }

      // Obtain the auth details from the request
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      // Create a new credential
      final credential = GoogleAuthProvider.credential(
        accessToken: googleAuth.accessToken,
        idToken: googleAuth.idToken,
      );

      // Sign in to Firebase with the Google credential
      final UserCredential userCredential = await _auth.signInWithCredential(credential);

      // Create user document if it doesn't exist
      if (userCredential.user != null) {
        final userDoc = await _firestore
            .collection('users')
            .doc(userCredential.user!.uid)
            .get();

        if (!userDoc.exists) {
          // Create a new user document for Google sign-in users
          final userModel = UserModel(
            uid: userCredential.user!.uid,
            email: userCredential.user!.email ?? '',
            displayName: userCredential.user!.displayName ?? 'Gebruiker',
            photoURL: userCredential.user!.photoURL,
            businessInfo: BusinessInfo(
              companyName: '',
              kvkNumber: '',
              address: Address(
                street: '',
                city: '',
                postalCode: '',
                country: 'Nederland',
              ),
            ),
            preferences: UserPreferences(),
            createdAt: DateTime.now(),
            updatedAt: DateTime.now(),
          );

          await _firestore
              .collection('users')
              .doc(userCredential.user!.uid)
              .set(userModel.toMap());
        }
      }

      return userCredential;
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    } catch (e) {
      throw 'Google inloggen mislukt: $e';
    }
  }

  // Sign out
  Future<void> signOut() async {
    await Future.wait([
      _auth.signOut(),
      _googleSignIn.signOut(),
    ]);
  }

  // Password reset
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _auth.sendPasswordResetEmail(email: email);
    } on FirebaseAuthException catch (e) {
      throw _handleAuthException(e);
    }
  }

  // Get user data from Firestore
  Future<UserModel?> getUserData() async {
    if (currentUserId == null) return null;

    try {
      final doc = await _firestore.collection('users').doc(currentUserId).get();
      if (doc.exists) {
        return UserModel.fromFirestore(doc);
      }
      return null;
    } catch (e) {
      throw Exception('Failed to get user data: $e');
    }
  }

  // Stream user data
  Stream<UserModel?> streamUserData() {
    if (currentUserId == null) {
      return Stream.value(null);
    }

    return _firestore
        .collection('users')
        .doc(currentUserId)
        .snapshots()
        .map((doc) {
      if (doc.exists) {
        return UserModel.fromFirestore(doc);
      }
      return null;
    });
  }

  // Update user data
  Future<void> updateUserData(Map<String, dynamic> data) async {
    if (currentUserId == null) throw Exception('User not authenticated');

    try {
      data['updatedAt'] = Timestamp.now();
      await _firestore.collection('users').doc(currentUserId).update(data);
    } catch (e) {
      throw Exception('Failed to update user data: $e');
    }
  }

  // Delete account
  Future<void> deleteAccount() async {
    if (currentUser == null) throw Exception('User not authenticated');

    try {
      // Delete user data from Firestore
      await _firestore.collection('users').doc(currentUserId).delete();

      // Delete Firebase Auth account
      await currentUser!.delete();
    } catch (e) {
      throw Exception('Failed to delete account: $e');
    }
  }

  // Handle Firebase Auth exceptions
  String _handleAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'weak-password':
        return 'Het wachtwoord is te zwak.';
      case 'email-already-in-use':
        return 'Dit email adres is al in gebruik.';
      case 'user-not-found':
        return 'Geen gebruiker gevonden met dit email adres.';
      case 'wrong-password':
        return 'Onjuist wachtwoord.';
      case 'invalid-email':
        return 'Ongeldig email adres.';
      case 'user-disabled':
        return 'Dit account is uitgeschakeld.';
      case 'too-many-requests':
        return 'Te veel pogingen. Probeer het later opnieuw.';
      case 'operation-not-allowed':
        return 'Deze operatie is niet toegestaan.';
      default:
        return 'Er is een fout opgetreden: ${e.message}';
    }
  }
}