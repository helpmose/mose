import { databases } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { AnalyticsEvent, AnalyticsEventType, EventMetadata } from '@/lib/types/database';

const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || 'mose_database';

export interface PlatformAnalytics {
  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userGrowthRate: number;
  
  // Product metrics
  totalProducts: number;
  activeProducts: number;
  newProducts: number;
  topCategories: Array<{ category: string; count: number; percentage: number }>;
  
  // Sales metrics
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  conversionRate: number;
  
  // Engagement metrics
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  sessionDuration: number;
  
  // Period comparison
  periodComparison: {
    revenue: { current: number; previous: number; change: number };
    orders: { current: number; previous: number; change: number };
    users: { current: number; previous: number; change: number };
  };
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface UserBehaviorAnalytics {
  topPages: Array<{ page: string; views: number; uniqueViews: number }>;
  userJourney: Array<{ step: string; users: number; conversionRate: number }>;
  searchTerms: Array<{ term: string; count: number; results: number }>;
  deviceBreakdown: { mobile: number; desktop: number; tablet: number };
  locationBreakdown: Array<{ location: string; users: number; percentage: number }>;
}

export interface SellerAnalytics {
  sellerId: string;
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageRating: number;
  revenueGrowthRate: number;
  orderGrowthRate: number;
  newCustomers: number;
  customerGrowthRate: number;
  conversionRate: number;
  conversionRateChange: number;
  totalViews: number;
  viewsGrowthRate: number;
  viewsToSales: number;
  ratingChange: number;
  topProducts: Array<{ productId: string; title: string; revenue: number; orders: number }>;
  revenueTimeSeries: TimeSeriesData[];
  orderTimeSeries: TimeSeriesData[];
  salesData: TimeSeriesData[];
}

export class AnalyticsService {
  private static readonly COLLECTION_ID = 'analytics_events';

  /**
   * Track an analytics event
   */
  static async trackEvent(
    type: AnalyticsEventType,
    data: Record<string, any>,
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      // Don't await to avoid blocking user interactions
      setImmediate(async () => {
        try {
          const metadata: EventMetadata = {
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            referrer: data.referrer,
            page: data.page || '/',
            timestamp: new Date().toISOString()
          };

          const eventDocument = {
            type,
            userId: userId || '',
            sessionId: sessionId || ID.unique(),
            data: JSON.stringify(data),
            metadata: JSON.stringify(metadata)
          };

          await databases.createDocument(
            DATABASE_ID,
            this.COLLECTION_ID,
            ID.unique(),
            eventDocument
          );

          console.log('📊 Analytics event tracked:', type);
        } catch (error) {
          console.error('❌ Error tracking analytics event:', error);
          // Don't throw error to avoid breaking user experience
        }
      });
    } catch (error) {
      console.error('❌ Error in trackEvent:', error);
      // Silent fail for analytics
    }
  }

