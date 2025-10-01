import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

interface UseAuthProtectionOptions {
  requiredRole?: 'admin' | 'seller' | 'buyer';
  redirectTo?: string;
}

/**
 * Custom hook that handles authentication protection for routes
 * Waits for auth state hydration before making redirect decisions
 * 
 * @param options - Configuration for auth protection
 * @returns Object with loading states and user info
 */
export function useAuthProtection(options: UseAuthProtectionOptions = {}) {
  const router = useRouter();
  const { user, isAuthenticated, isHydrated } = useAuthStore();
  const { requiredRole, redirectTo } = options;

  useEffect(() => {
    // Don't make decisions until auth state is hydrated
    if (!isHydrated) {
      console.log('⏳ Auth protection: Waiting for hydration...');
      return;
    }

    // Check authentication
    if (!isAuthenticated || !user) {
      console.log('🚪 Auth protection: Not authenticated, redirecting to login');
      router.push(redirectTo || '/login');
      return;
    }

    // Check role if specified
    if (requiredRole && user.role !== requiredRole) {
      console.log(`🚫 Auth protection: Role mismatch. Required: ${requiredRole}, Got: ${user.role}`);
      
      // Redirect to appropriate dashboard based on actual role
      switch (user.role) {
        case 'admin':
          router.push('/admin');
          break;
        case 'seller':
          router.push('/seller');
          break;
        case 'buyer':
        default:
          router.push('/buyer');
          break;
      }
      return;
    }

    console.log('✅ Auth protection: Access granted');
  }, [isAuthenticated, isHydrated, user, requiredRole, redirectTo, router]);

  return {
    user,
    isAuthenticated,
    isHydrated,
    isLoading: !isHydrated || (!isAuthenticated && !user), // Loading if not hydrated or auth state unclear
    hasAccess: isHydrated && isAuthenticated && user && (!requiredRole || user.role === requiredRole)
  };
}

/**
 * Component wrapper for auth protection loading state
 */
export function AuthLoadingScreen({ message = "Loading authentication..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-text-muted">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}