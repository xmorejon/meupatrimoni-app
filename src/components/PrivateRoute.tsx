'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If the auth state is not loading and there is no user,
    // redirect to the login page.
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // While loading, or if there is no user (before the redirect happens),
  // show a loading indicator. This prevents a flash of the dashboard content.
  if (loading || !user) {
    return <div>Loading...</div>;
  }

  // If the user is authenticated, render the protected content.
  return <>{children}</>;
};

export default PrivateRoute;
