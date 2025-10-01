/**
 * Script to add wishlist attributes to gift_events collection
 * This updates the gift events to support product wishlists
 */

import { Client, Databases } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
const GIFT_EVENTS_COLLECTION_ID = 'gift_events';

// Initialize Appwrite client with server SDK
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '686009220034820fd017')
  .setKey(process.env.APPWRITE_API_KEY || 'standard_61249273df2368d81f0f0d83e5b7141960d45f12489a4c2d0bf3d9e96bacaee94bb647fb590c07e10d241726c5c7a22e6073d8840037ab0aebb60dc1cf599c0559178dca40d8339aea4328b8d232cf923dd0f35469ae5f2529c1d509d40dd15a1742af8cc4d0ddf7af75383795e2dbc0a3ce1387d4504244393c14c42f38a020');

const databases = new Databases(client);

interface AttributeConfig {
  key: string;
  type: 'string' | 'integer' | 'boolean';
  size?: number;
  required: boolean;
  description: string;
}

// New attributes for wishlist functionality
const NEW_GIFT_ATTRIBUTES: AttributeConfig[] = [
  {
    key: 'wishlistProducts',
    type: 'string',
    size: 10000,
    required: false,
    description: 'JSON array of product IDs in the wishlist'
  },
  {
    key: 'deliveryAddress',
    type: 'string',
    size: 2000,
    required: false,
    description: 'JSON object containing delivery address for gift items'
  },
  {
    key: 'bankAccount',
    type: 'string',
    size: 1000,
    required: false,
    description: 'JSON object containing bank account details for monetary gifts'
  },
  {
    key: 'allowMonetaryGifts',
    type: 'boolean',
    required: false,
    description: 'Whether to accept monetary contributions'
  },
  {
    key: 'purchasedItems',
    type: 'string',
    size: 10000,
    required: false,
    description: 'JSON array of purchased product IDs to track fulfilled wishlist items'
  }
];

async function updateGiftAttributes() {
  try {
    console.log('🎁 Adding wishlist attributes to gift_events collection...\n');

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const attr of NEW_GIFT_ATTRIBUTES) {
      try {
        console.log(`🔄 Creating ${attr.type} attribute: ${attr.key}`);
        console.log(`   Collection: gift_events`);
        console.log(`   Description: ${attr.description}`);
        console.log(`   Required: ${attr.required}`);
        if (attr.size) {
          console.log(`   Size: ${attr.size}`);
        }

        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            GIFT_EVENTS_COLLECTION_ID,
            attr.key,
            attr.size || 255,
            attr.required,
            undefined, // default value
            false // array
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            GIFT_EVENTS_COLLECTION_ID,
            attr.key,
            attr.required,
            undefined, // min
            undefined, // max
            undefined, // default
            false // array
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            GIFT_EVENTS_COLLECTION_ID,
            attr.key,
            attr.required,
            false, // default
            false // array
          );
        }

        console.log(`✅ Successfully created attribute: ${attr.key}\n`);
        totalCreated++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`ℹ️  Attribute ${attr.key} already exists, skipping\n`);
          totalSkipped++;
        } else {
          console.error(`❌ Failed to create attribute ${attr.key}:`, error.message || error);
          console.log('');
          totalErrors++;
        }
      }
    }

    // Summary
    console.log('📊 Final Summary:');
    console.log(`   ✅ Created: ${totalCreated} attributes`);
    console.log(`   ℹ️  Skipped: ${totalSkipped} attributes (already exist)`);
    console.log(`   ❌ Errors: ${totalErrors} attributes`);
    console.log('');

    if (totalErrors === 0) {
      console.log('🎉 Gift events collection updated successfully for wishlist functionality!');
      console.log('');
      console.log('📝 New Features Enabled:');
      console.log('   1. Product wishlist selection');
      console.log('   2. Delivery address management');
      console.log('   3. Bank account for monetary gifts');
      console.log('   4. Purchase tracking');
    } else {
      console.log('⚠️  Some attributes failed to create. Check the errors above.');
    }

  } catch (error) {
    console.error('❌ Fatal error updating gift attributes:', error);
    throw error;
  }
}

// Run the script
updateGiftAttributes()
  .then(() => {
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });