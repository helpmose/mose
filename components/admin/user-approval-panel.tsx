"use client";

import { useState, useEffect } from 'react';
import { UserService, type UserProfile } from '@/lib/services/user';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface UserApprovalPanelProps {
  className?: string;
}

export default function UserApprovalPanel({ className = "" }: UserApprovalPanelProps) {
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'all' | 'sellers' | 'buyers'>('pending');
  const [stats, setStats] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'suspended'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'rating'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  const { user } = useAuthStore();

  useEffect(() => {
    loadUserData();
    setCurrentPage(1); // Reset page when tab changes
  }, [selectedTab, searchQuery, statusFilter, sortBy, currentPage]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Load user stats
      const userStats = await UserService.getUserStats();
      setStats(userStats);
      
      const limit = 20;
      const offset = (currentPage - 1) * limit;
      
      if (selectedTab === 'pending') {
        // Load pending users (unverified)
        const pendingResponse = await UserService.getAllUsers(undefined, false, limit, offset);
        let filteredUsers = pendingResponse.profiles;
        
        // Apply search filter
        if (searchQuery) {
          filteredUsers = filteredUsers.filter(u => 
            u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.userId.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        setPendingUsers(filteredUsers);
        setTotalPages(Math.ceil(pendingResponse.total / limit));
      } else if (selectedTab === 'sellers' || selectedTab === 'buyers') {
        // Load specific user type
        const response = await UserService.getAllUsers(selectedTab === 'sellers' ? 'seller' : 'buyer', undefined, limit, offset);
        let filteredUsers = response.profiles;
        
        // Apply filters
        if (statusFilter !== 'all') {
          filteredUsers = filteredUsers.filter(u => {
            switch (statusFilter) {
              case 'verified': return u.isVerified;
              case 'unverified': return !u.isVerified;
              case 'suspended': return !u.isActive;
              default: return true;
            }
          });
        }
        
        if (searchQuery) {
          filteredUsers = filteredUsers.filter(u => 
            u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.userId.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        // Apply sorting
        filteredUsers.sort((a, b) => {
          switch (sortBy) {
            case 'newest': return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
            case 'oldest': return new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime();
            case 'name': return (a.displayName || '').localeCompare(b.displayName || '');
            case 'rating': return (b.rating || 0) - (a.rating || 0);
            default: return 0;
          }
        });
        
        setAllUsers(filteredUsers);
        setTotalPages(Math.ceil(response.total / limit));
      } else {
        // Load all users
        const allResponse = await UserService.getAllUsers(undefined, undefined, limit, offset);
        let filteredUsers = allResponse.profiles;
        
        if (searchQuery) {
          filteredUsers = filteredUsers.filter(u => 
            u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.userId.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        
        setAllUsers(filteredUsers);
        setTotalPages(Math.ceil(allResponse.total / limit));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    if (!user) return;
    
    try {
      setActionLoading(userId);
      await UserService.approveUser(userId, user.$id);
      await loadUserData(); // Refresh data
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectUser = async (userId: string, reason?: string) => {
    if (!user) return;
    
    try {
      setActionLoading(userId);
      await UserService.rejectUser(userId, user.$id, reason);
      await loadUserData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };

  const suspendUser = async (userId: string, reason?: string) => {
    if (!user) return;
    
    try {
      setActionLoading(userId);
      await UserService.suspendUser(userId, user.$id, reason);
      await loadUserData(); // Refresh data
    } catch (error) {
      console.error('Error suspending user:', error);
      alert('Failed to suspend user');
    } finally {
      setActionLoading(null);
    }
  };

  const reactivateUser = async (userId: string) => {
    if (!user) return;
    
    try {
      setActionLoading(userId);
      await UserService.reactivateUser(userId, user.$id);
      await loadUserData(); // Refresh data
    } catch (error) {
      console.error('Error reactivating user:', error);
      alert('Failed to reactivate user');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const selectAllUsers = () => {
    const currentUsers = selectedTab === 'pending' ? pendingUsers : allUsers;
    const allUserIds = new Set(currentUsers.map(u => u.userId));
    setSelectedUsers(allUserIds);
    setShowBulkActions(allUserIds.size > 0);
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
    setShowBulkActions(false);
  };

  const bulkApprove = async () => {
    if (!user || selectedUsers.size === 0) return;
    
    try {
      setActionLoading('bulk');
      const promises = Array.from(selectedUsers).map(userId => 
        UserService.approveUser(userId, user.$id)
      );
      await Promise.all(promises);
      clearSelection();
      await loadUserData();
    } catch (error) {
      console.error('Error bulk approving users:', error);
      alert('Failed to approve some users');
    } finally {
      setActionLoading(null);
    }
  };

  const bulkReject = async () => {
    if (!user || selectedUsers.size === 0) return;
    
    const reason = prompt('Reason for bulk rejection (optional):');
    
    try {
      setActionLoading('bulk');
      const promises = Array.from(selectedUsers).map(userId => 
        UserService.rejectUser(userId, user.$id, reason || undefined)
      );
      await Promise.all(promises);
      clearSelection();
      await loadUserData();
    } catch (error) {
      console.error('Error bulk rejecting users:', error);
      alert('Failed to reject some users');
    } finally {
      setActionLoading(null);
    }
  };

  const UserCard = ({ profile, showCheckbox = false }: { profile: UserProfile; showCheckbox?: boolean }) => (
    <div className={`bg-background-secondary border border-neutral-800 rounded-lg p-6 transition-colors ${
      selectedUsers.has(profile.userId) ? 'border-blue-500 bg-blue-500/5' : ''
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          {showCheckbox && (
            <input
              type="checkbox"
              checked={selectedUsers.has(profile.userId)}
              onChange={() => toggleUserSelection(profile.userId)}
              className="w-4 h-4 text-blue-600 rounded border-neutral-600 bg-neutral-700"
            />
          )}
          <div className="w-12 h-12 bg-neutral-700 rounded-full flex items-center justify-center">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.displayName} className="w-12 h-12 rounded-full" />
            ) : (
              <span className="text-text-primary font-medium">
                {profile.displayName?.charAt(0) || profile.userId.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-text-primary font-medium">{profile.displayName || 'Unknown User'}</h3>
            <p className="text-text-muted text-sm">{profile.userId}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                profile.userType === 'seller' ? 'bg-blue-500/20 text-blue-400' :
                profile.userType === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {profile.userType}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                profile.isVerified ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {profile.isVerified ? 'Verified' : 'Pending'}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                profile.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {profile.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {profile.businessName && (
        <div className="mb-3">
          <p className="text-text-secondary text-sm">Business: <span className="text-text-primary">{profile.businessName}</span></p>
        </div>
      )}

      {profile.bio && (
        <div className="mb-4">
          <p className="text-text-muted text-sm">{profile.bio}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-text-secondary">Location:</span>
          <span className="text-text-primary ml-2">{profile.location || 'Not specified'}</span>
        </div>
        <div>
          <span className="text-text-secondary">Joined:</span>
          <span className="text-text-primary ml-2">
            {profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : 'Unknown'}
          </span>
        </div>
        {profile.userType === 'seller' && (
          <>
            <div>
              <span className="text-text-secondary">Rating:</span>
              <span className="text-text-primary ml-2">{profile.rating?.toFixed(1) || '0.0'} ⭐</span>
            </div>
            <div>
              <span className="text-text-secondary">Sales:</span>
              <span className="text-text-primary ml-2">₦{profile.totalSales || 0}</span>
            </div>
          </>
        )}
      </div>

      <div className="flex space-x-2">
        {!profile.isVerified && profile.isActive && (
          <>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => approveUser(profile.userId)}
              disabled={actionLoading === profile.userId}
            >
              {actionLoading === profile.userId ? 'Approving...' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
              onClick={() => {
                const reason = prompt('Reason for rejection (optional):');
                rejectUser(profile.userId, reason || undefined);
              }}
              disabled={actionLoading === profile.userId}
            >
              Reject
            </Button>
          </>
        )}
        {profile.isActive ? (
          <Button
            size="sm"
            variant="outline"
            className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
            onClick={() => {
              const reason = prompt('Reason for suspension (optional):');
              suspendUser(profile.userId, reason || undefined);
            }}
            disabled={actionLoading === profile.userId}
          >
            Suspend
          </Button>
        ) : (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => reactivateUser(profile.userId)}
            disabled={actionLoading === profile.userId}
          >
            Reactivate
          </Button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-background-secondary border border-neutral-800 rounded-lg p-4">
            <p className="text-text-muted text-sm">Total Users</p>
            <p className="text-2xl font-bold text-text-primary">{stats.totalUsers}</p>
          </div>
          <div className="bg-background-secondary border border-neutral-800 rounded-lg p-4">
            <p className="text-text-muted text-sm">Active</p>
            <p className="text-2xl font-bold text-green-400">{stats.activeUsers}</p>
          </div>
          <div className="bg-background-secondary border border-neutral-800 rounded-lg p-4">
            <p className="text-text-muted text-sm">Verified</p>
            <p className="text-2xl font-bold text-blue-400">{stats.verifiedUsers}</p>
          </div>
          <div className="bg-background-secondary border border-neutral-800 rounded-lg p-4">
            <p className="text-text-muted text-sm">Sellers</p>
            <p className="text-2xl font-bold text-purple-400">{stats.usersByType.sellers}</p>
          </div>
          <div className="bg-background-secondary border border-neutral-800 rounded-lg p-4">
            <p className="text-text-muted text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.pendingVerifications}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by name, business, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
              <option value="suspended">Suspended</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-background-secondary border border-neutral-700 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="name">By Name</option>
              <option value="rating">By Rating</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 bg-background-tertiary rounded-lg p-1">
        <button
          className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'pending' 
              ? 'bg-text-primary text-background-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
          onClick={() => setSelectedTab('pending')}
        >
          Pending ({pendingUsers.length})
        </button>
        <button
          className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'sellers' 
              ? 'bg-text-primary text-background-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
          onClick={() => setSelectedTab('sellers')}
        >
          Sellers ({stats?.usersByType.sellers || 0})
        </button>
        <button
          className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'buyers' 
              ? 'bg-text-primary text-background-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
          onClick={() => setSelectedTab('buyers')}
        >
          Buyers ({stats?.usersByType.buyers || 0})
        </button>
        <button
          className={`py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            selectedTab === 'all' 
              ? 'bg-text-primary text-background-primary' 
              : 'text-text-muted hover:text-text-primary'
          }`}
          onClick={() => setSelectedTab('all')}
        >
          All Users ({stats?.totalUsers || 0})
        </button>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && selectedTab === 'pending' && (
        <Card className="p-4 mb-6 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-text-primary font-medium">
                {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={bulkApprove}
                disabled={actionLoading === 'bulk'}
              >
                {actionLoading === 'bulk' ? 'Processing...' : 'Approve All'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                onClick={bulkReject}
                disabled={actionLoading === 'bulk'}
              >
                Reject All
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Select All Controls */}
      {selectedTab === 'pending' && pendingUsers.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={selectAllUsers}
            >
              Select All ({selectedTab === 'pending' ? pendingUsers.length : allUsers.length})
            </Button>
            {selectedUsers.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
              >
                Clear Selection
              </Button>
            )}
          </div>
        </div>
      )}

      {/* User List */}
      <div className="space-y-4">
        {selectedTab === 'pending' ? (
          pendingUsers.length > 0 ? (
            pendingUsers.map((user) => (
              <UserCard key={user.$id} profile={user} showCheckbox={true} />
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-500/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
              <p className="text-text-muted">No pending approvals</p>
            </div>
          )
        ) : (
          (selectedTab === 'sellers' || selectedTab === 'buyers' || selectedTab === 'all' ? allUsers : []).length > 0 ? (
            (selectedTab === 'sellers' || selectedTab === 'buyers' || selectedTab === 'all' ? allUsers : []).map((user) => (
              <UserCard key={user.$id} profile={user} />
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-text-muted">No users found</p>
              {searchQuery && (
                <p className="text-text-muted text-sm mt-2">Try adjusting your search or filters</p>
              )}
            </div>
          )
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="p-4 mt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
              >
                Previous
              </Button>
              <span className="text-text-muted text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
              >
                Next
              </Button>
            </div>
            <div className="text-text-muted text-sm">
              Showing {selectedTab === 'pending' ? pendingUsers.length : allUsers.length} users
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}