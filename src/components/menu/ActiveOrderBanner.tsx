'use client';

import React from 'react';
import { useActiveOrderTracker } from '@/hooks/useActiveOrderTracker';
import { useCart } from '@/context/CartContext';
import {
  ChefHat,
  Clock,
  UtensilsCrossed,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';

const subscribeStorage = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('gulas_active_order_created', callback);
  window.addEventListener('gulas_order_status_update', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('gulas_active_order_created', callback);
    window.removeEventListener('gulas_order_status_update', callback);
  };
};

const EMPTY_ORDER_IDS: string[] = [];
const getServerSnapshot = () => EMPTY_ORDER_IDS;

let cachedRawValue: string | null = null;
let cachedParsedIds: string[] = EMPTY_ORDER_IDS;

const getStoredOrderIds = (): string[] => {
  if (typeof window === 'undefined') return EMPTY_ORDER_IDS;

  try {
    const raw =
      localStorage.getItem('gulas_active_order_ids') ||
      localStorage.getItem('gulas_active_order_id');
    if (!raw) {
      cachedRawValue = null;
      cachedParsedIds = EMPTY_ORDER_IDS;
      return EMPTY_ORDER_IDS;
    }

    if (raw === cachedRawValue) {
      return cachedParsedIds;
    }

    cachedRawValue = raw;
    if (raw.startsWith('[')) {
      const parsed = JSON.parse(raw);
      cachedParsedIds = Array.isArray(parsed) ? parsed : EMPTY_ORDER_IDS;
    } else {
      cachedParsedIds = [raw];
    }
    return cachedParsedIds;
  } catch {
    return EMPTY_ORDER_IDS;
  }
};

const emptySubscribe = () => () => {};

export const ActiveOrderBanner: React.FC = () => {
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const {
    activeOrders,
    status,
    completionNotice,
    openDetailModal,
  } = useActiveOrderTracker();
  const { itemCount, selectedTableNumber } = useCart();

  React.useSyncExternalStore(
    subscribeStorage,
    getStoredOrderIds,
    getServerSnapshot
  );

  if (!isClient) {
    return null;
  }

  if (activeOrders.length === 0 && !completionNotice) {
    return null;
  }

  if (completionNotice) {
    return (
      <aside
        aria-label="Aviso de conclusão de pedido"
        className={`fixed left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-3 ${
          itemCount > 0 ? 'bottom-20' : 'bottom-4'
        }`}
      >
        <div className="w-full pointer-events-auto">
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white border border-zinc-200 shadow-lg text-zinc-900">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-zinc-900 truncate">
                {completionNotice}
              </p>
            </div>
            <button
              onClick={() => openDetailModal()}
              className="text-[11px] font-semibold text-zinc-900 hover:text-zinc-600 underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Ver
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const ordersCount = activeOrders.length;
  const isMultiOrder = ordersCount > 1;

  const hasReady = activeOrders.some((o) => o.status === 'ready');
  const hasPreparing = activeOrders.some((o) => o.status === 'preparing');
  const primaryOrder =
    activeOrders.find((o) => o.status === 'ready') ||
    activeOrders.find((o) => o.status === 'preparing') ||
    activeOrders[activeOrders.length - 1] ||
    null;

  if (!primaryOrder) {
    return null;
  }

  const currentStatus =
    hasReady
      ? 'ready'
      : hasPreparing
      ? 'preparing'
      : status || primaryOrder?.status || 'pending';

  let statusText = 'Pedido registado na cozinha';
  let StatusIcon = isMultiOrder ? Layers : Clock;
  let isPulsing = true;

  switch (currentStatus) {
    case 'pending':
    case 'accepted':
      statusText = isMultiOrder
        ? 'Pedidos registados na cozinha'
        : 'Pedido registado na cozinha';
      StatusIcon = isMultiOrder ? Layers : Clock;
      isPulsing = true;
      break;
    case 'preparing':
      statusText = isMultiOrder
        ? 'A preparar pedidos na cozinha'
        : 'A preparar na cozinha';
      StatusIcon = ChefHat;
      isPulsing = true;
      break;
    case 'ready':
      statusText = isMultiOrder
        ? 'Pedido pronto • A caminho / Balcão'
        : 'Pronto • A caminho / Balcão';
      StatusIcon = UtensilsCrossed;
      isPulsing = true;
      break;
    case 'completed':
      statusText = 'Entregue • Bom apetite!';
      StatusIcon = CheckCircle2;
      isPulsing = false;
      break;
    case 'cancelled':
      statusText = 'Pedido cancelado';
      StatusIcon = XCircle;
      isPulsing = false;
      break;
  }

  const tableLabel =
    primaryOrder?.tableNumber === 0
      ? 'Take-Away'
      : primaryOrder?.tableName ||
        (primaryOrder?.tableNumber ? `Mesa ${primaryOrder.tableNumber}` : '') ||
        (selectedTableNumber === 0
          ? 'Take-Away'
          : selectedTableNumber
          ? `Mesa ${selectedTableNumber}`
          : 'O teu pedido');

  return (
    <aside
      aria-label="Acompanhamento do pedido ativo"
      className={`fixed left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-3 ${
        itemCount > 0 ? 'bottom-20' : 'bottom-4'
      }`}
    >
      <div className="w-full pointer-events-auto">
        <button
          onClick={() => openDetailModal()}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white hover:bg-zinc-50 border border-zinc-200 shadow-lg text-zinc-900 transition-all cursor-pointer group active:scale-[0.99]"
          aria-label="Acompanhar estado dos pedidos em tempo real"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white">
                <StatusIcon className="w-4 h-4 text-white" />
              </div>
              {isPulsing && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      currentStatus === 'ready' ? 'bg-emerald-500' : 'bg-zinc-600'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      currentStatus === 'ready' ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                  />
                </span>
              )}
            </div>

            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-semibold text-xs text-zinc-900">
                  {tableLabel}
                </span>
                <span className="text-xs text-zinc-300">·</span>
                {isMultiOrder ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 truncate">
                    <span>{ordersCount} Pedidos ativos</span>
                  </span>
                ) : (
                  <span className="text-xs font-medium text-zinc-600 truncate">
                    {statusText}
                  </span>
                )}
              </div>

              <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                {isMultiOrder
                  ? statusText
                  : primaryOrder?.orderNumber
                  ? `Pedido #${primaryOrder.orderNumber}`
                  : `Pedido #${primaryOrder.id.replace('ord_', '').slice(0, 6)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-zinc-900 group-hover:text-zinc-600 shrink-0 text-xs font-semibold">
            <span className="underline underline-offset-2 text-[11px]">
              Estado
            </span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      </div>
    </aside>
  );
};
