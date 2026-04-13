import { create } from 'zustand';

interface Address {
  id: string;
  label: string;
  lat: number;
  lng: number;
  addressStr: string;
}

interface LocationState {
  currentLocation: { lat: number; lng: number } | null;
  selectedAddress: Address | null;
  setCurrentLocation: (loc: { lat: number; lng: number }) => void;
  setSelectedAddress: (addr: Address | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  selectedAddress: null,
  setCurrentLocation: (loc) => set({ currentLocation: loc }),
  setSelectedAddress: (addr) => set({ selectedAddress: addr }),
}));