import React from 'react';
import { ManagedOrderItem } from '@/actions/order-management';
import { MessageSquareText } from 'lucide-react';

interface OrderItemsListProps {
  items: ManagedOrderItem[];
  isDarkMode?: boolean;
}

export function OrderItemsList({ items, isDarkMode = false }: OrderItemsListProps) {
  return (
    <ul
      className={`divide-y py-1 ${
        isDarkMode ? 'divide-zinc-800/70' : 'divide-[#E5DED6]'
      }`}
    >
      {items.map((item) => {
        return (
          <li key={item.id} className="py-2.5 first:pt-1 last:pb-1">
            <div className="flex items-start gap-3">
              {/* Quantidade destacada em bloco quadrado de cozinha industrial */}
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono text-xs sm:text-sm font-black flex-shrink-0 shadow-2xs border ${
                  isDarkMode
                    ? 'bg-zinc-800 text-amber-400 border-zinc-700'
                    : 'bg-[#5E4939] text-[#F5F4F1] border-[#4C392D]'
                }`}
              >
                {item.quantity}x
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm sm:text-base font-bold leading-snug ${
                    isDarkMode ? 'text-zinc-100' : 'text-[#35271F]'
                  }`}
                >
                  {item.productName}
                </p>

                {item.notes && (
                  <div
                    className={`mt-1.5 flex items-start gap-1.5 p-2 rounded-lg border text-xs font-semibold leading-tight ${
                      isDarkMode
                        ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}
                  >
                    <MessageSquareText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong
                        className={`font-black uppercase tracking-wider text-[10px] ${
                          isDarkMode ? 'text-amber-400' : 'text-amber-800'
                        }`}
                      >
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
