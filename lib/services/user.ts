import { account, databases } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { NotificationService } from './notifications';
import { ErrorHandler, type RegistrationResult } from '@/lib/utils/error-handler';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';

export interface UserProfile {
  $id: string;
  userId: string; // Links to Appwrite user
  displayName?: string;
  bio?: string;
  avatar?: string;
  phone?: string;
  location?: string;
  
  // User type and business
  userType: 'buyer' | 'seller' | 'admin';
  businessName?: string;
  artistType?: 'painter' | 'sculptor' | 'photographer' | 'digital_artist' | 'craftsperson' | 'other';
  specialties?: string[]; // Stored as JSON
  experience?: 'beginner' | 'intermediate' | 'expert';
  
  // Social and contact
  website?: string;
  socialLinks?: { // Stored as JSON
    instagram?: string;
    twitter?: string;
    facebook?: string;
    linkedin?: string;
    portfolio?: string;
  };
  contactEmail?: string;
  
  // Platform data
  isVerified: boolean;
  verificationLevel?: 'email' | 'phone' | 'identity' | 'business';
  rating?: number;
  reviewCount?: number;
  totalSales?: number; // in kobo
  totalPurchases?: number; // in kobo
  
  // Preferences
  preferences?: { // Stored as JSON
    theme?: 'light' | 'dark';
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    marketingEmails?: boolean;
  };
  notifications?: { // Stored as JSON
    newMessages?: boolean;
    orderUpdates?: boolean;
    giftInvitations?: boolean;
    promotions?: boolean;
  };
  language?: string;
  currency?: string;
  
  // Status
  isActive: boolean;
  lastLoginAt?: string;
  joinedAt?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface CreateUserProfileData {
  userType: 'buyer' | 'seller' | 'admin';
  displayName?: string;
  bio?: string;
  phone?: string;
  location?: string;
  businessName?: string;
  artistType?: string;
  specialties?: string[];
  website?: string;
  socialLinks?: Record<string, string>;
  contactEmail?: string;
  experience?: string;
  preferences?: Record<string, any>;
}

export interface AuthUser {
  $id: string;
  name: string;
  email: string;
  emailVerification: boolean;
  phoneVerification: boolean;
  $createdAt: string;
  $updatedAt: string;
}

export class UserService {
  private static readonly COLLECTION_ID = 'user_profiles';

  /**
   * Authentication Methods (using Appwrite built-in)
   */
  
  static async registerWithProfile(
    email: string, 
    password: string, 
    name: string, 
    userType: 'buyer' | 'seller' | 'admin'
  ): Promise<RegistrationResult> {
    // Step 1: Create Appwrite account
    let authUser: AuthUser;
    try {
      console.log('🔄 Creating user account...');
      authUser = await account.create(ID.unique(), email, password, name) as AuthUser;
      console.log('✅ User account created:', authUser.email);
    } catch (error) {
      console.error('❌ Account creation failed:', error);
      return ErrorHandler.createErrorResult(error, 'account_creation');
    }

    // Step 2: Ensure user has an active session
    try {
      console.log('🔄 Checking for existing session...');
      // Check if user already has an active session (account.create sometimes creates one automatically)
      let currentUser = null;
      try {
        currentUser = await account.get();
        console.log('✅ Active session already exists for new user');
      } catch (sessionError) {
        // No active session, create one
        console.log('🔄 No active session found, creating new session...');
        await account.createEmailPasswordSession(email, password);
        console.log('✅ Session created for new user');
      }
    } catch (error) {
      console.error('❌ Session management failed:', error);
      // Account exists but session issues - user should login
      return ErrorHandler.createErrorResult(error, 'session_creation');
    }

    // Step 3: Create user profile
    let userProfile: UserProfile;
    try {
      console.log('🔄 Creating user profile...');
      userProfile = await this.createProfile(authUser.$id, {
        userType,
        displayName: name,
        preferences: {
          theme: 'light',
          emailNotifications: true,
          pushNotifications: true,
          marketingEmails: false
        }
      });
      console.log('✅ User profile created successfully');
    } catch (error) {
      console.error('❌ Profile creation failed:', error);
      // Account and session exist but no profile - user should login to complete setup
      return ErrorHandler.createErrorResult(error, 'profile_creation');
    }

    // Success - return complete registration result
    return ErrorHandler.createSuccessResult(authUser, userProfile);
  }

