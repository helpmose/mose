"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cart-store";
import { useAuthStore } from "@/store/auth-store";
import { formatPrice } from "@/lib/utils";
import { OrderService, CreateOrderData } from "@/lib/services/order";
import { NotificationService } from "@/lib/services/notifications";
import { ProductService } from "@/lib/services/product";
import { NIGERIAN_STATES } from "@/lib/constants";
import { ID } from "appwrite";

// Load Paystack script
const loadPaystackScript = () => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).PaystackPop) {
      resolve((window as any).PaystackPop);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.onload = () => resolve((window as any).PaystackPop);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

interface PaystackButtonProps {
  amount: number;
  email: string;
  shippingInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode?: string;
    orderNotes?: string;
  };
  onSuccess?: (orderId: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

export default function PaystackButton({
  amount,
  email,
  shippingInfo,
  onSuccess,
  onError,
  disabled = false,
  children,
  className,
}: PaystackButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const handlePayment = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!shippingInfo) {
      onError?.('Shipping information is required');
      return;
    }

    if (items.length === 0) {
      onError?.('Cart is empty');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('🔄 Creating order and initializing Paystack payment...');

      // Create order data from cart items and shipping info
      const orderData: CreateOrderData = {
        buyerId: user.$id,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          customization: item.customizations || {}
        })),
        shippingAddress: {
          fullName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
          phoneNumber: shippingInfo.phone,
          addressLine1: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          postalCode: shippingInfo.postalCode || '',
          country: 'Nigeria'
        },
        shippingMethod: 'standard',
        paymentMethod: 'paystack',
        notes: shippingInfo.orderNotes || ''
      };

      // Create order first (without payment initialization)
      const { order } = await OrderService.createOrder(orderData, false);

      console.log('✅ Order created:', order.orderId);

      // Load Paystack script
      const PaystackPop = await loadPaystackScript();

      // Initialize Paystack popup with a fresh reference
      const paystackPublicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

      if (!paystackPublicKey) {
        throw new Error('Paystack public key not configured');
      }

      // Generate a fresh reference for this payment attempt
      const freshReference = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      console.log('🔄 Setting up Paystack with:', {
        key: paystackPublicKey.substring(0, 8) + '...',
        email: shippingInfo.email,
        amount: amount, // amount is already in kobo
        currency: 'NGN',
        ref: freshReference
      });

      // Validate amount (Paystack expects amount in kobo)
      const amountInKobo = Math.round(amount); // amount is already in kobo, just ensure integer
      console.log('💰 Amount validation:', {
        originalAmount: amount,
        amountInKobo,
        formattedAmount: formatPrice(amount / 100), // Convert to naira for display
        amountInNaira: amount / 100
      });

      if (amountInKobo < 100) { // Minimum ₦1
        throw new Error('Amount too small. Minimum payment is ₦1');
      }
      if (amountInKobo > 50000000) { // Maximum ₦500,000 for test mode
        throw new Error(`Amount too large (₦${(amountInKobo / 100).toFixed(2)}). Maximum payment is ₦500,000 for test transactions`);
      }

      // Validate required fields
      if (!shippingInfo.email || !/\S+@\S+\.\S+/.test(shippingInfo.email)) {
        throw new Error('Valid email address is required');
      }

      const popup = PaystackPop.setup({
        key: paystackPublicKey,
        email: shippingInfo.email,
        amount: amountInKobo,
        currency: 'NGN',
        ref: freshReference,
        metadata: {
          orderId: order.$id,
          buyerId: user.$id,
          orderNumber: order.orderId,
          custom_fields: [
            {
              display_name: "Order Number",
              variable_name: "order_number",
              value: order.orderId
            }
          ]
        },
        callback: function(response: any) {
          console.log('✅ Paystack payment successful:', response.reference);

          // Handle async operations without making the callback async
          (async () => {
            try {
              // Verify payment with our backend
              const verificationResponse = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  reference: response.reference
                })
              });

              const verificationData = await verificationResponse.json();

              if (verificationData.success) {
                console.log('✅ Payment verification successful');

                // Clear cart after successful payment
                clearCart();

                // Success callback
                onSuccess?.(order.$id);

                // Redirect to success page
                router.push(`/checkout/success?orderId=${order.$id}`);
              } else {
                throw new Error(verificationData.message || 'Payment verification failed');
              }
            } catch (verificationError) {
              console.error('❌ Payment verification error:', verificationError);
              onError?.('Payment completed but verification failed. Please contact support.');
            } finally {
              setIsProcessing(false);
            }
          })();
        },
        onClose: function() {
          console.log('ℹ️ Paystack popup closed');
          setIsProcessing(false);
        }
      });

      // Open payment popup
      popup.openIframe();

    } catch (error) {
      console.error('❌ Payment initialization error:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isProcessing}
      className={className}
    >
      {isProcessing ? (
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Processing...</span>
        </div>
      ) : (
        children || `Pay ${formatPrice(amount)}`
      )}
    </Button>
  );
} 