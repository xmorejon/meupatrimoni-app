'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Log component rendering
  console.log('[PrivateRoute] Component rendered. Loading:', loading, 'User exists:', !!user);

  useEffect(() => {
    // Log useEffect hook execution
    console.log('[PrivateRoute] useEffect triggered. Loading:', loading, 'User exists:', !!user);

    // The original redirect logic is still commented out
    // We are only logging to understand the flow
    if (!loading && !user) {
      console.log('[PrivateRoute] Redirect condition met. In a previous version, a redirect to /login would have happened here.');
    }
  }, [user, loading, router]);

  if (loading) {
    console.log('[PrivateRoute] Rendering loading state...');
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('[PrivateRoute] No user found. Rendering null as per design.');
    return null;
  }

  console.log('[PrivateRoute] User is authenticated. Rendering children.');
  return user ? <>{children}</> : null;
};

export default PrivateRoute;
