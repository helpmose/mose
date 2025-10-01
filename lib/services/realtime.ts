import client from '@/lib/appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
import type { Message, Conversation } from './messaging';
import type { Order } from './order';
import type { GiftEvent, GiftContribution } from './gifts';

export interface RealtimeEvent<T = any> {
  event: string;
  channels: string[];
  payload: T;
  timestamp: string;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: string;
}

export interface OnlineStatus {
  userId: string;
  isOnline: boolean;
  lastSeen: string;
}

export class RealtimeService {
  private static activeSubscriptions = new Map<string, (() => void)[]>();
  private static typingTimeouts = new Map<string, NodeJS.Timeout>();
  private static onlineUsers = new Set<string>();

  /**
   * Subscribe to real-time order updates
   */
  static subscribeToOrderUpdates(
    userId: string,
    onUpdate: (order: Order) => void,
    onError?: (error: any) => void
  ): () => void {
    console.log('🔄 Setting up real-time order subscription for user:', userId);

    const channels = [
      `databases.${DATABASE_ID}.collections.orders.documents`,
    ];

    const unsubscribe = client.subscribe(
      channels,
      (response: RealtimeEvent) => {
        try {
          const order = response.payload;
          
          // Only notify if user is buyer or seller
          if (order.buyerId === userId || order.sellerId === userId) {
            console.log('📡 Order update received:', order.orderId, response.event);
            onUpdate(this.transformOrderForRealtime(order));
          }
        } catch (error) {
          console.error('❌ Error processing order update:', error);
          onError?.(error);
        }
      },
      onError
    );

    this.addSubscription('orderUpdates', unsubscribe);
    console.log('✅ Real-time order subscription active');

    return unsubscribe;
  }

  /**
   * Subscribe to real-time gift event updates
   */
  static subscribeToGiftEventUpdates(
    eventId: string,
    onUpdate: (event: GiftEvent) => void,
    onNewContribution: (contribution: GiftContribution) => void,
    onError?: (error: any) => void
  ): () => void {
    console.log('🔄 Setting up real-time gift event subscription:', eventId);

    const eventUnsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.gift_events.documents.${eventId}`,
      (response: RealtimeEvent) => {
        try {
          if (response.event.includes('update')) {
            console.log('📡 Gift event update received:', eventId);
            onUpdate(this.transformGiftEventForRealtime(response.payload));
          }
        } catch (error) {
          console.error('❌ Error processing gift event update:', error);
          onError?.(error);
        }
      },
      onError
    );

    const contributionsUnsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.gift_contributions.documents`,
      (response: RealtimeEvent) => {
        try {
          const contribution = response.payload;
          
          if (contribution.eventId === eventId && response.event.includes('create')) {
            console.log('📡 New gift contribution received:', contribution.contributionId);
            onNewContribution(this.transformContributionForRealtime(contribution));
          }
        } catch (error) {
          console.error('❌ Error processing gift contribution:', error);
          onError?.(error);
        }
      },
      onError
    );

    const cleanup = () => {
      eventUnsubscribe();
      contributionsUnsubscribe();
    };

    this.addSubscription('giftEventUpdates', cleanup);
    console.log('✅ Real-time gift event subscription active');

