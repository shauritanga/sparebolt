import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/upload';
import { cn } from '@/lib/utils';
import { SafeImage } from '@/components/safe-image';
import { Input } from '@/components/ui/input';

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  hint?: string;
  className?: string;
};

/**
 * Pick a photo from the device camera/gallery, upload to API, store returned URL.
 * Optional manual URL entry kept as fallback.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  required,
  hint,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image must be under 8MB');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadImage(file);
      onChange(res.url);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Upload failed — check you are logged in');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold text-muted-foreground">
          {label}
          {required ? ' *' : ''}
        </label>
        <button
          type="button"
          className="text-[11px] font-semibold text-bolt-700 dark:text-bolt-300 cursor-pointer"
          onClick={() => setShowUrl((s) => !s)}
        >
          {showUrl ? 'Hide URL' : 'Paste URL'}
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex min-h-[88px] min-w-[88px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border bg-muted px-2 text-muted-foreground transition hover:border-bolt-400 hover:bg-bolt-50 dark:hover:bg-bolt-950/50 cursor-pointer',
            value && 'border-solid border-border p-0 overflow-hidden',
            uploading && 'opacity-70 pointer-events-none',
          )}
        >
          {value && !uploading ? (
            <div className="relative h-[88px] w-[88px]">
              <SafeImage
                src={value}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ) : uploading ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-bolt-700 dark:text-bolt-300" />
              <span className="text-[10px] font-semibold">Uploading…</span>
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6 text-bolt-700 dark:text-bolt-300" />
              <span className="text-[10px] font-semibold text-center">
                Tap to upload
              </span>
            </>
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
          {value ? (
            <div className="flex items-start gap-1">
              <p className="min-w-0 flex-1 break-all text-[11px] text-muted-foreground">
                {value}
              </p>
              <button
                type="button"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-danger cursor-pointer"
                onClick={() => onChange('')}
                aria-label="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Camera or gallery · max 8MB · JPEG/PNG/WebP
            </p>
          )}
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
      </div>

      {showUrl && (
        <Input
          type="url"
          placeholder="https://… or /uploads/…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void onPick(e)}
      />
    </div>
  );
}
