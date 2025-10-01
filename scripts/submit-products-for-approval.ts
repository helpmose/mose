#!/usr/bin/env tsx
/**
 * Submit Draft Products for Approval
 * Updates existing draft products to pending_approval status
 */

import { config } from 'dotenv';

config({ path: '.env.local' });

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;
const DATABASE_ID = 'mose_database';

const headers = {
  'X-Appwrite-Response-Format': '1.4.0',
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
  'Content-Type': 'application/json'
};

async function apiRequest(method: string, path: string, body?: any) {
  const response = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`API Error: ${data.message || response.statusText}`);
  }
  
  return data;
}

async function submitProductsForApproval() {
  try {
    console.log('🔄 Submitting draft products for approval...');
    console.log('================================================');
    
    // Get all draft products
    const response = await apiRequest('GET', `/databases/${DATABASE_ID}/collections/products/documents`);
    const draftProducts = response.documents.filter((doc: any) => doc.status === 'draft');
    
    console.log(`Found ${draftProducts.length} draft products to submit for approval`);
    
    if (draftProducts.length === 0) {
      console.log('✅ No draft products found - nothing to submit');
      return;
    }
    
    // Update each product status to 'pending_approval'
    for (const product of draftProducts) {
      try {
        await apiRequest('PATCH', `/databases/${DATABASE_ID}/collections/products/documents/${product.$id}`, {
          data: {
            status: 'pending_approval'
          }
        });
        
        console.log(`✅ Submitted for approval: ${product.title || product.$id}`);
      } catch (error: any) {
        console.error(`❌ Failed to submit product ${product.$id}:`, error.message);
      }
    }
    
    console.log('\n🎉 Product submission complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   • ${draftProducts.length} products submitted for approval`);
    console.log(`   • Products are now awaiting admin approval`);
    console.log(`   • Admin can approve them from the admin dashboard`);

  } catch (error) {
    console.error('\n❌ Submission failed:', error);
    process.exit(1);
  }
}

submitProductsForApproval();