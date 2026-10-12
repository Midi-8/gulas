'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { useActiveOrderTracker } from '@/hooks/useActiveOrderTracker';
import { formatCurrency, mockRestaurant } from '@/data/mockRestaurant';
import { CheckCircle2, UtensilsCrossed, X } from 'lucide-react';

export const OrderConfirmationModal: React.FC = () => {
  const {
    activeOrder,
    isOrderSuccessModalOpen,
    setIsOrderSuccessModalOpen,
  } = useCart();
  const { openDetailModal } = useActiveOrderTracker();

  if (!isOrderSuccessModalOpen || !activeOrder) return null;

  const steps = [
    { label: 'Enviado', status: 'completed' },
    { label: 'Aceite', status: 'current' },
    { label: 'Em preparação', status: 'upcoming' },
    { label: 'Pronto', status: 'upcoming' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#35271F]/40 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#FFFFFF] border border-[#E5DED6] rounded-2xl p-5 sm:p-6 shadow-xl animate-in zoom-in-95 duration-200 relative text-[#35271F]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsOrderSuccessModalOpen(false)}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#EAE5DF] text-[#4C453F] hover:bg-[#E5DED6] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Fechar confirmação"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon & Header */}
        <div className="text-center space-y-1.5 mb-5">
          <div className="w-12 h-12 rounded-full bg-[#EAE5DF] text-[#5E4939] flex items-center justify-center mx-auto border border-[#E5DED6]">
            <CheckCircle2 className="w-7 h-7 text-[#C09573]" />
          </div>
          <h2 className="text-lg font-black text-[#35271F] tracking-tight">
            Pedido Confirmado!
          </h2>
          <p className="text-xs text-[#4C453F] max-w-xs mx-auto">
            O teu pedido foi enviado para a cozinha do {activeOrder.restaurantName || mockRestaurant.name}.
          </p>
        </div>

        {/* Order Details Badge Card */}
        <div className="p-3.5 rounded-xl bg-[#F5F4F1] border border-[#E5DED6] space-y-2.5 mb-4">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E5DED6]">
            <div>
              <span className="text-[#78716C] block text-[10px]">Identificador</span>
              <span className="text-xs font-black text-[#5E4939]">
                #{activeOrder.orderNumber !== undefined ? activeOrder.orderNumber : activeOrder.id.replace('ord_', '')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[#78716C] block text-[10px]">Mesa</span>
              <span className="text-xs font-bold text-[#35271F] flex items-center gap-1 justify-end">
                <UtensilsCrossed className="w-3 h-3 text-[#C09573]" />
                {activeOrder.tableName || `Mesa ${activeOrder.tableNumber}`}
              </span>
            </div>
          </div>

          {/* Progress tracker */}
          <div className="pt-0.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-[#35271F]">Estado:</span>
              <span className="text-[10px] font-bold text-[#5E4939] bg-[#EAE5DF] px-2 py-0.5 rounded border border-[#E5DED6]">
                A aguardar preparação
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center">
              {steps.map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div
                    className={`h-1.5 rounded-full ${
                      step.status === 'completed'
                        ? 'bg-[#5E4939]'
                        : step.status === 'current'
                        ? 'bg-[#C09573] animate-pulse'
                        : 'bg-[#E5DED6]'
                    }`}
                  />
                  <span
                    className={`text-[9px] block truncate ${
                      step.status === 'completed' || step.status === 'current'
                        ? 'text-[#35271F] font-bold'
                        : 'text-[#A89F95]'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Item summary */}
        <div className="space-y-1.5 mb-5 max-h-36 overflow-y-auto pr-1">
          <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider block">
            Resumo dos Artigos
          </span>
          {activeOrder.items.map(({ product, quantity }) => (
            <div key={product.id} className="flex justify-between text-xs text-[#4C453F] py-1 border-b border-[#E5DED6]">
              <span>
                {quantity}× {product.name}
              </span>
              <span className="font-bold text-[#35271F]">
                {formatCurrency(product.price * quantity)}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-black text-[#35271F] pt-1.5">
            <span>Total</span>
            <span className="text-[#C09573] font-black">{formatCurrency(activeOrder.total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => {
              setIsOrderSuccessModalOpen(false);
              openDetailModal();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Acompanhar Pedido em Tempo Real
          </button>
          <button
            onClick={() => setIsOrderSuccessModalOpen(false)}
            className="w-full py-2 px-4 rounded-xl bg-[#EAE5DF] hover:bg-[#E5DED6] text-[#35271F] font-bold text-xs transition-colors cursor-pointer"
          >
            Continuar a ver o Menu
          </button>
        </div>
      </div>
    </div>
  );
};
