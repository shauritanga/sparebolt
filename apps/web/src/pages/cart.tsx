import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SafeImage } from '@/components/safe-image';

export function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, setQuantity, removeItem, subtotal } = useCartStore();
  const user = useAuthStore((s) => s.user);

  const deliveryFee = items.length ? 5000 : 0;
  const total = subtotal() + deliveryFee;

  if (!items.length) {
    return (
      <div className="flex flex-col items-center py-20 text-center">
        <ShoppingBag className="mb-4 h-14 w-14 text-steel-300" />
        <p className="font-display text-lg font-bold text-steel-700">
          {t('emptyCart')}
        </p>
        <Button className="mt-6" asChild>
          <Link to="/browse">{t('continueShopping')}</Link>
        </Button>
      </div>
    );
  }

  const checkout = () => {
    if (!user) {
      void navigate('/auth/login', { state: { from: '/checkout' } });
      return;
    }
    void navigate('/checkout');
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="font-display text-2xl font-extrabold">{t('cart')}</h1>

      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.listingId}
            className="flex gap-3 rounded-2xl border border-steel-200 bg-white p-3 shadow-sm"
          >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-steel-100">
              {item.image ? (
                <SafeImage
                  src={item.image}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <SafeImage
                  src={undefined}
                  alt=""
                  className="h-full w-full object-cover opacity-60"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
              <p className="font-display font-bold text-bolt-800">
                {formatTZS(item.price)}
              </p>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center rounded-lg border border-steel-200">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center cursor-pointer"
                    onClick={() =>
                      setQuantity(item.listingId, item.quantity - 1)
                    }
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center cursor-pointer"
                    onClick={() =>
                      setQuantity(item.listingId, item.quantity + 1)
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.listingId)}
                  className="rounded-lg p-2 text-danger cursor-pointer min-h-[44px] min-w-[44px]"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2 rounded-2xl border border-steel-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-steel-500">{t('subtotal')}</span>
          <span className="font-semibold">{formatTZS(subtotal())}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-steel-500">{t('deliveryFee')}</span>
          <span className="font-semibold">{formatTZS(deliveryFee)}</span>
        </div>
        <div className="flex justify-between border-t border-steel-100 pt-2 font-display text-lg font-bold">
          <span>{t('total')}</span>
          <span className="text-bolt-800">{formatTZS(total)}</span>
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={checkout}>
        {t('checkout')}
      </Button>
    </div>
  );
}
