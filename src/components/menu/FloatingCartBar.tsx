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
          className="w-full py-3.5 px-4 rounded-2xl bg-zinc-950 hover:bg-zinc-900 text-white font-bold shadow-xl shadow-zinc-950/25 flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer border border-zinc-800"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-black flex items-center justify-center">
              {itemCount}
            </span>
            <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-orange-400" />
              <span>Ver o teu pedido</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black font-mono tracking-tight text-orange-400">
              {formatCurrency(total)}
            </span>
            <ArrowRight className="w-4 h-4 text-zinc-400" />
          </div>
        </button>
      </div>
    </div>
  );
};
