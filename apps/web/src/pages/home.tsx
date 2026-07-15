import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  ShieldCheck,
  Truck,
  Package,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { api, type Category, type Listing } from '@/lib/api';
import { ListingCard } from '@/components/listing-card';
import { PromoCarousel } from '@/components/promo-carousel';
import { useAuthStore } from '@/stores/auth-store';
import { isDriverRole, isSellerRole } from '@/lib/role-home';

const categoryIcons: Record<string, string> = {
  engine: '⚙️',
  brakes: '🛑',
  suspension: '🔧',
  electrical: '⚡',
  body: '🚗',
  filters: '🛢️',
  tyres: '⭕',
  lighting: '💡',
};

export function HomePage() {
  const { t, i18n } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDriverRole(role) || isSellerRole(role)) return;
    let cancelled = false;
    (async () => {
      try {
        const [listRes, catRes] = await Promise.all([
          api.get('/listings', { params: { limit: 8 } }),
          api.get('/categories'),
        ]);
        if (!cancelled) {
          setListings(listRes.data.items ?? []);
          setCategories(catRes.data ?? []);
        }
      } catch {
        // offline / API down
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  // Work roles land on their workspace, not the customer marketplace home
  if (isDriverRole(role)) {
    return <Navigate to="/driver" replace />;
  }
  if (isSellerRole(role)) {
    return <Navigate to="/seller" replace />;
  }

  return (
    <div className="space-y-8">
      {/* Promo carousel — primary visual on all sizes */}
      <PromoCarousel />

      {/* Categories */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
            {t('categories')}
          </h2>
          <Link
            to="/browse"
            className="flex items-center text-sm font-semibold text-bolt-700 dark:text-bolt-300"
          >
            {t('browse')} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/browse?categoryId=${c.id}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center shadow-sm transition hover:border-bolt-300 hover:shadow"
            >
              <span className="text-2xl" aria-hidden>
                {categoryIcons[c.slug] || '🔩'}
              </span>
              <span className="text-[11px] font-semibold leading-tight text-foreground">
                {i18n.language === 'sw' ? c.nameSw : c.nameEn}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-foreground md:text-xl">
          {t('featured')}
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
        {!loading && listings.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No listings yet. Start the API and seed the database.
          </p>
        )}
      </section>

      {/* Trust */}
      <section className="rounded-3xl border border-accent-border bg-gradient-to-br from-accent-soft to-card p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bolt-700 text-white">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {t('trustTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('trustBody')}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: Search, label: t('step1') },
            { icon: ShieldCheck, label: t('step2') },
            { icon: Truck, label: t('step3') },
            { icon: CheckCircle2, label: t('step4') },
          ].map(({ icon: Icon, label }, i) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 text-center shadow-sm ring-1 ring-border"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">
                0{i + 1}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTAs */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/account/become-seller"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-bolt-300 dark:hover:border-bolt-600"
        >
          <Package className="h-8 w-8 text-bolt-700 dark:text-bolt-300" />
          <div>
            <p className="font-display font-bold text-foreground">
              {t('becomeSeller')}
            </p>
            <p className="text-xs text-muted-foreground">List inventory & earn</p>
          </div>
        </Link>
        <Link
          to="/seller/promos"
          className="flex items-center gap-3 rounded-2xl border border-warning-border bg-warning-soft p-4 shadow-sm transition hover:opacity-90"
        >
          <MegaphoneIcon />
          <div>
            <p className="font-display font-bold text-foreground">
              Promote a product
            </p>
            <p className="text-xs text-muted-foreground">
              Subscribe to homepage ads
            </p>
          </div>
        </Link>
      </section>
    </div>
  );
}

function MegaphoneIcon() {
  return (
    <svg
      className="h-8 w-8 text-warning-soft-foreground"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}
