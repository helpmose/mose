"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/auth-store";
import { OrderService, Order } from "@/lib/services/order";
import { formatPrice } from "@/lib/utils";

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      const orderId = searchParams.get('orderId');
      if (!orderId) {
        setError('Order ID not found');
        setLoading(false);
        return;
      }

      try {
        const orderData = await OrderService.getOrder(orderId);
        
        // Verify this order belongs to the current user
        if (orderData.buyerId !== user.$id) {
          setError('Unauthorized access to this order');
          setLoading(false);
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
  }, [user, searchParams, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
            <h1 className="text-2xl font-semibold mb-4">Loading your order details...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-8 bg-red-500/10 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold mb-4">Order Not Found</h1>
            <p className="text-text-muted mb-8">{error || 'Unable to load order details'}</p>
            <Link href="/products">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="w-24 h-24 mx-auto mb-8 bg-green-500/10 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-serif font-light mb-4">Order Confirmed!</h1>
          <p className="text-xl text-text-muted mb-8">
            Thank you for your purchase. Your order has been successfully placed.
          </p>

          {/* Order Details Card */}
          <Card className="p-8 mb-8 text-left">
            <h2 className="text-xl font-semibold mb-6 text-center">Order Details</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-text-muted">Order Number:</span>
                <span className="font-medium">{order.orderId}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-text-muted">Email:</span>
                <span>{user.email}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-text-muted">Order Date:</span>
                <span>{new Date(order.$createdAt).toLocaleDateString('en-NG', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-text-muted">Payment Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  order.paymentStatus === 'paid' ? 'bg-green-500/10 text-green-500' : 
                  order.paymentStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 
                  'bg-red-500/10 text-red-500'
                }`}>
                  {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-text-muted">Shipping Address:</span>
                <div className="text-right text-sm">
                  <div>{order.shippingAddress.fullName}</div>
                  <div>{order.shippingAddress.addressLine1}</div>
                  <div>{order.shippingAddress.city}, {order.shippingAddress.state}</div>
                  <div>{order.shippingAddress.phoneNumber}</div>
                </div>
              </div>
              
              <div className="flex justify-between py-2 border-b border-neutral-800">
                <span className="text-text-muted">Estimated Delivery:</span>
                <span>3-5 business days</span>
              </div>
              
              <div className="flex justify-between py-2 text-lg font-semibold">
                <span>Total Paid:</span>
                <span>{formatPrice(order.finalAmount)}</span>
              </div>
            </div>
          </Card>

          {/* Order Items */}
          <Card className="p-8 mb-8">
            <h3 className="text-lg font-semibold mb-4">Items Ordered</h3>
            <div className="space-y-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-b-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-background-secondary rounded-lg flex items-center justify-center">
                      <span className="text-2xl">🎨</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-text-primary">{item.title}</h4>
                      <p className="text-sm text-text-muted">Qty: {item.quantity}</p>
                      <p className="text-sm text-text-muted">by {item.sellerId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(item.subtotal)}</p>
                    <p className="text-sm text-text-muted">{formatPrice(item.price)} each</p>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 space-y-2">
                <div className="flex justify-between text-text-muted">
                  <span>Subtotal:</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Shipping:</span>
                  <span>{formatPrice(order.shippingAmount)}</span>
                </div>
                <div className="flex justify-between text-text-muted">
                  <span>Tax:</span>
                  <span>{formatPrice(order.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-text-primary pt-2 border-t border-neutral-800">
                  <span>Total:</span>
                  <span>{formatPrice(order.finalAmount)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Next Steps */}
          <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4">What happens next?</h3>
            <div className="space-y-3 text-left">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-medium">Order Confirmation</p>
                  <p className="text-text-muted text-sm">You'll receive an email confirmation shortly</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-medium">Order Processing</p>
                  <p className="text-text-muted text-sm">The seller will prepare your items for shipping</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-medium">Shipping & Delivery</p>
                  <p className="text-text-muted text-sm">Track your package and receive it within 3-5 business days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/buyer?tab=orders">
              <Button className="bg-text-primary text-background-primary hover:bg-text-secondary">
                View Order History
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline">
                Continue Shopping
              </Button>
            </Link>
          </div>

          {/* Support */}
          <div className="mt-12 text-center">
            <p className="text-text-muted mb-4">
              Need help with your order?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:support@mose.com" 
                className="text-text-primary hover:text-text-secondary transition-colors"
              >
                📧 support@mose.com
              </a>
              <a 
                href="tel:+2348000000000" 
                className="text-text-primary hover:text-text-secondary transition-colors"
              >
                📞 +234 800 000 0000
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingSuccess() {
  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
          <h1 className="text-2xl font-semibold mb-4">Loading your order details...</h1>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<LoadingSuccess />}>
      <CheckoutSuccessContent />
    </Suspense>
  );
} 