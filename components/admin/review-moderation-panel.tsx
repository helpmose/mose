"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';

interface Review {
  $id: string;
  productId: string;
  productTitle: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  status: 'active' | 'flagged' | 'hidden' | 'reported';
  flaggedReason?: string;
  reportedBy?: string[];
  reportReasons?: string[];
  createdAt: string;
  updatedAt: string;
  helpfulCount: number;
  isVerifiedPurchase: boolean;
}

interface ReviewModerationPanelProps {
  className?: string;
}

export default function ReviewModerationPanel({ className = "" }: ReviewModerationPanelProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'flagged' | 'reported' | 'active' | 'hidden'>('reported');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { user } = useAuthStore();

  // Mock data - replace with actual API calls
  const mockReviews: Review[] = [
    {
      $id: '1',
      productId: 'prod1',
      productTitle: 'Traditional African Mask',
      userId: 'user1',
      userName: 'John Doe',
      rating: 1,
      title: 'Terrible quality',
      comment: 'This product is absolute garbage. The seller is a scammer and should be banned from the platform. Waste of money!',
      status: 'reported',
      reportedBy: ['user2', 'user3'],
      reportReasons: ['Inappropriate language', 'False claims'],
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      helpfulCount: 2,
      isVerifiedPurchase: true
    },
    {
      $id: '2',
      productId: 'prod2',
      productTitle: 'Modern Abstract Painting',
      userId: 'user2',
      userName: 'Jane Smith',
      rating: 5,
      title: 'Amazing artwork!',
      comment: 'Beautiful piece of art. The colors are vibrant and the quality is excellent. Highly recommend!',
      status: 'active',
      createdAt: '2024-01-14T15:20:00Z',
      updatedAt: '2024-01-14T15:20:00Z',
      helpfulCount: 15,
      isVerifiedPurchase: true
    },
    {
      $id: '3',
      productId: 'prod3',
      productTitle: 'Kente Cloth Textile',
      userId: 'user3',
      userName: 'Mike Johnson',
      rating: 2,
      title: 'Not as described',
      comment: 'The product looks different from the photos. Contains offensive content that should not be allowed.',
      images: ['/placeholder-review.jpg'],
      status: 'flagged',
      flaggedReason: 'Potentially inappropriate content',
      createdAt: '2024-01-13T12:45:00Z',
      updatedAt: '2024-01-15T09:15:00Z',
      helpfulCount: 3,
      isVerifiedPurchase: false
    },
    {
      $id: '4',
      productId: 'prod4',
      productTitle: 'Beaded Jewelry Set',
      userId: 'user4',
      userName: 'Sarah Wilson',
      rating: 4,
      title: 'Good quality',
      comment: 'Nice jewelry set. The beads are well made and the colors match the description.',
      status: 'hidden',
      createdAt: '2024-01-12T08:30:00Z',
      updatedAt: '2024-01-13T14:20:00Z',
      helpfulCount: 8,
      isVerifiedPurchase: true
    }
  ];

  useEffect(() => {
    loadReviews();
  }, []);

  useEffect(() => {
    filterReviews();
  }, [reviews, selectedFilter, searchQuery]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await ReviewService.getReviewsForModeration();
      
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReviews(mockReviews);
    } catch (error) {
      console.error('Error loading reviews for moderation:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterReviews = () => {
    let filtered = reviews;

    // Filter by status
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(review => review.status === selectedFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(review => 
        review.title.toLowerCase().includes(query) ||
        review.comment.toLowerCase().includes(query) ||
        review.productTitle.toLowerCase().includes(query) ||
        review.userName.toLowerCase().includes(query)
      );
    }

    setFilteredReviews(filtered);
  };

  const approveReview = async (reviewId: string) => {
    if (!user) return;
    
    try {
      setActionLoading(reviewId);
      // TODO: Call actual API
      // await ReviewService.approveReview(reviewId, user.$id);
      
      // Mock API delay and update local state
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReviews(prev => prev.map(r => 
        r.$id === reviewId ? { ...r, status: 'active' as const, updatedAt: new Date().toISOString() } : r
      ));
      
      console.log('✅ Review approved:', reviewId);
    } catch (error) {
      console.error('Error approving review:', error);
      alert('Failed to approve review');
    } finally {
      setActionLoading(null);
    }
  };

  const hideReview = async (reviewId: string, reason?: string) => {
    if (!user) return;
    
    try {
      setActionLoading(reviewId);
      // TODO: Call actual API  
      // await ReviewService.hideReview(reviewId, user.$id, reason);
      
      // Mock API delay and update local state
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReviews(prev => prev.map(r => 
        r.$id === reviewId ? { 
          ...r, 
          status: 'hidden' as const, 
          updatedAt: new Date().toISOString(),
          flaggedReason: reason 
        } : r
      ));
      
      console.log('👁️ Review hidden:', reviewId);
    } catch (error) {
      console.error('Error hiding review:', error);
      alert('Failed to hide review');
    } finally {
      setActionLoading(null);
    }
  };

  const flagReview = async (reviewId: string, reason: string) => {
    if (!user) return;
    
    try {
      setActionLoading(reviewId);
      // TODO: Call actual API
      // await ReviewService.flagReview(reviewId, user.$id, reason);
      
      // Mock API delay and update local state
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReviews(prev => prev.map(r => 
        r.$id === reviewId ? { 
          ...r, 
          status: 'flagged' as const, 
          updatedAt: new Date().toISOString(),
          flaggedReason: reason 
        } : r
      ));
      
      console.log('🚩 Review flagged:', reviewId);
    } catch (error) {
      console.error('Error flagging review:', error);
      alert('Failed to flag review');
    } finally {
      setActionLoading(null);
    }
  };

  const restoreReview = async (reviewId: string) => {
    if (!user) return;
    
    try {
      setActionLoading(reviewId);
      // TODO: Call actual API
      // await ReviewService.restoreReview(reviewId, user.$id);
      
      // Mock API delay and update local state
      await new Promise(resolve => setTimeout(resolve, 1000));
      setReviews(prev => prev.map(r => 
        r.$id === reviewId ? { 
          ...r, 
          status: 'active' as const, 
          updatedAt: new Date().toISOString(),
          flaggedReason: undefined 
        } : r
      ));
      
      console.log('🔄 Review restored:', reviewId);
    } catch (error) {
      console.error('Error restoring review:', error);
      alert('Failed to restore review');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'flagged': return 'text-yellow-500 bg-yellow-500/10';
      case 'reported': return 'text-red-500 bg-red-500/10';
      case 'hidden': return 'text-gray-500 bg-gray-500/10';
      default: return 'text-text-muted bg-background-tertiary';
    }
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-500' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  const FilterButton = ({ filter, label, count }: { filter: typeof selectedFilter, label: string, count: number }) => (
    <button
      onClick={() => setSelectedFilter(filter)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        selectedFilter === filter 
          ? 'bg-text-primary text-background-primary' 
          : 'text-text-muted hover:text-text-primary bg-background-secondary hover:bg-background-tertiary'
      }`}
    >
      {label} ({count})
    </button>
  );

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading reviews for moderation...</p>
        </div>
      </div>
    );
  }

  const filterCounts = {
    all: reviews.length,
    reported: reviews.filter(r => r.status === 'reported').length,
    flagged: reviews.filter(r => r.status === 'flagged').length,
    active: reviews.filter(r => r.status === 'active').length,
    hidden: reviews.filter(r => r.status === 'hidden').length,
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Review Moderation</h2>
          <p className="text-text-muted">Monitor and moderate user reviews for quality and appropriateness</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background-secondary border border-neutral-700 text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-text-primary"
          />
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <FilterButton filter="all" label="All Reviews" count={filterCounts.all} />
        <FilterButton filter="reported" label="Reported" count={filterCounts.reported} />
        <FilterButton filter="flagged" label="Flagged" count={filterCounts.flagged} />
        <FilterButton filter="active" label="Active" count={filterCounts.active} />
        <FilterButton filter="hidden" label="Hidden" count={filterCounts.hidden} />
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-background-secondary rounded-full flex items-center justify-center">
            <span className="text-2xl">⭐</span>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No reviews found</h3>
          <p className="text-text-muted">
            {searchQuery ? 'No reviews match your search criteria.' : 'No reviews in this category.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <Card key={review.$id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {/* Review Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-text-primary">{review.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                          {review.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getRatingStars(review.rating)}
                    </div>
                  </div>

                  {/* Product and User Info */}
                  <div className="flex items-center space-x-4 mb-3 text-sm text-text-muted">
                    <span>Product: <span className="text-text-primary">{review.productTitle}</span></span>
                    <span>•</span>
                    <span>By: <span className="text-text-primary">{review.userName}</span></span>
                    <span>•</span>
                    <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    {review.isVerifiedPurchase && (
                      <>
                        <span>•</span>
                        <span className="text-green-500 font-medium">✓ Verified Purchase</span>
                      </>
                    )}
                  </div>

                  {/* Review Content */}
                  <p className="text-text-primary mb-3 leading-relaxed">{review.comment}</p>

                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex space-x-2 mb-3">
                      {review.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review image ${index + 1}`}
                          className="w-16 h-16 object-cover rounded border border-neutral-700"
                        />
                      ))}
                    </div>
                  )}

                  {/* Reported/Flagged Information */}
                  {(review.reportReasons || review.flaggedReason) && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
                      <p className="text-sm font-medium text-red-400 mb-1">
                        {review.status === 'reported' ? 'Reported Issues:' : 'Flagged Reason:'}
                      </p>
                      {review.reportReasons ? (
                        <ul className="text-xs text-red-300 space-y-1">
                          {review.reportReasons.map((reason, index) => (
                            <li key={index}>• {reason}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-red-300">{review.flaggedReason}</p>
                      )}
                      {review.reportedBy && (
                        <p className="text-xs text-text-muted mt-1">
                          Reported by {review.reportedBy.length} user{review.reportedBy.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Review Stats */}
                  <div className="flex items-center space-x-4 text-xs text-text-muted mb-4">
                    <span>👍 {review.helpfulCount} helpful</span>
                    <span>Updated: {new Date(review.updatedAt).toLocaleDateString()}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {review.status === 'reported' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveReview(review.$id)}
                          disabled={actionLoading === review.$id}
                        >
                          {actionLoading === review.$id ? 'Approving...' : 'Keep Review'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={() => {
                            const reason = prompt('Reason for hiding review:');
                            if (reason) hideReview(review.$id, reason);
                          }}
                          disabled={actionLoading === review.$id}
                        >
                          Hide Review
                        </Button>
                      </>
                    )}
                    
                    {review.status === 'flagged' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveReview(review.$id)}
                          disabled={actionLoading === review.$id}
                        >
                          Clear Flag
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={() => {
                            const reason = prompt('Reason for hiding review:');
                            if (reason) hideReview(review.$id, reason);
                          }}
                          disabled={actionLoading === review.$id}
                        >
                          Hide Review
                        </Button>
                      </>
                    )}

                    {review.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                        onClick={() => {
                          const reason = prompt('Reason for flagging review:');
                          if (reason) flagReview(review.$id, reason);
                        }}
                        disabled={actionLoading === review.$id}
                      >
                        Flag Review
                      </Button>
                    )}

                    {review.status === 'hidden' && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => restoreReview(review.$id)}
                        disabled={actionLoading === review.$id}
                      >
                        Restore Review
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`/products/${review.productId}#review-${review.$id}`, '_blank')}
                    >
                      View on Product
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}