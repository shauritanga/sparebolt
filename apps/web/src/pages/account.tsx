import { useState } from 'react';
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
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  if (!user) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-12 text-center">
        <User className="mx-auto h-12 w-12 text-steel-300" />
        <h1 className="font-display text-xl font-bold">{t('account')}</h1>
        <p className="text-sm text-steel-500">
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
      <div className="rounded-3xl border border-steel-200 bg-gradient-to-br from-bolt-800 to-steel-900 p-5 text-white shadow-md">
        <p className="text-xs font-bold uppercase tracking-wider text-bolt-200">
          {user.role}
        </p>
        <h1 className="font-display text-2xl font-extrabold">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-sm text-bolt-100/80">{user.email || user.phone}</p>
      </div>

      <ul className="overflow-hidden rounded-2xl border border-steel-200 bg-white shadow-sm">
        {links.map(({ to, icon: Icon, label }) => (
          <li key={to} className="border-b border-steel-100 last:border-0">
            <Link
              to={to}
              className="flex min-h-[52px] items-center gap-3 px-4 py-3.5 transition hover:bg-steel-50"
            >
              <Icon className="h-5 w-5 text-bolt-700" />
              <span className="flex-1 font-semibold text-steel-800">{label}</span>
              <ChevronRight className="h-4 w-4 text-steel-400" />
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

export function BecomeSellerPage() {
  const navigate = useNavigate();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    description: '',
    city: 'Dar es Salaam',
  });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-2xl font-extrabold">Become a seller</h1>
      <form
        className="space-y-3 rounded-2xl border border-steel-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          void api
            .post('/auth/become-seller', form)
            .then(async () => {
              await refreshMe();
              toast.success('Seller profile created');
              void navigate('/seller');
            })
            .catch(() => toast.error('Failed'))
            .finally(() => setLoading(false));
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-steel-600">
            Business name
          </label>
          <Input
            required
            value={form.businessName}
            onChange={(e) =>
              setForm((s) => ({ ...s, businessName: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-steel-600">
            Description
          </label>
          <Input
            value={form.description}
            onChange={(e) =>
              setForm((s) => ({ ...s, description: e.target.value }))
            }
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-steel-600">
            City
          </label>
          <Input
            required
            value={form.city}
            onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
          />
        </div>
        <Button type="submit" className="w-full" loading={loading}>
          Submit
        </Button>
      </form>
    </div>
  );
}

export function BecomeDriverPage() {
  const navigate = useNavigate();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    vehicleType: 'motorcycle',
    vehiclePlate: '',
    licenseNumber: '',
    city: 'Dar es Salaam',
  });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-2xl font-extrabold">Become a driver</h1>
      <form
        className="space-y-3 rounded-2xl border border-steel-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          void api
            .post('/auth/become-driver', form)
            .then(async () => {
              await refreshMe();
              toast.success('Driver profile created');
              void navigate('/driver');
            })
            .catch(() => toast.error('Failed'))
            .finally(() => setLoading(false));
        }}
      >
        {(
          [
            ['vehicleType', 'Vehicle type (motorcycle/car/van)'],
            ['vehiclePlate', 'Plate number'],
            ['licenseNumber', 'License number'],
            ['city', 'City'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-xs font-semibold text-steel-600">
              {label}
            </label>
            <Input
              required
              value={form[key]}
              onChange={(e) =>
                setForm((s) => ({ ...s, [key]: e.target.value }))
              }
            />
          </div>
        ))}
        <Button type="submit" className="w-full" loading={loading}>
          Submit
        </Button>
      </form>
    </div>
  );
}
