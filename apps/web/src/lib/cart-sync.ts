import { api } from '@/lib/api';
import { useCartStore, type CartItem } from '@/stores/cart-store';

let timer: ReturnType<typeof setTimeout> | null = null;
let lastPayload = '';
let hydrationHooked = false;

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
  const token =
    localStorage.getItem('sb_token') ||
    // fallback if token only lives in auth persist briefly
    null;
  if (!token) return;

  // Never wipe the server snapshot before local cart has rehydrated from
  // IndexedDB — that race was clearing recovery for users with items.
  const hydrated =
    typeof useCartStore.persist?.hasHydrated === 'function'
      ? useCartStore.persist.hasHydrated()
      : true;
  if (!hydrated && items.length === 0) {
    return;
  }

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
  } catch (err) {
    // Soft-fail: cart recovery is best-effort — allow retry next time
    console.debug('[SpareBolt] cart sync failed', err);
    lastPayload = '';
  }
}

/**
 * Force sync after login / app open.
 * Waits for cart rehydration so we don't sync an empty cart by mistake.
 */
export function flushCartSync(items?: CartItem[]) {
  lastPayload = '';

  const run = () => {
    const current = items ?? useCartStore.getState().items;
    return pushCartSync(current);
  };

  const hydrated =
    typeof useCartStore.persist?.hasHydrated === 'function'
      ? useCartStore.persist.hasHydrated()
      : true;

  if (hydrated) {
    return run();
  }

  return new Promise<void>((resolve) => {
    useCartStore.persist.onFinishHydration(() => {
      void run().finally(() => resolve());
    });
    // Safety: if hydration never fires, still try after a short wait
    setTimeout(() => {
      void run().finally(() => resolve());
    }, 2500);
  });
}

/** Call once at app boot so rehydrated carts schedule recovery. */
export function initCartSyncOnHydration() {
  if (hydrationHooked) return;
  hydrationHooked = true;

  const syncIfAuthed = () => {
    if (!localStorage.getItem('sb_token')) return;
    lastPayload = '';
    void pushCartSync(useCartStore.getState().items);
  };

  if (useCartStore.persist.hasHydrated()) {
    syncIfAuthed();
  } else {
    useCartStore.persist.onFinishHydration(() => {
      syncIfAuthed();
    });
  }
}
