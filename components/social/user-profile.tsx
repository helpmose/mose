"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UserProfileProps {
  user: User;
  isOwnProfile?: boolean;
  onFollow?: () => void;
  onUnfollow?: () => void;
  isFollowing?: boolean;
}

export default function UserProfile({
  user,
  isOwnProfile = false,
  onFollow,
  onUnfollow,
  isFollowing = false
}: UserProfileProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const socialLinks = user.socialProfile?.socialLinks || {};
  const stats = user.stats || {
    totalOrders: 0,
    totalSpent: 0,
    reviewsGiven: 0,
    wishlistItems: 0,
    followersCount: 0,
    followingCount: 0,
    joinedDate: user.createdAt
  };

  const achievements = user.socialProfile?.achievements || [];
  const loyaltyPoints = user.socialProfile?.loyaltyPoints || 0;

  const handleFollowToggle = () => {
    if (isFollowing && onUnfollow) {
      onUnfollow();
    } else if (!isFollowing && onFollow) {
      onFollow();
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "👤" },
    { id: "achievements", label: "Achievements", icon: "🏆" },
    { id: "activity", label: "Activity", icon: "📊" },
  ];

  if (user.role === 'seller') {
    tabs.push({ id: "portfolio", label: "Portfolio", icon: "🎨" });
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 bg-background-secondary rounded-full overflow-hidden">
              {user.avatar ? (
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {/* Verification Badge */}
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">{user.name}</h1>
                <p className="text-text-muted">
                  {user.role === 'seller' ? 'Artist' : 'Art Enthusiast'}
                  {user.role === 'seller' && user.sellerProfile?.location && (
                    <span> • {user.sellerProfile.location}</span>
                  )}
                </p>
                {user.socialProfile?.bio && (
                  <p className="text-text-secondary mt-2">{user.socialProfile.bio}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {!isOwnProfile && (
                  <Button
                    onClick={handleFollowToggle}
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}
                
                {isOwnProfile && (
                  <Button variant="outline" size="sm">
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-xl font-semibold text-text-primary">{stats.followersCount}</div>
                <div className="text-sm text-text-muted">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-text-primary">{stats.followingCount}</div>
                <div className="text-sm text-text-muted">Following</div>
              </div>
              {user.role === 'seller' && user.sellerProfile && (
                <>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-text-primary">{user.sellerProfile.totalSales}</div>
                    <div className="text-sm text-text-muted">Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-text-primary">{user.sellerProfile.rating.toFixed(1)}</div>
                    <div className="text-sm text-text-muted">Rating</div>
                  </div>
                </>
              )}
              {user.role === 'buyer' && (
                <>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-text-primary">{stats.totalOrders}</div>
                    <div className="text-sm text-text-muted">Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-semibold text-text-primary">{loyaltyPoints}</div>
                    <div className="text-sm text-text-muted">Points</div>
                  </div>
                </>
              )}
            </div>

            {/* Social Links */}
            {Object.keys(socialLinks).length > 0 && (
              <div className="flex items-center space-x-3">
                {socialLinks.website && (
                  <Link href={socialLinks.website} target="_blank" className="text-text-muted hover:text-text-primary">
                    🌐
                  </Link>
                )}
                {socialLinks.instagram && (
                  <Link href={socialLinks.instagram} target="_blank" className="text-text-muted hover:text-text-primary">
                    📷
                  </Link>
                )}
                {socialLinks.facebook && (
                  <Link href={socialLinks.facebook} target="_blank" className="text-text-muted hover:text-text-primary">
                    📘
                  </Link>
                )}
                {socialLinks.twitter && (
                  <Link href={socialLinks.twitter} target="_blank" className="text-text-muted hover:text-text-primary">
                    🐦
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-text-primary text-text-primary"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-text-secondary">Joined MOSÉ marketplace</span>
                  <span className="text-text-muted text-sm ml-auto">
                    {new Date(stats.joinedDate).toLocaleDateString()}
                  </span>
                </div>
                {stats.totalOrders > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-text-secondary">Made {stats.totalOrders} purchases</span>
                  </div>
                )}
                {stats.reviewsGiven > 0 && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-text-secondary">Left {stats.reviewsGiven} reviews</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Achievements Preview */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Latest Achievements</h3>
              {achievements.length > 0 ? (
                <div className="space-y-3">
                  {achievements.slice(0, 3).map((achievement) => (
                    <div key={achievement.id} className="flex items-center space-x-3">
                      <span className="text-2xl">{achievement.icon}</span>
                      <div>
                        <div className="font-medium text-text-primary">{achievement.title}</div>
                        <div className="text-sm text-text-muted">{achievement.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-text-muted">No achievements yet. Start exploring to earn badges!</p>
              )}
            </Card>
          </div>
        )}

        {activeTab === "achievements" && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">All Achievements</h3>
            {achievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="p-4 bg-background-secondary rounded-lg">
                    <div className="text-center">
                      <span className="text-4xl">{achievement.icon}</span>
                      <h4 className="font-medium text-text-primary mt-2">{achievement.title}</h4>
                      <p className="text-sm text-text-muted mt-1">{achievement.description}</p>
                      <p className="text-xs text-text-muted mt-2">
                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl">🏆</span>
                <h4 className="text-lg font-medium text-text-primary mt-2">No achievements yet</h4>
                <p className="text-text-muted">Start your journey to unlock amazing badges!</p>
              </div>
            )}
          </Card>
        )}

        {activeTab === "activity" && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Activity Feed</h3>
            <div className="space-y-4">
              <div className="text-center py-8">
                <span className="text-4xl">📊</span>
                <h4 className="text-lg font-medium text-text-primary mt-2">Activity feed coming soon</h4>
                <p className="text-text-muted">Stay tuned for updates on user activities!</p>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "portfolio" && user.role === 'seller' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Artist Portfolio</h3>
            <div className="text-center py-8">
              <span className="text-4xl">🎨</span>
              <h4 className="text-lg font-medium text-text-primary mt-2">Portfolio coming soon</h4>
              <p className="text-text-muted">Showcase your amazing artworks here!</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
