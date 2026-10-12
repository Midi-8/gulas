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

export const ActiveOrderBanner: React.FC = () => {
  const { activeOrder, status, completionNotice, openDetailModal } =
    useActiveOrderTracker();
  const { itemCount } = useCart();

  // Oculta se não houver pedido ativo nem mensagem de conclusão de 8 segundos
  if (!activeOrder && !completionNotice) {
    return null;
  }

  // Se estiver a exibir a mensagem de conclusão após finalização
  if (completionNotice) {
    return (
      <div
        className={`fixed inset-x-0 z-40 px-4 flex justify-center pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-3 ${
          itemCount > 0 ? 'bottom-20' : 'bottom-4'
        }`}
      >
        <div className="w-full max-w-md pointer-events-auto">
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
      </div>
    );
  }

  if (!activeOrder) return null;

  const currentStatus = status || activeOrder.status;

  // Configurações contextuais por estado
  let statusText = 'A aguardar confirmação';
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
    activeOrder.tableName || `Mesa ${activeOrder.tableNumber}`;

  return (
    <div
      className={`fixed inset-x-0 z-40 px-4 flex justify-center pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-3 ${
        itemCount > 0 ? 'bottom-20' : 'bottom-4'
      }`}
    >
      <div className="w-full max-w-md pointer-events-auto">
        <button
          onClick={openDetailModal}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#FAF8F5] border border-[#E5DED6] shadow-sm text-[#35271F] transition-all cursor-pointer group active:scale-[0.99]"
          aria-label="Acompanhar estado do pedido"
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
              {activeOrder.orderNumber && (
                <p className="text-[10px] text-[#78716C]">
                  Pedido #{activeOrder.orderNumber}
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
    </div>
  );
};
