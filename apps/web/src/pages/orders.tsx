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

export function OrderDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);

  const trackingLive = !!order?.tracking?.enabled;

  const load = () => {
    if (!id) return;
    void api
      .get(`/orders/${id}`)
      .then((r) => setOrder(r.data))
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

  const review = async () => {
    try {
      const sellerId = order.items[0]?.sellerId;
      await api.post(`/orders/${order.id}/reviews`, {
        rating,
        comment,
        sellerId,
        driverId: order.delivery?.driverId,
      });
      toast.success('Thanks for your review');
    } catch {
      toast.error('Review failed');
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
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <h3 className="font-display font-bold">Rate your experience</h3>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="field-control"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
          <Input
            placeholder="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button variant="secondary" onClick={() => void review()}>
            Submit review
          </Button>
        </div>
      )}
    </div>
  );
}
