import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Notification } from '../types';
import { authApi } from '../api';

interface AuthState {
  user: User | null;
  token: string | null;
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  setNotifications: (notifs: Notification[]) => void;
  addNotification: (notif: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  fetchNotifications: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(email, password);
          const { user, token } = res.data;
          localStorage.setItem('somp_token', token);
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('somp_token');
        localStorage.removeItem('somp_user');
        set({ user: null, token: null, notifications: [], unreadCount: 0 });
      },

      setUser: (user) => set({ user }),

      setNotifications: (notifications) => {
        const unreadCount = notifications.filter((n) => !n.is_read).length;
        set({ notifications, unreadCount });
      },

      addNotification: (notif) => {
        const notifications = [notif, ...get().notifications];
        const unreadCount = notifications.filter((n) => !n.is_read).length;
        set({ notifications, unreadCount });
      },

      markRead: (id) => {
        const notifications = get().notifications.map((n) =>
          n.id === id ? { ...n, is_read: true } : n
        );
        const unreadCount = notifications.filter((n) => !n.is_read).length;
        set({ notifications, unreadCount });
        authApi.markNotificationRead(id);
      },

      markAllRead: () => {
        const notifications = get().notifications.map((n) => ({ ...n, is_read: true }));
        set({ notifications, unreadCount: 0 });
        authApi.markAllRead();
      },

      fetchNotifications: async () => {
        try {
          const res = await authApi.getNotifications();
          get().setNotifications(res.data);
        } catch (e) { /* silent */ }
      },
    }),
    {
      name: 'somp-auth',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);
