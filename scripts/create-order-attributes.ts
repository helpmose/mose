/**
 * Script to create all missing attributes for the orders collection
 * This uses the Appwrite server SDK which has full database management capabilities
 */

import { Client, Databases } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
const COLLECTION_ID = 'orders';

// Initialize Appwrite client with server SDK
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '686009220034820fd017')
  .setKey(process.env.APPWRITE_API_KEY || 'standard_61249273df2368d81f0f0d83e5b7141960d45f12489a4c2d0bf3d9e96bacaee94bb647fb590c07e10d241726c5c7a22e6073d8840037ab0aebb60dc1cf599c0559178dca40d8339aea4328b8d232cf923dd0f35469ae5f2529c1d509d40dd15a1742af8cc4d0ddf7af75383795e2dbc0a3ce1387d4504244393c14c42f38a020');

const databases = new Databases(client);

interface AttributeConfig {
  key: string;
  type: 'string' | 'integer';
  size?: number;
  required: boolean;
  description: string;
}

// Define all missing attributes based on OrderService requirements
const MISSING_ATTRIBUTES: AttributeConfig[] = [
  {
    key: 'buyerId',
    type: 'string',
    size: 50,
    required: true,
    description: 'ID of the user who placed the order'
  },
  {
    key: 'billingAddress', 
    type: 'string',
    size: 2000,
    required: false,
    description: 'JSON string of billing address data'
  },
  {
    key: 'disputeStatus',
    type: 'string', 
    size: 50,
    required: true,
    description: 'Status of any dispute (none, pending, resolved)'
  },
  {
    key: 'finalAmount',
    type: 'integer',
    required: true,
    description: 'Final amount including shipping and tax (in kobo)'
  },
  {
    key: 'items',
    type: 'string',
    size: 5000,
    required: true,
    description: 'JSON string of ordered items array'
  },
  {
    key: 'notes',
    type: 'string',
    size: 1000,
    required: false,
    description: 'Customer notes for the order'
  },
  {
    key: 'orderStatus',
    type: 'string',
    size: 50, 
    required: true,
    description: 'Current order status (pending, confirmed, processing, shipped, delivered, cancelled)'
  },
  {
    key: 'paymentReference',
    type: 'string',
    size: 100,
    required: true,
    description: 'Paystack payment reference ID'
  },
  {
    key: 'paymentStatus', 
    type: 'string',
    size: 50,
    required: true,
    description: 'Payment status (pending, paid, failed, refunded)'
  },
  {
    key: 'shippingAddress',
    type: 'string',
    size: 2000,
    required: true,
    description: 'JSON string of shipping address data'
  },
  {
    key: 'shippingAmount',
    type: 'integer',
    required: true,
    description: 'Shipping cost (in kobo)'
  },
  {
    key: 'shippingMethod',
    type: 'string',
    size: 50,
    required: true,
    description: 'Shipping method (standard, express, overnight, free)'
  },
  {
    key: 'taxAmount',
    type: 'integer',
    required: true,
    description: 'Tax amount (in kobo)'
  },
  {
    key: 'totalAmount',
    type: 'integer',
    required: true,
    description: 'Subtotal before shipping and tax (in kobo)'
  },
  {
    key: 'trackingNumber',
    type: 'string',
    size: 100,
    required: false,
    description: 'Package tracking number from shipping provider'
  }
];

async function createOrderAttributes() {
  try {
    console.log('🔄 Creating missing attributes for orders collection...\n');

    // Get existing collection to check current attributes
    try {
      const collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
      console.log(`📋 Found existing collection: ${collection.name}`);
      console.log(`📊 Current attributes: ${collection.attributes.map((attr: any) => attr.key).join(', ')}`);
      console.log('');
    } catch (error) {
      console.error('❌ Could not fetch collection details:', error);
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Create each missing attribute
    for (const attr of MISSING_ATTRIBUTES) {
      try {
        console.log(`🔄 Creating ${attr.type} attribute: ${attr.key}`);
        console.log(`   Description: ${attr.description}`);
        console.log(`   Required: ${attr.required}`);
        if (attr.size) {
          console.log(`   Size: ${attr.size}`);
        }

        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.size || 255,
            attr.required,
            undefined, // default value
            false // array
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            COLLECTION_ID,
            attr.key,
            attr.required,
            undefined, // min
            undefined, // max  
            undefined, // default
            false // array
          );
        }

        console.log(`✅ Successfully created attribute: ${attr.key}\n`);
        createdCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error: any) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`ℹ️  Attribute ${attr.key} already exists, skipping\n`);
          skippedCount++;
        } else {
          console.error(`❌ Failed to create attribute ${attr.key}:`, error.message || error);
          console.log('');
          errorCount++;
        }
      }
    }

    // Summary
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${createdCount} attributes`);
    console.log(`   ℹ️  Skipped: ${skippedCount} attributes (already exist)`);
    console.log(`   ❌ Errors: ${errorCount} attributes`);
    console.log('');

    if (errorCount === 0) {
      console.log('🎉 All attributes processed successfully!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Wait for Appwrite to fully process the attributes (30-60 seconds)');
      console.log('   2. Test order creation in your application');
      console.log('   3. Run the migration script for existing orders if needed');
    } else {
      console.log('⚠️  Some attributes failed to create. Check the errors above.');
    }

  } catch (error) {
    console.error('❌ Fatal error creating attributes:', error);
    throw error;
  }
}

// Run the script
createOrderAttributes()
  .then(() => {
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });