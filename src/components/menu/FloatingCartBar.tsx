'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/data/mockRestaurant';
import { ShoppingBag } from 'lucide-react';

export const FloatingCartBar: React.FC = () => {
  const { itemCount, total, setIsCartOpen } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 px-4 flex justify-center animate-in slide-in-from-bottom-4 duration-200 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto">
        <button
          onClick={() => setIsCartOpen(true)}
          className="w-full py-3 px-4 rounded-xl bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] font-bold shadow-lg shadow-[#5E4939]/20 flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer border border-[#C09573]/30"
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#C09573]" />
            <span className="text-xs sm:text-sm font-bold">
              {itemCount} {itemCount === 1 ? 'artigo' : 'artigos'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-extrabold tracking-tight text-[#C09573]">
              {formatCurrency(total)}
            </span>
            <span className="text-xs opacity-90 underline underline-offset-2">
              Ver pedido
            </span>
          </div>
        </button>
      </div>
    </div>
  );
};
