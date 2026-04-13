'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatCard } from '@/components/StatCard';
import { Badge } from '@/components/Badge';

const formatTHB = (n: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);

export default function FinancesPage() {
  const [summary, setSummary] = useState<any>(null);
  const [txData, setTxData] = useState<any>({ items: [], totalPages: 1 });
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi<any>('/admin/finances/summary').then(setSummary).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchApi<any>(`/admin/finances/transactions?page=${page}&pageSize=10${type ? '&type='+type : ''}`)
      .then(setTxData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, type]);

  const cols = [
    { header: 'Type', accessor: (row: any) => <Badge variant={row.type === 'PAYOUT' ? 'warning' : 'success'}>{row.type}</Badge> },
    { header: 'Amount', accessor: (row: any) => formatTHB(row.amount || 0) },
    { header: 'Reference', accessor: 'reference' },
    { header: 'User', accessor: 'userEmail' },
    { header: 'Date', accessor: (row: any) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Revenue" value={formatTHB(summary.totalRevenue || 0)} />
          <StatCard title="Commission Earned" value={formatTHB(summary.commissionEarned || 0)} />
          <StatCard title="Total Payouts" value={formatTHB(summary.totalPayouts || 0)} />
          <StatCard title="Pending Payouts" value={formatTHB(summary.pendingPayouts || 0)} />
        </div>
      )}
      <div className="space-y-4">
        <div className="flex space-x-4 mb-4">
          <select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="input-base w-48">
            <option value="">All Transactions</option>
            <option value="ORDER_PAYMENT">Order Payment</option>
            <option value="COMMISSION">Commission</option>
            <option value="PAYOUT">Payout</option>
          </select>
        </div>
        <div className="card-container">
          {loading ? <div className="p-8 text-center text-zinc-500">Loading...</div> : <DataTable columns={cols} data={txData.items || []} />}
          <Pagination page={page} totalPages={txData.totalPages || 1} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
