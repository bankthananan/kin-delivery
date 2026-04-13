'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Badge } from '@/components/Badge';

const formatTHB = (n: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);

export default function RestaurantsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchApi<any[]>('/admin/restaurants')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const cols = [
    { header: 'Name', accessor: 'name' },
    { header: 'Status', accessor: (row: any) => <Badge variant={row.isOpen ? 'success' : 'error'}>{row.isOpen ? 'OPEN' : 'CLOSED'}</Badge> },
    { header: 'Rating', accessor: (row: any) => `${row.rating} / 5.0` },
    { header: 'Total Orders', accessor: 'totalOrders' },
    { header: 'Earnings', accessor: (row: any) => formatTHB(row.totalEarnings || 0) },
    { header: 'Location', accessor: 'location' },
  ];

  return (
    <div className="space-y-4">
      <div className="card-container">
        {loading ? <div className="p-8 text-center text-zinc-500">Loading...</div> : <DataTable columns={cols} data={data || []} />}
      </div>
    </div>
  );
}
