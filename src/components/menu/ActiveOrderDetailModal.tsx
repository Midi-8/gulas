'use client';

import React, { useMemo } from 'react';
import { Product } from '@/types/restaurant';
import { useActiveOrderTracker } from '@/hooks/useActiveOrderTracker';
import { useCart } from '@/context/CartContext';
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
  RotateCcw,
} from 'lucide-react';

interface ActiveOrderDetailModalProps {
  allProducts?: Product[];
}

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
    description: 'A ser servido à mesa ou pronto no balcão',
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

export const ActiveOrderDetailModal: React.FC<ActiveOrderDetailModalProps> = ({
  allProducts = [],
}) => {
  const {
    activeOrders,
    isDetailModalOpen,
    selectedOrderId,
    setSelectedOrderId,
    closeDetailModal,
  } = useActiveOrderTracker();
  const { addItem, setIsCartOpen } = useCart();

  const displayOrders = useMemo(() => {
    return activeOrders;
  }, [activeOrders]);

  const activeOrder =
    displayOrders.find((o) => o.id === selectedOrderId) ||
    displayOrders[displayOrders.length - 1] ||
    null;

  if (!isDetailModalOpen || !activeOrder) {
    return null;
  }

  const currentStatus = activeOrder.status || 'pending';

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
    activeOrder.tableNumber === 0
      ? 'Take-Away / Balcão'
      : activeOrder.tableName ||
        (activeOrder.tableNumber ? `Mesa ${activeOrder.tableNumber}` : 'Mesa');
  const orderTimeDisplay = formatTime(activeOrder.createdAt);

  const handleRepeatOrder = () => {
    if (!activeOrder.items || activeOrder.items.length === 0) return;

    let addedCount = 0;
    for (const item of activeOrder.items) {
      const cleanName = item.productName
        .replace(/\s*\((Normal|Familiar|20cl|33cl)\)\s*$/i, '')
        .trim()
        .toLowerCase();

      const matchedProduct =
        allProducts.find((p) => p.id === item.id && p.available) ||
        allProducts.find(
          (p) =>
            p.available &&
            p.name.trim().toLowerCase() === cleanName &&
            Math.abs(p.price - item.unitPrice) < 0.05
        ) ||
        allProducts.find(
          (p) => p.available && p.name.trim().toLowerCase() === cleanName
        );

      if (matchedProduct) {
        addItem(matchedProduct, item.quantity, item.notes || undefined);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      closeDetailModal();
      setIsCartOpen(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={closeDetailModal}
    >
      <div
        className="w-full max-w-md bg-white border border-zinc-200/80 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 text-zinc-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 flex items-center justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 uppercase tracking-wide">
                {displayOrders.length > 1
                  ? `${displayOrders.length} Pedidos Ativos`
                  : orderIdentifier}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200/80">
                {tableDisplay}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Acompanhamento em tempo real
            </p>
          </div>

          <button
            onClick={closeDetailModal}
            className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar detalhes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Tabs para Múltiplos Pedidos */}
        {displayOrders.length > 1 && (
          <div className="px-4 sm:px-5 pt-3 pb-1 border-b border-zinc-200/80 bg-zinc-50 shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
              {displayOrders.map((ord, idx) => {
                const isSelected = ord.id === activeOrder.id;
                const ordTime = formatTime(ord.createdAt);
                const ordNum = ord.orderNumber ? `#${ord.orderNumber}` : `${idx + 1}`;

                return (
                  <button
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    <Receipt className="w-3 h-3 opacity-75" />
                    <span>Pedido {ordNum}</span>
                    {ordTime && (
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-400'
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
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 bg-white">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                {orderIdentifier}
              </h2>
              {orderTimeDisplay && (
                <p className="text-[11px] text-zinc-500">
                  Submetido às {orderTimeDisplay}
                </p>
              )}
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200/80 text-zinc-900">
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

          {isCancelled && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-900">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="text-xs font-semibold">Este pedido foi cancelado.</p>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Por favor fala com um membro da equipa caso necessites de apoio.
                </p>
              </div>
            </div>
          )}

          {/* Stepper com 4 Etapas */}
          {!isCancelled && (
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                  Estado do Pedido
                </h3>
                {currentStatus !== 'completed' && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-800 bg-white px-2.5 py-1 rounded-full border border-zinc-200/80">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {currentStatus === 'ready'
                      ? activeOrder.tableNumber === 0
                        ? 'Pronto no balcão'
                        : 'Pronto a servir'
                      : currentStatus === 'preparing'
                      ? '~10–15 min'
                      : '~15–20 min'}
                  </span>
                )}
              </div>

              <div className="space-y-4 relative">
                {STEPS.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  const isPending = idx > currentStepIndex;

                  const StepIcon = step.icon;
                  const isLast = idx === STEPS.length - 1;

                  return (
                    <div key={step.key} className="relative flex items-start gap-3.5">
                      {!isLast && (
                        <span
                          className={`absolute left-4 top-8 -bottom-4 w-0.5 transition-colors duration-300 ${
                            isDone ? 'bg-zinc-900' : 'bg-zinc-200'
                          }`}
                          aria-hidden="true"
                        />
                      )}

                      <div className="relative z-10 shrink-0">
                        {isDone ? (
                          <div className="w-8 h-8 rounded-full bg-zinc-900 text-emerald-400 flex items-center justify-center">
                            <Check className="w-4 h-4 stroke-[2.5]" />
                          </div>
                        ) : isCurrent ? (
                          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center ring-4 ring-zinc-900/10">
                            <StepIcon className="w-4 h-4 stroke-[2.2]" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 text-zinc-400 flex items-center justify-center">
                            <StepIcon className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      <div className="pt-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-xs font-semibold ${
                              isDone || isCurrent
                                ? 'text-zinc-900'
                                : 'text-zinc-400'
                            }`}
                          >
                            {step.title}
                          </p>
                          {isCurrent && (
                            <span className="text-[10px] font-semibold text-zinc-900 bg-white px-2 py-0.5 rounded-full border border-zinc-200">
                              Em curso
                            </span>
                          )}
                          {isDone && (
                            <span className="text-[10px] font-medium text-emerald-700">
                              Concluído
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] mt-0.5 ${
                            isPending ? 'text-zinc-400' : 'text-zinc-500'
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

          {/* Resumo dos Artigos */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5 text-zinc-500" />
                Artigos deste Pedido
              </h3>
              <span className="text-[11px] text-zinc-500">
                {activeOrder.items?.reduce((acc, i) => acc + i.quantity, 0) || 0} artigos
              </span>
            </div>

            <div className="rounded-2xl border border-zinc-200/80 bg-white divide-y divide-zinc-100">
              {activeOrder.items && activeOrder.items.length > 0 ? (
                activeOrder.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold font-mono text-zinc-900 shrink-0">
                          {item.quantity}×
                        </span>
                        <span className="font-medium text-zinc-900 truncate">
                          {item.productName}
                        </span>
                      </div>
                      {item.notes && (
                        <p className="text-[10px] text-zinc-500 mt-0.5 pl-5">
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold font-mono text-zinc-900 shrink-0">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="p-3 text-xs text-zinc-500">
                  A carregar resumo dos artigos...
                </p>
              )}
            </div>

            {/* Total */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-1 text-xs">
              <div className="flex justify-between font-bold text-sm text-zinc-900">
                <span>Total deste Pedido</span>
                <span className="font-mono">
                  {formatCurrency(activeOrder.total || 0)}
                </span>
              </div>
            </div>

            {activeOrder.customerNotes && (
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-[11px] text-zinc-600">
                <span className="font-semibold text-zinc-900">Notas: </span>
                {activeOrder.customerNotes}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com "Pedir Novamente" (Bloco 2) */}
        <div className="p-4 sm:p-5 border-t border-zinc-200/80 bg-white shrink-0 flex flex-col sm:flex-row gap-2">
          {allProducts.length > 0 && activeOrder.items?.length > 0 && (
            <button
              type="button"
              onClick={handleRepeatOrder}
              className="flex-1 py-3 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Repetir estes artigos</span>
            </button>
          )}
          <button
            onClick={closeDetailModal}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            Voltar ao Menu
          </button>
        </div>
      </div>
    </div>
  );
};
