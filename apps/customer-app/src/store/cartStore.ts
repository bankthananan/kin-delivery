import { create } from 'zustand';

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface CartState {
  restaurantId: string | null;
  items: CartItem[];
  tier: 'FASTEST' | 'NORMAL' | 'SAVER';
  setTier: (tier: 'FASTEST' | 'NORMAL' | 'SAVER') => void;
  addItem: (restaurantId: string, item: CartItem) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotals: () => { subtotal: number };
}

export const useCartStore = create<CartState>((set, get) => ({
  restaurantId: null,
  items: [],
  tier: 'NORMAL',
  setTier: (tier) => set({ tier }),
  addItem: (rId, item) => set((state) => {
    if (state.restaurantId !== null && state.restaurantId !== rId) {
      return { restaurantId: rId, items: [item] };
    }
    const existing = state.items.find(i => i.menuItemId === item.menuItemId);
    if (existing) {
      return {
        restaurantId: rId,
        items: state.items.map(i => 
          i.menuItemId === item.menuItemId 
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      };
    }
    return { restaurantId: rId, items: [...state.items, item] };
  }),
  removeItem: (menuItemId) => set((state) => {
    const updated = state.items.filter(i => i.menuItemId !== menuItemId);
    return { 
      items: updated,
      restaurantId: updated.length === 0 ? null : state.restaurantId
    };
  }),
  updateQuantity: (menuItemId, quantity) => set((state) => {
    if (quantity <= 0) {
      const updated = state.items.filter(i => i.menuItemId !== menuItemId);
      return { 
        items: updated,
        restaurantId: updated.length === 0 ? null : state.restaurantId
      };
    }
    return {
      items: state.items.map(i => 
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      )
    };
  }),
  clearCart: () => set({ restaurantId: null, items: [], tier: 'NORMAL' }),
  getTotals: () => {
    const state = get();
    const subtotal = state.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    return { subtotal };
  }
}));