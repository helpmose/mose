import { databases } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { DATABASE_ID, NOTIFICATIONS_COLLECTION_ID } from '@/lib/constants';

export interface NotificationData {
  $id: string;
  userId: string;
  type: 'approval' | 'rejection' | 'suspension' | 'reactivation' | 'order' | 'message' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationData {
  userId: string;
  type: 'approval' | 'rejection' | 'suspension' | 'reactivation' | 'order' | 'message' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
}

export class NotificationService {
  private static readonly COLLECTION_ID = NOTIFICATIONS_COLLECTION_ID;

  /**
   * Create a new notification
   */
  static async createNotification(notificationData: CreateNotificationData): Promise<NotificationData> {
    try {
      console.log('🔔 Creating notification:', notificationData.title);

      const document = await databases.createDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        ID.unique(),
        {
          userId: notificationData.userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          data: JSON.stringify(notificationData.data || {}),
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      console.log('✅ Notification created:', document.$id);
      return this.transformNotification(document);
    } catch (error) {
      console.error('❌ Error creating notification:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create notification');
    }
  }

  /**
   * Get notifications for a user
   */
  static async getUserNotifications(
    userId: string, 
    limit: number = 20, 
    offset: number = 0,
    unreadOnly: boolean = false
  ): Promise<{
    notifications: NotificationData[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const queries = [
        Query.equal('userId', userId),
        Query.orderDesc('createdAt')
      ];

      if (unreadOnly) {
        queries.push(Query.equal('isRead', false));
      }

      if (limit > 0) {
        queries.push(Query.limit(limit));
      }

      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        queries
      );

      // Get unread count separately
      const unreadResponse = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('isRead', false),
          Query.limit(1) // We only need the count
        ]
      );

      const notifications = response.documents.map(this.transformNotification);

      return {
        notifications,
        total: response.total,
        unreadCount: unreadResponse.total
      };
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      return {
        notifications: [],
        total: 0,
        unreadCount: 0
      };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<NotificationData> {
    try {
      const updatedDocument = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        notificationId,
        {
          isRead: true,
          updatedAt: new Date().toISOString()
        }
      );

      return this.transformNotification(updatedDocument);
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw new Error('Failed to mark notification as read');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      // Get all unread notifications for the user
      const response = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('isRead', false),
          Query.limit(100) // Process in batches if needed
        ]
      );

      // Update each notification
      const updatePromises = response.documents.map(doc =>
        databases.updateDocument(
          DATABASE_ID,
          this.COLLECTION_ID,
          doc.$id,
          {
            isRead: true,
            updatedAt: new Date().toISOString()
          }
        )
      );

