import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api, type User } from '@/lib/api';
import { uploadImage } from '@/lib/upload';
import { useAuthStore } from '@/stores/auth-store';
import {
  emptyLocation,
  LocationPicker,
  locationToApiFields,
  type LocationValue,
} from '@/components/location-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SafeImage } from '@/components/safe-image';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  user: User;
};

function defaultLocationFromUser(user: User): LocationValue {
  const addr =
    user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
  if (!addr) return emptyLocation();
  return {
    regionId: '',
    districtId: '',
    wardId: '',
    region: addr.region || '',
    district: addr.city || '',
    ward: addr.area || '',
    street: addr.street || '',
    landmark: '',
  };
}

export function EditProfileSheet({ open, onClose, user }: Props) {
  const { t, i18n } = useTranslation();
  const setSession = useAuthStore((s) => s.setSession);
  const token = useAuthStore((s) => s.token);
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone || '');
  const [email, setEmail] = useState(user.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [location, setLocation] = useState<LocationValue>(() =>
    defaultLocationFromUser(user),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Reset form when opened / user changes
  useEffect(() => {
    if (!open) return;
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setPhone(user.phone || '');
    setEmail(user.email || '');
    setAvatarUrl(user.avatarUrl || '');
    setLocation(defaultLocationFromUser(user));
  }, [open, user]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const initials =
    `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'SB';

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidImage'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(t('imageTooLarge'));
      return;
    }
    setUploading(true);
    try {
      const res = await uploadImage(file);
      setAvatarUrl(res.url);
      toast.success(t('photoUploaded'));
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : msg;
      if (status === 401) {
        toast.error(t('uploadFailed'));
      } else {
        toast.error(detail || t('uploadFailed'));
      }
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      toast.error(t('nameRequired'));
      return;
    }
    setSaving(true);
    try {
      const locFields = locationToApiFields(location);
      const payload: Record<string, string | undefined> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        locale: i18n.language === 'sw' ? 'sw' : 'en',
      };
      if (phone.trim()) payload.phone = phone.trim();
      if (email.trim()) payload.email = email.trim();
      if (avatarUrl) payload.avatarUrl = avatarUrl;

      if (location.street.trim() && (location.district || location.region)) {
        payload.addressLabel = 'Home';
        payload.addressStreet = location.street.trim();
        payload.addressCity = locFields.city;
        payload.addressRegion = locFields.region;
        payload.addressArea = locFields.addressWard || locFields.area;
      }

      const { data } = await api.patch<User>('/auth/me', payload);
      if (token) setSession(token, data);
      toast.success(t('profileSaved'));
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      toast.error(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg || t('profileSaveFailed'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-steel-950/50 backdrop-blur-[2px] cursor-pointer"
        aria-label={t('close')}
        onClick={onClose}
      />

      <div
        className={cn(
          'relative z-10 flex max-h-[min(92dvh,720px)] w-full flex-col rounded-t-3xl border border-border bg-card shadow-2xl',
          'md:mx-auto md:mb-6 md:max-w-lg md:rounded-3xl',
        )}
        style={{ animation: 'edit-profile-up 0.28s ease-out' }}
      >
        <div className="flex shrink-0 flex-col items-center pt-2 pb-1">
          <span className="h-1 w-10 rounded-full bg-border" aria-hidden />
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 pb-3">
          <h2
            id="edit-profile-title"
            className="font-display text-lg font-bold text-foreground"
          >
            {t('editProfile')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground cursor-pointer hover:bg-muted"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-bolt-800 text-2xl font-extrabold text-white ring-4 ring-accent-border cursor-pointer disabled:opacity-70"
              aria-label={t('changeAvatar')}
            >
              {avatarUrl ? (
                <SafeImage
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/50 py-1.5 text-[10px] font-bold text-white">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {t('photo')}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => void onAvatarPick(e)}
            />
            <p className="text-center text-[11px] text-muted-foreground">
              {t('avatarHint')}
            </p>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t('firstName')} *
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {t('lastName')} *
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              {t('phone')}
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+2557…"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              {t('email')}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t('defaultLocation')}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t('defaultLocationHint')}
            </p>
            <LocationPicker
              value={location}
              onChange={setLocation}
              requireDistrict
              requireWard={false}
              showLandmark={false}
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-card px-4 py-3 safe-pb">
          <Button
            type="button"
            className="w-full"
            loading={saving}
            disabled={uploading}
            onClick={() => void onSave()}
          >
            {t('saveProfile')}
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes edit-profile-up {
          from { transform: translateY(100%); opacity: 0.9; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