    return cleanup;
  }

  /**
   * Subscribe to real-time conversation updates
   */
  static subscribeToConversationUpdates(
    userId: string,
    onNewMessage: (message: Message) => void,
    onConversationUpdate: (conversation: Conversation) => void,
    onTyping?: (indicator: TypingIndicator) => void,
    onError?: (error: any) => void
  ): () => void {
    console.log('🔄 Setting up real-time conversation subscription for user:', userId);

    // Subscribe to all messages (will be filtered by conversation participation)
    const messagesUnsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.messages.documents`,
      (response: RealtimeEvent) => {
        try {
          if (response.event.includes('create')) {
            const message = response.payload;
            
            // Check if user is a participant in the conversation
            // This would need to be validated by checking conversation participants
            console.log('📡 New message received:', message.messageId);
            onNewMessage(this.transformMessageForRealtime(message));
          }
        } catch (error) {
          console.error('❌ Error processing new message:', error);
          onError?.(error);
        }
      },
      onError
    );

    // Subscribe to conversation updates
    const conversationsUnsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.conversations.documents`,
      (response: RealtimeEvent) => {
        try {
          if (response.event.includes('update')) {
            const conversation = response.payload;
            const participants = JSON.parse(conversation.participants || '[]');
            
            if (participants.includes(userId)) {
              console.log('📡 Conversation update received:', conversation.conversationId);
              onConversationUpdate(this.transformConversationForRealtime(conversation));
            }
          }
        } catch (error) {
          console.error('❌ Error processing conversation update:', error);
          onError?.(error);
        }
      },
      onError
    );

    const cleanup = () => {
      messagesUnsubscribe();
      conversationsUnsubscribe();
    };

    this.addSubscription('conversationUpdates', cleanup);
    console.log('✅ Real-time conversation subscription active');

    return cleanup;
  }

  /**
   * Subscribe to user presence updates
   */
  static subscribeToPresence(
    onUserOnline: (userId: string) => void,
    onUserOffline: (userId: string) => void,
    onError?: (error: any) => void
  ): () => void {
    console.log('🔄 Setting up real-time presence subscription');

    // Subscribe to user session updates
    const unsubscribe = client.subscribe(
      `users`,
      (response: RealtimeEvent) => {
        try {
          const user = response.payload;
          
          if (response.event.includes('sessions.create')) {
            console.log('📡 User came online:', user.$id);
            this.onlineUsers.add(user.$id);
            onUserOnline(user.$id);
          } else if (response.event.includes('sessions.delete')) {
            console.log('📡 User went offline:', user.$id);
            this.onlineUsers.delete(user.$id);
            onUserOffline(user.$id);
          }
        } catch (error) {
          console.error('❌ Error processing presence update:', error);
          onError?.(error);
        }
      },
      onError
    );

    this.addSubscription('presence', unsubscribe);
    console.log('✅ Real-time presence subscription active');

    return unsubscribe;
  }

  /**
   * Send typing indicator
   */
  static sendTypingIndicator(
    conversationId: string,
    userId: string,
    userName: string,
    isTyping: boolean = true
  ): void {
    console.log('📝 Sending typing indicator:', { conversationId, userId, isTyping });

    const indicator: TypingIndicator = {
      conversationId,
      userId,
      userName,
      isTyping,
      timestamp: new Date().toISOString()
    };

    // Broadcast typing indicator to all conversation participants
    // This would typically use a separate real-time channel or WebSocket
    // For now, we'll simulate it with a custom event

    if (isTyping) {
      // Clear any existing timeout for this user
      const timeoutKey = `${conversationId}-${userId}`;
      if (this.typingTimeouts.has(timeoutKey)) {
        clearTimeout(this.typingTimeouts.get(timeoutKey)!);
      }

      // Set timeout to automatically stop typing after 3 seconds
      const timeout = setTimeout(() => {
        this.sendTypingIndicator(conversationId, userId, userName, false);
        this.typingTimeouts.delete(timeoutKey);
      }, 3000);

      this.typingTimeouts.set(timeoutKey, timeout);
    }

    // In a real implementation, this would emit to a typing channel
    console.log('✅ Typing indicator sent');
  }

  /**
   * Get online users
   */
  static getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  /**
   * Check if user is online
   */
  static isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * Subscribe to product updates (for inventory, status changes)
   */
  static subscribeToProductUpdates(
    sellerId: string,
    onUpdate: (product: any) => void,
    onError?: (error: any) => void
  ): () => void {
    console.log('🔄 Setting up real-time product subscription for seller:', sellerId);

    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.products.documents`,
      (response: RealtimeEvent) => {
        try {
          const product = response.payload;
          
          if (product.sellerId === sellerId) {
            console.log('📡 Product update received:', product.productId, response.event);
            onUpdate(product);
          }
        } catch (error) {
          console.error('❌ Error processing product update:', error);
          onError?.(error);
        }
      },
      onError
    );

    this.addSubscription('productUpdates', unsubscribe);
    console.log('✅ Real-time product subscription active');

    return unsubscribe;
  }

  /**
   * Subscribe to system-wide notifications
   */
  static subscribeToSystemNotifications(
    userId: string,
    onNotification: (notification: any) => void,
    onError?: (error: any) => void
  ): () => void {
    console.log('🔄 Setting up system notifications subscription for user:', userId);

    // This would subscribe to a notifications collection
    const unsubscribe = client.subscribe(
      `databases.${DATABASE_ID}.collections.notifications.documents`,
      (response: RealtimeEvent) => {
        try {
          const notification = response.payload;
          
          // Filter notifications for this user
          if (notification.userId === userId || notification.userId === 'all') {
            console.log('📡 System notification received:', notification.type);
            onNotification(notification);
          }
        } catch (error) {
          console.error('❌ Error processing system notification:', error);
          onError?.(error);
        }
      },
      onError
    );

    this.addSubscription('systemNotifications', unsubscribe);
    console.log('✅ System notifications subscription active');

    return unsubscribe;
  }

  /**
   * Cleanup all subscriptions
   */
  static cleanup(): void {
    console.log('🔄 Cleaning up all real-time subscriptions...');

    this.activeSubscriptions.forEach((unsubscribeFunctions, key) => {
      console.log(`Cleaning up ${key} subscriptions...`);
      unsubscribeFunctions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error(`Error cleaning up ${key} subscription:`, error);
        }
      });
    });

    this.activeSubscriptions.clear();
    
    // Clear typing timeouts
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();

    // Clear online users
    this.onlineUsers.clear();

    console.log('✅ All real-time subscriptions cleaned up');
  }

  /**
   * Get health status of real-time connections
   */
  static getConnectionHealth(): {
    activeSubscriptions: number;
    subscriptionTypes: string[];
    onlineUsers: number;
    typingIndicators: number;
  } {
    return {
      activeSubscriptions: Array.from(this.activeSubscriptions.values()).reduce(
        (total, subscriptions) => total + subscriptions.length, 
        0
      ),
      subscriptionTypes: Array.from(this.activeSubscriptions.keys()),
      onlineUsers: this.onlineUsers.size,
      typingIndicators: this.typingTimeouts.size
    };
  }

  /**
   * Add subscription to tracking
   */
  private static addSubscription(type: string, unsubscribe: () => void): void {
    if (!this.activeSubscriptions.has(type)) {
      this.activeSubscriptions.set(type, []);
    }
    this.activeSubscriptions.get(type)!.push(unsubscribe);
  }

  /**
   * Transform data for real-time events
   */
  private static transformOrderForRealtime(doc: any): Order {
    return {
      $id: doc.$id,
      orderId: doc.orderId,
      buyerId: doc.buyerId,
      sellerId: doc.sellerId,
      items: doc.items ? JSON.parse(doc.items) : [],
      totalAmount: doc.totalAmount / 100,
      shippingAmount: doc.shippingAmount / 100,
      taxAmount: doc.taxAmount / 100,
      finalAmount: doc.finalAmount / 100,
      paymentStatus: doc.paymentStatus,
      orderStatus: doc.orderStatus,
      paymentReference: doc.paymentReference,
      shippingAddress: doc.shippingAddress ? JSON.parse(doc.shippingAddress) : {} as any,
      billingAddress: doc.billingAddress ? JSON.parse(doc.billingAddress) : undefined,
      shippingMethod: doc.shippingMethod,
      trackingNumber: doc.trackingNumber || undefined,
      notes: doc.notes || undefined,
      disputeStatus: doc.disputeStatus,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }

  private static transformGiftEventForRealtime(doc: any): GiftEvent {
    return {
      $id: doc.$id,
      eventId: doc.eventId,
      creatorId: doc.creatorId,
      recipientName: doc.recipientName,
      recipientEmail: doc.recipientEmail || undefined,
      eventType: doc.eventType,
      eventDate: doc.eventDate,
      title: doc.title,
      description: doc.description || undefined,
      coverImage: doc.coverImage || undefined,
      theme: doc.theme,
      status: doc.status,
      privacy: doc.privacy,
      giftGoal: doc.giftGoal / 100,
      currentAmount: doc.currentAmount / 100,
      contributorsCount: doc.contributorsCount,
      playlistId: doc.playlistId || undefined,
      digitalCard: doc.digitalCard ? JSON.parse(doc.digitalCard) : undefined,
      settings: doc.settings ? JSON.parse(doc.settings) : undefined,
      expiresAt: doc.expiresAt || undefined,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }

  private static transformContributionForRealtime(doc: any): GiftContribution {
    return {
      $id: doc.$id,
      contributionId: doc.contributionId,
      eventId: doc.eventId,
      contributorId: doc.contributorId || undefined,
      contributorName: doc.contributorName,
      contributorEmail: doc.contributorEmail,
      amount: doc.amount / 100,
      message: doc.message || undefined,
      isAnonymous: doc.isAnonymous,
      paymentReference: doc.paymentReference,
      paymentStatus: doc.paymentStatus,
      giftSelection: doc.giftSelection ? JSON.parse(doc.giftSelection) : undefined,
      paidAt: doc.paidAt || undefined,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }

  private static transformConversationForRealtime(doc: any): Conversation {
    return {
      $id: doc.$id,
      conversationId: doc.conversationId,
      participants: doc.participants ? JSON.parse(doc.participants) : [],
      productId: doc.productId || undefined,
      orderId: doc.orderId || undefined,
      type: doc.type,
      lastMessage: doc.lastMessage ? JSON.parse(doc.lastMessage) : undefined,
      unreadCount: doc.unreadCount ? JSON.parse(doc.unreadCount) : {},
      status: doc.status,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }

  private static transformMessageForRealtime(doc: any): Message {
    return {
      $id: doc.$id,
      messageId: doc.messageId,
      conversationId: doc.conversationId,
      senderId: doc.senderId,
      content: doc.content,
      messageType: doc.messageType,
      attachments: doc.attachments ? JSON.parse(doc.attachments) : [],
      readBy: doc.readBy ? JSON.parse(doc.readBy) : {},
      editedAt: doc.editedAt || undefined,
      deletedAt: doc.deletedAt || undefined,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    RealtimeService.cleanup();
  });
}

export default RealtimeService;