  static async register(email: string, password: string, name: string): Promise<AuthUser> {
    // Legacy method for backwards compatibility
    try {
      console.log('🔄 Creating user account...');
      
      const user = await account.create(ID.unique(), email, password, name);
      console.log('✅ User account created:', user.email);
      
      // Create session immediately after account creation
      console.log('🔄 Creating session for new user...');
      await account.createEmailPasswordSession(email, password);
      console.log('✅ Session created for new user');
      
      return user as AuthUser;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create user');
    }
  }

  static async login(email: string, password: string): Promise<AuthUser> {
    try {
      console.log('🔄 Logging in user...');
      
      const session = await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      
      // Update last login in profile if exists
      const profile = await this.getProfileByUserId(user.$id);
      if (profile) {
        await this.updateProfile(user.$id, { lastLoginAt: new Date().toISOString() });
      }
      
      console.log('✅ User logged in:', user.email);
      return user as AuthUser;
    } catch (error) {
      console.error('❌ Error logging in:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to log in');
    }
  }

  /**
   * Login with structured error handling and profile integration
   */
  static async loginWithProfile(email: string, password: string): Promise<RegistrationResult> {
    try {
      console.log('🔄 Starting login with profile...');
      
      // Step 1: Create session and get user
      const session = await account.createEmailPasswordSession(email, password);
      const authUser = await account.get();
      
      console.log('✅ User authenticated:', authUser.email);
      
      // Step 2: Get user profile 
      let userProfile = await this.getProfileByUserId(authUser.$id);
      
      if (!userProfile) {
        console.warn('⚠️ User has account but no profile - auto-creating profile to maintain seamless login flow');
        
        try {
          // Auto-create profile with default buyer role (maintains consistency with registration flow)
          userProfile = await this.createProfile(authUser.$id, {
            userType: 'buyer', // Default to buyer, can be updated by admin if needed
            displayName: authUser.name,
            preferences: {
              theme: 'light',
              emailNotifications: true,
              pushNotifications: true,
              marketingEmails: false
            }
          });
          
          console.log('✅ Auto-created missing profile for user:', authUser.email);
        } catch (profileError) {
          console.error('❌ Failed to auto-create missing profile:', profileError);
          
          // If profile creation fails, return error but don't break the login
          return ErrorHandler.createErrorResult({
            message: 'Unable to complete login setup. Please try again or contact support.',
            code: 500,
            type: 'profile_creation_failed'
          }, 'profile_creation');
        }
      }
      
      // Step 3: Update last login time
      try {
        await this.updateProfile(authUser.$id, { lastLoginAt: new Date().toISOString() });
      } catch (updateError) {
        // Don't fail login if profile update fails
        console.warn('⚠️ Failed to update last login time:', updateError);
      }
      
      console.log('✅ Login with profile successful:', authUser.email, 'Role:', userProfile.userType);
      
      return ErrorHandler.createSuccessResult(authUser, userProfile);
      
    } catch (error) {
      console.error('❌ Login with profile failed:', error);
      
      // Handle specific login errors
      const message = error instanceof Error ? error.message : error?.toString() || '';
      
      // Invalid credentials
      if (message.includes('invalid credentials') || message.includes('Invalid credentials')) {
        return ErrorHandler.createErrorResult({
          message: 'Invalid email or password. Please check your credentials and try again.',
          code: 401,
          type: 'user_invalid_credentials'
        }, 'session_creation');
      }
      
      // Account not found / doesn't exist
      if (message.includes('user not found') || message.includes('User not found')) {
        return ErrorHandler.createErrorResult({
          message: 'No account found with this email address. Please sign up first.',
          code: 404,
          type: 'user_not_found'
        }, 'session_creation');
      }
      
      // Use generic error handling for other cases
      return ErrorHandler.createErrorResult(error, 'session_creation');
    }
  }

