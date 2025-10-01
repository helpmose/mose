"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from "@/components/layout/header";
import { GiftService, GiftEvent } from '@/lib/services/gifts';
import { useAuthStore } from '@/store/auth-store';
import { GIFT_EVENT_STATUS } from '@/lib/constants';

export default function GiftEventsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [giftEvents, setGiftEvents] = useState<GiftEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'draft'>('all');
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    completedEvents: 0,
    totalRaised: 0,
    totalContributions: 0,
    averageGoalCompletion: 0
  });

  useEffect(() => {
    if (user) {
      loadGiftEvents();
      loadStats();
    }
  }, [user, filter]);

  const loadGiftEvents = async () => {
    if (!user) return;

    try {
      const filterStatus = filter === 'all' ? undefined : filter;
      const result = await GiftService.getGiftEvents({
        creatorId: user.$id,
        status: filterStatus,
        sortBy: 'newest'
      });
      setGiftEvents(result.events);
    } catch (error) {
      console.error('Error loading gift events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user) return;

    try {
      const statsData = await GiftService.getGiftEventStats(user.$id);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  const getProgressPercentage = (event: GiftEvent) => {
    return Math.min((event.currentAmount / event.giftGoal) * 100, 100);
  };

  const getDaysUntilEvent = (eventDate: string) => {
    const event = new Date(eventDate);
    const today = new Date();
    const diffTime = event.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case GIFT_EVENT_STATUS.DRAFT:
        return 'bg-gray-500/20 text-gray-400';
      case GIFT_EVENT_STATUS.ACTIVE:
        return 'bg-green-500/20 text-green-400';
      case GIFT_EVENT_STATUS.COMPLETED:
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const updateEventStatus = async (eventId: string, newStatus: string) => {
    try {
      await GiftService.updateEventStatus(eventId, newStatus);
      await loadGiftEvents();
      alert('Event status updated successfully!');
    } catch (error) {
      console.error('Error updating event status:', error);
      alert('Failed to update event status.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background-primary text-text-primary">
        <Header />
        <div className="container mx-auto px-4 pt-32">
          <div className="text-center">
            <p className="text-text-muted">Please log in to view your gift events.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary text-text-primary">
      <Header />

      <div className="container mx-auto px-4 pt-32 pb-16">
        {/* Page Header */}
        <div className="mb-12">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-light mb-4 tracking-wide">
                My Gift Events
              </h1>
              <p className="text-xl text-text-muted font-light">
                Manage your birthday platforms and collaborative gifts
              </p>
            </div>
            <button
              onClick={() => router.push('/create')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create New Event
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6">
              <h3 className="text-text-muted text-sm font-medium mb-2">Total Events</h3>
              <p className="text-2xl font-bold text-text-primary">{stats.totalEvents}</p>
            </div>
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6">
              <h3 className="text-text-muted text-sm font-medium mb-2">Active Events</h3>
              <p className="text-2xl font-bold text-green-400">{stats.activeEvents}</p>
            </div>
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6">
              <h3 className="text-text-muted text-sm font-medium mb-2">Total Raised</h3>
              <p className="text-2xl font-bold text-blue-400">{formatCurrency(stats.totalRaised)}</p>
            </div>
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-6">
              <h3 className="text-text-muted text-sm font-medium mb-2">Avg. Completion</h3>
              <p className="text-2xl font-bold text-purple-400">{stats.averageGoalCompletion}%</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex space-x-4 mb-8">
            {(['all', 'active', 'completed', 'draft'] as const).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === filterOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-background-secondary border border-neutral-700 text-text-secondary hover:text-text-primary'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Gift Events List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-text-muted">Loading your gift events...</p>
          </div>
        ) : giftEvents.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {giftEvents.map((event) => (
              <div key={event.$id} className="bg-background-secondary border border-neutral-800 rounded-lg p-6">
                {/* Event Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-medium text-text-primary mb-1">{event.title}</h3>
                    <p className="text-text-muted text-sm">
                      For {event.recipientName} • {new Date(event.eventDate).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                      <span className="text-text-muted text-xs">
                        {getDaysUntilEvent(event.eventDate)} days to go
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-secondary">{formatCurrency(event.currentAmount)} raised</span>
                    <span className="text-text-primary">{formatCurrency(event.giftGoal)} goal</span>
                  </div>
                  <div className="w-full bg-background-tertiary rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(event)}%` }}
                    ></div>
                  </div>
                  <p className="text-text-muted text-xs">{event.contributorsCount} contributors</p>
                </div>

                {/* Description */}
                {event.description && (
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">{event.description}</p>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => router.push(`/gift/${event.$id}`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    View Event
                  </button>

                  {event.status === GIFT_EVENT_STATUS.DRAFT && (
                    <button
                      onClick={() => updateEventStatus(event.$id, GIFT_EVENT_STATUS.ACTIVE)}
                      className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Publish
                    </button>
                  )}

                  {event.status === GIFT_EVENT_STATUS.ACTIVE && (
                    <button
                      onClick={() => updateEventStatus(event.$id, GIFT_EVENT_STATUS.COMPLETED)}
                      className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Complete
                    </button>
                  )}

                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/gift/${event.$id}`;
                      navigator.clipboard.writeText(url);
                      alert('Event link copied to clipboard!');
                    }}
                    className="bg-neutral-700 hover:bg-neutral-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="bg-background-secondary border border-neutral-800 rounded-lg p-12 max-w-md mx-auto">
              <div className="text-6xl mb-4">🎁</div>
              <h3 className="text-xl font-medium text-text-primary mb-2">No Gift Events Yet</h3>
              <p className="text-text-muted mb-6">
                Create your first birthday platform to start collecting gifts from friends and family.
              </p>
              <button
                onClick={() => router.push('/create')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Create Your First Event
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}