  /**
   * Get platform analytics for admin dashboard
   */
  static async getPlatformAnalytics(
    startDate?: string, 
    endDate?: string
  ): Promise<PlatformAnalytics> {
    try {
      console.log('📊 Calculating platform analytics...');

      // Handle period strings by converting to actual dates
      let actualStartDate = startDate;
      if (startDate === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        actualStartDate = weekAgo.toISOString();
      } else if (startDate === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        actualStartDate = monthAgo.toISOString();
      } else if (startDate === 'year') {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        actualStartDate = yearAgo.toISOString();
      }

      const queries = [];
      
      if (actualStartDate && actualStartDate !== startDate) {
        queries.push(Query.greaterThanEqual('$createdAt', actualStartDate));
      }
      if (endDate) {
        queries.push(Query.lessThanEqual('$createdAt', endDate));
      }

      // Get all events for the period
      queries.push(Query.limit(10000)); // Adjust based on expected volume
      
      let eventsResponse;
      try {
        eventsResponse = await databases.listDocuments(
          DATABASE_ID,
          this.COLLECTION_ID,
          queries
        );
      } catch (error: any) {
        // If collection doesn't exist, return mock data
        if (error.code === 404 || error.message?.includes('Collection with the requested ID could not be found')) {
          console.warn('⚠️ Analytics events collection not found, returning default analytics');
          return this.getMockPlatformAnalytics();
        }
        throw error;
      }

      const events = eventsResponse.documents.map(this.transformEvent);

      // Calculate metrics
      const analytics: PlatformAnalytics = {
        totalUsers: this.calculateUniqueUsers(events),
        activeUsers: this.calculateActiveUsers(events),
        newUsers: this.calculateNewUsers(events),
        userGrowthRate: 0, // TODO: Calculate based on period comparison
        
        totalProducts: 0, // TODO: Get from ProductService
        activeProducts: 0, // TODO: Get from ProductService
        newProducts: this.calculateNewProducts(events),
        topCategories: [], // TODO: Calculate from product data
        
        totalRevenue: this.calculateTotalRevenue(events),
        totalOrders: this.calculateTotalOrders(events),
        averageOrderValue: 0, // Will be calculated below
        conversionRate: this.calculateConversionRate(events),
        
        pageViews: this.calculatePageViews(events),
        uniqueVisitors: this.calculateUniqueVisitors(events),
        bounceRate: this.calculateBounceRate(events),
        sessionDuration: this.calculateSessionDuration(events),
        
        periodComparison: {
          revenue: { current: 0, previous: 0, change: 0 },
          orders: { current: 0, previous: 0, change: 0 },
          users: { current: 0, previous: 0, change: 0 }
        }
      };

      // Calculate derived metrics
      analytics.averageOrderValue = analytics.totalOrders > 0 
        ? analytics.totalRevenue / analytics.totalOrders 
        : 0;

      console.log('✅ Platform analytics calculated');
      return analytics;
    } catch (error) {
      console.error('❌ Error calculating platform analytics:', error);
      throw new Error('Failed to calculate platform analytics');
    }
  }

  /**
   * Get user behavior analytics
   */
  static async getUserBehaviorAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<UserBehaviorAnalytics> {
    try {
      // Handle period strings by converting to actual dates
      let actualStartDate = startDate;
      if (startDate === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        actualStartDate = weekAgo.toISOString();
      } else if (startDate === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        actualStartDate = monthAgo.toISOString();
      } else if (startDate === 'year') {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        actualStartDate = yearAgo.toISOString();
      }

      const queries = [];
      
      if (actualStartDate && actualStartDate !== startDate) {
        queries.push(Query.greaterThanEqual('$createdAt', actualStartDate));
      }
      if (endDate) {
        queries.push(Query.lessThanEqual('$createdAt', endDate));
      }

      queries.push(Query.limit(10000));
      
      let eventsResponse;
      try {
        eventsResponse = await databases.listDocuments(
          DATABASE_ID,
          this.COLLECTION_ID,
          queries
        );
      } catch (error: any) {
        // If collection doesn't exist, return mock data
        if (error.code === 404 || error.message?.includes('Collection with the requested ID could not be found')) {
          console.warn('⚠️ Analytics events collection not found, returning default user behavior analytics');
          return this.getMockUserBehaviorAnalytics();
        }
        throw error;
      }

      const events = eventsResponse.documents.map(this.transformEvent);

      return {
        topPages: this.calculateTopPages(events),
        userJourney: this.calculateUserJourney(events),
        searchTerms: this.calculateSearchTerms(events),
        deviceBreakdown: this.calculateDeviceBreakdown(events),
        locationBreakdown: this.calculateLocationBreakdown(events)
      };
    } catch (error) {
      console.error('❌ Error calculating user behavior analytics:', error);
      throw new Error('Failed to calculate user behavior analytics');
    }
  }

