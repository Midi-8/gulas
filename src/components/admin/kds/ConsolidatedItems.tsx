'use client';

import { useMemo } from 'react';
import type { ManagedOrder } from '@/actions/order-management';
import { Flame } from 'lucide-react';

interface ConsolidatedItemsProps {
  orders: ManagedOrder[];
}

export default function ConsolidatedItems({ orders }: ConsolidatedItemsProps) {
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
      className="rounded-2xl border border-[#2A313E] bg-[#161922] p-4 shadow-xs"
      aria-label="Artigos agrupados dos pedidos ativos na bancada"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/15 flex items-center justify-center text-amber-400">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              Na Bancada (Itens Agrupados)
            </h2>
            <p className="text-[11px] text-zinc-400">
              Soma de todos os pratos atualmente a confecionar
            </p>
          </div>
        </div>

        <span className="rounded-lg bg-[#262B35] border border-[#343B48] px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
          {consolidated.reduce((acc, curr) => acc + curr.quantity, 0)} total
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {consolidated.map(({ name, quantity }) => (
          <span
            key={name}
            className="inline-flex items-center gap-2 rounded-xl bg-[#202530] border border-[#2D3545] px-3 py-1.5 text-xs font-bold text-zinc-200"
          >
            <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 font-mono font-black text-xs">
              {quantity}x
            </span>
            <span>{name}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
