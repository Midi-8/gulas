import React from 'react';
import { ManagedOrder } from '@/actions/order-management';
import { ValidNextStatus } from '@/lib/validations/order-management';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderItemsList } from './OrderItemsList';
import { OrderStatusActions } from './OrderStatusActions';
import {
  Clock,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  X,
  Timer,
  ShoppingBag,
  Printer,
} from 'lucide-react';
import { useOrderTimer } from '@/hooks/useOrderTimer';

interface OrderCardProps {
  order: ManagedOrder;
  isUpdating: boolean;
  isNew?: boolean;
  isDarkMode?: boolean;
  error?: string | null;
  onClearError?: () => void;
  onUpdateStatus: (orderId: string, nextStatus: ValidNextStatus) => Promise<void>;
  onPrintOrder?: (order: ManagedOrder) => void;
}

function getTimerStyles(minutes: number, isDarkMode: boolean) {
  if (minutes < 10) {
    return {
      badge: isDarkMode
        ? 'bg-zinc-800/80 text-zinc-300 border-zinc-700'
        : 'bg-zinc-100 text-zinc-600 border-zinc-200',
    };
  }
  if (minutes < 20) {
    return {
      badge: isDarkMode
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  return {
    badge: isDarkMode
      ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
      : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse',
  };
}

export function OrderCard({
  order,
  isUpdating,
  isNew,
  isDarkMode = true,
  error,
  onClearError,
  onUpdateStatus,
  onPrintOrder,
}: OrderCardProps) {
  const elapsedMinutes = useOrderTimer(order.createdAt);
  const timerStyles = getTimerStyles(elapsedMinutes, isDarkMode);

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-PT', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return '';
    }
  };

  return (
    <article
      aria-labelledby={`order-card-title-${order.id}`}
      className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
        isDarkMode
          ? isNew
            ? 'bg-zinc-900 border-amber-500/60 ring-2 ring-amber-500/30 animate-in fade-in zoom-in-98 duration-300'
            : order.status === 'pending'
            ? 'bg-zinc-900 border-amber-500/40'
            : order.status === 'ready'
            ? 'bg-zinc-900 border-emerald-500/40'
            : 'bg-zinc-900 border-zinc-800'
          : isNew
          ? 'bg-white border-amber-400 ring-2 ring-amber-400/25 animate-in fade-in zoom-in-98 duration-300'
          : order.status === 'pending'
          ? 'bg-white border-amber-300'
          : order.status === 'ready'
          ? 'bg-white border-emerald-300'
          : 'bg-white border-zinc-200/80'
      }`}
    >
      {/* Top Card Header */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                id={`order-card-title-${order.id}`}
                className={`text-2xl sm:text-3xl font-bold font-mono tracking-tight leading-none ${
                  isDarkMode ? 'text-white' : 'text-zinc-900'
                }`}
              >
                #{order.orderNumber}
              </span>

              {order.tableNumber === 0 ? (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                    isDarkMode
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Take-Away
                </span>
              ) : (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                    isDarkMode
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      : 'bg-zinc-900 text-white border-zinc-900'
                  }`}
                >
                  Mesa {order.tableNumber}
                </span>
              )}

              {isNew && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 text-xs font-bold border border-amber-500/30 animate-pulse">
                  <Sparkles className="w-3 h-3" />
                  NOVO
                </span>
              )}
            </div>

            <div
              className={`flex items-center gap-1.5 text-xs font-medium mt-1.5 ${
                isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(order.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              {onPrintOrder && (
                <button
                  type="button"
                  onClick={() => onPrintOrder(order)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900'
                  }`}
                  title="Imprimir talão de cozinha (80mm)"
                  aria-label={`Imprimir talão do pedido ${order.orderNumber}`}
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              )}

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold ${timerStyles.badge}`}
                title="Tempo decorrido desde a receção do pedido"
              >
                <Timer className="w-3.5 h-3.5" />
                {elapsedMinutes} min
              </span>
            </div>

            <OrderStatusBadge status={order.status} size="sm" />
          </div>
        </div>

        {/* Customer General Notes */}
        {order.customerNotes && (
          <div
            className={`mt-3 p-2.5 rounded-xl border flex items-start gap-2 text-xs font-medium leading-relaxed ${
              isDarkMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-amber-50/80 border-amber-200 text-amber-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong
                className={`font-bold uppercase text-[10px] tracking-wider block ${
                  isDarkMode ? 'text-amber-400' : 'text-amber-800'
                }`}
              >
                Observação do cliente:
              </strong>
              <span className="whitespace-pre-line">{order.customerNotes}</span>
            </div>
          </div>
        )}

        {/* Card Error Notification */}
        {error && (
          <div
            role="alert"
            className="mt-2.5 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between gap-2 text-xs text-rose-500 font-medium"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="p-0.5 rounded transition-colors cursor-pointer"
                aria-label="Dispensar aviso de erro"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Middle: Items List */}
      <div
        className={`px-4 sm:px-5 py-2 border-t flex-1 ${
          isDarkMode ? 'border-zinc-800' : 'border-zinc-100'
        }`}
      >
        <OrderItemsList items={order.items} isDarkMode={isDarkMode} />
      </div>

      {/* Bottom Footer: Action Button */}
      <div
        className={`p-3 sm:p-4 rounded-b-2xl border-t ${
          isDarkMode
            ? 'bg-zinc-950/60 border-zinc-800'
            : 'bg-zinc-50 border-zinc-200/80'
        }`}
      >
        <OrderStatusActions
          orderNumber={order.orderNumber}
          tableNumber={order.tableNumber}
          status={order.status}
          isUpdating={isUpdating}
          onUpdateStatus={(nextStatus) => onUpdateStatus(order.id, nextStatus)}
        />
      </div>
    </article>
  );
}
