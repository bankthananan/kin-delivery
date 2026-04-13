'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { StatCard } from '@/components/StatCard';

const formatTHB = (n: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<any>('/admin/dashboard').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!data) return <div className="p-4 text-red-500 bg-red-50 rounded">Error loading dashboard metrics</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Orders" value={data.todayOrders || 0} />
        <StatCard title="Today's Revenue" value={formatTHB(data.todayRevenue || 0)} />
        <StatCard title="Active Drivers" value={data.activeDrivers || 0} />
        <StatCard title="Active Restaurants" value={data.activeRestaurants || 0} />
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <StatCard title="Total Customers" value={data.totalCustomers || 0} />
        <StatCard title="Total Orders (All-time)" value={data.totalOrders || 0} />
      </div>
    </div>
  );
}
