import { databases } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { Review, ReviewStatus, ReviewImage, SellerResponse } from '@/lib/types/database';
import ProductService from './product';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';

export interface CreateReviewData {
  productId: string;
  buyerId: string;
  orderId: string;
  orderItemId: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  images?: Omit<ReviewImage, 'id'>[];
}

export interface ReviewFilters {
  productId?: string;
  sellerId?: string;
  buyerId?: string;
  rating?: number;
  status?: ReviewStatus;
  verifiedPurchase?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'newest' | 'oldest' | 'rating_high' | 'rating_low' | 'helpful';
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: { [rating: number]: number };
  verifiedReviews: number;
  pendingModeration: number;
}

export class ReviewService {
  private static readonly COLLECTION_ID = 'reviews';

  /**
   * Create a new review
   */
  static async createReview(reviewData: CreateReviewData): Promise<Review> {
    try {
      console.log('⭐ Creating new review...');

      // Validate rating
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Get product details to determine seller
      const product = await ProductService.getProduct(reviewData.productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Add image IDs if provided
      const imagesWithIds = reviewData.images?.map(img => ({
        ...img,
        id: ID.unique()
      })) || [];

      const reviewDocument = {
        productId: reviewData.productId,
        sellerId: product.sellerId,
        buyerId: reviewData.buyerId,
        orderId: reviewData.orderId,
        orderItemId: reviewData.orderItemId,
        rating: reviewData.rating,
        title: reviewData.title || '',
        content: reviewData.content,
        images: JSON.stringify(imagesWithIds),
        isVerifiedPurchase: true, // Since it's linked to an order
        status: ReviewStatus.PENDING,
        helpfulVotes: 0,
        reportCount: 0,
        sellerResponse: ''
      };

      const review = await databases.createDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        ID.unique(),
        reviewDocument
      );

      console.log('✅ Review created successfully:', review.$id);

      // Update product rating statistics
      await this.updateProductRating(reviewData.productId);

      return this.transformReview(review);
    } catch (error) {
      console.error('❌ Error creating review:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create review');
    }
  }

  /**
   * Get reviews with filtering
   */
  static async getReviews(filters: ReviewFilters = {}): Promise<{
    reviews: Review[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const queries = [];

      // Status filter (default to approved reviews)
      if (filters.status) {
        queries.push(Query.equal('status', filters.status));
      } else {
        queries.push(Query.equal('status', ReviewStatus.APPROVED));
      }

      // Product filter
      if (filters.productId) {
        queries.push(Query.equal('productId', filters.productId));
      }

      // Seller filter
      if (filters.sellerId) {
        queries.push(Query.equal('sellerId', filters.sellerId));
      }

      // Buyer filter
      if (filters.buyerId) {
        queries.push(Query.equal('buyerId', filters.buyerId));
      }

      // Rating filter
      if (filters.rating) {
        queries.push(Query.equal('rating', filters.rating));
      }

      // Verified purchase filter
      if (filters.verifiedPurchase !== undefined) {
        queries.push(Query.equal('isVerifiedPurchase', filters.verifiedPurchase));
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
          case 'rating_high':
            queries.push(Query.orderDesc('rating'));
            break;
          case 'rating_low':
            queries.push(Query.orderAsc('rating'));
            break;
          case 'helpful':
            queries.push(Query.orderDesc('helpfulVotes'));
            break;
          default:
            queries.push(Query.orderDesc('$createdAt'));
        }
      } else {
        queries.push(Query.orderDesc('$createdAt'));
      }

      // Pagination
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;
      
      queries.push(Query.limit(limit));
      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        queries
      );

      const reviews = response.documents.map(this.transformReview);
      const hasMore = response.total > offset + reviews.length;

