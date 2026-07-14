import { api } from '@/lib/api';
import type { CartItem } from '@/stores/cart-store';

let timer: ReturnType<typeof setTimeout> | null = null;
let lastPayload = '';

/**
 * Debounced sync of client cart → server for abandoned-cart recovery.
 * No-ops when logged out (no JWT).
 */
export function scheduleCartSync(items: CartItem[]) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void pushCartSync(items);
  }, 800);
}

export async function pushCartSync(items: CartItem[]) {
  const token = localStorage.getItem('sb_token');
  if (!token) return;

  const payload = items.map((i) => ({
    listingId: i.listingId,
    title: i.title,
    price: i.price,
    quantity: i.quantity,
    image: i.image,
    sellerId: i.sellerId,
    city: i.city,
  }));

  const key = JSON.stringify(payload);
  if (key === lastPayload) return;
  lastPayload = key;

  try {
    if (payload.length === 0) {
      await api.delete('/cart/sync');
    } else {
      await api.put('/cart/sync', { items: payload });
    }
  } catch {
    // Soft-fail: cart recovery is best-effort
    lastPayload = '';
  }
}

/** Force sync after login (flush pending cart). */
export function flushCartSync(items: CartItem[]) {
  lastPayload = '';
  return pushCartSync(items);
}
