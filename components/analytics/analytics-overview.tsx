"use client";

import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

interface AnalyticsMetric {
  title: string;
  value: string | number;
  change: number;
  icon: string;
  color: string;
}

interface AnalyticsOverviewProps {
  metrics: AnalyticsMetric[];
  period: string;
}

export default function AnalyticsOverview({ metrics, period }: AnalyticsOverviewProps) {
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-text-muted';
  };

  const getIcon = (iconName: string) => {
    const icons = {
      revenue: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      orders: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      customers: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      conversion: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      views: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      rating: (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      )
    };
    return icons[iconName as keyof typeof icons] || icons.revenue;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-text-primary">Analytics Overview</h2>
        <span className="text-sm text-text-muted capitalize">{period} Performance</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-text-muted mb-1">{metric.title}</p>
                <p className="text-2xl font-bold text-text-primary">
                  {typeof metric.value === 'number' && metric.title.toLowerCase().includes('revenue')
                    ? formatPrice(metric.value / 100)
                    : metric.value
                  }
                </p>
                <div className="flex items-center mt-2">
                  <span className={`text-sm font-medium ${getChangeColor(metric.change)}`}>
                    {formatChange(metric.change)}
                  </span>
                  <span className="text-xs text-text-muted ml-1">vs last {period}</span>
                </div>
              </div>
              
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${metric.color}`}>
                {getIcon(metric.icon)}
              </div>
            </div>

            {/* Mini trend indicator */}
            <div className="mt-4 h-2 bg-background-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  metric.change > 0 ? 'bg-green-500' : 
                  metric.change < 0 ? 'bg-red-500' : 'bg-gray-500'
                }`}
                style={{ width: `${Math.min(Math.abs(metric.change) * 2, 100)}%` }}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 