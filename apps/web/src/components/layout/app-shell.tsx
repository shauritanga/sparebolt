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
    // Ensure abandoned-cart recovery re-syncs after IndexedDB rehydrate
    void import('@/lib/cart-sync').then(({ initCartSyncOnHydration }) => {
      initCartSyncOnHydration();
    });
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
    // After login / session restore: wait for cart hydration, then sync
    void import('@/lib/cart-sync').then(({ flushCartSync }) => {
      if (cancelled) return;
      void flushCartSync();
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

  const toggleLang = () => {
    const next = i18n.language === 'en' ? 'sw' : 'en';
    void i18n.changeLanguage(next);
    localStorage.setItem('sb_locale', next);
  };

  const customerDesktopNav: NavItem[] = [
    { to: '/', icon: Home, label: t('home'), end: true },
    { to: '/browse', icon: Search, label: t('browse') },
    { to: '/orders', icon: Package, label: t('orders') },
    { to: '/account', icon: User, label: t('account') },
  ];

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

  const desktopNav = driverMode
    ? driverNav
    : sellerMode
      ? sellerNav
      : customerDesktopNav;

  const mobileNav = workMode ? desktopNav : mobileCustomerNav;

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
    <div className="flex min-h-dvh flex-col bg-background">
      {/* ─── MOBILE HEADER (do not change structure) ─── */}
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

      {/* ─── DESKTOP: classic marketplace header ─── */}
      {!isAdmin && (
        <header className="sticky top-0 z-40 hidden bg-card md:block">
          {/* Row 1: logo · search · utilities */}
          <div className="border-b border-border">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-6 lg:px-8">
              <Link to={roleHome} className="flex shrink-0 items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bolt-700 text-white">
                  <Bolt className="h-5 w-5 fill-current" />
                </span>
                <span className="font-display text-xl font-extrabold tracking-tight text-foreground">
                  Spare<span className="text-bolt-600">Bolt</span>
                </span>
              </Link>

              {!workMode && !isAuth ? (
                <form
                  onSubmit={onHeaderSearch}
                  className="flex min-w-0 flex-1 items-center"
                >
                  <div className="flex w-full max-w-2xl overflow-hidden rounded-md border border-border bg-background focus-within:border-bolt-600 focus-within:ring-1 focus-within:ring-bolt-600">
                    <input
                      value={headerQ}
                      onChange={(e) => setHeaderQ(e.target.value)}
                      placeholder={t('searchPlaceholder')}
                      className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="submit"
                      className="shrink-0 bg-bolt-700 px-5 text-sm font-semibold text-white hover:bg-bolt-600"
                    >
                      {t('browse')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex-1" />
              )}

              <div className="flex shrink-0 items-center gap-4 text-sm">
                <button
                  type="button"
                  onClick={toggleLang}
                  className="cursor-pointer font-medium text-muted-foreground hover:text-foreground"
                >
                  {i18n.language === 'en' ? 'SW' : 'EN'}
                </button>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label={isDark ? t('lightMode') : t('darkMode')}
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                {user && (
                  <Link
                    to="/notifications"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={t('notifications')}
                  >
                    <Bell className="h-4 w-4" />
                  </Link>
                )}
                {!workMode && (
                  <Link
                    to="/cart"
                    className="relative font-medium text-foreground hover:text-bolt-700"
                  >
                    {t('cart')}
                    {cartCount > 0 && (
                      <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-signal px-1 text-[10px] font-bold text-steel-950">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                )}
                <Link
                  to={user ? '/account' : '/auth/login'}
                  className="font-semibold text-foreground hover:text-bolt-700"
                >
                  {user ? user.firstName : t('login')}
                </Link>
              </div>
            </div>
          </div>

          {/* Row 2: text navigation */}
          {!isAuth && (
            <div className="border-b border-border bg-card">
              <nav
                className="mx-auto flex max-w-6xl items-center gap-1 px-6 lg:px-8"
                aria-label="Main"
              >
                {desktopNav.map((item) => {
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
                        'border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                        active
                          ? 'border-bolt-700 text-bolt-800 dark:border-bolt-400 dark:text-bolt-200'
                          : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                      )}
                    >
                      {item.label}
                      {item.badge ? (
                        <span className="ml-1.5 text-xs font-bold text-amber-600">
                          ({item.badge})
                        </span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          )}

          {offline && (
            <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning-soft-foreground">
              {t('offline')}
            </div>
          )}
        </header>
      )}

      {/* ─── MAIN ─── */}
      <main
        className={cn(
          'w-full flex-1',
          'px-4 py-4',
          !hideMobileNav && 'pb-24',
          'md:px-0 md:py-0 md:pb-0',
        )}
      >
        <div className="mx-auto w-full max-w-6xl md:px-6 md:py-8 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* ─── DESKTOP FOOTER ─── */}
      {!isAdmin && <SiteFooter />}

      {/* ─── MOBILE BOTTOM NAV (unchanged) ─── */}
      {!hideMobileNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md safe-pb md:hidden">
          <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
            {mobileNav.map((item) => {
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
