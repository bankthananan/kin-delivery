'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/Badge';

export default function UsersPage() {
  const [data, setData] = useState<any>({ items: [], totalPages: 1 });
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchApi<any>(`/admin/users?page=${page}&pageSize=10${role ? '&role='+role : ''}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, role]);

  const cols = [
    { header: 'ID', accessor: (row: any) => row.id.slice(0, 8) },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Role', accessor: (row: any) => <Badge variant={row.role === 'ADMIN' ? 'error' : row.role === 'DRIVER' ? 'warning' : 'info'}>{row.role}</Badge> },
    { header: 'Created', accessor: (row: any) => new Date(row.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-4">
      <div className="flex space-x-4 mb-4">
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }} className="input-base w-48">
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customers</option>
          <option value="DRIVER">Drivers</option>
          <option value="RESTAURANT">Restaurants</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>
      <div className="card-container">
        {loading ? <div className="p-8 text-center text-zinc-500">Loading...</div> : <DataTable columns={cols} data={data.items || []} />}
        <Pagination page={page} totalPages={data.totalPages || 1} onPageChange={setPage} />
      </div>
    </div>
  );
}
