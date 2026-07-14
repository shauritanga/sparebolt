import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MapPin, Navigation, Power, Store, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';

type DriverTab = 'available' | 'active' | 'earnings';

function tabFromSearch(raw: string | null): DriverTab {
  if (raw === 'active' || raw === 'earnings') return raw;
  return 'available';
}

type Job = {
  id: string;
  status: string;
  fee: string | number;
  pickupLabel?: string | null;
  pickupCity?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  distanceKm?: number | null;
  matchReason?: string;
  order: {
    orderNumber: string;
    total: string | number;
    address: { street: string; area?: string; city: string };
    items: { title: string; quantity: number }[];
    customer: { firstName: string; lastName: string; phone?: string };
  };
};

function readGps(): Promise<{ lat: number; lng: number } | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 },
    );
  });
}

export function DriverPage() {
  const driverProfile = useAuthStore((s) => s.user?.driverProfile);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [searchParams, setSearchParams] = useSearchParams();
  const [available, setAvailable] = useState<Job[]>([]);
  const [mine, setMine] = useState<Job[]>([]);
  const [earnings, setEarnings] = useState<{
    totalEarnings: number;
    completedJobs: number;
    ratingAvg: number;
  } | null>(null);
  const [online, setOnline] = useState(!!driverProfile?.isOnline);
  const tab = tabFromSearch(searchParams.get('tab'));
  const setTab = (next: DriverTab) => {
    if (next === 'available') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: next }, { replace: true });
    }
  };
  const [locHint, setLocHint] = useState<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const approved = driverProfile?.status === 'APPROVED';

  const activeJob = mine.find(
    (j) =>
      j.status === 'ACCEPTED' ||
      j.status === 'PICKED_UP' ||
      j.status === 'IN_TRANSIT',
  );

  const load = useCallback(() => {
    if (!approved) return;
    void api.get('/driver/jobs/available').then((r) => setAvailable(r.data));
    void api.get('/driver/jobs').then((r) => setMine(r.data));
    void api.get('/driver/earnings').then((r) => setEarnings(r.data));
  }, [approved]);

  const pushLocation = useCallback(
    async (opts?: { forceActive?: boolean }) => {
      if (!approved) return;
      if (!online && !opts?.forceActive && !activeJob) return;
      const coords = await readGps();
      if (!coords) {
        if (online || activeJob) {
          setLocHint(
            activeJob
              ? 'Enable GPS so the customer can track you live'
              : 'Location unavailable — jobs match by city until GPS is allowed',
          );
        }
        return;
      }
      setLocHint(null);
      try {
        // Profile heartbeat (dispatch) — also mirrors onto active delivery server-side
        await api.patch('/driver/location', coords);
        // Explicit job location for live customer map
        if (activeJob) {
          await api.patch(`/driver/jobs/${activeJob.id}/location`, coords);
        }
      } catch {
        /* ignore heartbeat errors */
      }
    },
    [online, approved, activeJob],
  );

  useEffect(() => {
    setOnline(!!driverProfile?.isOnline);
  }, [driverProfile?.isOnline]);

  useEffect(() => {
    load();
    if (!approved) return;
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [approved, load]);

  // GPS: faster while on active job (customer live track); slower when just online
  useEffect(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (!approved) return;
    if (!online && !activeJob) return;

    const intervalMs = activeJob ? 12_000 : 45_000;
    void pushLocation({ forceActive: !!activeJob });
    heartbeatRef.current = setInterval(() => {
      void pushLocation({ forceActive: !!activeJob });
    }, intervalMs);

    // Continuous watch while on a job for smoother customer map
    if (activeJob && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setLocHint(null);
          void api.patch('/driver/location', coords).catch(() => undefined);
          void api
            .patch(`/driver/jobs/${activeJob.id}/location`, coords)
            .catch(() => undefined);
        },
        () => {
          setLocHint('Enable GPS so the customer can track you live');
        },
        { enableHighAccuracy: true, maximumAge: 8_000, timeout: 15_000 },
      );
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [online, approved, activeJob?.id, activeJob?.status, pushLocation]);

  const toggleOnline = async () => {
    const next = !online;
    const coords = next ? await readGps() : null;
    try {
      const { data } = await api.patch('/driver/online', {
        isOnline: next,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      });
      setOnline(data.isOnline ?? next);
      void refreshMe();
      if (next && !coords) {
        toast.message('You are online', {
          description:
            'Enable location for nearby job matching. Falling back to city.',
        });
        setLocHint(
          'Location unavailable — jobs match by city until GPS is allowed',
        );
      } else {
        toast.success(next ? 'You are online' : 'You are offline');
        setLocHint(null);
      }
      load();
    } catch {
      toast.error('Could not update online status');
    }
  };

  const accept = async (id: string) => {
    try {
      await api.post(`/driver/jobs/${id}/accept`);
      toast.success('Job accepted');
      load();
      setTab('active');
    } catch {
      toast.error('Could not accept job — may already be taken');
    }
  };

  const decline = async (id: string) => {
    try {
      await api.post(`/driver/jobs/${id}/reject`, { reason: 'busy' });
      toast.message('Job declined');
      load();
    } catch {
      toast.error('Could not decline');
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
    const coords = await readGps();
    try {
      await api.patch(`/driver/jobs/${job.id}/status`, {
        status: next,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      });
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
        <div className="panel-warning p-6 text-left">
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

      {locHint && online && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
          {locHint}
        </p>
      )}

      {!online && (
        <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Go online to receive job push notifications near shops in your area.
        </p>
      )}

      <div className="flex rounded-xl bg-muted p-1">
        {(['available', 'active', 'earnings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize cursor-pointer min-h-[40px] ${
              tab === t
                ? 'bg-card shadow-sm text-bolt-800 dark:text-bolt-200'
                : 'text-muted-foreground'
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
                <p className="font-bold text-bolt-800 dark:text-bolt-200">
                  {formatTZS(j.fee)}
                </p>
              </div>

              {(j.pickupLabel || j.pickupCity) && (
                <p className="mt-2 flex items-start gap-1 text-sm font-semibold">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-bolt-700 dark:text-bolt-300" />
                  Pickup: {j.pickupLabel || j.pickupCity}
                  {j.distanceKm != null && (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      · ~{j.distanceKm.toFixed(1)} km
                    </span>
                  )}
                </p>
              )}

              <p className="mt-1 flex items-start gap-1 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                Drop-off: {j.order.address.street}
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
                <Button
                  variant="secondary"
                  className="px-3"
                  onClick={() => void decline(j.id)}
                  aria-label="Decline job"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {!available.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {online
                ? 'No nearby jobs right now'
                : 'Go online to see available jobs'}
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
                <p className="mt-2 text-[11px] font-semibold text-bolt-700 dark:text-bolt-300">
                  Sharing live location with customer
                </p>
                {(j.pickupLabel || j.pickupCity) && (
                  <p className="mt-2 flex items-start gap-1 text-sm font-semibold">
                    <Store className="mt-0.5 h-4 w-4 shrink-0" />
                    Pickup: {j.pickupLabel || j.pickupCity}
                  </p>
                )}
                <p className="mt-1 text-sm">
                  Drop-off: {j.order.address.street}, {j.order.address.city}
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
