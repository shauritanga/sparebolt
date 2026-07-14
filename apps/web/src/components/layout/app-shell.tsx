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
  Briefcase,
  Navigation,
  Wallet,
  LayoutDashboard,
  Store,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/use-theme';
import { isDriverRole, isSellerRole } from '@/lib/role-home';
import { SiteFooter } from '@/components/layout/site-footer';
import { useEffect, useState } from 'react';

type NavItem = {
  to: string;
  icon: typeof Home;
  label: string;
  badge?: number;
  end?: boolean;
  match?: (pathname: string, search: string) => boolean;
};

function navItemActive(item: NavItem, pathname: string, search: string) {
  if (item.match) return item.match(pathname, search);
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function AppShell() {
  const { t, i18n } = useTranslation();
  const cartCount = useCartStore((s) => s.totalItems());
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const [offline, setOffline] = useState(!navigator.onLine);
  const driverMode = isDriverRole(user?.role);
  const sellerMode = isSellerRole(user?.role);
  const workMode = driverMode || sellerMode;
  const roleHome = driverMode ? '/driver' : sellerMode ? '/seller' : '/';

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
    void import('@/lib/cart-sync').then(({ flushCartSync }) => {
      if (cancelled) return;
      flushCartSync(useCartStore.getState().items);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const isAdmin = location.pathname.startsWith('/admin');
  const isAuth = location.pathname.startsWith('/auth');

  const hideMobileNav =
    isAuth ||
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/parts/') ||
    isAdmin;

  /** Full marketing chrome (header nav + footer) on desktop except admin */
  const showDesktopChrome = !isAdmin;

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'sw' : 'en';
    void i18n.changeLanguage(next);
    localStorage.setItem('sb_locale', next);
  };

  const customerNav: NavItem[] = [
    { to: '/', icon: Home, label: t('home'), end: true },
    { to: '/browse', icon: Search, label: t('browse') },
    { to: '/cart', icon: ShoppingCart, label: t('cart'), badge: cartCount },
    { to: '/orders', icon: Package, label: t('orders') },
    { to: '/account', icon: User, label: t('account') },
  ];

  const driverNav: NavItem[] = [
    {
      to: '/driver',
      icon: Briefcase,
      label: t('jobs'),
      end: true,
      match: (path, search) =>
        path === '/driver' &&
        (!new URLSearchParams(search).get('tab') ||
          new URLSearchParams(search).get('tab') === 'available'),
    },
    {
      to: '/driver?tab=active',
      icon: Navigation,
      label: t('activeJobs'),
      match: (path, search) =>
        path === '/driver' &&
        new URLSearchParams(search).get('tab') === 'active',
    },
    {
      to: '/driver?tab=earnings',
      icon: Wallet,
      label: t('earnings'),
      match: (path, search) =>
        path === '/driver' &&
        new URLSearchParams(search).get('tab') === 'earnings',
    },
    { to: '/account', icon: User, label: t('account') },
  ];

  const sellerNav: NavItem[] = [
    {
      to: '/seller',
      icon: LayoutDashboard,
      label: t('dashboard'),
      end: true,
      match: (path) => path === '/seller',
    },
    {
      to: '/seller/listings',
      icon: Store,
      label: t('myListings'),
      match: (path) => path.startsWith('/seller/listings'),
    },
    {
      to: '/seller/sales',
      icon: Wallet,
      label: t('sales'),
      match: (path) => path.startsWith('/seller/sales'),
    },
    { to: '/account', icon: User, label: t('account') },
  ];

  const nav = driverMode
    ? driverNav
    : sellerMode
      ? sellerNav
      : customerNav;

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
    <div className="flex min-h-dvh flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md safe-pt">
        {/* Mobile: compact bar */}
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 md:hidden">
          <Link to={roleHome} className="flex shrink-0 items-center gap-2">
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
              className="min-h-[44px] cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t('language')}
            >
              {i18n.language === 'en' ? 'SW' : 'EN'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {user && (
              <Link
                to="/notifications"
                className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t('notifications')}
              >
                <Bell className="h-5 w-5" />
              </Link>
            )}
            {!workMode && (
              <Link
                to="/cart"
                className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t('cart')}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-signal px-1 text-[10px] font-bold text-steel-950">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Desktop: standard site header */}
        {showDesktopChrome && (
          <div className="mx-auto hidden max-w-7xl px-6 md:block lg:px-8">
            {/* Top utility row */}
            <div className="flex h-10 items-center justify-between border-b border-border/60 text-xs text-muted-foreground">
              <p className="truncate font-medium">{t('footerTagline')}</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleLang}
                  className="cursor-pointer font-bold uppercase tracking-wide hover:text-foreground"
                >
                  {i18n.language === 'en' ? 'Kiswahili' : 'English'}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex cursor-pointer items-center gap-1.5 hover:text-foreground"
                >
                  {isDark ? (
                    <>
                      <Sun className="h-3.5 w-3.5" /> {t('lightMode')}
                    </>
                  ) : (
                    <>
                      <Moon className="h-3.5 w-3.5" /> {t('darkMode')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Main brand + nav row */}
            <div className="flex h-16 items-center gap-8 lg:h-[4.25rem]">
              <Link to={roleHome} className="flex shrink-0 items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bolt-700 text-white shadow-sm">
                  <Bolt className="h-5 w-5 fill-current" />
                </span>
                <div className="leading-tight">
                  <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
                    Spare<span className="text-bolt-500">Bolt</span>
                  </span>
                  <p className="hidden text-[11px] font-medium text-muted-foreground lg:block">
                    {t('tagline')}
                  </p>
                </div>
              </Link>

              {!isAuth && (
                <nav
                  className="flex min-w-0 flex-1 items-center justify-center gap-1"
                  aria-label="Main"
                >
                  {nav.map((item) => {
                    const active = navItemActive(
                      item,
                      location.pathname,
                      location.search,
                    );
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={cn(
                          'relative inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold transition-colors',
                          active
                            ? 'text-bolt-800 dark:text-bolt-200'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        <span>{item.label}</span>
                        {item.badge ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-signal px-1.5 text-[10px] font-bold text-steel-950">
                            {item.badge}
                          </span>
                        ) : null}
                        {active && (
                          <span className="absolute inset-x-3 -bottom-[calc(0.5rem+1px)] h-0.5 rounded-full bg-bolt-600" />
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              )}

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {!workMode && !isAuth && (
                  <Link
                    to="/browse"
                    className="hidden max-w-[14rem] truncate rounded-full border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground transition hover:border-bolt-300 hover:bg-card hover:text-foreground lg:inline-flex"
                  >
                    {t('searchPlaceholder')}
                  </Link>
                )}
                {user && (
                  <Link
                    to="/notifications"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label={t('notifications')}
                  >
                    <Bell className="h-5 w-5" />
                  </Link>
                )}
                <Link
                  to={user ? '/account' : '/auth/login'}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-bolt-300"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-bolt-700 text-[11px] font-bold text-white">
                    {user
                      ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() ||
                        'SB'
                      : '?'}
                  </span>
                  <span className="max-w-[8rem] truncate">
                    {user ? user.firstName : t('login')}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {offline && (
          <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning-soft-foreground">
            {t('offline')}
          </div>
        )}
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main
        className={cn(
          'mx-auto w-full max-w-7xl flex-1 px-4 py-4',
          !hideMobileNav && 'pb-24 md:pb-10',
          'md:px-6 md:py-8 lg:px-8',
        )}
      >
        <Outlet />
      </main>

      {/* ── Desktop footer ─────────────────────────────────────── */}
      {showDesktopChrome && <SiteFooter />}

      {/* ── Mobile bottom nav (unchanged) ──────────────────────── */}
      {!hideMobileNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md safe-pb md:hidden">
          <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to} className="flex-1">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={() => {
                      const isActive = navItemActive(
                        item,
                        location.pathname,
                        location.search,
                      );
                      return cn(
                        'flex min-h-[52px] flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors',
                        isActive
                          ? 'text-bolt-600 dark:text-bolt-400'
                          : 'text-muted-foreground',
                      );
                    }}
                  >
                    <span className="relative">
                      <Icon className="h-5 w-5" strokeWidth={2.25} />
                      {item.badge ? (
                        <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-signal px-0.5 text-[9px] font-bold text-steel-950">
                          {item.badge}
                        </span>
                      ) : null}
                    </span>
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
