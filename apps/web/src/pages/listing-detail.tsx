import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Award,
  Lock,
  MapPin,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Shield,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type Listing } from '@/lib/api';
import {
  cn,
  discountPercent,
  formatTZS,
  hasDiscount,
} from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SafeImage, PLACEHOLDER_IMAGE } from '@/components/safe-image';
import { useCartStore } from '@/stores/cart-store';

type DetailTab = 'overview' | 'specs' | 'reviews' | 'seller';

export function ListingDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const [listing, setListing] = useState<Listing | null>(null);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>('overview');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void api
      .get(`/listings/${id}`)
      .then((r) => setListing(r.data))
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  const yearsLabel = useMemo(() => {
    if (!listing) return null;
    if (listing.yearFrom && listing.yearTo) {
      return `${listing.yearFrom} – ${listing.yearTo}`;
    }
    if (listing.yearFrom) return `${listing.yearFrom}+`;
    if (listing.yearTo) return `up to ${listing.yearTo}`;
    return null;
  }, [listing]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="aspect-square rounded-2xl bg-steel-200" />
        <div className="h-8 w-2/3 rounded bg-steel-200" />
        <div className="h-6 w-1/3 rounded bg-steel-200" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="py-16 text-center">
        <p className="text-steel-500">Part not found</p>
        <Button className="mt-4" onClick={() => void navigate('/browse')}>
          {t('browse')}
        </Button>
      </div>
    );
  }

  const images = listing.images?.length
    ? listing.images
    : [{ id: '0', url: PLACEHOLDER_IMAGE, isPrimary: true }];

  const add = () => {
    addItem(listing, qty);
    toast.success('Added to cart');
  };

  const conditionLabel =
    listing.condition === 'NEW'
      ? 'New'
      : listing.condition === 'USED'
        ? 'Used'
        : 'Refurbished';

  const categoryName = listing.category
    ? i18n.language === 'sw'
      ? listing.category.nameSw
      : listing.category.nameEn
    : null;

  const specs: { label: string; value: string }[] = [
    {
      label: 'Manufacturer',
      value: listing.manufacturer || listing.brand || listing.make || '—',
    },
    { label: 'Condition', value: conditionLabel },
    {
      label: 'Type',
      value:
        listing.partType ||
        (listing.condition === 'NEW' ? 'Genuine' : 'Standard'),
    },
    {
      label: 'Brand',
      value: listing.brand || listing.make || '—',
    },
    { label: 'Make', value: listing.make || '—' },
    { label: 'Model', value: listing.model || '—' },
    { label: 'Engine', value: listing.engine || '—' },
    { label: 'Category', value: categoryName || '—' },
    { label: 'Years', value: yearsLabel || '—' },
    {
      label: 'Warranty',
      value:
        listing.warrantyMonths != null
          ? String(listing.warrantyMonths)
          : '—',
    },
    {
      label: 'Availability',
      value:
        listing.quantity > 0
          ? `${listing.quantity} in stock`
          : 'Out of stock',
    },
    ...(listing.partNumber
      ? [{ label: 'Part number', value: listing.partNumber }]
      : []),
  ];

  const sellerName =
    listing.seller?.businessName ||
    [listing.seller?.user?.firstName, listing.seller?.user?.lastName]
      .filter(Boolean)
      .join(' ') ||
    'Seller';

  const sellerInitials = sellerName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'specs', label: 'Specifications' },
    { id: 'reviews', label: 'Reviews (0)' },
    { id: 'seller', label: 'Seller Info' },
  ];

  // Platform defaults (can later be per-listing overrides)
  const shipFrom = listing.seller?.city || listing.city;
  const deliveryDaysMin = 1;
  const deliveryDaysMax = 3;
  const returnDays = 7;

  const trustBadges = [
    {
      title: 'Escrow Protected',
      subtitle: 'Your money is safe',
      icon: Shield,
      wrap: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Secure Payment',
      subtitle: '100% secure checkout',
      icon: Lock,
      wrap: 'bg-sky-50 text-sky-600',
    },
    {
      title: 'Easy Returns',
      subtitle: `${returnDays}-day return policy`,
      icon: RotateCcw,
      wrap: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Genuine Parts',
      subtitle: 'Quality assured',
      icon: Award,
      wrap: 'bg-violet-50 text-violet-600',
    },
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button
        type="button"
        onClick={() => void navigate(-1)}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-steel-600 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="overflow-hidden rounded-3xl border border-steel-200 bg-white shadow-sm">
        <div className="relative aspect-square bg-steel-100 sm:aspect-[16/10]">
          <SafeImage
            src={images[imgIdx]?.url}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute left-3 top-3">
            <Badge
              variant={
                listing.condition === 'NEW'
                  ? 'new'
                  : listing.condition === 'USED'
                    ? 'used'
                    : 'refurbished'
              }
            >
              {t(listing.condition)}
            </Badge>
          </div>
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto p-3">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setImgIdx(i)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 cursor-pointer ${
                  i === imgIdx ? 'border-bolt-600' : 'border-transparent'
                }`}
              >
                <SafeImage
                  src={img.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h1 className="font-display text-2xl font-extrabold text-steel-900">
          {listing.title}
        </h1>
        {(() => {
          const onSale = hasDiscount(listing.price, listing.compareAtPrice);
          const pct = onSale
            ? discountPercent(listing.price, listing.compareAtPrice!)
            : 0;
          return (
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-display text-3xl font-bold tabular-nums text-bolt-800">
                  {formatTZS(listing.price)}
                </p>
                {onSale && (
                  <p className="text-lg font-medium tabular-nums text-steel-400 line-through">
                    {formatTZS(listing.compareAtPrice!)}
                  </p>
                )}
              </div>
              {onSale && pct > 0 && (
                <p className="text-sm font-semibold text-red-600">
                  Save {pct}% · was {formatTZS(listing.compareAtPrice!)}
                </p>
              )}
            </div>
          );
        })()}
        <div className="flex flex-wrap gap-2 text-sm text-steel-600">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {listing.city}
          </span>
          {listing.partNumber && (
            <span className="rounded-lg bg-steel-100 px-2 py-0.5 font-mono text-xs">
              #{listing.partNumber}
            </span>
          )}
        </div>
      </div>

      {/* Trust badges — before tabs */}
      <section className="rounded-2xl border border-steel-200 bg-white px-2 py-4 shadow-sm">
        <ul className="grid grid-cols-4 gap-1">
          {trustBadges.map(({ title, subtitle, icon: Icon, wrap }) => (
            <li
              key={title}
              className="flex min-w-0 flex-col items-center gap-1.5 px-0.5 text-center"
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11',
                  wrap,
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <p className="w-full truncate text-[10px] font-bold leading-tight text-steel-800 sm:text-xs">
                {title}
              </p>
              <p className="w-full text-[9px] leading-snug text-steel-500 sm:text-[10px]">
                {subtitle}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Tabs: Overview · Specifications · Reviews · Seller Info */}
      <section className="overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-sm">
        <div className="flex gap-0 overflow-x-auto border-b border-steel-100 px-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'relative shrink-0 px-3 py-3.5 text-sm font-semibold transition-colors cursor-pointer min-h-[44px]',
                tab === item.id
                  ? 'text-bolt-700'
                  : 'text-steel-400 hover:text-steel-600',
              )}
            >
              {item.label}
              {tab === item.id && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-bolt-700" />
              )}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'overview' && (
            <div className="space-y-5">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-steel-400">
                  Product description
                </h3>
                <p className="text-sm leading-relaxed text-steel-700 whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>

              <div className="space-y-0 divide-y divide-steel-100 rounded-xl border border-steel-100">
                <div className="flex items-start gap-3 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bolt-50 text-bolt-700">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-steel-400">
                      Estimated delivery
                    </p>
                    <p className="text-sm font-semibold text-steel-900">
                      {deliveryDaysMin}–{deliveryDaysMax} days
                    </p>
                    <p className="text-xs text-steel-500">
                      After payment is confirmed (escrow)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <Package className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-steel-400">
                      Shipment from
                    </p>
                    <p className="text-sm font-semibold text-steel-900">
                      {shipFrom}
                    </p>
                    <p className="text-xs text-steel-500">
                      Seller location · local driver delivery
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    <RotateCcw className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-steel-400">
                      Return policy
                    </p>
                    <p className="text-sm font-semibold text-steel-900">
                      {returnDays}-day return policy
                    </p>
                    <p className="text-xs text-steel-500">
                      Open a dispute if the part is wrong, damaged, or not as
                      described. Escrow is held until you confirm receipt.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'specs' && (
            <dl className="divide-y divide-steel-100">
              {specs.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[minmax(0,42%)_1fr] gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <dt className="text-sm text-steel-400">{row.label}</dt>
                  <dd className="text-sm font-semibold text-steel-900">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {tab === 'reviews' && (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-steel-700">
                No reviews yet
              </p>
              <p className="mt-1 text-xs text-steel-500">
                Buyers can rate this seller after delivery is confirmed.
              </p>
            </div>
          )}

          {tab === 'seller' && listing.seller && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[minmax(0,42%)_1fr] gap-3 py-1">
                <span className="text-steel-400">Business</span>
                <span className="font-semibold text-steel-900">
                  {listing.seller.businessName}
                </span>
              </div>
              <div className="grid grid-cols-[minmax(0,42%)_1fr] gap-3 py-1">
                <span className="text-steel-400">City</span>
                <span className="font-semibold text-steel-900">
                  {listing.seller.city}
                </span>
              </div>
              <div className="grid grid-cols-[minmax(0,42%)_1fr] gap-3 py-1">
                <span className="text-steel-400">Rating</span>
                <span className="inline-flex items-center gap-1 font-semibold text-steel-900">
                  <Star className="h-3.5 w-3.5 fill-amber-signal text-amber-signal" />
                  {listing.seller.ratingAvg.toFixed(1)} (
                  {listing.seller.ratingCount})
                </span>
              </div>
            </div>
          )}

          {tab === 'seller' && !listing.seller && (
            <p className="text-sm text-steel-500">Seller details unavailable.</p>
          )}
        </div>
      </section>

      {/* Sold by card — below specs (matches reference layout) */}
      {listing.seller && (
        <div className="flex items-center gap-3 rounded-2xl border border-steel-200 bg-white p-4 shadow-sm">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-steel-900 text-xs font-bold text-white">
            {sellerInitials || 'S'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-steel-400">Sold by</p>
            <p className="truncate font-display font-bold text-steel-900">
              {sellerName}
            </p>
            <p className="flex items-center gap-1 text-sm text-steel-500">
              <Star className="h-3.5 w-3.5 fill-amber-signal text-amber-signal" />
              {listing.seller.ratingAvg.toFixed(1)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full border-bolt-600 text-bolt-700"
            onClick={() => setTab('seller')}
          >
            View Store
          </Button>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-bolt-50 p-4 text-sm text-bolt-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-bolt-700" />
        <p>{t('escrowNote')}</p>
      </div>

      <div className="h-20" aria-hidden />

      <Link
        to="/browse"
        className="block pb-2 text-center text-sm font-semibold text-bolt-700"
      >
        {t('continueShopping')}
      </Link>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-steel-200 bg-white/95 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] backdrop-blur-md md:left-1/2 md:right-auto md:w-full md:max-w-3xl md:-translate-x-1/2 md:rounded-t-2xl md:border md:border-b-0 md:px-4">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-1.5 sm:gap-2">
          <div className="flex h-11 shrink-0 items-center rounded-xl border border-steel-200 bg-white">
            <button
              type="button"
              className="flex h-11 w-8 items-center justify-center cursor-pointer sm:w-10"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label="Decrease"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-6 text-center text-sm font-bold tabular-nums sm:w-8">
              {qty}
            </span>
            <button
              type="button"
              className="flex h-11 w-8 items-center justify-center cursor-pointer sm:w-10"
              onClick={() =>
                setQty((q) => Math.min(listing.quantity || 99, q + 1))
              }
              aria-label="Increase"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <Button
            className="min-w-0 flex-1 !px-2 text-xs sm:!px-5 sm:text-sm"
            size="lg"
            onClick={add}
            disabled={listing.quantity < 1}
          >
            <span className="truncate">
              {listing.quantity < 1 ? t('outOfStock') : t('addToCart')}
            </span>
          </Button>

          <Button
            variant="amber"
            size="lg"
            className="min-w-0 flex-1 !px-2 text-xs sm:!px-5 sm:text-sm sm:flex-none sm:min-w-[6.5rem]"
            onClick={() => {
              add();
              void navigate('/cart');
            }}
            disabled={listing.quantity < 1}
          >
            <span className="truncate">{t('checkout')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
