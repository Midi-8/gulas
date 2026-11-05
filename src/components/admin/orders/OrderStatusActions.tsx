import React, { useState } from 'react';
import { OrderStatus } from '@/types/restaurant';
import { ValidNextStatus } from '@/lib/validations/order-management';
import {
  CheckCircle2,
  Flame,
  BellRing,
  Check,
  XCircle,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface OrderStatusActionsProps {
  orderNumber: number;
  tableNumber: number;
  status: OrderStatus;
  isUpdating: boolean;
  onUpdateStatus: (nextStatus: ValidNextStatus) => Promise<void>;
}

export function OrderStatusActions({
  orderNumber,
  tableNumber,
  status,
  isUpdating,
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
    <div className="pt-2 flex flex-col gap-2">
      {/* Explicit Cancellation Confirmation Sub-Panel */}
      {isConfirmingCancel ? (
        <div
          role="alert"
          className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl space-y-2 animate-in fade-in duration-150"
        >
          <div className="flex items-start gap-2 text-xs font-bold text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              Cancelar pedido #{orderNumber} (Mesa {tableNumber})?
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('cancelled')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isUpdating && activeNextStatus === 'cancelled' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              <span>Confirmar</span>
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setIsConfirmingCancel(false)}
              className="py-2 px-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {/* Primary Full-Width Action Button by Status */}
          {status === 'pending' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('accepted')}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              aria-label={`Aceitar pedido número ${orderNumber}`}
            >
              {isUpdating && activeNextStatus === 'accepted' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Aceitar Pedido</span>
            </button>
          )}

          {status === 'accepted' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('preparing')}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              aria-label={`Iniciar preparação do pedido número ${orderNumber}`}
            >
              {isUpdating && activeNextStatus === 'preparing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Flame className="w-4 h-4" />
              )}
              <span>Iniciar Preparação</span>
            </button>
          )}

          {status === 'preparing' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('ready')}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer ring-2 ring-emerald-500/30"
              aria-label={`Marcar pedido número ${orderNumber} como pronto`}
            >
              {isUpdating && activeNextStatus === 'ready' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BellRing className="w-4 h-4" />
              )}
              <span>Pronto p/ Entrega (Pass)</span>
            </button>
          )}

          {status === 'ready' && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => handleAction('completed')}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-100 text-xs sm:text-sm font-bold border border-zinc-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              aria-label={`Concluir entrega do pedido número ${orderNumber}`}
            >
              {isUpdating && activeNextStatus === 'completed' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 text-emerald-400" />
              )}
              <span>Concluir / Entregue</span>
            </button>
          )}

          {/* Secondary / Cancel Action (Allowed for pending, accepted, preparing) */}
          {(status === 'pending' ||
            status === 'accepted' ||
            status === 'preparing') && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => setIsConfirmingCancel(true)}
              className="inline-flex items-center justify-center p-3 rounded-xl bg-zinc-800/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-700/60 transition-all disabled:opacity-50 cursor-pointer"
              aria-label={`Cancelar pedido número ${orderNumber}`}
              title="Cancelar Pedido"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
