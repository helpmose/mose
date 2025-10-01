"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { formatPrice } from '@/lib/utils';
import ProductService from '@/lib/services/product';
import { UserService } from '@/lib/services/user';

interface Product {
  $id: string;
  title: string;
  description: string;
  price: number;
  salePrice?: number;
  images: string[];
  category: string;
  sellerId: string;
  sellerName: string;
  status: 'draft' | 'pending_approval' | 'active' | 'rejected' | 'flagged' | 'sold';
  createdAt: string;
  updatedAt: string;
  flaggedReason?: string;
  viewCount?: number;
  likeCount?: number;
  tags?: string[];
  moderationNotes?: string;
}

interface ProductModerationPanelProps {
  className?: string;
}

export default function ProductModerationPanel({ className = "" }: ProductModerationPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'draft' | 'pending_approval' | 'flagged' | 'active' | 'rejected' | 'sold'>('pending_approval');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [sellerNames, setSellerNames] = useState<Map<string, string>>(new Map());
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    draft: 0,
    pending_approval: 0,
    active: 0,
    rejected: 0,
    flagged: 0,
    sold: 0,
  });
  
  const { user } = useAuthStore();

  // Real-time product loading with seller name resolution
  // Removed mock data - using real ProductService API

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    // Only apply search filtering locally - status filtering is handled by API
    applySearchFilter();
  }, [products, searchQuery]);

  useEffect(() => {
    loadProducts();
  }, [selectedFilter, currentPage, sortBy]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      const limit = 20;
      const offset = (currentPage - 1) * limit;
      
      // Determine status filter for API call
      const statusFilter = selectedFilter === 'all' ? undefined : selectedFilter;
      
      // Load products for moderation with filters
      const response = await ProductService.getProductsForModeration(
        statusFilter,
        limit,
        offset,
        sortBy
      );
      
      // Get unique seller IDs
      const sellerIds = [...new Set(response.products.map(p => p.sellerId))];
      
      // Resolve seller names in parallel
      const sellerNamePromises = sellerIds.map(async (sellerId) => {
        if (!sellerNames.has(sellerId)) {
          try {
            const userProfile = await UserService.getProfile(sellerId);
            return [sellerId, userProfile?.displayName || userProfile?.businessName || 'Unknown Seller'];
          } catch (error) {
            console.warn(`Failed to get seller name for ${sellerId}:`, error);
            return [sellerId, 'Unknown Seller'];
          }
        }
        return [sellerId, sellerNames.get(sellerId)!];
      });
      
      const resolvedNames = await Promise.all(sellerNamePromises);
      const newSellerNames = new Map(sellerNames);
      resolvedNames.forEach(([sellerId, name]) => {
        newSellerNames.set(sellerId, name);
      });
      setSellerNames(newSellerNames);
      
      // Map ProductService Product interface to local Product interface
      const mappedProducts: Product[] = response.products.map(p => ({
        $id: p.$id,
        title: p.title,
        description: p.description,
        price: p.price,
        salePrice: p.salePrice,
        images: p.images,
        category: p.category,
        sellerId: p.sellerId,
        sellerName: newSellerNames.get(p.sellerId) || 'Unknown Seller',
        status: p.status as 'draft' | 'pending_approval' | 'active' | 'rejected' | 'flagged' | 'sold',
        createdAt: p.$createdAt,
        updatedAt: p.$updatedAt,
        flaggedReason: p.moderationNotes,
        moderationNotes: p.moderationNotes,
        viewCount: p.views || 0,
        likeCount: p.likes || 0,
        tags: p.tags || []
      }));
      
      setProducts(mappedProducts);
      setTotalProducts(response.total);
      setTotalPages(Math.ceil(response.total / limit));
      setStatusCounts(response.statusCounts);
      
    } catch (error) {
      console.error('Error loading products for moderation:', error);
      setProducts([]);
      setTotalProducts(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const applySearchFilter = () => {
    let filtered = products;

    // Only apply search filtering - status filtering is handled by API
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.title.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.sellerName.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  const approveProduct = async (productId: string) => {
    if (!user) return;
    
    try {
      setActionLoading(productId);
      
      // Call actual ProductService API
      await ProductService.approveProduct(productId, user.$id);
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.$id === productId ? { ...p, status: 'active' as const, updatedAt: new Date().toISOString() } : p
      ));
      
      console.log('✅ Product approved:', productId);
    } catch (error) {
      console.error('Error approving product:', error);
      alert('Failed to approve product: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const rejectProduct = async (productId: string, reason?: string) => {
    if (!user) return;
    
    try {
      setActionLoading(productId);
      
      // Call actual ProductService API
      await ProductService.rejectProduct(productId, user.$id, reason);
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.$id === productId ? { 
          ...p, 
          status: 'rejected' as const, 
          updatedAt: new Date().toISOString(),
          moderationNotes: reason 
        } : p
      ));
      
      console.log('❌ Product rejected:', productId);
    } catch (error) {
      console.error('Error rejecting product:', error);
      alert('Failed to reject product: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const flagProduct = async (productId: string, reason: string) => {
    if (!user) return;
    
    try {
      setActionLoading(productId);
      
      // Call actual ProductService API
      await ProductService.flagProduct(productId, user.$id, reason);
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.$id === productId ? { 
          ...p, 
          status: 'flagged' as const, 
          updatedAt: new Date().toISOString(),
          flaggedReason: reason 
        } : p
      ));
      
      console.log('🚩 Product flagged:', productId);
    } catch (error) {
      console.error('Error flagging product:', error);
      alert('Failed to flag product: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-blue-500 bg-blue-500/10';
      case 'pending_approval': return 'text-yellow-500 bg-yellow-500/10';
      case 'active': return 'text-green-500 bg-green-500/10';
      case 'flagged': return 'text-red-500 bg-red-500/10';
      case 'rejected': return 'text-gray-500 bg-gray-500/10';
      case 'sold': return 'text-purple-500 bg-purple-500/10';
      default: return 'text-text-muted bg-background-tertiary';
    }
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
          <p className="text-text-muted">Loading products for moderation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Product Moderation</h2>
          <p className="text-text-muted">Review and moderate product listings</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-background-secondary border border-neutral-700 text-text-primary rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-text-primary"
          />
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <FilterButton filter="all" label="All" count={statusCounts.all} />
        <FilterButton filter="draft" label="Draft" count={statusCounts.draft} />
        <FilterButton filter="pending_approval" label="Pending Review" count={statusCounts.pending_approval} />
        <FilterButton filter="flagged" label="Flagged" count={statusCounts.flagged} />
        <FilterButton filter="active" label="Active" count={statusCounts.active} />
        <FilterButton filter="rejected" label="Rejected" count={statusCounts.rejected} />
        <FilterButton filter="sold" label="Sold" count={statusCounts.sold} />
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-background-secondary rounded-full flex items-center justify-center">
            <span className="text-2xl">🛍️</span>
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">No products found</h3>
          <p className="text-text-muted">
            {searchQuery ? 'No products match your search criteria.' : 'No products in this category.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.$id} className="overflow-hidden">
              <div className="flex">
                {/* Product Image */}
                <div className="relative w-32 h-32 flex-shrink-0">
                  <Image
                    src={product.images[0] || '/placeholder-product.svg'}
                    alt={product.title}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Product Details */}
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-text-primary line-clamp-1">{product.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                      {product.status}
                    </span>
                  </div>

                  <p className="text-text-muted text-sm mb-3 line-clamp-2">{product.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        {product.salePrice ? (
                          <>
                            <span className="font-bold text-text-primary">{formatPrice(product.salePrice / 100)}</span>
                            <span className="text-sm text-text-muted line-through">{formatPrice(product.price / 100)}</span>
                          </>
                        ) : (
                          <span className="font-bold text-text-primary">{formatPrice(product.price / 100)}</span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted">by {product.sellerName}</div>
                    </div>
                    <div className="text-xs text-text-muted">
                      {product.viewCount} views • {product.likeCount} likes
                    </div>
                  </div>

                  {/* Tags */}
                  {product.tags && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {product.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-background-tertiary text-xs rounded">
                          #{tag}
                        </span>
                      ))}
                      {product.tags.length > 3 && (
                        <span className="px-2 py-1 bg-background-tertiary text-xs rounded text-text-muted">
                          +{product.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Flagged/Rejection Reason */}
                  {(product.flaggedReason || product.moderationNotes) && (
                    <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs">
                      <strong>Issue:</strong> {product.flaggedReason || product.moderationNotes}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {product.status === 'draft' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/products/${product.$id}`, '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveProduct(product.$id)}
                          disabled={actionLoading === product.$id}
                        >
                          {actionLoading === product.$id ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={() => {
                            const reason = prompt('Reason for rejection:');
                            if (reason) rejectProduct(product.$id, reason);
                          }}
                          disabled={actionLoading === product.$id}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {product.status === 'pending_approval' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/products/${product.$id}`, '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveProduct(product.$id)}
                          disabled={actionLoading === product.$id}
                        >
                          {actionLoading === product.$id ? 'Approving...' : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={() => {
                            const reason = prompt('Reason for rejection:');
                            if (reason) rejectProduct(product.$id, reason);
                          }}
                          disabled={actionLoading === product.$id}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {product.status === 'flagged' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/products/${product.$id}`, '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveProduct(product.$id)}
                          disabled={actionLoading === product.$id}
                        >
                          Clear Flag
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          onClick={() => {
                            const reason = prompt('Reason for removal:');
                            if (reason) rejectProduct(product.$id, reason);
                          }}
                          disabled={actionLoading === product.$id}
                        >
                          Remove
                        </Button>
                      </>
                    )}

                    {(product.status === 'active' || product.status === 'rejected') && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/products/${product.$id}`, '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                          onClick={() => {
                            const reason = prompt('Reason for flagging:');
                            if (reason) flagProduct(product.$id, reason);
                          }}
                          disabled={actionLoading === product.$id}
                        >
                          Flag
                        </Button>
                      </>
                    )}

                    {product.status === 'sold' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/products/${product.$id}`, '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveProduct(product.$id)}
                          disabled={actionLoading === product.$id}
                        >
                          Restore to Active
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
                          onClick={() => {
                            const reason = prompt('Reason for flagging:');
                            if (reason) flagProduct(product.$id, reason);
                          }}
                          disabled={actionLoading === product.$id}
                        >
                          Flag
                        </Button>
                      </>
                    )}

                  </div>

                  {/* Metadata */}
                  <div className="mt-2 text-xs text-text-muted">
                    Created: {new Date(product.createdAt).toLocaleDateString()} • 
                    Updated: {new Date(product.updatedAt).toLocaleDateString()}
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