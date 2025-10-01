import { databases } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { NotificationService } from './notifications';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/lib/constants';
import type { Product } from './product';

export interface OrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  customization?: Record<string, any>;
  sellerId: string;
  subtotal: number;
}

export interface Address {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
}

export interface Order {
  $id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  items: OrderItem[];
  totalAmount: number;
  shippingAmount: number;
  taxAmount: number;
  finalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  paymentReference: string;
  shippingAddress: Address;
  billingAddress?: Address;
  shippingMethod: string;
  trackingNumber?: string;
  notes?: string;
  disputeStatus: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface CreateOrderData {
  buyerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    customization?: Record<string, any>;
  }>;
  shippingAddress: Address;
  billingAddress?: Address;
  shippingMethod: string;
  paymentMethod: string;
  notes?: string;
}

export interface OrderFilters {
  buyerId?: string;
  sellerId?: string;
  orderStatus?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest' | 'amount_asc' | 'amount_desc' | 'status';
}

export class OrderService {
  private static readonly COLLECTION_ID = 'orders';

  /**
   * Create a new order with automatic calculations
   */
  static async createOrder(orderData: CreateOrderData, initializePayment = true): Promise<{
    order: Order;
    paymentUrl?: string;
  }> {
    try {
      console.log('🔄 Creating order with MCP validation...');

      // Fetch product details for validation and pricing
      const products = await Promise.all(
        orderData.items.map(async (item) => {
          const product = await databases.getDocument(
            DATABASE_ID,
            'products',
            item.productId
          );
          return { ...product, requestedQuantity: item.quantity, customization: item.customization };
        })
      );

      // Validate stock availability
      for (const product of products) {
        if (product.stock < product.requestedQuantity) {
          throw new Error(`Insufficient stock for ${product.title}. Available: ${product.stock}, Requested: ${product.requestedQuantity}`);
        }
      }

      // Group items by seller (for multi-seller support later)
      const sellerGroups = products.reduce((acc, product) => {
        if (!acc[product.sellerId]) {
          acc[product.sellerId] = [];
        }
        acc[product.sellerId].push(product);
        return acc;
      }, {} as Record<string, any[]>);

      // For now, handle single-seller orders
      const sellerIds = Object.keys(sellerGroups);
      if (sellerIds.length > 1) {
        throw new Error('Multi-seller orders not yet supported. Please order from one seller at a time.');
      }

      const sellerId = sellerIds[0];

      // Calculate order amounts
      const orderItems: OrderItem[] = products.map((product) => ({
        productId: product.$id,
        title: product.title,
        price: product.salePrice || product.price,
        quantity: product.requestedQuantity,
        customization: product.customization,
        sellerId: product.sellerId,
        subtotal: (product.salePrice || product.price) * product.requestedQuantity
      }));

      const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const shippingAmount = this.calculateShipping(orderItems, orderData.shippingMethod);
      const taxAmount = Math.round(totalAmount * 0.075); // 7.5% VAT
      const finalAmount = totalAmount + shippingAmount + taxAmount;

      // Generate payment reference and orderId
      const paymentReference = `ORDER_${Date.now()}_${ID.unique().slice(-8)}`;
      const orderId = `MOSE-${Date.now().toString().slice(-8)}-${ID.unique().slice(-4).toUpperCase()}`;

      // Prepare order document
      const orderDocument = {
        orderId,
        buyerId: orderData.buyerId,
        userId: sellerId,
        items: JSON.stringify(orderItems),
        totalAmount,
        shippingAmount,
        taxAmount,
        finalAmount,
        paymentStatus: PAYMENT_STATUS.PENDING,
        orderStatus: ORDER_STATUS.PENDING,
        paymentReference,
        shippingAddress: JSON.stringify(orderData.shippingAddress),
        billingAddress: orderData.billingAddress ? JSON.stringify(orderData.billingAddress) : '',
        shippingMethod: orderData.shippingMethod,
        trackingNumber: '',
        notes: orderData.notes || '',
        disputeStatus: 'none'
      };

      // Create order with MCP validation
      const createdOrder = await databases.createDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        ID.unique(),
        orderDocument
      );

      console.log('✅ Order created successfully:', createdOrder.$id);

      // Skip payment initialization if not requested
      if (!initializePayment) {
        return {
          order: this.transformOrder(createdOrder)
        };
      }

      // Get user email from user profile
      let userEmail = `${orderData.buyerId}@temp.com`; // Fallback
      try {
        const { databases } = await import('@/lib/appwrite');
        const { Query } = await import('appwrite');

        // Query user profile by userId field, not document ID
        const userProfileResponse = await databases.listDocuments(
          DATABASE_ID,
          'user_profiles',
          [Query.equal('userId', orderData.buyerId)]
        );

        if (userProfileResponse.documents.length > 0) {
          const userProfile = userProfileResponse.documents[0];
          userEmail = userProfile.contactEmail || userProfile.email || userEmail;
        } else {
          console.warn('No user profile found for user ID:', orderData.buyerId);

          // Auto-create missing profile to fix this issue
          try {
            const { UserService } = await import('./user');
            const { account } = await import('@/lib/appwrite');

            // Get the current user's auth info
            const authUser = await account.get();
            if (authUser.$id === orderData.buyerId) {
              console.log('🔄 Auto-creating missing user profile...');
              const newProfile = await UserService.createProfile(orderData.buyerId, {
                userType: 'buyer',
                displayName: authUser.name,
                contactEmail: authUser.email,
                preferences: {
                  theme: 'light',
                  emailNotifications: true,
                  pushNotifications: true,
                  marketingEmails: false
                }
              });
              userEmail = authUser.email;
              console.log('✅ Auto-created user profile:', newProfile.$id);
            }
          } catch (profileCreateError) {
            console.warn('Failed to auto-create profile:', profileCreateError);
          }
        }
      } catch (emailError) {
        console.warn('Could not get user email, using fallback:', emailError);
      }

      // Initialize payment via secure API route
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          amount: finalAmount * 100, // Convert to kobo
          reference: paymentReference,
          metadata: {
            orderId: createdOrder.$id,
            buyerId: orderData.buyerId,
            sellerIds: [sellerId],
            itemCount: orderItems.length
          },
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success?orderId=${createdOrder.$id}`
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Payment initialization failed');
      }

      const paymentInitialization = await response.json();

      console.log('✅ Paystack payment initialized:', paymentInitialization.data.reference);

      return {
        order: this.transformOrder(createdOrder),
        paymentUrl: paymentInitialization.data.authorization_url
      };

    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create order');
    }
  }

  /**
   * Get orders with advanced filtering
   */
  static async getOrders(filters: OrderFilters = {}): Promise<{
    orders: Order[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      console.log('🔄 Fetching orders with filters:', filters);

      const queries: string[] = [];

      // User-specific filters
      if (filters.buyerId) {
        queries.push(Query.equal('buyerId', filters.buyerId));
      }

      if (filters.sellerId) {
        queries.push(Query.equal('userId', filters.sellerId));
      }

      // Status filters
      if (filters.orderStatus) {
        queries.push(Query.equal('orderStatus', filters.orderStatus));
      }

      if (filters.paymentStatus) {
        queries.push(Query.equal('paymentStatus', filters.paymentStatus));
      }

      // Date range filters
      if (filters.dateFrom) {
        queries.push(Query.greaterThanEqual('$createdAt', filters.dateFrom));
      }

      if (filters.dateTo) {
        queries.push(Query.lessThanEqual('$createdAt', filters.dateTo));
      }

      // Amount filters
      if (filters.minAmount !== undefined) {
        queries.push(Query.greaterThanEqual('finalAmount', Math.round(filters.minAmount * 100)));
      }

      if (filters.maxAmount !== undefined) {
        queries.push(Query.lessThanEqual('finalAmount', Math.round(filters.maxAmount * 100)));
      }

      // Sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'newest':
            queries.push(Query.orderDesc('$createdAt'));
            break;
          case 'oldest':
            queries.push(Query.orderAsc('$createdAt'));
            break;
          case 'amount_asc':
            queries.push(Query.orderAsc('finalAmount'));
            break;
          case 'amount_desc':
            queries.push(Query.orderDesc('finalAmount'));
            break;
          case 'status':
            queries.push(Query.orderDesc('orderStatus'));
            break;
          default:
            queries.push(Query.orderDesc('$createdAt'));
        }
      } else {
        queries.push(Query.orderDesc('$createdAt'));
      }

      // Pagination
      const limit = Math.min(filters.limit || 20, 100);
      const offset = filters.offset || 0;

      queries.push(Query.limit(limit));
      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      // Fetch orders with MCP optimization
      const response = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        queries
      );

      const orders = response.documents.map(this.transformOrder);
      const hasMore = response.total > offset + orders.length;

      console.log(`✅ Retrieved ${orders.length} of ${response.total} orders`);

      return {
        orders,
        total: response.total,
        hasMore
      };

    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get a single order by ID
   */
  static async getOrder(orderId: string): Promise<Order> {
    try {
      console.log('🔄 Fetching order:', orderId);

      const order = await databases.getDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        orderId
      );

      console.log('✅ Order retrieved:', order.$id);
      return this.transformOrder(order);

    } catch (error) {
      console.error('❌ Error fetching order:', error);
      throw new Error('Order not found');
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(
    orderId: string,
    status: string,
    trackingNumber?: string
  ): Promise<Order> {
    try {
      console.log(`🔄 Updating order status to ${status}:`, orderId);

      if (!Object.values(ORDER_STATUS).includes(status as any)) {
        throw new Error(`Invalid order status: ${status}`);
      }

      const updateData: Record<string, any> = { 
        orderStatus: status,
        $updatedAt: new Date().toISOString()
      };

      if (trackingNumber) {
        updateData.trackingNumber = trackingNumber;
      }

      const updatedOrder = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        orderId,
        updateData
      );

      const transformedOrder = this.transformOrder(updatedOrder);

      // Send notifications for status changes (but not for initial creation)  
      try {
        // Get current order to check if we need to notify (avoid notification on first status set)
        const currentOrder = await this.getOrder(orderId);
        
        // Notify buyer about order status change
        await NotificationService.notifyOrderStatusChanged(
          transformedOrder.buyerId,
          orderId,
          transformedOrder.orderId,
          'previous_status', // We'll improve this in production
          status
        );
      } catch (notificationError) {
        console.warn('⚠️ Failed to send order status notification:', notificationError);
      }

      console.log('✅ Order status updated:', updatedOrder.$id);
      return transformedOrder;

    } catch (error) {
      console.error('❌ Error updating order status:', error);
      throw new Error('Failed to update order status');
    }
  }

  /**
   * Update payment status
   */
  static async updatePaymentStatus(
    orderId: string,
    paymentStatus: string,
    paymentReference?: string
  ): Promise<Order> {
    try {
      console.log(`🔄 Updating payment status to ${paymentStatus}:`, orderId);

      if (!Object.values(PAYMENT_STATUS).includes(paymentStatus as any)) {
        throw new Error(`Invalid payment status: ${paymentStatus}`);
      }

      const updateData: Record<string, any> = { 
        paymentStatus,
        $updatedAt: new Date().toISOString()
      };

      if (paymentReference) {
        updateData.paymentReference = paymentReference;
      }

      // Auto-update order status based on payment status
      if (paymentStatus === PAYMENT_STATUS.PAID && updateData.orderStatus === ORDER_STATUS.PENDING) {
        updateData.orderStatus = ORDER_STATUS.CONFIRMED;
      }

      const updatedOrder = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        orderId,
        updateData
      );

      console.log('✅ Payment status updated:', updatedOrder.$id);
      return this.transformOrder(updatedOrder);

    } catch (error) {
      console.error('❌ Error updating payment status:', error);
      throw new Error('Failed to update payment status');
    }
  }

  /**
   * Cancel order
   */
  static async cancelOrder(orderId: string, reason: string): Promise<Order> {
    try {
      console.log('🔄 Cancelling order:', orderId);

      const order = await this.getOrder(orderId);

      // Check if order can be cancelled
      if ([ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED].includes(order.orderStatus)) {
        throw new Error(`Cannot cancel order with status: ${order.orderStatus}`);
      }

      const updatedOrder = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        orderId,
        {
          orderStatus: ORDER_STATUS.CANCELLED,
          notes: order.notes ? `${order.notes}\n\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`,
          $updatedAt: new Date().toISOString()
        }
      );

      console.log('✅ Order cancelled:', updatedOrder.$id);
      return this.transformOrder(updatedOrder);

    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      throw new Error('Failed to cancel order');
    }
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(sellerId?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    averageOrderValue: number;
  }> {
    try {
      console.log('🔄 Fetching order statistics...');

      const filters: OrderFilters = {};
      if (sellerId) {
        filters.sellerId = sellerId;
      }

      const allOrders = await this.getOrders({
        ...filters,
        limit: 1000 // Get a large sample for stats
      });

      const totalOrders = allOrders.orders.length;
      const totalRevenue = allOrders.orders.reduce((sum, order) => sum + order.finalAmount, 0);
      const pendingOrders = allOrders.orders.filter(order => 
        [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING].includes(order.orderStatus)
      ).length;
      const completedOrders = allOrders.orders.filter(order => 
        order.orderStatus === ORDER_STATUS.DELIVERED
      ).length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      console.log('✅ Order statistics calculated');

      return {
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        averageOrderValue
      };

    } catch (error) {
      console.error('❌ Error fetching order statistics:', error);
      throw new Error('Failed to fetch order statistics');
    }
  }

  /**
   * Calculate shipping cost based on items and method
   */
  private static calculateShipping(items: OrderItem[], shippingMethod: string): number {
    // Basic shipping calculation - can be made more sophisticated
    const baseShipping = 2500; // ₦25 base shipping
    const totalWeight = items.reduce((sum, item) => sum + (item.quantity * 0.5), 0); // Assume 0.5kg per item
    
    switch (shippingMethod.toLowerCase()) {
      case 'standard':
        return baseShipping;
      case 'express':
        return baseShipping * 1.5;
      case 'overnight':
        return baseShipping * 2;
      case 'free':
        return 0;
      default:
        return baseShipping;
    }
  }

  /**
   * Transform database document to Order interface
   */
  private static transformOrder(doc: any): Order {
    // Generate fake orderId from document ID for display purposes
    const fakeOrderId = `MOSE-${doc.$id.slice(-8).toUpperCase()}`;
    
    return {
      $id: doc.$id,
      orderId: fakeOrderId,
      buyerId: doc.buyerId,
      sellerId: doc.userId || doc.sellerId,
      items: doc.items ? JSON.parse(doc.items) : [],
      totalAmount: doc.totalAmount, // Keep amounts as-is (not converted from kobo since we store them directly)
      shippingAmount: doc.shippingAmount,
      taxAmount: doc.taxAmount,
      finalAmount: doc.finalAmount,
      paymentStatus: doc.paymentStatus,
      orderStatus: doc.orderStatus,
      paymentReference: doc.paymentReference,
      shippingAddress: doc.shippingAddress ? JSON.parse(doc.shippingAddress) : {} as Address,
      billingAddress: doc.billingAddress ? JSON.parse(doc.billingAddress) : undefined,
      shippingMethod: doc.shippingMethod,
      trackingNumber: doc.trackingNumber || undefined,
      notes: doc.notes || undefined,
      disputeStatus: doc.disputeStatus,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }
}

export default OrderService;