"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

interface RoleGuardProps {
  allowedRoles: ('buyer' | 'seller' | 'admin')[];
  children: React.ReactNode;
  fallbackUrl?: string;
  requireVerification?: boolean;
  showLoader?: boolean;
}

export default function RoleGuard({ 
  allowedRoles, 
  children, 
  fallbackUrl = '/login', 
  requireVerification = false,
  showLoader = true 
}: RoleGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user, profile, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        // First check if user is authenticated
        if (!isAuthenticated) {
          await checkAuth();
        }

        // If still not authenticated, redirect to login
        if (!isAuthenticated || !user) {
          console.log('🚫 User not authenticated, redirecting to login');
          router.push(fallbackUrl);
          return;
        }

        // Check if user role is allowed
        if (!allowedRoles.includes(user.role)) {
          console.log(`🚫 User role '${user.role}' not allowed for this route. Allowed: [${allowedRoles.join(', ')}]`);
          
          // Redirect based on user role
          if (user.role === 'admin') {
            router.push('/admin');
          } else if (user.role === 'seller') {
            router.push('/seller');
          } else {
            router.push('/buyer');
          }
          return;
        }

        // Check verification requirement
        if (requireVerification && !user.isVerified) {
          console.log('🚫 User not verified, access denied');
          
          // Redirect to appropriate verification page based on role
          if (user.role === 'seller') {
            router.push('/seller/verification-pending');
          } else {
            router.push('/verify-email');
          }
          return;
        }

        // Special checks for sellers
        if (user.role === 'seller' && profile) {
          // Check if seller is suspended
          if (!profile.isActive) {
            console.log('🚫 Seller account suspended');
            router.push('/seller/suspended');
            return;
          }

          // Check if seller is rejected
          if (profile.verificationLevel === 'rejected') {
            console.log('🚫 Seller account rejected');
            router.push('/seller/rejected');
            return;
          }
        }

        // All checks passed
        setIsAuthorized(true);
      } catch (error) {
        console.error('❌ Error checking authorization:', error);
        router.push(fallbackUrl);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthorization();
  }, [isAuthenticated, user, profile, allowedRoles, requireVerification, router, fallbackUrl, checkAuth]);

  if (isLoading && showLoader) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    // This component will handle its own redirect, so we can return null
    return null;
  }

  return <>{children}</>;
}

// Higher-order component version
export function withRoleGuard<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: ('buyer' | 'seller' | 'admin')[],
  options?: {
    fallbackUrl?: string;
    requireVerification?: boolean;
    showLoader?: boolean;
  }
) {
  const GuardedComponent = (props: P) => {
    return (
      <RoleGuard
        allowedRoles={allowedRoles}
        fallbackUrl={options?.fallbackUrl}
        requireVerification={options?.requireVerification}
        showLoader={options?.showLoader}
      >
        <WrappedComponent {...props} />
      </RoleGuard>
    );
  };

  GuardedComponent.displayName = `withRoleGuard(${WrappedComponent.displayName || WrappedComponent.name})`;
  return GuardedComponent;
}

// Utility functions for checking roles
export const useRoleAccess = () => {
  const { user, profile } = useAuthStore();

  const hasRole = (roles: ('buyer' | 'seller' | 'admin')[]) => {
    return user ? roles.includes(user.role) : false;
  };

  const isAdmin = () => user?.role === 'admin';
  const isSeller = () => user?.role === 'seller';
  const isBuyer = () => user?.role === 'buyer';
  
  const isVerified = () => user?.isVerified || false;
  const isActive = () => profile?.isActive !== false; // Default to true if profile not loaded
  
  const canAccessAdminFeatures = () => isAdmin();
  const canAccessSellerFeatures = () => (isSeller() || isAdmin()) && isActive();
  const canAccessBuyerFeatures = () => (isBuyer() || isAdmin());

  const getRedirectUrl = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'seller':
        return '/seller';
      case 'buyer':
      default:
        return '/buyer';
    }
  };

  return {
    user,
    profile,
    hasRole,
    isAdmin,
    isSeller,
    isBuyer,
    isVerified,
    isActive,
    canAccessAdminFeatures,
    canAccessSellerFeatures,
    canAccessBuyerFeatures,
    getRedirectUrl
  };
};