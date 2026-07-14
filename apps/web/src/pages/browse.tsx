import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Filter, Search, X } from 'lucide-react';
import { api, type Category, type Listing } from '@/lib/api';
import { ListingCard } from '@/components/listing-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LocationPicker, type LocationValue } from '@/components/location-picker';

type VehicleMake = {
  id: string;
  name: string;
  models: { id: string; name: string }[];
};

type FilterDraft = {
  q: string;
  categoryId: string;
  make: string;
  model: string;
  year: string;
  condition: string;
  partType: string;
  brand: string;
  partNumber: string;
  regionId: string;
  region: string;
  districtId: string;
  city: string; // district name used for API filter
  minPrice: string;
  maxPrice: string;
};

const emptyFilters = (): Omit<FilterDraft, 'q' | 'categoryId'> => ({
  make: '',
  model: '',
  year: '',
  condition: '',
  partType: '',
  brand: '',
  partNumber: '',
  regionId: '',
  region: '',
  districtId: '',
  city: '',
  minPrice: '',
  maxPrice: '',
});

function paramsToDraft(params: URLSearchParams): FilterDraft {
  return {
    q: params.get('q') || '',
    categoryId: params.get('categoryId') || '',
    make: params.get('make') || '',
    model: params.get('model') || '',
    year: params.get('year') || '',
    condition: params.get('condition') || '',
    partType: params.get('partType') || '',
    brand: params.get('brand') || '',
    partNumber: params.get('partNumber') || '',
    regionId: params.get('regionId') || '',
    region: params.get('region') || '',
    districtId: params.get('districtId') || '',
    city: params.get('city') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
  };
}

function draftToParams(draft: FilterDraft): URLSearchParams {
  const next = new URLSearchParams();
  Object.entries(draft).forEach(([k, v]) => {
    if (v?.trim()) next.set(k, v.trim());
  });
  return next;
}

const FILTER_KEYS: (keyof FilterDraft)[] = [
  'make',
  'model',
  'year',
  'condition',
  'partType',
  'brand',
  'partNumber',
  'region',
  'city',
  'minPrice',
  'maxPrice',
];