  static async logout(): Promise<void> {
    try {
      await account.deleteSession('current');
      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Error logging out:', error);
      throw new Error('Failed to log out');
    }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await account.get();
      return user as AuthUser;
    } catch (error) {
      return null; // Not authenticated
    }
  }

  static async sendEmailVerification(): Promise<void> {
    try {
      await account.createVerification(`${process.env.NEXT_PUBLIC_APP_URL}/verify-email`);
      console.log('✅ Verification email sent');
    } catch (error) {
      console.error('❌ Error sending verification:', error);
      throw new Error('Failed to send verification email');
    }
  }

  static async verifyEmail(userId: string, secret: string): Promise<void> {
    try {
      await account.updateVerification(userId, secret);
      console.log('✅ Email verified');
    } catch (error) {
      console.error('❌ Error verifying email:', error);
      throw new Error('Failed to verify email');
    }
  }

  /**
   * Complete profile setup for existing account (recovery flow)
   */
  static async completeProfileSetup(userType: 'buyer' | 'seller' | 'admin'): Promise<RegistrationResult> {
    try {
      // Get current authenticated user
      const authUser = await account.get() as AuthUser;
      console.log('🔄 Completing profile setup for existing user:', authUser.email);

      // Check if profile already exists
      const existingProfile = await this.getProfileByUserId(authUser.$id);
      if (existingProfile) {
        console.log('✅ Profile already exists, no setup needed');
        return ErrorHandler.createSuccessResult(authUser, existingProfile);
      }

      // Create the missing profile
      const userProfile = await this.createProfile(authUser.$id, {
        userType,
        displayName: authUser.name,
        preferences: {
          theme: 'light',
          emailNotifications: true,
          pushNotifications: true,
          marketingEmails: false
        }
      });

      console.log('✅ Profile setup completed for existing user');
      return ErrorHandler.createSuccessResult(authUser, userProfile);
    } catch (error) {
      console.error('❌ Profile setup failed:', error);
      return ErrorHandler.createErrorResult(error, 'profile_creation');
    }
  }

  /**
   * Profile Methods (using custom collection)
   */

