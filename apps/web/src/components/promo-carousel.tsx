import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { api } from '@/lib/api';
import { cn, formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SafeImage, PLACEHOLDER_IMAGE } from '@/components/safe-image';

export type PromoAd = {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl: string;
  ctaLabel: string;
  linkUrl?: string | null;
  listingId?: string | null;
  listing?: {
    id: string;
    title: string;
    price: string | number;
    currency: string;
  } | null;
  seller?: {
    businessName: string;
    city: string;
  } | null;
};

const SLIDE_MS = 5000;

const FALLBACK_ADS: PromoAd[] = [
  {
    id: 'fallback-1',
    title: 'Promote your parts here',
    subtitle: 'Sellers can subscribe to reach thousands of buyers daily.',
    imageUrl: PLACEHOLDER_IMAGE,
    ctaLabel: 'Sell on SpareBolt',
    linkUrl: '/account/become-seller',
  },
  {
    id: 'fallback-2',
    title: 'Genuine spare parts near you',
    subtitle: 'Escrow-protected payments. Delivery to your door.',
    imageUrl:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=80',
    ctaLabel: 'Browse parts',
    linkUrl: '/browse',
  },
  {
    id: 'fallback-3',
    title: 'Featured seller deals',
    subtitle: 'Subscribe your listing to the homepage carousel.',
    imageUrl:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=80',
    ctaLabel: 'Explore',
    linkUrl: '/browse',
  },
];

export function PromoCarousel() {
  const [ads, setAds] = useState<PromoAd[]>([]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void api
      .get<PromoAd[]>('/ads/carousel', { params: { limit: 3 } })
      .then((r) => {
        if (!cancelled) {
          setAds(r.data?.length ? r.data.slice(0, 3) : FALLBACK_ADS);
        }
      })
      .catch(() => {
        if (!cancelled) setAds(FALLBACK_ADS);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const slides = ads.length ? ads : FALLBACK_ADS;
  const count = slides.length;
  const current = slides[index % count];

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(() => go(1), SLIDE_MS);
    return () => clearInterval(t);
  }, [paused, count, go, index]);

  // Track impressions when slide is shown
  useEffect(() => {
    if (!current?.id || current.id.startsWith('fallback')) return;
    void api.post(`/ads/${current.id}/impression`).catch(() => undefined);
  }, [current?.id]);

  const href = current.linkUrl
    ? current.linkUrl
    : current.listingId
      ? `/parts/${current.listingId}`
      : current.listing?.id
        ? `/parts/${current.listing.id}`
        : '/browse';

  const onCta = () => {
    if (current.id.startsWith('fallback')) return;
    void api.post(`/ads/${current.id}/click`).catch(() => undefined);
  };

  if (!loaded) {
    return (
      <div className="aspect-[16/10] w-full animate-pulse rounded-3xl bg-muted/70 sm:aspect-[21/9]" />
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-steel-900 shadow-md"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured promotions"
    >
      <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
        {slides.map((ad, i) => (
          <div
            key={ad.id}
            className={cn(
              'absolute inset-0 transition-opacity duration-500 ease-out',
              i === index % count ? 'opacity-100 z-10' : 'opacity-0 z-0',
            )}
            aria-hidden={i !== index % count}
          >
            <SafeImage
              src={ad.imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            {/* Strong gradient for text contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />
          </div>
        ))}

        <div className="absolute inset-0 z-20 flex flex-col justify-end p-4 sm:p-6 md:p-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-signal px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-steel-950">
              <Megaphone className="h-3 w-3" />
              Sponsored
            </span>
            {current.seller && (
              <span className="truncate text-xs font-medium text-white/80">
                {current.seller.businessName}
                {current.seller.city ? ` · ${current.seller.city}` : ''}
              </span>
            )}
          </div>

          <h2 className="font-display text-xl font-extrabold leading-tight text-white drop-shadow sm:text-2xl md:text-3xl">
            {current.title}
          </h2>
          {current.subtitle && (
            <p className="mt-1 max-w-lg text-sm font-medium text-white/95 sm:text-base">
              {current.subtitle}
            </p>
          )}
          {current.listing?.price != null && (
            <p className="mt-1 font-display text-lg font-bold text-amber-signal">
              {formatTZS(current.listing.price)}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button
              asChild
              size="lg"
              className="bg-card text-foreground hover:bg-muted font-bold shadow-md"
              onClick={onCta}
            >
              <Link to={href}>{current.ctaLabel || 'Shop now'}</Link>
            </Button>
          </div>
        </div>

        {/* Controls */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 cursor-pointer"
              aria-label="Previous ad"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60 cursor-pointer"
              aria-label="Next ad"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {count > 1 && (
        <div className="absolute bottom-3 left-0 right-0 z-30 flex justify-center gap-1.5">
          {slides.map((ad, i) => (
            <button
              key={ad.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 rounded-full transition-all cursor-pointer',
                i === index % count
                  ? 'w-6 bg-card'
                  : 'w-1.5 bg-card/50 hover:bg-card/80',
              )}
              aria-label={`Go to ad ${i + 1}`}
              aria-current={i === index % count}
            />
          ))}
        </div>
      )}
    </section>
  );
}
