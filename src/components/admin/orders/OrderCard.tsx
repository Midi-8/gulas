import React from 'react';
import { ManagedOrder } from '@/actions/order-management';
import { ValidNextStatus } from '@/lib/validations/order-management';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderItemsList } from './OrderItemsList';
import { OrderStatusActions } from './OrderStatusActions';
import { Clock, MessageSquare, AlertTriangle, Sparkles, X, Timer, ShoppingBag } from 'lucide-react';
import { useOrderTimer } from '@/hooks/useOrderTimer';

interface OrderCardProps {
  order: ManagedOrder;
  isUpdating: boolean;
  isNew?: boolean;
  error?: string | null;
  onClearError?: () => void;
  onUpdateStatus: (orderId: string, nextStatus: ValidNextStatus) => Promise<void>;
}

function getTimerStyles(minutes: number) {
  if (minutes < 10) {
    return {
      badge: 'bg-zinc-800/80 text-zinc-300 border-zinc-700',
      ring: 'border-zinc-700',
    };
  }
  if (minutes < 20) {
    return {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      ring: 'border-amber-500/40',
    };
  }
  return {
    badge: 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse ring-1 ring-rose-500/40',
    ring: 'border-rose-500/50',
  };
}

export function OrderCard({
  order,
  isUpdating,
  isNew,
  error,
  onClearError,
  onUpdateStatus,
}: OrderCardProps) {
  const elapsedMinutes = useOrderTimer(order.createdAt);
  const timerStyles = getTimerStyles(elapsedMinutes);

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
        isNew
          ? 'bg-[#1C2029] border-amber-500/60 ring-2 ring-amber-500/40 animate-in fade-in zoom-in-98 duration-300'
          : order.status === 'pending'
          ? 'bg-[#1C2029] border-amber-500/40'
          : order.status === 'ready'
          ? 'bg-[#1C2029] border-emerald-500/40'
          : 'bg-[#1C2029] border-[#2A313E]'
      }`}
    >
      {/* Top Card Header */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                id={`order-card-title-${order.id}`}
                className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight leading-none"
              >
                #{order.orderNumber}
              </span>

              {order.tableNumber === 0 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-black uppercase tracking-wider border border-emerald-500/40">
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Take-Away
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#2A313E] text-amber-300 text-xs sm:text-sm font-black uppercase tracking-wider border border-[#3E4758]">
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

            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium mt-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{formatTime(order.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Temporizador visual de SLA por pedido */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${timerStyles.badge}`}
              title="Tempo decorrido desde a receção do pedido"
            >
              <Timer className="w-3.5 h-3.5" />
              {elapsedMinutes} min
            </span>

            <OrderStatusBadge status={order.status} size="sm" />
          </div>
        </div>

        {/* Customer General Notes */}
        {order.customerNotes && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-2 text-xs text-amber-300 font-medium leading-relaxed">
            <MessageSquare className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-400 uppercase text-[10px] tracking-wider block">
                Observação do cliente:
              </strong>
              <span>{order.customerNotes}</span>
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
      <div className="px-4 sm:px-5 py-2 border-t border-[#2A313E]/60 flex-1">
        <OrderItemsList items={order.items} />
      </div>

      {/* Bottom Footer: Touch-first Action Button */}
      <div className="p-3 sm:p-4 bg-[#14171E] rounded-b-2xl border-t border-[#2A313E]">
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
