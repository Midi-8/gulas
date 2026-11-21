import React, { useEffect } from 'react';
import { ManagedOrder } from '@/actions/order-management';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { OrderItemsList } from '../orders/OrderItemsList';

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
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200/80 flex items-start justify-between bg-zinc-50">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                id="history-order-modal-title"
                className="text-2xl font-bold font-mono text-zinc-950 tracking-tight"
              >
                #{order.orderNumber}
              </span>
              {order.tableNumber === 0 ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-emerald-700 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider">
                  Take-Away
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-zinc-900 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-wider">
                  Mesa {order.tableNumber}
                </span>
              )}
              <OrderStatusBadge status={order.status} size="sm" />
            </div>

            <p className="text-xs font-mono text-zinc-500 mt-1.5">
              {formatDateTime(order.createdAt)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-xl border border-zinc-200/90 bg-white text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            aria-label="Fechar modal"
          >
            Fechar
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Customer notes */}
          {order.customerNotes && (
            <div className="p-3 rounded-xl border border-amber-200/90 bg-amber-50/90 text-xs font-medium text-amber-950 leading-relaxed">
              <span className="inline-block rounded-md bg-amber-700 text-white px-1.5 py-0.5 font-bold uppercase tracking-wider text-[10px] mr-2">
                Nota
              </span>
              <span className="whitespace-pre-line">{order.customerNotes}</span>
            </div>
          )}

          {/* Items Section */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
              Artigos do Pedido (
              {order.items.reduce((acc, i) => acc + i.quantity, 0)})
            </span>
            <div className="bg-zinc-50 rounded-xl px-3 border border-zinc-200/80">
              <OrderItemsList items={order.items} />
            </div>
          </div>

          {/* Timestamp details */}
          <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs text-zinc-600">
            <span>Concluído / Atualizado em:</span>
            <span className="font-mono font-semibold text-zinc-900">
              {formatDateTime(order.updatedAt)}
            </span>
          </div>
        </div>

        {/* Footer Financials */}
        <div className="p-5 bg-zinc-50 border-t border-zinc-200/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
              Subtotal: {formatPrice(order.subtotal)}
            </span>
            <span className="text-xl font-bold font-mono text-zinc-950 tracking-tight tabular-nums">
              Total: {formatPrice(order.total)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-10 px-4 cursor-pointer rounded-xl border border-zinc-200/90 bg-white text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white active:scale-[0.98]"
              title="Imprimir talão (80mm)"
            >
              Imprimir
            </button>
            {order.status === 'completed' && onReopen && (
              <button
                type="button"
                onClick={() => onReopen(order)}
                className="h-10 px-4 cursor-pointer rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
                aria-label={`Desfazer conclusão do pedido ${order.orderNumber}`}
              >
                Desfazer conclusão
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-5 cursor-pointer rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.98]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
