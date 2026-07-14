import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
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

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">Notifications</h1>
        <Button variant="ghost" size="sm" onClick={() => void markAll()}>
          Mark all read
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-2xl border p-4 ${
              n.read
                ? 'border-border bg-card'
                : 'border-bolt-200 bg-bolt-50 dark:bg-bolt-950/50'
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
