'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, Bell, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';

type Alert = {
  id: string;
  asset: string;
  platform: string;
  alertType: 'above' | 'below';
  threshold: number;
  isActive: boolean;
  lastTriggered?: string;
  createdAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '';

export default function AlertsPage() {
  const router = useRouter();
  const { user, isLoading, token } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        } else if (Array.isArray(data)) {
          setAlerts(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoadingAlerts(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void fetchAlerts();
    }
  }, [token, fetchAlerts]);

  const toggleAlert = async (alertId: string, currentState: boolean) => {
    setUpdating(alertId);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${alertId}`, {
        method: 'PUT',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentState }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, isActive: !currentState } : a)));
      }
    } catch (error) {
      console.error('Failed to toggle alert:', error);
    } finally {
      setUpdating(null);
    }
  };

  const [pendingDelete, setPendingDelete] = useState<Alert | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAlert = async (alertId: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
        setPendingDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete alert:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatRelative = (dateString?: string) => {
    if (!dateString) return 'Not triggered yet';
    const then = new Date(dateString).getTime();
    const diffMs = Date.now() - then;
    const mins = Math.floor(diffMs / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
            <h1 className="text-3xl font-bold text-white">APR Alerts</h1>
            <p className="text-gray-400 mt-1">Get notified when APR rates cross your thresholds</p>
          </div>
          <Link href="/dashboard/alerts/new" className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
            <Plus className="h-4 w-4" />
            <span>New Alert</span>
          </Link>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700">
          {loadingAlerts ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500 mx-auto" />
              <p className="text-gray-400 mt-4">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">No alerts yet</h3>
              <p className="text-gray-400 mb-6 max-w-sm mx-auto">Create alerts to get notified when APR rates go above or below your specified thresholds.</p>
              <Link href="/dashboard/alerts/new" className="inline-flex items-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                <Plus className="h-5 w-5" />
                <span>Create Your First Alert</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {alerts.map((alert) => (
                <div key={alert.id} className={`p-6 hover:bg-gray-700/30 transition-colors ${!alert.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          alert.alertType === 'above' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}
                      >
                        {alert.alertType === 'above' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-white text-lg">{alert.asset}</h3>
                          <span className="text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-300">{alert.platform}</span>
                          {!alert.isActive && <span className="text-xs px-2 py-0.5 bg-gray-600 rounded text-gray-400">Paused</span>}
                        </div>
                        <p className="text-gray-400 mt-1">
                          Alert when APR goes{' '}
                          <span className={alert.alertType === 'above' ? 'text-green-400' : 'text-red-400'}>
                            {alert.alertType} {alert.threshold}%
                          </span>
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Created {formatRelative(alert.createdAt)}</span>
                          <span>•</span>
                          <span>Last triggered {formatRelative(alert.lastTriggered)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleAlert(alert.id, alert.isActive)}
                        disabled={updating === alert.id}
                        className={`p-2 rounded-lg transition-colors ${
                          alert.isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-gray-500 hover:bg-gray-700'
                        }`}
                        title={alert.isActive ? 'Pause alert' : 'Enable alert'}
                      >
                        {alert.isActive ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
                      </button>
                      <button
                        onClick={() => setPendingDelete(alert)}
                        disabled={updating === alert.id}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete alert"
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

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h4 className="text-blue-400 font-medium mb-1">How alerts work</h4>
          <p className="text-gray-400 text-sm">
            Alerts are checked whenever new APR data is collected. When an alert triggers, you&apos;ll receive a notification. To prevent spam, the same
            alert won&apos;t trigger again for at least 1 hour.
          </p>
        </div>
      </main>

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isDeleting && setPendingDelete(null)} />
          <div className="relative z-10 w-full max-w-md bg-gray-800 border border-gray-700 rounded-xl shadow-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm uppercase tracking-wide text-gray-400">Delete Alert</p>
                  <h3 className="text-xl font-semibold text-white mt-1">
                    {pendingDelete.asset} on {pendingDelete.platform}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    When APR goes {pendingDelete.alertType} {pendingDelete.threshold}%
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-4">
                This will remove the alert. You can create it again later if needed.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-700 text-gray-200 hover:bg-gray-700 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteAlert(pendingDelete.id)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Alert'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

