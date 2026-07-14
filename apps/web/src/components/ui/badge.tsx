import { cn } from '@/lib/utils';

const styles: Record<string, string> = {
  default:
    'bg-bolt-100 text-bolt-800 dark:bg-bolt-950 dark:text-bolt-200',
  success:
    'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  warning:
    'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  danger: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  muted: 'bg-muted text-muted-foreground',
  new: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  used: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
  refurbished:
    'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300',
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
