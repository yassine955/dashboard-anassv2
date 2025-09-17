'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase';
import { User } from '@/types';
import { soundService } from '@/lib/sound-service';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {

        try {
          // Get or create user profile
          const userDoc = await getDoc(doc(db, 'users', user.uid));

          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as User);
          } else {


            // Create new user profile
            const newUserProfile = {
              uid: user.uid,
              email: user.email!,
              displayName: user.displayName || '',
              photoURL: user.photoURL || undefined,
              businessInfo: {
                companyName: '',
                kvkNumber: '',
                address: {
                  street: '',
                  city: '',
                  postalCode: '',
                  country: 'Netherlands'
                }
              },
              preferences: {
                currency: 'EUR',
                language: 'nl',
                invoiceTemplate: 'default',
                defaultPaymentTerms: 30
              },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            await setDoc(doc(db, 'users', user.uid), newUserProfile);
            // Create a proper User object for the state (without serverTimestamp)
            const userForState: User = {
              ...newUserProfile,
              createdAt: new Date() as any,
              updatedAt: new Date() as any
            };
            setUserProfile(userForState);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // Play welcome sound after successful login
      soundService.playLoginSuccess();
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!currentUser) return;

    try {
      const updatedData = {
        ...data,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', currentUser.uid), updatedData, { merge: true });
      // Update state with proper timestamp (not FieldValue)
      setUserProfile(prev => prev ? {
        ...prev,
        ...data,
        updatedAt: new Date() as any
      } : null);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    signInWithGoogle,
    logout,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}