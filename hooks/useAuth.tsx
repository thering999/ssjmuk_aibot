import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { type User, onAuthChange, signInWithGoogle, signOutUser } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: { code: string; message: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    // onAuthStateChanged is called once on init and then on any change.
    // This handles setting the user and stopping the loading state.
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    // If Firebase isn't configured, onAuthChange will gracefully fail and call back with null,
    // so we just need to wait for that to set loading to false.

    return () => unsubscribe();
  }, []);

  const signIn = async (): Promise<void> => {
    try {
      setError(null); // Clear previous errors
      await signInWithGoogle();
      // The onAuthChange listener will handle setting the user on success.
    } catch (error: any) {
      // signInWithPopup can throw errors (e.g., popup closed, domain not authorized).
      // We catch them and update the context state.
      console.error("Firebase sign-in error:", error);
      setError({ code: error.code, message: error.message });
    }
  };

  const signOut = async (): Promise<void> => {
    try {
        await signOutUser();
        // The onAuthChange listener will handle setting user to null.
    } catch (error: any) {
        console.error("Firebase sign-out error:", error);
        setError({ code: error.code, message: error.message });
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signOut,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
