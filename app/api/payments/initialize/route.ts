import { NextRequest, NextResponse } from 'next/server';
import { PaystackService, PaystackInitializeData } from '@/lib/services/paystack';

export async function POST(request: NextRequest) {
  try {
    const body: PaystackInitializeData = await request.json();

    // Validate required fields
    if (!body.email || !body.amount) {
      return NextResponse.json(
        { error: 'Email and amount are required' },
        { status: 400 }
      );
    }

    // Initialize payment using PaystackService (server-side)
    const paymentData = await PaystackService.initializePayment(body);

    return NextResponse.json(paymentData);

  } catch (error: any) {
    console.error('❌ Payment initialization failed:', error);

    return NextResponse.json(
      { error: error.message || 'Payment initialization failed' },
      { status: 500 }
    );
  }
}