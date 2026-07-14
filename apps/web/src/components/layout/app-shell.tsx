import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  ShoppingCart,
  Package,
  User,
  Bolt,
  Bell,
  Moon,
  Sun,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { useEffect, useState } from 'react';

export function AppShell() {
  const { t, i18n } = useTranslation();
  const cartCount = useCartStore((s) => s.totalItems());
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    void refreshMe();
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [refreshMe]);

  // Register FCM web push once the user is authenticated
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void import('@/lib/push').then(({ registerWebPush }) => {
      if (cancelled) return;
      void registerWebPush().then((res) => {
        if (!res.ok && res.reason && res.reason !== 'permission-denied') {
          console.debug('[SpareBolt] push registration:', res.reason);
        }
      });
    });
    // Sync local cart to server for abandoned-cart recovery
    void import('@/lib/cart-sync').then(({ flushCartSync }) => {
      if (cancelled) return;
      flushCartSync(useCartStore.getState().items);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isAdmin = location.pathname.startsWith('/admin');

  // Hide bottom nav on auth, checkout, product detail, and admin console
  const hideNav =
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/parts/') ||
    isAdmin;

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'sw' : 'en';
    void i18n.changeLanguage(next);
    localStorage.setItem('sb_locale', next);
  };

  const nav = [
    { to: '/', icon: Home, label: t('home') },
    { to: '/browse', icon: Search, label: t('browse') },
    { to: '/cart', icon: ShoppingCart, label: t('cart'), badge: cartCount },
    { to: '/orders', icon: Package, label: t('orders') },
    { to: '/account', icon: User, label: t('account') },
  ];

  // Admin console uses its own full-width shell (no consumer chrome)
  if (isAdmin) {
    return (
      <div className="min-h-dvh bg-background">
        {offline && (
          <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning-soft-foreground">
            {t('offline')}
          </div>
        )}
        <Outlet />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-background md:max-w-none">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md safe-pt">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bolt-700 text-white shadow-sm">
              <Bolt className="h-5 w-5 fill-current" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
              Spare<span className="text-bolt-500">Bolt</span>
            </span>
          </Link>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleLang}
              className="rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer min-h-[44px]"
              aria-label={t('language')}
            >
              {i18n.language === 'en' ? 'SW' : 'EN'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            {user && (
              <Link
                to="/notifications"
                className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t('notifications')}
              >
                <Bell className="h-5 w-5" />
              </Link>
            )}
            <Link
              to="/cart"
              className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center md:hidden"
              aria-label={t('cart')}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-signal px-1 text-[10px] font-bold text-steel-950">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
        {offline && (
          <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning-soft-foreground">
            {t('offline')}
          </div>
        )}
      </header>

      <main
        className={cn(
          'mx-auto w-full max-w-6xl flex-1 px-4 py-4',
          !hideNav && 'pb-24 md:pb-8',
        )}
      >
        <Outlet />
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md safe-pb md:hidden">
          <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
            {nav.map(({ to, icon: Icon, label, badge }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors min-h-[52px]',
                      isActive
                        ? 'text-bolt-600 dark:text-bolt-400'
                        : 'text-muted-foreground',
                    )
                  }
                >
                  <span className="relative">
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                    {badge ? (
                      <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-signal px-0.5 text-[9px] font-bold text-steel-950">
                        {badge}
                      </span>
                    ) : null}
                  </span>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
