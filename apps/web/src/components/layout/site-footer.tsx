import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bolt } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { isDriverRole, isSellerRole } from '@/lib/role-home';

const SUPPORT_EMAIL = 'support@ditronics.co.tz';
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * Desktop-only site footer (hidden on mobile — bottom nav fills that role).
 */
export function SiteFooter() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const driver = isDriverRole(user?.role);
  const seller = isSellerRole(user?.role);

  return (
    <footer className="mt-auto hidden border-t border-border bg-card md:block">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-bolt-700 text-white">
                <Bolt className="h-5 w-5 fill-current" />
              </span>
              <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
                Spare<span className="text-bolt-500">Bolt</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {t('footerTagline')}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('shopping')}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  to="/browse"
                  className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                >
                  {t('browse')}
                </Link>
              </li>
              <li>
                <Link
                  to="/orders"
                  className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                >
                  {t('orders')}
                </Link>
              </li>
              <li>
                <Link
                  to="/cart"
                  className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                >
                  {t('cart')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('earnWithUs')}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {seller ? (
                <>
                  <li>
                    <Link
                      to="/seller"
                      className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                    >
                      {t('dashboard')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/seller/listings"
                      className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                    >
                      {t('myListings')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/seller/sales"
                      className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                    >
                      {t('sales')}
                    </Link>
                  </li>
                </>
              ) : driver ? (
                <>
                  <li>
                    <Link
                      to="/driver"
                      className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                    >
                      {t('jobs')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/driver?tab=earnings"
                      className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                    >
                      {t('earnings')}
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link
                      to="/account/become-seller"
                      className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                    >
                      {t('becomeSeller')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/account/become-driver"
                      className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                    >
                      {t('becomeDriver')}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('support')}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link
                  to="/account"
                  className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                >
                  {t('account')}
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="font-medium text-foreground hover:text-bolt-700 dark:hover:text-bolt-300"
                >
                  {t('helpSupport')}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {COPYRIGHT_YEAR} Ditronics. {t('footerRights')}
          </p>
          <p className="text-xs text-muted-foreground">
            SpareBolt · {t('tagline')}
          </p>
        </div>
      </div>
    </footer>
  );
}
