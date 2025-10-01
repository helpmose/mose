/**
 * Script to fix the isRead boolean attribute and missing indexes
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

async function fixNotificationsCollection() {
  try {
    console.log('🔧 Fixing notifications collection...\n');

    // Create isRead boolean attribute without default value
    try {
      console.log('🔄 Creating isRead boolean attribute...');
      await databases.createBooleanAttribute(
        DATABASE_ID,
        NOTIFICATIONS_COLLECTION_ID,
        'isRead',
        true, // required
        undefined, // no default value for required attributes
        false // not array
      );
      console.log('✅ Successfully created isRead attribute\n');
    } catch (error: any) {
      if (error.message && error.message.includes('already exists')) {
        console.log('ℹ️  isRead attribute already exists\n');
      } else {
        console.error('❌ Failed to create isRead attribute:', error.message);
        throw error;
      }
    }

    // Wait for attribute to be processed
    console.log('⏳ Waiting for Appwrite to process the attribute...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create missing indexes
    console.log('📊 Creating missing indexes...');
    
    const missingIndexes = [
      { key: 'isRead_index', type: 'key', attributes: ['isRead'] },
      { key: 'userId_isRead_index', type: 'key', attributes: ['userId', 'isRead'] }
    ];

    for (const index of missingIndexes) {
      try {
        await databases.createIndex(
          DATABASE_ID,
          NOTIFICATIONS_COLLECTION_ID,
          index.key,
          index.type as any,
          index.attributes
        );
        console.log(`✅ Created index: ${index.key}`);
        
        // Small delay between index creations
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`ℹ️  Index ${index.key} already exists`);
        } else {
          console.warn(`⚠️ Failed to create index ${index.key}:`, error.message);
        }
      }
    }

    console.log('\n🎉 Notifications collection is now complete!');
    console.log('');
    console.log('📊 Collection Summary:');
    console.log('   • userId (string, 50, required)');
    console.log('   • type (string, 50, required)');
    console.log('   • title (string, 200, required)');
    console.log('   • message (string, 1000, required)');
    console.log('   • data (string, 2000, optional)');
    console.log('   • isRead (boolean, required)');
    console.log('   • createdAt (string, 30, required)');
    console.log('   • updatedAt (string, 30, required)');
    console.log('');
    console.log('📊 Indexes:');
    console.log('   • userId_index');
    console.log('   • type_index');
    console.log('   • createdAt_index');
    console.log('   • isRead_index');
    console.log('   • userId_isRead_index');
    console.log('');
    console.log('🚀 Ready for notification testing!');

  } catch (error) {
    console.error('❌ Fatal error fixing notifications collection:', error);
    throw error;
  }
}

// Run the script
fixNotificationsCollection()
  .then(() => {
    console.log('🏁 Fix script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fix script failed:', error);
    process.exit(1);
  });