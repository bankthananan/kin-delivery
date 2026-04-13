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
