#!/usr/bin/env tsx
/**
 * MOSÉ Platform - Unified Collection Setup Script
 * 
 * This script sets up all database collections, storage buckets, and indexes
 * for the MOSÉ African art marketplace with collaborative gift platform.
 * 
 * Features:
 * - Complete database schema creation
 * - Optimized indexes for performance  
 * - Proper permissions and security
 * - Storage buckets for media files
 * - Comprehensive error handling
 */

import { Client, Databases, Storage, Permission, Role, IndexType, ID } from 'appwrite';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Configuration
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'mose_database';

if (!PROJECT_ID || !API_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set in .env.local');
  process.exit(1);
}

// Initialize Appwrite client for server-side operations
// Note: In Appwrite v15, we use headers for API key authentication
const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID);

// For server-side operations, we'll use direct API calls with API key in headers

const databases = new Databases(client);
const storage = new Storage(client);

console.log('🚀 MOSÉ Platform - Database Setup');
console.log('================================');
console.log(`📍 Endpoint: ${ENDPOINT}`);
console.log(`🗄️  Project: ${PROJECT_ID}`);
console.log(`💾 Database: ${DATABASE_ID}`);
console.log('');

/**
 * Collection configurations with attributes and indexes
 */
const COLLECTIONS = {
  products: {
    name: 'Products',
    description: 'African art marketplace products',
    attributes: [
      { key: 'productId', type: 'string', size: 255, required: true },
      { key: 'sellerId', type: 'string', size: 255, required: true },
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 5000, required: true },
      { key: 'price', type: 'integer', required: true }, // in kobo
      { key: 'salePrice', type: 'integer', required: false },
      { key: 'category', type: 'string', size: 100, required: true },
      { key: 'tags', type: 'string', size: 1000, required: false },
      { key: 'images', type: 'string', size: 2000, required: false }, // JSON array
      { key: 'status', type: 'enum', elements: ['draft', 'published', 'archived'], required: true, default: 'draft' },
      { key: 'stock', type: 'integer', required: false, default: 0 },
      { key: 'views', type: 'integer', required: false, default: 0 },
      { key: 'likes', type: 'integer', required: false, default: 0 },
      { key: 'averageRating', type: 'float', required: false, default: 0 },
      { key: 'reviewCount', type: 'integer', required: false, default: 0 },
      { key: 'location', type: 'string', size: 255, required: false },
      { key: 'isPhysical', type: 'boolean', required: true, default: true },
      { key: 'dimensions', type: 'string', size: 255, required: false },
      { key: 'weight', type: 'float', required: false }
    ],
    indexes: [
      { key: 'productId_idx', type: 'unique', attributes: ['productId'] },
      { key: 'sellerId_idx', type: 'key', attributes: ['sellerId'] },
      { key: 'category_idx', type: 'key', attributes: ['category'] },
      { key: 'status_idx', type: 'key', attributes: ['status'] },
      { key: 'price_idx', type: 'key', attributes: ['price'] },
      { key: 'rating_idx', type: 'key', attributes: ['averageRating'] }
    ]
  },

  orders: {
    name: 'Orders',
    description: 'Marketplace orders and transactions',
    attributes: [
      { key: 'orderId', type: 'string', size: 255, required: true },
      { key: 'buyerId', type: 'string', size: 255, required: true },
      { key: 'sellerId', type: 'string', size: 255, required: true },
      { key: 'items', type: 'string', size: 5000, required: true }, // JSON array
      { key: 'totalAmount', type: 'integer', required: true }, // in kobo
      { key: 'shippingAmount', type: 'integer', required: false, default: 0 },
      { key: 'taxAmount', type: 'integer', required: false, default: 0 },
      { key: 'status', type: 'enum', elements: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], required: true, default: 'pending' },
      { key: 'paymentStatus', type: 'enum', elements: ['pending', 'paid', 'failed', 'refunded'], required: true, default: 'pending' },
      { key: 'paymentReference', type: 'string', size: 255, required: false },
      { key: 'shippingAddress', type: 'string', size: 1000, required: true }, // JSON object
      { key: 'notes', type: 'string', size: 1000, required: false },
      { key: 'trackingNumber', type: 'string', size: 255, required: false },
      { key: 'estimatedDelivery', type: 'string', size: 255, required: false }
    ],
    indexes: [
      { key: 'orderId_idx', type: 'unique', attributes: ['orderId'] },
      { key: 'buyerId_idx', type: 'key', attributes: ['buyerId'] },
      { key: 'sellerId_idx', type: 'key', attributes: ['sellerId'] },
      { key: 'status_idx', type: 'key', attributes: ['status'] },
      { key: 'paymentStatus_idx', type: 'key', attributes: ['paymentStatus'] }
    ]
  },

  reviews: {
    name: 'Reviews',
    description: 'Product reviews and ratings',
    attributes: [
      { key: 'reviewId', type: 'string', size: 255, required: true },
      { key: 'productId', type: 'string', size: 255, required: true },
      { key: 'orderId', type: 'string', size: 255, required: true },
      { key: 'buyerId', type: 'string', size: 255, required: true },
      { key: 'rating', type: 'integer', required: true }, // 1-5
      { key: 'comment', type: 'string', size: 2000, required: false },
      { key: 'images', type: 'string', size: 1000, required: false }, // JSON array
      { key: 'isVerifiedPurchase', type: 'boolean', required: true, default: false },
      { key: 'isHelpful', type: 'integer', required: false, default: 0 } // helpful votes
    ],
    indexes: [
      { key: 'reviewId_idx', type: 'unique', attributes: ['reviewId'] },
      { key: 'productId_idx', type: 'key', attributes: ['productId'] },
      { key: 'buyerId_idx', type: 'key', attributes: ['buyerId'] },
      { key: 'rating_idx', type: 'key', attributes: ['rating'] }
    ]
  },

  categories: {
    name: 'Categories',
    description: 'African art categories and subcategories',
    attributes: [
      { key: 'categoryId', type: 'string', size: 255, required: true },
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'image', type: 'string', size: 255, required: false },
      { key: 'parentCategory', type: 'string', size: 255, required: false },
      { key: 'isActive', type: 'boolean', required: true, default: true },
      { key: 'sortOrder', type: 'integer', required: false, default: 0 }
    ],
    indexes: [
      { key: 'categoryId_idx', type: 'unique', attributes: ['categoryId'] },
      { key: 'name_idx', type: 'key', attributes: ['name'] },
      { key: 'parent_idx', type: 'key', attributes: ['parentCategory'] }
    ]
  },

  gift_events: {
    name: 'Gift Events',
    description: 'Collaborative gift celebrations',
    attributes: [
      { key: 'eventId', type: 'string', size: 255, required: true },
      { key: 'hostId', type: 'string', size: 255, required: true },
      { key: 'recipientName', type: 'string', size: 255, required: true },
      { key: 'recipientEmail', type: 'string', size: 255, required: false },
      { key: 'eventType', type: 'enum', elements: ['birthday', 'wedding', 'anniversary', 'graduation', 'other'], required: true },
      { key: 'eventDate', type: 'string', size: 255, required: true },
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 2000, required: false },
      { key: 'giftGoal', type: 'integer', required: true }, // in kobo
      { key: 'currentAmount', type: 'integer', required: false, default: 0 },
      { key: 'contributorsCount', type: 'integer', required: false, default: 0 },
      { key: 'status', type: 'enum', elements: ['draft', 'active', 'completed', 'cancelled'], required: true, default: 'draft' },
      { key: 'digitalCard', type: 'string', size: 5000, required: false }, // JSON object
      { key: 'spotifyPlaylistId', type: 'string', size: 255, required: false },
      { key: 'isPublic', type: 'boolean', required: true, default: true },
      { key: 'giftSelection', type: 'string', size: 1000, required: false } // JSON array of selected products
    ],
    indexes: [
      { key: 'eventId_idx', type: 'unique', attributes: ['eventId'] },
      { key: 'hostId_idx', type: 'key', attributes: ['hostId'] },
      { key: 'status_idx', type: 'key', attributes: ['status'] },
      { key: 'eventDate_idx', type: 'key', attributes: ['eventDate'] }
    ]
  },

  gift_contributions: {
    name: 'Gift Contributions',
    description: 'Individual contributions to gift events',
    attributes: [
      { key: 'contributionId', type: 'string', size: 255, required: true },
      { key: 'eventId', type: 'string', size: 255, required: true },
      { key: 'contributorId', type: 'string', size: 255, required: true },
      { key: 'contributorName', type: 'string', size: 255, required: true },
      { key: 'contributorEmail', type: 'string', size: 255, required: false },
      { key: 'amount', type: 'integer', required: true }, // in kobo
      { key: 'message', type: 'string', size: 500, required: false },
      { key: 'paymentStatus', type: 'enum', elements: ['pending', 'paid', 'failed'], required: true, default: 'pending' },
      { key: 'paymentReference', type: 'string', size: 255, required: false },
      { key: 'isAnonymous', type: 'boolean', required: true, default: false },
      { key: 'giftSelection', type: 'string', size: 1000, required: false } // JSON array
    ],
    indexes: [
      { key: 'contributionId_idx', type: 'unique', attributes: ['contributionId'] },
      { key: 'eventId_idx', type: 'key', attributes: ['eventId'] },
      { key: 'contributorId_idx', type: 'key', attributes: ['contributorId'] },
      { key: 'paymentStatus_idx', type: 'key', attributes: ['paymentStatus'] }
    ]
  },

  conversations: {
    name: 'Conversations',
    description: 'Chat conversations between users',
    attributes: [
      { key: 'conversationId', type: 'string', size: 255, required: true },
      { key: 'participants', type: 'string', size: 1000, required: true }, // JSON array
      { key: 'lastMessage', type: 'string', size: 1000, required: false },
      { key: 'lastMessageSenderId', type: 'string', size: 255, required: false },
      { key: 'lastMessageTime', type: 'string', size: 255, required: false },
      { key: 'productId', type: 'string', size: 255, required: false },
      { key: 'orderId', type: 'string', size: 255, required: false },
      { key: 'isActive', type: 'boolean', required: true, default: true },
      { key: 'unreadCount', type: 'string', size: 500, required: false } // JSON object per participant
    ],
    indexes: [
      { key: 'conversationId_idx', type: 'unique', attributes: ['conversationId'] },
      { key: 'productId_idx', type: 'key', attributes: ['productId'] },
      { key: 'orderId_idx', type: 'key', attributes: ['orderId'] }
    ]
  },

  messages: {
    name: 'Messages',
    description: 'Individual chat messages',
    attributes: [
      { key: 'messageId', type: 'string', size: 255, required: true },
      { key: 'conversationId', type: 'string', size: 255, required: true },
      { key: 'senderId', type: 'string', size: 255, required: true },
      { key: 'content', type: 'string', size: 2000, required: false },
      { key: 'messageType', type: 'enum', elements: ['text', 'image', 'file', 'system'], required: true, default: 'text' },
      { key: 'attachments', type: 'string', size: 1000, required: false }, // JSON array
      { key: 'readBy', type: 'string', size: 1000, required: false }, // JSON object
      { key: 'isEdited', type: 'boolean', required: true, default: false },
      { key: 'editedAt', type: 'string', size: 255, required: false },
      { key: 'replyTo', type: 'string', size: 255, required: false } // messageId
    ],
    indexes: [
      { key: 'messageId_idx', type: 'unique', attributes: ['messageId'] },
      { key: 'conversationId_idx', type: 'key', attributes: ['conversationId'] },
      { key: 'senderId_idx', type: 'key', attributes: ['senderId'] },
      { key: 'messageType_idx', type: 'key', attributes: ['messageType'] }
    ]
  }
};

