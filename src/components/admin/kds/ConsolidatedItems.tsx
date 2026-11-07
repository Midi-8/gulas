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
      className={`rounded-2xl border p-4 transition-colors ${
        isDarkMode
          ? 'border-zinc-800 bg-zinc-900'
          : 'border-zinc-200/80 bg-white'
      }`}
      aria-label="Artigos agrupados dos pedidos ativos na bancada"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
              isDarkMode
                ? 'bg-zinc-800 text-zinc-200'
                : 'bg-zinc-100 text-zinc-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2
              className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-white' : 'text-zinc-900'
              }`}
            >
              Na Bancada · Pratos Agrupados
            </h2>
            <p
              className={`text-[11px] ${
                isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              Soma de todos os artigos ativos em preparação
            </p>
          </div>
        </div>

        <span
          className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-semibold ${
            isDarkMode
              ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
              : 'bg-zinc-100 border-zinc-200 text-zinc-800'
          }`}
        >
          {consolidated.reduce((acc, curr) => acc + curr.quantity, 0)} un.
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {consolidated.map(({ name, quantity }) => (
          <span
            key={name}
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              isDarkMode
                ? 'bg-zinc-950/60 border-zinc-800 text-zinc-200'
                : 'bg-zinc-50 border-zinc-200/80 text-zinc-900'
            }`}
          >
            <span
              className={`rounded-md px-1.5 py-0.5 font-mono font-bold text-xs ${
                isDarkMode
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-900 text-white'
              }`}
            >
              {quantity}×
            </span>
            <span>{name}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
