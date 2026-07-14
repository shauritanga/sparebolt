import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  default: 'bg-bolt-100 text-bolt-800',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-800',
  muted: 'bg-steel-100 text-steel-600',
  new: 'bg-emerald-100 text-emerald-800',
  used: 'bg-sky-100 text-sky-800',
  refurbished: 'bg-violet-100 text-violet-800',
};

export function Badge({
  children,
  variant = 'default',
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof styles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        styles[variant] || styles.default,
        className,
      )}
    >
      {children}
    </span>
  );
}
