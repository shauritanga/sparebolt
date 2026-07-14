import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [headerQ, setHeaderQ] = useState('');
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

  const showDesktopChrome = !isAdmin;

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'sw' : 'en';
    void i18n.changeLanguage(next);
    localStorage.setItem('sb_locale', next);
  };

  /** Desktop top nav order */
  const customerNav: NavItem[] = [
    { to: '/', icon: Home, label: t('home'), end: true },
    { to: '/browse', icon: Search, label: t('browse') },
    { to: '/orders', icon: Package, label: t('orders') },
    { to: '/cart', icon: ShoppingCart, label: t('cart'), badge: cartCount },
    { to: '/account', icon: User, label: t('account') },
  ];

  /** Mobile bottom tabs — original order (icons + labels) */
  const mobileCustomerNav: NavItem[] = [
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

  const onHeaderSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = headerQ.trim();
    void navigate(q ? `/browse?q=${encodeURIComponent(q)}` : '/browse');
  };

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
    <div className="flex min-h-dvh flex-col bg-background md:bg-[#eef2f1] dark:md:bg-background">
      {/* ═══════════════ MOBILE HEADER (unchanged pattern) ═══════════════ */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-md safe-pt md:hidden">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-3 px-4">
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
        {offline && (
          <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning-soft-foreground">
            {t('offline')}
          </div>
        )}
      </header>

      {/* ═══════════════ DESKTOP HEADER ═══════════════ */}
      {showDesktopChrome && (
        <header className="sticky top-0 z-40 hidden border-b border-border/80 bg-card shadow-[0_1px_0_rgba(15,23,42,0.04)] md:block">
          <div className="mx-auto flex h-[4.25rem] max-w-[1280px] items-center gap-6 px-6 lg:gap-10 lg:px-10">
            {/* Brand */}
            <Link to={roleHome} className="group flex shrink-0 items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bolt-700 text-white shadow-sm transition group-hover:bg-bolt-600">
                <Bolt className="h-5 w-5 fill-current" />
              </span>
              <div className="leading-none">
                <span className="font-display text-[1.35rem] font-extrabold tracking-tight text-foreground">
                  Spare<span className="text-bolt-600">Bolt</span>
                </span>
                <p className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground">
                  {t('tagline')}
                </p>
              </div>
            </Link>

            {/* Center search (customers only) */}
            {!workMode && !isAuth && (
              <form
                onSubmit={onHeaderSearch}
                className="mx-auto hidden min-w-0 max-w-xl flex-1 lg:block"
              >
                <label className="relative block">
                  <span className="sr-only">{t('searchPlaceholder')}</span>
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={headerQ}
                    onChange={(e) => setHeaderQ(e.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className="h-11 w-full rounded-full border border-border bg-[#f4f7f6] py-2 pl-10 pr-28 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-bolt-500 focus:bg-card focus:ring-2 focus:ring-bolt-500/20 dark:bg-muted"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-bolt-700 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-bolt-600"
                  >
                    {t('browse')}
                  </button>
                </label>
              </form>
            )}

            {/* Text nav */}
            {!isAuth && (
              <nav
                className={cn(
                  'flex items-center gap-0.5',
                  workMode ? 'ml-4 flex-1' : 'ml-auto',
                )}
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
                        'relative px-3.5 py-2 text-[13px] font-semibold tracking-wide transition-colors',
                        active
                          ? 'text-bolt-800 dark:text-bolt-200'
                          : 'text-steel-600 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground',
                      )}
                    >
                      {item.label}
                      {item.badge ? (
                        <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-signal px-1 text-[10px] font-bold text-steel-950">
                          {item.badge}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          'absolute inset-x-3 -bottom-[calc(1.125rem+1px)] h-[2px] rounded-full bg-bolt-600 transition-opacity',
                          active ? 'opacity-100' : 'opacity-0',
                        )}
                      />
                    </NavLink>
                  );
                })}
              </nav>
            )}

            {/* Right tools */}
            <div className={cn('flex shrink-0 items-center gap-1', isAuth && 'ml-auto')}>
              <button
                type="button"
                onClick={toggleLang}
                className="cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {i18n.language === 'en' ? 'SW' : 'EN'}
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={isDark ? t('lightMode') : t('darkMode')}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              {user && (
                <Link
                  to="/notifications"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={t('notifications')}
                >
                  <Bell className="h-4 w-4" />
                </Link>
              )}
              <div className="mx-1 h-6 w-px bg-border" />
              <Link
                to={user ? '/account' : '/auth/login'}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm font-semibold text-foreground shadow-sm transition hover:border-bolt-400 hover:shadow"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-bolt-600 to-bolt-800 text-[11px] font-bold text-white">
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
      )}

      {/* ═══════════════ MAIN ═══════════════ */}
      <main
        className={cn(
          'w-full flex-1',
          /* mobile */
          'px-4 py-4',
          !hideMobileNav && 'pb-24',
          /* desktop */
          'md:px-0 md:py-0 md:pb-0',
        )}
      >
        <div
          className={cn(
            'mx-auto w-full',
            /* mobile: no extra frame */
            /* desktop: spacious canvas */
            'md:max-w-[1280px] md:px-6 md:py-8 lg:px-10 lg:py-10',
          )}
        >
          <Outlet />
        </div>
      </main>

      {/* ═══════════════ DESKTOP FOOTER ═══════════════ */}
      {showDesktopChrome && <SiteFooter />}

      {/* ═══════════════ MOBILE BOTTOM NAV (unchanged) ═══════════════ */}
      {!hideMobileNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md safe-pb md:hidden">
          <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
            {(workMode ? nav : mobileCustomerNav).map((item) => {
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
