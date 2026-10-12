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
  Layers,
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

// FORA DO COMPONENTE (Constante imutável em cache na memória do módulo):
const EMPTY_ORDER_IDS: string[] = [];

// Snapshot seguro para SSR (devolve sempre a mesma referência estática):
const getServerSnapshot = () => EMPTY_ORDER_IDS;

// Snapshot de Leitura Local (Garantir cache de referência):
let cachedRawValue: string | null = null;
let cachedParsedIds: string[] = EMPTY_ORDER_IDS;

const getStoredOrderIds = (): string[] => {
  if (typeof window === 'undefined') return EMPTY_ORDER_IDS;

  try {
    const raw =
      localStorage.getItem('gulas_active_order_ids') ||
      localStorage.getItem('gulas_active_order_id');
    if (!raw) {
      cachedRawValue = null;
      cachedParsedIds = EMPTY_ORDER_IDS;
      return EMPTY_ORDER_IDS;
    }

    // Se o valor bruto no localStorage não mudou, devolve a mesma referência em cache:
    if (raw === cachedRawValue) {
      return cachedParsedIds;
    }

    cachedRawValue = raw;
    if (raw.startsWith('[')) {
      const parsed = JSON.parse(raw);
      cachedParsedIds = Array.isArray(parsed) ? parsed : EMPTY_ORDER_IDS;
    } else {
      cachedParsedIds = [raw];
    }
    return cachedParsedIds;
  } catch {
    return EMPTY_ORDER_IDS;
  }
};

const emptySubscribe = () => () => {};

export const ActiveOrderBanner: React.FC = () => {
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const {
    activeOrders,
    status,
    completionNotice,
    openDetailModal,
  } = useActiveOrderTracker();
  const { itemCount, selectedTableNumber } = useCart();

  // Subscrição a eventos de storage para forçar sincronização
  React.useSyncExternalStore(
    subscribeStorage,
    getStoredOrderIds,
    getServerSnapshot
  );

  // IMPEDE O DESFASAMENTO DE HIDRATAÇÃO (SSR vs Client):
  if (!isClient) {
    return null;
  }

  // 2. SALVAGUARDA DE PEDIDOS CONFIRMADOS:
  // Se a lista de pedidos ativos confirmados for vazia e não houver aviso de conclusão temporário:
  if (activeOrders.length === 0 && !completionNotice) {
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
              onClick={() => openDetailModal()}
              className="text-[11px] font-bold text-[#5E4939] hover:text-[#453426] underline underline-offset-2 shrink-0 cursor-pointer"
            >
              Ver
            </button>
          </div>
        </div>
      </aside>
    );
  }

  const ordersCount = activeOrders.length;
  const isMultiOrder = ordersCount > 1;

  // Determina o pedido mais recente ou de maior prioridade operacional
  const hasReady = activeOrders.some((o) => o.status === 'ready');
  const hasPreparing = activeOrders.some((o) => o.status === 'preparing');
  const primaryOrder =
    activeOrders.find((o) => o.status === 'ready') ||
    activeOrders.find((o) => o.status === 'preparing') ||
    activeOrders[activeOrders.length - 1] ||
    null;

  if (!primaryOrder) {
    return null;
  }

  const currentStatus =
    hasReady
      ? 'ready'
      : hasPreparing
      ? 'preparing'
      : status || primaryOrder?.status || 'pending';

  let statusText = 'Pedido registado na cozinha';
  let StatusIcon = isMultiOrder ? Layers : Clock;
  let isPulsing = true;

  switch (currentStatus) {
    case 'pending':
    case 'accepted':
      statusText = isMultiOrder
        ? 'Pedidos registados na cozinha'
        : 'Pedido registado na cozinha';
      StatusIcon = isMultiOrder ? Layers : Clock;
      isPulsing = true;
      break;
    case 'preparing':
      statusText = isMultiOrder
        ? 'A preparar pedidos na cozinha'
        : 'A preparar na cozinha';
      StatusIcon = ChefHat;
      isPulsing = true;
      break;
    case 'ready':
      statusText = isMultiOrder
        ? 'Pedido pronto • A caminho da mesa'
        : 'Pronto • A caminho da mesa';
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
    primaryOrder?.tableName ||
    (primaryOrder?.tableNumber ? `Mesa ${primaryOrder.tableNumber}` : '') ||
    (selectedTableNumber ? `Mesa ${selectedTableNumber}` : 'O teu pedido');

  return (
    <aside
      aria-label="Acompanhamento do pedido ativo"
      className={`fixed left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-3 ${
        itemCount > 0 ? 'bottom-20' : 'bottom-4'
      }`}
    >
      <div className="w-full pointer-events-auto">
        <button
          onClick={() => openDetailModal()}
          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#FAF8F5] border border-[#E5DED6] shadow-sm text-[#35271F] transition-all cursor-pointer group active:scale-[0.99]"
          aria-label="Acompanhar estado dos pedidos em tempo real"
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
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-bold text-xs text-[#35271F]">
                  {tableLabel}
                </span>
                <span className="text-xs text-[#4C453F]">•</span>
                {isMultiOrder ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#5E4939] truncate">
                    <span>{ordersCount} Pedidos ativos</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#C09573]/15 text-[#C09573] font-black border border-[#C09573]/30">
                      Multi
                    </span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-[#4C453F] truncate">
                    {statusText}
                  </span>
                )}
              </div>

              {/* Subtítulo informativo */}
              <p className="text-[10px] text-[#78716C] truncate mt-0.2">
                {isMultiOrder
                  ? statusText
                  : primaryOrder?.orderNumber
                  ? `Pedido #${primaryOrder.orderNumber}`
                  : `Pedido #${primaryOrder.id.replace('ord_', '').slice(0, 6)}`}
              </p>
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
