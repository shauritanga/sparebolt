import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MapPin, Navigation, Power } from 'lucide-react';
import { api } from '@/lib/api';
import { formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';

type Job = {
  id: string;
  status: string;
  fee: string | number;
  order: {
    orderNumber: string;
    total: string | number;
    address: { street: string; area?: string; city: string };
    items: { title: string; quantity: number }[];
    customer: { firstName: string; lastName: string; phone?: string };
  };
};

export function DriverPage() {
  const driverProfile = useAuthStore((s) => s.user?.driverProfile);
  const [available, setAvailable] = useState<Job[]>([]);
  const [mine, setMine] = useState<Job[]>([]);
  const [earnings, setEarnings] = useState<{
    totalEarnings: number;
    completedJobs: number;
    ratingAvg: number;
  } | null>(null);
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState<'available' | 'active' | 'earnings'>(
    'available',
  );

  const approved = driverProfile?.status === 'APPROVED';

  const load = () => {
    if (!approved) return;
    void api.get('/driver/jobs/available').then((r) => setAvailable(r.data));
    void api.get('/driver/jobs').then((r) => setMine(r.data));
    void api.get('/driver/earnings').then((r) => setEarnings(r.data));
  };

  useEffect(() => {
    load();
    if (!approved) return;
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approved]);

  const toggleOnline = async () => {
    const next = !online;
    await api.patch('/driver/online', { isOnline: next });
    setOnline(next);
    toast.success(next ? 'You are online' : 'You are offline');
  };

  const accept = async (id: string) => {
    try {
      await api.post(`/driver/jobs/${id}/accept`);
      toast.success('Job accepted');
      load();
      setTab('active');
    } catch {
      toast.error('Could not accept job');
    }
  };

  const advance = async (job: Job) => {
    const flow: Record<string, string> = {
      ACCEPTED: 'PICKED_UP',
      PICKED_UP: 'IN_TRANSIT',
      IN_TRANSIT: 'DELIVERED',
    };
    const next = flow[job.status];
    if (!next) return;
    try {
      await api.patch(`/driver/jobs/${job.id}/status`, { status: next });
      toast.success(`Status: ${next}`);
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  if (driverProfile && !approved) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8 text-center">
        <h1 className="font-display text-2xl font-extrabold">Driver</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left">
          <Badge variant="warning">{driverProfile.status}</Badge>
          <p className="mt-3 font-semibold text-foreground">
            {driverProfile.status === 'PENDING'
              ? 'Your application is under review'
              : 'You cannot accept jobs right now'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {driverProfile.status === 'PENDING'
              ? 'An admin must verify your ID, vehicle, and licence before you go online.'
              : driverProfile.rejectionReason ||
                'Contact support if you believe this is an error.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">Driver</h1>
        <Button
          variant={online ? 'default' : 'secondary'}
          size="sm"
          onClick={() => void toggleOnline()}
        >
          <Power className="h-4 w-4" />
          {online ? 'Online' : 'Offline'}
        </Button>
      </div>

      <div className="flex rounded-xl bg-muted p-1">
        {(['available', 'active', 'earnings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize cursor-pointer min-h-[40px] ${
              tab === t ? 'bg-card shadow-sm text-bolt-800 dark:text-bolt-200' : 'text-muted-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'available' && (
        <ul className="space-y-3">
          {available.map((j) => (
            <li
              key={j.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex justify-between">
                <p className="font-mono text-xs text-muted-foreground">
                  {j.order.orderNumber}
                </p>
                <p className="font-bold text-bolt-800 dark:text-bolt-200">{formatTZS(j.fee)}</p>
              </div>
              <p className="mt-1 flex items-start gap-1 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-bolt-700 dark:text-bolt-300" />
                {j.order.address.street}
                {j.order.address.area ? `, ${j.order.address.area}` : ''},{' '}
                {j.order.address.city}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {j.order.items.map((i) => i.title).join(', ')}
              </p>
              <p className="text-xs text-muted-foreground">
                Customer: {j.order.customer.firstName}{' '}
                {j.order.customer.lastName}
              </p>
              <div className="mt-3 flex gap-2">
                <Button className="flex-1" onClick={() => void accept(j.id)}>
                  Accept
                </Button>
              </div>
            </li>
          ))}
          {!available.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No nearby jobs right now
            </p>
          )}
        </ul>
      )}

      {tab === 'active' && (
        <ul className="space-y-3">
          {mine
            .filter((j) => j.status !== 'DELIVERED' && j.status !== 'REJECTED')
            .map((j) => (
              <li
                key={j.id}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs">{j.order.orderNumber}</p>
                  <Badge>{j.status}</Badge>
                </div>
                <p className="mt-2 text-sm font-semibold">
                  {j.order.address.street}, {j.order.address.city}
                </p>
                {j.order.customer.phone && (
                  <a
                    href={`tel:${j.order.customer.phone}`}
                    className="text-sm font-semibold text-bolt-700 dark:text-bolt-300"
                  >
                    Call {j.order.customer.phone}
                  </a>
                )}
                <Button
                  className="mt-3 w-full"
                  onClick={() => void advance(j)}
                  disabled={j.status === 'DELIVERED'}
                >
                  <Navigation className="h-4 w-4" />
                  {j.status === 'ACCEPTED' && 'Mark picked up'}
                  {j.status === 'PICKED_UP' && 'Start transit'}
                  {j.status === 'IN_TRANSIT' && 'Mark delivered'}
                  {j.status === 'REQUESTED' && 'Pending…'}
                </Button>
              </li>
            ))}
          {!mine.filter(
            (j) => j.status !== 'DELIVERED' && j.status !== 'REJECTED',
          ).length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No active jobs
            </p>
          )}
        </ul>
      )}

      {tab === 'earnings' && earnings && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-display font-bold text-bolt-800 dark:text-bolt-200">
              {formatTZS(earnings.totalEarnings)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">Jobs</p>
            <p className="font-display font-bold">{earnings.completedJobs}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 text-center">
            <p className="text-xs text-muted-foreground">Rating</p>
            <p className="font-display font-bold">
              {earnings.ratingAvg.toFixed(1)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
