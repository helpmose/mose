/**
 * Script to add orderId attribute to orders collection
 * Run with: npx tsx scripts/add-orderid-attribute.ts
 */

import { databases } from '../lib/appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
const COLLECTION_ID = 'orders';

async function addOrderIdAttribute() {
  try {
    console.log('🔄 Adding orderId attribute to orders collection...');

    // Add the orderId attribute
    await databases.createStringAttribute(
      DATABASE_ID,
      COLLECTION_ID,
      'orderId',
      50,      // size
      true,    // required
      undefined, // default value
      false    // array
    );

    console.log('✅ orderId attribute added successfully!');
    console.log('📝 Attribute details:');
    console.log('   - Key: orderId');
    console.log('   - Type: String');
    console.log('   - Size: 50');
    console.log('   - Required: Yes');
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️ orderId attribute already exists in the collection');
    } else {
      console.error('❌ Error adding orderId attribute:', error);
      throw error;
    }
  }
}

// Run the script
addOrderIdAttribute()
  .then(() => {
    console.log('🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });