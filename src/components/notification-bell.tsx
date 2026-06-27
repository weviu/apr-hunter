'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
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
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={() => void markAllAsRead()} className="text-xs text-blue-700 hover:text-blue-400">
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-700 mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                    !notification.read ? 'bg-blue-700/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.read && <span className="w-2 h-2 bg-blue-700 rounded-full flex-shrink-0" />}
                        <p className="text-sm font-medium text-white truncate">{notification.title}</p>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatTime(notification.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => void markAsRead(notification.id)}
                          className="p-1 text-gray-500 hover:text-blue-400 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => void deleteNotification(notification.id)}
                        className="p-1 text-gray-500 hover:text-red-400 transition-colors"
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
            <div className="px-4 py-3 border-t border-gray-700 text-center">
              <a href="/dashboard/notifications" className="text-sm text-blue-700 hover:text-blue-400">
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
