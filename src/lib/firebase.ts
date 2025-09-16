import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDZZTk4WJ2cLU8KGV-ngydRDBL6LLCEumw",
  authDomain: "anass-dash.firebaseapp.com",
  projectId: "anass-dash",
  storageBucket: "anass-dash.firebasestorage.app",
  messagingSenderId: "427162814798",
  appId: "1:427162814798:web:5aa8d9b4938b34a7f5f61f",
  measurementId: "G-2FXJBWKCHH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Cloud Storage and get a reference to the service
export const storage = getStorage(app);

// Configure Google provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;