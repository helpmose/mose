"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import ProductGrid from "@/components/marketplace/product-grid";
import SearchFilters from "@/components/marketplace/search-filters";
import { Product } from "@/lib/types";
import ProductService, { ProductFilters } from "@/lib/services/product";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'popular' | 'rating'>('newest');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  const PRODUCTS_PER_PAGE = 12;

  // Load products from backend
  const loadProducts = async (loadMore: boolean = false) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const filters: ProductFilters = {
        ...(searchQuery && { search: searchQuery }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(priceRange[0] > 0 && { priceMin: priceRange[0] }),
        ...(priceRange[1] > 0 && { priceMax: priceRange[1] }),
        ...(selectedLocation && { location: selectedLocation }),
        sortBy,
        limit: PRODUCTS_PER_PAGE,
        offset: loadMore ? currentPage * PRODUCTS_PER_PAGE : 0,
      };
      
      console.log('🔄 Loading products with filters:', filters);
      const response = await ProductService.getProducts(filters);
      
      if (loadMore) {
        setProducts(prev => [...prev, ...response.products]);
      } else {
        setProducts(response.products);
        setCurrentPage(0);
      }
      
      setTotalProducts(response.total);
      setHasMore(response.hasMore);
      
      console.log(`✅ Loaded ${response.products.length} products (${response.total} total)`);
    } catch (error) {
      console.error('❌ Error loading products:', error);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load more products for pagination
  const loadMoreProducts = () => {
    if (!isLoading && hasMore) {
      setCurrentPage(prev => prev + 1);
      loadProducts(true);
    }
  };

  // Initial load
  useEffect(() => {
    loadProducts();
  }, []);
  
  // Reload when filters change
  useEffect(() => {
    if (products.length > 0) { // Only reload if we have loaded initially
      loadProducts();
    }
  }, [searchQuery, selectedCategory, priceRange, selectedLocation, sortBy]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setPriceRange([0, 0]);
    setSelectedLocation("");
    setSortBy('newest');
  };
  
  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy as any);
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-light mb-4">Marketplace</h1>
          <p className="text-text-muted text-lg">
            Discover authentic African art and handcrafted treasures from talented artisans
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <SearchFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-medium text-text-primary">
              {isLoading ? 'Loading...' : `${totalProducts} Products Found`}
            </h2>
            {(searchQuery || selectedCategory || priceRange[0] > 0 || priceRange[1] > 0 || selectedLocation) && (
              <p className="text-text-muted text-sm mt-1">
                Showing results for your search criteria
              </p>
            )}
            {error && (
              <p className="text-red-500 text-sm mt-1">
                {error}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <select 
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-background-secondary border border-neutral-700 text-text-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-text-primary"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <ProductGrid 
          products={products}
          loading={isLoading && products.length === 0}
          emptyMessage={error || "Try adjusting your search criteria or browse all categories"}
        />

        {/* Load More Button */}
        {hasMore && products.length > 0 && (
          <div className="text-center mt-12">
            <button 
              onClick={loadMoreProducts}
              disabled={isLoading}
              className="bg-background-secondary border border-neutral-700 text-text-primary px-8 py-3 rounded-md hover:border-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Load More Products'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 