'use client';

import { useMemo } from 'react';
import type { ManagedOrder } from '@/actions/order-management';

interface ConsolidatedItemsProps {
    orders: ManagedOrder[];
}

export default function ConsolidatedItems({ orders }: ConsolidatedItemsProps) {
    const consolidated = useMemo(() => {
        const counts: Record<string, number> = {};

        for (const order of orders) {
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
            className="rounded-2xl border border-[#E5DED6] bg-[#FFFFFF] p-4 shadow-xs"
            aria-label="Artigos agrupados dos pedidos ativos"
        >
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-black text-[#35271F]">
                        Artigos em preparação
                    </h2>
                    <p className="text-xs text-[#78716C]">
                        Quantidade total dos pedidos atualmente visíveis
                    </p>
                </div>

                <span className="rounded-lg bg-[#EAE5DF] border border-[#E5DED6] px-2.5 py-1 text-xs font-bold text-[#35271F]">
                    {consolidated.length}{' '}
                    {consolidated.length === 1 ? 'artigo' : 'artigos'}
                </span>
            </div>

            <div className="flex flex-wrap gap-2">
                {consolidated.map(({ name, quantity }) => (
                    <span
                        key={name}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F4F1] border border-[#E5DED6] px-3 py-1 text-xs font-bold text-[#35271F] sm:text-sm"
                    >
                        <span className="rounded-full bg-[#FFFFFF] border border-[#E5DED6] text-[#5E4939] px-2 py-0.5 text-xs font-mono font-black">
                            {quantity}×
                        </span>
                        <span>{name}</span>
                    </span>
                ))}
            </div>
        </section>
    );
}