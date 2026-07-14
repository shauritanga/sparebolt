import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bolt } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { isDriverRole, isSellerRole } from '@/lib/role-home';

const SUPPORT_EMAIL = 'support@ditronics.co.tz';
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * Desktop-only site footer — professional multi-column marketplace footer.
 * Hidden on mobile so bottom tabs remain uncluttered.
 */
export function SiteFooter() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const driver = isDriverRole(user?.role);
  const seller = isSellerRole(user?.role);

  const linkClass =
    'text-sm text-steel-300 transition hover:text-white';

  return (
    <footer className="mt-auto hidden md:block">
      {/* Main band */}
      <div className="bg-steel-900 text-steel-100 dark:bg-steel-950">
        <div className="mx-auto max-w-[1280px] px-6 py-14 lg:px-10">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bolt-600 text-white">
                  <Bolt className="h-5 w-5 fill-current" />
                </span>
                <span className="font-display text-xl font-extrabold tracking-tight text-white">
                  Spare<span className="text-bolt-400">Bolt</span>
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-steel-400">
                {t('footerTagline')}
              </p>
              <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-steel-500">
                Escrow · Delivery · Trust
              </p>
            </div>

            <div className="grid gap-10 sm:grid-cols-3 lg:col-span-8">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-steel-500">
                  {t('shopping')}
                </p>
                <ul className="mt-4 space-y-2.5">
                  <li>
                    <Link to="/browse" className={linkClass}>
                      {t('browse')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/orders" className={linkClass}>
                      {t('orders')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/cart" className={linkClass}>
                      {t('cart')}
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-steel-500">
                  {t('earnWithUs')}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {seller ? (
                    <>
                      <li>
                        <Link to="/seller" className={linkClass}>
                          {t('dashboard')}
                        </Link>
                      </li>
                      <li>
                        <Link to="/seller/listings" className={linkClass}>
                          {t('myListings')}
                        </Link>
                      </li>
                      <li>
                        <Link to="/seller/sales" className={linkClass}>
                          {t('sales')}
                        </Link>
                      </li>
                    </>
                  ) : driver ? (
                    <>
                      <li>
                        <Link to="/driver" className={linkClass}>
                          {t('jobs')}
                        </Link>
                      </li>
                      <li>
                        <Link to="/driver?tab=earnings" className={linkClass}>
                          {t('earnings')}
                        </Link>
                      </li>
                    </>
                  ) : (
                    <>
                      <li>
                        <Link to="/account/become-seller" className={linkClass}>
                          {t('becomeSeller')}
                        </Link>
                      </li>
                      <li>
                        <Link to="/account/become-driver" className={linkClass}>
                          {t('becomeDriver')}
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-steel-500">
                  {t('support')}
                </p>
                <ul className="mt-4 space-y-2.5">
                  <li>
                    <Link to="/account" className={linkClass}>
                      {t('account')}
                    </Link>
                  </li>
                  <li>
                    <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                      {t('helpSupport')}
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="text-sm text-steel-500 transition hover:text-steel-300"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legal bar */}
      <div className="border-t border-white/5 bg-steel-950">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-2 px-6 py-4 text-xs text-steel-500 sm:flex-row sm:items-center lg:px-10">
          <p>
            © {COPYRIGHT_YEAR} Ditronics. {t('footerRights')}
          </p>
          <p className="text-steel-600">SpareBolt · {t('tagline')}</p>
        </div>
      </div>
    </footer>
  );
}
