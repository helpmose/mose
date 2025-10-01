/**
 * Script to update existing orders with proper orderId values
 * Run AFTER adding the orderId attribute to the collection
 * Run with: npx tsx scripts/update-existing-orders.ts
 */

import { databases } from '../lib/appwrite';
import { Query } from 'appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
const COLLECTION_ID = 'orders';

async function updateExistingOrders() {
  try {
    console.log('🔄 Fetching existing orders without proper orderId...');

    // Get all orders
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [Query.limit(100)]
    );

    console.log(`📦 Found ${response.documents.length} orders to check`);

    for (const order of response.documents) {
      try {
        // Generate orderId if it doesn't exist properly
        const orderId = `MOSE-${order.$id.slice(-8).toUpperCase()}`;
        
        console.log(`🔄 Updating order ${order.$id} with orderId: ${orderId}`);

        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID,
          order.$id,
          { orderId }
        );

        console.log(`✅ Updated order ${order.$id}`);
        
      } catch (updateError) {
        console.error(`❌ Failed to update order ${order.$id}:`, updateError);
      }
    }

    console.log('✅ All orders updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating orders:', error);
    throw error;
  }
}

// Run the script
updateExistingOrders()
  .then(() => {
    console.log('🎉 Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });