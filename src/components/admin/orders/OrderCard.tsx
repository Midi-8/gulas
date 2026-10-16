import React from 'react';
import { ManagedOrder } from '@/actions/order-management';
import { ValidNextStatus } from '@/lib/validations/order-management';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderItemsList } from './OrderItemsList';
import { OrderStatusActions } from './OrderStatusActions';
import { Clock, MessageSquare, AlertTriangle, Sparkles, X, Timer } from 'lucide-react';
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
      badge: 'bg-[#EAE5DF] text-[#35271F] border-[#E5DED6]',
      ring: 'border-[#E5DED6]',
    };
  }
  if (minutes < 20) {
    return {
      badge: 'bg-amber-50 text-amber-900 border-amber-200/80',
      ring: 'border-amber-200',
    };
  }
  return {
    badge: 'bg-rose-50 text-rose-900 border-rose-200/80',
    ring: 'border-rose-200',
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

  // Format currency
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);

  return (
    <article
      aria-labelledby={`order-card-title-${order.id}`}
      className={`bg-[#FFFFFF] rounded-2xl border transition-all flex flex-col justify-between shadow-xs ${
        isNew
          ? 'border-[#C09573] ring-2 ring-[#C09573]/40 shadow-xs animate-in fade-in zoom-in-98 duration-300'
          : order.status === 'pending'
          ? 'border-[#C09573]/50'
          : order.status === 'ready'
          ? 'border-[#5E4939]/40'
          : 'border-[#E5DED6]'
      }`}
    >
      {/* Top Card Header */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                id={`order-card-title-${order.id}`}
                className="text-xl sm:text-2xl font-black text-[#35271F] tracking-tight leading-none"
              >
                #{order.orderNumber}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#5E4939] text-[#F5F4F1] text-xs font-bold uppercase tracking-wide">
                Mesa {order.tableNumber}
              </span>
              {isNew && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EAE5DF] text-[#5E4939] text-xs font-black border border-[#E5DED6]">
                  <Sparkles className="w-3 h-3 text-[#C09573]" />
                  NOVO
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-gulas-gray-500 font-medium mt-1.5">
              <Clock className="w-3.5 h-3.5 text-gulas-gray-400" />
              <span>{formatTime(order.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Temporizador visual por pedido */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${timerStyles.badge}`}
              title="Tempo desde a criação do pedido"
            >
              <Timer className="w-3.5 h-3.5" />
              {elapsedMinutes} min
            </span>

            <OrderStatusBadge status={order.status} size="sm" />
          </div>
        </div>

        {/* Customer General Notes */}
        {order.customerNotes && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2 text-xs text-amber-950 font-medium leading-relaxed">
            <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-900">Nota do cliente: </strong>
              <span>{order.customerNotes}</span>
            </div>
          </div>
        )}

        {/* Card Error Notification (Dismissable) */}
        {error && (
          <div
            role="alert"
            className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs text-rose-800 font-medium animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            {onClearError && (
              <button
                type="button"
                onClick={onClearError}
                className="text-rose-400 hover:text-rose-700 p-0.5 rounded transition-colors cursor-pointer"
                aria-label="Dispensar aviso de erro"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Middle: Items List */}
      <div className="px-4 sm:px-5 py-2 border-t border-zinc-100/90 flex-1">
        <OrderItemsList items={order.items} />
      </div>

      {/* Bottom Footer: Total & Actions */}
      <div className="p-4 sm:p-5 pt-3 bg-[#F5F4F1] rounded-b-2xl border-t border-[#E5DED6] space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
            Total do Pedido
          </span>
          <span className="text-lg sm:text-xl font-black text-[#35271F] tracking-tight">
            {formatPrice(order.total)}
          </span>
        </div>

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