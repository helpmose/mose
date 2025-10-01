"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

interface ProductMetrics {
  id: string;
  title: string;
  image?: string;
  views: number;
  likes: number;
  shares: number;
  orders: number;
  revenue: number;
  conversionRate: number;
  stock: number;
  rating: number;
  reviewCount: number;
}

interface ProductPerformanceProps {
  products: ProductMetrics[];
  sortBy: 'views' | 'revenue' | 'orders' | 'conversion';
  onSortChange: (sort: 'views' | 'revenue' | 'orders' | 'conversion') => void;
}

export default function ProductPerformance({ products, sortBy, onSortChange }: ProductPerformanceProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return b.views - a.views;
      case 'revenue':
        return b.revenue - a.revenue;
      case 'orders':
        return b.orders - a.orders;
      case 'conversion':
        return b.conversionRate - a.conversionRate;
      default:
        return 0;
    }
  });

  const getPerformanceColor = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    if (percentage >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const maxValues = {
    views: Math.max(...products.map(p => p.views)),
    revenue: Math.max(...products.map(p => p.revenue)),
    orders: Math.max(...products.map(p => p.orders)),
    conversion: Math.max(...products.map(p => p.conversionRate))
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Product Performance</h3>
          <p className="text-sm text-text-muted">Track your best performing products</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Sort Options */}
          <div className="flex space-x-2">
            {([
              { key: 'views', label: 'Views' },
              { key: 'revenue', label: 'Revenue' },
              { key: 'orders', label: 'Orders' },
              { key: 'conversion', label: 'Conversion' }
            ] as const).map((option) => (
              <Button
                key={option.key}
                variant={sortBy === option.key ? "default" : "outline"}
                size="sm"
                onClick={() => onSortChange(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex border border-neutral-700 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-l-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-text-primary text-background-primary' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-sm rounded-r-lg transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-text-primary text-background-primary' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Grid
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-4">
          {sortedProducts.map((product, index) => (
            <div key={product.id} className="flex items-center space-x-4 p-4 bg-background-secondary rounded-lg">
              {/* Rank */}
              <div className="flex-shrink-0 w-8 h-8 bg-background-tertiary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium">#{index + 1}</span>
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-background-tertiary rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-text-primary truncate">{product.title}</h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-text-muted">Stock: {product.stock}</span>
                      <div className="flex items-center space-x-1">
                        <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        <span className="text-sm text-text-muted">{product.rating} ({product.reviewCount})</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-sm text-text-muted">Views</p>
                  <p className={`font-medium ${getPerformanceColor(product.views, maxValues.views)}`}>
                    {product.views.toLocaleString()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-text-muted">Orders</p>
                  <p className={`font-medium ${getPerformanceColor(product.orders, maxValues.orders)}`}>
                    {product.orders}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-text-muted">Revenue</p>
                  <p className={`font-medium ${getPerformanceColor(product.revenue, maxValues.revenue)}`}>
                    {formatPrice(product.revenue / 100)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-text-muted">Conversion</p>
                  <p className={`font-medium ${getPerformanceColor(product.conversionRate, maxValues.conversion)}`}>
                    {product.conversionRate.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">View</Button>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProducts.map((product, index) => (
            <Card key={product.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">#{index + 1}</span>
                <div className="flex items-center space-x-1">
                  <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="text-sm text-text-muted">{product.rating}</span>
                </div>
              </div>
              
              <div className="w-full h-24 bg-background-tertiary rounded-lg mb-3 flex items-center justify-center">
                <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <h4 className="font-medium text-text-primary mb-3 line-clamp-2">{product.title}</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted">Views:</span>
                  <span className={`text-sm font-medium ${getPerformanceColor(product.views, maxValues.views)}`}>
                    {product.views.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted">Orders:</span>
                  <span className={`text-sm font-medium ${getPerformanceColor(product.orders, maxValues.orders)}`}>
                    {product.orders}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted">Revenue:</span>
                  <span className={`text-sm font-medium ${getPerformanceColor(product.revenue, maxValues.revenue)}`}>
                    {formatPrice(product.revenue / 100)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-muted">Conversion:</span>
                  <span className={`text-sm font-medium ${getPerformanceColor(product.conversionRate, maxValues.conversion)}`}>
                    {product.conversionRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
} 