'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface DashboardStats {
  todayOrders: number;
  revenue: number;
  pendingOrders: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({ todayOrders: 0, revenue: 0, pendingOrders: 0 });
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.restaurantId) return;

    const loadDashboard = async () => {
      try {
        const [statsData, restaurantData] = await Promise.all([
          fetchApi<DashboardStats>(`/restaurants/${user.restaurantId}/stats`),
          fetchApi<{ isOpen: boolean }>(`/restaurants/${user.restaurantId}`),
        ]);
        setStats(statsData);
        setIsOpen(restaurantData.isOpen);
      } catch (error) {
        console.error('Failed to load dashboard', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user?.restaurantId]);

  const toggleStatus = async () => {
    try {
      const newStatus = !isOpen;
      setIsOpen(newStatus);
      await fetchApi('/restaurant/status', {
        method: 'PUT',
        body: JSON.stringify({ isOpen: newStatus }),
      });
    } catch (error) {
      console.error('Failed to toggle status', error);
      setIsOpen(isOpen);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Restaurant Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your daily performance</p>
      </div>

      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Restaurant Status</h2>
          <p className="text-sm text-gray-500 mt-1">Toggle to start or stop accepting orders</p>
        </div>
        <button
          onClick={toggleStatus}
          className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
            isOpen ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          <span className="sr-only">Toggle restaurant status</span>
          <span
            className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform ${
              isOpen ? 'translate-x-13' : 'translate-x-1'
            }`}
            style={{ transform: `translateX(${isOpen ? '48px' : '4px'})` }}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Today's Orders</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Today's Revenue</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">฿{stats.revenue.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500">Pending Orders</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{stats.pendingOrders}</p>
        </div>
      </div>
    </div>
  );
}
