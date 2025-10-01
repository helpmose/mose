// African Art Categories
export const AFRICAN_ART_CATEGORIES = [
  {
    id: 'sculptures',
    name: 'Sculptures',
    description: 'Traditional and contemporary African sculptures',
    subcategories: ['Wood Carvings', 'Stone Sculptures', 'Bronze Works', 'Ceramic Art']
  },
  {
    id: 'paintings',
    name: 'Paintings',
    description: 'African paintings and visual art',
    subcategories: ['Traditional Paintings', 'Contemporary Art', 'Abstract Art', 'Portraits']
  },
  {
    id: 'textiles',
    name: 'Textiles',
    description: 'African fabrics and textile art',
    subcategories: ['Kente Cloth', 'Ankara Fabrics', 'Mud Cloth', 'Woven Baskets']
  },
  {
    id: 'jewelry',
    name: 'Jewelry',
    description: 'Traditional and modern African jewelry',
    subcategories: ['Beaded Jewelry', 'Metal Works', 'Traditional Ornaments', 'Contemporary Designs']
  },
  {
    id: 'masks',
    name: 'Masks',
    description: 'African ceremonial and decorative masks',
    subcategories: ['Ceremonial Masks', 'Decorative Masks', 'Tribal Masks', 'Contemporary Masks']
  },
  {
    id: 'pottery',
    name: 'Pottery',
    description: 'African ceramics and pottery',
    subcategories: ['Traditional Pottery', 'Contemporary Ceramics', 'Decorative Vessels', 'Functional Pottery']
  },
  {
    id: 'home-decor',
    name: 'Home Décor',
    description: 'African-inspired home decoration items',
    subcategories: ['Wall Art', 'Decorative Objects', 'Furniture', 'Lighting']
  },
  {
    id: 'musical-instruments',
    name: 'Musical Instruments',
    description: 'Traditional African musical instruments',
    subcategories: ['Drums', 'String Instruments', 'Wind Instruments', 'Percussion']
  }
];

// User Roles
export const USER_ROLES = {
  BUYER: 'buyer',
  SELLER: 'seller',
  ADMIN: 'admin'
} as const;

// Appwrite Database Configuration
export const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
export const USER_PROFILES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_USER_PROFILES_COLLECTION_ID || 'user_profiles';
export const PRODUCTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_PRODUCTS_COLLECTION_ID || 'products';
export const ORDERS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID || 'orders';
export const GIFT_EVENTS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_GIFT_EVENTS_COLLECTION_ID || 'gift_events';
export const CONVERSATIONS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_CONVERSATIONS_COLLECTION_ID || 'conversations';
export const MESSAGES_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID || 'messages';
export const NOTIFICATIONS_COLLECTION_ID = process.env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_COLLECTION_ID || 'notifications';

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
} as const;

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded'
} as const;

// Product Status
export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  ACTIVE: 'active',
  REJECTED: 'rejected',
  FLAGGED: 'flagged', 
  SOLD: 'sold'
} as const;

// Seller Verification Status
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
} as const;

// Gift Event Status
export const GIFT_EVENT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
} as const;

// Gift Privacy Settings
export const GIFT_PRIVACY = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  FRIENDS_ONLY: 'friends_only'
} as const;

// Nigerian States
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

// Gift Occasions
export const GIFT_OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Wedding',
  'Graduation',
  'New Job',
  'Housewarming',
  'Baby Shower',
  'Retirement',
  'Holiday',
  'Just Because'
];

// Customization Types
export const CUSTOMIZATION_TYPES = {
  TEXT: 'text',
  COLOR: 'color',
  SIZE: 'size',
  MATERIAL: 'material'
} as const;

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file'
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  ORDER: 'order',
  MESSAGE: 'message',
  REVIEW: 'review',
  PRODUCT: 'product',
  SYSTEM: 'system'
} as const;

// File Upload Limits
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGES_PER_PRODUCT: 8,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_FILE_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 100
};

// API Endpoints
export const API_ENDPOINTS = {
  PAYSTACK_BASE: 'https://api.paystack.co',
  SPOTIFY_BASE: 'https://api.spotify.com/v1'
};

// Social Media Platforms
export const SOCIAL_PLATFORMS = [
  { name: 'Instagram', key: 'instagram', baseUrl: 'https://instagram.com/' },
  { name: 'Facebook', key: 'facebook', baseUrl: 'https://facebook.com/' },
  { name: 'Website', key: 'website', baseUrl: '' }
];

// Rating System
export const RATING_SYSTEM = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  DEFAULT_RATING: 0
};

// Search Filters
export const SEARCH_FILTERS = {
  PRICE_RANGES: [
    { label: 'Under ₦5,000', min: 0, max: 5000 },
    { label: '₦5,000 - ₦15,000', min: 5000, max: 15000 },
    { label: '₦15,000 - ₦50,000', min: 15000, max: 50000 },
    { label: '₦50,000 - ₦100,000', min: 50000, max: 100000 },
    { label: 'Over ₦100,000', min: 100000, max: null }
  ],
  SORT_OPTIONS: [
    { label: 'Newest First', value: 'newest' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Most Popular', value: 'popular' },
    { label: 'Highest Rated', value: 'rating' }
  ]
};

// Platform Settings
export const PLATFORM_SETTINGS = {
  COMMISSION_RATE: 0.05, // 5% commission
  TAX_RATE: 0.075, // 7.5% VAT
  FREE_SHIPPING_THRESHOLD: 50000, // ₦50,000
  DEFAULT_SHIPPING_COST: 2500, // ₦2,500
  CURRENCY: 'NGN',
  CURRENCY_SYMBOL: '₦'
}; 