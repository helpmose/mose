// Export all services for easy importing across the application

// Product Services
export { ProductService } from './product';
export type { 
  Product, 
  ProductFilters, 
  CreateProductData 
} from './product';

// Order Services  
export { OrderService } from './order';
export type { 
  Order, 
  OrderItem, 
  Address, 
  CreateOrderData, 
  OrderFilters 
} from './order';

// Gift Services
export { GiftService } from './gifts';
export type { 
  GiftEvent, 
  GiftContribution, 
  CreateGiftEventData, 
  CreateContributionData, 
  GiftEventFilters 
} from './gifts';

// Messaging Services
export { MessagingService } from './messaging';
export type { 
  Conversation, 
  Message, 
  CreateConversationData, 
  CreateMessageData, 
  ConversationFilters, 
  MessageFilters 
} from './messaging';

// Real-time Services
export { RealtimeService } from './realtime';
export type { 
  RealtimeEvent, 
  TypingIndicator, 
  OnlineStatus 
} from './realtime';

// Spotify Services
export { SpotifyService } from './spotify';
export type { 
  SpotifyUser, 
  SpotifyTrack, 
  SpotifyPlaylist, 
  SpotifySearchResults, 
  SpotifyAuthTokens 
} from './spotify';

// Payment Services
export { PaystackService } from './paystack';
export type { 
  PaystackInitializeData, 
  PaystackInitializeResponse, 
  PaystackVerificationResponse, 
  PaystackRefundData, 
  PaystackWebhookEvent 
} from './paystack';

// User Services
export { UserService } from './user';
export type { 
  UserProfile, 
  AuthUser,
  CreateUserProfileData 
} from './user';

// Additional services can be imported here as they are implemented
// export { ReviewService } from './review';
// export { CategoryService } from './category';  
// export { NotificationService } from './notification';

// Common types that might be shared across services
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

// Service configuration
export interface ServiceConfig {
  enableLogging?: boolean;
  enableCaching?: boolean;
  enableMCP?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

// Default service configuration
export const defaultServiceConfig: ServiceConfig = {
  enableLogging: true,
  enableCaching: true,
  enableMCP: true,
  retryAttempts: 3,
  timeout: 10000 // 10 seconds
};

/**
 * Service utility functions
 */
export class ServiceUtils {
  /**
   * Format error messages consistently across services
   */
  static formatError(error: any, context?: string): string {
    const baseMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return context ? `${context}: ${baseMessage}` : baseMessage;
  }

  /**
   * Create a standardized service response
   */
  static createResponse<T>(
    success: boolean,
    data?: T,
    error?: string,
    message?: string
  ): ServiceResponse<T> {
    return {
      success,
      data,
      error,
      message
    };
  }

  /**
   * Create a standardized paginated response
   */
  static createPaginatedResponse<T>(
    items: T[],
    total: number,
    offset: number = 0,
    limit: number = 20
  ): PaginatedResponse<T> {
    return {
      items,
      total,
      hasMore: total > offset + items.length,
      offset,
      limit
    };
  }

  /**
   * Validate required fields in data objects
   */
  static validateRequired(data: Record<string, any>, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Sanitize string inputs
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Convert price to kobo (store as integer)
   */
  static toKobo(naira: number): number {
    return Math.round(naira * 100);
  }

  /**
   * Convert kobo to naira (display as decimal)
   */
  static toNaira(kobo: number): number {
    return kobo / 100;
  }

  /**
   * Generate a unique reference ID
   */
  static generateReference(prefix: string = 'REF'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          throw error;
        }

        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

export default {
  ProductService,
  OrderService,
  GiftService,
  MessagingService,
  RealtimeService,
  SpotifyService,
  PaystackService,
  ServiceUtils,
  defaultServiceConfig
};