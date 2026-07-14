import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api, type Listing, type Category } from '@/lib/api';
import { formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SafeImage } from '@/components/safe-image';
import { ImageUploadField } from '@/components/image-upload-field';
import { useAuthStore } from '@/stores/auth-store';
import {
  emptyLocation,
  LocationPicker,
  type LocationValue,
} from '@/components/location-picker';

export function SellerDashboardPage() {
  const sellerProfile = useAuthStore((s) => s.user?.sellerProfile);
  const approved = sellerProfile?.status === 'APPROVED';
  const [data, setData] = useState<{
    businessName: string;
    ratingAvg: number;
    totalSales: number;
    totalRevenue: number;
    activeListings: number;
    lowStock: Listing[];
  } | null>(null);

  useEffect(() => {
    if (!approved) return;
    void api.get('/seller/analytics').then((r) => setData(r.data));
  }, [approved]);

  if (sellerProfile && !approved) {
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8 text-center">
        <h1 className="font-display text-2xl font-extrabold">Seller</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-left">
          <Badge variant="warning">{sellerProfile.status}</Badge>
          <p className="mt-3 font-semibold text-foreground">
            {sellerProfile.status === 'PENDING'
              ? 'Your seller application is under review'
              : 'You cannot list parts right now'}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {sellerProfile.status === 'PENDING'
              ? 'An admin must verify your ID and shop before you can create listings.'
              : sellerProfile.rejectionReason ||
                'Contact support if you believe this is an error.'}
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
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
          <p className="text-sm text-muted-foreground">Seller dashboard</p>
        </div>
        <Button asChild>
          <Link to="/seller/listings/new">New listing</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {s.label}
            </p>
            <p className="font-display text-xl font-bold text-bolt-800 dark:text-bolt-200">
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
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <div className="h-14 w-14 overflow-hidden rounded-xl bg-muted">
              <SafeImage
                src={l.images?.[0]?.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{l.title}</p>
              <p className="text-sm text-bolt-800 dark:text-bolt-200 font-bold">
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

const MIN_IMAGES = 3;
const MAX_IMAGES = 10;

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
    compareAtPrice: '',
    quantity: '1',
    make: '',
    model: '',
    yearFrom: '',
    yearTo: '',
  });
  const [location, setLocation] = useState<LocationValue>(emptyLocation());
  /** Always start with 3 required image slots */
  const [images, setImages] = useState<string[]>(['', '', '']);

  useEffect(() => {
    void api.get('/categories').then((r) => {
      setCategories(r.data);
      if (r.data[0]) setForm((f) => ({ ...f, categoryId: r.data[0].id }));
    });
  }, []);

  const filledImages = images.map((u) => u.trim()).filter(Boolean);

  const setImageAt = (index: number, value: string) => {
    setImages((prev) => prev.map((u, i) => (i === index ? value : u)));
  };

  const addImageSlot = () => {
    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images`);
      return;
    }
    setImages((prev) => [...prev, '']);
  };

  const removeImageSlot = (index: number) => {
    if (images.length <= MIN_IMAGES) {
      toast.error(`At least ${MIN_IMAGES} images are required`);
      return;
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filledImages.length < MIN_IMAGES) {
      toast.error(`Add at least ${MIN_IMAGES} product photos`);
      return;
    }
    if (!location.regionId || !location.districtId) {
      toast.error('Select region and district for stock location');
      return;
    }
    setLoading(true);
    try {
      await api.post('/listings', {
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        partNumber: form.partNumber || undefined,
        condition: form.condition,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice
          ? Number(form.compareAtPrice)
          : undefined,
        quantity: Number(form.quantity),
        make: form.make || undefined,
        model: form.model || undefined,
        yearFrom: form.yearFrom ? Number(form.yearFrom) : undefined,
        yearTo: form.yearTo ? Number(form.yearTo) : undefined,
        // District is the primary place name for search / display
        city: location.district,
        images: filledImages,
      });
      toast.success('Listing created');
      window.location.href = '/seller/listings';
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      toast.error(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || 'Failed to create listing',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-display text-2xl font-extrabold">New listing</h1>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <select
          className="h-12 w-full rounded-xl border border-border px-3"
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
          className="min-h-24 w-full rounded-xl border border-border p-3 text-base"
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
            placeholder="Sale price (TZS)"
            type="number"
            required
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
          />
          <Input
            placeholder="Was price (optional)"
            type="number"
            value={form.compareAtPrice}
            onChange={(e) =>
              setForm((f) => ({ ...f, compareAtPrice: e.target.value }))
            }
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Optional “was” price shows struck-through on the card when higher than
          the sale price.
        </p>
        <Input
          placeholder="Qty"
          type="number"
          required
          value={form.quantity}
          onChange={(e) =>
            setForm((f) => ({ ...f, quantity: e.target.value }))
          }
        />
        <select
          className="h-12 w-full rounded-xl border border-border px-3"
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

        <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
          <p className="text-sm font-bold text-foreground">Stock location</p>
          <p className="text-[11px] text-muted-foreground">
            Where the part ships from (Region → District)
          </p>
          <LocationPicker
            value={location}
            onChange={setLocation}
            filterMode
            requireDistrict
          />
        </div>

        {/* Photos — minimum 3 required */}
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-foreground">Product photos</p>
              <p className="text-[11px] text-muted-foreground">
                At least {MIN_IMAGES} images required · first is the main photo
                ({filledImages.length}/{Math.max(MIN_IMAGES, images.length)})
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={addImageSlot}
              disabled={images.length >= MAX_IMAGES}
            >
              Add more
            </Button>
          </div>

          <div className="space-y-3">
            {images.map((url, i) => (
              <div key={i} className="relative">
                <ImageUploadField
                  label={`Photo ${i + 1}${i === 0 ? ' (primary)' : ''}`}
                  required={i < MIN_IMAGES}
                  value={url}
                  onChange={(v) => setImageAt(i, v)}
                />
                {images.length > MIN_IMAGES && i >= MIN_IMAGES && (
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-danger cursor-pointer"
                    onClick={() => removeImageSlot(i)}
                  >
                    Remove photo {i + 1}
                  </button>
                )}
              </div>
            ))}
          </div>
          {filledImages.length < MIN_IMAGES && (
            <p className="text-xs font-medium text-amber-700">
              Add {MIN_IMAGES - filledImages.length} more photo
              {MIN_IMAGES - filledImages.length === 1 ? '' : 's'} to publish.
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={loading}
          disabled={filledImages.length < MIN_IMAGES}
        >
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
            className="rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex justify-between">
              <p className="font-semibold">{s.title}</p>
              <p className="font-bold text-bolt-800 dark:text-bolt-200">
                {formatTZS(s.lineTotal)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {s.order.orderNumber} · {s.order.status} · ×{s.quantity}
            </p>
          </li>
        ))}
        {!sales.length && (
          <p className="text-center text-sm text-muted-foreground py-8">No sales yet</p>
        )}
      </ul>
    </div>
  );
}
