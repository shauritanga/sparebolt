import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { registerWebPush } from '@/lib/push';
import { formatRelative } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type Notification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  type: string;
};

export function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushOn, setPushOn] = useState(
    () =>
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted',
  );

  const load = () => {
    void api.get('/notifications').then((r) => setItems(r.data));
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    await api.post('/notifications/read-all');
    load();
  };

  const enablePush = async () => {
    setPushBusy(true);
    try {
      const res = await registerWebPush();
      if (res.ok) {
        setPushOn(true);
        toast.success('Push notifications enabled');
      } else if (res.reason === 'vapid-missing') {
        toast.error(
          'Push not configured (missing VAPID key). Ask admin to add Web Push certificate.',
        );
      } else if (res.reason === 'permission-denied') {
        toast.error('Notification permission blocked in browser settings');
      } else {
        toast.error(`Could not enable push (${res.reason || 'unknown'})`);
      }
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-extrabold">Notifications</h1>
        <Button variant="ghost" size="sm" onClick={() => void markAll()}>
          Mark all read
        </Button>
      </div>

      {!pushOn && (
        <div className="flex items-start gap-3 rounded-2xl border border-accent-border bg-accent-soft p-4">
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-accent-soft-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Enable push notifications
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Get alerts for orders, deliveries, and account updates even when
              the app is closed.
            </p>
            <Button
              size="sm"
              className="mt-3"
              loading={pushBusy}
              onClick={() => void enablePush()}
            >
              Allow notifications
            </Button>
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-2xl border p-4 ${
              n.read
                ? 'border-border bg-card'
                : 'border-accent-border bg-accent-soft'
            }`}
          >
            <p className="font-semibold text-foreground">{n.title}</p>
            <p className="text-sm text-muted-foreground">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatRelative(n.createdAt)}
            </p>
          </li>
        ))}
        {!items.length && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No notifications yet
          </p>
        )}
      </ul>
    </div>
  );
}
