import { Client, Storage, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = new Client();
const storage = new Storage(client);

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

async function setupStorage() {
  try {
    console.log('🔄 Setting up Appwrite Storage for product images...');

    // Create product images bucket
    try {
      const bucket = await storage.createBucket(
        'product-images', // bucketId
        'Product Images', // name
        [
          Permission.read(Role.any()), // Anyone can read images
          Permission.create(Role.users()), // Any authenticated user can upload
          Permission.update(Role.users()), // Any authenticated user can update
          Permission.delete(Role.users()) // Any authenticated user can delete
        ],
        false, // fileSecurity - false means bucket-level permissions
        true,  // enabled
        undefined, // maximumFileSize - use default
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], // allowedFileExtensions
        'gzip', // compression
        false, // encryption
        false  // antivirus
      );
      
      console.log('✅ Created product images bucket:', bucket.$id);
      
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('⚠️  Product images bucket already exists, skipping...');
      } else {
        console.error('❌ Failed to create product images bucket:', error.message);
      }
    }

    // Create user avatars bucket
    try {
      const avatarBucket = await storage.createBucket(
        'user-avatars', // bucketId
        'User Avatars', // name
        [
          Permission.read(Role.any()), // Anyone can read avatars
          Permission.create(Role.users()), // Any authenticated user can upload
          Permission.update(Role.users()), // Any authenticated user can update
          Permission.delete(Role.users()) // Any authenticated user can delete
        ],
        false, // fileSecurity
        true,  // enabled
        5 * 1024 * 1024, // maximumFileSize - 5MB
        ['image/jpeg', 'image/png', 'image/webp'], // allowedFileExtensions
        'gzip', // compression
        false, // encryption
        false  // antivirus
      );
      
      console.log('✅ Created user avatars bucket:', avatarBucket.$id);
      
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('⚠️  User avatars bucket already exists, skipping...');
      } else {
        console.error('❌ Failed to create user avatars bucket:', error.message);
      }
    }

    console.log('✅ Storage setup completed!');
    
  } catch (error) {
    console.error('❌ Error setting up storage:', error);
  }
}

// Run the setup
setupStorage();