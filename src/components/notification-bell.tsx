'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const FETCH_INTERVAL_MS = 30_000;

export function NotificationBell() {
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=20', { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as { success: boolean; data?: unknown[] };
      const list: Notification[] = Array.isArray(data?.data)
        ? (data.data as Record<string, unknown>[]).map((n) => ({
            ...n,
            id: String(n.id ?? n._id ?? ''),
          })) as Notification[]
        : [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) return;
      const wasUnread = !notifications.find((n) => n.id === id)?.read;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) void fetchNotifications();
        }}
        className="relative rounded-md p-2 text-fg-faint transition hover:bg-surface-hover hover:text-fg"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-hairline bg-surface shadow-overlay"
          >
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <h3 className="font-semibold text-fg">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={() => void markAllAsRead()} className="text-xs text-accent transition hover:text-accent-hover">
                  Mark all as read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-hairline border-t-accent" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-fg-faint" />
                  <p className="text-sm text-fg-muted">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`border-b border-hairline px-4 py-3 transition hover:bg-surface-hover ${
                      !notification.read ? 'bg-accent-soft' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                          <p className="truncate text-sm font-medium text-fg">{notification.title}</p>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{notification.message}</p>
                        <p className="mt-1 text-xs text-fg-faint">{formatTime(notification.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => void markAsRead(notification.id)}
                            className="rounded-md p-1 text-fg-faint transition hover:bg-accent-soft hover:text-accent"
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => void deleteNotification(notification.id)}
                          className="rounded-md p-1 text-fg-faint transition hover:bg-danger-soft hover:text-danger"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="border-t border-hairline px-4 py-3 text-center">
                <a href="/dashboard/notifications" className="text-sm text-accent transition hover:text-accent-hover">
                  View all notifications
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
