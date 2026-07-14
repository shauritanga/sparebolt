import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Navigation, Phone, Star, Store, MapPin } from 'lucide-react';
import { api, type Order } from '@/lib/api';
import { formatRelative, formatTZS } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DeliveryTrackingMap,
  distanceKm,
  etaMinutes,
} from '@/components/delivery-tracking-map';

const statusVariant: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'muted'
> = {
  PENDING_PAYMENT: 'warning',
  PAID_ESCROW: 'default',
  AWAITING_DRIVER: 'default',
  DRIVER_ASSIGNED: 'default',
  PICKED_UP: 'default',
  IN_TRANSIT: 'warning',
  DELIVERED: 'success',
  CONFIRMED: 'success',
  DISPUTED: 'danger',
  REFUNDED: 'muted',
  CANCELLED: 'muted',
};

export function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api
      .get('/orders')
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-display text-2xl font-extrabold">{t('orders')}</h1>
      {!orders.length && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No orders yet.{' '}
          <Link
            to="/browse"
            className="font-semibold text-bolt-700 dark:text-bolt-300"
          >
            {t('browse')}
          </Link>
        </p>
      )}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              to={`/orders/${o.id}`}
              className="block rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-bolt-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {o.orderNumber}
                  </p>
                  <p className="font-display font-bold text-foreground">
                    {formatTZS(o.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.items?.length} item(s) · {formatRelative(o.createdAt)}
                  </p>
                </div>
                <Badge variant={statusVariant[o.status] || 'muted'}>
                  {o.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

type PartyReviewDraft = {
  rating: number;
  comment: string;
  submitting: boolean;
};

export function OrderDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [sellerDrafts, setSellerDrafts] = useState<
    Record<string, PartyReviewDraft>
  >({});
  const [driverDraft, setDriverDraft] = useState<PartyReviewDraft>({
    rating: 5,
    comment: '',
    submitting: false,
  });
  const [loading, setLoading] = useState(true);

  const trackingLive = !!order?.tracking?.enabled;

  const load = () => {
    if (!id) return;
    void api
      .get(`/orders/${id}`)
      .then((r) => {
        const o = r.data as Order;
        setOrder(o);
        // Init seller drafts once we know unique sellers
        const sellers = uniqueSellers(o);
        setSellerDrafts((prev) => {
          const next = { ...prev };
          for (const s of sellers) {
            if (!next[s.id]) {
              next[s.id] = { rating: 5, comment: '', submitting: false };
            }
          }
          return next;
        });
      })
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // Faster poll while live tracking so map feels realtime
    const ms = trackingLive ? 3000 : 5000;
    const iv = setInterval(load, ms);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, trackingLive]);

  const track = order?.tracking;
  const driverPt =
    track?.currentLat != null && track?.currentLng != null
      ? {
          lat: track.currentLat,
          lng: track.currentLng,
          label: track.driver?.name || 'Driver',
        }
      : null;
  const pickupPt =
    track?.pickupLat != null && track?.pickupLng != null
      ? {
          lat: track.pickupLat,
          lng: track.pickupLng,
          label: track.pickupLabel || track.pickupCity || 'Shop',
        }
      : null;
  const dropoffPt =
    track?.dropoffLat != null && track?.dropoffLng != null
      ? {
          lat: track.dropoffLat,
          lng: track.dropoffLng,
          label: track.dropoffLabel || 'Your address',
        }
      : order?.address?.latitude != null && order?.address?.longitude != null
        ? {
            lat: order.address.latitude,
            lng: order.address.longitude,
            label: `${order.address.street}, ${order.address.city}`,
          }
        : null;

  const stats = useMemo(() => {
    if (!driverPt) return null;
    const target =
      track?.phase === 'to_shop'
        ? pickupPt
        : track?.phase === 'to_customer'
          ? dropoffPt
          : null;
    if (!target) return null;
    const km = distanceKm(driverPt, target);
    return {
      km,
      eta: etaMinutes(km),
      targetLabel:
        track?.phase === 'to_shop' ? 'to shop' : 'to you',
    };
  }, [driverPt, pickupPt, dropoffPt, track?.phase]);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-muted" />;
  }
  if (!order) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Order not found{' '}
        <button
          type="button"
          className="cursor-pointer font-semibold text-bolt-700 dark:text-bolt-300"
          onClick={() => void navigate('/orders')}
        >
          Back
        </button>
      </p>
    );
  }

  const confirm = async () => {
    try {
      await api.post(`/orders/${order.id}/confirm`);
      toast.success('Receipt confirmed — escrow released');
      load();
    } catch {
      toast.error('Could not confirm');
    }
  };

  const submitSellerReview = async (sellerId: string, name: string) => {
    const draft = sellerDrafts[sellerId] || {
      rating: 5,
      comment: '',
      submitting: false,
    };
    setSellerDrafts((p) => ({
      ...p,
      [sellerId]: { ...draft, submitting: true },
    }));
    try {
      await api.post(`/orders/${order.id}/reviews`, {
        rating: draft.rating,
        comment: draft.comment || undefined,
        sellerId,
      });
      toast.success(`Thanks for rating ${name}`);
      load();
    } catch {
      toast.error('Could not submit seller rating');
      setSellerDrafts((p) => ({
        ...p,
        [sellerId]: { ...draft, submitting: false },
      }));
    }
  };

  const submitDriverReview = async () => {
    const driverId = order.delivery?.driverId;
    if (!driverId) return;
    setDriverDraft((d) => ({ ...d, submitting: true }));
    try {
      await api.post(`/orders/${order.id}/reviews`, {
        rating: driverDraft.rating,
        comment: driverDraft.comment || undefined,
        driverId,
      });
      toast.success('Thanks for rating the driver');
      load();
    } catch {
      toast.error('Could not submit driver rating');
      setDriverDraft((d) => ({ ...d, submitting: false }));
    }
  };

  const steps = [
    'PENDING_PAYMENT',
    'AWAITING_DRIVER',
    'DRIVER_ASSIGNED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CONFIRMED',
  ];
  const stepIdx = Math.max(
    0,
    steps.findIndex((s) => s === order.status),
  );

  const showMap =
    track &&
    (track.enabled ||
      pickupPt ||
      dropoffPt) &&
    ['DRIVER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(
      order.status,
    );

  const phaseCopy =
    track?.phase === 'to_shop'
      ? 'Driver is heading to the shop to collect your parts'
      : track?.phase === 'to_customer'
        ? 'Package collected — driver is on the way to you'
        : track?.phase === 'done'
          ? 'Delivery completed'
          : 'Waiting for a driver';

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-muted-foreground">
            {order.orderNumber}
          </p>
          <h1 className="font-display text-2xl font-extrabold">
            {formatTZS(order.total)}
          </h1>
        </div>
        <Badge variant={statusVariant[order.status] || 'muted'}>
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Live tracking */}
      {showMap && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Live tracking
              </p>
              <p className="mt-0.5 text-sm font-semibold text-foreground">
                {phaseCopy}
              </p>
            </div>
            {track?.enabled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Live
              </span>
            )}
          </div>

          {track?.driver && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/60 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">
                  {track.driver.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {track.driver.vehicleType} · {track.driver.vehiclePlate}
                  {track.driver.ratingAvg > 0 && (
                    <span className="ml-1 inline-flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-signal text-amber-signal" />
                      {track.driver.ratingAvg.toFixed(1)}
                    </span>
                  )}
                </p>
              </div>
              {track.driver.phone && track.enabled && (
                <a
                  href={`tel:${track.driver.phone}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bolt-700 text-white"
                  aria-label="Call driver"
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
            </div>
          )}

          {stats && track?.enabled && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-border px-3 py-2 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Distance
                </p>
                <p className="font-display text-lg font-bold text-bolt-800 dark:text-bolt-200">
                  {stats.km < 1
                    ? `${Math.round(stats.km * 1000)} m`
                    : `${stats.km.toFixed(1)} km`}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {stats.targetLabel}
                </p>
              </div>
              <div className="rounded-xl border border-border px-3 py-2 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  ETA
                </p>
                <p className="font-display text-lg font-bold text-bolt-800 dark:text-bolt-200">
                  ~{stats.eta} min
                </p>
                <p className="text-[10px] text-muted-foreground">estimate</p>
              </div>
            </div>
          )}

          <DeliveryTrackingMap
            className="h-64"
            driver={track?.enabled ? driverPt : null}
            pickup={pickupPt}
            dropoff={dropoffPt}
            phase={track?.phase}
          />

          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {pickupPt && (
              <span className="inline-flex items-center gap-1">
                <Store className="h-3 w-3 text-amber-signal" />
                Shop
              </span>
            )}
            {dropoffPt && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3 text-blue-600" />
                You
              </span>
            )}
            {track?.enabled && driverPt && (
              <span className="inline-flex items-center gap-1">
                <Navigation className="h-3 w-3 text-bolt-700" />
                Driver
              </span>
            )}
            {track?.locationUpdatedAt && track.enabled && (
              <span className="ml-auto">
                Updated {formatRelative(track.locationUpdatedAt)}
              </span>
            )}
          </div>

          {track?.enabled && !driverPt && (
            <p className="text-xs text-muted-foreground">
              Waiting for driver GPS… keep this screen open for live updates.
            </p>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">
          {t('orderStatus')}
        </p>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  i <= stepIdx
                    ? 'bg-bolt-700 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={
                  i <= stepIdx
                    ? 'font-semibold text-foreground'
                    : 'text-muted-foreground'
                }
              >
                {s.replace(/_/g, ' ')}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {order.escrow && (
        <div className="rounded-2xl bg-accent-soft p-4 text-sm text-accent-soft-foreground">
          Escrow: <strong>{order.escrow.status}</strong> ·{' '}
          {formatTZS(order.escrow.amount)}
        </div>
      )}

      <ul className="space-y-2 rounded-2xl border border-border bg-card p-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between text-sm">
            <span>
              {item.title} × {item.quantity}
            </span>
            <span className="font-semibold">{formatTZS(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      {order.status === 'DELIVERED' && (
        <Button size="lg" className="w-full" onClick={() => void confirm()}>
          {t('confirmReceipt')}
        </Button>
      )}

      {(order.status === 'CONFIRMED' || order.status === 'DELIVERED') && (
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-lg font-bold">Rate separately</h3>
            <p className="text-xs text-muted-foreground">
              Seller and driver are scored independently so each gets the
              rating they earned.
            </p>
          </div>

          {uniqueSellers(order).map((seller) => {
            const existing = order.reviews?.find(
              (r) => r.sellerId === seller.id,
            );
            const draft = sellerDrafts[seller.id] || {
              rating: 5,
              comment: '',
              submitting: false,
            };
            return (
              <div
                key={seller.id}
                className="space-y-2 rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-2">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-amber-signal" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Seller / shop
                    </p>
                    <p className="font-semibold text-foreground">
                      {seller.name}
                    </p>
                  </div>
                </div>
                {existing ? (
                  <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
                    You rated this seller{' '}
                    <strong>{existing.rating}★</strong>
                    {existing.comment ? (
                      <span className="mt-1 block text-muted-foreground">
                        “{existing.comment}”
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <>
                    <StarPicker
                      value={draft.rating}
                      onChange={(rating) =>
                        setSellerDrafts((p) => ({
                          ...p,
                          [seller.id]: { ...draft, rating },
                        }))
                      }
                    />
                    <Input
                      placeholder="Comment about parts / shop (optional)"
                      value={draft.comment}
                      onChange={(e) =>
                        setSellerDrafts((p) => ({
                          ...p,
                          [seller.id]: {
                            ...draft,
                            comment: e.target.value,
                          },
                        }))
                      }
                    />
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={draft.submitting}
                      onClick={() =>
                        void submitSellerReview(seller.id, seller.name)
                      }
                    >
                      {draft.submitting
                        ? 'Submitting…'
                        : 'Submit seller rating'}
                    </Button>
                  </>
                )}
              </div>
            );
          })}

          {order.delivery?.driverId && (
            <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-bolt-700 dark:text-bolt-300" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Driver
                  </p>
                  <p className="font-semibold text-foreground">
                    {order.delivery.driver?.name ||
                      order.tracking?.driver?.name ||
                      'Your driver'}
                  </p>
                  {(order.delivery.driver?.vehiclePlate ||
                    order.tracking?.driver?.vehiclePlate) && (
                    <p className="text-xs text-muted-foreground">
                      {order.delivery.driver?.vehicleType ||
                        order.tracking?.driver?.vehicleType}{' '}
                      ·{' '}
                      {order.delivery.driver?.vehiclePlate ||
                        order.tracking?.driver?.vehiclePlate}
                    </p>
                  )}
                </div>
              </div>
              {order.reviews?.find(
                (r) => r.driverId === order.delivery?.driverId,
              ) ? (
                (() => {
                  const existing = order.reviews!.find(
                    (r) => r.driverId === order.delivery?.driverId,
                  )!;
                  return (
                    <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
                      You rated this driver{' '}
                      <strong>{existing.rating}★</strong>
                      {existing.comment ? (
                        <span className="mt-1 block text-muted-foreground">
                          “{existing.comment}”
                        </span>
                      ) : null}
                    </p>
                  );
                })()
              ) : (
                <>
                  <StarPicker
                    value={driverDraft.rating}
                    onChange={(rating) =>
                      setDriverDraft((d) => ({ ...d, rating }))
                    }
                  />
                  <Input
                    placeholder="Comment about delivery (optional)"
                    value={driverDraft.comment}
                    onChange={(e) =>
                      setDriverDraft((d) => ({
                        ...d,
                        comment: e.target.value,
                      }))
                    }
                  />
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={driverDraft.submitting}
                    onClick={() => void submitDriverReview()}
                  >
                    {driverDraft.submitting
                      ? 'Submitting…'
                      : 'Submit driver rating'}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function uniqueSellers(order: Order): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const item of order.items || []) {
    if (!item.sellerId) continue;
    if (map.has(item.sellerId)) continue;
    const name =
      item.listing?.seller?.businessName ||
      `Seller · ${item.title.slice(0, 24)}`;
    map.set(item.sellerId, name);
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="min-h-[40px] min-w-[40px] cursor-pointer rounded-lg p-1"
          aria-label={`${n} stars`}
          aria-pressed={value === n}
        >
          <Star
            className={`h-7 w-7 ${
              n <= value
                ? 'fill-amber-signal text-amber-signal'
                : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
      <span className="ml-1 text-sm font-semibold text-muted-foreground">
        {value}/5
      </span>
    </div>
  );
}
