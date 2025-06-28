"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import ProductGrid from "@/components/marketplace/product-grid";
import SearchFilters from "@/components/marketplace/search-filters";
import { useProductStore } from "@/store/product-store";
import { Product } from "@/lib/types";

export default function ProductsPage() {
  const { products, isLoading, clearFilters } = useProductStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Mock products for demonstration
  const mockProducts: Product[] = [
    {
      $id: "1",
      title: "Traditional African Mask",
      description: "Handcrafted wooden mask from West Africa with intricate carvings",
      price: 45000,
      salePrice: 36000,
      category: "Masks",
      images: [],
      sellerId: "seller1",
      sellerName: "Adebayo Arts",
      status: "active",
      customizable: false,
      stock: 5,
      tags: ["traditional", "mask", "wood"],
      featured: true,
      views: 120,
      likes: 15,
      rating: 4.8,
      reviewCount: 12,
      shares: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      $id: "2",
      title: "Kente Cloth Textile",
      description: "Authentic Ghanaian Kente cloth with traditional patterns",
      price: 75000,
      category: "Textiles",
      images: [],
      sellerId: "seller2",
      sellerName: "Ghana Crafts",
      status: "active",
      customizable: true,
      stock: 3,
      tags: ["kente", "textile", "ghana"],
      featured: false,
      views: 89,
      likes: 22,
      rating: 4.9,
      reviewCount: 8,
      shares: 12,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      $id: "3",
      title: "Bronze Sculpture",
      description: "Contemporary African bronze sculpture by renowned artist",
      price: 120000,
      salePrice: 96000,
      category: "Sculptures",
      images: [],
      sellerId: "seller3",
      sellerName: "Modern Africa Arts",
      status: "active",
      customizable: false,
      stock: 1,
      tags: ["bronze", "sculpture", "contemporary"],
      featured: true,
      views: 200,
      likes: 45,
      rating: 5.0,
      reviewCount: 6,
      shares: 15,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      $id: "4",
      title: "Beaded Jewelry Set",
      description: "Colorful African beaded necklace and earring set",
      price: 25000,
      category: "Jewelry",
      images: [],
      sellerId: "seller4",
      sellerName: "Bead Masters",
      status: "active",
      customizable: true,
      stock: 10,
      tags: ["beads", "jewelry", "colorful"],
      featured: false,
      views: 67,
      likes: 8,
      rating: 4.6,
      reviewCount: 15,
      shares: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      $id: "5",
      title: "Abstract Painting",
      description: "Modern African abstract painting on canvas",
      price: 85000,
      category: "Paintings",
      images: [],
      sellerId: "seller5",
      sellerName: "Canvas Dreams",
      status: "active",
      customizable: false,
      stock: 2,
      tags: ["painting", "abstract", "canvas"],
      featured: true,
      views: 156,
      likes: 31,
      rating: 4.7,
      reviewCount: 9,
      shares: 18,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      $id: "6",
      title: "Wooden Drum",
      description: "Traditional African djembe drum with animal skin top",
      price: 55000,
      category: "Instruments",
      images: [],
      sellerId: "seller6",
      sellerName: "Rhythm Makers",
      status: "active",
      customizable: false,
      stock: 4,
      tags: ["drum", "djembe", "traditional"],
      featured: false,
      views: 78,
      likes: 12,
      rating: 4.5,
      reviewCount: 7,
      shares: 9,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    // Filter products based on search criteria
    let filtered = mockProducts;

    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (priceRange[0] > 0 || priceRange[1] > 0) {
      filtered = filtered.filter(product => {
        const min = priceRange[0] || 0;
        const max = priceRange[1] || Infinity;
        const productPrice = product.salePrice || product.price;
        return productPrice >= min && productPrice <= max;
      });
    }

    if (selectedLocation) {
      // In a real app, this would filter by seller location
      filtered = filtered.filter(product => 
        product.sellerName?.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, priceRange, selectedLocation]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setPriceRange([0, 0]);
    setSelectedLocation("");
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
              {filteredProducts.length} Products Found
            </h2>
            {(searchQuery || selectedCategory || priceRange[0] > 0 || priceRange[1] > 0 || selectedLocation) && (
              <p className="text-text-muted text-sm mt-1">
                Showing results for your search criteria
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <select className="bg-background-secondary border border-neutral-700 text-text-primary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-text-primary">
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <ProductGrid 
          products={filteredProducts}
          loading={isLoading}
          emptyMessage="Try adjusting your search criteria or browse all categories"
        />

        {/* Load More Button */}
        {filteredProducts.length > 0 && (
          <div className="text-center mt-12">
            <button className="bg-background-secondary border border-neutral-700 text-text-primary px-8 py-3 rounded-md hover:border-text-primary transition-colors">
              Load More Products
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 