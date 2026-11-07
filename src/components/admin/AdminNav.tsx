'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, History, BarChart3 } from 'lucide-react';

export function AdminNav() {
  const pathname = usePathname();

  const isKdsActive = pathname === '/admin/orders';
  const isHistoryActive = pathname.startsWith('/admin/orders/history');
  const isAnalyticsActive = pathname.startsWith('/admin/analytics');

  return (
    <nav className="flex items-center gap-1 p-1 bg-zinc-100 rounded-xl border border-zinc-200/80">
      <Link
        href="/admin/orders"
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isKdsActive
            ? 'bg-zinc-900 text-white shadow-2xs'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/70'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>Monitor KDS</span>
      </Link>

      <Link
        href="/admin/orders/history"
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isHistoryActive
            ? 'bg-zinc-900 text-white shadow-2xs'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/70'
        }`}
      >
        <History className="w-3.5 h-3.5" />
        <span>Histórico</span>
      </Link>

      <Link
        href="/admin/analytics"
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          isAnalyticsActive
            ? 'bg-zinc-900 text-white shadow-2xs'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/70'
        }`}
      >
        <BarChart3 className="w-3.5 h-3.5" />
        <span>Analytics</span>
      </Link>
    </nav>
  );
}
