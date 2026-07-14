import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const [q, setQ] = useState('');
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

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate(`/browse?q=${encodeURIComponent(q)}`);
  };

  // Work roles land on their workspace, not the customer marketplace home
  if (isDriverRole(role)) {
    return <Navigate to="/driver" replace />;
  }
  if (isSellerRole(role)) {
    return <Navigate to="/seller" replace />;
  }

  return (
    <div className="space-y-8 md:space-y-12">
      {/* Desktop hero band */}
      <section className="hidden overflow-hidden rounded-3xl border border-border bg-card shadow-sm md:block">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-center px-8 py-10 lg:px-12 lg:py-14">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-bolt-700 dark:text-bolt-300">
              SpareBolt Marketplace
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight tracking-tight text-foreground lg:text-4xl">
              {t('tagline')}
            </h1>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">
              {t('footerTagline')}
            </p>
            <form
              onSubmit={onSearch}
              className="mt-8 flex max-w-xl gap-2 lg:hidden"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="h-11 border-border bg-muted/40 pl-10"
                />
              </div>
              <Button type="submit" size="lg">
                {t('browse')}
              </Button>
            </form>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/browse">{t('browse')}</Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link to="/account/become-seller">{t('becomeSeller')}</Link>
              </Button>
            </div>
          </div>
          <div className="relative min-h-[220px] border-t border-border bg-gradient-to-br from-bolt-800 via-bolt-700 to-steel-900 p-8 text-white lg:min-h-0 lg:border-l lg:border-t-0">
            <p className="text-sm font-semibold text-bolt-100">{t('howItWorks')}</p>
            <ol className="mt-6 space-y-4">
              {[t('step1'), t('step2'), t('step3'), t('step4')].map(
                (label, i) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-sm font-medium text-white/95">
                      {label}
                    </span>
                  </li>
                ),
              )}
            </ol>
          </div>
        </div>
      </section>

      {/* Seller-subscribed promo carousel */}
      <PromoCarousel />

      {/* Categories */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3 md:mb-5">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground md:text-2xl">
              {t('categories')}
            </h2>
            <p className="mt-0.5 hidden text-sm text-muted-foreground md:block">
              Find parts by system — engine, brakes, body, and more.
            </p>
          </div>
          <Link
            to="/browse"
            className="flex items-center text-sm font-semibold text-bolt-700 dark:text-bolt-300"
          >
            {t('browse')} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8 md:gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/browse?categoryId=${c.id}`}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-3 text-center shadow-sm transition hover:border-bolt-300 hover:shadow md:gap-2 md:p-4 md:hover:-translate-y-0.5"
            >
              <span className="text-2xl md:text-3xl" aria-hidden>
                {categoryIcons[c.slug] || '🔩'}
              </span>
              <span className="text-[11px] font-semibold leading-tight text-foreground md:text-xs">
                {i18n.language === 'sw' ? c.nameSw : c.nameEn}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-3 md:mb-5">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground md:text-2xl">
              {t('featured')}
            </h2>
            <p className="mt-0.5 hidden text-sm text-muted-foreground md:block">
              Fresh inventory from verified sellers.
            </p>
          </div>
          <Link
            to="/browse"
            className="hidden items-center text-sm font-semibold text-bolt-700 dark:text-bolt-300 md:flex"
          >
            {t('browse')} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
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

      {/* Trust — compact on mobile, rich on desktop */}
      <section className="rounded-3xl border border-accent-border bg-gradient-to-br from-accent-soft to-card p-6 shadow-sm md:p-8">
        <div className="flex items-start gap-3 md:items-center md:gap-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bolt-700 text-white md:h-14 md:w-14">
            <ShieldCheck className="h-6 w-6 md:h-7 md:w-7" />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground md:text-2xl">
              {t('trustTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground md:max-w-2xl md:text-base">
              {t('trustBody')}
            </p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:mt-8 md:grid-cols-4 md:gap-4">
          {[
            { icon: Search, label: t('step1') },
            { icon: ShieldCheck, label: t('step2') },
            { icon: Truck, label: t('step3') },
            { icon: CheckCircle2, label: t('step4') },
          ].map(({ icon: Icon, label }, i) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-2xl bg-card p-4 text-center shadow-sm ring-1 ring-border md:items-start md:p-5 md:text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-soft-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">
                0{i + 1}
              </span>
              <span className="text-xs font-semibold text-foreground md:text-sm">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTAs */}
      <section className="grid gap-3 sm:grid-cols-2 md:gap-5">
        <Link
          to="/account/become-seller"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-bolt-300 dark:hover:border-bolt-600 md:p-6"
        >
          <Package className="h-8 w-8 text-bolt-700 dark:text-bolt-300" />
          <div>
            <p className="font-display font-bold text-foreground md:text-lg">
              {t('becomeSeller')}
            </p>
            <p className="text-xs text-muted-foreground md:text-sm">
              List inventory & earn
            </p>
          </div>
        </Link>
        <Link
          to="/seller/promos"
          className="flex items-center gap-3 rounded-2xl border border-warning-border bg-warning-soft p-4 shadow-sm transition hover:opacity-90 md:p-6"
        >
          <MegaphoneIcon />
          <div>
            <p className="font-display font-bold text-foreground md:text-lg">
              Promote a product
            </p>
            <p className="text-xs text-muted-foreground md:text-sm">
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
