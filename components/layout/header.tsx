"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuthStore } from "@/store/auth-store";
import { useCartStore } from "@/store/cart-store";
import { useWishlistStore } from "@/store/wishlist-store";
import AuthSection from "./auth-section";
import CartSidebar from "@/components/marketplace/cart-sidebar";
import NotificationCenter from "@/components/notifications/notification-center";

// Dynamically import auth-related components to avoid SSR issues
const AuthSectionComponent = dynamic(() => import('./auth-section'), { ssr: false });

export default function Header() {
  const { user } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const { getWishlistCount } = useWishlistStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Ref for mobile menu container
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const totalItems = getTotalItems();
  const wishlistCount = getWishlistCount();

  // Handle click outside mobile menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        mobileMenuRef.current &&
        mobileMenuButtonRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        !mobileMenuButtonRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  // Handle mobile search
  const handleMobileSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50">
        {/* Promotional Banner */}
        <div className="bg-accent text-text-primary text-center py-2 text-sm font-medium tracking-wide">
          SPRING SALE | 70% OFF STOREWIDE TODAY
        </div>

        {/* Main Header */}
        <header className="bg-background-primary border-b border-neutral-800">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="text-2xl font-serif font-light text-text-primary">
                MOSÉ
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                <Link href="/products" className="text-text-secondary hover:text-text-primary transition-colors">
                  Products
                </Link>
                <Link href="/categories" className="text-text-secondary hover:text-text-primary transition-colors">
                  Categories
                </Link>
                <Link href="/artists" className="text-text-secondary hover:text-text-primary transition-colors">
                  Artists
                </Link>
                <Link href="/create" className="text-text-secondary hover:text-text-primary transition-colors">
                  Gift Cards
                </Link>
              </nav>

              {/* Desktop Search Bar */}
              <div className="hidden lg:flex flex-1 max-w-md mx-8">
                <form onSubmit={handleSearch} className="relative w-full">
                  <div className="relative">
                    <svg 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search for art, artists, categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text-primary focus:border-transparent transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Right Side Actions */}
              <div className=" items-center space-x-4 flex ">
                {/* Theme Toggle */}

                <div className="hidden md:block">
                  <ThemeToggle />
                </div>

                {/* Mobile Search Icon */}
                <button 
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="lg:hidden text-text-secondary hover:text-text-primary transition-colors"
                >
                  <svg className="w-5 h-5" fill="none"  viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>

                {/* Wishlist Icon */}
                {user && (
                  <Link
                    href="/dashboard?tab=wishlist"
                    className="text-text-secondary hover:text-text-primary transition-colors relative"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    {wishlistCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {wishlistCount > 99 ? '99+' : wishlistCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Notifications Icon */}
                {user && (
                  <button
                    onClick={() => setIsNotificationsOpen(true)}
                    className="text-text-secondary hover:text-text-primary transition-colors relative"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h11a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      2
                    </span>
                  </button>
                )}

                {/* Cart Icon */}
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="text-text-secondary hover:text-text-primary transition-colors relative"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2 bg-text-primary text-background-primary text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {totalItems > 99 ? '99+' : totalItems}
                    </span>
                  )}
                </button>

                {/* Authentication - Client-side only */}
                <AuthSection />

                {/* Mobile Menu Button */}
                <button
                  ref={mobileMenuButtonRef}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden text-text-secondary hover:text-text-primary transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Search Bar */}
            {isSearchOpen && (
              <div className="lg:hidden border-t border-neutral-800 py-4">
                <form onSubmit={handleMobileSearch} className="relative">
                  <div className="relative">
                    <svg 
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search for art, artists, categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-text-primary focus:border-transparent transition-all"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </form>
              </div>
            )}

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <div ref={mobileMenuRef} className="md:hidden border-t border-neutral-800 py-4">
                <nav className="space-y-2">
                  <Link 
                    href="/products" 
                    className="block text-text-secondary hover:text-text-primary transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Products
                  </Link>
                  <Link 
                    href="/categories" 
                    className="block text-text-secondary hover:text-text-primary transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Categories
                  </Link>
                  <Link 
                    href="/artists" 
                    className="block text-text-secondary hover:text-text-primary transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Artists
                  </Link>
                  <Link 
                    href="/create" 
                    className="block text-text-secondary hover:text-text-primary transition-colors py-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Gift Cards
                  </Link>
                  
                  {/* Mobile User Actions */}
                  {user && (
                    <>
                      <Link 
                        href="/dashboard?tab=wishlist" 
                        className="block text-text-secondary hover:text-text-primary transition-colors py-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Wishlist ({wishlistCount})
                      </Link>
                      <button
                        onClick={() => {
                          setIsNotificationsOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="block text-text-secondary hover:text-text-primary transition-colors py-2 w-full text-left"
                      >
                        Notifications (2)
                      </button>
                    </>
                  )}
                  
                  {/* Mobile Theme Toggle */}
                  <div className="py-2 flex items-center justify-between">
                    <span className="text-text-secondary">Theme</span>
                    <ThemeToggle />
                  </div>
                  
                  {!user && (
                    <div className="pt-4 border-t border-neutral-800 space-y-2">
                      <Link 
                        href="/login" 
                        className="block text-text-secondary hover:text-text-primary transition-colors py-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link 
                        href="/register" 
                        className="block bg-text-primary text-background-primary px-4 py-2 rounded hover:bg-text-secondary transition-colors text-center"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        Join
                      </Link>
                    </div>
                  )}
                </nav>
              </div>
            )}
          </div>
        </header>
      </div>

      {/* Cart Sidebar */}
      <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Notification Center */}
      <NotificationCenter 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
      />
    </>
  );
} 