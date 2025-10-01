#!/usr/bin/env tsx

/**
 * Storage Verification and Configuration Script for Mosé
 * This script helps diagnose and fix image upload issues
 */

import { Client, Storage, ID, Permission, Role } from 'appwrite';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const BUCKET_ID = 'product-images';
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';

// Initialize Appwrite client with server API key
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '');

// Set API key if available (for server-side operations)
if (process.env.APPWRITE_API_KEY) {
  try {
    (client as any).setKey(process.env.APPWRITE_API_KEY);
  } catch (error) {
    console.log('⚠️  Note: Running without API key - some operations may be limited');
  }
}

const storage = new Storage(client);

interface StorageBucketInfo {
  $id: string;
  name: string;
  enabled: boolean;
  maximumFileSize: number;
  allowedFileExtensions: string[];
  compression: string;
  encryption: boolean;
  antivirus: boolean;
  $permissions: string[];
}

async function checkEnvironmentVariables(): Promise<boolean> {
  console.log('🔧 Checking environment variables...\n');
  
  const requiredVars = [
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID', 
    'APPWRITE_API_KEY',
    'NEXT_PUBLIC_APPWRITE_ENDPOINT',
    'NEXT_PUBLIC_APPWRITE_PROJECT_ID'
  ];
  
  let allPresent = true;
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value) {
      console.log(`❌ Missing: ${varName}`);
      allPresent = false;
    } else {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    }
  }
  
  console.log('');
  return allPresent;
}

async function checkStorageBucket(): Promise<StorageBucketInfo | null> {
  console.log(`🪣 Checking storage bucket "${BUCKET_ID}"...\n`);
  
  try {
    const bucket = await storage.getBucket(BUCKET_ID) as any;
    
    console.log(`✅ Bucket found: ${bucket.name}`);
    console.log(`📏 Max file size: ${Math.round(bucket.maximumFileSize / 1024 / 1024)}MB`);
    console.log(`📎 Allowed extensions: ${bucket.allowedFileExtensions.join(', ') || 'All'}`);
    console.log(`🔒 Enabled: ${bucket.enabled ? 'Yes' : 'No'}`);
    console.log(`🛡️ Permissions: ${bucket.$permissions.length} rules`);
    
    // Check permissions
    console.log('\n🔐 Permission analysis:');
    const hasCreatePermission = bucket.$permissions.some((p: string) => 
      p.includes('create') && (p.includes('users') || p.includes('any'))
    );
    const hasReadPermission = bucket.$permissions.some((p: string) => 
      p.includes('read') && (p.includes('users') || p.includes('any'))
    );
    
    console.log(`📝 Create access: ${hasCreatePermission ? '✅ Yes' : '❌ No'}`);
    console.log(`👁️  Read access: ${hasReadPermission ? '✅ Yes' : '❌ No'}`);
    
    if (!hasCreatePermission) {
      console.log('\n⚠️  WARNING: Users cannot create files in this bucket!');
      console.log('   This is likely why image uploads are failing.');
    }
    
    if (!hasReadPermission) {
      console.log('\n⚠️  WARNING: Images cannot be viewed publicly!');
    }
    
    console.log('\nCurrent permissions:');
    bucket.$permissions.forEach((permission: string, index: number) => {
      console.log(`   ${index + 1}. ${permission}`);
    });
    
    console.log('');
    return bucket;
    
  } catch (error: any) {
    if (error.code === 404) {
      console.log(`❌ Bucket "${BUCKET_ID}" not found!`);
      console.log('   You need to create this bucket in your Appwrite console.\n');
    } else {
      console.log(`❌ Error checking bucket: ${error.message}\n`);
    }
    return null;
  }
}

