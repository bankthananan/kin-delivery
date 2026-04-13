'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, ShoppingBag, Menu as MenuIcon, Clock, Wallet, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { Toggle } from '@/components/ui/Toggle';
import { fetchApi } from '@/lib/api';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Orders Queue', href: '/orders', icon: ShoppingBag },
  { name: 'Menu Management', href: '/menu', icon: MenuIcon },
  { name: 'Order History', href: '/history', icon: Clock },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
    
    if (user.restaurantId) {
      fetchApi<{ isOpen: boolean }>(`/restaurants/${user.restaurantId}`)
        .then(res => setIsRestaurantOpen(res.isOpen))
        .catch(console.error);
    }
  }, [user, router]);

  const handleToggleStatus = async (checked: boolean) => {
    try {
      setIsRestaurantOpen(checked);
      await fetchApi('/restaurant/status', {
        method: 'PUT',
        body: JSON.stringify({ isOpen: checked }),
      });
    } catch (err) {
      console.error(err);
      setIsRestaurantOpen(!checked);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface-50 flex">
      <aside className={`bg-white border-r border-surface-200 flex-shrink-0 transition-all ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-surface-200">
          {isSidebarOpen && <span className="font-bold text-xl text-primary-500 truncate">Kin Delivery</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-surface-100 text-surface-600">
            <MenuIcon size={20} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-600 font-medium' 
                    : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
                }`}
                title={!isSidebarOpen ? item.name : undefined}
              >
                <item.icon size={20} className={isActive ? 'text-primary-500' : 'text-surface-400'} />
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-surface-200">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-danger hover:bg-red-50 transition-colors ${!isSidebarOpen ? 'justify-center' : ''}`}
            title={!isSidebarOpen ? 'Logout' : undefined}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-surface-200 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-surface-900 truncate max-w-md">{user.name || 'Restaurant Name'}</h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-surface-50 px-4 py-2 rounded-full border border-surface-200">
              <span className={`w-2.5 h-2.5 rounded-full ${isRestaurantOpen ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-surface-400'}`}></span>
              <span className="text-sm font-medium text-surface-700 w-20">
                {isRestaurantOpen ? 'Accepting' : 'Closed'}
              </span>
              <Toggle 
                checked={isRestaurantOpen} 
                onCheckedChange={handleToggleStatus} 
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
