"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { OrderService, Order } from "@/lib/services/order";
import OrderDetailsView from "@/components/seller/order-details-view";
import { useAuthProtection, AuthLoadingScreen } from "@/hooks/use-auth-protection";

export default function SellerOrderDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const authProtection = useAuthProtection({ requiredRole: 'seller' });
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      if (!authProtection.hasAccess || !orderId) return;

      try {
        setLoading(true);
        setError(null);
        
        const orderData = await OrderService.getOrder(orderId);
        
        // Verify this order belongs to the current seller
        if (orderData.sellerId !== authProtection.user!.$id) {
          setError('You do not have permission to view this order');
          return;
        }
        
        setOrder(orderData);
      } catch (err) {
        console.error('Error loading order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [authProtection.hasAccess, authProtection.user, orderId]);

  // Handle order status updates
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!authProtection.user) return;
    
    try {
      setUpdating(true);
      const updatedOrder = await OrderService.updateOrderStatus(orderId, newStatus);
      setOrder(updatedOrder);
      
      // Show success message
      alert(`Order status updated to ${newStatus}`);
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error; // Re-throw so the component can handle it
    } finally {
      setUpdating(false);
    }
  };

  // Auth protection loading state
  if (authProtection.isLoading) {
    return <AuthLoadingScreen message="Loading authentication..." />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
              <h1 className="text-xl font-medium mb-2">Loading order details...</h1>
              <p className="text-text-muted">Please wait while we fetch the order information</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-24 h-24 mx-auto mb-8 bg-red-500/10 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-4">Order Not Found</h1>
            <p className="text-text-muted mb-8">{error || 'Unable to load order details'}</p>
            <div className="space-y-3">
              <Button onClick={() => router.back()} className="w-full">
                Go Back
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/seller?tab=orders')}
                className="w-full"
              >
                View All Orders
              </Button>
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
        {/* Back Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </Button>
            <div className="h-6 w-px bg-neutral-700"></div>
            <Button 
              variant="outline"
              onClick={() => router.push('/seller?tab=orders')}
              className="flex items-center space-x-2"
            >
              <span className="text-sm">📦</span>
              <span>All Orders</span>
            </Button>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline"
              onClick={() => {
                // TODO: Implement messaging system
                alert(`Contact customer for order ${order.orderId}`);
              }}
              className="flex items-center space-x-2"
            >
              <span className="text-sm">💬</span>
              <span>Contact Customer</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                // TODO: Implement print functionality
                window.print();
              }}
              className="flex items-center space-x-2"
            >
              <span className="text-sm">🖨️</span>
              <span>Print</span>
            </Button>
          </div>
        </div>

        {/* Order Details */}
        <OrderDetailsView
          order={order}
          onStatusUpdate={handleStatusUpdate}
          isUpdating={updating}
          currentUserRole="seller"
        />

        {/* Quick Actions */}
        <Card className="p-6 mt-8">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleStatusUpdate(order.$id, 'confirmed')}
              disabled={updating || order.orderStatus !== 'pending'}
            >
              ✅ Confirm Order
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleStatusUpdate(order.$id, 'processing')}
              disabled={updating || !['pending', 'confirmed'].includes(order.orderStatus)}
            >
              🔄 Start Processing
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleStatusUpdate(order.$id, 'shipped')}
              disabled={updating || order.orderStatus !== 'processing'}
            >
              🚚 Mark as Shipped
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleStatusUpdate(order.$id, 'delivered')}
              disabled={updating || order.orderStatus !== 'shipped'}
            >
              📦 Mark as Delivered
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const trackingNumber = prompt('Enter tracking number:');
                if (trackingNumber) {
                  // TODO: Implement tracking number update
                  alert(`Tracking number ${trackingNumber} would be saved`);
                }
              }}
              disabled={!['processing', 'shipped'].includes(order.orderStatus)}
            >
              🏷️ Add Tracking
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}