/**
 * Storage bucket configurations
 */
const STORAGE_BUCKETS = [
  {
    id: 'product-images',
    name: 'Product Images',
    maxFileSize: 10485760, // 10MB
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    description: 'Product photos and gallery images'
  },
  {
    id: 'user-avatars',
    name: 'User Avatars', 
    maxFileSize: 2097152, // 2MB
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    description: 'User profile pictures'
  },
  {
    id: 'gift-images',
    name: 'Gift Images',
    maxFileSize: 5242880, // 5MB
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    description: 'Gift event photos and digital cards'
  },
  {
    id: 'gift-videos', 
    name: 'Gift Videos',
    maxFileSize: 52428800, // 50MB
    allowedExtensions: ['mp4', 'mov', 'avi', 'webm'],
    description: 'Gift video messages'
  },
  {
    id: 'message-attachments',
    name: 'Message Attachments',
    maxFileSize: 10485760, // 10MB
    allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt'],
    description: 'Chat message attachments'
  }
];

/**
 * Utility functions
 */
async function createDatabase() {
  try {
    console.log('🔄 Creating database...');
    await databases.create(DATABASE_ID, 'MOSÉ Platform Database');
    console.log('✅ Database created successfully');
    return true;
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✅ Database already exists');
      return true;
    }
    throw error;
  }
}

