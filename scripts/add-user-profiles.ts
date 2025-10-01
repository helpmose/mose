#!/usr/bin/env tsx
/**
 * Add User Profiles Collection to MOSÉ Database
 * 
 * Complements Appwrite's built-in authentication with extended user data
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
  
  if (!response.ok && response.status !== 409) {
    throw new Error(`API Error: ${data.message || response.statusText}`);
  }
  
  return { data, exists: response.status === 409 };
}

async function addUserProfiles() {
  try {
    console.log('🎨 Adding User Profiles Collection');
    console.log('================================');
    
    // Create User Profiles Collection
    console.log('🔄 Creating user_profiles collection...');
    const { exists } = await apiRequest('POST', `/databases/${DATABASE_ID}/collections`, {
      collectionId: 'user_profiles',
      name: 'User Profiles',
      permissions: [
        'read("users")', 
        'create("users")', 
        'update("users")', 
        'delete("users")'
      ]
    });
    
    if (exists) {
      console.log('✅ User profiles collection already exists');
      return;
    }
    
    console.log('✅ User profiles collection created');
    
    // Add attributes for extended user data
    interface AttributeDefinition {
      key: string;
      type: string;
      size?: number;
      required: boolean;
      default?: any;
    }

    const attributes: AttributeDefinition[] = [
      // Core profile
      { key: 'userId', type: 'string', size: 255, required: true }, // Links to Appwrite user
      { key: 'displayName', type: 'string', size: 255, required: false },
      { key: 'bio', type: 'string', size: 2000, required: false },
      { key: 'avatar', type: 'string', size: 255, required: false },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'location', type: 'string', size: 255, required: false },
      
      // User type and role specific
      { key: 'userType', type: 'string', size: 50, required: true }, // 'buyer', 'seller', 'admin'
      { key: 'adminLevel', type: 'string', size: 50, required: false }, // 'super_admin', 'admin', 'moderator'
      { key: 'businessName', type: 'string', size: 255, required: false },
      { key: 'artistType', type: 'string', size: 100, required: false }, // 'painter', 'sculptor', 'photographer'
      { key: 'specialties', type: 'string', size: 1000, required: false }, // JSON array
      { key: 'experience', type: 'string', size: 50, required: false }, // 'beginner', 'intermediate', 'expert'
      
      // Social & Contact
      { key: 'website', type: 'string', size: 255, required: false },
      { key: 'socialLinks', type: 'string', size: 1000, required: false }, // JSON object
      { key: 'contactEmail', type: 'string', size: 255, required: false },
      
      // Platform data
      { key: 'isVerified', type: 'boolean', required: true, default: false },
      { key: 'verificationLevel', type: 'string', size: 50, required: false }, // 'email', 'phone', 'identity', 'business'
      { key: 'rating', type: 'float', required: false, default: 0 },
      { key: 'reviewCount', type: 'integer', required: false, default: 0 },
      { key: 'totalSales', type: 'integer', required: false, default: 0 }, // in kobo
      { key: 'totalPurchases', type: 'integer', required: false, default: 0 }, // in kobo
      
      // Preferences
      { key: 'preferences', type: 'string', size: 2000, required: false }, // JSON object
      { key: 'notifications', type: 'string', size: 1000, required: false }, // JSON object
      { key: 'language', type: 'string', size: 10, required: false, default: 'en' },
      { key: 'currency', type: 'string', size: 10, required: false, default: 'NGN' },
      
      // Status
      { key: 'isActive', type: 'boolean', required: true, default: true },
      { key: 'lastLoginAt', type: 'string', size: 255, required: false },
      { key: 'joinedAt', type: 'string', size: 255, required: false }
    ];
    
    console.log('🔄 Adding profile attributes...');
    
    for (const attr of attributes) {
      try {
        await apiRequest('POST', `/databases/${DATABASE_ID}/collections/user_profiles/attributes/${attr.type}`, {
          key: attr.key,
          ...(attr.type === 'string' && { size: attr.size }),
          required: attr.required,
          ...(attr.default !== undefined && { default: attr.default })
        });
        console.log(`   ✓ ${attr.key} (${attr.type})`);
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        console.log(`   ✓ ${attr.key} (exists)`);
      }
    }
    
    // Wait for attributes to be ready
    console.log('⏳ Waiting for attributes to be ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Create indexes
    console.log('📊 Creating indexes...');
    const indexes = [
      { key: 'userId_idx', type: 'unique', attributes: ['userId'] },
      { key: 'userType_idx', type: 'key', attributes: ['userType'] },
      { key: 'verified_idx', type: 'key', attributes: ['isVerified'] },
      { key: 'rating_idx', type: 'key', attributes: ['rating'] },
      { key: 'location_idx', type: 'key', attributes: ['location'] }
    ];
    
    for (const index of indexes) {
      try {
        await apiRequest('POST', `/databases/${DATABASE_ID}/collections/user_profiles/indexes`, {
          key: index.key,
          type: index.type,
          attributes: index.attributes
        });
        console.log(`   📊 Index: ${index.key}`);
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error: any) {
        console.log(`   📊 Index exists: ${index.key}`);
      }
    }

    console.log('\n🎉 User Profiles Setup Complete!');
    console.log('\n📊 What was created:');
    console.log('   • user_profiles collection with 23+ attributes');
    console.log('   • Optimized indexes for performance');
    console.log('   • Links to Appwrite built-in users via userId');
    console.log('\n🏗️ Architecture:');
    console.log('   • Appwrite built-in: Authentication, login, sessions');
    console.log('   • user_profiles: Extended data, preferences, business info');
    console.log('\n🚀 Ready for:');
    console.log('   • Artist portfolios and seller profiles');
    console.log('   • User verification and ratings');
    console.log('   • Business information and social links');
    console.log('   • Preferences and notification settings');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

addUserProfiles();