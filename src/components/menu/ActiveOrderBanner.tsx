'use client';

import React from 'react';
import { useActiveOrderTracker } from '@/hooks/useActiveOrderTracker';
import { useCart } from '@/context/CartContext';
import {
  ChefHat,
  Clock,
  UtensilsCrossed,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const subscribeStorage = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('gulas_active_order_created', callback);
  window.addEventListener('gulas_order_status_update', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('gulas_active_order_created', callback);
    window.removeEventListener('gulas_order_status_update', callback);
  };
};

const getStoredOrderId = () => {
  try {
    return localStorage.getItem('gulas_active_order_id');
  } catch {
    return null;
  }
};

const getServerSnapshot = () => null;

export const ActiveOrderBanner: React.FC = () => {
  const {
    activeOrderId,
    activeOrder,
    status,
    completionNotice,
    openDetailModal,
  } = useActiveOrderTracker();
  const { itemCount, selectedTableNumber } = useCart();

  // Fallback rápido: sincroniza diretamente com o localStorage via useSyncExternalStore
  const storedOrderId = React.useSyncExternalStore(
    subscribeStorage,
    getStoredOrderId,
    getServerSnapshot
  );

  const effectiveOrderId = activeOrderId || storedOrderId;

  // Oculta APENAS se não houver pedido ativo (nem em fallback) e nenhuma mensagem de conclusão
  if (!effectiveOrderId && !completionNotice) {
    return null;
  }

  // Se estiver a exibir a mensagem de conclusão após finalização (ex.: 8 segundos)
  if (completionNotice) {
    return (
      <aside
        aria-label="Aviso de conclusão de pedido"
        className={`fixed left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-3 ${
          itemCount > 0 ? 'bottom-20' : 'bottom-4'
        }`}
      >
        <div className="w-full pointer-events-auto">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] shadow-sm text-[#35271F]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#EAE5DF] flex items-center justify-center shrink-0 border border-[#E5DED6]">
                <Sparkles className="w-3.5 h-3.5 text-[#C09573]" />
              </div>
              <p className="text-xs font-semibold text-[#35271F] truncate">
                {completionNotice}
              </p>
            </div>
            <button
              onClick={openDetailModal}
              className="text-[11px] font-bold text-[#5E4939] hover:text-[#453426] underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Ver
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const currentStatus = status || activeOrder?.status || 'pending';

  // Configurações contextuais por estado
  let statusText = 'Pedido registado na cozinha';
  let StatusIcon = Clock;
  let isPulsing = true;

  switch (currentStatus) {
    case 'pending':
    case 'accepted':
      statusText = 'Pedido registado na cozinha';
      StatusIcon = Clock;
      isPulsing = true;
      break;
    case 'preparing':
      statusText = 'A preparar na cozinha';
      StatusIcon = ChefHat;
      isPulsing = true;
      break;
    case 'ready':
      statusText = 'Pronto • A caminho da mesa';
      StatusIcon = UtensilsCrossed;
      isPulsing = true;
      break;
    case 'completed':
      statusText = 'Entregue • Bom apetite!';
      StatusIcon = CheckCircle2;
      isPulsing = false;
      break;
    case 'cancelled':
      statusText = 'Pedido cancelado';
      StatusIcon = XCircle;
      isPulsing = false;
      break;
  }

  const tableLabel =
    activeOrder?.tableName ||
    (activeOrder?.tableNumber ? `Mesa ${activeOrder.tableNumber}` : '') ||
    (selectedTableNumber ? `Mesa ${selectedTableNumber}` : 'O teu pedido');

  const orderNumberDisplay =
    activeOrder?.orderNumber !== undefined
      ? `Pedido #${activeOrder.orderNumber}`
      : effectiveOrderId
      ? `Pedido #${effectiveOrderId.replace('ord_', '').slice(0, 6)}`
      : null;

  return (
    <aside
      aria-label="Acompanhamento do pedido ativo"
      className={`fixed left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-3 ${
        itemCount > 0 ? 'bottom-20' : 'bottom-4'
      }`}
    >
      <div className="w-full pointer-events-auto">
        <button
          onClick={openDetailModal}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#FAF8F5] border border-[#E5DED6] shadow-sm text-[#35271F] transition-all cursor-pointer group active:scale-[0.99]"
          aria-label="Acompanhar estado do pedido em tempo real"
        >
          {/* Lado Esquerdo: Ícone + Ponto Indicador Caramelo */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#EAE5DF] flex items-center justify-center border border-[#E5DED6] text-[#5E4939]">
                <StatusIcon className="w-3.5 h-3.5 text-[#5E4939]" />
              </div>
              {/* Ponto indicador pulsante em Caramelo (#C09573) */}
              {isPulsing && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C09573] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C09573]" />
                </span>
              )}
            </div>

            {/* Texto Central */}
            <div className="text-left min-w-0">
              <p className="text-xs font-semibold text-[#35271F] truncate">
                <span className="font-bold">{tableLabel}</span> • {statusText}
              </p>
              {orderNumberDisplay && (
                <p className="text-[10px] text-[#78716C]">
                  {orderNumberDisplay}
                </p>
              )}
            </div>
          </div>

          {/* Lado Direito: Ação Ver Detalhes */}
          <div className="flex items-center gap-1 text-[#5E4939] group-hover:text-[#453426] shrink-0 text-xs font-bold">
            <span className="underline underline-offset-2 text-[11px]">
              Ver detalhes
            </span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </button>
      </div>
    </aside>
  );
};
