import { create } from 'zustand';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED' | 'FAILED';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: number;
  items: OrderItem[];
  customerName: string;
  createdAt: string;
}

interface OrdersState {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  addOrder: (order) => set((state) => {
    if (state.orders.find(o => o.id === order.id)) return state;
    return { orders: [order, ...state.orders] };
  }),
  updateOrderStatus: (orderId, status) => set((state) => ({
    orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
  })),
}));
