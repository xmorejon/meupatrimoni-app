'use client';

import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('LoginPage - Loading:', loading, 'User:', user);
    if (!loading && user) {
      console.log('Redirecting to homepage.');
      router.push('/');
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    console.log('Starting Google sign-in...');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Sign-in successful. User:', result.user);
    } catch (error) {
      console.error("Authentication failed:", error);
    }
  };

  if (loading || user) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <button onClick={handleSignIn} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Sign in with Google
      </button>
    </div>
  );
}
