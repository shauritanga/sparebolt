import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Address } from '@/lib/api';
import { useCartStore } from '@/stores/cart-store';
import { formatTZS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [newAddr, setNewAddr] = useState({
    label: 'Home',
    street: '',
    area: '',
    city: 'Dar es Salaam',
  });

  useEffect(() => {
    if (!items.length) {
      void navigate('/cart');
      return;
    }
    void api.get('/addresses').then((r) => {
      setAddresses(r.data);
      const def = r.data.find((a: Address) => a.isDefault) || r.data[0];
      if (def) setAddressId(def.id);
    });
  }, [items.length, navigate]);

  const deliveryFee = 5000;
  const total = subtotal() + deliveryFee;

  const saveAddress = async () => {
    if (!newAddr.street || !newAddr.city) {
      toast.error('Street and city required');
      return;
    }
    const { data } = await api.post('/addresses', {
      ...newAddr,
      isDefault: !addresses.length,
    });
    setAddresses((a) => [...a, data]);
    setAddressId(data.id);
    toast.success('Address saved');
  };

  const placeOrder = async () => {
    if (!addressId) {
      toast.error('Select a delivery address');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        addressId,
        notes,
        paymentPhone: phone || undefined,
        items: items.map((i) => ({
          listingId: i.listingId,
          quantity: i.quantity,
        })),
      });
      clear();
      toast.success('Order placed — payment processing');
      void navigate(`/orders/${data.order.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message;
      toast.error(
        Array.isArray(msg) ? msg.join(', ') : msg || 'Checkout failed',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <h1 className="font-display text-2xl font-extrabold">{t('checkout')}</h1>

      <section className="space-y-3 rounded-2xl border border-steel-200 bg-white p-4">
        <h2 className="font-display font-bold">Delivery address</h2>
        {addresses.map((a) => (
          <label
            key={a.id}
            className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${
              addressId === a.id
                ? 'border-bolt-600 bg-bolt-50'
                : 'border-steel-200'
            }`}
          >
            <input
              type="radio"
              name="addr"
              checked={addressId === a.id}
              onChange={() => setAddressId(a.id)}
              className="mt-1"
            />
            <div>
              <p className="font-semibold">{a.label}</p>
              <p className="text-sm text-steel-600">
                {a.street}
                {a.area ? `, ${a.area}` : ''} — {a.city}
              </p>
            </div>
          </label>
        ))}

        <div className="space-y-2 border-t border-steel-100 pt-3">
          <p className="text-xs font-semibold uppercase text-steel-400">
            Add new address
          </p>
          <Input
            placeholder="Street / landmark"
            value={newAddr.street}
            onChange={(e) =>
              setNewAddr((s) => ({ ...s, street: e.target.value }))
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Area"
              value={newAddr.area}
              onChange={(e) =>
                setNewAddr((s) => ({ ...s, area: e.target.value }))
              }
            />
            <Input
              placeholder="City"
              value={newAddr.city}
              onChange={(e) =>
                setNewAddr((s) => ({ ...s, city: e.target.value }))
              }
            />
          </div>
          <Button variant="secondary" onClick={() => void saveAddress()}>
            Save address
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border border-steel-200 bg-white p-4">
        <h2 className="font-display font-bold">Mobile money (ClickPesa)</h2>
        <Input
          type="tel"
          placeholder="+2557…"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          placeholder="Notes for driver (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <div className="flex items-start gap-2 rounded-2xl bg-bolt-50 p-4 text-sm text-bolt-900">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{t('escrowNote')}</p>
      </div>

      <div className="rounded-2xl border border-steel-200 bg-white p-4 text-sm">
        <div className="flex justify-between">
          <span>{t('subtotal')}</span>
          <span className="font-semibold">{formatTZS(subtotal())}</span>
        </div>
        <div className="mt-1 flex justify-between">
          <span>{t('deliveryFee')}</span>
          <span className="font-semibold">{formatTZS(deliveryFee)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t pt-2 font-display text-lg font-bold">
          <span>{t('total')}</span>
          <span className="text-bolt-800">{formatTZS(total)}</span>
        </div>
      </div>

      <Button
        size="lg"
        className="w-full"
        loading={loading}
        onClick={() => void placeOrder()}
      >
        {t('placeOrder')}
      </Button>
    </div>
  );
}