async function testFileUpload(): Promise<boolean> {
  console.log('🧪 Testing file upload to bucket...\n');
  
  try {
    // Create a small test image (1x1 PNG in base64)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // Convert to blob
    const response = await fetch(testImageBase64);
    const blob = await response.blob();
    
    // Upload test file
    const file = await storage.createFile(
      BUCKET_ID,
      ID.unique(),
      new File([blob], 'test-upload.png', { type: 'image/png' })
    );
    
    console.log(`✅ Test upload successful!`);
    console.log(`   File ID: ${file.$id}`);
    console.log(`   Size: ${file.sizeOriginal} bytes`);
    
    // Try to get the file URL
    const fileUrl = storage.getFileView(BUCKET_ID, file.$id);
    console.log(`   View URL: ${fileUrl}`);
    
    // Clean up test file
    try {
      await storage.deleteFile(BUCKET_ID, file.$id);
      console.log(`🗑️  Test file cleaned up`);
    } catch (cleanupError) {
      console.log(`⚠️  Could not clean up test file: ${file.$id}`);
    }
    
    console.log('');
    return true;
    
  } catch (error: any) {
    console.log(`❌ Test upload failed: ${error.message}`);
    
    if (error.code === 401) {
      console.log('   → This is likely a permissions issue');
      console.log('   → Make sure the bucket allows "create" for "users" or "any"');
    } else if (error.code === 404) {
      console.log('   → Bucket not found');
    } else if (error.code === 413) {
      console.log('   → File too large for bucket settings');
    }
    
    console.log('');
    return false;
  }
}

async function generateFixInstructions(bucket: StorageBucketInfo | null): Promise<void> {
  console.log('📋 INSTRUCTIONS TO FIX IMAGE UPLOAD ISSUES:\n');
  
  if (!bucket) {
    console.log('1. CREATE THE STORAGE BUCKET:');
    console.log('   • Go to your Appwrite Console');
    console.log('   • Navigate to Storage');
    console.log('   • Click "Create Bucket"');
    console.log(`   • Name: product-images`);
    console.log(`   • Bucket ID: ${BUCKET_ID}`);
    console.log('   • Max file size: 5MB (5242880 bytes)');
    console.log('   • Allowed extensions: jpg, jpeg, png, webp, gif');
    console.log('');
  }
  
  console.log('2. CONFIGURE BUCKET PERMISSIONS:');
  console.log('   Required permissions for image uploads to work:');
  console.log('   ');
  console.log('   CREATE PERMISSIONS:');
  console.log('   • create("users")  - Allow authenticated users to upload');
  console.log('   OR');
  console.log('   • create("any")    - Allow anyone to upload (less secure)');
  console.log('   ');
  console.log('   READ PERMISSIONS:');
  console.log('   • read("any")      - Allow anyone to view images');
  console.log('   ');
  console.log('   To add these permissions:');
  console.log('   • Go to Storage → product-images bucket');
  console.log('   • Click on "Settings" tab');
  console.log('   • Under "Permissions", click "Add Permission"');
  console.log('   • Add the permissions listed above');
  console.log('');
  
  console.log('3. VERIFY ENVIRONMENT VARIABLES:');
  console.log('   Make sure your .env.local file contains:');
  console.log('   • NEXT_PUBLIC_APPWRITE_ENDPOINT');
  console.log('   • NEXT_PUBLIC_APPWRITE_PROJECT_ID');
  console.log('   • APPWRITE_API_KEY (for server operations)');
  console.log('');
  
  console.log('4. TEST THE FIX:');
  console.log('   • Restart your development server');
  console.log('   • Try creating a product with images');
  console.log('   • Check browser console for detailed error messages');
  console.log('   • Run this script again to verify the fix');
  console.log('');
  
  console.log('💡 Common Issues:');
  console.log('   • Bucket permissions missing → Images upload fails silently');
  console.log('   • Wrong bucket name → 404 errors in console');
  console.log('   • File size limits → Large images rejected');
  console.log('   • CORS issues → Check browser console for errors');
  console.log('');
}

async function main() {
  console.log('🚀 Mosé Storage Verification Tool\n');
  console.log('='.repeat(50));
  console.log('');
  
  // Check environment variables
  const envOk = await checkEnvironmentVariables();
  if (!envOk) {
    console.log('❌ Please fix environment variables first!\n');
    process.exit(1);
  }
  
  // Check storage bucket
  const bucket = await checkStorageBucket();
  
  // Test upload if bucket exists
  let uploadWorking = false;
  if (bucket) {
    uploadWorking = await testFileUpload();
  }
  
  // Generate instructions
  await generateFixInstructions(bucket);
  
  // Summary
  console.log('📊 SUMMARY:');
  console.log(`   Environment variables: ${envOk ? '✅' : '❌'}`);
  console.log(`   Storage bucket exists: ${bucket ? '✅' : '❌'}`);
  console.log(`   Upload test: ${uploadWorking ? '✅' : '❌'}`);
  console.log('');
  
  if (envOk && bucket && uploadWorking) {
    console.log('🎉 Everything looks good! Image uploads should work.');
  } else {
    console.log('🔧 Please follow the instructions above to fix the issues.');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});