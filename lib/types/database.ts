/**
 * Comprehensive Database Schema Types for MOSÉ Platform
 * Based on PRD requirements for e-commerce functionality
 */

// Product Related Types
export interface Product {
  $id: string;
  sellerId: string;
  title: string;
  description: string;
  category: ProductCategory;
  subcategory?: string;
  images: ProductImage[];
  pricing: ProductPricing;
  inventory: ProductInventory;
  specifications: ProductSpecifications;
  customization: ProductCustomization;
  status: ProductStatus;
  tags: string[];
  seoData: SEOData;
  $createdAt: string;
  $updatedAt: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductPricing {
  basePrice: number; // in kobo
  salePrice?: number; // in kobo
  variations?: ProductVariation[];
  currency: string; // "NGN"
}

export interface ProductVariation {
  id: string;
  name: string; // e.g., "Size", "Color"
  options: VariationOption[];
}

export interface VariationOption {
  id: string;
  value: string; // e.g., "Large", "Red"
  priceModifier: number; // Additional cost in kobo
  stock: number;
}

export interface ProductInventory {
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorders: boolean;
  sku?: string;
}

export interface ProductSpecifications {
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string; // "cm", "inches"
  };
  weight?: {
    value: number;
    unit: string; // "kg", "lbs"
  };
  materials: string[];
  handmadeDetails?: string;
  careInstructions?: string;
}

export interface ProductCustomization {
  available: boolean;
  options: CustomizationOption[];
  leadTime?: number; // days
  additionalCost?: number; // in kobo
}

export interface CustomizationOption {
  id: string;
  type: 'text' | 'color' | 'size' | 'engraving' | 'image';
  label: string;
  required: boolean;
  maxLength?: number;
  options?: string[]; // for select-type options
}

export enum ProductCategory {
  PAINTINGS = 'paintings',
  JEWELRY = 'jewelry',
  HOME_DECOR = 'home_decor',
  PERSONALIZED_GIFTS = 'personalized_gifts',
  SCULPTURES = 'sculptures',
  TEXTILES = 'textiles',
  POTTERY = 'pottery',
  DIGITAL_ART = 'digital_art',
  OTHER = 'other'
}

export enum ProductStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock'
}

export interface SEOData {
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  slug: string;
}

// Order Related Types
export interface Order {
  $id: string;
  orderNumber: string;
  buyerId: string;
  items: OrderItem[];
  status: OrderStatus;
  payment: OrderPayment;
  shipping: OrderShipping;
  totals: OrderTotals;
  timeline: OrderTimeline[];
  notes?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  sellerId: string;
  productTitle: string;
  productImage: string;
  quantity: number;
  unitPrice: number; // in kobo
  variations?: { [key: string]: string };
  customization?: { [key: string]: string };
  subtotal: number; // in kobo
  status: OrderItemStatus;
}

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed'
}

export enum OrderItemStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  READY_TO_SHIP = 'ready_to_ship',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface OrderPayment {
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  paidAt?: string;
  refundedAt?: string;
  amount: number; // in kobo
}

