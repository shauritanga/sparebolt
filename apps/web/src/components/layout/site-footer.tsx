import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth-store';
import { isDriverRole, isSellerRole } from '@/lib/role-home';

const SUPPORT_EMAIL = 'support@ditronics.co.tz';
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * Simple desktop site footer. Hidden on mobile.
 */
export function SiteFooter() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const driver = isDriverRole(user?.role);
  const seller = isSellerRole(user?.role);

  return (
    <footer className="mt-auto hidden border-t border-border bg-card md:block">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-base font-extrabold text-foreground">
              Spare<span className="text-bolt-600">Bolt</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t('footerTagline')}
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('shopping')}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/browse" className="hover:text-foreground">
                  {t('browse')}
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-foreground">
                  {t('orders')}
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-foreground">
                  {t('cart')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('earnWithUs')}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {seller ? (
                <>
                  <li>
                    <Link to="/seller" className="hover:text-foreground">
                      {t('dashboard')}
                    </Link>
                  </li>
                  <li>
                    <Link to="/seller/listings" className="hover:text-foreground">
                      {t('myListings')}
                    </Link>
                  </li>
                </>
              ) : driver ? (
                <>
                  <li>
                    <Link to="/driver" className="hover:text-foreground">
                      {t('jobs')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/driver?tab=earnings"
                      className="hover:text-foreground"
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
                      className="hover:text-foreground"
                    >
                      {t('becomeSeller')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/account/become-driver"
                      className="hover:text-foreground"
                    >
                      {t('becomeDriver')}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('support')}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/account" className="hover:text-foreground">
                  {t('account')}
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="hover:text-foreground"
                >
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-xs text-muted-foreground">
          © {COPYRIGHT_YEAR} Ditronics. {t('footerRights')}
        </div>
      </div>
    </footer>
  );
}
