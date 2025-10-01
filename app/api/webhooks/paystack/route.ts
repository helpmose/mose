import { NextRequest, NextResponse } from 'next/server';
import { PaystackService, PaystackWebhookEvent } from '@/lib/services/paystack';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    
    // Get the signature from headers
    const headersList = headers();
    const signature = headersList.get('x-paystack-signature') || '';

    console.log('🔄 Received Paystack webhook');

    // Verify webhook signature
    if (!PaystackService.verifyWebhookSignature(body, signature)) {
      console.error('❌ Invalid Paystack webhook signature');
      return NextResponse.json(
        { success: false, message: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse the webhook event
    const event: PaystackWebhookEvent = JSON.parse(body);
    
    console.log('🔄 Processing Paystack webhook event:', event.event, 'Reference:', event.data.reference);

    // Process the webhook event using PaystackService
    await PaystackService.processWebhookEvent(event);

    console.log('✅ Paystack webhook processed successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully' 
    });

  } catch (error) {
    console.error('❌ Paystack webhook error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Webhook processing failed' 
      },
      { status: 500 }
    );
  }
}

// Disable body parsing for webhook signature verification
export const runtime = 'nodejs';