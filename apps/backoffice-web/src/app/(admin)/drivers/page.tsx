'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/Badge';

const formatTHB = (n: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);

export default function DriversPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchApi<any[]>('/admin/drivers')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { header: 'Name/Email', accessor: (row: any) => <div className="flex flex-col"><span>{row.name}</span><span className="text-xs text-zinc-500">{row.email}</span></div> },
    { header: 'Status', accessor: (row: any) => <Badge variant={row.isOnline ? 'success' : 'warning'}>{row.isOnline ? 'ONLINE' : 'OFFLINE'}</Badge> },
    { header: 'Rating', accessor: (row: any) => `${row.rating} / 5.0` },
    { header: 'Active Orders', accessor: 'activeOrders' },
    { header: 'Earnings', accessor: (row: any) => formatTHB(row.totalEarnings || 0) },
    { header: 'Deliveries', accessor: 'totalDeliveries' },
  ];

  return (
    <div className="space-y-4">
      <div className="card-container">
        {loading ? <div className="p-8 text-center text-zinc-500">Loading...</div> : <DataTable columns={cols} data={data || []} />}
      </div>
    </div>
  );
}
