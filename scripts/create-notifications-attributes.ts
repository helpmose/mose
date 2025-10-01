/**
 * Script to create notifications collection with all required attributes
 * This uses the Appwrite server SDK which has full database management capabilities
 */

import { Client, Databases } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
const NOTIFICATIONS_COLLECTION_ID = 'notifications';

// Initialize Appwrite client with server SDK
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '686009220034820fd017')
  .setKey(process.env.APPWRITE_API_KEY || 'standard_61249273df2368d81f0f0d83e5b7141960d45f12489a4c2d0bf3d9e96bacaee94bb647fb590c07e10d241726c5c7a22e6073d8840037ab0aebb60dc1cf599c0559178dca40d8339aea4328b8d232cf923dd0f35469ae5f2529c1d509d40dd15a1742af8cc4d0ddf7af75383795e2dbc0a3ce1387d4504244393c14c42f38a020');

const databases = new Databases(client);

interface AttributeConfig {
  key: string;
  type: 'string' | 'boolean';
  size?: number;
  required: boolean;
  description: string;
}

// Define all notification attributes
const NOTIFICATION_ATTRIBUTES: AttributeConfig[] = [
  {
    key: 'userId',
    type: 'string',
    size: 50,
    required: true,
    description: 'ID of the user receiving the notification'
  },
  {
    key: 'type',
    type: 'string', 
    size: 50,
    required: true,
    description: 'Type of notification (approval|rejection|suspension|order|product|system|message)'
  },
  {
    key: 'title',
    type: 'string',
    size: 200,
    required: true,
    description: 'Notification title/headline'
  },
  {
    key: 'message',
    type: 'string',
    size: 1000,
    required: true,
    description: 'Notification message content'
  },
  {
    key: 'data',
    type: 'string',
    size: 2000,
    required: false,
    description: 'JSON string containing additional data (actionUrl, metadata, etc.)'
  },
  {
    key: 'isRead',
    type: 'boolean',
    required: true,
    description: 'Whether the notification has been read'
  },
  {
    key: 'createdAt',
    type: 'string',
    size: 30,
    required: true,
    description: 'ISO timestamp when notification was created'
  },
  {
    key: 'updatedAt',
    type: 'string',
    size: 30,
    required: true,
    description: 'ISO timestamp when notification was last updated'
  }
];

async function createNotificationsCollection() {
  try {
    console.log('🔔 Setting up notifications collection...\n');

    // Check if collection already exists
    try {
      const existingCollection = await databases.getCollection(DATABASE_ID, NOTIFICATIONS_COLLECTION_ID);
      console.log(`📋 Collection '${NOTIFICATIONS_COLLECTION_ID}' already exists`);
      console.log(`📊 Current attributes: ${existingCollection.attributes.map((attr: any) => attr.key).join(', ')}`);
      console.log('');
    } catch (error: any) {
      if (error.code === 404) {
        console.log(`📋 Collection '${NOTIFICATIONS_COLLECTION_ID}' not found, creating...`);
        
        // Create the collection
        try {
          await databases.createCollection(
            DATABASE_ID,
            NOTIFICATIONS_COLLECTION_ID,
            'notifications',
            undefined, // permissions - will use default
            false // documentSecurity - use collection-level permissions
          );
          console.log(`✅ Created collection: ${NOTIFICATIONS_COLLECTION_ID}`);
        } catch (createError) {
          console.error('❌ Failed to create collection:', createError);
          return;
        }
      } else {
        console.error('❌ Error checking collection:', error);
        return;
      }
    }

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Create each notification attribute
    for (const attr of NOTIFICATION_ATTRIBUTES) {
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
            NOTIFICATIONS_COLLECTION_ID,
            attr.key,
            attr.size || 255,
            attr.required,
            undefined, // default value
            false // array
          );
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(
            DATABASE_ID,
            NOTIFICATIONS_COLLECTION_ID,
            attr.key,
            attr.required,
            false, // default value for isRead
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

    // Create indexes for better query performance
    console.log('📊 Creating database indexes...');
    
    const indexes = [
      { key: 'userId_index', type: 'key', attributes: ['userId'] },
      { key: 'isRead_index', type: 'key', attributes: ['isRead'] },
      { key: 'type_index', type: 'key', attributes: ['type'] },
      { key: 'createdAt_index', type: 'key', attributes: ['createdAt'] },
      { key: 'userId_isRead_index', type: 'key', attributes: ['userId', 'isRead'] }
    ];

    for (const index of indexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          NOTIFICATIONS_COLLECTION_ID,
          index.key,
          index.type as any,
          index.attributes
        );
        console.log(`✅ Created index: ${index.key}`);
      } catch (error: any) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`ℹ️  Index ${index.key} already exists`);
        } else {
          console.warn(`⚠️ Failed to create index ${index.key}:`, error.message);
        }
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${createdCount} attributes`);
    console.log(`   ℹ️  Skipped: ${skippedCount} attributes (already exist)`);
    console.log(`   ❌ Errors: ${errorCount} attributes`);
    console.log('');

    if (errorCount === 0) {
      console.log('🎉 Notifications collection is ready!');
      console.log('');
      console.log('📝 Collection Details:');
      console.log(`   • Collection ID: ${NOTIFICATIONS_COLLECTION_ID}`);
      console.log(`   • Database: ${DATABASE_ID}`);
      console.log(`   • Attributes: ${NOTIFICATION_ATTRIBUTES.length}`);
      console.log(`   • Indexes: ${indexes.length}`);
      console.log('');
      console.log('🚀 You can now:');
      console.log('   1. Create notifications via NotificationService');
      console.log('   2. View notifications in the notification center');
      console.log('   3. Test real-time notification updates');
    } else {
      console.log('⚠️  Some attributes failed to create. Check the errors above.');
    }

  } catch (error) {
    console.error('❌ Fatal error setting up notifications collection:', error);
    throw error;
  }
}

// Run the script
createNotificationsCollection()
  .then(() => {
    console.log('🏁 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });