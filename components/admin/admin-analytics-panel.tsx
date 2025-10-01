"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AnalyticsOverview from '@/components/analytics/analytics-overview';
import AnalyticsService from '@/lib/services/analytics';
import { UserService } from '@/lib/services/user';
import ProductService from '@/lib/services/product';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';

interface PlatformMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  monthlyOrders: number;
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  activeProducts: number;
  conversionRate: number;
  averageOrderValue: number;
  userGrowthRate: number;
  revenueGrowthRate: number;
  productViews: number;
  platformRating: number;
}

interface AdminAnalyticsPanelProps {
  className?: string;
}

export default function AdminAnalyticsPanel({ className = "" }: AdminAnalyticsPanelProps) {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [chartData, setChartData] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  const { user } = useAuthStore();

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    if (!user || user.role !== 'admin') return;
    
    try {
      setLoading(true);
      
      // Load platform metrics from multiple services in parallel
      const [
        userStats,
        productStats,
        analyticsData,
        recentEvents
      ] = await Promise.all([
        UserService.getUserStats(),
        ProductService.getProductStats(),
        AnalyticsService.getPlatformAnalytics(selectedPeriod),
        AnalyticsService.getRecentActivity(10)
      ]);

      // Combine metrics from different sources
      const combinedMetrics: PlatformMetrics = {
        // Revenue metrics (from analytics or orders)
        totalRevenue: analyticsData.totalRevenue || 0,
        monthlyRevenue: analyticsData.monthlyRevenue || 0,
        
        // Order metrics
        totalOrders: analyticsData.totalOrders || 0,
        monthlyOrders: analyticsData.monthlyOrders || 0,
        
        // User metrics
        totalUsers: userStats.totalUsers,
        activeUsers: userStats.activeUsers,
        
        // Product metrics
        totalProducts: productStats.totalProducts,
        activeProducts: productStats.activeProducts,
        
        // Calculated metrics
        conversionRate: userStats.totalUsers > 0 ? 
          ((analyticsData.totalOrders || 0) / userStats.totalUsers) * 100 : 0,
        averageOrderValue: (analyticsData.totalOrders || 0) > 0 ? 
          (analyticsData.totalRevenue || 0) / (analyticsData.totalOrders || 1) : 0,
        userGrowthRate: analyticsData.userGrowthRate || 0,
        revenueGrowthRate: analyticsData.revenueGrowthRate || 0,
        productViews: analyticsData.totalViews || 0,
        platformRating: productStats.averageRating || 0,
      };

      setMetrics(combinedMetrics);
      setRecentActivity(recentEvents);
      
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      
      // Fallback metrics when API calls fail
      setMetrics({
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalOrders: 0,
        monthlyOrders: 0,
        totalUsers: 0,
        activeUsers: 0,
        totalProducts: 0,
        activeProducts: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        userGrowthRate: 0,
        revenueGrowthRate: 0,
        productViews: 0,
        platformRating: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const getAnalyticsMetrics = () => {
    if (!metrics) return [];

    return [
      {
        title: 'Total Revenue',
        value: metrics.totalRevenue,
        change: metrics.revenueGrowthRate,
        icon: 'revenue',
        color: 'bg-green-500/10 text-green-500'
      },
      {
        title: 'Monthly Revenue',
        value: metrics.monthlyRevenue,
        change: metrics.revenueGrowthRate,
        icon: 'revenue',
        color: 'bg-emerald-500/10 text-emerald-500'
      },
      {
        title: 'Total Orders',
        value: metrics.totalOrders.toLocaleString(),
        change: 15.2,
        icon: 'orders',
        color: 'bg-blue-500/10 text-blue-500'
      },
      {
        title: 'Active Users',
        value: metrics.activeUsers.toLocaleString(),
        change: metrics.userGrowthRate,
        icon: 'customers',
        color: 'bg-purple-500/10 text-purple-500'
      },
      {
        title: 'Conversion Rate',
        value: `${metrics.conversionRate.toFixed(1)}%`,
        change: 8.4,
        icon: 'conversion',
        color: 'bg-orange-500/10 text-orange-500'
      },
      {
        title: 'Avg Order Value',
        value: metrics.averageOrderValue,
        change: 12.1,
        icon: 'revenue',
        color: 'bg-teal-500/10 text-teal-500'
      },
      {
        title: 'Product Views',
        value: metrics.productViews.toLocaleString(),
        change: 23.5,
        icon: 'views',
        color: 'bg-indigo-500/10 text-indigo-500'
      },
      {
        title: 'Platform Rating',
        value: `${metrics.platformRating.toFixed(1)}⭐`,
        change: 2.8,
        icon: 'rating',
        color: 'bg-yellow-500/10 text-yellow-500'
      }
    ];
  };

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-text-primary mx-auto mb-4"></div>
          <p className="text-text-muted">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">Platform Analytics</h2>
          <p className="text-text-muted">Comprehensive insights into platform performance and user behavior</p>
        </div>
        <div className="flex items-center space-x-2">
          {(['week', 'month', 'quarter', 'year'] as const).map((period) => (
            <Button
              key={period}
              size="sm"
              variant={selectedPeriod === period ? "default" : "outline"}
              onClick={() => setSelectedPeriod(period)}
              className={`capitalize ${
                selectedPeriod === period 
                  ? 'bg-text-primary text-background-primary' 
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Analytics Overview */}
      <AnalyticsOverview 
        metrics={getAnalyticsMetrics()} 
        period={selectedPeriod} 
      />

      {/* Platform Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Health */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Business Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Total Users</span>
              <span className="text-text-primary font-medium">{metrics?.totalUsers.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Active Products</span>
              <span className="text-text-primary font-medium">{metrics?.activeProducts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Monthly Orders</span>
              <span className="text-text-primary font-medium">{metrics?.monthlyOrders.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Revenue Growth</span>
              <span className={`font-medium ${
                (metrics?.revenueGrowthRate || 0) >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {metrics?.revenueGrowthRate >= 0 ? '+' : ''}{metrics?.revenueGrowthRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-3 flex-col space-y-1"
              onClick={() => window.open('/admin/reports/revenue', '_blank')}
            >
              <span className="text-2xl">📊</span>
              <span className="text-sm">Revenue Report</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 flex-col space-y-1"
              onClick={() => window.open('/admin/reports/users', '_blank')}
            >
              <span className="text-2xl">👥</span>
              <span className="text-sm">User Report</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 flex-col space-y-1"
              onClick={() => window.open('/admin/reports/products', '_blank')}
            >
              <span className="text-2xl">🛍️</span>
              <span className="text-sm">Product Report</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-3 flex-col space-y-1"
              onClick={() => window.open('/admin/settings/analytics', '_blank')}
            >
              <span className="text-2xl">⚙️</span>
              <span className="text-sm">Settings</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Recent Activity Timeline */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Recent Platform Activity</h3>
          <Button variant="outline" size="sm">Export Data</Button>
        </div>
        
        {recentActivity.length > 0 ? (
          <div className="space-y-3">
            {recentActivity.slice(0, 8).map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-background-secondary rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-text-primary text-sm">{activity.event}</p>
                  <p className="text-text-muted text-xs">{activity.timestamp}</p>
                </div>
                <span className="text-xs text-text-muted">{activity.user}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted">
            <span className="text-2xl block mb-2">📈</span>
            <p>No recent activity data available</p>
            <p className="text-xs mt-1">Activity tracking will appear here as users interact with the platform</p>
          </div>
        )}
      </Card>
    </div>
  );
}