export enum PaymentMethod {
  PAYSTACK = 'paystack',
  PAYPAL = 'paypal',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export interface OrderShipping {
  address: ShippingAddress;
  method: ShippingMethod;
  cost: number; // in kobo
  estimatedDelivery?: string;
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
}

export enum ShippingMethod {
  STANDARD = 'standard',
  EXPRESS = 'express',
  OVERNIGHT = 'overnight',
  PICKUP = 'pickup'
}

export interface OrderTotals {
  subtotal: number; // in kobo
  shipping: number; // in kobo
  tax: number; // in kobo
  discount: number; // in kobo
  total: number; // in kobo
}

export interface OrderTimeline {
  timestamp: string;
  status: OrderStatus;
  note?: string;
  updatedBy: string; // userId
}

// Review Related Types
export interface Review {
  $id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  orderId: string;
  orderItemId: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  images?: ReviewImage[];
  isVerifiedPurchase: boolean;
  status: ReviewStatus;
  sellerResponse?: SellerResponse;
  moderationNotes?: string;
  helpfulVotes: number;
  reportCount: number;
  $createdAt: string;
  $updatedAt: string;
}

export interface ReviewImage {
  id: string;
  url: string;
  altText?: string;
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
  HIDDEN = 'hidden'
}

export interface SellerResponse {
  content: string;
  createdAt: string;
  updatedAt?: string;
}

// Message/Communication Types
export interface Message {
  $id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: MessageType;
  attachments?: MessageAttachment[];
  status: MessageStatus;
  isSystemMessage: boolean;
  relatedOrderId?: string;
  relatedProductId?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface Conversation {
  $id: string;
  participants: string[]; // userIds
  type: ConversationType;
  subject: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: { [userId: string]: number };
  status: ConversationStatus;
  relatedOrderId?: string;
  relatedProductId?: string;
  $createdAt: string;
  $updatedAt: string;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system'
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

export enum ConversationType {
  PRODUCT_INQUIRY = 'product_inquiry',
  ORDER_SUPPORT = 'order_support',
  GENERAL = 'general',
  DISPUTE = 'dispute'
}

export enum ConversationStatus {
  ACTIVE = 'active',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

export interface MessageAttachment {
  id: string;
  filename: string;
  url: string;
  fileType: string;
  fileSize: number;
}

// Analytics Types
export interface AnalyticsEvent {
  $id: string;
  type: AnalyticsEventType;
  userId?: string;
  sessionId: string;
  data: Record<string, any>;
  metadata: EventMetadata;
  $createdAt: string;
}

export enum AnalyticsEventType {
  // User events
  USER_REGISTER = 'user_register',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  
  // Product events
  PRODUCT_VIEW = 'product_view',
  PRODUCT_SEARCH = 'product_search',
  PRODUCT_FILTER = 'product_filter',
  
  // Commerce events
  ADD_TO_CART = 'add_to_cart',
  REMOVE_FROM_CART = 'remove_from_cart',
  CHECKOUT_START = 'checkout_start',
  CHECKOUT_COMPLETE = 'checkout_complete',
  PURCHASE = 'purchase',
  
  // Engagement events
  REVIEW_SUBMIT = 'review_submit',
  MESSAGE_SEND = 'message_send',
  WISHLIST_ADD = 'wishlist_add',
  
  // Seller events
  PRODUCT_LIST = 'product_list',
  ORDER_FULFILL = 'order_fulfill'
}

export interface EventMetadata {
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
  page: string;
  timestamp: string;
}

// Promotion Types
export interface Promotion {
  $id: string;
  name: string;
  description: string;
  type: PromotionType;
  discountValue: number;
  discountType: DiscountType;
  conditions: PromotionConditions;
  usage: PromotionUsage;
  status: PromotionStatus;
  validFrom: string;
  validTo: string;
  createdBy: string; // adminId
  $createdAt: string;
  $updatedAt: string;
}

export enum PromotionType {
  COUPON_CODE = 'coupon_code',
  AUTOMATIC = 'automatic',
  FLASH_SALE = 'flash_sale',
  SEASONAL = 'seasonal'
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_SHIPPING = 'free_shipping'
}

export interface PromotionConditions {
  minOrderAmount?: number;
  maxOrderAmount?: number;
  applicableProducts?: string[]; // productIds
  applicableCategories?: ProductCategory[];
  applicableSellers?: string[]; // sellerIds
  firstTimeCustomersOnly?: boolean;
  usageLimit?: number;
  usageLimitPerCustomer?: number;
}

export interface PromotionUsage {
  totalUses: number;
  totalSavings: number; // in kobo
  customerUses: { [customerId: string]: number };
}

export enum PromotionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

// Dispute Types
export interface Dispute {
  $id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  type: DisputeType;
  reason: DisputeReason;
  description: string;
  evidence: DisputeEvidence[];
  status: DisputeStatus;
  resolution?: DisputeResolution;
  timeline: DisputeTimeline[];
  assignedTo?: string; // adminId
  $createdAt: string;
  $updatedAt: string;
}

export enum DisputeType {
  ORDER_NOT_RECEIVED = 'order_not_received',
  ITEM_NOT_AS_DESCRIBED = 'item_not_as_described',
  DAMAGED_ITEM = 'damaged_item',
  WRONG_ITEM = 'wrong_item',
  QUALITY_ISSUE = 'quality_issue',
  REFUND_REQUEST = 'refund_request'
}

export enum DisputeReason {
  SHIPPING_ISSUE = 'shipping_issue',
  QUALITY_ISSUE = 'quality_issue',
  DESCRIPTION_MISMATCH = 'description_mismatch',
  DEFECTIVE_ITEM = 'defective_item',
  SELLER_COMMUNICATION = 'seller_communication',
  OTHER = 'other'
}

export interface DisputeEvidence {
  id: string;
  type: 'image' | 'document' | 'message';
  url: string;
  description: string;
  uploadedBy: string; // userId
  uploadedAt: string;
}

export enum DisputeStatus {
  OPEN = 'open',
  IN_REVIEW = 'in_review',
  WAITING_SELLER = 'waiting_seller',
  WAITING_BUYER = 'waiting_buyer',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
  CLOSED = 'closed'
}

export interface DisputeResolution {
  type: ResolutionType;
  refundAmount?: number; // in kobo
  description: string;
  resolvedBy: string; // adminId
  resolvedAt: string;
}

export enum ResolutionType {
  FULL_REFUND = 'full_refund',
  PARTIAL_REFUND = 'partial_refund',
  REPLACEMENT = 'replacement',
  STORE_CREDIT = 'store_credit',
  NO_ACTION = 'no_action'
}

export interface DisputeTimeline {
  timestamp: string;
  status: DisputeStatus;
  note: string;
  updatedBy: string; // userId
}

// Wishlist Types
export interface Wishlist {
  $id: string;
  userId: string;
  name: string;
  description?: string;
  items: WishlistItem[];
  isPublic: boolean;
  shareCode?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface WishlistItem {
  id: string;
  productId: string;
  addedAt: string;
  notes?: string;
  priceAlert?: {
    enabled: boolean;
    targetPrice: number; // in kobo
  };
}

// Cart Types
export interface Cart {
  $id: string;
  userId: string;
  items: CartItem[];
  appliedPromotions: string[]; // promotionIds
  totals: CartTotals;
  expiresAt: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  variations?: { [key: string]: string };
  customization?: { [key: string]: string };
  unitPrice: number; // in kobo
  subtotal: number; // in kobo
  addedAt: string;
}

export interface CartTotals {
  subtotal: number; // in kobo
  discount: number; // in kobo
  tax: number; // in kobo
  shipping: number; // in kobo
  total: number; // in kobo
}