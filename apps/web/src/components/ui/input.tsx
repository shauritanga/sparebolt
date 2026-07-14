import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'flex h-12 w-full rounded-xl border border-steel-200 bg-white px-4 py-2 text-base text-steel-900 shadow-sm transition-colors placeholder:text-steel-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bolt-500 focus-visible:border-bolt-500 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';
