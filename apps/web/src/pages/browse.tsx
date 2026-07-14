import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter, Search, X } from 'lucide-react';
import { api, type Category, type Listing } from '@/lib/api';
import { ListingCard } from '@/components/listing-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BrowsePage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);

  const q = params.get('q') || '';
  const categoryId = params.get('categoryId') || '';
  const make = params.get('make') || '';
  const condition = params.get('condition') || '';
  const city = params.get('city') || '';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';

  const [draft, setDraft] = useState({
    q,
    categoryId,
    make,
    condition,
    city,
    minPrice,
    maxPrice,
  });

  useEffect(() => {
    setDraft({ q, categoryId, make, condition, city, minPrice, maxPrice });
  }, [q, categoryId, make, condition, city, minPrice, maxPrice]);

  useEffect(() => {
    void api.get('/categories').then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get('/listings', {
          params: {
            q: q || undefined,
            categoryId: categoryId || undefined,
            make: make || undefined,
            condition: condition || undefined,
            city: city || undefined,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
            limit: 24,
          },
        });
        if (!cancelled) {
          setListings(data.items ?? []);
          setTotal(data.meta?.total ?? 0);
        }
      } catch {
        if (!cancelled) setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, categoryId, make, condition, city, minPrice, maxPrice]);

  const applyFilters = () => {
    const next = new URLSearchParams();
    Object.entries(draft).forEach(([k, v]) => {
      if (v) next.set(k, v);
    });
    setParams(next);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDraft({
      q: '',
      categoryId: '',
      make: '',
      condition: '',
      city: '',
      minPrice: '',
      maxPrice: '',
    });
    setParams(new URLSearchParams());
    setShowFilters(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-steel-400" />
          <Input
            value={draft.q}
            onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder={t('searchPlaceholder')}
            className="pl-11"
          />
        </div>
        <Button
          variant="secondary"
          size="icon"
          onClick={() => setShowFilters((s) => !s)}
          aria-label={t('filters')}
        >
          <Filter className="h-5 w-5" />
        </Button>
        <Button onClick={applyFilters}>{t('apply')}</Button>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            setDraft((d) => ({ ...d, categoryId: '' }));
            const next = new URLSearchParams(params);
            next.delete('categoryId');
            setParams(next);
          }}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer min-h-[36px]',
            !categoryId
              ? 'bg-bolt-700 text-white'
              : 'bg-white text-steel-600 ring-1 ring-steel-200',
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set('categoryId', c.id);
              setParams(next);
            }}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer min-h-[36px]',
              categoryId === c.id
                ? 'bg-bolt-700 text-white'
                : 'bg-white text-steel-600 ring-1 ring-steel-200',
            )}
          >
            {i18n.language === 'sw' ? c.nameSw : c.nameEn}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="space-y-3 rounded-2xl border border-steel-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold">{t('filters')}</h3>
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="p-1 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-steel-600">
                {t('make')}
              </label>
              <Input
                value={draft.make}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, make: e.target.value }))
                }
                placeholder="Toyota, Nissan…"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-steel-600">
                {t('city')}
              </label>
              <Input
                value={draft.city}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, city: e.target.value }))
                }
                placeholder="Dar es Salaam"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-steel-600">
                {t('condition')}
              </label>
              <select
                value={draft.condition}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, condition: e.target.value }))
                }
                className="flex h-12 w-full rounded-xl border border-steel-200 bg-white px-3 text-base"
              >
                <option value="">Any</option>
                <option value="NEW">{t('NEW')}</option>
                <option value="USED">{t('USED')}</option>
                <option value="REFURBISHED">{t('REFURBISHED')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-steel-600">
                  Min
                </label>
                <Input
                  type="number"
                  value={draft.minPrice}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, minPrice: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-steel-600">
                  Max
                </label>
                <Input
                  type="number"
                  value={draft.maxPrice}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, maxPrice: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={clearFilters} className="flex-1">
              {t('clear')}
            </Button>
            <Button onClick={applyFilters} className="flex-1">
              {t('apply')}
            </Button>
          </div>
        </div>
      )}

      <p className="text-sm text-steel-500">
        {loading ? '…' : `${total} results`}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl bg-steel-200/60"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}

      {!loading && listings.length === 0 && (
        <p className="py-12 text-center text-sm text-steel-500">
          No parts match your search. Try different filters.
        </p>
      )}
    </div>
  );
}
