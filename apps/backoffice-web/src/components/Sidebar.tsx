import Link from 'next/link';

const nav = [
  { name: 'Dashboard', href: '/' },
  { name: 'Orders', href: '/orders' },
  { name: 'Users', href: '/users' },
  { name: 'Restaurants', href: '/restaurants' },
  { name: 'Drivers', href: '/drivers' },
  { name: 'Finances', href: '/finances' },
  { name: 'Config', href: '/config' },
];

export function Sidebar({ currentPath }: { currentPath: string }) {
  return (
    <div className="flex flex-col w-64 border-r border-zinc-200 bg-zinc-50 min-h-screen">
      <div className="flex items-center h-16 px-6 border-b border-zinc-200 font-bold text-zinc-900 tracking-tight">Kin Delivery Admin</div>
      <div className="flex flex-col flex-1 py-4">
        <nav className="flex-1 px-4 space-y-1">
          {nav.map(item => {
            const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
            return (
              <Link key={item.name} href={item.href} className={`flex items-center px-2 py-2 text-sm font-medium rounded-md ${isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
