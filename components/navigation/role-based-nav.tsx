"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRoleAccess } from '@/components/auth/role-guard';
import { useAuthStore } from '@/store/auth-store';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles: ('buyer' | 'seller' | 'admin')[];
  requireVerification?: boolean;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  // Buyer Navigation
  {
    label: 'Browse Art',
    href: '/browse',
    icon: '🎨',
    roles: ['buyer', 'seller', 'admin']
  },
  {
    label: 'My Orders',
    href: '/buyer/orders',
    icon: '📦',
    roles: ['buyer', 'admin']
  },
  {
    label: 'Wishlist',
    href: '/buyer/wishlist',
    icon: '💝',
    roles: ['buyer', 'admin']
  },
  {
    label: 'Gift Events',
    href: '/buyer?tab=gifts',
    icon: '🎁',
    roles: ['buyer', 'admin']
  },
  
  // Seller Navigation
  {
    label: 'Dashboard',
    href: '/seller/dashboard',
    icon: '📊',
    roles: ['seller', 'admin'],
    requireVerification: true
  },
  {
    label: 'My Products',
    href: '/seller/products',
    icon: '🖼️',
    roles: ['seller', 'admin'],
    requireVerification: true
  },
  {
    label: 'Orders',
    href: '/seller/orders',
    icon: '📋',
    roles: ['seller', 'admin'],
    requireVerification: true
  },
  {
    label: 'Analytics',
    href: '/seller/analytics',
    icon: '📈',
    roles: ['seller', 'admin'],
    requireVerification: true
  },
  {
    label: 'Profile',
    href: '/seller/profile',
    icon: '👤',
    roles: ['seller', 'admin']
  },
  {
    label: 'Gift Events',
    href: '/seller?tab=gifts',
    icon: '🎁',
    roles: ['seller', 'admin']
  },
  
  // Admin Navigation
  {
    label: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: '⚙️',
    roles: ['admin']
  },
  {
    label: 'User Management',
    href: '/admin/users',
    icon: '👥',
    roles: ['admin']
  },
  {
    label: 'Content Moderation',
    href: '/admin/moderation',
    icon: '🛡️',
    roles: ['admin']
  },
  {
    label: 'Platform Analytics',
    href: '/admin/analytics',
    icon: '📊',
    roles: ['admin']
  },
  {
    label: 'System Settings',
    href: '/admin/settings',
    icon: '🔧',
    roles: ['admin']
  },
  
  // Common Navigation
  {
    label: 'Messages',
    href: '/messages',
    icon: '💬',
    roles: ['buyer', 'seller', 'admin']
  },
  {
    label: 'Notifications',
    href: '/notifications',
    icon: '🔔',
    roles: ['buyer', 'seller', 'admin']
  }
];

interface RoleBasedNavProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  showIcons?: boolean;
  showBadges?: boolean;
}

export default function RoleBasedNav({ 
  className = "", 
  orientation = 'horizontal',
  showIcons = true,
  showBadges = true 
}: RoleBasedNavProps) {
  const pathname = usePathname();
  const { user, profile, hasRole, isVerified, isActive } = useRoleAccess();
  const { logout } = useAuthStore();

  // Filter nav items based on user role and permissions
  const visibleItems = NAV_ITEMS.filter(item => {
    // Check role access
    if (!hasRole(item.roles)) return false;
    
    // Check verification requirement
    if (item.requireVerification && !isVerified()) return false;
    
    // Check if seller is active (for seller-specific items)
    if (item.roles.includes('seller') && user?.role === 'seller' && !isActive()) {
      return false;
    }
    
    return true;
  });

  // Group items by section for better organization
  const groupedItems = {
    primary: visibleItems.filter(item => 
      item.href.includes('/dashboard') || 
      item.href.includes('/browse') ||
      item.href === '/admin/users'
    ),
    secondary: visibleItems.filter(item => 
      !item.href.includes('/dashboard') && 
      !item.href.includes('/browse') &&
      item.href !== '/admin/users' &&
      !item.href.includes('/messages') &&
      !item.href.includes('/notifications')
    ),
    communication: visibleItems.filter(item => 
      item.href.includes('/messages') || 
      item.href.includes('/notifications')
    )
  };

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      href={item.href}
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActiveLink(item.href)
          ? 'bg-text-primary text-background-primary'
          : 'text-text-secondary hover:text-text-primary hover:bg-neutral-800'
      }`}
    >
      {showIcons && <span>{item.icon}</span>}
      <span>{item.label}</span>
      {showBadges && item.badge && (
        <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
          {item.badge}
        </span>
      )}
    </Link>
  );

  if (!user) return null;

  return (
    <nav className={`bg-background-secondary border-r border-neutral-800 ${className}`}>
      <div className="p-4">
        {/* User Info */}
        <div className="mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-neutral-700 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
              ) : (
                <span className="text-text-primary font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary font-medium truncate">{user.name}</p>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                  user.role === 'seller' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {user.role}
                </span>
                {user.isVerified && (
                  <span className="text-green-400 text-xs">✓</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-6">
          {/* Primary Navigation */}
          {groupedItems.primary.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                Main
              </h3>
              <div className="space-y-1">
                {groupedItems.primary.map((item, index) => (
                  <NavLink key={index} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Secondary Navigation */}
          {groupedItems.secondary.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                {user.role === 'admin' ? 'Management' : user.role === 'seller' ? 'Seller Tools' : 'Shopping'}
              </h3>
              <div className="space-y-1">
                {groupedItems.secondary.map((item, index) => (
                  <NavLink key={index} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Communication Navigation */}
          {groupedItems.communication.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                Communication
              </h3>
              <div className="space-y-1">
                {groupedItems.communication.map((item, index) => (
                  <NavLink key={index} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 pt-6 border-t border-neutral-800">
          <div className="space-y-1">
            <Link
              href="/settings"
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-neutral-800 transition-colors"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}