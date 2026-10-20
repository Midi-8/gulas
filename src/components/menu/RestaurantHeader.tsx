'use client';

import React, { useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Restaurant } from '@/types/restaurant';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, UtensilsCrossed, Sparkles } from 'lucide-react';

interface RestaurantHeaderProps {
  restaurant: Restaurant;
}

const emptySubscribe = () => () => {};

const GulasLogo: React.FC = () => {
  return (
    <Image
      src="/images/logo.jpg"
      alt="Gulas — Pizza, Burger & Coffee"
      width={44}
      height={44}
      className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-contain bg-[#F3F3F3] border border-[#C09573]/40 shadow-xs"
    />
  );
};

export const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({ restaurant }) => {
  const { selectedTableNumber, isTableLocked, itemCount, setIsCartOpen } = useCart();
  const hasMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <header className="w-full bg-[#F5F4F1] pt-3 pb-2 border-b border-[#E5DED6]">
      <div className="max-w-4xl mx-auto px-4">
        {/* Barra Superior de Navegação */}
        <div className="flex items-center justify-between h-12">
          {/* Logótipo Oficial Gulas */}
          <div className="flex items-center">
            <GulasLogo />
          </div>

          {/* Ações Rápidas: Indicador de Mesa e Carrinho */}
          <div className="flex items-center gap-2">
            {!hasMounted ? (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAE5DF] border border-[#E5DED6] text-xs font-bold text-transparent select-none animate-pulse"
                aria-hidden="true"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#A89F95]" />
                <span className="invisible">Mesa 00</span>
              </div>
            ) : selectedTableNumber ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E5DED6] text-xs font-bold text-[#35271F] shadow-xs">
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#C09573]" />
                <span>Mesa {selectedTableNumber}</span>
                {isTableLocked && (
                  <span className="text-[10px] text-[#C09573] font-bold">(QR)</span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#C09573]/50 text-xs font-bold text-[#35271F] shadow-xs hover:border-[#C09573] hover:bg-[#EAE5DF] transition-all cursor-pointer"
                title="Escolher mesa onde está sentado"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#C09573]" />
                <span>Mesa?</span>
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E5DED6] text-[#35271F] hover:border-[#C09573]/70 hover:shadow-sm transition-all cursor-pointer"
              aria-label="Abrir pedido"
            >
              <ShoppingBag className="w-4 h-4 text-[#35271F]" />
              {hasMounted && itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#5E4939] text-[#F5F4F1] text-[10px] font-black flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Cartão Herói Gastronómico */}
        <div className="mt-3 relative rounded-2xl overflow-hidden bg-[#FFFFFF] border border-[#E5DED6] shadow-xs">
          <div className="relative h-36 sm:h-44 w-full">
            <Image
              src="/images/cover.jpg"
              alt="Pizza, burger e acompanhamentos Gulas"
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
            {/* Gradiente de proteção de contraste cinematográfico */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#35271F]/90 via-[#35271F]/40 to-transparent" />

            {/* Conteúdo do Rodapé do Herói */}
            <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#35271F]/60 backdrop-blur-xs border border-[#C09573]/40 text-[10px] uppercase tracking-wider font-extrabold text-[#C09573] mb-1">
                  <Sparkles className="w-2.5 h-2.5 text-[#C09573]" />
                  <span>Vila das Aves</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-xs">
                  {restaurant.name}
                </h1>
                <p className="text-xs text-[#EAE5DF] font-medium hidden sm:block mt-0.5">
                  {restaurant.fullName}
                </p>
              </div>

              {/* Selo Minimalista "Aberto" */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E5DED6] text-xs font-bold text-[#35271F] shrink-0 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#C09573] animate-pulse" />
                <span>Aberto</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
