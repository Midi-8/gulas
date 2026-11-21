'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ManagedOrderItem } from '@/actions/order-management';

interface OrderItemsListProps {
  items: ManagedOrderItem[];
  isDarkMode?: boolean;
}

const PLATED_ITEMS_STORAGE_KEY = 'gulas_kds_plated_items_v1';
const PLATED_ITEMS_TTL_MS = 12 * 60 * 60 * 1000;
const PLATED_SYNC_EVENT = 'gulas_kds_plated_sync';

function readPlatedItemsMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PLATED_ITEMS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const now = Date.now();
    const cleaned: Record<string, number> = {};
    for (const [id, timestamp] of Object.entries(parsed)) {
      if (
        typeof timestamp === 'number' &&
        now - timestamp < PLATED_ITEMS_TTL_MS
      ) {
        cleaned[id] = timestamp;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function writePlatedItemsMap(map: Record<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLATED_ITEMS_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(PLATED_SYNC_EVENT));
  } catch {
    // Ignore storage quota / privacy errors
  }
}

export function OrderItemsList({ items }: OrderItemsListProps) {
  const [checkedItemIds, setCheckedItemIds] = useState<Record<string, number>>(
    {}
  );

  useEffect(() => {
    queueMicrotask(() => {
      setCheckedItemIds(readPlatedItemsMap());
    });

    const handleSync = () => {
      setCheckedItemIds(readPlatedItemsMap());
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === PLATED_ITEMS_STORAGE_KEY) {
        handleSync();
      }
    };

    window.addEventListener(PLATED_SYNC_EVENT, handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(PLATED_SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const toggleItemChecked = useCallback((itemId: string) => {
    const current = readPlatedItemsMap();
    const next = { ...current };
    if (next[itemId]) {
      delete next[itemId];
    } else {
      next[itemId] = Date.now();
    }
    writePlatedItemsMap(next);
    setCheckedItemIds(next);
  }, []);

  if (!items || items.length === 0) {
    return (
      <p className="py-3 text-xs text-zinc-500">Sem artigos registados.</p>
    );
  }

  return (
    <ul className="space-y-2 py-3">
      {items.map((item) => {
        const isChecked = Boolean(checkedItemIds[item.id]);

        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => toggleItemChecked(item.id)}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                isChecked
                  ? 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100/70'
                  : 'bg-zinc-50 border-zinc-200/80 hover:bg-zinc-100/80 hover:border-zinc-300'
              }`}
              aria-pressed={isChecked}
            >
              <span
                className={`inline-flex items-center justify-center min-w-8 h-7 px-2 rounded-lg border font-mono text-xs font-bold shrink-0 transition-colors ${
                  isChecked
                    ? 'bg-emerald-600 border-emerald-700 text-white uppercase tracking-wider text-[10px]'
                    : 'bg-zinc-900 border-zinc-900 text-white'
                }`}
              >
                {isChecked ? 'OK' : `${item.quantity}x`}
              </span>

              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={`text-sm font-semibold leading-snug ${
                    isChecked
                      ? 'line-through text-zinc-400'
                      : 'text-zinc-900'
                  }`}
                >
                  {item.productName}
                </p>

                {item.notes && (
                  <div className="mt-2 p-2.5 rounded-xl border border-amber-200/90 bg-amber-50/90 text-amber-950 text-xs font-medium leading-snug">
                    <span className="inline-block rounded-md bg-amber-700 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px] mr-2">
                      Obs
                    </span>
                    <span className="whitespace-pre-line">{item.notes}</span>
                  </div>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