  static async createProfile(userId: string, profileData: CreateUserProfileData): Promise<UserProfile> {
    try {
      console.log('🔄 Creating user profile...');

      const profileDocument = {
        userId,
        displayName: profileData.displayName || '',
        bio: profileData.bio || '',
        phone: profileData.phone || '',
        location: profileData.location || '',
        userType: profileData.userType,
        businessName: profileData.businessName || '',
        artistType: profileData.artistType || '',
        specialties: JSON.stringify(profileData.specialties || []),
        website: profileData.website || '',
        socialLinks: JSON.stringify(profileData.socialLinks || {}),
        contactEmail: '',
        isVerified: profileData.userType !== 'seller', // Admins & buyers auto-approved, only sellers need approval
        verificationLevel: profileData.userType === 'admin' ? 'business' : 'email',
        rating: 0,
        reviewCount: 0,
        totalSales: 0,
        totalPurchases: 0,
        preferences: JSON.stringify(profileData.preferences || {
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
        this.COLLECTION_ID,
        ID.unique(),
        profileDocument
      );

      console.log('✅ User profile created:', profile.$id);
      return this.transformProfile(profile);
    } catch (error) {
      console.error('❌ Error creating profile:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create profile');
    }
  }

  /**
   * Get user profile by user ID (alias for compatibility)
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    return this.getProfileByUserId(userId);
  }

  static async getProfileByUserId(userId: string): Promise<UserProfile | null> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length === 0) {
        return null;
      }

      return this.transformProfile(response.documents[0]);
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
      return null;
    }
  }

  static async updateProfile(userId: string, updates: Partial<CreateUserProfileData> & { lastLoginAt?: string }): Promise<UserProfile> {
    try {
      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const updateDocument: any = {};
      
      if (updates.displayName !== undefined) updateDocument.displayName = updates.displayName;
      if (updates.bio !== undefined) updateDocument.bio = updates.bio;
      if (updates.phone !== undefined) updateDocument.phone = updates.phone;
      if (updates.location !== undefined) updateDocument.location = updates.location;
      if (updates.businessName !== undefined) updateDocument.businessName = updates.businessName;
      if (updates.artistType !== undefined) updateDocument.artistType = updates.artistType;
      if (updates.website !== undefined) updateDocument.website = updates.website;
      if (updates.contactEmail !== undefined) updateDocument.contactEmail = updates.contactEmail;
      if (updates.experience !== undefined) updateDocument.experience = updates.experience;
      if (updates.lastLoginAt !== undefined) updateDocument.lastLoginAt = updates.lastLoginAt;
      
      if (updates.specialties !== undefined) {
        updateDocument.specialties = JSON.stringify(updates.specialties);
      }
      if (updates.socialLinks !== undefined) {
        updateDocument.socialLinks = JSON.stringify(updates.socialLinks);
      }
      if (updates.preferences !== undefined) {
        updateDocument.preferences = JSON.stringify(updates.preferences);
      }

      const updatedProfile = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        profile.$id,
        updateDocument
      );

      console.log('✅ Profile updated:', profile.$id);
      return this.transformProfile(updatedProfile);
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update profile');
    }
  }

  static async verifyUser(userId: string, verificationLevel: string = 'identity'): Promise<UserProfile> {
    try {
      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const updatedProfile = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        profile.$id,
        {
          isVerified: true,
          verificationLevel
        }
      );

      console.log('✅ User verified:', userId);
      return this.transformProfile(updatedProfile);
    } catch (error) {
      console.error('❌ Error verifying user:', error);
      throw new Error('Failed to verify user');
    }
  }

  static async updateUserStats(userId: string, stats: { 
    rating?: number; 
    reviewCount?: number; 
    totalSales?: number; 
    totalPurchases?: number; 
  }): Promise<UserProfile> {
    try {
      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const updatedProfile = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        profile.$id,
        stats
      );

      console.log('✅ User stats updated:', userId);
      return this.transformProfile(updatedProfile);
    } catch (error) {
      console.error('❌ Error updating user stats:', error);
      throw new Error('Failed to update user stats');
    }
  }

  static async searchProfiles(
    query?: string,
    userType?: string,
    location?: string,
    isVerified?: boolean,
    limit: number = 20,
    offset: number = 0
  ): Promise<{
    profiles: UserProfile[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const queries = [Query.equal('isActive', true)];

      if (userType) {
        queries.push(Query.equal('userType', userType));
      }
      if (location) {
        queries.push(Query.search('location', query || ''));
      }
      if (isVerified !== undefined) {
        queries.push(Query.equal('isVerified', isVerified));
      }
      if (query) {
        // Search in displayName, bio, businessName
        queries.push(Query.search('displayName', query));
      }
      if (limit > 0) {
        queries.push(Query.limit(limit));
      }
      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        queries
      );

      const profiles = response.documents.map(this.transformProfile);
      const hasMore = response.total > offset + profiles.length;

      return {
        profiles,
        total: response.total,
        hasMore
      };
    } catch (error) {
      console.error('❌ Error searching profiles:', error);
      throw new Error('Failed to search profiles');
    }
  }

  /**
   * Combined user data (auth + profile)
   */
  static async getCompleteUser(userId: string): Promise<{
    auth: AuthUser;
    profile: UserProfile | null;
  } | null> {
    try {
      const currentUser = await this.getCurrentUser();
      if (!currentUser || currentUser.$id !== userId) {
        return null;
      }

      const profile = await this.getProfileByUserId(userId);

      return {
        auth: currentUser,
        profile
      };
    } catch (error) {
      console.error('❌ Error fetching complete user:', error);
      return null;
    }
  }

  /**
   * Admin-specific methods
   */
  
  static async getAllUsers(
    userType?: 'buyer' | 'seller' | 'admin',
    isVerified?: boolean,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    profiles: UserProfile[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // This method should only be called by admin users
      const currentUser = await this.getCurrentUser();
      if (!currentUser) {
        throw new Error('Not authenticated');
      }

      const currentProfile = await this.getProfileByUserId(currentUser.$id);
      if (!currentProfile || currentProfile.userType !== 'admin') {
        throw new Error('Access denied: Admin privileges required');
      }

      const queries = [Query.equal('isActive', true)];

      if (userType) {
        queries.push(Query.equal('userType', userType));
      }
      if (isVerified !== undefined) {
        queries.push(Query.equal('isVerified', isVerified));
      }
      if (limit > 0) {
        queries.push(Query.limit(limit));
      }
      if (offset > 0) {
        queries.push(Query.offset(offset));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        queries
      );

      const profiles = response.documents.map(this.transformProfile);
      const hasMore = response.total > offset + profiles.length;

      return {
        profiles,
        total: response.total,
        hasMore
      };
    } catch (error) {
      console.error('❌ Error fetching all users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  static async approveUser(userId: string, adminUserId: string): Promise<UserProfile> {
    try {
      // Verify admin permissions
      const adminProfile = await this.getProfileByUserId(adminUserId);
      if (!adminProfile || adminProfile.userType !== 'admin') {
        throw new Error('Access denied: Admin privileges required');
      }

      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      const updatedProfile = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        profile.$id,
        {
          isVerified: true,
          verificationLevel: profile.userType === 'seller' ? 'business' : 'identity'
        }
      );

      // Send approval notification
      try {
        await NotificationService.notifySellerApproved(userId);
      } catch (notificationError) {
        console.warn('⚠️ Failed to send approval notification:', notificationError);
      }

      console.log('✅ User approved:', userId);
      return this.transformProfile(updatedProfile);
    } catch (error) {
      console.error('❌ Error approving user:', error);
      throw new Error('Failed to approve user');
    }
  }

  static async rejectUser(userId: string, adminUserId: string, reason?: string): Promise<UserProfile> {
    try {
      // Verify admin permissions
      const adminProfile = await this.getProfileByUserId(adminUserId);
      if (!adminProfile || adminProfile.userType !== 'admin') {
        throw new Error('Access denied: Admin privileges required');
      }

      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      const updatedProfile = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        profile.$id,
        {
          isVerified: false,
          verificationLevel: 'rejected',
          ...(reason && { rejectionReason: reason })
        }
      );

      // Send rejection notification
      try {
        await NotificationService.notifySellerRejected(userId, reason);
      } catch (notificationError) {
        console.warn('⚠️ Failed to send rejection notification:', notificationError);
      }

      console.log('✅ User rejected:', userId);
      return this.transformProfile(updatedProfile);
    } catch (error) {
      console.error('❌ Error rejecting user:', error);
      throw new Error('Failed to reject user');
    }
  }

  static async suspendUser(userId: string, adminUserId: string, reason?: string): Promise<UserProfile> {
    try {
      // Verify admin permissions
      const adminProfile = await this.getProfileByUserId(adminUserId);
      if (!adminProfile || adminProfile.userType !== 'admin') {
        throw new Error('Access denied: Admin privileges required');
      }

      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      const updatedProfile = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        profile.$id,
        {
          isActive: false,
          suspensionReason: reason || 'Suspended by admin',
          suspendedAt: new Date().toISOString()
        }
      );

      // Send suspension notification
      try {
        await NotificationService.notifyUserSuspended(userId, reason);
      } catch (notificationError) {
        console.warn('⚠️ Failed to send suspension notification:', notificationError);
      }

      console.log('✅ User suspended:', userId);
      return this.transformProfile(updatedProfile);
    } catch (error) {
      console.error('❌ Error suspending user:', error);
      throw new Error('Failed to suspend user');
    }
  }

  static async reactivateUser(userId: string, adminUserId: string): Promise<UserProfile> {
    try {
      // Verify admin permissions
      const adminProfile = await this.getProfileByUserId(adminUserId);
      if (!adminProfile || adminProfile.userType !== 'admin') {
        throw new Error('Access denied: Admin privileges required');
      }

      const profile = await this.getProfileByUserId(userId);
      if (!profile) {
        throw new Error('User profile not found');
      }

      const updatedProfile = await databases.updateDocument(
        DATABASE_ID,
        this.COLLECTION_ID,
        profile.$id,
        {
          isActive: true,
          suspensionReason: null,
          suspendedAt: null
        }
      );

      // Send reactivation notification
      try {
        await NotificationService.notifyUserReactivated(userId);
      } catch (notificationError) {
        console.warn('⚠️ Failed to send reactivation notification:', notificationError);
      }

      console.log('✅ User reactivated:', userId);
      return this.transformProfile(updatedProfile);
    } catch (error) {
      console.error('❌ Error reactivating user:', error);
      throw new Error('Failed to reactivate user');
    }
  }

  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    verifiedUsers: number;
    usersByType: {
      buyers: number;
      sellers: number;
      admins: number;
    };
    pendingVerifications: number;
  }> {
    try {
      const allUsersResponse = await databases.listDocuments(
        DATABASE_ID,
        this.COLLECTION_ID,
        [Query.limit(1000)] // Adjust based on expected user count
      );

      const users = allUsersResponse.documents;
      
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.isActive).length,
        verifiedUsers: users.filter(u => u.isVerified).length,
        usersByType: {
          buyers: users.filter(u => u.userType === 'buyer').length,
          sellers: users.filter(u => u.userType === 'seller').length,
          admins: users.filter(u => u.userType === 'admin').length,
        },
        pendingVerifications: users.filter(u => !u.isVerified && u.isActive).length
      };

