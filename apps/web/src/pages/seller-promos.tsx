import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';
import { api, type Listing } from '@/lib/api';
import { formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type PromoPackage = {
  package: 'STARTER' | 'STANDARD' | 'PREMIUM';
  days: number;
  price: number;
  currency: string;
  description: string;
};

type Promo = {
  id: string;
  title: string;
  subtitle?: string | null;
  status: string;
  package: string;
  endsAt: string;
  pricePaid: string | number;
  impressions: number;
  clicks: number;
  listing?: { id: string; title: string } | null;
};

export function SellerPromosPage() {
  const [packages, setPackages] = useState<PromoPackage[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    listingId: '',
    package: 'STANDARD' as PromoPackage['package'],
    title: '',
    subtitle: '',
    ctaLabel: 'Shop now',
  });

  const load = () => {
    void api.get('/ads/packages').then((r) => setPackages(r.data));
    void api.get('/seller/listings').then((r) => {
      setListings(r.data);
      if (r.data[0] && !form.listingId) {
        setForm((f) => ({ ...f, listingId: r.data[0].id }));
      }
    });
    void api.get('/seller/promos').then((r) => setPromos(r.data));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.listingId) {
      toast.error('Select a listing to promote');
      return;
    }
    setLoading(true);
    try {
      await api.post('/seller/promos', {
        listingId: form.listingId,
        package: form.package,
        title: form.title || undefined,
        subtitle: form.subtitle || undefined,
        ctaLabel: form.ctaLabel || undefined,
      });
      toast.success('Promo activated — it will appear on the home carousel');
      setForm((f) => ({ ...f, title: '', subtitle: '' }));
      load();
    } catch {
      toast.error('Could not create promo');
    } finally {
      setLoading(false);
    }
  };

  const pause = async (id: string) => {
    try {
      await api.patch(`/seller/promos/${id}/pause`);
      toast.success('Promo paused');
      load();
    } catch {
      toast.error('Failed to pause');
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <Megaphone className="h-7 w-7 text-bolt-700 dark:text-bolt-300" />
          Promote products
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscribe a listing to the homepage carousel (up to 3 featured ads
          rotate automatically for all buyers).
        </p>
      </div>

      {/* Packages */}
      <div className="grid gap-2 sm:grid-cols-3">
        {packages.map((p) => (
          <button
            key={p.package}
            type="button"
            onClick={() => setForm((f) => ({ ...f, package: p.package }))}
            className={`rounded-2xl border p-3 text-left cursor-pointer transition ${
              form.package === p.package
                ? 'border-bolt-600 bg-accent-soft ring-2 ring-bolt-600/30'
                : 'border-border bg-card'
            }`}
          >
            <p className="text-xs font-bold uppercase text-muted-foreground">
              {p.package}
            </p>
            <p className="font-display text-lg font-bold text-bolt-800 dark:text-bolt-200">
              {formatTZS(p.price)}
            </p>
            <p className="text-xs text-muted-foreground">{p.days} days</p>
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => void subscribe(e)}
        className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
      >
        <h2 className="font-display font-bold">New homepage ad</h2>
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Listing to promote
          </label>
          <select
            className="field-control"
            value={form.listingId}
            onChange={(e) =>
              setForm((f) => ({ ...f, listingId: e.target.value }))
            }
            required
          >
            <option value="">Select listing…</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          {!listings.length && (
            <p className="mt-1 text-xs text-muted-foreground">
              No listings yet.{' '}
              <Link to="/seller/listings/new" className="text-bolt-700 dark:text-bolt-300 font-semibold">
                Create one
              </Link>
            </p>
          )}
        </div>
        <Input
          placeholder="Headline (optional — uses listing title)"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <Input
          placeholder="Subtitle / offer text"
          value={form.subtitle}
          onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
        />
        <Input
          placeholder="Button label"
          value={form.ctaLabel}
          onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
        />
        <Button type="submit" className="w-full" loading={loading}>
          Subscribe & go live
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          MVP: payment is simulated — ads activate immediately
        </p>
      </form>

      <section className="space-y-2">
        <h2 className="font-display font-bold">Your promotions</h2>
        {promos.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {p.package} · until {new Date(p.endsAt).toLocaleDateString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.impressions} views · {p.clicks} clicks ·{' '}
                  {formatTZS(p.pricePaid)}
                </p>
              </div>
              <Badge
                variant={
                  p.status === 'ACTIVE'
                    ? 'success'
                    : p.status === 'PAUSED'
                      ? 'warning'
                      : 'muted'
                }
              >
                {p.status}
              </Badge>
            </div>
            {p.status === 'ACTIVE' && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => void pause(p.id)}
              >
                Pause
              </Button>
            )}
          </div>
        ))}
        {!promos.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No promos yet. Subscribe a product above.
          </p>
        )}
      </section>
    </div>
  );
}
