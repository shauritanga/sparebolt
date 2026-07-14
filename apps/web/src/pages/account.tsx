import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Package,
  Store,
  Truck,
  User,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';

export function AccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <User className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">{t('account')}</h1>
        <p className="text-sm text-muted-foreground">
          Log in to track orders, sell parts, or deliver.
        </p>
        <div className="flex justify-center gap-2">
          <Button asChild>
            <Link to="/auth/login">{t('login')}</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/auth/register">{t('register')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const links: { to: string; icon: typeof Package; label: string }[] = [
    { to: '/orders', icon: Package, label: t('orders') },
  ];

  if (user.role === 'SELLER' || user.role === 'ADMIN') {
    links.push(
      { to: '/seller', icon: Store, label: t('dashboard') },
      { to: '/seller/listings', icon: Package, label: t('myListings') },
    );
  } else {
    links.push({
      to: '/account/become-seller',
      icon: Store,
      label: t('becomeSeller'),
    });
  }

  if (user.role === 'DRIVER' || user.role === 'ADMIN') {
    links.push({ to: '/driver', icon: Truck, label: t('jobs') });
  } else {
    links.push({
      to: '/account/become-driver',
      icon: Truck,
      label: t('becomeDriver'),
    });
  }

  if (user.role === 'ADMIN') {
    links.push({ to: '/admin', icon: LayoutDashboard, label: 'Admin' });
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-bolt-800 to-steel-900 p-5 text-white shadow-md">
        <p className="text-xs font-bold uppercase tracking-wider text-bolt-200">
          {user.role}
        </p>
        <h1 className="font-display text-2xl font-extrabold">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-sm text-bolt-100/80">{user.email || user.phone}</p>
      </div>

      {user.sellerProfile?.status === 'PENDING' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-bold">Seller verification pending</p>
          <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
            Your documents are under review. You cannot list parts until an
            admin approves your application.
          </p>
        </div>
      )}
      {user.sellerProfile?.status === 'REJECTED' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          <p className="font-bold">Seller application rejected</p>
          <p className="mt-1">
            {user.sellerProfile.rejectionReason ||
              'Contact support for details.'}
          </p>
        </div>
      )}
      {user.driverProfile?.status === 'PENDING' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          <p className="font-bold">Driver verification pending</p>
          <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
            Your documents are under review. You cannot accept jobs until an
            admin approves your application.
          </p>
        </div>
      )}
      {user.driverProfile?.status === 'REJECTED' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100">
          <p className="font-bold">Driver application rejected</p>
          <p className="mt-1">
            {user.driverProfile.rejectionReason ||
              'Contact support for details.'}
          </p>
        </div>
      )}

      <ul className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {links.map(({ to, icon: Icon, label }) => (
          <li key={to} className="border-b border-border last:border-0">
            <Link
              to={to}
              className="flex min-h-[52px] items-center gap-3 px-4 py-3.5 transition hover:bg-muted"
            >
              <Icon className="h-5 w-5 text-bolt-700 dark:text-bolt-300" />
              <span className="flex-1 font-semibold text-foreground">{label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        className="w-full"
        onClick={() => {
          logout();
          void navigate('/');
        }}
      >
        <LogOut className="h-4 w-4" />
        {t('logout')}
      </Button>
    </div>
  );
}

export { BecomeSellerPage } from '@/pages/become-seller';
export { BecomeDriverPage } from '@/pages/become-driver';
