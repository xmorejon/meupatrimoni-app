'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in, see docs for a list of available properties
        // https://firebase.google.com/docs/reference/js/firebase.User
        setUser(user);
        setLoading(false);
      } else if (process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true') {
        // Not signed in and in preview mode, so attempting to sign in with preview credentials
        const email = process.env.NEXT_PUBLIC_PREVIEW_EMAIL;
        const password = process.env.NEXT_PUBLIC_PREVIEW_PASSWORD;

        if (email && password) {
          signInWithEmailAndPassword(auth, email, password)
            .catch(error => {
              // If sign-in fails, log the error and set loading to false.
              console.error("Could not sign in preview user", error);
              setUser(null);
              setLoading(false);
            })
        } else {
          // No preview credentials provided, so no user.
          setUser(null);
          setLoading(false);
        }

      } else {
        // User is not signed in and not in preview mode.
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
