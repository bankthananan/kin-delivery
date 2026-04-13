import { create } from 'zustand';

type Order = Record<string, unknown>;

interface DriverState {
  isOnline: boolean;
  activeOrders: Order[];
  currentLocation: { lat: number; lng: number } | null;
  todayEarnings: number;
  totalCompletedToday: number;
  setOnline: (status: boolean) => void;
  setActiveOrders: (orders: Order[]) => void;
  setCurrentLocation: (loc: { lat: number; lng: number } | null) => void;
  setStats: (earnings: number, completed: number) => void;
}

export const useDriverStore = create<DriverState>((set) => ({
  isOnline: false,
  activeOrders: [],
  currentLocation: null,
  todayEarnings: 0,
  totalCompletedToday: 0,
  setOnline: (isOnline) => set({ isOnline }),
  setActiveOrders: (activeOrders) => set({ activeOrders }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setStats: (todayEarnings, totalCompletedToday) => set({ todayEarnings, totalCompletedToday }),
}));
