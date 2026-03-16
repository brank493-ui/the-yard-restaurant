'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  UserCredential,
  Auth,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { FirebaseUser } from '@/lib/firebase-types';

interface AuthContextType {
  user: User | null;
  userData: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, displayName?: string) => Promise<UserCredential | void>;
  signIn: (email: string, password: string) => Promise<UserCredential | void>;
  signInWithGoogle: () => Promise<UserCredential | void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName?: string, photoURL?: string) => Promise<void>;
  clearError: () => void;
  isConfigured: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isConfigured = Boolean(auth && db);

  // Create user document in Firestore
  async function createUserDocument(user: User, additionalData?: { displayName?: string }) {
    if (!db) return null;
    
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const { email, displayName, photoURL } = user;
      const newUserData = {
        uid: user.uid,
        email,
        displayName: additionalData?.displayName || displayName,
        photoURL,
        role: 'CUSTOMER' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(userRef, newUserData);
        return newUserData;
      } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
      }
    }

    return userSnap.data() as FirebaseUser;
  }

  // Fetch user data from Firestore
  async function fetchUserData(user: User) {
    if (!db) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as FirebaseUser;
        setUserData(data);
      } else {
        // User document doesn't exist, create one
        const newUserData = await createUserDocument(user);
        setUserData(newUserData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserData(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    if (!auth) {
      // Use setTimeout to defer setState outside of effect body
      const timer = setTimeout(() => {
        if (isMounted) {
          setLoading(false);
        }
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      
      setUser(user);

      if (user && db) {
        await fetchUserData(user);
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Sign up with email and password
  async function signUp(email: string, password: string, displayName?: string): Promise<UserCredential | void> {
    if (!auth) {
      setError('Firebase is not configured');
      return;
    }
    
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update profile with display name if provided
      if (displayName && userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }

      // Create user document in Firestore
      await createUserDocument(userCredential.user, { displayName });

      return userCredential;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign up';
      setError(errorMessage);
      throw error;
    }
  }

  // Sign in with email and password
  async function signIn(email: string, password: string): Promise<UserCredential | void> {
    if (!auth) {
      setError('Firebase is not configured');
      return;
    }
    
    setError(null);
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign in';
      setError(errorMessage);
      throw error;
    }
  }

  // Sign in with Google
  async function signInWithGoogle(): Promise<UserCredential | void> {
    if (!auth || !googleProvider) {
      setError('Firebase is not configured');
      return;
    }
    
    setError(null);
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);

      // Check if user document exists, if not create one
      if (db) {
        const userRef = doc(db, 'users', userCredential.user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await createUserDocument(userCredential.user);
        }
      }

      return userCredential;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during Google sign in';
      setError(errorMessage);
      throw error;
    }
  }

  // Sign out
  async function logOut(): Promise<void> {
    if (!auth) {
      return;
    }
    
    setError(null);
    try {
      await signOut(auth);
      setUserData(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign out';
      setError(errorMessage);
      throw error;
    }
  }

  // Reset password
  async function resetPassword(email: string): Promise<void> {
    if (!auth) {
      setError('Firebase is not configured');
      return;
    }
    
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during password reset';
      setError(errorMessage);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(displayName?: string, photoURL?: string): Promise<void> {
    setError(null);
    if (!user) {
      setError('No user is currently signed in');
      return;
    }

    try {
      await updateProfile(user, { displayName, photoURL });

      // Update Firestore document
      if (db) {
        const userRef = doc(db, 'users', user.uid);
        const updateData: Record<string, unknown> = { updatedAt: serverTimestamp() };
        if (displayName) updateData.displayName = displayName;
        if (photoURL) updateData.photoURL = photoURL;

        await setDoc(userRef, updateData, { merge: true });

        // Refresh user data
        await fetchUserData(user);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred updating profile';
      setError(errorMessage);
      throw error;
    }
  }

  function clearError() {
    setError(null);
  }

  const value: AuthContextType = {
    user,
    userData,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    logOut,
    resetPassword,
    updateUserProfile,
    clearError,
    isConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
