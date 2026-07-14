import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function AdminPage() {
  const [dash, setDash] = useState<{
    stats: {
      users: number;
      sellers: number;
      drivers: number;
      listings: number;
      orders: number;
      escrowHeld: number;
      openDisputes: number;
    };
    recentOrders: {
      id: string;
      orderNumber: string;
      status: string;
      total: string | number;
      customer: { firstName: string; lastName: string };
    }[];
  } | null>(null);
  const [disputes, setDisputes] = useState<
    {
      id: string;
      reason: string;
      status: string;
      order: { orderNumber: string; id: string };
    }[]
  >([]);
  const [tab, setTab] = useState<'overview' | 'disputes' | 'escrows'>(
    'overview',
  );
  const [escrows, setEscrows] = useState<
    {
      id: string;
      amount: string | number;
      status: string;
      order: { orderNumber: string };
    }[]
  >([]);

  useEffect(() => {
    void api.get('/admin/dashboard').then((r) => setDash(r.data));
    void api.get('/admin/disputes').then((r) => setDisputes(r.data));
    void api.get('/admin/escrows').then((r) => setEscrows(r.data));
  }, []);

  const resolve = async (id: string, resolution: 'customer' | 'seller') => {
    try {
      await api.post(`/admin/disputes/${id}/resolve`, { resolution });
      toast.success('Dispute resolved');
      const r = await api.get('/admin/disputes');
      setDisputes(r.data);
    } catch {
      toast.error('Failed');
    }
  };

  if (!dash) {
    return <div className="h-40 animate-pulse rounded-2xl bg-steel-200/60" />;
  }

  const s = dash.stats;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold">Admin</h1>

      <div className="flex gap-1 rounded-xl bg-steel-100 p-1">
        {(['overview', 'disputes', 'escrows'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold capitalize cursor-pointer ${
              tab === t ? 'bg-white shadow-sm' : 'text-steel-500'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Users', s.users],
              ['Sellers', s.sellers],
              ['Drivers', s.drivers],
              ['Listings', s.listings],
              ['Orders', s.orders],
              ['Escrow held', formatTZS(s.escrowHeld)],
              ['Disputes', s.openDisputes],
            ].map(([label, val]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-steel-200 bg-white p-4"
              >
                <p className="text-xs font-semibold uppercase text-steel-400">
                  {label}
                </p>
                <p className="font-display text-xl font-bold text-bolt-800">
                  {val}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-steel-200 bg-white p-4">
            <h2 className="mb-3 font-display font-bold">Recent orders</h2>
            <ul className="space-y-2 text-sm">
              {dash.recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between border-b border-steel-50 py-2 last:border-0"
                >
                  <span>
                    {o.orderNumber} · {o.customer.firstName}{' '}
                    {o.customer.lastName}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="muted">{o.status}</Badge>
                    {formatTZS(o.total)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {tab === 'disputes' && (
        <ul className="space-y-3">
          {disputes.map((d) => (
            <li
              key={d.id}
              className="rounded-2xl border border-steel-200 bg-white p-4"
            >
              <div className="flex justify-between">
                <p className="font-mono text-xs">{d.order.orderNumber}</p>
                <Badge
                  variant={d.status === 'OPEN' ? 'danger' : 'success'}
                >
                  {d.status}
                </Badge>
              </div>
              <p className="mt-1 font-semibold">{d.reason}</p>
              {d.status === 'OPEN' && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void resolve(d.id, 'customer')}
                  >
                    Refund customer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void resolve(d.id, 'seller')}
                  >
                    Release to seller
                  </Button>
                </div>
              )}
            </li>
          ))}
          {!disputes.length && (
            <p className="py-8 text-center text-sm text-steel-500">
              No disputes
            </p>
          )}
        </ul>
      )}

      {tab === 'escrows' && (
        <ul className="space-y-2">
          {escrows.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-2xl border border-steel-200 bg-white p-4 text-sm"
            >
              <span className="font-mono text-xs">{e.order.orderNumber}</span>
              <span className="font-bold">{formatTZS(e.amount)}</span>
              <Badge
                variant={e.status === 'HELD' ? 'warning' : 'success'}
              >
                {e.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
