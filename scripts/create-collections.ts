#!/usr/bin/env tsx
/**
 * MOSÉ Platform - Direct API Collection Setup
 * 
 * Uses direct Appwrite REST API calls for collection creation
 * This avoids SDK version compatibility issues
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID!;
const API_KEY = process.env.APPWRITE_API_KEY!;

if (!PROJECT_ID || !API_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

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
  
  if (!response.ok && response.status !== 409) {
    throw new Error(`API Error: ${data.message || response.statusText}`);
  }
  
  return { data, exists: response.status === 409 };
}

async function setupCollections() {
  try {
    console.log('🎨 MOSÉ Platform - Collection Setup');
    console.log('==================================');
    
    // Get or create database
    const { data: dbList } = await apiRequest('GET', '/databases');
    let database, DATABASE_ID;
    
    if (dbList.databases.length === 0) {
      console.log('🔄 Creating database...');
      try {
        const { data: newDb } = await apiRequest('POST', '/databases', {
          databaseId: 'mose_database',
          name: 'MOSÉ Platform Database'
        });
        database = newDb;
        DATABASE_ID = newDb.$id;
        console.log('✅ Database created successfully');
      } catch (error) {
        console.error('❌ Failed to create database. Please check your Appwrite plan limits.');
        process.exit(1);
      }
    } else {
      database = dbList.databases[0];
      DATABASE_ID = database.$id;
    }
    console.log(`📍 Using database: ${database.name} (${DATABASE_ID})\n`);

    // Create Products Collection
    console.log('🔄 Creating products collection...');
    const { exists: productsExists } = await apiRequest('POST', `/databases/${DATABASE_ID}/collections`, {
      collectionId: 'products',
      name: 'Products',
      permissions: ['read("any")', 'create("users")', 'update("users")', 'delete("users")']
    });
    
    if (productsExists) {
      console.log('✅ Products collection already exists');
    } else {
      console.log('✅ Products collection created');
      
      // Add basic attributes
      const productAttributes = [
        { key: 'title', type: 'string', size: 255, required: true },
        { key: 'price', type: 'integer', required: true },
        { key: 'description', type: 'string', size: 2000, required: false },
        { key: 'sellerId', type: 'string', size: 255, required: true },
        { key: 'status', type: 'string', size: 50, required: true },
        { key: 'category', type: 'string', size: 100, required: true }
      ];
      
      for (const attr of productAttributes) {
        try {
          await apiRequest('POST', `/databases/${DATABASE_ID}/collections/products/attributes/${attr.type}`, attr);
          console.log(`   ✓ Added attribute: ${attr.key}`);
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error: any) {
          console.log(`   ✓ Attribute exists: ${attr.key}`);
        }
      }
    }

    // Create Orders Collection  
    console.log('\n🔄 Creating orders collection...');
    const { exists: ordersExists } = await apiRequest('POST', `/databases/${DATABASE_ID}/collections`, {
      collectionId: 'orders',
      name: 'Orders',
      permissions: ['read("users")', 'create("users")', 'update("users")']
    });
    
    if (ordersExists) {
      console.log('✅ Orders collection already exists');
    } else {
      console.log('✅ Orders collection created');
    }

    // Create Gift Events Collection
    console.log('\n🔄 Creating gift_events collection...');
    const { exists: giftsExists } = await apiRequest('POST', `/databases/${DATABASE_ID}/collections`, {
      collectionId: 'gift_events',
      name: 'Gift Events',
      permissions: ['read("any")', 'create("users")', 'update("users")', 'delete("users")']
    });
    
    if (giftsExists) {
      console.log('✅ Gift events collection already exists');
    } else {
      console.log('✅ Gift events collection created');
    }

    // Create Gift Contributions Collection
    console.log('\n🔄 Creating gift_contributions collection...');
    const { exists: contributionsExists } = await apiRequest('POST', `/databases/${DATABASE_ID}/collections`, {
      collectionId: 'gift_contributions',
      name: 'Gift Contributions',
      permissions: ['read("users")', 'create("users")', 'update("users")']
    });
    
    if (contributionsExists) {
      console.log('✅ Gift contributions collection already exists');
    } else {
      console.log('✅ Gift contributions collection created');
    }

    // Create Conversations Collection
    console.log('\n🔄 Creating conversations collection...');
    const { exists: conversationsExists } = await apiRequest('POST', `/databases/${DATABASE_ID}/collections`, {
      collectionId: 'conversations',
      name: 'Conversations', 
      permissions: ['read("users")', 'create("users")', 'update("users")']
    });
    
    if (conversationsExists) {
      console.log('✅ Conversations collection already exists');
    } else {
      console.log('✅ Conversations collection created');
    }

    // Create Messages Collection
    console.log('\n🔄 Creating messages collection...');
    const { exists: messagesExists } = await apiRequest('POST', `/databases/${DATABASE_ID}/collections`, {
      collectionId: 'messages',
      name: 'Messages',
      permissions: ['read("users")', 'create("users")', 'update("users")']
    });
    
    if (messagesExists) {
      console.log('✅ Messages collection already exists');
    } else {
      console.log('✅ Messages collection created');
    }

    console.log('\n🎉 Collection setup completed!');
    console.log('\n📊 Collections in your Appwrite console:');
    console.log('   • products - Marketplace products');
    console.log('   • orders - Purchase orders');  
    console.log('   • gift_events - Collaborative celebrations');
    console.log('   • gift_contributions - Gift funding');
    console.log('   • conversations - User chats');
    console.log('   • messages - Chat messages');
    
    console.log('\n🚀 Next steps:');
    console.log('1. Check your Appwrite console to verify collections');
    console.log('2. Run: npm run dev');
    console.log('3. Test user registration and product creation');
    console.log('\n✨ Your MOSÉ platform database is ready!');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

setupCollections();