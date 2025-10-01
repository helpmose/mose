"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { formatPrice } from "@/lib/utils";
import { NIGERIAN_STATES } from "@/lib/constants";
import PaystackButton from "@/components/payment/paystack-button";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Shipping Information
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    
    // Payment Information
    paymentMethod: 'paystack',
    
    // Order Notes
    orderNotes: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }
    
    if (items.length === 0) {
      router.push('/products');
      return;
    }
  }, [user, items, router]);

  const subtotal = getTotalPrice();
  const shipping = subtotal > 100000 ? 0 : 5000; // Free shipping over ₦100,000
  const tax = Math.round(subtotal * 0.075); // 7.5% VAT
  const total = subtotal + shipping + tax;

  // Debug pricing calculation
  console.log('💰 Checkout pricing breakdown:', {
    cartItems: items.length,
    subtotal: formatPrice(subtotal), // formatPrice expects kobo
    shipping: formatPrice(shipping),
    tax: formatPrice(tax),
    total: formatPrice(total),
    totalInKobo: total,
    totalInNaira: total / 100
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSuccess = (orderId: string) => {
    console.log('Order created successfully:', orderId);
    // Order creation success is handled by the PaystackButton component
    // Cart is cleared and user is redirected to success page
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    alert('Payment failed. Please try again.');
  };

  if (!user || items.length === 0) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="text-center py-16">
            <h1 className="text-2xl font-semibold mb-4">Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-light mb-4">Checkout</h1>
          <nav className="flex items-center space-x-2 text-sm text-text-muted">
            <button onClick={() => router.push("/")} className="hover:text-text-primary">Home</button>
            <span>/</span>
            <button onClick={() => router.push("/products")} className="hover:text-text-primary">Products</button>
            <span>/</span>
            <span className="text-text-primary">Checkout</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Shipping Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Shipping Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    First Name *
                  </label>
                  <Input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="bg-background-tertiary border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Last Name *
                  </label>
                  <Input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="bg-background-tertiary border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Email *
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="bg-background-tertiary border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Phone Number *
                  </label>
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="bg-background-tertiary border-neutral-700"
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Street Address *
                  </label>
                  <Input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="bg-background-tertiary border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    City *
                  </label>
                  <Input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="bg-background-tertiary border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    State *
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-background-tertiary border border-neutral-700 text-text-primary rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-text-primary"
                  >
                    <option value="">Select State</option>
                    {NIGERIAN_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Postal Code
                  </label>
                  <Input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="bg-background-tertiary border-neutral-700"
                  />
                </div>
              </div>
            </Card>

            {/* Payment Information */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Payment Method</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 border border-neutral-700 rounded-lg">
                  <input
                    type="radio"
                    id="paystack"
                    name="paymentMethod"
                    value="paystack"
                    checked={formData.paymentMethod === 'paystack'}
                    onChange={handleInputChange}
                    className="text-text-primary"
                  />
                  <label htmlFor="paystack" className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="font-medium">Paystack</div>
                      <div className="text-sm text-text-muted">Pay with card, bank transfer, or USSD</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">
                        VISA
                      </div>
                      <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center font-bold">
                        MC
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium text-blue-800 dark:text-blue-200">Secure Payment</p>
                      <p className="text-blue-700 dark:text-blue-300">Your payment information is encrypted and secure. You'll be redirected to Paystack to complete your payment.</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Order Notes */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Order Notes (Optional)</h2>
              <textarea
                name="orderNotes"
                value={formData.orderNotes}
                onChange={handleInputChange}
                placeholder="Special instructions for your order..."
                rows={4}
                className="w-full bg-background-tertiary border border-neutral-700 text-text-primary rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-text-primary resize-none"
              />
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-32">
              <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
              
              {/* Cart Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center space-x-4">
                    <div className="relative w-16 h-16 bg-background-secondary rounded-lg overflow-hidden">
                      <Image
                        src={item.product.images?.[0] || "/placeholder-product.jpg"}
                        alt={item.product.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary truncate">{item.product.title}</h3>
                      <p className="text-sm text-text-muted">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-text-primary font-medium">
                      {formatPrice(item.totalPrice)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Totals */}
              <div className="space-y-3 border-t border-neutral-700 pt-4">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Tax (7.5%)</span>
                  <span>{formatPrice(tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-text-primary border-t border-neutral-700 pt-3">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Payment Button */}
              <div className="mt-6">
                <PaystackButton
                  amount={total}
                  email={formData.email}
                  shippingInfo={{
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    postalCode: formData.postalCode,
                    orderNotes: formData.orderNotes
                  }}
                  disabled={!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.address || !formData.city || !formData.state}
                  className="w-full bg-text-primary text-background-primary hover:bg-text-secondary"
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                >
                  Complete Order - {formatPrice(total)}
                </PaystackButton>
              </div>

              {/* Security Notice */}
              <div className="mt-4 text-xs text-text-muted text-center">
                <div className="flex items-center justify-center space-x-1 mb-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Secure Checkout</span>
                </div>
                <p>Your payment information is protected by 256-bit SSL encryption</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 