'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, Bell, Check, CheckCheck, Info, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    asset?: string;
    platform?: string;
    currentApr?: number;
    threshold?: number;
    alertType?: string;
  };
  read: boolean;
  createdAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (token) {
      void fetchNotifications();
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications?limit=100`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
        } else if (Array.isArray(data)) {
          setNotifications(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const clearAllRead = async () => {
    if (!confirm('Delete all read notifications?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/clear-read`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => !n.read));
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.type === 'alert_triggered' && notification.data?.alertType) {
      return notification.data.alertType === 'above' ? <ArrowUp className="h-5 w-5 text-green-500" /> : <ArrowDown className="h-5 w-5 text-red-500" />;
    }
    return <Info className="h-5 w-5 text-blue-500" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const filteredNotifications = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            <p className="text-gray-400 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="flex items-center gap-2 px-4 py-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors">
                <CheckCheck className="h-4 w-4" />
                <span className="text-sm">Mark all read</span>
              </button>
            )}
            {notifications.some((n) => n.read) && (
              <button
                onClick={clearAllRead}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-sm">Clear read</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700">
          {loadingNotifications ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto" />
              <p className="text-gray-400 mt-4">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</h3>
              <p className="text-gray-400 max-w-sm mx-auto">
                {filter === 'unread' ? "You're all caught up!" : 'Notifications will appear here when your alerts are triggered.'}
              </p>
              <Link
                href="/dashboard/alerts/new"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <Bell className="h-5 w-5" />
                <span>Create an Alert</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-700/30 transition-colors ${!notification.read ? 'bg-emerald-500/5' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notification.data?.alertType === 'above'
                          ? 'bg-green-500/10'
                          : notification.data?.alertType === 'below'
                          ? 'bg-red-500/10'
                          : 'bg-blue-500/10'
                      }`}
                    >
                      {getNotificationIcon(notification)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.read && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
                        <h3 className="font-semibold text-white">{notification.title}</h3>
                      </div>
                      <p className="text-gray-400 mt-1">{notification.message}</p>
                      {notification.data && (
                        <div className="flex items-center gap-4 mt-2">
                          {notification.data.asset && <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">{notification.data.asset}</span>}
                          {notification.data.platform && (
                            <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">{notification.data.platform}</span>
                          )}
                          {notification.data.currentApr !== undefined && (
                            <span className="text-xs text-emerald-400">Current: {notification.data.currentApr.toFixed(2)}%</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">{formatDate(notification.createdAt)}</p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

