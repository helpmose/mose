"use client";

import { useState, useEffect } from "react";
import Header from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { UserService } from "@/lib/services/user";
import ProductService from "@/lib/services/product";
import { OrderService, Order } from "@/lib/services/order";
import UserApprovalPanel from "@/components/admin/user-approval-panel";
import ProductModerationPanel from "@/components/admin/product-moderation-panel";
import ReviewModerationPanel from "@/components/admin/review-moderation-panel";
import AdminAnalyticsPanel from "@/components/admin/admin-analytics-panel";
import { useAuthProtection, AuthLoadingScreen } from "@/hooks/use-auth-protection";

// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
};

export default function AdminDashboard() {
  const authProtection = useAuthProtection({ requiredRole: 'admin' });
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading] = useState(false);
  const [platformStats, setPlatformStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Load comprehensive platform statistics
  useEffect(() => {
    const loadStats = async () => {
      if (!authProtection.user || authProtection.user.role !== 'admin') return;
      
      setStatsLoading(true);
      try {
        // Load user stats, product stats, orders, and analytics in parallel
        const [userStats, productStats, moderationStats, orderStats] = await Promise.all([
          UserService.getUserStats(),
          ProductService.getProductStats(),
          ProductService.getModerationStats(),
          OrderService.getOrderStats() // Get platform-wide order statistics
        ]);
        
        setPlatformStats({
          // User metrics
          totalUsers: userStats.totalUsers,
          activeUsers: userStats.activeUsers,
          totalSellers: userStats.usersByType.sellers,
          verifiedSellers: userStats.usersByType.sellers - userStats.pendingVerifications,
          
          // Product metrics  
          totalProducts: productStats.totalProducts,
          activeProducts: productStats.activeProducts,
          activeListings: productStats.activeProducts,
          pendingProducts: moderationStats.pendingProducts || 0,
          
          // Moderation metrics
          pendingApprovals: userStats.pendingVerifications,
          flaggedContent: moderationStats.flaggedProducts,
          rejectedProducts: moderationStats.rejectedProducts,
          
          // Order metrics (now using real data)
          totalOrders: orderStats.totalOrders,
          monthlyRevenue: orderStats.totalRevenue, // TODO: Calculate monthly specifically
          activeDisputes: 0, // TODO: Implement dispute tracking
          totalRevenue: orderStats.totalRevenue,
        });
      } catch (error) {
        console.error('Failed to load platform stats:', error);
        setPlatformStats({
          totalUsers: 0,
          activeUsers: 0,
          totalSellers: 0,
          verifiedSellers: 0,
          totalProducts: 0,
          activeProducts: 0,
          activeListings: 0,
          pendingProducts: 0,
          totalOrders: 0,
          monthlyRevenue: 0,
          pendingApprovals: 0,
          flaggedContent: 0,
          rejectedProducts: 0,
          activeDisputes: 0,
          totalRevenue: 0,
        });
      }
      setStatsLoading(false);
    };

    if (authProtection.hasAccess) {
      loadStats();
    }
  }, [authProtection.hasAccess]);

  // Load all orders for admin management
  const loadAllOrders = async () => {
    if (!authProtection.user || authProtection.user.role !== 'admin') return;
    
    setOrdersLoading(true);
    try {
      const response = await OrderService.getOrders({
        limit: 100, // Load up to 100 recent orders
        sortBy: 'newest'
      });
      setAllOrders(response.orders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      setAllOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Load orders when orders tab is selected
  useEffect(() => {
    if (activeTab === 'orders' && authProtection.hasAccess) {
      loadAllOrders();
    }
  }, [activeTab, authProtection.hasAccess]);

  // Load recent activity
  useEffect(() => {
    const loadRecentActivity = async () => {
      if (!authProtection.user || authProtection.user.role !== 'admin') return;
      
      setActivityLoading(true);
      try {
        // Get recent users, products, and other activities
        const [recentUsers, pendingProducts] = await Promise.all([
          UserService.getAllUsers(undefined, false, 10, 0), // Get recent unverified users
          ProductService.getProductsForModeration('pending', 5) // Get recent pending products
        ]);

        const activities: any[] = [];

        // Add user registration activities
        recentUsers.profiles.slice(0, 3).forEach((profile: any) => {
          activities.push({
            id: `user_${profile.$id}`,
            action: `New ${profile.userType} application`,
            user: profile.displayName || 'Unknown User',
            time: formatTimeAgo(profile.$createdAt),
            status: profile.isVerified ? 'approved' : 'pending',
            type: 'user'
          });
        });

        // Add product review activities
        pendingProducts.products.slice(0, 3).forEach((product: any) => {
          activities.push({
            id: `product_${product.$id}`,
            action: 'Product pending review',
            product: product.title,
            seller: product.sellerId,
            time: formatTimeAgo(product.$createdAt),
            status: 'pending',
            type: 'product'
          });
        });

        // Sort by most recent (using creation dates)
        activities.sort((a, b) => {
          const aDate = activities.find(act => act.id === a.id)?.type === 'user' 
            ? recentUsers.profiles.find((p: any) => `user_${p.$id}` === a.id)?.$createdAt
            : pendingProducts.products.find((p: any) => `product_${p.$id}` === a.id)?.$createdAt;
          const bDate = activities.find(act => act.id === b.id)?.type === 'user'
            ? recentUsers.profiles.find((p: any) => `user_${p.$id}` === b.id)?.$createdAt
            : pendingProducts.products.find((p: any) => `product_${p.$id}` === b.id)?.$createdAt;
          
          return new Date(bDate || 0).getTime() - new Date(aDate || 0).getTime();
        });
        
        setRecentActivity(activities.slice(0, 5));
      } catch (error) {
        console.error('Failed to load recent activity:', error);
        setRecentActivity([]);
      }
      setActivityLoading(false);
    };

    loadRecentActivity();
  }, [authProtection.hasAccess]);

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
              <p className="text-text-muted">Loading admin dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Admin tabs configuration
  const tabs = [
    { id: "overview", label: "Overview", icon: "📊", description: "Platform statistics and overview" },
    { id: "users", label: "User Management", icon: "👥", description: "Manage sellers and buyers" },
    { id: "products", label: "Product Moderation", icon: "🛍️", description: "Review and moderate listings" },
    { id: "orders", label: "Order Management", icon: "📦", description: "Monitor and manage all orders" },
    { id: "reviews", label: "Review Moderation", icon: "⭐", description: "Moderate user reviews" },
    { id: "disputes", label: "Disputes", icon: "⚖️", description: "Handle disputes and refunds" },
    { id: "promotions", label: "Promotions", icon: "🎯", description: "Manage campaigns and discounts" },
    { id: "analytics", label: "Analytics", icon: "📈", description: "Platform insights and reports" },
    { id: "settings", label: "Settings", icon: "⚙️", description: "Admin tools and configuration" },
  ];

  // Fallback stats for loading state
  const defaultStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalSellers: 0,
    verifiedSellers: 0,
    totalProducts: 0,
    activeListings: 0,
    totalOrders: 0,
    monthlyRevenue: 0,
    pendingApprovals: 0,
    flaggedContent: 0,
    activeDisputes: 0,
    totalRevenue: 0,
  };

  const currentStats = platformStats || defaultStats;

  // Recent activity is managed by state - removed mock data

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-500";
      case "flagged": return "text-red-500";
      case "dispute": return "text-purple-500";
      case "reported": return "text-orange-500";
      case "approved": return "text-green-500";
      default: return "text-text-muted";
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-8">
            {/* Platform Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsLoading && (
                <div className="col-span-full flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text-primary"></div>
                  <span className="ml-3 text-text-muted">Loading platform statistics...</span>
                </div>
              )}
              
              {!statsLoading && (
                <>
              {/* Users Stats */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Users</p>
                    <p className="text-2xl font-bold text-text-primary">{currentStats.totalUsers.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-green-500 text-sm">{currentStats.activeUsers} active</span>
                </div>
              </Card>

              {/* Sellers Stats */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Sellers</p>
                    <p className="text-2xl font-bold text-text-primary">{currentStats.totalSellers}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎨</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-blue-500 text-sm">{currentStats.verifiedSellers} verified</span>
                </div>
              </Card>

              {/* Products Stats */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Products</p>
                    <p className="text-2xl font-bold text-text-primary">{currentStats.totalProducts.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🛍️</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-green-500 text-sm">{currentStats.activeListings} active</span>
                </div>
              </Card>

              {/* Revenue Stats */}
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Monthly Revenue</p>
                    <p className="text-2xl font-bold text-text-primary">{formatPrice(currentStats.monthlyRevenue / 100)}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
                <div className="mt-4">
                  <span className="text-green-500 text-sm">+12.5% vs last month</span>
                </div>
              </Card>
              </>
              )}
            </div>

            {/* Action Items Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4 cursor-pointer hover:bg-background-secondary/50 transition-colors" onClick={() => setActiveTab("users")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Pending Approvals</p>
                    <p className="text-xl font-bold text-yellow-500">{currentStats.pendingApprovals}</p>
                  </div>
                  <span className="text-yellow-500">⏳</span>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:bg-background-secondary/50 transition-colors" onClick={() => setActiveTab("products")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Flagged Content</p>
                    <p className="text-xl font-bold text-red-500">{currentStats.flaggedContent}</p>
                  </div>
                  <span className="text-red-500">🚩</span>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:bg-background-secondary/50 transition-colors" onClick={() => setActiveTab("disputes")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Active Disputes</p>
                    <p className="text-xl font-bold text-purple-500">{currentStats.activeDisputes}</p>
                  </div>
                  <span className="text-purple-500">⚖️</span>
                </div>
              </Card>

              <Card className="p-4 cursor-pointer hover:bg-background-secondary/50 transition-colors" onClick={() => setActiveTab("analytics")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Orders</p>
                    <p className="text-xl font-bold text-blue-500">{currentStats.totalOrders}</p>
                  </div>
                  <span className="text-blue-500">📦</span>
                </div>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Recent Activity</h2>
                <Button variant="outline" size="sm">View All</Button>
              </div>
              {activityLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-text-primary"></div>
                  <span className="ml-3 text-text-muted">Loading recent activity...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      <p>No recent activity to display</p>
                    </div>
                  ) : (
                    recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-background-secondary rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${getActivityStatusColor(activity.status).replace('text-', 'bg-')}`}></div>
                      <div>
                        <p className="text-text-primary font-medium">{activity.action}</p>
                        <p className="text-text-muted text-sm">
                          {activity.user && `by ${activity.user}`}
                          {activity.product && `Product: ${activity.product}`}
                          {activity.seller && `Seller: ${activity.seller}`}
                          {activity.order && `Order: ${activity.order}`}
                          {activity.review && `Review: ${activity.review}`}
                        </p>
                      </div>
                    </div>
                    <span className="text-text-muted text-sm">{activity.time}</span>
                  </div>
                    ))
                  )}
                </div>
              )}
            </Card>
          </div>
        );

      case "users":
        return <UserApprovalPanel />;

      case "products":
        return <ProductModerationPanel />;

      case "orders":
        return (
          <div className="space-y-6">
            {/* Orders Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Order Management</h2>
                <p className="text-text-muted">Monitor and manage all platform orders</p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={loadAllOrders}>
                  Refresh
                </Button>
                <Button variant="outline" size="sm">
                  Export Orders
                </Button>
              </div>
            </div>

            {/* Order Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Orders</p>
                    <p className="text-2xl font-bold text-blue-500">{currentStats.totalOrders}</p>
                  </div>
                  <span className="text-2xl">📦</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Active Orders</p>
                    <p className="text-2xl font-bold text-yellow-500">
                      {allOrders.filter(order => !['delivered', 'cancelled'].includes(order.orderStatus)).length}
                    </p>
                  </div>
                  <span className="text-2xl">🔄</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Completed</p>
                    <p className="text-2xl font-bold text-green-500">
                      {allOrders.filter(order => order.orderStatus === 'delivered').length}
                    </p>
                  </div>
                  <span className="text-2xl">✅</span>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-muted text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-500">{formatPrice(currentStats.totalRevenue / 100)}</p>
                  </div>
                  <span className="text-2xl">💰</span>
                </div>
              </Card>
            </div>

            {/* Orders Table */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Orders ({allOrders.length})</h3>
                <div className="flex space-x-2">
                  <select className="px-3 py-1 bg-background-secondary border border-neutral-700 rounded text-sm text-text-primary">
                    <option>All Status</option>
                    <option>Pending</option>
                    <option>Processing</option>
                    <option>Shipped</option>
                    <option>Delivered</option>
                    <option>Cancelled</option>
                  </select>
                </div>
              </div>
              
              {ordersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-4 bg-background-secondary rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : allOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left py-3 text-text-muted">Order ID</th>
                        <th className="text-left py-3 text-text-muted">Buyer</th>
                        <th className="text-left py-3 text-text-muted">Seller</th>
                        <th className="text-left py-3 text-text-muted">Items</th>
                        <th className="text-left py-3 text-text-muted">Total</th>
                        <th className="text-left py-3 text-text-muted">Status</th>
                        <th className="text-left py-3 text-text-muted">Date</th>
                        <th className="text-left py-3 text-text-muted">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allOrders.map((order) => (
                        <tr key={order.$id} className="border-b border-neutral-800/50 hover:bg-background-secondary/50">
                          <td className="py-4 font-medium text-text-primary">#{order.orderId}</td>
                          <td className="py-4">
                            <div>
                              <div className="font-medium text-text-primary">Buyer #{order.buyerId.slice(-6)}</div>
                              <div className="text-xs text-text-muted">{order.shippingAddress.fullName}</div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="text-sm text-text-primary">Seller #{order.sellerId.slice(-6)}</div>
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
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              order.orderStatus === 'delivered' ? 'bg-green-500/10 text-green-500' :
                              order.orderStatus === 'shipped' ? 'bg-blue-500/10 text-blue-500' :
                              order.orderStatus === 'processing' ? 'bg-yellow-500/10 text-yellow-500' :
                              order.orderStatus === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                              'bg-gray-500/10 text-gray-500'
                            }`}>
                              {order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)}
                            </span>
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
                                onClick={() => {
                                  // TODO: Implement order details modal
                                  alert(`View order details for ${order.orderId}`);
                                }}
                              >
                                View
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  // TODO: Implement admin intervention tools
                                  alert(`Admin tools for order ${order.orderId}`);
                                }}
                              >
                                Manage
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
                    <span className="text-2xl">📦</span>
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">No orders yet</h3>
                  <p className="text-text-muted">Orders will appear here as customers make purchases</p>
                </div>
              )}
            </Card>
          </div>
        );

      case "reviews":
        return <ReviewModerationPanel />;

      case "disputes":
        return (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-purple-500/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚖️</span>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Dispute Management</h2>
            <p className="text-text-muted mb-6">Handle order disputes, process refunds, and facilitate buyer-seller resolution.</p>
            <div className="text-sm text-text-muted">
              Coming soon: Dispute workflow system, refund processing, and communication tools.
            </div>
          </Card>
        );

      case "promotions":
        return (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-pink-500/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Promotions Management</h2>
            <p className="text-text-muted mb-6">Create and manage platform-wide promotions, discount codes, and marketing campaigns.</p>
            <div className="text-sm text-text-muted">
              Coming soon: Promotion builder, discount code generator, and campaign analytics.
            </div>
          </Card>
        );

      case "analytics":
        return <AdminAnalyticsPanel />;

      case "settings":
        return (
          <Card className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-500/10 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚙️</span>
            </div>
            <h2 className="text-2xl font-semibold mb-4">Admin Settings</h2>
            <p className="text-text-muted mb-6">Platform configuration, admin user management, and system tools.</p>
            <div className="text-sm text-text-muted">
              Coming soon: Platform settings, admin controls, and system configuration.
            </div>
          </Card>
        );

      default:
        return (
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-semibold mb-4">Tab Not Found</h2>
            <p className="text-text-muted">The requested section could not be found.</p>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />
      
      <div className="container mx-auto px-4 pt-32 pb-16">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-serif font-light mb-2">Admin Dashboard</h1>
            <p className="text-text-muted">Platform management and oversight tools</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm text-text-muted">Logged in as</p>
              <p className="font-medium text-text-primary">{authProtection.user?.name || authProtection.user?.email}</p>
            </div>
            <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
              <span className="text-purple-400">👑</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-neutral-800 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-text-primary text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
              title={tab.description}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}