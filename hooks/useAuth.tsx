import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthChange, signInWithGoogle, signOutUser } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (): Promise<User | null> => {
    try {
      return await signInWithGoogle();
    } catch (error) {
      // Re-throw the error so the calling component can handle it
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signOut: signOutUser,
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