      await Promise.all(updatePromises);
      console.log(`✅ Marked ${updatePromises.length} notifications as read`);
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      throw new Error('Failed to mark all notifications as read');
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        notificationId
      );
      console.log('✅ Notification deleted:', notificationId);
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      throw new Error('Failed to delete notification');
    }
  }

  /**
   * Seller approval workflow notifications
   */
  static async notifySellerApproved(userId: string): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'approval',
      title: '🎉 Seller Account Approved!',
      message: 'Congratulations! Your seller account has been approved. You can now start listing and selling your artwork on MOSÉ.',
      data: {
        actionUrl: '/seller/dashboard',
        actionText: 'Go to Dashboard'
      }
    });
  }

  static async notifySellerRejected(userId: string, reason?: string): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'rejection',
      title: '❌ Seller Application Rejected',
      message: `Unfortunately, your seller application was not approved. ${reason ? `Reason: ${reason}` : 'Please contact support for more information.'}`,
      data: {
        reason,
        actionUrl: '/support',
        actionText: 'Contact Support'
      }
    });
  }

  static async notifyUserSuspended(userId: string, reason?: string): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'suspension',
      title: '⚠️ Account Suspended',
      message: `Your account has been temporarily suspended. ${reason ? `Reason: ${reason}` : 'Please contact support to resolve this issue.'}`,
      data: {
        reason,
        actionUrl: '/support',
        actionText: 'Contact Support'
      }
    });
  }

  static async notifyUserReactivated(userId: string): Promise<NotificationData> {
    return this.createNotification({
      userId,
      type: 'reactivation',
      title: '✅ Account Reactivated',
      message: 'Your account has been reactivated. You can now resume normal activities on MOSÉ.',
      data: {
        actionUrl: '/dashboard',
        actionText: 'Go to Dashboard'
      }
    });
  }

  /**
   * Product workflow notifications
   */
  static async notifyAdminNewProductSubmission(productId: string, sellerId: string, productTitle?: string): Promise<NotificationData> {
    // This would notify admin users, for now we'll create a system notification
    return this.createNotification({
      userId: sellerId, // Temporary - should be admin user ID
      type: 'system',
      title: '📋 Product Submitted for Review',
      message: `Your product "${productTitle || 'Product'}" has been submitted for review. We'll notify you once it's approved.`,
      data: {
        productId,
        actionUrl: `/seller/products/${productId}`,
        actionText: 'View Product'
      }
    });
  }

  static async notifyProductApproved(sellerId: string, productId: string, productTitle?: string): Promise<NotificationData> {
    return this.createNotification({
      userId: sellerId,
      type: 'approval',
      title: '🎉 Product Approved!',
      message: `Great news! Your product "${productTitle || 'Product'}" has been approved and is now live on MOSÉ.`,
      data: {
        productId,
        actionUrl: `/products/${productId}`,
        actionText: 'View Product'
      }
    });
  }

  static async notifyProductRejected(sellerId: string, productId: string, reason?: string, productTitle?: string): Promise<NotificationData> {
    return this.createNotification({
      userId: sellerId,
      type: 'rejection',
      title: '❌ Product Rejected',
      message: `Unfortunately, your product "${productTitle || 'Product'}" was not approved. ${reason ? `Reason: ${reason}` : 'Please review our guidelines and resubmit.'}`,
      data: {
        productId,
        reason,
        actionUrl: `/seller/products/${productId}/edit`,
        actionText: 'Edit Product'
      }
    });
  }

  static async notifyProductFlagged(sellerId: string, productId: string, reason?: string, productTitle?: string): Promise<NotificationData> {
    return this.createNotification({
      userId: sellerId,
      type: 'system',
      title: '🚩 Product Flagged for Review',
      message: `Your product "${productTitle || 'Product'}" has been flagged for review. ${reason ? `Reason: ${reason}` : 'We\'ll investigate and get back to you soon.'}`,
      data: {
        productId,
        reason,
        actionUrl: `/seller/products/${productId}`,
        actionText: 'View Product'
      }
    });
  }

  /**
   * Order workflow notifications
   */
  static async notifyOrderStatusChanged(userId: string, orderId: string, orderNumber: string, oldStatus: string, newStatus: string): Promise<NotificationData> {
    const statusMessages = {
      confirmed: '✅ Your order has been confirmed and is being prepared.',
      processing: '🔄 Your order is now being processed.',
      shipped: '🚚 Your order has been shipped! Track your package.',
      delivered: '📦 Your order has been delivered. Enjoy your purchase!',
      cancelled: '❌ Your order has been cancelled.'
    };

    const statusTitles = {
      confirmed: 'Order Confirmed',
      processing: 'Order Processing', 
      shipped: 'Order Shipped',
      delivered: 'Order Delivered',
      cancelled: 'Order Cancelled'
    };

    return this.createNotification({
      userId,
      type: 'order',
      title: statusTitles[newStatus as keyof typeof statusTitles] || `Order ${newStatus}`,
      message: statusMessages[newStatus as keyof typeof statusMessages] || `Your order status has been updated to ${newStatus}.`,
      data: {
        orderId,
        orderNumber,
        oldStatus,
        newStatus,
        actionUrl: `/buyer?tab=orders`,
        actionText: 'View Order'
      }
    });
  }

  static async notifySellerNewOrder(sellerId: string, orderId: string, orderNumber: string, customerName?: string): Promise<NotificationData> {
    return this.createNotification({
      userId: sellerId,
      type: 'order',
      title: '🛒 New Order Received!',
      message: `You have a new order ${orderNumber}${customerName ? ` from ${customerName}` : ''}. Review and confirm the order.`,
      data: {
        orderId,
        orderNumber,
        actionUrl: `/seller/orders/${orderId}`,
        actionText: 'View Order'
      }
    });
  }

  /**
   * Transform database document to NotificationData type
   */
  private static transformNotification(doc: any): NotificationData {
    return {
      $id: doc.$id,
      userId: doc.userId,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      data: doc.data ? JSON.parse(doc.data) : {},
      isRead: doc.isRead,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}

export default NotificationService;