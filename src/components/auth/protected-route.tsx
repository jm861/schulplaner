'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';

type ProtectedRouteProps = {
  children: ReactNode;
};

const PUBLIC_ROUTES = ['/login', '/register'];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Small delay to ensure auth context is initialized
    const timer = setTimeout(() => {
      setIsChecking(false);
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
      
      if (!isAuthenticated && !isPublicRoute) {
        router.replace('/login');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, pathname, router]);

  // Show nothing while checking or if not authenticated on protected route
  if (isChecking) {
    return null;
  }

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  
  if (!isAuthenticated && !isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}

