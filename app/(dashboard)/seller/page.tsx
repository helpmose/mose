"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import ProductService from "@/lib/services/product";
import { UserService } from "@/lib/services/user";
import OrderService from "@/lib/services/order";
import AnalyticsService from "@/lib/services/analytics";
import { GiftService } from "@/lib/services/gifts";
import AnalyticsOverview from "@/components/analytics/analytics-overview";
import SalesChart from "@/components/analytics/sales-chart";
import ProductPerformance from "@/components/analytics/product-performance";
import InventoryManagement from "@/components/seller/inventory-management";
import ApprovalStatus from "@/components/seller/approval-status";
import SellerProfileManagement from "@/components/seller/seller-profile-management";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthProtection, AuthLoadingScreen } from "@/hooks/use-auth-protection";

export default function SellerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authProtection = useAuthProtection({ requiredRole: 'seller' });
  const [activeTab, setActiveTab] = useState("overview");
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [productSortBy, setProductSortBy] = useState<'views' | 'revenue' | 'orders' | 'conversion'>('revenue');
  
  // Real data state management
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [analyticsMetrics, setAnalyticsMetrics] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [productMetrics, setProductMetrics] = useState<any[]>([]);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [giftEvents, setGiftEvents] = useState<any[]>([]);
  const [loadingGifts, setLoadingGifts] = useState(false);

  // Load dashboard data when auth protection passes
  useEffect(() => {
    if (authProtection.hasAccess) {
      loadDashboardData();
      loadGiftEvents();
    }
  }, [authProtection.hasAccess]);

  // Handle URL parameters for tab navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  
  useEffect(() => {
    if (authProtection.hasAccess) {
      loadAnalyticsData();
    }
  }, [authProtection.hasAccess, analyticsPeriod, productSortBy]);

  const loadDashboardData = async () => {
    if (!authProtection.user || authProtection.user.role !== 'seller') return;
    
    try {
      setIsLoading(true);
      setLoadingError(null);
      
      // Load seller data in parallel
      const [orderStats, sellerProfile, products] = await Promise.all([
        OrderService.getOrderStats(authProtection.user.$id),
        UserService.getProfile(authProtection.user.$id),
        ProductService.getSellerProducts(authProtection.user.$id, { limit: 50 })
      ]);
      
      // Load recent orders
      const recentOrdersData = await OrderService.getOrders({
        sellerId: authProtection.user.$id,
        limit: 10,
        sortBy: 'newest'
      });
      
      // Calculate dashboard stats
      const stats = {
        totalProducts: products.products.length,
        activeProducts: products.products.filter((p: any) => p.status === 'active').length,
        totalSales: orderStats.totalRevenue || 0,
        monthlyRevenue: orderStats.totalRevenue || 0, // TODO: Calculate monthly
        totalOrders: orderStats.totalOrders || 0,
        pendingOrders: orderStats.pendingOrders || 0,
        completedOrders: orderStats.completedOrders || 0,
        averageRating: sellerProfile?.rating || 0,
        totalReviews: sellerProfile?.reviewCount || 0,
      };
      
      setDashboardStats(stats);
      setRecentOrders(recentOrdersData.orders || []);
      setSellerProducts(products.products || []);
      
      // Convert products to inventory format
      const inventory = products.products.map((product: any) => ({
        id: product.$id,
        title: product.title,
        sku: `SKU-${product.$id.slice(-6)}`,
        stock: product.stock || 0,
        lowStockThreshold: 3,
        price: product.price,
        cost: product.price * 0.6, // Estimated cost
        category: product.category,
        status: product.status,
        lastUpdated: product.$updatedAt
      }));
      setInventoryItems(inventory);
      
    } catch (error) {
      console.error('Failed to load seller dashboard data:', error);
      setLoadingError('Failed to load dashboard data');
      // Set fallback empty data
      setDashboardStats({
        totalProducts: 0,
        activeProducts: 0,
        totalSales: 0,
        monthlyRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalReviews: 0,
      });
      setRecentOrders([]);
      setSellerProducts([]);
      setInventoryItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    if (!authProtection.user || authProtection.user.role !== 'seller') return;
    
    try {
      // Load analytics data
      const sellerAnalytics = await AnalyticsService.getSellerAnalytics(
        authProtection.user.$id, 
        analyticsPeriod
      );
      
      // Create analytics metrics
      const metrics = [
        {
          title: "Total Revenue",
          value: dashboardStats?.totalSales || 0,
          change: sellerAnalytics.revenueGrowthRate || 0,
          icon: "revenue",
          color: "bg-green-500/10 text-green-500"
        },
        {
          title: "Total Orders",
          value: dashboardStats?.totalOrders.toString() || "0",
          change: sellerAnalytics.orderGrowthRate || 0,
          icon: "orders",
          color: "bg-blue-500/10 text-blue-500"
        },
        {
          title: "New Customers",
          value: sellerAnalytics.newCustomers?.toString() || "0",
          change: sellerAnalytics.customerGrowthRate || 0,
          icon: "customers",
          color: "bg-purple-500/10 text-purple-500"
        },
        {
          title: "Conversion Rate",
          value: `${sellerAnalytics.conversionRate?.toFixed(1) || '0.0'}%`,
          change: sellerAnalytics.conversionRateChange || 0,
          icon: "conversion",
          color: "bg-orange-500/10 text-orange-500"
        },
        {
          title: "Page Views",
          value: sellerAnalytics.totalViews?.toLocaleString() || "0",
          change: sellerAnalytics.viewsGrowthRate || 0,
          icon: "views",
          color: "bg-indigo-500/10 text-indigo-500"
        },
        {
          title: "Average Rating",
          value: dashboardStats?.averageRating?.toFixed(1) || "0.0",
          change: sellerAnalytics.ratingChange || 0,
          icon: "rating",
          color: "bg-yellow-500/10 text-yellow-500"
        }
      ];
      
      setAnalyticsMetrics(metrics);
      setSalesData(sellerAnalytics.salesData || []);
      
      // Convert seller products to product metrics format
      const productMetricsData = sellerProducts.map((product: any) => ({
        id: product.$id,
        title: product.title,
        views: product.views || 0,
        likes: product.likes || 0,
        shares: product.shares || 0,
        orders: product.orderCount || 0,
        revenue: (product.orderCount || 0) * product.price,
        conversionRate: product.views > 0 ? ((product.orderCount || 0) / product.views) * 100 : 0,
        stock: product.stock || 0,
        rating: product.averageRating || 0,
        reviewCount: product.reviewCount || 0
      }));
      setProductMetrics(productMetricsData);
      
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      // Set fallback empty analytics
      setAnalyticsMetrics([]);
      setSalesData([]);
      setProductMetrics([]);
    }
  };

  const loadGiftEvents = async () => {
    if (!authProtection.user) return;

    try {
      setLoadingGifts(true);
      console.log('🔄 Loading gift events for user:', authProtection.user.$id);
      const result = await GiftService.getGiftEvents({
        creatorId: authProtection.user.$id,
        sortBy: 'newest',
        limit: 20
      });
      console.log('📊 Dashboard result:', result);
      setGiftEvents(result.events);
    } catch (error) {
      console.error('Failed to load gift events:', error);
      setGiftEvents([]);
    } finally {
      setLoadingGifts(false);
    }
  };

  // Auth protection loading state
  if (authProtection.isLoading) {
    return <AuthLoadingScreen message="Loading authentication..." />;
  }

  // Dashboard loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
              <p className="text-text-muted">Loading seller dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadingError) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32 pb-16">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <p className="text-text-primary mb-2">Unable to load dashboard</p>
              <p className="text-text-muted mb-4">{loadingError}</p>
              <Button onClick={() => loadDashboardData()}>Retry</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get current stats or fallback
  const stats = dashboardStats || {
    totalProducts: 0,
    activeProducts: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    averageRating: 0,
    totalReviews: 0,
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-500";
      case "processing": return "text-blue-500";
      case "shipped": return "text-purple-500";
      case "delivered": return "text-green-500";
      case "active": return "text-green-500";
      case "draft": return "text-gray-500";
      default: return "text-text-muted";
    }
  };

  // Mock functions removed - real implementations are below

  // Real inventory management handlers
  const handleUpdateStock = async (id: string, newStock: number) => {
    if (!authProtection.user) return;
    
    try {
      await ProductService.updateProductStock(id, newStock);
      // Refresh dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to update stock:', error);
      alert('Failed to update stock. Please try again.');
    }
  };

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    if (!authProtection.user) return;
    
    try {
      await ProductService.updateProduct(id, { price: newPrice });
      // Refresh dashboard data  
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to update price:', error);
      alert('Failed to update price. Please try again.');
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'inactive') => {
    if (!authProtection.user) return;
    
    try {
      await ProductService.updateProduct(id, { status });
      // Refresh dashboard data
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update product status. Please try again.');
    }
  };

  // Order management handlers
  const handleOrderStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!authProtection.user) return;
    
    try {
      await OrderService.updateOrderStatus(orderId, newStatus);
      // Refresh dashboard data to reflect changes
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status. Please try again.');
    }
  };

  const getOrderStatusCounts = () => {
    if (!recentOrders.length) return {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0
    };

    return recentOrders.reduce((counts, order) => {
      switch (order.orderStatus) {
        case 'pending':
        case 'confirmed':
          counts.pending++;
          break;
        case 'processing':
          counts.processing++;
          break;
        case 'shipped':
          counts.shipped++;
          break;
        case 'delivered':
          counts.delivered++;
          break;
      }
      return counts;
    }, { pending: 0, processing: 0, shipped: 0, delivered: 0 });
  };

  const getFilteredOrders = () => {
    if (orderFilter === 'all') return recentOrders;
    
    return recentOrders.filter(order => {
      switch (orderFilter) {
        case 'pending':
          return ['pending', 'confirmed'].includes(order.orderStatus);
        case 'processing':
          return order.orderStatus === 'processing';
        case 'shipped':
          return order.orderStatus === 'shipped';
        case 'delivered':
          return order.orderStatus === 'delivered';
        default:
          return true;
      }
    });
  };

  const orderStatusCounts = getOrderStatusCounts();

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        {/* Enhanced Page Header with Business Metrics */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 space-y-4 lg:space-y-0">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-4xl font-serif font-light">Seller Dashboard</h1>
              {authProtection.user && (
                <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-sm font-medium">
                  {authProtection.user.name || authProtection.user.email}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-text-muted">Manage your products and track your sales</span>
              <span className="text-text-muted">•</span>
              <span className="text-green-500 font-medium">
                {formatPrice(stats.monthlyRevenue / 100)} this month
              </span>
              <span className="text-text-muted">•</span>
              <span className="text-blue-500 font-medium">
                {stats.pendingOrders} pending orders
              </span>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline"
              onClick={() => setActiveTab('orders')}
              className="flex items-center space-x-2"
            >
              <span className="text-sm">📬</span>
              <span>Orders</span>
              {stats.pendingOrders > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {stats.pendingOrders}
                </span>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/seller/analytics')}
              className="flex items-center space-x-2"
            >
              <span className="text-sm">📊</span>
              <span>Analytics</span>
            </Button>
            <Button 
              className="bg-text-primary text-background-primary hover:bg-text-secondary flex items-center space-x-2"
              onClick={() => router.push('/seller/products/new')}
            >
              <span className="text-sm">+</span>
              <span>Add Product</span>
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 bg-background-secondary rounded-lg p-1 overflow-x-auto">
          {[
            { id: "overview", label: "Overview" },
            { id: "profile", label: "Profile" },
            { id: "products", label: "Products" },
            { id: "inventory", label: "Inventory" },
            { id: "orders", label: "Orders" },
            { id: "gifts", label: "Gift Events" },
            { id: "analytics", label: "Analytics" },
            { id: "settings", label: "Settings" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-text-primary text-background-primary"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Approval Status - Show at top if not approved */}
        {authProtection.user && !authProtection.user.isVerified && (
          <div className="mb-8">
            <ApprovalStatus />
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-text-primary">{formatPrice(stats.totalSales / 100)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-green-500 text-sm">+12.5%</span>
                  <span className="text-text-muted text-sm ml-1">vs last month</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Products</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.totalProducts}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-text-muted text-sm">{stats.activeProducts} active</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Orders</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.totalOrders}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-yellow-500 text-sm">{stats.pendingOrders} pending</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Average Rating</p>
                    <p className="text-2xl font-bold text-text-primary">{stats.averageRating}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-text-muted text-sm">{stats.totalReviews} reviews</span>
                </div>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Recent Orders</h2>
                <Button variant="outline" size="sm">View All</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left py-3 text-text-muted">Order ID</th>
                      <th className="text-left py-3 text-text-muted">Customer</th>
                      <th className="text-left py-3 text-text-muted">Product</th>
                      <th className="text-left py-3 text-text-muted">Amount</th>
                      <th className="text-left py-3 text-text-muted">Status</th>
                      <th className="text-left py-3 text-text-muted">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order) => (
                        <tr key={order.$id} className="border-b border-neutral-800/50">
                          <td className="py-4 font-medium">{order.orderId}</td>
                          <td className="py-4">Customer #{order.buyerId.slice(-6)}</td>
                          <td className="py-4">{order.items[0]?.title || 'Multiple Items'}</td>
                          <td className="py-4">{formatPrice(order.finalAmount / 100)}</td>
                          <td className="py-4">
                            <span className={`capitalize ${getStatusColor(order.orderStatus)}`}>
                              {order.orderStatus}
                            </span>
                          </td>
                          <td className="py-4 text-text-muted">{new Date(order.$createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-text-muted">
                          {isLoading ? 'Loading orders...' : 'No orders yet'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <SellerProfileManagement />
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Products</h2>
              <div className="flex space-x-3">
                <Button variant="outline">Import Products</Button>
                <Button>Add New Product</Button>
              </div>
            </div>

            <Card className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left py-3 text-text-muted">Product</th>
                      <th className="text-left py-3 text-text-muted">Price</th>
                      <th className="text-left py-3 text-text-muted">Stock</th>
                      <th className="text-left py-3 text-text-muted">Status</th>
                      <th className="text-left py-3 text-text-muted">Views</th>
                      <th className="text-left py-3 text-text-muted">Likes</th>
                      <th className="text-left py-3 text-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sellerProducts.length > 0 ? (
                      sellerProducts.map((product) => (
                        <tr key={product.$id} className="border-b border-neutral-800/50">
                          <td className="py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-background-tertiary rounded-lg overflow-hidden">
                                {product.images && product.images.length > 0 ? (
                                  <img 
                                    src={product.images[0]} 
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{product.title}</p>
                                <p className="text-sm text-text-muted">ID: {product.$id.slice(-8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">{formatPrice((product.salePrice || product.price) / 100)}</td>
                          <td className="py-4">
                            <span className={product.stock <= 5 ? 'text-red-500' : 'text-text-primary'}>
                              {product.stock || 0}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`capitalize ${getStatusColor(product.status)}`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="py-4">{product.views || 0}</td>
                          <td className="py-4">{product.likes || 0}</td>
                          <td className="py-4">
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push(`/seller/products/${product.$id}/edit`)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push(`/products/${product.$id}`)}
                              >
                                View
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="py-12 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-background-secondary rounded-full flex items-center justify-center">
                              <span className="text-2xl">🛍️</span>
                            </div>
                            <h3 className="text-lg font-medium text-text-primary mb-2">No products yet</h3>
                            <p className="text-text-muted mb-4">Start by adding your first product to your store</p>
                            <Button onClick={() => router.push('/seller/products/new')}>Add Your First Product</Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <InventoryManagement
            items={inventoryItems}
            onUpdateStock={handleUpdateStock}
            onUpdatePrice={handleUpdatePrice}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {analyticsMetrics.length > 0 && (
              <AnalyticsOverview metrics={analyticsMetrics} period={analyticsPeriod} />
            )}
            {salesData.length > 0 && (
              <SalesChart 
                data={salesData} 
                period={analyticsPeriod} 
                onPeriodChange={setAnalyticsPeriod} 
              />
            )}
            {productMetrics.length > 0 && (
              <ProductPerformance 
                products={productMetrics} 
                sortBy={productSortBy} 
                onSortChange={setProductSortBy} 
              />
            )}
            {analyticsMetrics.length === 0 && (
              <Card className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-indigo-500/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">Analytics Coming Soon</h3>
                <p className="text-text-muted">Start selling to see your performance analytics</p>
              </Card>
            )}
          </div>
        )}

        {/* Gift Events Tab */}
        {activeTab === "gifts" && (
          <div className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-text-primary">My Gift Events</h3>
                <Button onClick={() => router.push('/create')}>
                  Create Gift Event
                </Button>
              </div>

              {loadingGifts ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-primary mx-auto mb-4"></div>
                  <p className="text-text-muted">Loading gift events...</p>
                </div>
              ) : giftEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {giftEvents.map((event) => (
                    <Card key={event.$id} className="p-4 hover:bg-background-secondary/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-text-primary mb-1">{event.title}</h4>
                          <p className="text-sm text-text-muted">{event.eventType}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          event.status === 'draft' ? 'bg-gray-500/20 text-gray-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {event.status}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-text-muted">
                          <span className="mr-2">🎂</span>
                          <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-sm text-text-muted">
                          <span className="mr-2">👤</span>
                          <span>{event.recipientName}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => router.push(`/gift/${event.$id}`)}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/gift/${event.$id}`);
                            alert('Link copied to clipboard!');
                          }}
                        >
                          Share
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-background-secondary rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎁</span>
                  </div>
                  <h4 className="text-lg font-medium text-text-primary mb-2">No gift events yet</h4>
                  <p className="text-text-muted mb-4">Create gift events to collect gifts from friends and family</p>
                  <Button onClick={() => router.push('/create')}>
                    Create Gift Event
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Other tabs placeholder */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            {/* Order Management Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Order Management</h2>
                <p className="text-text-muted">Process and track your customer orders</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">Export Orders</Button>
                <Button variant="outline" size="sm">Print Labels</Button>
              </div>
            </div>

            {/* Order Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 cursor-pointer hover:bg-background-secondary transition-colors"
                    onClick={() => setOrderFilter(orderFilter === 'pending' ? 'all' : 'pending')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Pending Orders</p>
                    <p className="text-2xl font-bold text-yellow-500">{orderStatusCounts.pending}</p>
                  </div>
                  <span className="text-2xl">⌛</span>
                </div>
              </Card>
              <Card className="p-4 cursor-pointer hover:bg-background-secondary transition-colors"
                    onClick={() => setOrderFilter(orderFilter === 'processing' ? 'all' : 'processing')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Processing</p>
                    <p className="text-2xl font-bold text-blue-500">{orderStatusCounts.processing}</p>
                  </div>
                  <span className="text-2xl">🔄</span>
                </div>
              </Card>
              <Card className="p-4 cursor-pointer hover:bg-background-secondary transition-colors"
                    onClick={() => setOrderFilter(orderFilter === 'shipped' ? 'all' : 'shipped')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Shipped</p>
                    <p className="text-2xl font-bold text-purple-500">{orderStatusCounts.shipped}</p>
                  </div>
                  <span className="text-2xl">🚚</span>
                </div>
              </Card>
              <Card className="p-4 cursor-pointer hover:bg-background-secondary transition-colors"
                    onClick={() => setOrderFilter(orderFilter === 'delivered' ? 'all' : 'delivered')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Completed</p>
                    <p className="text-2xl font-bold text-green-500">{orderStatusCounts.delivered}</p>
                  </div>
                  <span className="text-2xl">✅</span>
                </div>
              </Card>
            </div>

            {/* Detailed Orders Table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">All Orders ({getFilteredOrders().length})</h3>
                <div className="flex space-x-2">
                  <select 
                    value={orderFilter}
                    onChange={(e) => setOrderFilter(e.target.value)}
                    className="px-3 py-1 bg-background-secondary border border-neutral-700 rounded text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending ({orderStatusCounts.pending})</option>
                    <option value="processing">Processing ({orderStatusCounts.processing})</option>
                    <option value="shipped">Shipped ({orderStatusCounts.shipped})</option>
                    <option value="delivered">Delivered ({orderStatusCounts.delivered})</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={() => loadDashboardData()}>
                    Refresh
                  </Button>
                </div>
              </div>
              
              {recentOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left py-3 text-text-muted">Order ID</th>
                        <th className="text-left py-3 text-text-muted">Customer</th>
                        <th className="text-left py-3 text-text-muted">Items</th>
                        <th className="text-left py-3 text-text-muted">Total</th>
                        <th className="text-left py-3 text-text-muted">Status</th>
                        <th className="text-left py-3 text-text-muted">Date</th>
                        <th className="text-left py-3 text-text-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredOrders().map((order) => (
                        <tr key={order.$id} className="border-b border-neutral-800/50 hover:bg-background-secondary/50">
                          <td className="py-4 font-medium text-text-primary">#{order.orderId}</td>
                          <td className="py-4">
                            <div>
                              <div className="font-medium text-text-primary">Customer #{order.buyerId.slice(-6)}</div>
                              <div className="text-xs text-text-muted">{order.shippingAddress.fullName}</div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm">
                              <div className="font-medium">{order.items.length} item{order.items.length > 1 ? 's' : ''}</div>
                              <div className="text-xs text-text-muted">
                                {order.items.slice(0, 2).map((item, idx) => (
                                  <div key={idx}>{item.title} x{item.quantity}</div>
                                ))}
                                {order.items.length > 2 && <div>+{order.items.length - 2} more</div>}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 font-medium text-text-primary">{formatPrice(order.finalAmount / 100)}</td>
                          <td className="py-4">
                            <select 
                              value={order.orderStatus}
                              onChange={(e) => handleOrderStatusUpdate(order.$id, e.target.value)}
                              className={`px-2 py-1 rounded text-xs border bg-background-secondary border-neutral-700 text-text-primary focus:outline-none focus:ring-1 focus:ring-text-primary ${getStatusColor(order.orderStatus)}`}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </td>
                          <td className="py-4 text-text-muted text-sm">
                            <div>{new Date(order.$createdAt).toLocaleDateString()}</div>
                            <div className="text-xs">{new Date(order.$createdAt).toLocaleTimeString()}</div>
                          </td>
                          <td className="py-4">
                            <div className="flex space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => router.push(`/seller/orders/${order.$id}`)}
                              >
                                View
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  // TODO: Implement messaging system
                                  alert(`Contact buyer for order ${order.orderId}`);
                                }}
                              >
                                Contact
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-background-secondary rounded-full flex items-center justify-center">
                    <span className="text-2xl">📬</span>
                  </div>
                  {orderFilter === 'all' ? (
                    <>
                      <h3 className="text-lg font-medium text-text-primary mb-2">No orders yet</h3>
                      <p className="text-text-muted">Orders will appear here once customers start purchasing your products</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium text-text-primary mb-2">No {orderFilter} orders</h3>
                      <p className="text-text-muted">No orders match the selected filter. Try changing the filter above.</p>
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setOrderFilter('all')}
                      >
                        Show All Orders
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Seller Settings</h2>
                <p className="text-text-muted">Manage your shop profile, preferences, and account settings</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Business Profile */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">🏢</span>
                  Business Profile
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Business Name</label>
                    <input 
                      type="text" 
                      placeholder="Your business name"
                      className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Business Description</label>
                    <textarea 
                      placeholder="Tell customers about your business..."
                      rows={3}
                      className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Location</label>
                    <input 
                      type="text" 
                      placeholder="City, Country"
                      className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary"
                    />
                  </div>
                  <Button className="w-full">Update Profile</Button>
                </div>
              </Card>

              {/* Store Preferences */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <span className="mr-2">⚙️</span>
                  Store Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary">Email Notifications</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary">Auto-approve Reviews</span>
                    <input type="checkbox" className="rounded" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary">Low Stock Alerts</span>
                    <input type="checkbox" className="rounded" defaultChecked />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Default Processing Time</label>
                    <select className="w-full px-3 py-2 bg-background-secondary border border-neutral-700 rounded text-text-primary">
                      <option>1-2 business days</option>
                      <option>3-5 business days</option>
                      <option>1-2 weeks</option>
                      <option>Custom</option>
                    </select>
                  </div>
                  <Button className="w-full" variant="outline">Save Preferences</Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 