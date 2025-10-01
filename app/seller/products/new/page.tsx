"use client";

import Header from "@/components/layout/header";
import ProductCreationForm from "@/components/seller/product-creation-form";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewProductPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Check seller access
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (user && user.role !== 'seller') {
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/buyer');
      }
      return;
    }
  }, [user, isAuthenticated, router]);

  // Loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
              <p className="text-text-muted">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        <ProductCreationForm 
          onSave={() => {
            // Navigate back to seller dashboard products tab
            router.push('/seller?tab=products');
          }}
          onCancel={() => {
            router.back();
          }}
        />
      </div>
    </div>
  );
}