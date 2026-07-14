import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type Listing } from '@/lib/api';
import { formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SafeImage, PLACEHOLDER_IMAGE } from '@/components/safe-image';
import { useCartStore } from '@/stores/cart-store';

export function ListingDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const [listing, setListing] = useState<Listing | null>(null);
  const [qty, setQty] = useState(1);
  const [imgIdx, setImgIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void api
      .get(`/listings/${id}`)
      .then((r) => setListing(r.data))
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

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

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button
        type="button"
        onClick={() => void navigate(-1)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-steel-600 cursor-pointer min-h-[44px]"
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
                <SafeImage src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h1 className="font-display text-2xl font-extrabold text-steel-900">
          {listing.title}
        </h1>
        <p className="font-display text-3xl font-bold text-bolt-800">
          {formatTZS(listing.price)}
        </p>
        <div className="flex flex-wrap gap-2 text-sm text-steel-600">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {listing.city}
          </span>
          {listing.partNumber && (
            <span className="rounded-lg bg-steel-100 px-2 py-0.5 font-mono text-xs">
              #{listing.partNumber}
            </span>
          )}
          {(listing.make || listing.model) && (
            <span>
              {[listing.make, listing.model, listing.yearFrom, listing.yearTo && `–${listing.yearTo}`]
                .filter(Boolean)
                .join(' ')}
            </span>
          )}
        </div>
        <p className="text-sm leading-relaxed text-steel-700">
          {listing.description}
        </p>
      </div>

      {listing.seller && (
        <div className="flex items-center justify-between rounded-2xl border border-steel-200 bg-white p-4">
          <div>
            <p className="text-xs font-semibold uppercase text-steel-400">
              {t('seller')}
            </p>
            <p className="font-display font-bold">{listing.seller.businessName}</p>
            <p className="flex items-center gap-1 text-sm text-steel-500">
              <Star className="h-3.5 w-3.5 fill-amber-signal text-amber-signal" />
              {listing.seller.ratingAvg.toFixed(1)} ({listing.seller.ratingCount})
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-2xl bg-bolt-50 p-4 text-sm text-bolt-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-bolt-700" />
        <p>{t('escrowNote')}</p>
      </div>

      <div className="sticky bottom-20 z-20 flex items-center gap-3 rounded-2xl border border-steel-200 bg-white p-3 shadow-lg md:bottom-4">
        <div className="flex items-center rounded-xl border border-steel-200">
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center cursor-pointer"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-bold">{qty}</span>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center cursor-pointer"
            onClick={() =>
              setQty((q) => Math.min(listing.quantity || 99, q + 1))
            }
            aria-label="Increase"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button
          className="flex-1"
          size="lg"
          onClick={add}
          disabled={listing.quantity < 1}
        >
          {listing.quantity < 1 ? t('outOfStock') : t('addToCart')}
        </Button>
        <Button variant="amber" size="lg" onClick={() => { add(); void navigate('/cart'); }}>
          {t('checkout')}
        </Button>
      </div>

      <Link to="/browse" className="block text-center text-sm font-semibold text-bolt-700">
        {t('continueShopping')}
      </Link>
    </div>
  );
}
