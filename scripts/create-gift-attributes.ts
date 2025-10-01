/**
 * Script to create all missing attributes for gift_events and gift_contributions collections
 * This uses the Appwrite server SDK which has full database management capabilities
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

interface AttributeConfig {
  key: string;
  type: 'string' | 'integer' | 'boolean';
  size?: number;
  required: boolean;
  description: string;
}

// Gift Events Collection Attributes
const GIFT_EVENTS_ATTRIBUTES: AttributeConfig[] = [
  {
    key: 'eventId',
    type: 'string',
    size: 50,
    required: true,
    description: 'Unique identifier for the gift event'
  },
  {
    key: 'creatorId',
    type: 'string',
    size: 50,
    required: true,
    description: 'ID of the user who created the gift event'
  },
  {
    key: 'recipientName',
    type: 'string',
    size: 100,
    required: true,
    description: 'Name of the gift recipient'
  },
  {
    key: 'recipientEmail',
    type: 'string',
    size: 100,
    required: false,
    description: 'Email of the gift recipient'
  },
  {
    key: 'eventType',
    type: 'string',
    size: 50,
    required: true,
    description: 'Type of event (birthday, anniversary, etc.)'
  },
  {
    key: 'eventDate',
    type: 'string',
    size: 30,
    required: true,
    description: 'Date of the event (ISO string)'
  },
  {
    key: 'title',
    type: 'string',
    size: 200,
    required: true,
    description: 'Title of the gift event'
  },
  {
    key: 'description',
    type: 'string',
    size: 1000,
    required: false,
    description: 'Description of the gift event'
  },
  {
    key: 'coverImage',
    type: 'string',
    size: 500,
    required: false,
    description: 'URL to the cover image'
  },
  {
    key: 'theme',
    type: 'string',
    size: 50,
    required: true,
    description: 'Visual theme for the gift event'
  },
  {
    key: 'status',
    type: 'string',
    size: 50,
    required: true,
    description: 'Current status of the gift event'
  },
  {
    key: 'privacy',
    type: 'string',
    size: 50,
    required: true,
    description: 'Privacy setting for the gift event'
  },
  {
    key: 'giftGoal',
    type: 'integer',
    required: true,
    description: 'Target amount for the gift (in kobo)'
  },
  {
    key: 'currentAmount',
    type: 'integer',
    required: true,
    description: 'Current amount raised (in kobo)'
  },
  {
    key: 'contributorsCount',
    type: 'integer',
    required: true,
    description: 'Number of contributors to the gift'
  },
  {
    key: 'playlistId',
    type: 'string',
    size: 100,
    required: false,
    description: 'Spotify playlist ID for the gift'
  },
  {
    key: 'digitalCard',
    type: 'string',
    size: 10000,
    required: false,
    description: 'JSON string containing digital card data'
  },
  {
    key: 'settings',
    type: 'string',
    size: 2000,
    required: false,
    description: 'JSON string containing gift event settings'
  },
  {
    key: 'expiresAt',
    type: 'string',
    size: 30,
    required: false,
    description: 'Expiration date for the gift event (ISO string)'
  }
];

// Gift Contributions Collection Attributes
const GIFT_CONTRIBUTIONS_ATTRIBUTES: AttributeConfig[] = [
  {
    key: 'contributionId',
    type: 'string',
    size: 50,
    required: true,
    description: 'Unique identifier for the contribution'
  },
  {
    key: 'eventId',
    type: 'string',
    size: 50,
    required: true,
    description: 'ID of the gift event this contribution belongs to'
  },
  {
    key: 'contributorId',
    type: 'string',
    size: 50,
    required: false,
    description: 'ID of the user making the contribution (if registered)'
  },
  {
    key: 'contributorName',
    type: 'string',
    size: 100,
    required: true,
    description: 'Name of the contributor'
  },
  {
    key: 'contributorEmail',
    type: 'string',
    size: 100,
    required: true,
    description: 'Email of the contributor'
  },
  {
    key: 'amount',
    type: 'integer',
    required: true,
    description: 'Contribution amount (in kobo)'
  },
  {
    key: 'message',
    type: 'string',
    size: 500,
    required: false,
    description: 'Message from the contributor'
  },
  {
    key: 'isAnonymous',
    type: 'boolean',
    required: true,
    description: 'Whether the contribution should be shown anonymously'
  },
  {
    key: 'paymentReference',
    type: 'string',
    size: 100,
    required: true,
    description: 'Paystack payment reference'
  },
  {
    key: 'paymentStatus',
    type: 'string',
    size: 50,
    required: true,
    description: 'Status of the payment'
  },
  {
    key: 'giftSelection',
    type: 'string',
    size: 2000,
    required: false,
    description: 'JSON string containing selected gift details'
  },
  {
    key: 'paidAt',
    type: 'string',
    size: 30,
    required: false,
    description: 'Timestamp when payment was completed (ISO string)'
  }
];

async function createGiftAttributes() {
  try {
    console.log('🎁 Creating missing attributes for gift collections...\n');

    // Process Gift Events Collection
    console.log('📊 Processing Gift Events Collection...\n');
    
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const attr of GIFT_EVENTS_ATTRIBUTES) {
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
            attr.required ? 0 : undefined, // default
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

    // Process Gift Contributions Collection
    console.log('💝 Processing Gift Contributions Collection...\n');

    for (const attr of GIFT_CONTRIBUTIONS_ATTRIBUTES) {
      try {
        console.log(`🔄 Creating ${attr.type} attribute: ${attr.key}`);
        console.log(`   Collection: gift_contributions`);
        console.log(`   Description: ${attr.description}`);
        console.log(`   Required: ${attr.required}`);
        if (attr.size) {
          console.log(`   Size: ${attr.size}`);
        }

        if (attr.type === 'string') {
          await databases.createStringAttribute(
            DATABASE_ID,
            GIFT_CONTRIBUTIONS_COLLECTION_ID,
            attr.key,
            attr.size || 255,
            attr.required,
            undefined, // default value
            false // array
          );
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(
            DATABASE_ID,
            GIFT_CONTRIBUTIONS_COLLECTION_ID,
            attr.key,
            attr.required,
            undefined, // min
            undefined, // max  
            attr.required ? 0 : undefined, // default
            false // array
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            GIFT_CONTRIBUTIONS_COLLECTION_ID,
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
      console.log('🎉 All gift collection attributes processed successfully!');
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Wait for Appwrite to fully process the attributes (30-60 seconds)');
      console.log('   2. Test gift event creation in your application');
      console.log('   3. Test gift contribution functionality');
    } else {
      console.log('⚠️  Some attributes failed to create. Check the errors above.');
    }

  } catch (error) {
    console.error('❌ Fatal error creating gift attributes:', error);
    throw error;
  }
}

// Run the script
createGiftAttributes()
  .then(() => {
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });