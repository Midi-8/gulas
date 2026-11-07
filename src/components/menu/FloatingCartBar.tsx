'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import { formatCurrency } from '@/data/mockRestaurant';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export const FloatingCartBar: React.FC = () => {
  const { itemCount, total, setIsCartOpen } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 px-4 flex justify-center animate-in slide-in-from-bottom-4 duration-200 pointer-events-none">
      <div className="w-full max-w-md pointer-events-auto">
        <button
          onClick={() => setIsCartOpen(true)}
          className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold shadow-xl shadow-zinc-950/20 flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer border border-zinc-800"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-white text-zinc-900 text-xs font-bold flex items-center justify-center">
              {itemCount}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-white flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-zinc-300" />
              <span>Ver o teu pedido</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold font-mono tracking-tight text-white">
              {formatCurrency(total)}
            </span>
            <ArrowRight className="w-4 h-4 text-zinc-400" />
          </div>
        </button>
      </div>
    </div>
  );
};
