'use client';

import { useMemo } from 'react';
import type { ManagedOrder } from '@/actions/order-management';

interface ConsolidatedItemsProps {
  orders: ManagedOrder[];
  isDarkMode?: boolean;
}

export default function ConsolidatedItems({
  orders,
}: ConsolidatedItemsProps) {
  const consolidated = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const order of orders) {
      if (order.status === 'completed' || order.status === 'cancelled') {
        continue;
      }

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

  const totalUnits = consolidated.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <section
      aria-label="Artigos agrupados dos pedidos ativos na bancada"
      className="rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-xs"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-zinc-950">
            Na Bancada · Pratos Agrupados
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Soma de todos os artigos ativos em preparação
          </p>
        </div>

        <span className="rounded-xl border border-zinc-200 bg-zinc-100 px-3.5 py-1.5 text-xs font-mono font-bold text-zinc-900 shrink-0">
          {totalUnits} un.
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {consolidated.map(({ name, quantity }) => (
          <div
            key={name}
            className="inline-flex items-center gap-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-900"
          >
            <span className="rounded-lg bg-zinc-900 text-white px-2 py-0.5 font-mono font-bold text-xs">
              {quantity}x
            </span>
            <span>{name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