  /**
   * Get seller-specific analytics
   */
  static async getSellerAnalytics(
    sellerId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SellerAnalytics> {
    try {
      console.log('📊 Calculating seller analytics for:', sellerId);

      // Handle period strings by converting to actual dates
      let actualStartDate = startDate;
      if (startDate === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        actualStartDate = weekAgo.toISOString();
      } else if (startDate === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        actualStartDate = monthAgo.toISOString();
      } else if (startDate === 'year') {
        const yearAgo = new Date();
        yearAgo.setFullYear(yearAgo.getFullYear() - 1);
        actualStartDate = yearAgo.toISOString();
      }

      const queries = [
        Query.equal('userId', sellerId)
      ];
      
      if (actualStartDate && actualStartDate !== startDate) {
        queries.push(Query.greaterThanEqual('$createdAt', actualStartDate));
      }
      if (endDate) {
        queries.push(Query.lessThanEqual('$createdAt', endDate));
      }

      queries.push(Query.limit(10000));
      
      let eventsResponse;
      try {
        eventsResponse = await databases.listDocuments(
          DATABASE_ID,
          this.COLLECTION_ID,
          queries
        );
      } catch (error: any) {
        // If collection doesn't exist, return mock data
        if (error.code === 404 || error.message?.includes('Collection with the requested ID could not be found')) {
          console.warn('⚠️ Analytics events collection not found, returning default analytics');
          return this.getMockSellerAnalytics();
        }
        throw error;
      }

      const events = eventsResponse.documents.map(this.transformEvent);
      const sellerEvents = events.filter(e => {
        if (e.userId === sellerId) return true;
        try {
          const data = JSON.parse(e.data);
          return data.sellerId === sellerId;
        } catch {
          return false;
        }
      });

      // TODO: Integrate with OrderService and ProductService for complete analytics
      const analytics: SellerAnalytics = {
        sellerId,
        totalRevenue: this.calculateSellerRevenue(sellerEvents),
        totalOrders: this.calculateSellerOrders(sellerEvents),
        totalProducts: 0, // TODO: Get from ProductService
        averageRating: 0, // TODO: Get from ReviewService
        revenueGrowthRate: 0, // TODO: Calculate from period comparison
        orderGrowthRate: 0, // TODO: Calculate from period comparison
        newCustomers: 0, // TODO: Calculate from customer data
        customerGrowthRate: 0, // TODO: Calculate from period comparison
        conversionRate: 0, // TODO: Calculate from views vs sales
        conversionRateChange: 0, // TODO: Calculate from period comparison
        totalViews: 0, // TODO: Calculate from view events
        viewsGrowthRate: 0, // TODO: Calculate from period comparison
        viewsToSales: this.calculateViewsToSales(sellerEvents),
        ratingChange: 0, // TODO: Calculate from period comparison
        topProducts: [], // TODO: Calculate from order data
        revenueTimeSeries: this.calculateRevenueTimeSeries(sellerEvents),
        orderTimeSeries: this.calculateOrderTimeSeries(sellerEvents),
        salesData: this.calculateRevenueTimeSeries(sellerEvents)
      };

      console.log('✅ Seller analytics calculated');
      return analytics;
    } catch (error) {
      console.error('❌ Error calculating seller analytics:', error);
      throw new Error('Failed to calculate seller analytics');
    }
  }

  /**
   * Get revenue time series data
   */
  static async getRevenueTimeSeries(
    startDate: string,
    endDate: string,
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<TimeSeriesData[]> {
    try {
      const queries = [
        Query.equal('type', AnalyticsEventType.PURCHASE),
        Query.greaterThanEqual('$createdAt', startDate),
        Query.lessThanEqual('$createdAt', endDate),
        Query.limit(10000)
      ];
      
      let eventsResponse;
      try {
        eventsResponse = await databases.listDocuments(
          DATABASE_ID,
          this.COLLECTION_ID,
          queries
        );
      } catch (error: any) {
        // If collection doesn't exist, return empty time series
        if (error.code === 404 || error.message?.includes('Collection with the requested ID could not be found')) {
          console.warn('⚠️ Analytics events collection not found, returning empty time series');
          return [];
        }
        throw error;
      }

      const events = eventsResponse.documents.map(this.transformEvent);
      return this.groupEventsByInterval(events, interval, 'revenue');
    } catch (error) {
      console.error('❌ Error calculating revenue time series:', error);
      return []; // Return empty array instead of throwing
    }
  }

  // Helper methods for calculations
  private static calculateUniqueUsers(events: AnalyticsEvent[]): number {
    const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId));
    return uniqueUsers.size;
  }

