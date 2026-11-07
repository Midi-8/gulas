'use client';

import React, { useState } from 'react';
import { ManagedOrderItem } from '@/actions/order-management';
import { MessageSquareText, Check } from 'lucide-react';

interface OrderItemsListProps {
  items: ManagedOrderItem[];
  isDarkMode?: boolean;
}

export function OrderItemsList({ items, isDarkMode = false }: OrderItemsListProps) {
  const [checkedItemIds, setCheckedItemIds] = useState<Record<string, boolean>>({});

  const toggleItemChecked = (itemId: string) => {
    setCheckedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  return (
    <ul
      className={`divide-y py-1 ${
        isDarkMode ? 'divide-zinc-800/70' : 'divide-zinc-100'
      }`}
    >
      {items.map((item) => {
        const isChecked = Boolean(checkedItemIds[item.id]);

        return (
          <li
            key={item.id}
            onClick={() => toggleItemChecked(item.id)}
            className="py-2.5 first:pt-1 last:pb-1 cursor-pointer select-none group"
            title="Clica para marcar/desmarcar artigo como empratado"
          >
            <div className="flex items-start gap-2.5">
              {/* Quantidade / Checkbox interativa de empratamento */}
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono text-xs font-bold flex-shrink-0 border transition-colors ${
                  isChecked
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : isDarkMode
                    ? 'bg-zinc-800 text-zinc-100 border-zinc-700 group-hover:border-zinc-500'
                    : 'bg-zinc-900 text-white border-zinc-900 group-hover:bg-zinc-800'
                }`}
              >
                {isChecked ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : `${item.quantity}×`}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold leading-snug transition-opacity ${
                    isChecked
                      ? isDarkMode
                        ? 'line-through text-zinc-500'
                        : 'line-through text-zinc-400'
                      : isDarkMode
                      ? 'text-zinc-100'
                      : 'text-zinc-900'
                  }`}
                >
                  {item.productName}
                </p>

                {item.notes && (
                  <div
                    className={`mt-1.5 flex items-start gap-1.5 p-2 rounded-lg border text-xs font-medium leading-tight ${
                      isDarkMode
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-amber-50/80 border-amber-200 text-amber-900'
                    }`}
                  >
                    <MessageSquareText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong
                        className={`font-bold uppercase tracking-wider text-[10px] ${
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
