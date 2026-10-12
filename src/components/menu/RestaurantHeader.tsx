'use client';

import React, { useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Restaurant } from '@/types/restaurant';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, UtensilsCrossed } from 'lucide-react';

interface RestaurantHeaderProps {
  restaurant: Restaurant;
}

const emptySubscribe = () => () => {};

export const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({ restaurant }) => {
  const { selectedTableNumber, isTableLocked, itemCount, setIsCartOpen } = useCart();
  const hasMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <header className="w-full bg-[#FAF8F5] pt-3 pb-2">
      {/* Top Navbar */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          {/* Gulas Wordmark */}
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-[#141619] uppercase leading-none">
              GULAS
            </span>
            <span className="text-xs font-semibold text-[#15803D] hidden sm:inline-block">
              Pizza · Burger · Coffee
            </span>
          </div>

          {/* Right Actions: Table & Cart Trigger */}
          <div className="flex items-center gap-2">
            {!hasMounted ? (
              // Stable SSR shell matching layout dimensions without hydration mismatch
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100/60 border border-zinc-200/50 text-xs font-bold text-transparent select-none animate-pulse"
                aria-hidden="true"
              >
                <UtensilsCrossed className="w-3 h-3 text-zinc-300" />
                <span className="invisible">Mesa 00</span>
              </div>
            ) : selectedTableNumber ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-zinc-200/80 text-xs font-bold text-[#141619] shadow-xs">
                <UtensilsCrossed className="w-3 h-3 text-[#15803D]" />
                <span>Mesa {selectedTableNumber}</span>
                {isTableLocked && (
                  <span className="text-[10px] text-[#15803D] font-bold">(QR)</span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 transition-colors cursor-pointer"
                title="Escolher mesa onde está sentado"
              >
                <UtensilsCrossed className="w-3 h-3 text-amber-600" />
                <span>Mesa?</span>
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-lg bg-white border border-zinc-200/80 text-[#141619] hover:border-zinc-300 transition-colors shadow-xs cursor-pointer"
              aria-label="Abrir pedido"
            >
              <ShoppingBag className="w-4 h-4 text-[#141619]" />
              {hasMounted && itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#15803D] text-white text-[10px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hero Card Container */}
        <div className="mt-2 relative rounded-2xl overflow-hidden bg-[#141619] text-white shadow-sm">
          {/* Background image */}
          <div className="relative h-36 sm:h-44 w-full">
            <Image
              src={restaurant.coverImageUrl}
              alt="Gulas especialidades gastronómicas"
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover opacity-75 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141619] via-[#141619]/40 to-transparent" />

            {/* Bottom Hero Info */}
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#86EFAC] font-bold mb-0.5">
                  Vila das Aves
                </p>
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">
                  Escolhe o que te apetece.
                </h1>
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-white shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                <span>Aberto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
