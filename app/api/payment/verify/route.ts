import { NextRequest, NextResponse } from 'next/server';
import { PaystackService } from '@/lib/services/paystack';
import { OrderService } from '@/lib/services/order';
import { ProductService } from '@/lib/services/product';
import { NotificationService } from '@/lib/services/notifications';
import { formatPrice } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { success: false, message: 'Payment reference is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Verifying payment:', reference);

    // Verify payment with Paystack
    const verification = await PaystackService.verifyPayment(reference);

    if (!verification.status || verification.data.status !== 'success') {
      return NextResponse.json(
        { success: false, message: 'Payment verification failed' },
        { status: 400 }
      );
    }

    const orderId = verification.data.metadata?.orderId;
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: 'Order ID not found in payment metadata' },
        { status: 400 }
      );
    }

    // Update order payment status
    const updatedOrder = await OrderService.updatePaymentStatus(
      orderId, 
      'paid', 
      reference
    );

    // Process stock updates for ordered items
    console.log('🔄 Processing stock updates for payment verification...');
    const stockUpdateResult = await ProductService.processOrderFulfillment(
      updatedOrder.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }))
    );

    if (!stockUpdateResult.success && stockUpdateResult.errors.length > 0) {
      console.warn('⚠️ Some stock updates failed during payment verification:', stockUpdateResult.errors);
    }

    // Send notifications
    try {
      const notificationPromises = [
        // Notify buyer
        NotificationService.createNotification({
          userId: updatedOrder.buyerId,
          type: 'order',
          title: '✅ Payment Confirmed!',
          message: `Your payment for order #${updatedOrder.orderId} has been confirmed. Your order is now being processed.`,
          data: {
            orderId: updatedOrder.$id,
            orderNumber: updatedOrder.orderId,
            actionUrl: `/checkout/success?orderId=${updatedOrder.$id}`,
            actionText: 'View Order'
          }
        })
      ];

      // Notify seller
      if (updatedOrder.sellerId) {
        notificationPromises.push(
          NotificationService.createNotification({
            userId: updatedOrder.sellerId,
            type: 'order',
            title: '💰 Payment Received!',
            message: `Payment confirmed for order #${updatedOrder.orderId} worth ${formatPrice(updatedOrder.finalAmount)}. Start processing the order.`,
            data: {
              orderId: updatedOrder.$id,
              orderNumber: updatedOrder.orderId,
              actionUrl: '/seller?tab=orders',
              actionText: 'View Order'
            }
          })
        );
      }

      await Promise.all(notificationPromises);
      console.log('✅ Payment verification notifications sent');
    } catch (notifError) {
      console.warn('⚠️ Failed to send some notifications:', notifError);
    }

    console.log('✅ Payment verification completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        order: updatedOrder,
        paymentData: {
          reference: verification.data.reference,
          amount: verification.data.amount,
          status: verification.data.status,
          paidAt: verification.data.paid_at
        }
      }
    });

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Payment verification failed' 
      },
      { status: 500 }
    );
  }
}