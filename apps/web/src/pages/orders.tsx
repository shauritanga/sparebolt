import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api, type Order } from '@/lib/api';
import { formatRelative, formatTZS } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'muted'> = {
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
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-steel-200/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-display text-2xl font-extrabold">{t('orders')}</h1>
      {!orders.length && (
        <p className="py-12 text-center text-sm text-steel-500">
          No orders yet.{' '}
          <Link to="/browse" className="font-semibold text-bolt-700">
            {t('browse')}
          </Link>
        </p>
      )}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id}>
            <Link
              to={`/orders/${o.id}`}
              className="block rounded-2xl border border-steel-200 bg-white p-4 shadow-sm transition hover:border-bolt-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-steel-400">
                    {o.orderNumber}
                  </p>
                  <p className="font-display font-bold text-steel-900">
                    {formatTZS(o.total)}
                  </p>
                  <p className="text-xs text-steel-500">
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
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl bg-steel-200/60" />;
  }
  if (!order) {
    return (
      <p className="py-12 text-center text-steel-500">
        Order not found{' '}
        <button
          type="button"
          className="text-bolt-700 font-semibold cursor-pointer"
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

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs text-steel-400">{order.orderNumber}</p>
          <h1 className="font-display text-2xl font-extrabold">
            {formatTZS(order.total)}
          </h1>
        </div>
        <Badge variant={statusVariant[order.status] || 'muted'}>
          {order.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-steel-200 bg-white p-4">
        <p className="mb-3 text-xs font-bold uppercase text-steel-400">
          {t('orderStatus')}
        </p>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                  i <= stepIdx
                    ? 'bg-bolt-700 text-white'
                    : 'bg-steel-100 text-steel-400'
                }`}
              >
                {i + 1}
              </span>
              <span
                className={
                  i <= stepIdx ? 'font-semibold text-steel-900' : 'text-steel-400'
                }
              >
                {s.replace(/_/g, ' ')}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {order.escrow && (
        <div className="rounded-2xl bg-bolt-50 p-4 text-sm text-bolt-900">
          Escrow: <strong>{order.escrow.status}</strong> ·{' '}
          {formatTZS(order.escrow.amount)}
        </div>
      )}

      <ul className="space-y-2 rounded-2xl border border-steel-200 bg-white p-4">
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
        <div className="space-y-2 rounded-2xl border border-steel-200 bg-white p-4">
          <h3 className="font-display font-bold">Rate your experience</h3>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="h-12 w-full rounded-xl border border-steel-200 px-3"
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