  private static calculateActiveUsers(events: AnalyticsEvent[]): number {
    // Users who performed any action in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentEvents = events.filter(e => 
      new Date(e.$createdAt) > thirtyDaysAgo && e.userId
    );
    
    const activeUsers = new Set(recentEvents.map(e => e.userId));
    return activeUsers.size;
  }

  private static calculateNewUsers(events: AnalyticsEvent[]): number {
    return events.filter(e => e.type === AnalyticsEventType.USER_REGISTER).length;
  }

  private static calculateNewProducts(events: AnalyticsEvent[]): number {
    return events.filter(e => e.type === AnalyticsEventType.PRODUCT_LIST).length;
  }

  private static calculateTotalRevenue(events: AnalyticsEvent[]): number {
    return events
      .filter(e => e.type === AnalyticsEventType.PURCHASE)
      .reduce((total, e) => {
        try {
          const data = JSON.parse(e.data);
          return total + (data.amount || 0);
        } catch {
          return total;
        }
      }, 0);
  }

  private static calculateTotalOrders(events: AnalyticsEvent[]): number {
    return events.filter(e => e.type === AnalyticsEventType.CHECKOUT_COMPLETE).length;
  }

  private static calculateConversionRate(events: AnalyticsEvent[]): number {
    const visitors = this.calculateUniqueVisitors(events);
    const purchases = events.filter(e => e.type === AnalyticsEventType.PURCHASE).length;
    return visitors > 0 ? (purchases / visitors) * 100 : 0;
  }

  private static calculatePageViews(events: AnalyticsEvent[]): number {
    // Count all events that indicate page views
    return events.filter(e => 
      e.type === AnalyticsEventType.PRODUCT_VIEW ||
      e.metadata.page !== undefined
    ).length;
  }

  private static calculateUniqueVisitors(events: AnalyticsEvent[]): number {
    const uniqueSessions = new Set(events.map(e => e.sessionId));
    return uniqueSessions.size;
  }

  private static calculateBounceRate(events: AnalyticsEvent[]): number {
    // Sessions with only one page view
    const sessionEvents = new Map<string, number>();
    events.forEach(e => {
      sessionEvents.set(e.sessionId, (sessionEvents.get(e.sessionId) || 0) + 1);
    });

    const singlePageSessions = Array.from(sessionEvents.values()).filter(count => count === 1).length;
    const totalSessions = sessionEvents.size;
    
    return totalSessions > 0 ? (singlePageSessions / totalSessions) * 100 : 0;
  }

  private static calculateSessionDuration(events: AnalyticsEvent[]): number {
    // Average session duration in minutes
    const sessionTimes = new Map<string, { start: Date; end: Date }>();
    
    events.forEach(e => {
      const eventTime = new Date(e.$createdAt);
      const session = sessionTimes.get(e.sessionId);
      
      if (!session) {
        sessionTimes.set(e.sessionId, { start: eventTime, end: eventTime });
      } else {
        if (eventTime < session.start) session.start = eventTime;
        if (eventTime > session.end) session.end = eventTime;
      }
    });

    const durations = Array.from(sessionTimes.values()).map(session => 
      (session.end.getTime() - session.start.getTime()) / (1000 * 60)
    );

    return durations.length > 0 
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length 
      : 0;
  }

  // Additional helper methods for user behavior analytics
  private static calculateTopPages(events: AnalyticsEvent[]): Array<{ page: string; views: number; uniqueViews: number }> {
    const pageStats = new Map<string, { views: number; uniqueVisitors: Set<string> }>();
    
    events.forEach(e => {
      if (e.metadata.page) {
        const page = e.metadata.page;
        if (!pageStats.has(page)) {
          pageStats.set(page, { views: 0, uniqueVisitors: new Set() });
        }
        
        const stats = pageStats.get(page)!;
        stats.views++;
        if (e.sessionId) {
          stats.uniqueVisitors.add(e.sessionId);
        }
      }
    });

    return Array.from(pageStats.entries())
      .map(([page, stats]) => ({
        page,
        views: stats.views,
        uniqueViews: stats.uniqueVisitors.size
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private static calculateSearchTerms(events: AnalyticsEvent[]): Array<{ term: string; count: number; results: number }> {
    const searchEvents = events.filter(e => e.type === AnalyticsEventType.PRODUCT_SEARCH);
    const searchStats = new Map<string, { count: number; totalResults: number }>();
    
    searchEvents.forEach(e => {
      try {
        const data = JSON.parse(e.data);
        const term = data.query?.toLowerCase();
        if (term) {
          if (!searchStats.has(term)) {
            searchStats.set(term, { count: 0, totalResults: 0 });
          }
          const stats = searchStats.get(term)!;
          stats.count++;
          stats.totalResults += data.resultCount || 0;
        }
      } catch (error) {
        // Skip invalid data
      }
    });

    return Array.from(searchStats.entries())
      .map(([term, stats]) => ({
        term,
        count: stats.count,
        results: Math.round(stats.totalResults / stats.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }

  private static calculateUserJourney(events: AnalyticsEvent[]): Array<{ step: string; users: number; conversionRate: number }> {
    // Define typical user journey steps
    const steps = [
      { type: 'visit', events: ['page_view'] },
      { type: 'browse', events: [AnalyticsEventType.PRODUCT_VIEW] },
      { type: 'add_to_cart', events: [AnalyticsEventType.ADD_TO_CART] },
      { type: 'checkout', events: [AnalyticsEventType.CHECKOUT_START] },
      { type: 'purchase', events: [AnalyticsEventType.PURCHASE] }
    ];

    const stepUsers = steps.map((step, index) => {
      const stepEvents = events.filter(e => step.events.includes(e.type));
      const uniqueUsers = new Set(stepEvents.map(e => e.sessionId)).size;
      
      return {
        step: step.type,
        users: uniqueUsers,
        conversionRate: index === 0 ? 100 : 0 // Will be calculated below
      };
    });

    // Calculate conversion rates
    for (let i = 1; i < stepUsers.length; i++) {
      if (stepUsers[i - 1].users > 0) {
        stepUsers[i].conversionRate = (stepUsers[i].users / stepUsers[i - 1].users) * 100;
      }
    }

    return stepUsers;
  }

  private static calculateDeviceBreakdown(events: AnalyticsEvent[]): { mobile: number; desktop: number; tablet: number } {
    const deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
    const uniqueSessions = new Set<string>();

    events.forEach(e => {
      if (!uniqueSessions.has(e.sessionId)) {
        uniqueSessions.add(e.sessionId);
        
        try {
          const userAgent = e.metadata.userAgent?.toLowerCase() || '';
          if (userAgent.includes('mobile')) {
            deviceCounts.mobile++;
          } else if (userAgent.includes('tablet')) {
            deviceCounts.tablet++;
          } else {
            deviceCounts.desktop++;
          }
        } catch {
          deviceCounts.desktop++;
        }
      }
    });

    return deviceCounts;
  }

  private static calculateLocationBreakdown(events: AnalyticsEvent[]): Array<{ location: string; users: number; percentage: number }> {
    // This would require IP geolocation data
    // For now, return empty array as placeholder
    return [];
  }

  private static calculateSellerRevenue(events: AnalyticsEvent[]): number {
    return events
      .filter(e => e.type === AnalyticsEventType.PURCHASE)
      .reduce((total, e) => {
        try {
          const data = JSON.parse(e.data);
          return total + (data.sellerAmount || 0);
        } catch {
          return total;
        }
      }, 0);
  }

  private static calculateSellerOrders(events: AnalyticsEvent[]): number {
    return events.filter(e => e.type === AnalyticsEventType.ORDER_FULFILL).length;
  }

  private static calculateViewsToSales(events: AnalyticsEvent[]): number {
    const views = events.filter(e => e.type === AnalyticsEventType.PRODUCT_VIEW).length;
    const sales = events.filter(e => e.type === AnalyticsEventType.PURCHASE).length;
    return views > 0 ? (sales / views) * 100 : 0;
  }

  private static calculateRevenueTimeSeries(events: AnalyticsEvent[]): TimeSeriesData[] {
    return this.groupEventsByInterval(events.filter(e => e.type === AnalyticsEventType.PURCHASE), 'day', 'revenue');
  }

  private static calculateOrderTimeSeries(events: AnalyticsEvent[]): TimeSeriesData[] {
    return this.groupEventsByInterval(events.filter(e => e.type === AnalyticsEventType.CHECKOUT_COMPLETE), 'day', 'count');
  }

  private static groupEventsByInterval(
    events: AnalyticsEvent[], 
    interval: 'day' | 'week' | 'month',
    metric: 'count' | 'revenue'
  ): TimeSeriesData[] {
    const grouped = new Map<string, number>();
    
    events.forEach(e => {
      const date = new Date(e.$createdAt);
      let key: string;
      
      switch (interval) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }
      
      if (metric === 'revenue') {
        try {
          const data = JSON.parse(e.data);
          grouped.set(key, (grouped.get(key) || 0) + (data.amount || 0));
        } catch {
          grouped.set(key, grouped.get(key) || 0);
        }
      } else {
        grouped.set(key, (grouped.get(key) || 0) + 1);
      }
    });

    return Array.from(grouped.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get mock seller analytics data for testing/fallback
   */
  private static getMockSellerAnalytics(): SellerAnalytics {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // Generate mock time series data for the last 30 days
    const revenueTimeSeries: TimeSeriesData[] = [];
    const orderTimeSeries: TimeSeriesData[] = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate realistic revenue data (0-5000 range with some variation)
      const baseRevenue = 1000 + Math.sin(i * 0.1) * 500;
      const randomVariation = Math.random() * 1000;
      const dailyRevenue = Math.max(0, Math.round(baseRevenue + randomVariation));
      
      // Generate realistic order data (0-15 orders per day)
      const baseOrders = 5 + Math.sin(i * 0.15) * 3;
      const orderVariation = Math.random() * 5;
      const dailyOrders = Math.max(0, Math.round(baseOrders + orderVariation));
      
      revenueTimeSeries.push({ date: dateStr, value: dailyRevenue });
      orderTimeSeries.push({ date: dateStr, value: dailyOrders });
    }
    
    const totalRevenue = revenueTimeSeries.reduce((sum, item) => sum + item.value, 0);
    const totalOrders = orderTimeSeries.reduce((sum, item) => sum + item.value, 0);
    
    return {
      sellerId: 'mock-seller',
      totalRevenue,
      totalOrders,
      totalProducts: 12,
      averageRating: 4.6,
      revenueGrowthRate: 15.3,
      orderGrowthRate: 8.7,
      newCustomers: 23,
      customerGrowthRate: 12.1,
      conversionRate: 3.2,
      conversionRateChange: 0.5,
      totalViews: 1847,
      viewsGrowthRate: 22.8,
      viewsToSales: 3.8,
      ratingChange: 0.2,
      topProducts: [
        { productId: 'prod1', title: 'Abstract Canvas Art', revenue: 4500, orders: 18 },
        { productId: 'prod2', title: 'Digital Portrait', revenue: 3200, orders: 16 },
        { productId: 'prod3', title: 'Landscape Photography', revenue: 2800, orders: 14 },
        { productId: 'prod4', title: 'Modern Sculpture', revenue: 2100, orders: 7 },
        { productId: 'prod5', title: 'Vintage Poster Design', revenue: 1900, orders: 19 }
      ],
      revenueTimeSeries,
      orderTimeSeries,
      salesData: revenueTimeSeries
    };
  }

  /**
   * Get mock platform analytics data for testing/fallback
   */
  private static getMockPlatformAnalytics(): PlatformAnalytics {
    return {
      totalUsers: 1247,
      activeUsers: 892,
      newUsers: 156,
      userGrowthRate: 18.4,
      
      totalProducts: 324,
      activeProducts: 298,
      newProducts: 47,
      topCategories: [
        { category: 'Digital Art', count: 89, percentage: 27.5 },
        { category: 'Photography', count: 76, percentage: 23.5 },
        { category: 'Paintings', count: 68, percentage: 21.0 },
        { category: 'Sculptures', count: 54, percentage: 16.7 },
        { category: 'Mixed Media', count: 37, percentage: 11.4 }
      ],
      
      totalRevenue: 47580,
      totalOrders: 892,
      averageOrderValue: 53.34,
      conversionRate: 4.2,
      
      pageViews: 23847,
      uniqueVisitors: 8934,
      bounceRate: 34.2,
      sessionDuration: 342,
      
      periodComparison: {
        revenue: { current: 47580, previous: 39240, change: 21.3 },
        orders: { current: 892, previous: 743, change: 20.1 },
        users: { current: 1247, previous: 1053, change: 18.4 }
      }
    };
  }

  /**
   * Get mock user behavior analytics data for testing/fallback
   */
  private static getMockUserBehaviorAnalytics(): UserBehaviorAnalytics {
    return {
      topPages: [
        { page: '/products', views: 8934, uniqueViews: 7234 },
        { page: '/artists', views: 5847, uniqueViews: 4923 },
        { page: '/categories', views: 4738, uniqueViews: 3847 },
        { page: '/marketplace', views: 3629, uniqueViews: 2947 },
        { page: '/about', views: 2847, uniqueViews: 2394 }
      ],
      userJourney: [
        { step: 'visit', users: 8934, conversionRate: 100 },
        { step: 'browse', users: 6234, conversionRate: 69.8 },
        { step: 'add_to_cart', users: 1847, conversionRate: 29.6 },
        { step: 'checkout', users: 1234, conversionRate: 66.8 },
        { step: 'purchase', users: 892, conversionRate: 72.3 }
      ],
      searchTerms: [
        { term: 'abstract art', count: 347, results: 23 },
        { term: 'landscape photography', count: 289, results: 34 },
        { term: 'digital portrait', count: 234, results: 18 },
        { term: 'modern sculpture', count: 198, results: 12 },
        { term: 'vintage poster', count: 167, results: 28 }
      ],
      deviceBreakdown: { mobile: 4234, desktop: 3847, tablet: 853 },
      locationBreakdown: [
        { location: 'United States', users: 4234, percentage: 47.4 },
        { location: 'United Kingdom', users: 1847, percentage: 20.7 },
        { location: 'Canada', users: 1234, percentage: 13.8 },
        { location: 'Australia', users: 892, percentage: 10.0 },
        { location: 'Germany', users: 727, percentage: 8.1 }
      ]
    };
  }

  /**
   * Transform database document to AnalyticsEvent interface
   */
  private static transformEvent(doc: any): AnalyticsEvent {
    return {
      $id: doc.$id,
      type: doc.type,
      userId: doc.userId,
      sessionId: doc.sessionId,
      data: doc.data,
      metadata: doc.metadata ? JSON.parse(doc.metadata) : {
        page: '/',
        timestamp: doc.$createdAt
      },
      $createdAt: doc.$createdAt
    };
  }
}

export default AnalyticsService;