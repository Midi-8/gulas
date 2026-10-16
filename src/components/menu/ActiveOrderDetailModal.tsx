'use client';

import React, { useMemo } from 'react';
import { useActiveOrderTracker } from '@/hooks/useActiveOrderTracker';
import { formatCurrency } from '@/data/mockRestaurant';
import {
  X,
  Check,
  ChefHat,
  Clock,
  UtensilsCrossed,
  Sparkles,
  AlertCircle,
  Utensils,
  Receipt,
} from 'lucide-react';

interface StepDef {
  key: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  {
    key: 'pending',
    title: 'Recebido',
    description: 'Pedido registado no sistema',
    icon: Clock,
  },
  {
    key: 'preparing',
    title: 'Em Preparação',
    description: 'Cozinha a confecionar os pratos',
    icon: ChefHat,
  },
  {
    key: 'ready',
    title: 'Pronto / A Caminho',
    description: 'A ser entregue à mesa',
    icon: UtensilsCrossed,
  },
  {
    key: 'completed',
    title: 'Concluído',
    description: 'Bom apetite!',
    icon: Sparkles,
  },
];

function formatTime(isoString?: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const ActiveOrderDetailModal: React.FC = () => {
  const {
    activeOrders,
    isDetailModalOpen,
    selectedOrderId,
    setSelectedOrderId,
    closeDetailModal,
  } = useActiveOrderTracker();

  // Garante apenas a exibição de pedidos ativos confirmados
  const displayOrders = useMemo(() => {
    return activeOrders;
  }, [activeOrders]);

  // Pedido selecionado atualmente
  const activeOrder =
    displayOrders.find((o) => o.id === selectedOrderId) ||
    displayOrders[displayOrders.length - 1] ||
    null;

  if (!isDetailModalOpen || !activeOrder) {
    return null;
  }

  const currentStatus = activeOrder.status || 'pending';

  // Determina o índice da etapa ativa (0 a 3)
  let currentStepIndex = 0;
  if (currentStatus === 'preparing') {
    currentStepIndex = 1;
  } else if (currentStatus === 'ready') {
    currentStepIndex = 2;
  } else if (currentStatus === 'completed') {
    currentStepIndex = 3;
  }

  const isCancelled = currentStatus === 'cancelled';
  const orderIdentifier =
    activeOrder.orderNumber !== undefined
      ? `Pedido #${activeOrder.orderNumber}`
      : `Pedido #${activeOrder.id.replace('ord_', '').slice(0, 8)}`;
  const tableDisplay =
    activeOrder.tableName ||
    (activeOrder.tableNumber ? `Mesa ${activeOrder.tableNumber}` : 'Mesa');
  const orderTimeDisplay = formatTime(activeOrder.createdAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#35271F]/40 animate-in fade-in duration-200"
      onClick={closeDetailModal}
    >
      <div
        className="w-full max-w-md bg-[#FFFFFF] border border-[#E5DED6] rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 text-[#35271F] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-[#E5DED6] flex items-center justify-between bg-[#FFFFFF] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#5E4939] uppercase tracking-wide">
                {displayOrders.length > 1
                  ? `${displayOrders.length} Pedidos Ativos`
                  : orderIdentifier}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAE5DF] text-[#4C453F] border border-[#E5DED6]">
                {tableDisplay}
              </span>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              Acompanhamento em tempo real
            </p>
          </div>

          <button
            onClick={closeDetailModal}
            className="w-8 h-8 rounded-full bg-[#EAE5DF] text-[#4C453F] hover:bg-[#E5DED6] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar detalhes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Tabs para Múltiplos Pedidos */}
        {displayOrders.length > 1 && (
          <div className="px-4 sm:px-5 pt-3 pb-1 border-b border-[#E5DED6] bg-[#FAF8F5] shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2">
              {displayOrders.map((ord, idx) => {
                const isSelected = ord.id === activeOrder.id;
                const ordTime = formatTime(ord.createdAt);
                const ordNum = ord.orderNumber ? `#${ord.orderNumber}` : `${idx + 1}`;

                return (
                  <button
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939] shadow-xs'
                        : 'bg-[#FFFFFF] text-[#4C453F] border-[#E5DED6] hover:bg-[#EAE5DF]'
                    }`}
                  >
                    <Receipt className="w-3 h-3 text-[#C09573]" />
                    <span>Pedido {ordNum}</span>
                    {ordTime && (
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'text-[#C09573]' : 'text-[#78716C]'
                        }`}
                      >
                        {ordTime}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Corpo com Scroll */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 bg-[#FFFFFF]">
          {/* Identificação do Pedido Selecionado */}
          <div className="flex items-center justify-between pb-1 border-b border-[#E5DED6]">
            <div>
              <h2 className="text-sm font-black text-[#35271F]">
                {orderIdentifier}
              </h2>
              {orderTimeDisplay && (
                <p className="text-[11px] text-[#78716C]">
                  Submetido às {orderTimeDisplay}
                </p>
              )}
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F5F4F1] border border-[#E5DED6] text-[#5E4939]">
              {currentStatus === 'preparing'
                ? 'Em preparação'
                : currentStatus === 'ready'
                ? 'Pronto'
                : currentStatus === 'completed'
                ? 'Entregue'
                : currentStatus === 'cancelled'
                ? 'Cancelado'
                : 'Recebido'}
            </span>
          </div>

          {/* Alerta de Cancelamento se aplicável */}
          {isCancelled && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-900">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="text-xs font-bold">Este pedido foi cancelado.</p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Por favor fala com um membro da equipa caso necessites de apoio.
                </p>
              </div>
            </div>
          )}

          {/* Stepper com 4 Etapas */}
          {!isCancelled && (
            <div className="p-4 rounded-xl bg-[#F5F4F1] border border-[#E5DED6] space-y-4">
              <h3 className="text-xs font-bold text-[#35271F] uppercase tracking-wider">
                Estado do Pedido
              </h3>

              <div className="space-y-4 relative">
                {STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const isPending = idx > currentStepIndex;

                  const StepIcon = step.icon;
                  const isLast = idx === STEPS.length - 1;

                  return (
                    <div key={step.key} className="relative flex items-start gap-3.5">
                      {/* Linha vertical conectora */}
                      {!isLast && (
                        <span
                          className={`absolute left-4 top-8 -bottom-4 w-0.5 transition-colors duration-300 ${
                            isDone ? 'bg-[#5E4939]' : 'bg-[#E5DED6]'
                          }`}
                          aria-hidden="true"
                        />
                      )}

                      {/* Marcador do Passo */}
                      <div className="relative z-10 shrink-0">
                        {isDone ? (
                          <div className="w-8 h-8 rounded-full bg-[#5E4939] text-[#C09573] flex items-center justify-center shadow-xs">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-8 h-8 rounded-full bg-[#5E4939] text-[#C09573] flex items-center justify-center ring-4 ring-[#C09573]/25 shadow-xs">
                            <StepIcon className="w-4 h-4 stroke-[2.2]" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#EAE5DF] border border-[#E5DED6] text-[#A89F95] flex items-center justify-center">
                            <StepIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Conteúdo Textual */}
                      <div className="pt-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs font-bold ${
                              isDone || isCurrent
                                ? 'text-[#35271F]'
                                : 'text-[#78716C]'
                            }`}
                          >
                            {step.title}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-[#C09573] bg-[#FFFFFF] px-2 py-0.5 rounded-full border border-[#E5DED6]">
                              Em curso
                            </span>
                          )}
                          {isDone && (
                            <span className="text-[10px] font-semibold text-[#5E4939]">
                              Concluído
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] mt-0.5 ${
                            isPending ? 'text-[#A89F95]' : 'text-[#4C453F]'
                          }`}
                        >
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resumo dos Artigos do Pedido Selecionado */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#35271F] uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-[#C09573]" />
                Artigos deste Pedido
              </h3>
              <span className="text-[11px] text-[#78716C]">
                {activeOrder.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} artigos
              </span>
            </div>

            <div className="rounded-xl border border-[#E5DED6] bg-[#FFFFFF] divide-y divide-[#E5DED6]">
              {activeOrder.items && activeOrder.items.length > 0 ? (
                activeOrder.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#5E4939] shrink-0">
                          {item.quantity}x
                        </span>
                        <span className="font-medium text-[#35271F] truncate">
                          {item.productName}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-[#78716C] italic mt-0.5 pl-5">
                          &ldquo;{item.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-[#4C453F] shrink-0">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="p-3 text-xs text-[#78716C] italic">
                  A carregar resumo dos artigos...
                </p>
              )}
            </div>

            {/* Total e Subtotal deste Pedido */}
            <div className="p-3 rounded-xl bg-[#F5F4F1] border border-[#E5DED6] space-y-1 text-xs">
              {activeOrder.subtotal !== undefined &&
                activeOrder.subtotal > 0 &&
                activeOrder.subtotal !== activeOrder.total && (
                  <div className="flex justify-between text-[#78716C]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(activeOrder.subtotal)}</span>
                  </div>
                )}
              <div className="flex justify-between font-black text-sm text-[#35271F] pt-0.5">
                <span>Total deste Pedido</span>
                <span className="text-[#C09573]">
                  {formatCurrency(activeOrder.total || 0)}
                </span>
              </div>
            </div>

            {/* Observações Gerais se houver */}
            {activeOrder.customerNotes && (
              <div className="p-2.5 rounded-lg bg-[#FAF8F5] border border-[#E5DED6] text-[11px] text-[#4C453F]">
                <span className="font-bold text-[#35271F]">Notas: </span>
                {activeOrder.customerNotes}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé: Botão "Continuar a ver o menu" */}
        <div className="p-4 sm:p-5 border-t border-[#E5DED6] bg-[#FFFFFF] shrink-0">
          <button
            onClick={closeDetailModal}
            className="w-full py-3 px-4 rounded-xl bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] font-bold text-xs sm:text-sm transition-all shadow-xs active:scale-[0.99] cursor-pointer"
          >
            Continuar a ver o menu
          </button>
        </div>
      </div>
    </div>
  );
};
