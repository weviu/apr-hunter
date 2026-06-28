'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, Bell, Check, CheckCheck, Info, Loader2, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearReadNotifications,
} from '@/hooks/useNotifications';
import { Card, FadeRise, Skeleton, Stagger, StaggerItem } from '@/components/ui';

function notificationIcon(type: string): ReactNode {
  if (type === 'alert_above') return <ArrowUp className="h-5 w-5 text-success" />;
  if (type === 'alert_below') return <ArrowDown className="h-5 w-5 text-danger" />;
  return <Info className="h-5 w-5 text-accent" />;
}

function iconTileClass(type: string): string {
  if (type === 'alert_above') return 'bg-success-soft';
  if (type === 'alert_below') return 'bg-danger-soft';
  return 'bg-accent-soft';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading: loadingNotifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();
  const clearRead = useClearReadNotifications();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <Header />
        <div className="flex h-[calc(100vh-80px)] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-hairline border-t-accent" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const hasRead = notifications.some((n) => n.read);

  return (
    <div className="min-h-screen bg-canvas">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center text-sm text-fg-muted transition hover:text-fg"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        <FadeRise className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">Notifications</h1>
            <p className="mt-1 text-sm text-fg-muted">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-accent transition hover:bg-accent-soft disabled:opacity-50"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
            {hasRead && (
              <button
                onClick={() => clearRead.mutate()}
                disabled={clearRead.isPending}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-fg-muted transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Clear read
              </button>
            )}
          </div>
        </FadeRise>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-2">
          {(['all', 'unread'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                filter === tab
                  ? 'bg-accent-soft text-accent'
                  : 'text-fg-muted hover:bg-surface-hover hover:text-fg'
              }`}
            >
              {tab === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>

        <Card className="overflow-hidden">
          {loadingNotifications ? (
            <div className="divide-y divide-hairline">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-5">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover">
                <Bell className="h-6 w-6 text-fg-faint" />
              </div>
              <h3 className="text-sm font-medium text-fg">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
                {filter === 'unread'
                  ? 'You are all caught up!'
                  : 'Notifications will appear here when your alerts trigger.'}
              </p>
            </div>
          ) : (
            <Stagger className="divide-y divide-hairline">
              {filteredNotifications.map((notification) => (
                <StaggerItem key={notification.id}>
                  <div className={`p-5 transition hover:bg-surface-hover ${!notification.read ? 'bg-accent-soft' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconTileClass(
                          notification.type,
                        )}`}
                      >
                        {notificationIcon(notification.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!notification.read && <span className="h-2 w-2 rounded-full bg-accent" />}
                          <h3 className="font-medium text-fg">{notification.title}</h3>
                        </div>
                        <p className="mt-1 text-sm text-fg-muted">{notification.message}</p>
                        <p className="mt-2 text-xs text-fg-faint">{formatDate(notification.createdAt)}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => markRead.mutate(notification.id)}
                            disabled={markRead.isPending}
                            className="rounded-md p-2 text-fg-faint transition hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                            title="Mark as read"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification.mutate(notification.id)}
                          disabled={deleteNotification.isPending && deleteNotification.variables === notification.id}
                          className="rounded-md p-2 text-fg-faint transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                          title="Delete"
                        >
                          {deleteNotification.isPending && deleteNotification.variables === notification.id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Trash2 className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Card>
      </main>
    </div>
  );
}
