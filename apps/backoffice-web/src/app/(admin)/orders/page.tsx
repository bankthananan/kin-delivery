'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/Badge';

const formatTHB = (n: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);

export default function OrdersPage() {
  const [data, setData] = useState<any>({ items: [], totalPages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchApi<any>(`/admin/orders?page=${page}&pageSize=10${status ? '&status='+status : ''}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, status]);

  const cols = [
    { header: 'Order#', accessor: (row: any) => row.id.slice(0, 8) },
    { header: 'Customer', accessor: (row: any) => row.customerName || 'Unknown' },
    { header: 'Restaurant', accessor: (row: any) => row.restaurantName || 'Unknown' },
    { header: 'Status', accessor: (row: any) => {
        let v: any = 'info';
        if (row.status === 'DELIVERED') v = 'success';
        if (row.status === 'CANCELLED') v = 'error';
        if (row.status === 'PENDING') v = 'warning';
        return <Badge variant={v}>{row.status}</Badge>;
    }},
    { header: 'Total', accessor: (row: any) => formatTHB(row.totalAmount || 0) },
    { header: 'Method', accessor: (row: any) => row.paymentMethod },
    { header: 'Date', accessor: (row: any) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-4">
      <div className="flex space-x-4 mb-4">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-base w-48">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="PREPARING">Preparing</option>
          <option value="READY">Ready</option>
          <option value="PICKED_UP">Picked Up</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      <div className="card-container">
        {loading ? <div className="p-8 text-center text-zinc-500">Loading...</div> : <DataTable columns={cols} data={data.items || []} />}
        <Pagination page={page} totalPages={data.totalPages || 1} onPageChange={setPage} />
      </div>
    </div>
  );
}
