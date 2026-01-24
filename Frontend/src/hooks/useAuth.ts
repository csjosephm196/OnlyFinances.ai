// Firebase Authentication Hook
import { useState, useEffect } from 'react';
import {
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUserProfile, getUserProfile } from '../services/firestoreService';

export interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        loading: true,
        error: null
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Check if user profile exists, create if not
                try {
                    const profile = await getUserProfile(user.uid);
                    if (!profile) {
                        await createUserProfile(
                            user.uid,
                            user.email || '',
                            user.displayName,
                            user.photoURL
                        );
                    }
                } catch (err) {
                    console.error('Failed to check/create user profile:', err);
                }
            }
            setAuthState({
                user,
                loading: false,
                error: null
            });
        });

        return () => unsubscribe();
    }, []);

    // Sign in with email and password
    const signIn = async (email: string, password: string) => {
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message
            }));
            throw error;
        }
    };

    // Sign up with email and password
    const signUp = async (email: string, password: string) => {
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Create user profile in Firestore
            await createUserProfile(
                userCredential.user.uid,
                email,
                null,
                null
            );
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message
            }));
            throw error;
        }
    };

    // Sign in with Google
    const signInWithGoogle = async () => {
        try {
            setAuthState(prev => ({ ...prev, loading: true, error: null }));
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);

            // Check if profile exists, create if not (handled in onAuthStateChanged)
            const profile = await getUserProfile(userCredential.user.uid);
            if (!profile) {
                await createUserProfile(
                    userCredential.user.uid,
                    userCredential.user.email || '',
                    userCredential.user.displayName,
                    userCredential.user.photoURL
                );
            }
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                loading: false,
                error: error.message
            }));
            throw error;
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                error: error.message
            }));
            throw error;
        }
    };

    // Reset password
    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            setAuthState(prev => ({
                ...prev,
                error: error.message
            }));
            throw error;
        }
    };

    return {
        user: authState.user,
        loading: authState.loading,
        error: authState.error,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword
    };
}
