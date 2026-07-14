import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import localforage from 'localforage';
import type { Listing } from '@/lib/api';
import { scheduleCartSync } from '@/lib/cart-sync';

export type CartItem = {
  listingId: string;
  title: string;
  price: number;
  quantity: number;
  image?: string;
  sellerId?: string;
  city?: string;
  maxQuantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (listing: Listing, qty?: number) => void;
  removeItem: (listingId: string) => void;
  setQuantity: (listingId: string, quantity: number) => void;
  clear: () => void;
  totalItems: () => number;
  subtotal: () => number;
};

function afterCartChange(items: CartItem[]) {
  scheduleCartSync(items);
}

const forageStorage = createJSONStorage(() => ({
  getItem: async (name: string) => {
    const value = await localforage.getItem<string>(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await localforage.setItem(name, value);
  },
  removeItem: async (name: string) => {
    await localforage.removeItem(name);
  },
}));

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (listing, qty = 1) => {
        const price = Number(listing.price);
        const image = listing.images?.[0]?.url;
        set((state) => {
          const existing = state.items.find((i) => i.listingId === listing.id);
          if (existing) {
            const items = state.items.map((i) =>
              i.listingId === listing.id
                ? {
                    ...i,
                    quantity: Math.min(
                      i.quantity + qty,
                      listing.quantity || i.maxQuantity,
                    ),
                  }
                : i,
            );
            afterCartChange(items);
            return { items };
          }
          const items = [
            ...state.items,
            {
              listingId: listing.id,
              title: listing.title,
              price,
              quantity: Math.min(qty, listing.quantity || qty),
              image,
              sellerId: listing.seller?.id,
              city: listing.city,
              maxQuantity: listing.quantity || 99,
            },
          ];
          afterCartChange(items);
          return { items };
        });
      },

      removeItem: (listingId) =>
        set((s) => {
          const items = s.items.filter((i) => i.listingId !== listingId);
          afterCartChange(items);
          return { items };
        }),

      setQuantity: (listingId, quantity) =>
        set((s) => {
          const items = s.items
            .map((i) =>
              i.listingId === listingId
                ? {
                    ...i,
                    quantity: Math.max(1, Math.min(quantity, i.maxQuantity)),
                  }
                : i,
            )
            .filter((i) => i.quantity > 0);
          afterCartChange(items);
          return { items };
        }),

      clear: () => {
        afterCartChange([]);
        set({ items: [] });
      },

      totalItems: () => get().items.reduce((n, i) => n + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((n, i) => n + i.price * i.quantity, 0),
    }),
    {
      name: 'sb-cart',
      storage: forageStorage,
    },
  ),
);
