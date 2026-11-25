import React from 'react';
import { ManagedOrder } from '@/actions/order-management';
import { ValidNextStatus } from '@/lib/validations/order-management';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderItemsList } from './OrderItemsList';
import { OrderStatusActions } from './OrderStatusActions';
import { useOrderTimer } from '@/hooks/useOrderTimer';

interface OrderCardProps {
  order: ManagedOrder;
  isUpdating: boolean;
  isNew?: boolean;
  isDarkMode?: boolean;
  isOwner?: boolean;
  error?: string | null;
  onClearError?: () => void;
  onUpdateStatus: (orderId: string, nextStatus: ValidNextStatus) => Promise<void>;
  onPrintOrder?: (order: ManagedOrder) => void;
  onChangeTable?: (orderId: string, newTableNumber: number) => Promise<void>;
}

function getTimerBadgeClass(minutes: number): string {
  if (minutes < 10) {
    return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
  if (minutes < 20) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  return 'bg-rose-600 text-white border-rose-700 animate-pulse';
}

function formatTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-PT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderCard({
  order,
  isUpdating,
  isNew = false,
  isOwner = true,
  error,
  onClearError,
  onUpdateStatus,
  onPrintOrder,
  onChangeTable,
}: OrderCardProps) {
  const elapsedMinutes = useOrderTimer(order.createdAt);
  const timerBadgeClass = getTimerBadgeClass(elapsedMinutes);
  const isTakeAway = order.tableNumber === 0;

  const cardSurface = isNew
    ? 'border-2 border-amber-600 ring-2 ring-amber-500/30 shadow-md'
    : order.status === 'pending'
    ? 'border-2 border-amber-500 ring-2 ring-amber-400/20 shadow-sm hover:shadow-md'
    : order.status === 'accepted'
    ? 'border-2 border-zinc-800 shadow-sm hover:shadow-md'
    : order.status === 'preparing'
    ? 'border-2 border-orange-600 shadow-sm hover:shadow-md'
    : order.status === 'ready'
    ? 'border-2 border-emerald-600 shadow-sm hover:shadow-md'
    : 'border-2 border-zinc-300 shadow-xs hover:shadow-md';

  const headerTone = isNew
    ? 'bg-gradient-to-b from-amber-50/80 to-white'
    : order.status === 'pending'
    ? 'bg-gradient-to-b from-amber-50/60 to-white'
    : order.status === 'preparing'
    ? 'bg-gradient-to-b from-orange-50/50 to-white'
    : order.status === 'ready'
    ? 'bg-gradient-to-b from-emerald-50/60 to-white'
    : 'bg-gradient-to-b from-zinc-50 to-white';

  return (
    <article
      aria-labelledby={`order-card-title-${order.id}`}
      className={`rounded-2xl bg-white flex flex-col justify-between overflow-hidden transition-all ${cardSurface}`}
    >
      <div className={`p-4 sm:p-5 border-b border-zinc-200/80 ${headerTone}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                id={`order-card-title-${order.id}`}
                className="text-xl font-bold tracking-tight text-zinc-950 font-mono"
              >
                #{order.orderNumber}
              </h3>

              <div className="relative inline-flex items-center">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase tracking-wider ${
                    isTakeAway
                      ? 'bg-emerald-600 border-emerald-700 text-white'
                      : 'bg-zinc-900 border-zinc-900 text-white'
                  }`}
                >
                  {isTakeAway ? 'Take-Away' : `Mesa ${order.tableNumber}`}
                </span>

                {isOwner && onChangeTable && (
                  <select
                    aria-label={`Transferir pedido #${order.orderNumber} para outra mesa`}
                    title="Transferir pedido para outra mesa ou Take-Away"
                    value={order.tableNumber}
                    onChange={(e) => {
                      const nextTable = Number(e.target.value);
                      if (nextTable !== order.tableNumber) {
                        void onChangeTable(order.id, nextTable);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  >
                    <option value={0}>Take-Away</option>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        Mesa {num}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {isNew && (
                <span className="px-2.5 py-0.5 rounded-full border border-amber-600 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider">
                  NOVO
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 text-xs text-zinc-500 font-mono">
              <span>{formatTime(order.createdAt)}</span>
              {onPrintOrder && (
                <button
                  type="button"
                  onClick={() => onPrintOrder(order)}
                  title="Imprimir talão de cozinha (80mm)"
                  aria-label={`Imprimir talão do pedido ${order.orderNumber}`}
                  className="px-2.5 py-1 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-900 hover:border-zinc-900 text-zinc-700 hover:text-white text-[11px] font-sans font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  Imprimir
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold ${timerBadgeClass}`}
            >
              {elapsedMinutes} min
            </span>
            <OrderStatusBadge status={order.status} size="sm" />
          </div>
        </div>

        {order.customerNotes && (
          <div className="mt-3.5 p-3 rounded-xl border border-amber-200/90 bg-amber-50/90 text-xs font-medium text-amber-950 leading-relaxed">
            <span className="inline-block rounded-md bg-amber-700 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px] mr-2">
              Nota
            </span>
            <span className="whitespace-pre-line">{order.customerNotes}</span>
          </div>
        )}

        {error && (
          <div className="mt-3.5 p-3 rounded-xl border border-rose-200 bg-rose-50 flex items-center justify-between gap-2 text-xs text-rose-800 font-semibold">
            <span>{error}</span>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                aria-label="Dispensar aviso de erro"
                className="px-2.5 py-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-600 hover:border-rose-600 text-rose-700 hover:text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer shrink-0 transition-colors"
              >
                Dispensar
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-5 py-1.5 flex-1 bg-white">
        <OrderItemsList items={order.items} />
      </div>

      <div className="p-3.5 sm:p-4 border-t border-zinc-200/80 bg-zinc-50">
        <OrderStatusActions
          orderNumber={order.orderNumber}
          tableNumber={order.tableNumber}
          status={order.status}
          isUpdating={isUpdating}
          isOwner={isOwner}
          onUpdateStatus={(nextStatus) => onUpdateStatus(order.id, nextStatus)}
        />
      </div>
    </article>
  );
}
