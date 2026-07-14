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
    <div className="flex min-h-dvh flex-col bg-background md:bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md safe-pt">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 lg:h-16 lg:px-6">
          <Link to={roleHome} className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bolt-700 text-white shadow-sm">
              <Bolt className="h-5 w-5 fill-current" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
              Spare<span className="text-bolt-500">Bolt</span>
            </span>
          </Link>

          {/* Desktop primary nav */}
          {!hideNav && (
            <nav
              className="ml-4 hidden min-w-0 flex-1 items-center gap-1 md:flex lg:ml-8"
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
                      'relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-bolt-700/10 text-bolt-800 dark:bg-bolt-500/15 dark:text-bolt-200'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-signal px-1.5 text-[10px] font-bold text-steel-950">
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-0.5">
            {!workMode && !hideNav && (
              <Link
                to="/browse"
                className="mr-1 hidden max-w-[12rem] truncate rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-bolt-300 hover:text-foreground lg:inline-flex"
              >
                {t('searchPlaceholder')}
              </Link>
            )}
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
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
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
                className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
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
            {/* Desktop account chip */}
            <Link
              to={user ? '/account' : '/auth/login'}
              className="ml-1 hidden items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 text-sm font-semibold text-foreground shadow-sm transition hover:border-bolt-300 md:inline-flex"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bolt-700/10 text-xs font-bold text-bolt-800 dark:text-bolt-200">
                {user
                  ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() ||
                    'SB'
                  : '?'}
              </span>
              <span className="max-w-[7rem] truncate">
                {user ? user.firstName : t('login')}
              </span>
            </Link>
          </div>
        </div>
        {offline && (
          <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning-soft-foreground">
            {t('offline')}
          </div>
        )}
      </header>

      <div
        className={cn(
          'mx-auto flex w-full max-w-7xl flex-1',
          workMode && !hideNav && 'md:gap-0',
        )}
      >
        {/* Desktop sidebar for seller / driver workspaces */}
        {workMode && !hideNav && (
          <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-56 shrink-0 flex-col border-r border-border bg-card/80 py-4 backdrop-blur-sm lg:flex lg:w-60">
            <p className="mb-3 px-5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {driverMode ? t('jobs') : t('dashboard')}
            </p>
            <nav className="flex flex-1 flex-col gap-0.5 px-2" aria-label="Workspace">
              {nav.map((item) => {
                const active = navItemActive(
                  item,
                  location.pathname,
                  location.search,
                );
                const Icon = item.icon;
                return (
                  <NavLink
                    key={`side-${item.to}`}
                    to={item.to}
                    end={item.end}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-bolt-700 text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                    <span className="truncate">{item.label}</span>
                    {item.badge ? (
                      <span
                        className={cn(
                          'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-signal text-steel-950',
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </NavLink>
                );
              })}
            </nav>
            <div className="mt-auto border-t border-border px-4 pt-3">
              <p className="truncate text-xs font-semibold text-foreground">
                {user
                  ? `${user.firstName} ${user.lastName}`.trim()
                  : ''}
              </p>
              <p className="truncate text-[11px] capitalize text-muted-foreground">
                {user?.role?.toLowerCase()}
              </p>
            </div>
          </aside>
        )}

        <main
          className={cn(
            'min-w-0 flex-1 px-4 py-4',
            !hideNav && 'pb-24 md:pb-8',
            workMode && !hideNav && 'lg:px-8 lg:py-6',
            !workMode && 'md:px-6 lg:px-8 lg:py-8',
            // Marketplace pages sit on soft canvas on desktop
            !workMode && 'md:bg-transparent',
          )}
        >
          <div
            className={cn(
              // On desktop marketplace, content can use full main width;
              // individual pages still control their own max widths.
              'mx-auto w-full',
              workMode ? 'max-w-5xl' : 'max-w-6xl',
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {!hideNav && (
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
