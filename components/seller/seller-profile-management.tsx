"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { UserService, type UserProfile, type CreateUserProfileData } from '@/lib/services/user';

interface SellerProfileManagementProps {
  className?: string;
}

export default function SellerProfileManagement({ className = "" }: SellerProfileManagementProps) {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user || user.role !== 'seller') return;
    
    try {
      setLoading(true);
      const userProfile = await UserService.getProfile(user.$id);
      setProfile(userProfile);
      
      if (userProfile) {
        setFormData({
          displayName: userProfile.displayName || '',
          businessName: userProfile.businessName || '',
          bio: userProfile.bio || '',
          location: userProfile.location || '',
          phone: userProfile.phone || '',
          artistType: userProfile.artistType || 'other',
          specialties: userProfile.specialties || [],
          experience: userProfile.experience || 'intermediate',
          website: userProfile.website || '',
          contactEmail: userProfile.contactEmail || '',
          socialLinks: {
            instagram: userProfile.socialLinks?.instagram || '',
            twitter: userProfile.socialLinks?.twitter || '',
            facebook: userProfile.socialLinks?.facebook || '',
            portfolio: userProfile.socialLinks?.portfolio || '',
          }
        });
      }
    } catch (error) {
      console.error('Failed to load seller profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    // Bio character limit
    if (field === 'bio' && value.length > 500) {
      return;
    }
    
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
    // Clear messages when user starts editing
    setError(null);
    setSuccess(null);
  };

  const handleSocialLinksChange = (platform: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handleSpecialtiesChange = (specialty: string, checked: boolean) => {
    setFormData((prev: any) => {
      const specialties = prev.specialties || [];
      if (checked) {
        return {
          ...prev,
          specialties: [...specialties, specialty]
        };
      } else {
        return {
          ...prev,
          specialties: specialties.filter((s: string) => s !== specialty)
        };
      }
    });
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    // Simple validation
    if (!formData.displayName?.trim()) {
      setError('Display name is required');
      return;
    }
    if (!formData.businessName?.trim()) {
      setError('Business name is required');
      return;
    }
    if (!formData.bio?.trim()) {
      setError('Bio is required');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updateData: CreateUserProfileData = {
        userType: 'seller',
        displayName: formData.displayName?.trim(),
        businessName: formData.businessName?.trim(),
        bio: formData.bio?.trim(),
        location: formData.location?.trim(),
        phone: formData.phone?.trim(),
        artistType: formData.artistType,
        specialties: formData.specialties || [],
        website: formData.website?.trim(),
        contactEmail: formData.contactEmail?.trim(),
        experience: formData.experience,
        socialLinks: formData.socialLinks,
        preferences: {
          emailNotifications: true,
          pushNotifications: true,
        }
      };

      console.log('💾 Saving profile data:', updateData);
      const updatedProfile = await UserService.updateProfile(user.$id, updateData);
      setProfile(updatedProfile);
      setEditing(false);
      setSuccess('Profile updated successfully!');
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateProfileCompletion = () => {
    if (!formData) return 0;
    
    const requiredFields = [
      'displayName',
      'businessName', 
      'bio',
      'location',
      'phone',
      'artistType'
    ];
    
    const optionalFields = [
      'website',
      'contactEmail',
      'socialLinks.instagram',
      'socialLinks.portfolio'
    ];
    
    const requiredComplete = requiredFields.filter(field => {
      const value = formData[field];
      return value && value.toString().trim().length > 0;
    }).length;
    
    const optionalComplete = optionalFields.filter(field => {
      const parts = field.split('.');
      let value = formData;
      for (const part of parts) {
        value = value?.[part];
      }
      return value && value.toString().trim().length > 0;
    }).length;
    
    const totalFields = requiredFields.length + optionalFields.length;
    const completedFields = requiredComplete + (optionalComplete * 0.5); // Optional fields count half
    
    return Math.round((completedFields / totalFields) * 100);
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-neutral-700 rounded w-1/3"></div>
            <div className="h-4 bg-neutral-700 rounded w-2/3"></div>
            <div className="space-y-2">
              <div className="h-10 bg-neutral-700 rounded"></div>
              <div className="h-10 bg-neutral-700 rounded"></div>
              <div className="h-20 bg-neutral-700 rounded"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const completionPercentage = calculateProfileCompletion();
  const artistTypes = [
    'painter',
    'sculptor', 
    'photographer',
    'digital_artist',
    'craftsperson',
    'other'
  ];

  const experienceLevels = [
    { value: 'beginner', label: 'Beginner (0-2 years)' },
    { value: 'intermediate', label: 'Intermediate (2-5 years)' },
    { value: 'expert', label: 'Expert (5+ years)' }
  ];

  const specialtyOptions = [
    'abstract', 'portrait', 'landscape', 'still_life', 'contemporary',
    'traditional', 'digital', 'mixed_media', 'sculpture', 'jewelry',
    'textiles', 'ceramics', 'woodwork', 'metalwork'
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Completion Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Profile Completion</h3>
            <p className="text-text-muted text-sm">Complete your profile to improve visibility</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">{completionPercentage}%</div>
            <div className="text-sm text-text-muted">Complete</div>
          </div>
        </div>
        
        <div className="w-full bg-background-tertiary rounded-full h-2 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        {completionPercentage < 100 && (
          <div className="text-sm text-text-muted">
            <strong>Tip:</strong> Complete profiles get 3x more visibility and customer trust
          </div>
        )}
      </Card>

      {/* Success/Error Messages */}
      {success && (
        <Card className="p-4 bg-green-500/10 border-green-500/20 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <span className="text-green-400">✅</span>
            <p className="text-green-400 font-medium">{success}</p>
          </div>
        </Card>
      )}
      
      {error && (
        <Card className="p-4 bg-red-500/10 border-red-500/20 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <span className="text-red-400">❌</span>
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        </Card>
      )}

      {/* Profile Form */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Business Profile</h3>
            <p className="text-text-muted text-sm">Manage your seller profile and business information</p>
          </div>
          <div className="flex space-x-2">
            {!editing ? (
              <Button 
                onClick={() => setEditing(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                ✏️ Edit Profile
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditing(false);
                    setError(null);
                    setSuccess(null);
                    loadProfile(); // Reset form data
                  }}
                  disabled={saving}
                  className="hover:bg-red-500/10 hover:border-red-500 hover:text-red-400"
                >
                  ❌ Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving || !formData.displayName?.trim() || !formData.businessName?.trim() || !formData.bio?.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>💾 Save Changes</>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-text-primary border-b border-neutral-800 pb-2">
              Basic Information
            </h4>
            
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.displayName || ''}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                disabled={!editing || saving}
                placeholder="Your full name"
                className={`w-full px-3 py-2 bg-background-secondary border rounded text-text-primary placeholder-text-muted transition-colors ${
                  !editing || saving ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-500 focus:border-blue-500 focus:outline-none'
                } ${
                  error && !formData.displayName?.trim() ? 'border-red-500' : 'border-neutral-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.businessName || ''}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                disabled={!editing || saving}
                placeholder="Your business or artist name"
                className={`w-full px-3 py-2 bg-background-secondary border rounded text-text-primary placeholder-text-muted transition-colors ${
                  !editing || saving ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-500 focus:border-blue-500 focus:outline-none'
                } ${
                  error && !formData.businessName?.trim() ? 'border-red-500' : 'border-neutral-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Bio <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={!editing || saving}
                placeholder="Tell customers about yourself and your art..."
                rows={4}
                className={`w-full px-3 py-2 bg-background-secondary border rounded text-text-primary placeholder-text-muted transition-colors resize-none ${
                  !editing || saving ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-500 focus:border-blue-500 focus:outline-none'
                } ${
                  error && !formData.bio?.trim() ? 'border-red-500' : 'border-neutral-700'
                }`}
              />
              <p className="text-xs text-text-muted mt-1">{formData.bio?.length || 0}/500 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                disabled={!editing || saving}
                placeholder="City, Country"
                className={`w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary placeholder-text-muted transition-colors ${
                  !editing || saving ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-500 focus:border-blue-500 focus:outline-none'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Phone Number</label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!editing || saving}
                placeholder="+234 XXX XXX XXXX"
                className={`w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary placeholder-text-muted transition-colors ${
                  !editing || saving ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-500 focus:border-blue-500 focus:outline-none'
                }`}
              />
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-text-primary border-b border-neutral-800 pb-2">
              Professional Information
            </h4>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Artist Type *</label>
              <select
                value={formData.artistType || 'other'}
                onChange={(e) => handleInputChange('artistType', e.target.value)}
                disabled={!editing}
                className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary disabled:opacity-50"
              >
                {artistTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Experience Level</label>
              <select
                value={formData.experience || 'intermediate'}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                disabled={!editing}
                className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary disabled:opacity-50"
              >
                {experienceLevels.map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Specialties</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {specialtyOptions.map(specialty => (
                  <label key={specialty} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.specialties?.includes(specialty) || false}
                      onChange={(e) => handleSpecialtiesChange(specialty, e.target.checked)}
                      disabled={!editing}
                      className="rounded text-blue-500"
                    />
                    <span className="text-text-primary capitalize">
                      {specialty.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Website</label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                disabled={!editing}
                placeholder="https://your-website.com"
                className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary placeholder-text-muted disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contactEmail || ''}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                disabled={!editing}
                placeholder="business@email.com"
                className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary placeholder-text-muted disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Social Media Links */}
        <div className="mt-6 pt-6 border-t border-neutral-800">
          <h4 className="font-medium text-text-primary mb-4">Social Media Links</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Instagram</label>
              <input
                type="url"
                value={formData.socialLinks?.instagram || ''}
                onChange={(e) => handleSocialLinksChange('instagram', e.target.value)}
                disabled={!editing}
                placeholder="https://instagram.com/yourusername"
                className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary placeholder-text-muted disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Portfolio Site</label>
              <input
                type="url"
                value={formData.socialLinks?.portfolio || ''}
                onChange={(e) => handleSocialLinksChange('portfolio', e.target.value)}
                disabled={!editing}
                placeholder="https://your-portfolio.com"
                className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary placeholder-text-muted disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Twitter</label>
              <input
                type="url"
                value={formData.socialLinks?.twitter || ''}
                onChange={(e) => handleSocialLinksChange('twitter', e.target.value)}
                disabled={!editing}
                placeholder="https://twitter.com/yourusername"
                className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary placeholder-text-muted disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Facebook</label>
              <input
                type="url"
                value={formData.socialLinks?.facebook || ''}
                onChange={(e) => handleSocialLinksChange('facebook', e.target.value)}
                disabled={!editing}
                placeholder="https://facebook.com/yourpage"
                className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary placeholder-text-muted disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}