      return {
        reviews,
        total: response.total,
        hasMore
      };
    } catch (error) {
      console.error('❌ Error fetching reviews:', error);
      throw new Error('Failed to fetch reviews');
    }
  }

  /**
   * Get single review by ID
   */
  static async getReview(reviewId: string): Promise<Review | null> {
    try {
      const review = await databases.getDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        reviewId
      );
      return this.transformReview(review);
    } catch (error) {
      console.error('❌ Error fetching review:', error);
      return null;
    }
  }

  /**
   * Update review status (admin moderation)
   */
  static async updateReviewStatus(reviewId: string, status: ReviewStatus, adminId: string, notes?: string): Promise<Review> {
    try {
      console.log('🔄 Updating review status:', reviewId, 'to', status);

      const updateData: any = { 
        status,
        moderationNotes: notes || ''
      };

      const updatedReview = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        reviewId,
        updateData
      );

      console.log('✅ Review status updated:', reviewId);

      // If review was approved/rejected, update product rating
      const review = this.transformReview(updatedReview);
      await this.updateProductRating(review.productId);

      return review;
    } catch (error) {
      console.error('❌ Error updating review status:', error);
      throw new Error('Failed to update review status');
    }
  }

  /**
   * Add seller response to review
   */
  static async addSellerResponse(reviewId: string, sellerId: string, response: string): Promise<Review> {
    try {
      console.log('💬 Adding seller response to review:', reviewId);

      const sellerResponse: SellerResponse = {
        content: response,
        createdAt: new Date().toISOString()
      };

      const updatedReview = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        reviewId,
        { sellerResponse: JSON.stringify(sellerResponse) }
      );

      console.log('✅ Seller response added:', reviewId);
      return this.transformReview(updatedReview);
    } catch (error) {
      console.error('❌ Error adding seller response:', error);
      throw new Error('Failed to add seller response');
    }
  }

  /**
   * Vote review as helpful
   */
  static async voteHelpful(reviewId: string, userId: string): Promise<void> {
    try {
      const review = await this.getReview(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        reviewId,
        { helpfulVotes: review.helpfulVotes + 1 }
      );

      console.log('👍 Review helpful vote added:', reviewId);
    } catch (error) {
      console.error('❌ Error voting helpful:', error);
      throw new Error('Failed to vote helpful');
    }
  }

  /**
   * Report review
   */
  static async reportReview(reviewId: string, userId: string, reason: string): Promise<void> {
    try {
      const review = await this.getReview(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        reviewId,
        { 
          reportCount: review.reportCount + 1,
          status: review.reportCount >= 2 ? ReviewStatus.FLAGGED : review.status
        }
      );

      console.log('🚨 Review reported:', reviewId);
    } catch (error) {
      console.error('❌ Error reporting review:', error);
      throw new Error('Failed to report review');
    }
  }

  /**
   * Get review statistics for a product
   */
  static async getProductReviewStats(productId: string): Promise<ReviewStats> {
    try {
      const { reviews } = await this.getReviews({ 
        productId, 
        status: ReviewStatus.APPROVED,
        limit: 1000 
      });

      const stats: ReviewStats = {
        totalReviews: reviews.length,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        verifiedReviews: 0,
        pendingModeration: 0
      };

      if (reviews.length === 0) {
        return stats;
      }

      // Calculate statistics
      let totalRating = 0;
      reviews.forEach(review => {
        totalRating += review.rating;
        stats.ratingDistribution[review.rating]++;
        if (review.isVerifiedPurchase) {
          stats.verifiedReviews++;
        }
      });

      stats.averageRating = Math.round((totalRating / reviews.length) * 100) / 100;

      // Get pending reviews count
      const { total: pendingCount } = await this.getReviews({
        productId,
        status: ReviewStatus.PENDING,
        limit: 1
      });
      stats.pendingModeration = pendingCount;

      return stats;
    } catch (error) {
      console.error('❌ Error calculating review stats:', error);
      throw new Error('Failed to calculate review statistics');
    }
  }

  /**
   * Get reviews pending moderation (admin)
   */
  static async getPendingReviews(limit: number = 50, offset: number = 0): Promise<{
    reviews: Review[];
    total: number;
  }> {
    try {
      const { reviews, total } = await this.getReviews({
        status: ReviewStatus.PENDING,
        limit,
        offset,
        sortBy: 'oldest' // FIFO processing
      });

      return { reviews, total };
    } catch (error) {
      console.error('❌ Error fetching pending reviews:', error);
      throw new Error('Failed to fetch pending reviews');
    }
  }

  /**
   * Update product rating statistics
   */
  private static async updateProductRating(productId: string): Promise<void> {
    try {
      const stats = await this.getProductReviewStats(productId);
      await ProductService.updateRating(productId, stats.averageRating, stats.totalReviews);
    } catch (error) {
      console.error('❌ Error updating product rating:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Delete review
   */
  static async deleteReview(reviewId: string): Promise<void> {
    try {
      const review = await this.getReview(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      await databases.deleteDocument(DATABASE_ID, this.COLLECTION_ID, reviewId);
      
      // Update product rating after deletion
      await this.updateProductRating(review.productId);

      console.log('✅ Review deleted:', reviewId);
    } catch (error) {
      console.error('❌ Error deleting review:', error);
      throw new Error('Failed to delete review');
    }
  }

  /**
   * Transform database document to Review interface
   */
  private static transformReview(doc: any): Review {
    return {
      $id: doc.$id,
      productId: doc.productId,
      sellerId: doc.sellerId,
      buyerId: doc.buyerId,
      orderId: doc.orderId,
      orderItemId: doc.orderItemId,
      rating: doc.rating,
      title: doc.title,
      content: doc.content,
      images: doc.images ? JSON.parse(doc.images) : [],
      isVerifiedPurchase: doc.isVerifiedPurchase,
      status: doc.status,
      sellerResponse: doc.sellerResponse ? JSON.parse(doc.sellerResponse) : undefined,
      moderationNotes: doc.moderationNotes,
      helpfulVotes: doc.helpfulVotes || 0,
      reportCount: doc.reportCount || 0,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }
}

export default ReviewService;