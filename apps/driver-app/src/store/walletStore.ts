import { create } from 'zustand';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
}

interface WalletState {
  balance: number;
  transactions: Transaction[];
  setWallet: (balance: number, transactions: Transaction[]) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: 0,
  transactions: [],
  setWallet: (balance, transactions) => set({ balance, transactions }),
}));
