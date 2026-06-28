'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUp, Bell, Loader2, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { useAuth } from '@/lib/auth';
import { useAlerts, useUpdateAlert, useDeleteAlert } from '@/hooks/useAlerts';
import { Card, FadeRise, Skeleton, Stagger, StaggerItem } from '@/components/ui';

const accentBtn =
  'inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-fg transition hover:bg-accent-hover';

export default function AlertsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { data: alerts = [], isLoading: loadingAlerts } = useAlerts();
  const deleteAlert = useDeleteAlert();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

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
      <div className="min-h-screen bg-canvas">
        <Header />
        <div className="flex h-[calc(100vh-80px)] items-center justify-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-hairline border-t-accent" />
        </div>
      </div>
    );
  }

  if (!user) return null;

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
            <h1 className="text-2xl font-semibold tracking-tight text-fg">APR Alerts</h1>
            <p className="mt-1 text-sm text-fg-muted">
              Get notified when APR rates cross your thresholds.
            </p>
          </div>
          <Link href="/dashboard/alerts/new" className={accentBtn}>
            <Plus className="h-4 w-4" />
            New Alert
          </Link>
        </FadeRise>

        <Card className="overflow-hidden">
          {loadingAlerts ? (
            <div className="divide-y divide-hairline">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-5">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-hover">
                <Bell className="h-6 w-6 text-fg-faint" />
              </div>
              <h3 className="text-sm font-medium text-fg">No alerts yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
                Create alerts to get notified when APR rates go above or below your thresholds.
              </p>
              <div className="mt-5 flex justify-center">
                <Link href="/dashboard/alerts/new" className={accentBtn}>
                  <Plus className="h-4 w-4" />
                  Create your first alert
                </Link>
              </div>
            </div>
          ) : (
            <Stagger className="divide-y divide-hairline">
              {alerts.map((alert) => (
                <StaggerItem key={alert.id}>
                  <AlertRow
                    alert={alert}
                    formatRelative={formatRelative}
                    onDelete={() => deleteAlert.mutate(alert.id)}
                    deleting={deleteAlert.isPending && deleteAlert.variables === alert.id}
                  />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </Card>

        <div className="mt-6 rounded-lg border border-accent/20 bg-accent-soft p-4">
          <h4 className="mb-1 text-sm font-medium text-accent">How alerts work</h4>
          <p className="text-sm text-fg-muted">
            Alerts are checked whenever new APR data is collected. When an alert triggers, you&apos;ll
            receive a notification. To prevent spam, the same alert won&apos;t trigger again for at
            least 1 hour.
          </p>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row component (needs its own hook call per alert)
// ---------------------------------------------------------------------------
interface Alert {
  id: string;
  asset: string;
  exchange: string | null;
  condition: 'above' | 'below';
  threshold: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

function AlertRow({
  alert,
  formatRelative,
  onDelete,
  deleting,
}: {
  alert: Alert;
  formatRelative: (d?: string) => string;
  onDelete: () => void;
  deleting: boolean;
}) {
  const updateAlert = useUpdateAlert(alert.id);
  const isAbove = alert.condition === 'above';

  const toggle = () => {
    updateAlert.mutate({ active: !alert.active });
  };

  return (
    <div className={`p-5 transition hover:bg-surface-hover ${!alert.active ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isAbove ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
            }`}
          >
            {isAbove ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-fg">{alert.asset}</h3>
              {alert.exchange && (
                <span className="rounded bg-surface-active px-2 py-0.5 text-xs text-fg-muted">
                  {alert.exchange}
                </span>
              )}
              {!alert.active && (
                <span className="rounded bg-surface-active px-2 py-0.5 text-xs text-fg-faint">
                  Paused
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-fg-muted">
              Alert when APR goes{' '}
              <span className={isAbove ? 'text-success' : 'text-danger'}>
                {alert.condition} {alert.threshold}%
              </span>
            </p>
            <div className="mt-2 text-xs text-fg-faint">Created {formatRelative(alert.createdAt)}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            disabled={updateAlert.isPending}
            className={`rounded-md p-2 transition disabled:opacity-50 ${
              alert.active
                ? 'text-accent hover:bg-accent-soft'
                : 'text-fg-faint hover:bg-surface-active hover:text-fg'
            }`}
            title={alert.active ? 'Pause alert' : 'Enable alert'}
          >
            {alert.active ? <ToggleRight className="h-6 w-6" /> : <ToggleLeft className="h-6 w-6" />}
          </button>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="rounded-md p-2 text-fg-faint transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
            title="Delete alert"
          >
            {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
