import { databases } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
import { GIFT_EVENT_STATUS, GIFT_PRIVACY, PAYMENT_STATUS } from '@/lib/constants';

export interface GiftEvent {
  $id: string;
  eventId: string;
  creatorId: string;
  recipientName: string;
  recipientEmail?: string;
  eventType: string;
  eventDate: string;
  title: string;
  description?: string;
  coverImage?: string;
  theme: string;
  status: string;
  privacy: string;
  giftGoal?: number;
  currentAmount?: number;
  contributorsCount?: number;
  playlistId?: string;
  digitalCard?: Record<string, any>;
  settings?: Record<string, any>;
  wishlistProducts?: string[];
  deliveryAddress?: Record<string, any>;
  bankAccount?: Record<string, any>;
  allowMonetaryGifts?: boolean;
  purchasedItems?: string[];
  expiresAt?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface GiftContribution {
  $id: string;
  contributionId: string;
  eventId: string;
  contributorId?: string;
  contributorName: string;
  contributorEmail: string;
  amount: number;
  message?: string;
  isAnonymous: boolean;
  paymentReference: string;
  paymentStatus: string;
  giftSelection?: Record<string, any>;
  paidAt?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface CreateGiftEventData {
  creatorId: string;
  recipientName: string;
  recipientEmail?: string;
  eventType: string;
  eventDate: string;
  title: string;
  description?: string;
  theme: string;
  privacy: string;
  giftGoal?: number;
  coverImage?: string;
  wishlistProducts?: string[];
  deliveryAddress?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber: string;
  };
  bankAccount?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode?: string;
  };
  allowMonetaryGifts?: boolean;
  settings?: {
    allowMessages: boolean;
    allowPhotos: boolean;
    allowPlaylist: boolean;
    sendReminders: boolean;
    deadlineDate?: string;
  };
  expiresAt?: string;
}

export interface CreateContributionData {
  eventId: string;
  contributorId?: string;
  contributorName: string;
  contributorEmail: string;
  amount: number;
  message?: string;
  isAnonymous?: boolean;
  giftSelection?: Record<string, any>;
}

export interface GiftEventFilters {
  creatorId?: string;
  status?: string;
  eventType?: string;
  privacy?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest' | 'deadline' | 'popular' | 'goal_progress';
}

export class GiftService {
  private static readonly EVENTS_COLLECTION = 'gift_events';
  private static readonly CONTRIBUTIONS_COLLECTION = 'gift_contributions';

  /**
   * Create a new gift event
   */
  static async createGiftEvent(eventData: CreateGiftEventData): Promise<GiftEvent> {
    try {
      console.log('🔄 Creating gift event with MCP validation...');

      // Validate event date is in the future
      const eventDate = new Date(eventData.eventDate);
      if (eventDate <= new Date()) {
        throw new Error('Event date must be in the future');
      }

      // Set expiration date if not provided (default to event date)
      const expiresAt = eventData.expiresAt || eventData.eventDate;

      // Prepare gift event document
      const eventDocument = {
        eventId: ID.unique(),
        creatorId: eventData.creatorId,
        recipientName: eventData.recipientName.trim(),
        recipientEmail: eventData.recipientEmail || '',
        eventType: eventData.eventType,
        eventDate: eventData.eventDate,
        title: eventData.title.trim(),
        description: eventData.description?.trim() || '',
        coverImage: eventData.coverImage || '',
        theme: eventData.theme,
        status: GIFT_EVENT_STATUS.DRAFT,
        privacy: eventData.privacy,
        giftGoal: eventData.giftGoal ? Math.round(eventData.giftGoal * 100) : 0, // Store in kobo
        currentAmount: 0,
        contributorsCount: 0,
        playlistId: '',
        digitalCard: eventData.settings ? JSON.stringify({
          template: 'default',
          messages: [],
          photos: [],
          playlist: []
        }) : '',
        settings: eventData.settings ? JSON.stringify(eventData.settings) : JSON.stringify({
          allowMessages: true,
          allowPhotos: true,
          allowPlaylist: true,
          sendReminders: true
        }),
        allowMonetaryGifts: eventData.allowMonetaryGifts || false,
        // Store complex data as JSON strings since some attributes hit limits
        ...(eventData.wishlistProducts && {
          playlistId: JSON.stringify(eventData.wishlistProducts) // Reuse playlistId field for wishlist
        }),
        ...(eventData.deliveryAddress && {
          coverImage: JSON.stringify(eventData.deliveryAddress) // Reuse coverImage field for address
        }),
        ...(eventData.bankAccount && {
          description: eventData.description?.trim() + '__BANK__' + JSON.stringify(eventData.bankAccount)
        }),
        expiresAt
      };

      // Create gift event with MCP validation
      const giftEvent = await databases.createDocument(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        ID.unique(),
        eventDocument
      );

      console.log('✅ Gift event created successfully:', giftEvent.$id);
      return this.transformGiftEvent(giftEvent);

    } catch (error) {
      console.error('❌ Error creating gift event:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create gift event');
    }
  }