      return stats;
    } catch (error) {
      console.error('❌ Error getting user stats:', error);
      throw new Error('Failed to get user statistics');
    }
  }

  /**
   * Transform database document to UserProfile type
   */
  private static transformProfile(doc: any): UserProfile {
    return {
      $id: doc.$id,
      userId: doc.userId,
      displayName: doc.displayName,
      bio: doc.bio,
      avatar: doc.avatar,
      phone: doc.phone,
      location: doc.location,
      userType: doc.userType,
      businessName: doc.businessName,
      artistType: doc.artistType,
      specialties: doc.specialties ? JSON.parse(doc.specialties) : [],
      experience: doc.experience,
      website: doc.website,
      socialLinks: doc.socialLinks ? JSON.parse(doc.socialLinks) : {},
      contactEmail: doc.contactEmail,
      isVerified: doc.isVerified,
      verificationLevel: doc.verificationLevel,
      rating: doc.rating,
      reviewCount: doc.reviewCount,
      totalSales: doc.totalSales,
      totalPurchases: doc.totalPurchases,
      preferences: doc.preferences ? JSON.parse(doc.preferences) : {},
      notifications: doc.notifications ? JSON.parse(doc.notifications) : {},
      language: doc.language,
      currency: doc.currency,
      isActive: doc.isActive,
      lastLoginAt: doc.lastLoginAt,
      joinedAt: doc.joinedAt,
      $createdAt: doc.$createdAt,
      $updatedAt: doc.$updatedAt
    };
  }
}

export default UserService;