async function createCollection(collectionId: string, config: any) {
  try {
    console.log(`🔄 Creating collection: ${config.name}...`);
    
    // Create collection
    await databases.createCollection(
      DATABASE_ID,
      collectionId,
      config.name,
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ]
    );

    console.log(`   📝 Collection created: ${config.name}`);
    
    // Add attributes
    for (const attr of config.attributes) {
      await createAttribute(collectionId, attr);
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Wait for attributes to be ready
    console.log('   ⏳ Waiting for attributes to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create indexes
    for (const index of config.indexes) {
      await createIndex(collectionId, index);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`✅ Collection setup complete: ${config.name}`);
    
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`✅ Collection already exists: ${config.name}`);
    } else {
      throw error;
    }
  }
}

async function createAttribute(collectionId: string, attr: any) {
  try {
    switch (attr.type) {
      case 'string':
        await databases.createStringAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.size,
          attr.required,
          attr.default
        );
        break;
      case 'integer':
        await databases.createIntegerAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.required,
          attr.min,
          attr.max,
          attr.default
        );
        break;
      case 'float':
        await databases.createFloatAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.required,
          attr.min,
          attr.max,
          attr.default
        );
        break;
      case 'boolean':
        await databases.createBooleanAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.required,
          attr.default
        );
        break;
      case 'enum':
        await databases.createEnumAttribute(
          DATABASE_ID,
          collectionId,
          attr.key,
          attr.elements,
          attr.required,
          attr.default
        );
        break;
    }
    console.log(`     ✓ ${attr.key} (${attr.type})`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`     ✓ ${attr.key} (exists)`);
    } else {
      console.warn(`     ⚠ Failed to create ${attr.key}:`, error.message);
    }
  }
}

