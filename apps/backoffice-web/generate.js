const fs = require('fs');
const path = require('path');

function write(p, content) {
  const fullPath = path.join(__dirname, p);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n');
}

write('src/app/(auth)/login/page.tsx', `
'use client';
import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuth(s => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.user?.role !== 'ADMIN') {
        throw new Error('Access denied. Admin only.');
      }
      setAuth(res.user, res.accessToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-50">
      <div className="w-full max-w-md p-8 bg-white border border-zinc-200 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-center text-zinc-900">Admin Portal</h1>
        <p className="mt-2 text-sm text-center text-zinc-500">Sign in to Kin Delivery backoffice</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && <div className="p-3 text-sm text-red-800 bg-red-50 rounded">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-zinc-700">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-base mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-base mt-1" />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
`);

write('src/app/(admin)/layout.tsx', `
'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/store/auth';
import { Sidebar } from '@/components/Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, logout, user } = useAuth();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <Sidebar currentPath={pathname} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200">
          <h2 className="text-lg font-semibold text-zinc-800 capitalize">{pathname === '/' ? 'Dashboard' : pathname.replace('/', '')}</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-zinc-500">{user?.email || 'admin@kindelivery.com'}</span>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-sm text-zinc-500 hover:text-zinc-900">Sign out</button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
`);

write('src/app/(admin)/page.tsx', `
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
`);

write('src/app/(admin)/orders/page.tsx', `
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
    fetchApi<any>(\`/admin/orders?page=\${page}&pageSize=10\${status ? '&status='+status : ''}\`)
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
`);

write('src/app/(admin)/users/page.tsx', `
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
    fetchApi<any>(\`/admin/users?page=\${page}&pageSize=10\${role ? '&role='+role : ''}\`)
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
`);

write('src/app/(admin)/restaurants/page.tsx', `
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
    { header: 'Rating', accessor: (row: any) => \`\${row.rating} / 5.0\` },
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
`);

write('src/app/(admin)/drivers/page.tsx', `
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
    { header: 'Rating', accessor: (row: any) => \`\${row.rating} / 5.0\` },
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
`);

write('src/app/(admin)/finances/page.tsx', `
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
    fetchApi<any>(\`/admin/finances/transactions?page=\${page}&pageSize=10\${type ? '&type='+type : ''}\`)
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
`);

write('src/app/(admin)/config/page.tsx', `
'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function ConfigPage() {
  const [config, setConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchApi<any[]>('/admin/config')
      .then(setConfig)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: string) => {
    setConfig(prev => prev.map(c => c.key === key ? { ...c, value } : c));
  };

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    setMessage('');
    try {
      await fetchApi('/admin/config', {
        method: 'PUT',
        body: JSON.stringify({ key, value }),
      });
      setMessage(\`Successfully updated \${key}\`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(\`Error: \${err.message}\`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading config...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      {message && (
        <div className={\`p-4 rounded text-sm \${message.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}\`}>
          {message}
        </div>
      )}
      <div className="card-container p-6">
        <h3 className="text-lg font-medium text-zinc-900 mb-6">Platform Settings</h3>
        <div className="space-y-6">
          {config.map((item) => (
            <div key={item.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-100 pb-4 last:border-0 last:pb-0">
              <div className="w-1/2 pr-4">
                <label className="block text-sm font-medium text-zinc-700">{item.key.replace(/_/g, ' ').toUpperCase()}</label>
              </div>
              <div className="flex flex-1 items-center space-x-4 mt-2 sm:mt-0">
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  className="input-base flex-1"
                />
                <button
                  onClick={() => handleSave(item.key, item.value)}
                  disabled={saving}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
          {config.length === 0 && (
            <div className="text-center text-zinc-500 py-4">No configuration keys found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
`);
