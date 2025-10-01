import { Client, Databases, ID } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = new Client();
const databases = new Databases(client);

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
const COLLECTION_ID = 'products';

async function updateProductsCollection() {
  try {
    console.log('🔄 Updating products collection with additional fields...');

    // Add missing fields to products collection
    const fieldsToAdd = [
      {
        key: 'subcategory',
        type: 'string',
        size: 100,
        required: false,
        default: null
      },
      {
        key: 'tags',
        type: 'string',
        size: 1000,
        required: false,
        default: null,
        array: false
      },
      {
        key: 'images',
        type: 'string',
        size: 2000,
        required: false,
        default: null
      },
      {
        key: 'customizable',
        type: 'boolean',
        required: false,
        default: false
      },
      {
        key: 'customizationOptions',
        type: 'string',
        size: 1000,
        required: false,
        default: null
      },
      {
        key: 'stock',
        type: 'integer',
        required: false,
        default: 1,
        min: 0
      },
      {
        key: 'salePrice',
        type: 'integer',
        required: false,
        default: null,
        min: 0
      },
      {
        key: 'location',
        type: 'string',
        size: 100,
        required: false,
        default: 'Nigeria'
      },
      {
        key: 'materials',
        type: 'string',
        size: 500,
        required: false,
        default: null
      },
      {
        key: 'dimensions',
        type: 'string',
        size: 200,
        required: false,
        default: null
      },
      {
        key: 'shippingInfo',
        type: 'string',
        size: 500,
        required: false,
        default: null
      },
      {
        key: 'views',
        type: 'integer',
        required: false,
        default: 0,
        min: 0
      },
      {
        key: 'likes',
        type: 'integer',
        required: false,
        default: 0,
        min: 0
      },
      {
        key: 'averageRating',
        type: 'double',
        required: false,
        default: 0,
        min: 0,
        max: 5
      },
      {
        key: 'reviewCount',
        type: 'integer',
        required: false,
        default: 0,
        min: 0
      },
      {
        key: 'productId',
        type: 'string',
        size: 100,
        required: false,
        default: null
      }
    ];

    for (const field of fieldsToAdd) {
      try {
        console.log(`➕ Adding field: ${field.key}`);
        
        if (field.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            field.key,
            field.size || 255,
            field.required || false,
            field.default,
            field.array || false
          );
        } else if (field.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            field.key,
            field.required || false,
            field.min,
            field.max,
            field.default,
            field.array || false
          );
        } else if (field.type === 'double') {
          await databases.createFloatAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            field.key,
            field.required || false,
            field.min,
            field.max,
            field.default,
            field.array || false
          );
        } else if (field.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            field.key,
            field.required || false,
            field.default,
            field.array || false
          );
        }

        console.log(`✅ Added field: ${field.key}`);
        
        // Wait a bit between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error: any) {
        if (error.message?.includes('already exists')) {
          console.log(`⚠️  Field ${field.key} already exists, skipping...`);
        } else {
          console.error(`❌ Failed to add field ${field.key}:`, error.message);
        }
      }
    }

    console.log('✅ Products collection update completed!');
    
  } catch (error) {
    console.error('❌ Error updating products collection:', error);
  }
}

// Run the update
updateProductsCollection();