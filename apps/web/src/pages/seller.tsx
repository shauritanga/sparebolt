import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, type Listing, type Category } from '@/lib/api';
import { formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/safe-image';

export function SellerDashboardPage() {
  const [data, setData] = useState<{
    businessName: string;
    ratingAvg: number;
    totalSales: number;
    totalRevenue: number;
    activeListings: number;
    lowStock: Listing[];
  } | null>(null);

  useEffect(() => {
    void api.get('/seller/analytics').then((r) => setData(r.data));
  }, []);

  if (!data) {
    return <div className="h-40 animate-pulse rounded-2xl bg-steel-200/60" />;
  }

  const stats = [
    { label: 'Revenue', value: formatTZS(data.totalRevenue) },
    { label: 'Sales', value: String(data.totalSales) },
    { label: 'Listings', value: String(data.activeListings) },
    { label: 'Rating', value: data.ratingAvg.toFixed(1) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold">
            {data.businessName}
          </h1>
          <p className="text-sm text-steel-500">Seller dashboard</p>
        </div>
        <Button asChild>
          <Link to="/seller/listings/new">New listing</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-steel-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase text-steel-400">
              {s.label}
            </p>
            <p className="font-display text-xl font-bold text-bolt-800">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" asChild>
          <Link to="/seller/listings">My listings</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link to="/seller/sales">Sales</Link>
        </Button>
        <Button variant="amber" asChild>
          <Link to="/seller/promos">Promote products</Link>
        </Button>
      </div>

      {data.lowStock?.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">Low stock</p>
          <ul className="mt-2 space-y-1 text-sm">
            {data.lowStock.map((l) => (
              <li key={l.id}>
                {l.title} — {l.quantity} left
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SellerListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    void api.get('/seller/listings').then((r) => setListings(r.data));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-extrabold">My listings</h1>
        <Button asChild>
          <Link to="/seller/listings/new">Add</Link>
        </Button>
      </div>
      <ul className="space-y-2">
        {listings.map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-3 rounded-2xl border border-steel-200 bg-white p-3"
          >
            <div className="h-14 w-14 overflow-hidden rounded-xl bg-steel-100">
              <SafeImage
                src={l.images?.[0]?.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{l.title}</p>
              <p className="text-sm text-bolt-800 font-bold">
                {formatTZS(l.price)} · qty {l.quantity}
              </p>
            </div>
            <Badge variant={l.isActive !== false ? 'success' : 'muted'}>
              {l.isActive !== false ? 'Active' : 'Off'}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NewListingPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    categoryId: '',
    title: '',
    description: '',
    partNumber: '',
    condition: 'NEW',
    price: '',
    quantity: '1',
    make: '',
    model: '',
    yearFrom: '',
    yearTo: '',
    city: 'Dar es Salaam',
    imageUrl: '',
  });

  useEffect(() => {
    void api.get('/categories').then((r) => {
      setCategories(r.data);
      if (r.data[0]) setForm((f) => ({ ...f, categoryId: r.data[0].id }));
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/listings', {
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        partNumber: form.partNumber || undefined,
        condition: form.condition,
        price: Number(form.price),
        quantity: Number(form.quantity),
        make: form.make || undefined,
        model: form.model || undefined,
        yearFrom: form.yearFrom ? Number(form.yearFrom) : undefined,
        yearTo: form.yearTo ? Number(form.yearTo) : undefined,
        city: form.city,
        images: form.imageUrl ? [form.imageUrl] : undefined,
      });
      toast.success('Listing created');
      window.location.href = '/seller/listings';
    } catch {
      toast.error('Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-display text-2xl font-extrabold">New listing</h1>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <select
          className="h-12 w-full rounded-xl border border-steel-200 px-3"
          value={form.categoryId}
          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameEn}
            </option>
          ))}
        </select>
        <Input
          placeholder="Title"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          className="min-h-24 w-full rounded-xl border border-steel-200 p-3 text-base"
          placeholder="Description"
          required
          minLength={10}
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Price (TZS)"
            type="number"
            required
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
          <Input
            placeholder="Qty"
            type="number"
            required
            value={form.quantity}
            onChange={(e) =>
              setForm((f) => ({ ...f, quantity: e.target.value }))
            }
          />
        </div>
        <select
          className="h-12 w-full rounded-xl border border-steel-200 px-3"
          value={form.condition}
          onChange={(e) =>
            setForm((f) => ({ ...f, condition: e.target.value }))
          }
        >
          <option value="NEW">New</option>
          <option value="USED">Used</option>
          <option value="REFURBISHED">Refurbished</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Make"
            value={form.make}
            onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
          />
          <Input
            placeholder="Model"
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
          />
        </div>
        <Input
          placeholder="Part number"
          value={form.partNumber}
          onChange={(e) =>
            setForm((f) => ({ ...f, partNumber: e.target.value }))
          }
        />
        <Input
          placeholder="Image URL"
          value={form.imageUrl}
          onChange={(e) =>
            setForm((f) => ({ ...f, imageUrl: e.target.value }))
          }
        />
        <Button type="submit" className="w-full" loading={loading}>
          Publish listing
        </Button>
      </form>
    </div>
  );
}

export function SellerSalesPage() {
  const [sales, setSales] = useState<
    {
      id: string;
      title: string;
      lineTotal: string | number;
      quantity: number;
      order: { orderNumber: string; status: string; createdAt: string };
    }[]
  >([]);

  useEffect(() => {
    void api.get('/seller/sales').then((r) => setSales(r.data));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold">Sales</h1>
      <ul className="space-y-2">
        {sales.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border border-steel-200 bg-white p-4"
          >
            <div className="flex justify-between">
              <p className="font-semibold">{s.title}</p>
              <p className="font-bold text-bolt-800">
                {formatTZS(s.lineTotal)}
              </p>
            </div>
            <p className="text-xs text-steel-500">
              {s.order.orderNumber} · {s.order.status} · ×{s.quantity}
            </p>
          </li>
        ))}
        {!sales.length && (
          <p className="text-center text-sm text-steel-500 py-8">No sales yet</p>
        )}
      </ul>
    </div>
  );
}
