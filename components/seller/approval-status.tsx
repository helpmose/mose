"use client";

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { UserService, type UserProfile } from '@/lib/services/user';

export default function ApprovalStatus() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const profile = await UserService.getProfileByUserId(user.$id);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-neutral-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!userProfile || userProfile.userType !== 'seller') {
    return null;
  }

  const getStatusInfo = () => {
    if (!userProfile.isVerified) {
      return {
        status: 'pending',
        title: '⏳ Account Under Review',
        message: 'Your seller account is currently being reviewed by our team. This usually takes 1-2 business days.',
        color: 'yellow',
        actions: [
          'Ensure your profile information is complete',
          'Upload any required verification documents',
          'Check your email for any additional requests from our team'
        ]
      };
    } else if (userProfile.verificationLevel === 'rejected') {
      return {
        status: 'rejected',
        title: '❌ Account Rejected',
        message: 'Unfortunately, your seller application was not approved. Please contact support for more information.',
        color: 'red',
        actions: [
          'Review the rejection reason if provided',
          'Contact support for clarification',
          'Update your information and reapply if appropriate'
        ]
      };
    } else if (!userProfile.isActive) {
      return {
        status: 'suspended',
        title: '⚠️ Account Suspended',
        message: 'Your seller account has been temporarily suspended. Please contact support to resolve this issue.',
        color: 'red',
        actions: [
          'Review our community guidelines',
          'Contact support to understand the suspension',
          'Provide any requested information for reactivation'
        ]
      };
    } else {
      return {
        status: 'approved',
        title: '✅ Account Approved',
        message: 'Congratulations! Your seller account has been approved. You can now start listing and selling your artwork.',
        color: 'green',
        actions: [
          'Create your first product listing',
          'Set up your seller profile',
          'Explore seller tools and analytics'
        ]
      };
    }
  };

  const statusInfo = getStatusInfo();

  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      text: 'text-yellow-400'
    },
    red: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20', 
      text: 'text-red-400'
    },
    green: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      text: 'text-green-400'
    }
  };

  const colors = colorClasses[statusInfo.color as keyof typeof colorClasses];

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-6`}>
      <h2 className={`text-lg font-semibold ${colors.text} mb-2`}>
        {statusInfo.title}
      </h2>
      <p className="text-text-muted mb-4">
        {statusInfo.message}
      </p>

      {statusInfo.status === 'approved' && (
        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-background-secondary rounded-lg p-3">
              <div className="text-text-secondary">Verification Level</div>
              <div className="text-text-primary font-medium capitalize">
                {userProfile.verificationLevel || 'Basic'}
              </div>
            </div>
            <div className="bg-background-secondary rounded-lg p-3">
              <div className="text-text-secondary">Rating</div>
              <div className="text-text-primary font-medium">
                {userProfile.rating ? `${userProfile.rating.toFixed(1)} ⭐` : 'No ratings yet'}
              </div>
            </div>
            <div className="bg-background-secondary rounded-lg p-3">
              <div className="text-text-secondary">Total Sales</div>
              <div className="text-text-primary font-medium">
                ₦{userProfile.totalSales || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-text-primary font-medium mb-2">Next Steps:</h3>
        <ul className="space-y-1">
          {statusInfo.actions.map((action, index) => (
            <li key={index} className="text-text-muted text-sm flex items-start">
              <span className="text-text-secondary mr-2">•</span>
              {action}
            </li>
          ))}
        </ul>
      </div>

      {statusInfo.status === 'pending' && (
        <div className="flex items-center justify-between pt-4 border-t border-neutral-700">
          <div className="text-sm text-text-muted">
            Submitted: {userProfile.joinedAt ? new Date(userProfile.joinedAt).toLocaleDateString() : 'Unknown'}
          </div>
          <button 
            onClick={loadUserProfile}
            className="text-sm text-text-primary hover:text-text-secondary transition-colors"
          >
            Refresh Status
          </button>
        </div>
      )}

      {(statusInfo.status === 'rejected' || statusInfo.status === 'suspended') && (
        <div className="pt-4 border-t border-neutral-700">
          <button className="bg-text-primary text-background-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-text-secondary transition-colors">
            Contact Support
          </button>
        </div>
      )}

      {statusInfo.status === 'approved' && (
        <div className="pt-4 border-t border-neutral-700 flex space-x-3">
          <button className="bg-text-primary text-background-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-text-secondary transition-colors">
            Create First Listing
          </button>
          <button className="border border-neutral-600 text-text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-700 transition-colors">
            View Dashboard
          </button>
        </div>
      )}
    </div>
  );
}