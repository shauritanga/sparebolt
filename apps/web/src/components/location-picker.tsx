import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, MapPin, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export type LocationValue = {
  regionId: string;
  districtId: string;
  wardId: string;
  /** Region name (e.g. Dar es Salaam) */
  region: string;
  /** District display name (e.g. Ilala, Kinondoni) */
  district: string;
  /** Ward name */
  ward: string;
  /** Free-text street / house / plot */
  street: string;
  landmark?: string;
};

type Region = { id: string; name: string };
type District = {
  id: string;
  name: string;
  regionId: string;
  region?: { id: string; name: string };
};
type Ward = { id: string; name: string; districtId: string };

type Props = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  showLandmark?: boolean;
  requireDistrict?: boolean;
  requireWard?: boolean;
  className?: string;
  /** Region + district only (no ward/street) */
  filterMode?: boolean;
  disabled?: boolean;
};

export const emptyLocation = (): LocationValue => ({
  regionId: '',
  districtId: '',
  wardId: '',
  region: '',
  district: '',
  ward: '',
  street: '',
  landmark: '',
});

type SheetKind = 'region' | 'district' | 'ward' | null;

/**
 * Cascading Region → District → Ward via searchable bottom sheets.
 * Street (and optional landmark) remain free text.
 */
export function LocationPicker({
  value,
  onChange,
  showLandmark = false,
  requireDistrict = true,
  requireWard = true,
  className,
  filterMode = false,
  disabled = false,
}: Props) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void api
      .get<Region[]>('/locations/regions')
      .then((r) => setRegions(r.data ?? []))
      .catch(() => setRegions([]));
  }, []);

  useEffect(() => {
    if (!value.regionId) {
      setDistricts([]);
      return;
    }
    setLoadingDistricts(true);
    void api
      .get<District[]>('/locations/districts', {
        params: { regionId: value.regionId },
      })
      .then((r) => setDistricts(r.data ?? []))
      .catch(() => setDistricts([]))
      .finally(() => setLoadingDistricts(false));
  }, [value.regionId]);

  useEffect(() => {
    if (!value.districtId) {
      setWards([]);
      return;
    }
    setLoadingWards(true);
    void api
      .get<Ward[]>(`/locations/districts/${value.districtId}/wards`)
      .then((r) => setWards(r.data ?? []))
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
  }, [value.districtId]);

  // Body scroll lock when sheet open
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);

  const openSheet = (kind: SheetKind) => {
    if (disabled) return;
    if (kind === 'district' && !value.regionId) return;
    if (kind === 'ward' && !value.districtId) return;
    setQuery('');
    setSheet(kind);
  };

  const closeSheet = () => {
    setSheet(null);
    setQuery('');
  };

  const sheetTitle =
    sheet === 'region'
      ? 'Select region'
      : sheet === 'district'
        ? 'Select district'
        : sheet === 'ward'
          ? 'Select ward'
          : '';

  const sheetItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (sheet === 'region') {
      const list = regions.map((r) => ({ id: r.id, name: r.name }));
      return q
        ? list.filter((i) => i.name.toLowerCase().includes(q))
        : list;
    }
    if (sheet === 'district') {
      const list = districts.map((d) => ({ id: d.id, name: d.name }));
      return q
        ? list.filter((i) => i.name.toLowerCase().includes(q))
        : list;
    }
    if (sheet === 'ward') {
      const list = wards.map((w) => ({ id: w.id, name: w.name }));
      return q
        ? list.filter((i) => i.name.toLowerCase().includes(q))
        : list;
    }
    return [];
  }, [sheet, query, regions, districts, wards]);

  const sheetLoading =
    (sheet === 'district' && loadingDistricts) ||
    (sheet === 'ward' && loadingWards);

  const pick = (id: string, name: string) => {
    if (sheet === 'region') {
      onChange({
        ...value,
        regionId: id,
        region: name,
        districtId: '',
        district: '',
        wardId: '',
        ward: '',
      });
    } else if (sheet === 'district') {
      onChange({
        ...value,
        districtId: id,
        district: name,
        wardId: '',
        ward: '',
      });
    } else if (sheet === 'ward') {
      onChange({
        ...value,
        wardId: id,
        ward: name,
      });
    }
    closeSheet();
  };

  return (
    <div className={cn('space-y-3', className)}>
      <PickerField
        label="Region"
        required
        value={value.region}
        placeholder="Select region…"
        disabled={disabled}
        onClick={() => openSheet('region')}
      />

      <PickerField
        label="District"
        required={requireDistrict}
        value={value.district}
        placeholder={
          !value.regionId
            ? 'Select region first'
            : loadingDistricts
              ? 'Loading…'
              : 'Select district…'
        }
        disabled={disabled || !value.regionId}
        onClick={() => openSheet('district')}
      />

      {!filterMode && (
        <PickerField
          label="Ward"
          required={requireWard}
          value={value.ward}
          placeholder={
            !value.districtId
              ? 'Select district first'
              : loadingWards
                ? 'Loading…'
                : 'Select ward…'
          }
          disabled={disabled || !value.districtId}
          onClick={() => openSheet('ward')}
        />
      )}

      {!filterMode && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Street / house / plot *
          </label>
          <Input
            disabled={disabled}
            value={value.street}
            onChange={(e) => onChange({ ...value, street: e.target.value })}
            placeholder="Street name, house no., plot…"
            required
          />
        </div>
      )}

      {!filterMode && showLandmark && (
        <div>
          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Landmark (optional)
          </label>
          <Input
            disabled={disabled}
            value={value.landmark || ''}
            onChange={(e) => onChange({ ...value, landmark: e.target.value })}
            placeholder="Near market, bus stand…"
          />
        </div>
      )}

      {/* Searchable bottom sheet */}
      {sheet && (
        <div
          className="fixed inset-0 z-[60] flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="location-sheet-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-steel-950/45 backdrop-blur-[2px] cursor-pointer"
            aria-label="Close"
            onClick={closeSheet}
          />

          <div
            className={cn(
              'relative z-10 flex max-h-[min(85dvh,560px)] w-full flex-col rounded-t-3xl border border-border bg-card shadow-2xl',
              'md:mx-auto md:mb-6 md:max-w-lg md:rounded-3xl',
            )}
            style={{ animation: 'loc-sheet-up 0.26s ease-out' }}
          >
            <div className="flex shrink-0 flex-col items-center pt-2 pb-1">
              <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-bolt-700 dark:text-bolt-300" />
                <h3
                  id="location-sheet-title"
                  className="truncate font-display text-lg font-bold text-foreground"
                >
                  {sheetTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeSheet}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-pointer hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="shrink-0 border-b border-border px-4 py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${sheet}…`}
                  className="pl-10"
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground cursor-pointer hover:bg-muted"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {sheetLoading && (
                <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </li>
              )}
              {!sheetLoading && sheetItems.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {query ? `No matches for “${query}”` : 'No options'}
                </li>
              )}
              {!sheetLoading &&
                sheetItems.map((item) => {
                  const selected =
                    (sheet === 'region' && item.id === value.regionId) ||
                    (sheet === 'district' && item.id === value.districtId) ||
                    (sheet === 'ward' && item.id === value.wardId);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => pick(item.id, item.name)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm transition cursor-pointer min-h-[48px]',
                          selected
                            ? 'bg-accent-soft font-semibold text-bolt-900 dark:text-bolt-100'
                            : 'text-foreground hover:bg-muted active:bg-muted',
                        )}
                      >
                        <span className="min-w-0 flex-1">{item.name}</span>
                        {selected && (
                          <span className="shrink-0 text-xs font-bold text-bolt-700 dark:text-bolt-300">
                            Selected
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>

          <style>{`
            @keyframes loc-sheet-up {
              from { transform: translateY(100%); opacity: 0.9; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

function PickerField({
  label,
  value,
  placeholder,
  required,
  disabled,
  onClick,
}: {
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
        {label}
        {required ? ' *' : ''}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'flex h-12 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 text-left text-base transition',
          'cursor-pointer hover:border-bolt-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bolt-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          value ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
    </div>
  );
}

/** Map picker value → API address / profile fields */
export function locationToApiFields(loc: LocationValue) {
  return {
    region: loc.region,
    city: loc.district || loc.region,
    addressStreet: loc.street,
    street: loc.street,
    addressWard: loc.ward || undefined,
    addressArea: loc.ward || undefined,
    area: loc.ward || undefined,
    addressLandmark: loc.landmark || undefined,
  };
}
