'use client';

import { useMemo } from 'react';
import type { ManagedOrder } from '@/actions/order-management';
import { Flame } from 'lucide-react';

interface ConsolidatedItemsProps {
  orders: ManagedOrder[];
  isDarkMode?: boolean;
}

export default function ConsolidatedItems({
  orders,
  isDarkMode = true,
}: ConsolidatedItemsProps) {
  const consolidated = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const order of orders) {
      if (order.status === 'completed' || order.status === 'cancelled') continue;

      for (const item of order.items ?? []) {
        const name = item.productName || 'Artigo sem nome';
        counts[name] = (counts[name] ?? 0) + item.quantity;
      }
    }

    return Object.entries(counts)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => {
        if (b.quantity !== a.quantity) {
          return b.quantity - a.quantity;
        }
        return a.name.localeCompare(b.name, 'pt-PT');
      });
  }, [orders]);

  if (consolidated.length === 0) {
    return null;
  }

  return (
    <section
      className={`rounded-2xl border p-4 shadow-xs transition-colors ${
        isDarkMode
          ? 'border-[#2A313E] bg-[#161922]'
          : 'border-[#E5DED6] bg-[#FFFFFF]'
      }`}
      aria-label="Artigos agrupados dos pedidos ativos na bancada"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-md flex items-center justify-center ${
              isDarkMode
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-[#EAE5DF] text-[#5E4939]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2
              className={`text-xs sm:text-sm font-black uppercase tracking-wider ${
                isDarkMode ? 'text-white' : 'text-[#35271F]'
              }`}
            >
              Na Bancada (Itens Agrupados)
            </h2>
            <p
              className={`text-[11px] ${
                isDarkMode ? 'text-zinc-400' : 'text-[#78716C]'
              }`}
            >
              Soma de todos os pratos atualmente a confecionar
            </p>
          </div>
        </div>

        <span
          className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-bold ${
            isDarkMode
              ? 'bg-[#262B35] border-[#343B48] text-amber-400'
              : 'bg-[#F5F4F1] border-[#E5DED6] text-[#5E4939]'
          }`}
        >
          {consolidated.reduce((acc, curr) => acc + curr.quantity, 0)} total
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {consolidated.map(({ name, quantity }) => (
          <span
            key={name}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold ${
              isDarkMode
                ? 'bg-[#202530] border-[#2D3545] text-zinc-200'
                : 'bg-[#F5F4F1] border-[#E5DED6] text-[#35271F]'
            }`}
          >
            <span
              className={`rounded-md border px-2 py-0.5 font-mono font-black text-xs ${
                isDarkMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-[#5E4939] text-[#F5F4F1] border-[#4C392D]'
              }`}
            >
              {quantity}x
            </span>
            <span>{name}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
