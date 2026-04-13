'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface Transaction {
  id: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  createdAt: string;
}

export default function WalletPage() {
  const { user } = useAuthStore();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const loadWallet = async () => {
    if (!user?.restaurantId) return;
    try {
      const [balanceRes, historyRes] = await Promise.all([
        fetchApi<{ balance: number }>('/wallet/balance'),
        fetchApi<Transaction[]>('/wallet/history'),
      ]);
      setBalance(balanceRes.balance);
      setTransactions(historyRes);
    } catch (error) {
      console.error('Failed to load wallet', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallet();
  }, [user?.restaurantId]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawLoading(true);

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 100) {
      setWithdrawError('Minimum withdrawal amount is 100 THB');
      setWithdrawLoading(false);
      return;
    }

    if (amount > balance) {
      setWithdrawError('Insufficient balance');
      setWithdrawLoading(false);
      return;
    }

    try {
      await fetchApi('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, bankAccount }),
      });
      setIsModalOpen(false);
      setWithdrawAmount('');
      setBankAccount('');
      await loadWallet();
      alert('Withdrawal request submitted successfully');
    } catch (error: any) {
      setWithdrawError(error.message || 'Failed to request withdrawal');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading wallet...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-gray-500 mt-1">Manage your earnings and withdrawals</p>
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10"></div>
        <div className="absolute bottom-0 right-16 -mb-20 w-40 h-40 rounded-full bg-white opacity-10"></div>
        
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <p className="text-orange-100 font-medium mb-1">Available Balance</p>
            <h2 className="text-5xl font-extrabold tracking-tight">฿{balance.toFixed(2)}</h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-orange-600 px-6 py-3 rounded-lg font-bold hover:bg-orange-50 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Withdraw Funds
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Transaction History</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {transactions.length === 0 ? (
            <p className="p-8 text-center text-gray-500">No transactions yet.</p>
          ) : (
            transactions.map((tx) => {
              const date = new Date(tx.createdAt);
              const isCredit = tx.type === 'CREDIT';
              
              return (
                <div key={tx.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${isCredit ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCredit ? "M7 11l5-5m0 0l5 5m-5-5v12" : "M17 13l-5 5m0 0l-5-5m5 5V6"} />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{tx.description}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className={`font-bold text-lg ${isCredit ? 'text-green-600' : 'text-gray-900'}`}>
                    {isCredit ? '+' : '-'}฿{Math.abs(tx.amount).toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Withdraw Funds</h3>
              <p className="text-gray-500 text-sm mt-1">Minimum withdrawal is 100 THB.</p>
            </div>
            
            <form onSubmit={handleWithdraw} className="p-6 space-y-4">
              {withdrawError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                  {withdrawError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (THB)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-medium">฿</span>
                  </div>
                  <input
                    type="number"
                    min="100"
                    step="0.01"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="block w-full pl-8 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-base font-medium"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">Available: ฿{balance.toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account Number</label>
                <input
                  type="text"
                  required
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-base"
                  placeholder="e.g. 123-4-56789-0"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {withdrawLoading ? 'Processing...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
