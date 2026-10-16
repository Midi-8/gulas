import React, { useEffect } from 'react';
import { ManagedOrder } from '@/actions/order-management';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { OrderItemsList } from '../orders/OrderItemsList';
import { X, Calendar, Clock, MessageSquare, Undo2 } from 'lucide-react';

interface OrderHistoryDetailModalProps {
  order: ManagedOrder | null;
  onClose: () => void;
  onReopen?: (order: ManagedOrder) => void;
}

export function OrderHistoryDetailModal({
  order,
  onClose,
  onReopen,
}: OrderHistoryDetailModalProps) {
  useEffect(() => {
    if (!order) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [order, onClose]);

  if (!order) return null;

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-order-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#35271F]/40 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFFFFF] rounded-2xl shadow-xl border border-[#E5DED6] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-[#E5DED6] flex items-start justify-between bg-[#F5F4F1]">
          <div>
            <div className="flex items-center gap-2">
              <span
                id="history-order-modal-title"
                className="text-2xl font-black text-[#35271F] tracking-tight"
              >
                #{order.orderNumber}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#5E4939] text-[#F5F4F1] text-xs font-bold uppercase">
                Mesa {order.tableNumber}
              </span>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>

            <div className="flex items-center gap-2 text-xs text-gulas-gray-500 font-medium mt-1.5">
              <Calendar className="w-3.5 h-3.5 text-gulas-gray-400" />
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Customer notes */}
          {order.customerNotes && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-950 font-medium">
              <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-amber-900">
                  Nota do cliente:{' '}
                </strong>
                <span>{order.customerNotes}</span>
              </div>
            </div>
          )}

          {/* Items Section */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gulas-gray-400 block mb-2">
              Artigos do Pedido ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
            </span>
            <div className="bg-zinc-50/70 rounded-xl p-3 border border-zinc-100">
              <OrderItemsList items={order.items} />
            </div>
          </div>

          {/* Timestamp details */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between text-xs text-gulas-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Concluído / Atualizado em:
            </span>
            <span className="font-medium text-gulas-dark">
              {formatDateTime(order.updatedAt)}
            </span>
          </div>
        </div>

        {/* Footer Financials */}
        <div className="p-5 bg-zinc-50/80 border-t border-zinc-200/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gulas-gray-400 block">
              Subtotal: {formatPrice(order.subtotal)}
            </span>
            <span className="text-xl font-black text-gulas-dark tracking-tight">
              Total: {formatPrice(order.total)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {order.status === 'completed' && onReopen && (
              <button
                type="button"
                onClick={() => onReopen(order)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none transition-all cursor-pointer"
                aria-label={`Desfazer conclusão do pedido ${order.orderNumber}`}
              >
                <Undo2 className="w-4 h-4" />
                Desfazer conclusão
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gulas-dark hover:bg-black text-white text-xs font-bold focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
