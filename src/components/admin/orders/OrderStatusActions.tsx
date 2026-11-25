import React, { useState } from 'react';
import { OrderStatus } from '@/types/restaurant';
import { ValidNextStatus } from '@/lib/validations/order-management';

interface OrderStatusActionsProps {
  orderNumber: number;
  tableNumber: number;
  status: OrderStatus;
  isUpdating: boolean;
  isOwner?: boolean;
  onUpdateStatus: (nextStatus: ValidNextStatus) => Promise<void>;
}

export function OrderStatusActions({
  orderNumber,
  tableNumber,
  status,
  isUpdating,
  isOwner = true,
  onUpdateStatus,
}: OrderStatusActionsProps) {
  const [activeNextStatus, setActiveNextStatus] =
    useState<ValidNextStatus | null>(null);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const handleAction = async (nextStatus: ValidNextStatus) => {
    if (isUpdating) return;
    try {
      setActiveNextStatus(nextStatus);
      await onUpdateStatus(nextStatus);
    } finally {
      setActiveNextStatus(null);
      setIsConfirmingCancel(false);
    }
  };

  if (status === 'completed' || status === 'cancelled') {
    return null;
  }

  return (
    <div className="space-y-2">
      {isConfirmingCancel ? (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5">
          <p className="text-xs font-semibold text-rose-900 leading-snug">
            Cancelar pedido #{orderNumber} (
            {tableNumber === 0 ? 'Take-Away' : `Mesa ${tableNumber}`})?
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('cancelled')}
              className="flex-1 py-2.5 px-3 rounded-xl border border-rose-700 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isUpdating && activeNextStatus === 'cancelled'
                ? 'A cancelar...'
                : 'Confirmar Cancelamento'}
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setIsConfirmingCancel(false)}
              className="py-2.5 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {status === 'pending' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('accepted')}
              aria-label={`Aceitar pedido número ${orderNumber}`}
              className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isUpdating && activeNextStatus === 'accepted'
                ? 'A aceitar...'
                : 'Aceitar Pedido'}
            </button>
          )}

          {status === 'accepted' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('preparing')}
              aria-label={`Iniciar preparação do pedido número ${orderNumber}`}
              className="flex-1 py-2.5 px-4 rounded-xl border border-amber-700 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isUpdating && activeNextStatus === 'preparing'
                ? 'A iniciar...'
                : 'Iniciar Preparação'}
            </button>
          )}

          {status === 'preparing' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('ready')}
              aria-label={`Marcar pedido número ${orderNumber} como pronto`}
              className="flex-1 py-2.5 px-4 rounded-xl border border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isUpdating && activeNextStatus === 'ready'
                ? 'A atualizar...'
                : 'Pronto p/ Entrega'}
            </button>
          )}

          {status === 'ready' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('completed')}
              aria-label={`Concluir entrega do pedido número ${orderNumber}`}
              className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold shadow-2xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isUpdating && activeNextStatus === 'completed'
                ? 'A concluir...'
                : 'Concluir / Entregue'}
            </button>
          )}

          {isOwner && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setIsConfirmingCancel(true)}
              aria-label={`Cancelar pedido número ${orderNumber}`}
              title="Cancelar Pedido"
              className="py-2.5 px-3.5 rounded-xl border border-zinc-200/90 bg-white hover:bg-rose-600 hover:border-rose-600 text-zinc-600 hover:text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer shrink-0"
            >
              Cancelar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
