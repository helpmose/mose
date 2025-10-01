"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NotificationService, NotificationData } from '@/lib/services/notifications';

interface NotificationStore {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Actions
  fetchNotifications: (userId: string, force?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  addNotification: (notification: NotificationData) => void;
  clearError: () => void;
  reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      lastFetched: null,

      fetchNotifications: async (userId: string, force = false) => {
        const state = get();
        const now = Date.now();
        
        // Check cache unless forced refresh
        if (!force && state.lastFetched && (now - state.lastFetched) < CACHE_DURATION) {
          return;
        }

        set({ loading: true, error: null });

        try {
          console.log('🔔 Fetching notifications for user:', userId);
          const response = await NotificationService.getUserNotifications(userId, 50);
          
          set({
            notifications: response.notifications,
            unreadCount: response.unreadCount,
            loading: false,
            lastFetched: now
          });

          console.log(`✅ Loaded ${response.notifications.length} notifications, ${response.unreadCount} unread`);
        } catch (error) {
          console.error('❌ Error fetching notifications:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to load notifications'
          });
        }
      },

      markAsRead: async (notificationId: string) => {
        try {
          await NotificationService.markAsRead(notificationId);
          
          set(state => ({
            notifications: state.notifications.map(n =>
              n.$id === notificationId ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1)
          }));

          console.log(`✅ Marked notification as read: ${notificationId}`);
        } catch (error) {
          console.error('❌ Error marking notification as read:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to mark as read' });
        }
      },

      markAllAsRead: async (userId: string) => {
        const state = get();
        if (state.unreadCount === 0) return;

        try {
          await NotificationService.markAllAsRead(userId);
          
          set(state => ({
            notifications: state.notifications.map(n => ({ ...n, isRead: true })),
            unreadCount: 0
          }));

          console.log('✅ Marked all notifications as read');
        } catch (error) {
          console.error('❌ Error marking all as read:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to mark all as read' });
        }
      },

      deleteNotification: async (notificationId: string) => {
        const state = get();
        const notification = state.notifications.find(n => n.$id === notificationId);
        
        try {
          await NotificationService.deleteNotification(notificationId);
          
          set(state => ({
            notifications: state.notifications.filter(n => n.$id !== notificationId),
            unreadCount: notification && !notification.isRead 
              ? Math.max(0, state.unreadCount - 1) 
              : state.unreadCount
          }));

          console.log(`✅ Deleted notification: ${notificationId}`);
        } catch (error) {
          console.error('❌ Error deleting notification:', error);
          set({ error: error instanceof Error ? error.message : 'Failed to delete notification' });
        }
      },

      addNotification: (notification: NotificationData) => {
        set(state => {
          // Check if notification already exists to prevent duplicates
          const exists = state.notifications.some(n => n.$id === notification.$id);
          if (exists) return state;

          return {
            notifications: [notification, ...state.notifications],
            unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1
          };
        });

        console.log(`✅ Added new notification: ${notification.title}`);
      },

      clearError: () => set({ error: null }),

      reset: () => set({
        notifications: [],
        unreadCount: 0,
        loading: false,
        error: null,
        lastFetched: null
      })
    }),
    {
      name: 'notification-store',
      // Only persist basic state, not functions
      partialize: (state) => ({
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        lastFetched: state.lastFetched
      }),
      // Clear persisted state after 1 hour
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Reset store on version upgrade
          return {
            notifications: [],
            unreadCount: 0,
            loading: false,
            error: null,
            lastFetched: null
          };
        }
        return persistedState;
      }
    }
  )
);

// Export the store for direct access when needed
export default useNotificationStore;