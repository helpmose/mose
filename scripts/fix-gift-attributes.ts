/**
 * Script to fix the remaining failed gift attributes
 */

import { Client, Databases } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
const GIFT_EVENTS_COLLECTION_ID = 'gift_events';
const GIFT_CONTRIBUTIONS_COLLECTION_ID = 'gift_contributions';

// Initialize Appwrite client with server SDK
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '686009220034820fd017')
  .setKey(process.env.APPWRITE_API_KEY || 'standard_61249273df2368d81f0f0d83e5b7141960d45f12489a4c2d0bf3d9e96bacaee94bb647fb590c07e10d241726c5c7a22e6073d8840037ab0aebb60dc1cf599c0559178dca40d8339aea4328b8d232cf923dd0f35469ae5f2529c1d509d40dd15a1742af8cc4d0ddf7af75383795e2dbc0a3ce1387d4504244393c14c42f38a020');

const databases = new Databases(client);

interface FailedAttribute {
  collection: string;
  key: string;
  type: 'integer' | 'boolean';
  required: boolean;
  description: string;
}

const FAILED_ATTRIBUTES: FailedAttribute[] = [
  {
    collection: GIFT_EVENTS_COLLECTION_ID,
    key: 'giftGoal',
    type: 'integer',
    required: true,
    description: 'Target amount for the gift (in kobo)'
  },
  {
    collection: GIFT_EVENTS_COLLECTION_ID,
    key: 'currentAmount',
    type: 'integer',
    required: true,
    description: 'Current amount raised (in kobo)'
  },
  {
    collection: GIFT_EVENTS_COLLECTION_ID,
    key: 'contributorsCount',
    type: 'integer',
    required: true,
    description: 'Number of contributors to the gift'
  },
  {
    collection: GIFT_CONTRIBUTIONS_COLLECTION_ID,
    key: 'amount',
    type: 'integer',
    required: true,
    description: 'Contribution amount (in kobo)'
  },
  {
    collection: GIFT_CONTRIBUTIONS_COLLECTION_ID,
    key: 'isAnonymous',
    type: 'boolean',
    required: true,
    description: 'Whether the contribution should be shown anonymously'
  }
];

async function fixFailedGiftAttributes() {
  try {
    console.log('🔧 Fixing failed gift collection attributes...\n');

    let fixedCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const attr of FAILED_ATTRIBUTES) {
      try {
        console.log(`🔄 Creating ${attr.type} attribute: ${attr.key}`);
        console.log(`   Collection: ${attr.collection}`);
        console.log(`   Description: ${attr.description}`);
        console.log(`   Required: ${attr.required}`);

        if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            attr.collection,
            attr.key,
            attr.required,
            undefined, // min
            undefined, // max  
            undefined, // no default value for required attributes
            false // array
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            attr.collection,
            attr.key,
            attr.required,
            undefined, // no default value for required attributes
            false // array
          );
        }

        console.log(`✅ Successfully created attribute: ${attr.key}\n`);
        fixedCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`ℹ️  Attribute ${attr.key} already exists, skipping\n`);
          skipCount++;
        } else {
          console.error(`❌ Failed to create attribute ${attr.key}:`, error.message || error);
          console.log('');
          errorCount++;
        }
      }
    }

    // Summary
    console.log('📊 Fix Summary:');
    console.log(`   ✅ Fixed: ${fixedCount} attributes`);
    console.log(`   ℹ️  Skipped: ${skipCount} attributes (already exist)`);
    console.log(`   ❌ Errors: ${errorCount} attributes`);
    console.log('');

    if (errorCount === 0) {
      console.log('🎉 All gift collection attributes are now complete!');
      console.log('');
      console.log('📝 Collections ready:');
      console.log('   ✅ gift_events - All required attributes created');
      console.log('   ✅ gift_contributions - All required attributes created');
      console.log('');
      console.log('🚀 You can now test gift functionality!');
    } else {
      console.log('⚠️  Some attributes still failed. Manual intervention may be needed.');
    }

  } catch (error) {
    console.error('❌ Fatal error fixing gift attributes:', error);
    throw error;
  }
}

// Run the script
fixFailedGiftAttributes()
  .then(() => {
    console.log('🏁 Fix script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix script failed:', error);
    process.exit(1);
  });