'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminNavProps {
  isOwner?: boolean;
}

export function AdminNav({ isOwner = false }: AdminNavProps) {
  const pathname = usePathname();

  if (!isOwner) {
    return (
      <div className="inline-flex items-center justify-center px-4 py-2 bg-white border border-zinc-200/90 shadow-xs rounded-2xl">
        <h1 className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900 uppercase font-mono">
          Monitor de Pedidos
        </h1>
      </div>
    );
  }

  const isKdsActive = pathname === '/admin/orders';
  const isHistoryActive = pathname.startsWith('/admin/orders/history');
  const isAnalyticsActive = pathname.startsWith('/admin/analytics');
  const isManagementActive = pathname.startsWith('/admin/management');

  const navItems = [
    { href: '/admin/orders', label: 'Monitor', active: isKdsActive },
    { href: '/admin/orders/history', label: 'Histórico', active: isHistoryActive },
    { href: '/admin/analytics', label: 'Análise', active: isAnalyticsActive },
    { href: '/admin/management', label: 'Gestão', active: isManagementActive },
  ];

  return (
    <nav
      aria-label="Navegação de Administração"
      className="inline-flex items-center justify-center gap-1.5 sm:gap-3 bg-white border border-zinc-200/90 shadow-xs p-1.5 rounded-2xl"
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`inline-flex items-center justify-center text-center px-4 sm:px-6 py-2 text-xs font-semibold tracking-wide transition-all rounded-xl whitespace-nowrap ${
            item.active
              ? 'bg-zinc-900 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
