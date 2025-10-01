export interface PaystackInitializeData {
  email: string;
  amount: number; // Amount in kobo
  reference?: string;
  callback_url?: string;
  metadata?: Record<string, any>;
  currency?: string;
  channels?: string[];
  split_code?: string;
  subaccount?: string;
  transaction_charge?: number;
  bearer?: string;
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, any>;
    log: any;
    fees: number;
    fees_split: any;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: Record<string, any>;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: any;
    split: any;
    order_id: string | null;
    paidAt: string;
    createdAt: string;
    requested_amount: number;
    pos_transaction_data: any;
    source: any;
    fees_breakdown: any;
  };
}

export interface PaystackRefundData {
  transaction: string; // Transaction reference or ID
  amount?: number; // Amount to refund in kobo (optional - defaults to full amount)
  currency?: string;
  customer_note?: string;
  merchant_note?: string;
}

export interface PaystackTransferData {
  source: string;
  amount: number; // Amount in kobo
  recipient: string;
  reason?: string;
  currency?: string;
  reference?: string;
}

export interface PaystackSubaccountData {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
  description?: string;
  primary_contact_email?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  metadata?: Record<string, any>;
}

export interface PaystackWebhookEvent {
  event: string;
  data: PaystackVerificationResponse['data'];
}

export class PaystackService {
  private static readonly SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  private static readonly PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  private static readonly BASE_URL = 'https://api.paystack.co';

  /**
   * Initialize a payment transaction
   */
  static async initializePayment(data: PaystackInitializeData): Promise<PaystackInitializeResponse> {
    if (!this.SECRET_KEY) {
      throw new Error('Paystack secret key not configured');
    }

    try {
      console.log('🔄 Initializing Paystack payment for:', data.email, 'Amount:', data.amount);

      // Generate reference if not provided
      const reference = data.reference || this.generateReference();

      const paymentData = {
        email: data.email,
        amount: Math.round(data.amount), // Ensure integer
        reference,
        callback_url: data.callback_url || `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
        currency: data.currency || 'NGN',
        channels: data.channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        metadata: {
          ...data.metadata,
          platform: 'MOSE',
          timestamp: new Date().toISOString()
        },
        ...(data.split_code && { split_code: data.split_code }),
        ...(data.subaccount && { subaccount: data.subaccount }),
        ...(data.transaction_charge && { transaction_charge: data.transaction_charge }),
        ...(data.bearer && { bearer: data.bearer })
      };

      const response = await fetch(`${this.BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      const result: PaystackInitializeResponse = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || 'Payment initialization failed');
      }

      console.log('✅ Paystack payment initialized:', result.data.reference);
      return result;

    } catch (error) {
      console.error('❌ Error initializing Paystack payment:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to initialize payment');
    }
  }

