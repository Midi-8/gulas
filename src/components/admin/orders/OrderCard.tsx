import React from 'react';
import { ManagedOrder } from '@/actions/order-management';
import { ValidNextStatus } from '@/lib/validations/order-management';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderItemsList } from './OrderItemsList';
import { OrderStatusActions } from './OrderStatusActions';
import { Clock, MessageSquare, AlertTriangle, Sparkles, X, Timer, ShoppingBag, Printer } from 'lucide-react';
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
        : 'bg-[#F5F4F1] text-[#4C453F] border-[#E5DED6]',
    };
  }
  if (minutes < 20) {
    return {
      badge: isDarkMode
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
        : 'bg-amber-100 text-amber-900 border-amber-300',
    };
  }
  return {
    badge: isDarkMode
      ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse ring-1 ring-rose-500/40'
      : 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse ring-1 ring-rose-400/50',
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

  // Format order creation time (HH:mm)
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
      className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm ${
        isDarkMode
          ? isNew
            ? 'bg-[#1C2029] border-amber-500/60 ring-2 ring-amber-500/40 animate-in fade-in zoom-in-98 duration-300'
            : order.status === 'pending'
            ? 'bg-[#1C2029] border-amber-500/40'
            : order.status === 'ready'
            ? 'bg-[#1C2029] border-emerald-500/40'
            : 'bg-[#1C2029] border-[#2A313E]'
          : isNew
          ? 'bg-[#FFFFFF] border-amber-400 ring-2 ring-amber-400/40 animate-in fade-in zoom-in-98 duration-300'
          : order.status === 'pending'
          ? 'bg-[#FFFFFF] border-amber-300'
          : order.status === 'ready'
          ? 'bg-[#FFFFFF] border-emerald-300'
          : 'bg-[#FFFFFF] border-[#E5DED6]'
      }`}
    >
      {/* Top Card Header */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                id={`order-card-title-${order.id}`}
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tight leading-none ${
                  isDarkMode ? 'text-white' : 'text-[#35271F]'
                }`}
              >
                #{order.orderNumber}
              </span>

              {order.tableNumber === 0 ? (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider border ${
                    isDarkMode
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-emerald-700 text-white border-emerald-800'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Take-Away
                </span>
              ) : (
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider border ${
                    isDarkMode
                      ? 'bg-[#2A313E] text-amber-300 border-[#3E4758]'
                      : 'bg-[#5E4939] text-[#F5F4F1] border-[#4C392D]'
                  }`}
                >
                  Mesa {order.tableNumber}
                </span>
              )}

              {isNew && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-xs font-black border border-amber-500/40 animate-pulse">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  NOVO
                </span>
              )}
            </div>

            <div
              className={`flex items-center gap-1.5 text-xs font-medium mt-1.5 ${
                isDarkMode ? 'text-zinc-400' : 'text-[#78716C]'
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
                      ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                      : 'bg-[#F5F4F1] border-[#E5DED6] text-[#4C453F] hover:bg-[#EAE5DF] hover:text-[#35271F]'
                  }`}
                  title="Imprimir talão de cozinha (80mm)"
                  aria-label={`Imprimir talão do pedido ${order.orderNumber}`}
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Temporizador visual de SLA por pedido */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${timerStyles.badge}`}
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
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-950'
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

        {/* Card Error Notification (Dismissable) */}
        {error && (
          <div
            role="alert"
            className="mt-2.5 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-between gap-2 text-xs text-rose-300 font-medium animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="text-rose-400 hover:text-rose-200 p-0.5 rounded transition-colors cursor-pointer"
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
          isDarkMode ? 'border-[#2A313E]/60' : 'border-[#E5DED6]'
        }`}
      >
        <OrderItemsList items={order.items} isDarkMode={isDarkMode} />
      </div>

      {/* Bottom Footer: Touch-first Action Button */}
      <div
        className={`p-3 sm:p-4 rounded-b-2xl border-t ${
          isDarkMode
            ? 'bg-[#14171E] border-[#2A313E]'
            : 'bg-[#F5F4F1] border-[#E5DED6]'
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
