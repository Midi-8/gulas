import React from 'react';
import { ManagedOrderItem } from '@/actions/order-management';
import { MessageSquareText } from 'lucide-react';

interface OrderItemsListProps {
  items: ManagedOrderItem[];
}

export function OrderItemsList({ items }: OrderItemsListProps) {
  return (
    <ul className="divide-y divide-zinc-200/50 dark:divide-zinc-800/70 py-1">
      {items.map((item) => {
        return (
          <li key={item.id} className="py-2.5 first:pt-1 last:pb-1">
            <div className="flex items-start gap-3">
              {/* Quantidade destacada em bloco quadrado de cozinha industrial */}
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800 text-amber-400 font-mono text-xs sm:text-sm font-black flex-shrink-0 shadow-2xs border border-zinc-700">
                {item.quantity}x
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                  {item.productName}
                </p>

                {item.notes && (
                  <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded-lg bg-amber-500/15 border border-amber-500/35 text-xs text-amber-900 dark:text-amber-300 font-semibold leading-tight">
                    <MessageSquareText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 text-[10px]">
                        Obs:
                      </strong>{' '}
                      {item.notes}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
