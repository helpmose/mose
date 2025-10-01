import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

import { databases, account } from '@/lib/appwrite';
import { ID } from 'appwrite';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';
const COLLECTION_ID = 'user_profiles';

async function fixMissingUserProfile() {
  try {
    console.log('🔄 Starting fix for missing user profile...');

    // Get current user
    const currentUser = await account.get();
    console.log('📋 Current user:', currentUser.email, '(ID:', currentUser.$id, ')');

    // Check if profile already exists
    const existingProfile = await databases.listDocuments(
      DATABASE_ID,
      COLLECTION_ID,
      [
        { method: 'equal', attribute: 'userId', values: [currentUser.$id] }
      ]
    );

    if (existingProfile.documents.length > 0) {
      console.log('✅ User profile already exists');
      return;
    }

    console.log('🔄 Creating missing user profile...');

    // Create user profile with default buyer role
    const profileDocument = {
      userId: currentUser.$id,
      displayName: currentUser.name || '',
      bio: '',
      phone: '',
      location: '',
      userType: 'buyer', // Default to buyer
      businessName: '',
      artistType: '',
      specialties: JSON.stringify([]),
      website: '',
      socialLinks: JSON.stringify({}),
      contactEmail: '',
      isVerified: true, // Buyers are auto-verified
      verificationLevel: 'email',
      rating: 0,
      reviewCount: 0,
      totalSales: 0,
      totalPurchases: 0,
      preferences: JSON.stringify({
        theme: 'light',
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false
      }),
      notifications: JSON.stringify({
        newMessages: true,
        orderUpdates: true,
        giftInvitations: true,
        promotions: false
      }),
      language: 'en',
      currency: 'NGN',
      isActive: true,
      lastLoginAt: new Date().toISOString(),
      joinedAt: new Date().toISOString()
    };

    const profile = await databases.createDocument(
      DATABASE_ID,
      COLLECTION_ID,
      ID.unique(),
      profileDocument
    );

    console.log('✅ User profile created successfully:', profile.$id);
    console.log('📧 Email:', currentUser.email);
    console.log('👤 User type: buyer');
    console.log('✅ Profile ID:', profile.$id);

  } catch (error) {
    console.error('❌ Error fixing user profile:', error);
    throw error;
  }
}

// Run the fix
fixMissingUserProfile()
  .then(() => {
    console.log('🎉 User profile fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 User profile fix failed:', error);
    process.exit(1);
  });