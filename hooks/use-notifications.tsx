"use client";

import { useEffect } from 'react';
import { useNotificationStore } from '@/store/notification-store';
import { useAuthStore } from '@/store/auth-store';

/**
 * Custom hook for managing notifications with automatic fetching and real-time updates
 */
export const useNotifications = () => {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearError
  } = useNotificationStore();

  // Auto-fetch notifications when user logs in
  useEffect(() => {
    if (user && !loading) {
      fetchNotifications(user.$id);
    }
  }, [user, fetchNotifications, loading]);

  // Auto-refresh notifications every 2 minutes when user is active
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchNotifications(user.$id);
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Refresh notifications when page becomes visible (user returns to tab)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchNotifications(user.$id, true); // Force refresh when tab becomes active
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, fetchNotifications]);

  // Helper functions with user context
  const markNotificationAsRead = (notificationId: string) => {
    return markAsRead(notificationId);
  };

  const markAllNotificationsAsRead = () => {
    if (!user) return Promise.reject(new Error('User not authenticated'));
    return markAllAsRead(user.$id);
  };

  const deleteUserNotification = (notificationId: string) => {
    return deleteNotification(notificationId);
  };

  const refreshNotifications = (force = false) => {
    if (!user) return Promise.reject(new Error('User not authenticated'));
    return fetchNotifications(user.$id, force);
  };

  return {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    hasUser: !!user,

    // Actions
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    deleteNotification: deleteUserNotification,
    refreshNotifications,
    clearError,

    // Derived state
    hasNotifications: notifications.length > 0,
    hasUnreadNotifications: unreadCount > 0,
    unreadNotifications: notifications.filter(n => !n.isRead),
    readNotifications: notifications.filter(n => n.isRead)
  };
};

/**
 * Hook for getting real-time notification count without loading all notifications
 * Useful for header badges, mobile indicators, etc.
 */
export const useNotificationCount = () => {
  const { user } = useAuthStore();
  const { unreadCount, loading, fetchNotifications } = useNotificationStore();

  // Lightweight fetch for count only
  useEffect(() => {
    if (user && !loading) {
      fetchNotifications(user.$id);
    }
  }, [user, fetchNotifications, loading]);

  return {
    unreadCount,
    loading,
    hasUnread: unreadCount > 0
  };
};

export default useNotifications;