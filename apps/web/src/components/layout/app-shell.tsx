import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  ShoppingCart,
  Package,
  User,
  Bolt,
  Bell,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function AppShell() {
  const { t, i18n } = useTranslation();
  const cartCount = useCartStore((s) => s.totalItems());
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const location = useLocation();
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

  // Hide bottom nav on auth, checkout, and product detail (mobile action bar)
  const hideNav =
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/parts/');

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

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-surface md:max-w-none">
      <header className="sticky top-0 z-40 border-b border-steel-200/80 bg-white/95 backdrop-blur-md safe-pt">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bolt-700 text-white shadow-sm">
              <Bolt className="h-5 w-5 fill-current" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-steel-900">
              Spare<span className="text-bolt-700">Bolt</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleLang}
              className="rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase text-steel-600 hover:bg-steel-100 cursor-pointer min-h-[44px]"
              aria-label={t('language')}
            >
              {i18n.language === 'en' ? 'SW' : 'EN'}
            </button>
            {user && (
              <Link
                to="/notifications"
                className="relative rounded-xl p-2.5 text-steel-600 hover:bg-steel-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t('notifications')}
              >
                <Bell className="h-5 w-5" />
              </Link>
            )}
            <Link
              to="/cart"
              className="relative rounded-xl p-2.5 text-steel-600 hover:bg-steel-100 min-h-[44px] min-w-[44px] flex items-center justify-center md:hidden"
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
          <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
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
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-steel-200 bg-white/95 backdrop-blur-md safe-pb md:hidden">
          <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
            {nav.map(({ to, icon: Icon, label, badge }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors min-h-[52px]',
                      isActive ? 'text-bolt-700' : 'text-steel-400',
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