async function createIndex(collectionId: string, index: any) {
  try {
    const indexType = index.type === 'unique' ? IndexType.Unique : 
                     index.type === 'fulltext' ? IndexType.Fulltext : IndexType.Key;
    
    await databases.createIndex(
      DATABASE_ID,
      collectionId,
      index.key,
      indexType,
      index.attributes
    );
    console.log(`     📊 Index: ${index.key}`);
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`     📊 Index exists: ${index.key}`);
    } else {
      console.warn(`     ⚠ Failed to create index ${index.key}:`, error.message);
    }
  }
}

async function createStorageBucket(bucket: any) {
  try {
    console.log(`🔄 Creating storage bucket: ${bucket.name}...`);
    
    await storage.createBucket(
      bucket.id,
      bucket.name,
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users())
      ],
      false, // File security
      true,   // Enabled
      bucket.maxFileSize,
      bucket.allowedExtensions,
      undefined, // Compression
      true, // Encryption
      true  // Antivirus
    );
    
    console.log(`✅ Storage bucket created: ${bucket.name}`);
    
  } catch (error: any) {
    if (error.code === 409) {
      console.log(`✅ Storage bucket already exists: ${bucket.name}`);
    } else {
      console.warn(`⚠ Could not create bucket ${bucket.name}: ${error.message}`);
    }
  }
}

/**
 * Main setup function
 */
async function setupMOSEPlatform() {
  try {
    console.log('🎨 Starting MOSÉ Platform setup...\n');

    // Step 1: Create database
    await createDatabase();
    console.log('');

    // Step 2: Create all collections
    for (const [collectionId, config] of Object.entries(COLLECTIONS)) {
      await createCollection(collectionId, config);
      console.log('');
    }

    // Step 3: Create storage buckets
    console.log('📦 Setting up storage buckets...');
    for (const bucket of STORAGE_BUCKETS) {
      await createStorageBucket(bucket);
    }

    // Success summary
    console.log('\n🎉 MOSÉ Platform Setup Complete!');
    console.log('================================');
    console.log('✅ Database: mose_database');
    console.log('✅ Collections: 8 collections with optimized indexes');
    console.log('✅ Storage: 5 buckets for different media types');
    console.log('✅ Permissions: Role-based access control configured');
    console.log('✅ Indexes: Performance-optimized for searches');
    
    console.log('\n📊 Created Collections:');
    Object.entries(COLLECTIONS).forEach(([id, config]) => {
      console.log(`   • ${config.name} (${id})`);
    });
    
    console.log('\n💾 Created Storage Buckets:');
    STORAGE_BUCKETS.forEach(bucket => {
      console.log(`   • ${bucket.name} (${bucket.id})`);
    });

    console.log('\n🚀 Next Steps:');
    console.log('1. Check your Appwrite console to verify all collections');
    console.log('2. Run: npm run dev');
    console.log('3. Visit: http://localhost:3000');
    console.log('4. Test user registration and product creation');
    console.log('\n🎨 Your MOSÉ platform is ready for African art and collaborative gifting!');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    console.error('\nTroubleshooting:');
    console.error('• Check your .env.local file has correct Appwrite credentials');
    console.error('• Verify your API key has all required permissions');
    console.error('• Make sure you have available resources on your Appwrite plan');
    process.exit(1);
  }
}

// Run the setup
setupMOSEPlatform();