'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { useActiveOrderTracker } from '@/hooks/useActiveOrderTracker';
import { formatCurrency, mockRestaurant } from '@/data/mockRestaurant';
import { CheckCircle2, Clock, UtensilsCrossed, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsOrderSuccessModalOpen(false)}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Fechar confirmação"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Success Icon & Header */}
        <div className="text-center space-y-1.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-zinc-950 tracking-tight">
            Pedido Confirmado!
          </h2>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            O teu pedido foi enviado para a cozinha do {activeOrder.restaurantName || mockRestaurant.name}.
          </p>
        </div>

        {/* Order Details Badge Card */}
        <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2.5 mb-4">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-200">
            <div>
              <span className="text-zinc-500 block text-[10px]">Identificador</span>
              <span className="text-xs font-black text-zinc-950">
                #{activeOrder.orderNumber !== undefined ? activeOrder.orderNumber : activeOrder.id.replace('ord_', '')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 block text-[10px]">Serviço</span>
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1 justify-end">
                <UtensilsCrossed className="w-3 h-3 text-orange-600" />
                {activeOrder.tableNumber === 0 ? '🛍️ Take-Away' : activeOrder.tableName || `Mesa ${activeOrder.tableNumber}`}
              </span>
            </div>
          </div>

          {/* Progress tracker */}
          <div className="pt-0.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-900">Estado:</span>
              <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                A aguardar preparação
              </span>
            </div>

            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white border border-zinc-200">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-600">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                Tempo estimado:
              </span>
              <span className="text-[11px] font-black text-zinc-950">
                ~15–20 min
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center">
              {steps.map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div
                    className={`h-1.5 rounded-full ${
                      step.status === 'completed'
                        ? 'bg-zinc-900'
                        : step.status === 'current'
                        ? 'bg-orange-500 animate-pulse'
                        : 'bg-zinc-200'
                    }`}
                  />
                  <span
                    className={`text-[9px] block truncate ${
                      step.status === 'completed' || step.status === 'current'
                        ? 'text-zinc-900 font-bold'
                        : 'text-zinc-400'
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
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block">
            Resumo dos Artigos
          </span>
          {activeOrder.items.map(({ product, quantity }) => (
            <div key={product.id} className="flex justify-between text-xs text-zinc-600 py-1 border-b border-zinc-100">
              <span>
                {quantity}× {product.name}
              </span>
              <span className="font-bold font-mono text-zinc-900">
                {formatCurrency(product.price * quantity)}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-black text-zinc-950 pt-1.5">
            <span>Total</span>
            <span className="text-orange-600 font-mono">{formatCurrency(activeOrder.total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => {
              setIsOrderSuccessModalOpen(false);
              openDetailModal();
            }}
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Acompanhar Pedido em Tempo Real
          </button>
          <button
            onClick={() => setIsOrderSuccessModalOpen(false)}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-bold text-xs transition-colors cursor-pointer"
          >
            Continuar a ver o Menu
          </button>
        </div>
      </div>
    </div>
  );
};
