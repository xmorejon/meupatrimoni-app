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
        // If a user is found by onAuthStateChanged, set the user.
        setUser(user);
        setLoading(false);
      } else if (process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true') {
        // If no user is found and we are in preview mode, attempt to sign in with preview credentials.
        const email = process.env.NEXT_PUBLIC_PREVIEW_EMAIL;
        const password = process.env.NEXT_PUBLIC_PREVIEW_PASSWORD;

        if (email && password) {
          signInWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
              // If sign-in is successful, onAuthStateChanged will be called again with the new user.
              console.log("Successfully signed in preview user");
            })
            .catch(error => {
              // If sign-in fails, log the error and set the user to null.
              console.error("Could not sign in preview user", error);
              setUser(null);
              setLoading(false);
            })
        } else {
          // If no preview credentials are provided, set user to null.
          setUser(null);
          setLoading(false);
        }

      } else {
        // If not in preview mode and no user is found, set user to null.
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