  /**
   * Verify a payment transaction
   */
  static async verifyPayment(reference: string): Promise<PaystackVerificationResponse> {
    if (!this.SECRET_KEY) {
      throw new Error('Paystack secret key not configured');
    }

    try {
      console.log('🔄 Verifying Paystack payment:', reference);

      const response = await fetch(`${this.BASE_URL}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result: PaystackVerificationResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Payment verification failed');
      }

      console.log('✅ Paystack payment verified:', reference, 'Status:', result.data.status);
      return result;

    } catch (error) {
      console.error('❌ Error verifying Paystack payment:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to verify payment');
    }
  }

  /**
   * Process refund for a transaction
   */
  static async refundPayment(data: PaystackRefundData): Promise<any> {
    if (!this.SECRET_KEY) {
      throw new Error('Paystack secret key not configured');
    }

    try {
      console.log('🔄 Processing Paystack refund for:', data.transaction);

      const refundData = {
        transaction: data.transaction,
        ...(data.amount && { amount: Math.round(data.amount) }),
        currency: data.currency || 'NGN',
        customer_note: data.customer_note || 'Refund processed by MOSE platform',
        merchant_note: data.merchant_note || 'Platform refund'
      };

      const response = await fetch(`${this.BASE_URL}/refund`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(refundData)
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || 'Refund processing failed');
      }

      console.log('✅ Paystack refund processed:', data.transaction);
      return result;

    } catch (error) {
      console.error('❌ Error processing Paystack refund:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to process refund');
    }
  }

  /**
   * Create a subaccount for a seller
   */
  static async createSubaccount(data: PaystackSubaccountData): Promise<any> {
    if (!this.SECRET_KEY) {
      throw new Error('Paystack secret key not configured');
    }

    try {
      console.log('🔄 Creating Paystack subaccount for:', data.business_name);

      const subaccountData = {
        business_name: data.business_name,
        settlement_bank: data.settlement_bank,
        account_number: data.account_number,
        percentage_charge: data.percentage_charge,
        description: data.description || 'MOSE Seller Account',
        primary_contact_email: data.primary_contact_email,
        primary_contact_name: data.primary_contact_name,
        primary_contact_phone: data.primary_contact_phone,
        metadata: {
          ...data.metadata,
          platform: 'MOSE',
          created_at: new Date().toISOString()
        }
      };

      const response = await fetch(`${this.BASE_URL}/subaccount`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subaccountData)
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || 'Subaccount creation failed');
      }

      console.log('✅ Paystack subaccount created:', result.data.subaccount_code);
      return result;

    } catch (error) {
      console.error('❌ Error creating Paystack subaccount:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create subaccount');
    }
  }

  /**
   * List banks for account verification
   */
  static async getBanks(country: string = 'nigeria'): Promise<any> {
    if (!this.SECRET_KEY) {
      throw new Error('Paystack secret key not configured');
    }

    try {
      console.log('🔄 Fetching banks for country:', country);

      const response = await fetch(`${this.BASE_URL}/bank?country=${country}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || 'Failed to fetch banks');
      }

      console.log('✅ Banks fetched:', result.data.length);
      return result;

    } catch (error) {
      console.error('❌ Error fetching banks:', error);
      throw new Error('Failed to fetch banks');
    }
  }

  /**
   * Resolve account number to verify account details
   */
  static async resolveAccount(accountNumber: string, bankCode: string): Promise<any> {
    if (!this.SECRET_KEY) {
      throw new Error('Paystack secret key not configured');
    }

    try {
      console.log('🔄 Resolving account:', accountNumber, 'at bank:', bankCode);

      const response = await fetch(
        `${this.BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || 'Failed to resolve account');
      }

      console.log('✅ Account resolved:', result.data.account_name);
      return result;

    } catch (error) {
      console.error('❌ Error resolving account:', error);
      throw new Error('Failed to resolve account');
    }
  }

  /**
   * Handle webhook verification
   */
  static verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.SECRET_KEY) {
      throw new Error('Paystack secret key not configured');
    }

    try {
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha512', this.SECRET_KEY)
        .update(payload, 'utf-8')
        .digest('hex');

      return hash === signature;
    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Process webhook event
   */
  static async processWebhookEvent(event: PaystackWebhookEvent): Promise<void> {
    try {
      console.log('🔄 Processing Paystack webhook event:', event.event, event.data.reference);

      switch (event.event) {
        case 'charge.success':
          await this.handleSuccessfulPayment(event.data);
          break;
        
        case 'charge.failed':
          await this.handleFailedPayment(event.data);
          break;
          
        case 'transfer.success':
          await this.handleSuccessfulTransfer(event.data);
          break;
          
        case 'transfer.failed':
          await this.handleFailedTransfer(event.data);
          break;
          
        default:
          console.log('⚠️ Unhandled webhook event:', event.event);
      }

      console.log('✅ Webhook event processed successfully');

    } catch (error) {
      console.error('❌ Error processing webhook event:', error);
      throw error;
    }
  }

  /**
   * Calculate platform fees
   */
  static calculateFees(amount: number): {
    paystackFee: number;
    platformFee: number;
    sellerAmount: number;
  } {
    // Paystack charges 1.5% + ₦100 for transactions over ₦2500
    // Below ₦2500, it's 1.4%
    let paystackFee: number;
    
    if (amount >= 250000) { // ₦2500 in kobo
      paystackFee = Math.round((amount * 0.015) + 10000); // 1.5% + ₦100
    } else {
      paystackFee = Math.round(amount * 0.014); // 1.4%
    }

    // Platform fee (5% of amount)
    const platformFee = Math.round(amount * 0.05);

    // Amount seller receives
    const sellerAmount = amount - paystackFee - platformFee;

    return {
      paystackFee,
      platformFee,
      sellerAmount
    };
  }

  /**
   * Generate payment reference
   */
  static generateReference(prefix: string = 'MOSE'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Get transaction history
   */
  static async getTransactions(
    page: number = 1,
    perPage: number = 50,
    from?: string,
    to?: string
  ): Promise<any> {
    if (!this.SECRET_KEY) {
      throw new Error('Paystack secret key not configured');
    }

    try {
      console.log('🔄 Fetching Paystack transactions...');

      const params = new URLSearchParams({
        page: page.toString(),
        perPage: perPage.toString(),
        ...(from && { from }),
        ...(to && { to })
      });

      const response = await fetch(`${this.BASE_URL}/transaction?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || !result.status) {
        throw new Error(result.message || 'Failed to fetch transactions');
      }

      console.log('✅ Transactions fetched:', result.data.length);
      return result;

    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      throw new Error('Failed to fetch transactions');
    }
  }

  /**
   * Handle successful payment
   */
  private static async handleSuccessfulPayment(data: PaystackVerificationResponse['data']): Promise<void> {
    console.log('🔄 Handling successful payment:', data.reference);
    
    // Update order payment status
    if (data.metadata?.orderId) {
      // Import OrderService here to avoid circular dependency
      const { OrderService } = await import('./order');
      await OrderService.updatePaymentStatus(data.metadata.orderId, 'paid', data.reference);
    }

    // Update gift contribution status
    if (data.metadata?.contributionId) {
      const { GiftService } = await import('./gifts');
      await GiftService.updateContributionPaymentStatus(data.metadata.contributionId, 'paid');
    }
  }

  /**
   * Handle failed payment
   */
  private static async handleFailedPayment(data: PaystackVerificationResponse['data']): Promise<void> {
    console.log('🔄 Handling failed payment:', data.reference);
    
    // Update payment status as failed
    if (data.metadata?.orderId) {
      const { OrderService } = await import('./order');
      await OrderService.updatePaymentStatus(data.metadata.orderId, 'failed', data.reference);
    }

    if (data.metadata?.contributionId) {
      const { GiftService } = await import('./gifts');
      await GiftService.updateContributionPaymentStatus(data.metadata.contributionId, 'failed');
    }
  }

  /**
   * Handle successful transfer
   */
  private static async handleSuccessfulTransfer(data: any): Promise<void> {
    console.log('🔄 Handling successful transfer:', data.reference);
    // Handle seller payout success
  }

  /**
   * Handle failed transfer
   */
  private static async handleFailedTransfer(data: any): Promise<void> {
    console.log('🔄 Handling failed transfer:', data.reference);
    // Handle seller payout failure
  }
}

export default PaystackService;