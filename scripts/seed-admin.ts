#!/usr/bin/env tsx
/**
 * MOSÉ Platform - Admin User Seeding Script
 * 
 * Creates the initial admin user for the platform.
 * This should be run once after setting up the database collections.
 * 
 * Usage:
 *   npm run seed:admin
 */

import { config } from 'dotenv';
import { UserService } from '../lib/services/user';

// Load environment variables
config({ path: '.env.local' });

// Admin credentials - In production, these should be from environment variables
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mose.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123456';
const ADMIN_NAME = process.env.ADMIN_NAME || 'MOSÉ Administrator';

console.log('🎨 MOSÉ Platform - Admin Seeding');
console.log('================================');
console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);
console.log(`👤 Admin Name: ${ADMIN_NAME}`);
console.log('');

async function seedAdmin() {
  try {
    console.log('🔍 Checking for existing admin users...');
    
    // Check if any admin users already exist
    const existingAdmins = await UserService.searchProfiles('', 'admin', '', undefined, 10, 0);
    
    if (existingAdmins.profiles.length > 0) {
      console.log(`✅ Admin users already exist (${existingAdmins.profiles.length} found)`);
      console.log('📋 Existing admin users:');
      existingAdmins.profiles.forEach(admin => {
        console.log(`   • ${admin.displayName || 'Unknown'} (${admin.userId})`);
        console.log(`     Admin Level: ${admin.adminLevel || 'admin'}`);
        console.log(`     Verified: ${admin.isVerified ? '✅' : '❌'}`);
        console.log(`     Active: ${admin.isActive ? '✅' : '❌'}`);
      });
      console.log('\n✨ No seeding needed. Admin users already exist.');
      return;
    }
    
    console.log('🔄 No admin users found. Creating initial admin...');
    
    // Step 1: Create Appwrite account
    console.log('👤 Creating admin account...');
    let authUser;
    try {
      authUser = await UserService.register(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME);
      console.log('✅ Admin account created successfully');
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('email already registered')) {
        console.log('ℹ️ Admin email already registered, attempting to get existing user...');
        // Try to login to get the existing user
        try {
          authUser = await UserService.login(ADMIN_EMAIL, ADMIN_PASSWORD);
          console.log('✅ Found existing admin account');
        } catch (loginError) {
          console.error('❌ Failed to login with existing admin email. Please check credentials.');
          console.error('   You may need to manually create the admin user or use different credentials.');
          process.exit(1);
        }
      } else {
        console.error('❌ Failed to create admin account:', error.message);
        process.exit(1);
      }
    }
    
    // Step 2: Check if profile already exists
    console.log('🔍 Checking for existing admin profile...');
    let adminProfile = await UserService.getProfileByUserId(authUser.$id);
    
    if (adminProfile) {
      if (adminProfile.userType === 'admin') {
        console.log('✅ Admin profile already exists and is properly configured');
        console.log(`   Profile ID: ${adminProfile.$id}`);
        console.log(`   User Type: ${adminProfile.userType}`);
        console.log('✨ Admin seeding completed successfully!');
        return;
      } else {
        console.log(`⚠️ Profile exists but userType is '${adminProfile.userType}', updating to admin...`);
        // Update existing profile to admin
        adminProfile = await UserService.updateProfile(authUser.$id, { 
          userType: 'admin' as any
        });
        console.log('✅ Profile updated to admin');
      }
    } else {
      // Step 3: Create admin profile
      console.log('👑 Creating admin profile...');
      adminProfile = await UserService.createProfile(authUser.$id, {
        userType: 'admin',
        displayName: ADMIN_NAME,
        preferences: {
          theme: 'dark',
          emailNotifications: true,
          pushNotifications: true,
          marketingEmails: false
        }
      });
      console.log('✅ Admin profile created successfully');
    }
    
    // Step 4: Ensure admin is verified
    if (!adminProfile.isVerified) {
      console.log('🔐 Verifying admin user...');
      adminProfile = await UserService.verifyUser(authUser.$id, 'business');
      console.log('✅ Admin user verified');
    }
    
    console.log('\n🎉 Admin Seeding Completed Successfully!');
    console.log('=======================================');
    console.log(`👤 Admin User: ${authUser.name}`);
    console.log(`📧 Email: ${authUser.email}`);
    console.log(`🆔 User ID: ${authUser.$id}`);
    console.log(`📋 Profile ID: ${adminProfile.$id}`);
    console.log(`👑 User Type: ${adminProfile.userType}`);
    console.log(`✅ Verified: ${adminProfile.isVerified}`);
    console.log(`🔒 Active: ${adminProfile.isActive}`);
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Visit your MOSÉ platform');
    console.log(`2. Login with: ${ADMIN_EMAIL}`);
    console.log('3. Access admin dashboard');
    console.log('4. Manage users and platform settings');
    
    console.log('\n⚠️ Security Reminder:');
    console.log('• Change the default admin password immediately');
    console.log('• Use environment variables for production credentials');
    console.log('• Enable 2FA if available');
    
  } catch (error) {
    console.error('\n❌ Admin seeding failed:', error);
    console.error('\nTroubleshooting:');
    console.error('• Ensure your database collections are set up');
    console.error('• Check your .env.local file has correct Appwrite credentials');
    console.error('• Verify your API key has all required permissions');
    console.error('• Make sure UserService is working properly');
    process.exit(1);
  }
}

// Function to display current stats
async function showAdminStats() {
  try {
    console.log('\n📊 Current Platform Stats:');
    const stats = await UserService.getUserStats();
    console.log(`   Total Users: ${stats.totalUsers}`);
    console.log(`   Active Users: ${stats.activeUsers}`);
    console.log(`   Verified Users: ${stats.verifiedUsers}`);
    console.log(`   Admins: ${stats.usersByType.admins}`);
    console.log(`   Sellers: ${stats.usersByType.sellers}`);
    console.log(`   Buyers: ${stats.usersByType.buyers}`);
    console.log(`   Pending Verifications: ${stats.pendingVerifications}`);
  } catch (error) {
    console.log('   (Stats not available)');
  }
}

// Main execution
async function main() {
  await seedAdmin();
  await showAdminStats();
}

// Run the seeding
main().catch((error) => {
  console.error('❌ Seeding script error:', error);
  process.exit(1);
});