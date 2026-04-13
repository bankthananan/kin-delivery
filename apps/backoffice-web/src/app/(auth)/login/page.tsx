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
