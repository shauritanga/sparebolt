import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';
import type { Listing } from '@/lib/api';
import { formatTZS } from '@/lib/utils';
import { Badge } from './ui/badge';
import { SafeImage, PLACEHOLDER_IMAGE } from './safe-image';
import { useTranslation } from 'react-i18next';

const conditionVariant = {
  NEW: 'new',
  USED: 'used',
  REFURBISHED: 'refurbished',
} as const;

export function ListingCard({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const img =
    listing.images?.find((i) => i.isPrimary)?.url ||
    listing.images?.[0]?.url ||
    PLACEHOLDER_IMAGE;

  return (
    <Link
      to={`/parts/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-steel-200/80 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-bolt-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-steel-100">
        <SafeImage
          src={img}
          alt={listing.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-2 top-2">
          <Badge variant={conditionVariant[listing.condition]}>
            {t(listing.condition)}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-steel-900 group-hover:text-bolt-800">
          {listing.title}
        </h3>
        {(listing.make || listing.model) && (
          <p className="text-xs text-steel-500">
            {[listing.make, listing.model, listing.yearFrom && `${listing.yearFrom}${listing.yearTo ? `–${listing.yearTo}` : '+'}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        <p className="font-display text-lg font-bold text-bolt-800">
          {formatTZS(listing.price)}
        </p>
        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-steel-500">
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="h-3 w-3" />
            {listing.city}
          </span>
          {listing.seller && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-signal text-amber-signal" />
              {listing.seller.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
