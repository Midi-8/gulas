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
    <nav className="flex items-center gap-1.5 p-1 bg-[#EAE5DF] rounded-xl border border-[#E5DED6]">
      <Link
        href="/admin/orders"
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all relative ${
          isKdsActive
            ? 'bg-[#FFFFFF] text-[#35271F] shadow-xs'
            : 'text-[#4C453F] hover:text-[#35271F] hover:bg-[#F5F4F1]/60'
        }`}
      >
        <LayoutGrid className={`w-4 h-4 ${isKdsActive ? 'text-[#C09573]' : ''}`} />
        <span>Monitor KDS</span>
        {isKdsActive && (
          <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#C09573] rounded-full" />
        )}
      </Link>

      <Link
        href="/admin/orders/history"
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all relative ${
          isHistoryActive
            ? 'bg-[#FFFFFF] text-[#35271F] shadow-xs'
            : 'text-[#4C453F] hover:text-[#35271F] hover:bg-[#F5F4F1]/60'
        }`}
      >
        <History className={`w-4 h-4 ${isHistoryActive ? 'text-[#C09573]' : ''}`} />
        <span>Histórico</span>
        {isHistoryActive && (
          <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#C09573] rounded-full" />
        )}
      </Link>

      <Link
        href="/admin/analytics"
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all relative ${
          isAnalyticsActive
            ? 'bg-[#FFFFFF] text-[#35271F] shadow-xs'
            : 'text-[#4C453F] hover:text-[#35271F] hover:bg-[#F5F4F1]/60'
        }`}
      >
        <BarChart3 className={`w-4 h-4 ${isAnalyticsActive ? 'text-[#C09573]' : ''}`} />
        <span>Analytics</span>
        {isAnalyticsActive && (
          <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#C09573] rounded-full" />
        )}
      </Link>
    </nav>
  );
}
