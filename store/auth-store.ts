import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/lib/types';
import { UserService, type AuthUser, type UserProfile } from '@/lib/services/user';
import { DATABASE_ID } from '@/lib/constants';
import { type UserError, type RegistrationResult } from '@/lib/utils/error-handler';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isHydrated: boolean; // Track if persisted state has loaded
  lastError: UserError | null;
  
  // Actions
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string, role: 'buyer' | 'seller' | 'admin') => Promise<RegistrationResult>;
  completeSetup: (userType: 'buyer' | 'seller' | 'admin') => Promise<RegistrationResult>;
  recoverAccount: (email: string) => Promise<{ needsLogin: boolean; needsProfileSetup: boolean; errorMessage?: string; }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
  handleAuthRedirect: () => string;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      isHydrated: false,
      lastError: null,

      login: async (email: string, password: string) => {
        console.log('🔐 Starting login process...');
        set({ isLoading: true, lastError: null });
        
        // Use UserService error-handled login method
        const result = await UserService.loginWithProfile(email, password);
        
        if (result.success && result.user && result.profile) {
          // Success - create User object for state
          const user: User = {
            $id: result.user.$id,
            email: result.user.email,
            name: result.user.name,
            role: (result.profile?.userType as 'buyer' | 'seller' | 'admin') || 'buyer',
            avatar: result.profile.avatar,
            phone: result.profile.phone,
            address: undefined,
            isVerified: result.user.emailVerification,
            sellerProfile: result.profile?.userType === 'seller' || result.profile?.userType === 'admin' ? {
              businessName: result.profile.businessName || '',
              description: result.profile.bio || '',
              specialties: result.profile.specialties || [],
              location: result.profile.location || '',
              rating: result.profile.rating || 0,
              totalSales: result.profile.totalSales || 0,
              verificationStatus: result.profile.isVerified ? 'verified' : 'pending',
              socialLinks: {
                instagram: result.profile.socialLinks?.instagram,
                facebook: result.profile.socialLinks?.facebook,
                website: result.profile.website
              }
            } : undefined,
            socialProfile: undefined,
            preferences: {
              notifications: {
                email: result.profile?.notifications?.newMessages ?? true,
                push: result.profile?.preferences?.pushNotifications ?? true,
                marketing: result.profile?.preferences?.marketingEmails ?? false,
                orderUpdates: result.profile?.notifications?.orderUpdates ?? true,
                socialActivity: result.profile?.notifications?.giftInvitations ?? true,
              },
              privacy: {
                showProfile: true,
                showPurchases: false,
                showWishlist: false,
                allowMessages: true,
              },
              theme: (result.profile?.preferences?.theme as 'light' | 'dark' | 'auto') ?? 'auto',
              language: result.profile?.language ?? 'en'
            },
            stats: {
              totalOrders: 0,
              totalSpent: result.profile?.totalPurchases ?? 0,
              reviewsGiven: result.profile?.reviewCount ?? 0,
              wishlistItems: 0,
              followersCount: 0,
              followingCount: 0,
              joinedDate: result.profile?.joinedAt ?? result.user.$createdAt
            },
            createdAt: result.user.$createdAt,
            updatedAt: result.user.$updatedAt,
          };
          
          set({ 
            user, 
            profile: result.profile,
            isAuthenticated: true, 
            isLoading: false,
            lastError: null
          });
          
          console.log("🎉 Login successful, returning user:", user.email);
          return user;
        } else {
          // Error - set error state and throw for component handling
          set({ 
            isLoading: false,
            lastError: result.error || null
          });
          
          console.log("❌ Login failed:", result.error?.message);
          throw new Error(result.error?.message || 'Login failed');
        }
      },

      register: async (email: string, password: string, name: string, role: 'buyer' | 'seller' | 'admin'): Promise<RegistrationResult> => {
        console.log('📝 Starting registration process...');
        set({ isLoading: true, lastError: null });
        
        // Use the new error-handled registration method
        const result = await UserService.registerWithProfile(email, password, name, role);
        
        if (result.success && result.user && result.profile) {
          // Success - create User object for state
          const user: User = {
            $id: result.user.$id,
            email: result.user.email,
            name: result.user.name,
            role: role, // Use original PRD role
            avatar: result.profile.avatar,
            phone: result.profile.phone,
            address: undefined,
            isVerified: result.user.emailVerification,
            sellerProfile: role === 'seller' || role === 'admin' ? {
              businessName: result.profile.businessName || '',
              description: result.profile.bio || '',
              specialties: result.profile.specialties || [],
              location: result.profile.location || '',
              rating: 0,
              totalSales: 0,
              verificationStatus: 'pending',
              socialLinks: {
                instagram: result.profile.socialLinks?.instagram,
                facebook: result.profile.socialLinks?.facebook,
                website: result.profile.website
              }
            } : undefined,
            socialProfile: undefined,
            preferences: {
              notifications: {
                email: result.profile.notifications?.newMessages ?? true,
                push: result.profile.preferences?.pushNotifications ?? true,
                marketing: result.profile.preferences?.marketingEmails ?? false,
                orderUpdates: result.profile.notifications?.orderUpdates ?? true,
                socialActivity: result.profile.notifications?.giftInvitations ?? true,
              },
              privacy: {
                showProfile: true,
                showPurchases: false,
                showWishlist: false,
                allowMessages: true,
              },
              theme: (result.profile.preferences?.theme as 'light' | 'dark' | 'auto') ?? 'auto',
              language: result.profile.language ?? 'en'
            },
            stats: {
              totalOrders: 0,
              totalSpent: 0,
              reviewsGiven: 0,
              wishlistItems: 0,
              followersCount: 0,
              followingCount: 0,
              joinedDate: result.profile.joinedAt ?? result.user.$createdAt
            },
            createdAt: result.user.$createdAt,
            updatedAt: result.user.$updatedAt,
          };
          
          set({ 
            user, 
            profile: result.profile,
            isAuthenticated: true, 
            isLoading: false,
            lastError: null
          });
          
          console.log("🎉 Registration successful:", user.email, "Role:", role);
        } else {
          // Error - set error state but don't throw
          set({ 
            isLoading: false,
            lastError: result.error || null
          });
          
          console.log("❌ Registration failed:", result.error?.message);
        }
        
        return result;
      },

      completeSetup: async (userType: 'buyer' | 'seller' | 'admin'): Promise<RegistrationResult> => {
        console.log('🔄 Completing profile setup...');
        set({ isLoading: true, lastError: null });
        
        const result = await UserService.completeProfileSetup(userType);
        
        if (result.success && result.user && result.profile) {
          // Success - update state with completed profile
          const user: User = {
            $id: result.user.$id,
            email: result.user.email,
            name: result.user.name,
            role: userType,
            avatar: result.profile.avatar,
            phone: result.profile.phone,
            address: undefined,
            isVerified: result.user.emailVerification,
            sellerProfile: userType === 'seller' || userType === 'admin' ? {
              businessName: result.profile.businessName || '',
              description: result.profile.bio || '',
              specialties: result.profile.specialties || [],
              location: result.profile.location || '',
              rating: 0,
              totalSales: 0,
              verificationStatus: 'pending',
              socialLinks: {
                instagram: result.profile.socialLinks?.instagram,
                facebook: result.profile.socialLinks?.facebook,
                website: result.profile.website
              }
            } : undefined,
            socialProfile: undefined,
            preferences: {
              notifications: {
                email: result.profile.notifications?.newMessages ?? true,
                push: result.profile.preferences?.pushNotifications ?? true,
                marketing: result.profile.preferences?.marketingEmails ?? false,
                orderUpdates: result.profile.notifications?.orderUpdates ?? true,
                socialActivity: result.profile.notifications?.giftInvitations ?? true,
              },
              privacy: {
                showProfile: true,
                showPurchases: false,
                showWishlist: false,
                allowMessages: true,
              },
              theme: (result.profile.preferences?.theme as 'light' | 'dark' | 'auto') ?? 'auto',
              language: result.profile.language ?? 'en'
            },
            stats: {
              totalOrders: 0,
              totalSpent: 0,
              reviewsGiven: 0,
              wishlistItems: 0,
              followersCount: 0,
              followingCount: 0,
              joinedDate: result.profile.joinedAt ?? result.user.$createdAt
            },
            createdAt: result.user.$createdAt,
            updatedAt: result.user.$updatedAt,
          };
          
          set({ 
            user, 
            profile: result.profile,
            isAuthenticated: true, 
            isLoading: false,
            lastError: null
          });
          
          console.log("🎉 Profile setup completed:", user.email);
        } else {
          set({ 
            isLoading: false,
            lastError: result.error || null
          });
          
          console.log("❌ Profile setup failed:", result.error?.message);
        }
        
        return result;
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          await UserService.logout();
          set({ 
            user: null, 
            profile: null,
            isAuthenticated: false, 
            isLoading: false 
          });
        } catch (error) {
          // Even if logout fails, clear local state
          set({ 
            user: null, 
            profile: null,
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          
          const authUser = await UserService.getCurrentUser();
          if (!authUser) {
            set({ 
              user: null, 
              profile: null,
              isAuthenticated: false, 
              isLoading: false 
            });
            return;
          }
          
          // Get user profile if it exists
          const userProfile = await UserService.getProfileByUserId(authUser.$id);
          
          // Create User object for state (same mapping as login)
          const user: User = {
            $id: authUser.$id,
            email: authUser.email,
            name: authUser.name,
            role: (userProfile?.userType as 'buyer' | 'seller' | 'admin') || 'buyer',
            avatar: userProfile?.avatar,
            phone: userProfile?.phone,
            address: undefined,
            isVerified: authUser.emailVerification,
            sellerProfile: userProfile?.userType === 'seller' || userProfile?.userType === 'admin' ? {
              businessName: userProfile.businessName || '',
              description: userProfile.bio || '',
              specialties: userProfile.specialties || [],
              location: userProfile.location || '',
              rating: userProfile.rating || 0,
              totalSales: userProfile.totalSales || 0,
              verificationStatus: userProfile.isVerified ? 'verified' : 'pending',
              socialLinks: {
                instagram: userProfile.socialLinks?.instagram,
                facebook: userProfile.socialLinks?.facebook,
                website: userProfile.website
              }
            } : undefined,
            socialProfile: undefined,
            preferences: {
              notifications: {
                email: userProfile?.notifications?.newMessages ?? true,
                push: userProfile?.preferences?.pushNotifications ?? true,
                marketing: userProfile?.preferences?.marketingEmails ?? false,
                orderUpdates: userProfile?.notifications?.orderUpdates ?? true,
                socialActivity: userProfile?.notifications?.giftInvitations ?? true,
              },
              privacy: {
                showProfile: true,
                showPurchases: false,
                showWishlist: false,
                allowMessages: true,
              },
              theme: (userProfile?.preferences?.theme as 'light' | 'dark' | 'auto') ?? 'auto',
              language: userProfile?.language ?? 'en'
            },
            stats: {
              totalOrders: 0,
              totalSpent: userProfile?.totalPurchases ?? 0,
              reviewsGiven: userProfile?.reviewCount ?? 0,
              wishlistItems: 0,
              followersCount: 0,
              followingCount: 0,
              joinedDate: userProfile?.joinedAt ?? authUser.$createdAt
            },
            createdAt: authUser.$createdAt,
            updatedAt: authUser.$updatedAt,
          };
          
          set({ 
            user, 
            profile: userProfile,
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          set({ 
            user: null, 
            profile: null,
            isAuthenticated: false, 
            isLoading: false 
          });
        }
      },

      updateProfile: async (data: Partial<UserProfile>) => {
        try {
          set({ isLoading: true });
          
          const currentUser = get().user;
          if (!currentUser) {
            throw new Error('No user logged in');
          }
          
          // Update profile using UserService
          const updatedProfile = await UserService.updateProfile(currentUser.$id, data);
          
          // Update state with new profile data
          set({ 
            profile: updatedProfile,
            isLoading: false 
          });
          
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      setUser: (user: User | null) => {
        set({ 
          user, 
          isAuthenticated: !!user 
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      clearError: () => {
        set({ lastError: null });
      },

      recoverAccount: async (email: string) => {
        try {
          set({ isLoading: true });
          
          // Check if user can be authenticated (account exists)
          const result = await UserService.loginWithProfile(email, 'temp_password_check');
          
          // This will fail, but we can analyze the error
          return {
            needsLogin: false,
            needsProfileSetup: false,
            errorMessage: 'Account recovery not needed'
          };
          
        } catch (error: any) {
          const message = error?.message || error?.toString() || '';
          
          // If it's invalid credentials, account exists but wrong password
          if (message.includes('Invalid credentials') || message.includes('invalid credentials')) {
            return {
              needsLogin: true,
              needsProfileSetup: false,
              errorMessage: 'Account exists - please sign in with your password'
            };
          }
          
          // If account doesn't exist
          if (message.includes('user not found') || message.includes('User not found')) {
            return {
              needsLogin: false,
              needsProfileSetup: false,
              errorMessage: 'No account found - please register first'
            };
          }
          
          // Other errors
          return {
            needsLogin: false,
            needsProfileSetup: false,
            errorMessage: 'Unable to check account status'
          };
        } finally {
          set({ isLoading: false });
        }
      },

      handleAuthRedirect: () => {
        const { user, isAuthenticated, lastError } = get();
        
        // Handle error-based redirects first
        if (lastError?.redirectTo) {
          return lastError.redirectTo;
        }
        
        // If not authenticated, go to login
        if (!isAuthenticated || !user) {
          return '/login';
        }
        
        // Redirect based on user role
        switch (user.role) {
          case 'admin':
            return '/admin';
          case 'seller':
            // Sellers always go to their dashboard (they can see approval status there)
            return '/seller';
          case 'buyer':
          default:
            return '/buyer';
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        profile: state.profile,
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isHydrated = true;
          console.log('🔄 Auth state rehydrated:', { 
            isAuthenticated: state.isAuthenticated,
            hasUser: !!state.user 
          });
        }
      },
    }
  )
); 