export function BrowsePage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [makes, setMakes] = useState<VehicleMake[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState(0);

  const applied = useMemo(() => paramsToDraft(params), [params]);
  const [searchInput, setSearchInput] = useState(applied.q);
  const [draft, setDraft] = useState<FilterDraft>(applied);

  // Keep local search box in sync when URL changes externally
  useEffect(() => {
    setSearchInput(applied.q);
  }, [applied.q]);

  useEffect(() => {
    if (!showFilters) setDraft(applied);
  }, [applied, showFilters]);

  useEffect(() => {
    void api.get('/categories').then((r) => setCategories(r.data));
    void api
      .get('/vehicles/makes')
      .then((r) => setMakes(r.data ?? []))
      .catch(() => setMakes([]));
  }, []);

  // Debounced live search as user types
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      const current = params.get('q') || '';
      if (trimmed === current) return;
      const next = new URLSearchParams(params);
      if (trimmed) next.set('q', trimmed);
      else next.delete('q');
      setParams(next, { replace: true });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [searchInput, params, setParams]);

  // Fetch listings when URL filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data } = await api.get('/listings', {
          params: {
            q: applied.q || undefined,
            categoryId: applied.categoryId || undefined,
            make: applied.make || undefined,
            model: applied.model || undefined,
            year: applied.year || undefined,
            condition: applied.condition || undefined,
            partType: applied.partType || undefined,
            brand: applied.brand || undefined,
            partNumber: applied.partNumber || undefined,
            city: applied.city || undefined,
            minPrice: applied.minPrice || undefined,
            maxPrice: applied.maxPrice || undefined,
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
  }, [applied]);

  useEffect(() => {
    if (!showFilters) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showFilters]);

  useEffect(() => {
    if (!showFilters) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowFilters(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showFilters]);

  const activeFilterCount = FILTER_KEYS.filter((k) => Boolean(applied[k])).length;

  const modelsForMake = useMemo(() => {
    if (!draft.make) return [];
    const found = makes.find(
      (m) => m.name.toLowerCase() === draft.make.toLowerCase(),
    );
    return found?.models ?? [];
  }, [draft.make, makes]);

  const openFilters = () => {
    setDraft({ ...applied, q: searchInput });
    setShowFilters(true);
  };

  const applyFilters = useCallback(() => {
    const next = draftToParams({
      ...draft,
      q: searchInput.trim() || draft.q,
      // API filters by city = district name
      city: draft.city || draft.region || '',
    });
    // Drop empty id keys not needed in URL if no selection
    if (!draft.regionId) next.delete('regionId');
    if (!draft.districtId) next.delete('districtId');
    setParams(next);
    setShowFilters(false);
  }, [draft, searchInput, setParams]);

  const clearFilters = () => {
    const cleared: FilterDraft = {
      q: searchInput.trim(),
      categoryId: applied.categoryId,
      ...emptyFilters(),
    };
    setDraft(cleared);
    setParams(draftToParams(cleared));
    setShowFilters(false);
  };

  const setCategory = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('categoryId', id);
    else next.delete('categoryId');
    setParams(next);
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 35 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-4">
      {/* Live search — no Apply needed */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-11 pr-10"
            aria-label={t('searchPlaceholder')}
            autoComplete="off"
            inputMode="search"
          />
          {searchInput && (
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted cursor-pointer"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant="secondary"
          size="icon"
          className="relative shrink-0"
          onClick={openFilters}
          aria-label={t('filters')}
          aria-haspopup="dialog"
          aria-expanded={showFilters}
        >
          <Filter className="h-5 w-5" />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bolt-700 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        Search updates as you type · use filters for vehicle fitment
      </p>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setCategory('')}
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer min-h-[36px]',
            !applied.categoryId
              ? 'bg-bolt-700 text-white'
              : 'bg-card text-muted-foreground ring-1 ring-border',
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer min-h-[36px]',
              applied.categoryId === c.id
                ? 'bg-bolt-700 text-white'
                : 'bg-card text-muted-foreground ring-1 ring-border',
            )}
          >
            {i18n.language === 'sw' ? c.nameSw : c.nameEn}
          </button>
        ))}
      </div>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {FILTER_KEYS.filter((k) => applied[k]).map((k) => (
            <button
              key={k}
              type="button"
              className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-soft-foreground ring-1 ring-accent-border cursor-pointer"
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete(k);
                if (k === 'make') next.delete('model');
                setParams(next);
              }}
            >
              {k}: {applied[k]}
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            className="text-[11px] font-bold text-muted-foreground underline cursor-pointer"
            onClick={clearFilters}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter bottom sheet */}
      {showFilters && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="browse-filters-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-steel-950/45 backdrop-blur-[2px] cursor-pointer"
            aria-label="Close filters"
            onClick={() => setShowFilters(false)}
          />

          <div
            className={cn(
              'relative z-10 flex max-h-[min(90dvh,720px)] w-full flex-col rounded-t-3xl border border-border bg-card shadow-2xl',
              'md:mx-auto md:mb-6 md:max-w-lg md:rounded-3xl',
            )}
            style={{ animation: 'sheet-up 0.28s ease-out' }}
          >
            <div className="flex shrink-0 flex-col items-center pt-2 pb-1">
              <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 pb-3">
              <div>
                <h3
                  id="browse-filters-title"
                  className="font-display text-lg font-bold text-foreground"
                >
                  Find the right part
                </h3>
                <p className="text-xs text-muted-foreground">
                  Filter by vehicle, condition, and price
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-pointer hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="space-y-5">
                {/* Vehicle fitment */}
                <section className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Vehicle fitment
                  </p>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Make
                    </label>
                    <select
                      value={draft.make}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          make: e.target.value,
                          model: '',
                        }))
                      }
                      className="field-control"
                    >
                      <option value="">Any make</option>
                      {makes.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    {makes.length === 0 && (
                      <Input
                        className="mt-2"
                        value={draft.make}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, make: e.target.value }))
                        }
                        placeholder="e.g. Toyota"
                      />
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Model
                    </label>
                    {modelsForMake.length > 0 ? (
                      <select
                        value={draft.model}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, model: e.target.value }))
                        }
                        className="field-control"
                      >
                        <option value="">Any model</option>
                        {modelsForMake.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={draft.model}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, model: e.target.value }))
                        }
                        placeholder="e.g. Hilux, Corolla"
                      />
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Year of your vehicle
                    </label>
                    <select
                      value={draft.year}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, year: e.target.value }))
                      }
                      className="field-control"
                    >
                      <option value="">Any year</option>
                      {yearOptions.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Shows parts compatible with this year
                    </p>
                  </div>
                </section>

                {/* Part details */}
                <section className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Part details
                  </p>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Category
                    </label>
                    <select
                      value={draft.categoryId}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          categoryId: e.target.value,
                        }))
                      }
                      className="field-control"
                    >
                      <option value="">Any category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {i18n.language === 'sw' ? c.nameSw : c.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Condition
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { v: '', l: 'Any' },
                        { v: 'NEW', l: t('NEW') },
                        { v: 'USED', l: t('USED') },
                        { v: 'REFURBISHED', l: t('REFURBISHED') },
                      ].map((opt) => (
                        <button
                          key={opt.v || 'any'}
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({ ...d, condition: opt.v }))
                          }
                          className={cn(
                            'rounded-xl border px-3 py-2.5 text-sm font-semibold cursor-pointer min-h-[44px]',
                            draft.condition === opt.v
                              ? 'border-bolt-600 bg-accent-soft text-accent-soft-foreground'
                              : 'border-border bg-card text-muted-foreground',
                          )}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Part type
                    </label>
                    <select
                      value={draft.partType}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, partType: e.target.value }))
                      }
                      className="field-control"
                    >
                      <option value="">Any type</option>
                      <option value="Genuine">Genuine</option>
                      <option value="OEM">OEM</option>
                      <option value="Aftermarket">Aftermarket</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Brand
                    </label>
                    <Input
                      value={draft.brand}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, brand: e.target.value }))
                      }
                      placeholder="e.g. Bosch, Denso"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Part number / OEM code
                    </label>
                    <Input
                      value={draft.partNumber}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          partNumber: e.target.value,
                        }))
                      }
                      placeholder="e.g. 04465-0K280"
                      className="font-mono"
                    />
                  </div>
                </section>

                {/* Location & budget */}
                <section className="space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Location & budget
                  </p>
                  <LocationPicker
                    filterMode
                    requireDistrict={false}
                    value={
                      {
                        regionId: draft.regionId,
                        districtId: draft.districtId,
                        wardId: '',
                        region: draft.region,
                        district: draft.city,
                        ward: '',
                        street: '',
                      } satisfies LocationValue
                    }
                    onChange={(loc) =>
                      setDraft((d) => ({
                        ...d,
                        regionId: loc.regionId,
                        region: loc.region,
                        districtId: loc.districtId,
                        city: loc.district,
                      }))
                    }
                  />
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                      Price (TZS)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Min"
                        value={draft.minPrice}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            minPrice: e.target.value,
                          }))
                        }
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Max"
                        value={draft.maxPrice}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            maxPrice: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={clearFilters}
                  className="flex-1"
                >
                  {t('clear')}
                </Button>
                <Button onClick={applyFilters} className="flex-1">
                  Show results
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {loading ? 'Searching…' : `${total} result${total === 1 ? '' : 's'}`}
        {applied.q ? ` for “${applied.q}”` : ''}
      </p>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl bg-muted"
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
        <p className="py-12 text-center text-sm text-muted-foreground">
          No parts match. Try another search or clear filters.
        </p>
      )}

      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); opacity: 0.85; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
