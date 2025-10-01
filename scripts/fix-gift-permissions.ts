/**
 * Script to fix gift collection permissions to allow public read access
 */

import { Client, Databases, Permission, Role } from 'node-appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
const GIFT_EVENTS_COLLECTION_ID = 'gift_events';
const GIFT_CONTRIBUTIONS_COLLECTION_ID = 'gift_contributions';

// Initialize Appwrite client with server SDK
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '686009220034820fd017')
  .setKey(process.env.APPWRITE_API_KEY || 'standard_61249273df2368d81f0f0d83e5b7141960d45f12489a4c2d0bf3d9e96bacaee94bb647fb590c07e10d241726c5c7a22e6073d8840037ab0aebb60dc1cf599c0559178dca40d8339aea4328b8d232cf923dd0f35469ae5f2529c1d509d40dd15a1742af8cc4d0ddf7af75383795e2dbc0a3ce1387d4504244393c14c42f38a020');

const databases = new Databases(client);

async function fixGiftPermissions() {
  try {
    console.log('🔓 Fixing gift collection permissions...\n');

    // Fix gift_events collection permissions
    console.log('📊 Updating gift_events collection permissions...');

    const giftEventsPermissions = [
      Permission.read(Role.any()),           // Anyone can read gift events
      Permission.create(Role.users()),       // Only logged-in users can create
      Permission.update(Role.users()),       // Only logged-in users can update their own
      Permission.delete(Role.users())        // Only logged-in users can delete their own
    ];

    await databases.updateCollection(
      DATABASE_ID,
      GIFT_EVENTS_COLLECTION_ID,
      GIFT_EVENTS_COLLECTION_ID,
      giftEventsPermissions
    );

    console.log('✅ Gift events collection permissions updated');

    // Fix gift_contributions collection permissions
    console.log('💝 Updating gift_contributions collection permissions...');

    const giftContributionsPermissions = [
      Permission.read(Role.any()),           // Anyone can read contributions
      Permission.create(Role.any()),         // Anyone can create contributions (for guests)
      Permission.update(Role.users()),       // Only logged-in users can update
      Permission.delete(Role.users())        // Only logged-in users can delete
    ];

    await databases.updateCollection(
      DATABASE_ID,
      GIFT_CONTRIBUTIONS_COLLECTION_ID,
      GIFT_CONTRIBUTIONS_COLLECTION_ID,
      giftContributionsPermissions
    );

    console.log('✅ Gift contributions collection permissions updated');

    console.log('\n🎉 All gift collection permissions fixed!');
    console.log('');
    console.log('📋 Current permissions:');
    console.log('   📊 gift_events: Public read, authenticated create/update/delete');
    console.log('   💝 gift_contributions: Public read/create, authenticated update/delete');
    console.log('');
    console.log('✨ Gift events are now publicly accessible!');

  } catch (error) {
    console.error('❌ Error fixing permissions:', error);
    throw error;
  }
}

// Run the script
fixGiftPermissions()
  .then(() => {
    console.log('🏁 Permissions fixed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Failed to fix permissions:', error);
    process.exit(1);
  });