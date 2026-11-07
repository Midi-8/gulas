import React, { useEffect } from 'react';
import { ManagedOrder } from '@/actions/order-management';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { OrderItemsList } from '../orders/OrderItemsList';
import { X, Calendar, Clock, MessageSquare, Undo2, Printer } from 'lucide-react';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200/80 flex items-start justify-between bg-zinc-50">
          <div>
            <div className="flex items-center gap-2">
              <span
                id="history-order-modal-title"
                className="text-2xl font-bold text-zinc-900 tracking-tight"
              >
                #{order.orderNumber}
              </span>
              {order.tableNumber === 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold uppercase">
                  Take-Away
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold uppercase">
                  Mesa {order.tableNumber}
                </span>
              )}
              <OrderStatusBadge status={order.status} size="sm" />
            </div>

            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-200/70 text-zinc-600 hover:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none flex items-center justify-center transition-colors cursor-pointer"
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
                <strong className="font-semibold text-amber-900">
                  Nota do cliente:{' '}
                </strong>
                <span>{order.customerNotes}</span>
              </div>
            </div>
          )}

          {/* Items Section */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block mb-2">
              Artigos do Pedido ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
            </span>
            <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200/80">
              <OrderItemsList items={order.items} />
            </div>
          </div>

          {/* Timestamp details */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs text-zinc-600">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              Concluído / Atualizado em:
            </span>
            <span className="font-medium text-zinc-900">
              {formatDateTime(order.updatedAt)}
            </span>
          </div>
        </div>

        {/* Footer Financials */}
        <div className="p-5 bg-zinc-50 border-t border-zinc-200/80 flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
              Subtotal: {formatPrice(order.subtotal)}
            </span>
            <span className="text-xl font-bold text-zinc-900 tracking-tight tabular-nums">
              Total: {formatPrice(order.total)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-semibold border border-zinc-200 transition-all cursor-pointer"
              title="Imprimir talão (80mm)"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-600" />
              <span>Imprimir</span>
            </button>
            {order.status === 'completed' && onReopen && (
              <button
                type="button"
                onClick={() => onReopen(order)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:outline-none transition-all cursor-pointer"
                aria-label={`Desfazer conclusão do pedido ${order.orderNumber}`}
              >
                <Undo2 className="w-4 h-4" />
                Desfazer conclusão
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