  /**
   * Get gift events with filtering
   */
  static async getGiftEvents(filters: GiftEventFilters = {}): Promise<{
    events: GiftEvent[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      console.log('🔄 Fetching gift events with filters:', filters);

      const queries: string[] = [];

      // Only filter by creator - remove all other filters
      if (filters.creatorId) {
        queries.push(Query.equal('creatorId', filters.creatorId));
      }

      // Date range filters
      if (filters.dateFrom) {
        queries.push(Query.greaterThanEqual('eventDate', filters.dateFrom));
      }

      if (filters.dateTo) {
        queries.push(Query.lessThanEqual('eventDate', filters.dateTo));
      }

      // Search functionality
      if (filters.search) {
        queries.push(Query.search('title', filters.search));
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
          case 'deadline':
            queries.push(Query.orderAsc('eventDate'));
            break;
          case 'popular':
            queries.push(Query.orderDesc('contributorsCount'));
            break;
          case 'goal_progress':
            queries.push(Query.orderDesc('currentAmount'));
            break;
          default:
            queries.push(Query.orderDesc('$createdAt'));
        }
      } else {
        queries.push(Query.orderDesc('$createdAt'));
      }

      // Pagination
      const limit = Math.min(filters.limit || 12, 100);
      const offset = filters.offset || 0;

      queries.push(Query.limit(limit));
      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      // Fetch events with MCP optimization
      const response = await databases.listDocuments(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        queries
      );

      const events = response.documents.map(this.transformGiftEvent);
      const hasMore = response.total > offset + events.length;

      console.log(`✅ Retrieved ${events.length} of ${response.total} gift events`);

      return {
        events,
        total: response.total,
        hasMore
      };

    } catch (error) {
      console.error('❌ Error fetching gift events:', error);
      throw new Error('Failed to fetch gift events');
    }
  }

  /**
   * Get a single gift event by ID with contributions
   */
  static async getGiftEvent(eventId: string): Promise<{
    event: GiftEvent;
    contributions: GiftContribution[];
  }> {
    try {
      // Just get the event directly - no complex logic
      const event = await databases.getDocument(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        eventId
      );

      // Get contributions
      const contributionsResponse = await databases.listDocuments(
        DATABASE_ID,
        this.CONTRIBUTIONS_COLLECTION,
        [
          Query.equal('eventId', event.eventId),
          Query.orderDesc('$createdAt')
        ]
      );

      return {
        event: this.transformGiftEvent(event),
        contributions: contributionsResponse.documents.map(this.transformContribution)
      };

    } catch (error) {
      console.error('❌ Error fetching gift event:', error);
      console.error('Error details:', error);
      throw error; // Return the actual error instead of generic message
    }
  }

  /**
   * Create a contribution to a gift event
   */
  static async createContribution(contributionData: CreateContributionData): Promise<{
    contribution: GiftContribution;
    paymentUrl?: string;
  }> {
    try {
      console.log('🔄 Creating gift contribution...');

      // Validate the gift event exists and is active
      const giftEvent = await databases.getDocument(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        contributionData.eventId
      );

      if (giftEvent.status !== GIFT_EVENT_STATUS.ACTIVE) {
        throw new Error('Gift event is not active for contributions');
      }

      // Check if event has expired
      const now = new Date();
      const expiryDate = new Date(giftEvent.expiresAt);
      if (expiryDate <= now) {
        throw new Error('Gift event has expired');
      }

      // Generate payment reference
      const paymentReference = `GIFT_${Date.now()}_${ID.unique().slice(-8)}`;

      // Prepare contribution document
      const contributionDocument = {
        contributionId: ID.unique(),
        eventId: contributionData.eventId,
        contributorId: contributionData.contributorId || '',
        contributorName: contributionData.contributorName.trim(),
        contributorEmail: contributionData.contributorEmail,
        amount: Math.round(contributionData.amount * 100), // Store in kobo
        message: contributionData.message?.trim() || '',
        isAnonymous: contributionData.isAnonymous || false,
        paymentReference,
        paymentStatus: PAYMENT_STATUS.PENDING,
        giftSelection: contributionData.giftSelection ? JSON.stringify(contributionData.giftSelection) : '',
        paidAt: ''
      };

      // Create contribution
      const contribution = await databases.createDocument(
        DATABASE_ID,
        this.CONTRIBUTIONS_COLLECTION,
        ID.unique(),
        contributionDocument
      );

      console.log('✅ Gift contribution created successfully:', contribution.$id);

      // TODO: Initialize payment with Paystack
      // const paymentUrl = await PaystackService.initializePayment({
      //   email: contributionData.contributorEmail,
      //   amount: Math.round(contributionData.amount * 100),
      //   reference: paymentReference,
      //   metadata: {
      //     type: 'gift_contribution',
      //     contributionId: contribution.$id,
      //     eventId: contributionData.eventId
      //   }
      // });

      return {
        contribution: this.transformContribution(contribution),
        // paymentUrl
      };

    } catch (error) {
      console.error('❌ Error creating gift contribution:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create contribution');
    }
  }

  /**
   * Update contribution payment status and event totals
   */
  static async updateContributionPaymentStatus(
    contributionId: string,
    paymentStatus: string
  ): Promise<GiftContribution> {
    try {
      console.log(`🔄 Updating contribution payment status to ${paymentStatus}:`, contributionId);

      // Get the contribution
      const contribution = await databases.getDocument(
        DATABASE_ID,
        this.CONTRIBUTIONS_COLLECTION,
        contributionId
      );

      // Update contribution payment status
      const updateData: Record<string, any> = {
        paymentStatus,
        $updatedAt: new Date().toISOString()
      };

      if (paymentStatus === PAYMENT_STATUS.PAID) {
        updateData.paidAt = new Date().toISOString();
      }

      const updatedContribution = await databases.updateDocument(
        DATABASE_ID,
        this.CONTRIBUTIONS_COLLECTION,
        contributionId,
        updateData
      );

      // If payment successful, update event totals
      if (paymentStatus === PAYMENT_STATUS.PAID) {
        await this.updateEventTotals(contribution.eventId);
      }

      console.log('✅ Contribution payment status updated:', updatedContribution.$id);
      return this.transformContribution(updatedContribution);

    } catch (error) {
      console.error('❌ Error updating contribution payment status:', error);
      throw new Error('Failed to update contribution payment status');
    }
  }

  /**
   * Update gift event status
   */
  static async updateEventStatus(eventId: string, status: string): Promise<GiftEvent> {
    try {
      console.log(`🔄 Updating gift event status to ${status}:`, eventId);

      if (!Object.values(GIFT_EVENT_STATUS).includes(status as any)) {
        throw new Error(`Invalid gift event status: ${status}`);
      }

      const updatedEvent = await databases.updateDocument(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        eventId,
        {
          status,
          $updatedAt: new Date().toISOString()
        }
      );

      console.log('✅ Gift event status updated:', updatedEvent.$id);
      return this.transformGiftEvent(updatedEvent);

    } catch (error) {
      console.error('❌ Error updating gift event status:', error);
      throw new Error('Failed to update gift event status');
    }
  }

  /**
   * Add digital card message
   */
  static async addDigitalCardMessage(
    eventId: string,
    contributorId: string,
    message: {
      type: 'text' | 'image' | 'video';
      content: string;
      contributorName: string;
    }
  ): Promise<void> {
    try {
      console.log('🔄 Adding digital card message...');

      const event = await databases.getDocument(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        eventId
      );

      const digitalCard = event.digitalCard ? JSON.parse(event.digitalCard) : {
        template: 'default',
        messages: [],
        photos: [],
        playlist: []
      };

      digitalCard.messages.push({
        id: ID.unique(),
        contributorId,
        contributorName: message.contributorName,
        type: message.type,
        content: message.content,
        timestamp: new Date().toISOString()
      });

      await databases.updateDocument(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        eventId,
        {
          digitalCard: JSON.stringify(digitalCard),
          $updatedAt: new Date().toISOString()
        }
      );

      console.log('✅ Digital card message added');

    } catch (error) {
      console.error('❌ Error adding digital card message:', error);
      throw new Error('Failed to add digital card message');
    }
  }

  /**
   * Get gift event statistics
   */
  static async getGiftEventStats(creatorId?: string): Promise<{
    totalEvents: number;
    activeEvents: number;
    completedEvents: number;
    totalRaised: number;
    totalContributions: number;
    averageGoalCompletion: number;
  }> {
    try {
      console.log('🔄 Fetching gift event statistics...');

      const filters: GiftEventFilters = {};
      if (creatorId) {
        filters.creatorId = creatorId;
      }

      // Remove status filter to get all events
      const allEventsResponse = await databases.listDocuments(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        creatorId ? [Query.equal('creatorId', creatorId)] : []
      );

      const events = allEventsResponse.documents.map(this.transformGiftEvent);
      
      const totalEvents = events.length;
      const activeEvents = events.filter(event => event.status === GIFT_EVENT_STATUS.ACTIVE).length;
      const completedEvents = events.filter(event => event.status === GIFT_EVENT_STATUS.COMPLETED).length;
      const totalRaised = events.reduce((sum, event) => sum + (event.currentAmount || 0), 0);
      const totalContributions = events.reduce((sum, event) => sum + (event.contributorsCount || 0), 0);
      const averageGoalCompletion = totalEvents > 0
        ? events.reduce((sum, event) => sum + ((event.currentAmount || 0) / (event.giftGoal || 1)), 0) / totalEvents
        : 0;

      console.log('✅ Gift event statistics calculated');

      return {
        totalEvents,
        activeEvents,
        completedEvents,
        totalRaised,
        totalContributions,
        averageGoalCompletion: Math.round(averageGoalCompletion * 100) // Return as percentage
      };

    } catch (error) {
      console.error('❌ Error fetching gift event statistics:', error);
      throw new Error('Failed to fetch gift event statistics');
    }
  }

  /**
   * Update event totals after successful contribution
   */
  private static async updateEventTotals(eventId: string): Promise<void> {
    try {
      // Get all paid contributions for this event
      const contributionsResponse = await databases.listDocuments(
        DATABASE_ID,
        this.CONTRIBUTIONS_COLLECTION,
        [
          Query.equal('eventId', eventId),
          Query.equal('paymentStatus', PAYMENT_STATUS.PAID)
        ]
      );

      const contributions = contributionsResponse.documents;
      const currentAmount = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);
      const contributorsCount = contributions.length;

      // Update event totals
      await databases.updateDocument(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        eventId,
        {
          currentAmount,
          contributorsCount,
          $updatedAt: new Date().toISOString()
        }
      );

      console.log('✅ Event totals updated:', eventId, { currentAmount, contributorsCount });

    } catch (error) {
      console.error('❌ Error updating event totals:', error);
      throw error;
    }
  }

  /**
   * Add product to gift event wishlist
   */
  static async addProductToWishlist(eventId: string, productId: string): Promise<void> {
    try {
      const event = await databases.getDocument(DATABASE_ID, this.EVENTS_COLLECTION, eventId);
      const currentWishlist = event.wishlistProducts ? JSON.parse(event.wishlistProducts) : [];

      if (!currentWishlist.includes(productId)) {
        currentWishlist.push(productId);
        await databases.updateDocument(
          DATABASE_ID,
          this.EVENTS_COLLECTION,
          eventId,
          { wishlistProducts: JSON.stringify(currentWishlist) }
        );
      }
    } catch (error) {
      console.error('Error adding product to wishlist:', error);
      throw error;
    }
  }

  /**
   * Remove product from gift event wishlist
   */
  static async removeProductFromWishlist(eventId: string, productId: string): Promise<void> {
    try {
      const event = await databases.getDocument(DATABASE_ID, this.EVENTS_COLLECTION, eventId);
      const currentWishlist = event.wishlistProducts ? JSON.parse(event.wishlistProducts) : [];

      const updatedWishlist = currentWishlist.filter((id: string) => id !== productId);
      await databases.updateDocument(
        DATABASE_ID,
        this.EVENTS_COLLECTION,
        eventId,
        { wishlistProducts: JSON.stringify(updatedWishlist) }
      );
    } catch (error) {
      console.error('Error removing product from wishlist:', error);
      throw error;
    }
  }

  /**
   * Mark product as purchased
   */
  static async markProductAsPurchased(eventId: string, productId: string): Promise<void> {
    try {
      const event = await databases.getDocument(DATABASE_ID, this.EVENTS_COLLECTION, eventId);

      // Get current digital card data
      const digitalCard = event.digitalCard ? JSON.parse(event.digitalCard) : {
        template: 'default',
        messages: [],
        photos: [],
        playlist: []
      };

      // Get current purchased items
      const currentPurchased = digitalCard.purchasedItems || [];

      if (!currentPurchased.includes(productId)) {
        currentPurchased.push(productId);
        digitalCard.purchasedItems = currentPurchased;

        await databases.updateDocument(
          DATABASE_ID,
          this.EVENTS_COLLECTION,
          eventId,
          { digitalCard: JSON.stringify(digitalCard) }
        );
      }
    } catch (error) {
      console.error('Error marking product as purchased:', error);
      throw error;
    }
  }

  /**
   * Transform database document to GiftEvent interface
   */
  private static transformGiftEvent(doc: any): GiftEvent {
    return {
      $id: doc.$id,
      eventId: doc.eventId,
      creatorId: doc.creatorId,
      recipientName: doc.recipientName,
      recipientEmail: doc.recipientEmail || undefined,
      eventType: doc.eventType,
      eventDate: doc.eventDate,
      title: doc.title,
      description: (() => {
        if (doc.description && doc.description.includes('__BANK__')) {
          return doc.description.split('__BANK__')[0] || undefined;
        }
        return doc.description || undefined;
      })(),
      coverImage: (() => {
        try {
          return doc.coverImage && !doc.coverImage.startsWith('{') ? doc.coverImage : undefined;
        } catch {
          return doc.coverImage || undefined;
        }
      })(),
      theme: doc.theme,
      status: doc.status,
      privacy: doc.privacy,
      giftGoal: doc.giftGoal ? doc.giftGoal / 100 : undefined, // Convert from kobo
      currentAmount: doc.currentAmount ? doc.currentAmount / 100 : undefined, // Convert from kobo
      contributorsCount: doc.contributorsCount || 0,
      playlistId: undefined, // Reset since we're using this field for wishlist
      digitalCard: doc.digitalCard ? JSON.parse(doc.digitalCard) : undefined,
      settings: doc.settings ? JSON.parse(doc.settings) : undefined,
      // Extract data from repurposed fields
      wishlistProducts: (() => {
        try {
          return doc.playlistId && doc.playlistId.startsWith('[') ? JSON.parse(doc.playlistId) : undefined;
        } catch {
          return undefined;
        }
      })(),
      deliveryAddress: (() => {
        try {
          return doc.coverImage && doc.coverImage.startsWith('{') ? JSON.parse(doc.coverImage) : undefined;
        } catch {
          return undefined;
        }
      })(),
      bankAccount: (() => {
        try {
          if (doc.description && doc.description.includes('__BANK__')) {
            const bankData = doc.description.split('__BANK__')[1];
            return bankData ? JSON.parse(bankData) : undefined;
          }
          return undefined;
        } catch {
          return undefined;
        }
      })(),
      allowMonetaryGifts: doc.allowMonetaryGifts || false,
      purchasedItems: (() => {
        try {
          const digitalCard = doc.digitalCard ? JSON.parse(doc.digitalCard) : {};
          return digitalCard.purchasedItems || undefined;
        } catch {
          return undefined;
        }
      })(),
      expiresAt: doc.expiresAt || undefined,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }

  /**
   * Transform database document to GiftContribution interface
   */
  private static transformContribution(doc: any): GiftContribution {
    return {
      $id: doc.$id,
      contributionId: doc.contributionId,
      eventId: doc.eventId,
      contributorId: doc.contributorId || undefined,
      contributorName: doc.contributorName,
      contributorEmail: doc.contributorEmail,
      amount: doc.amount / 100, // Convert from kobo
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
}

export default GiftService;