'use client';

import React, { useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Restaurant } from '@/types/restaurant';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, UtensilsCrossed, MapPin, Clock } from 'lucide-react';

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
    <header className="w-full bg-white border-b border-zinc-200/80">
      <div className="max-w-4xl mx-auto px-4 pt-3 pb-3.5">
        {/* Barra Superior de Navegação */}
        <div className="flex items-center justify-between h-12">
          {/* Logótipo Oficial Gulas + Nome */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/images/logo.jpg"
              alt="Gulas — Pizza, Burger & Coffee"
              width={42}
              height={42}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-zinc-100 border border-zinc-200 shadow-2xs"
            />
            <div>
              <span className="font-black text-base sm:text-lg tracking-tight text-zinc-950 leading-none block">
                {restaurant.name}
              </span>
              <span className="text-[11px] font-medium text-zinc-500 leading-none">
                {restaurant.tagline || 'Pizza · Burger · Coffee'}
              </span>
            </div>
          </Link>

          {/* Ações Rápidas: Indicador de Mesa / Take-Away e Carrinho */}
          <div className="flex items-center gap-2">
            {!hasMounted ? (
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold text-transparent select-none animate-pulse"
                aria-hidden="true"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-400" />
                <span className="invisible">Mesa 00</span>
              </div>
            ) : selectedTableNumber === 0 ? (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-xs font-bold text-white shadow-2xs hover:bg-zinc-800 transition-all cursor-pointer"
                title="Pedido configurado para Take-Away. Clica para alterar."
              >
                <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                <span>Take-Away</span>
              </button>
            ) : selectedTableNumber !== null && selectedTableNumber > 0 ? (
              isTableLocked ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-900">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                  <span>Mesa {selectedTableNumber}</span>
                  <span className="text-[10px] text-orange-600 font-bold">(QR)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-bold text-zinc-900 hover:border-zinc-300 hover:bg-zinc-200/70 transition-all cursor-pointer"
                  title="Alterar mesa ou mudar para Take-Away"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                  <span>Mesa {selectedTableNumber}</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-950 hover:bg-orange-100 transition-all cursor-pointer"
                title="Escolher mesa ou opção Take-Away"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-orange-600" />
                <span>Mesa / Levar?</span>
              </button>
            )}

            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 hover:bg-zinc-200/70 transition-all cursor-pointer"
              aria-label="Abrir pedido"
            >
              <ShoppingBag className="w-4 h-4 text-zinc-900" />
              {hasMounted && itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-black flex items-center justify-center shadow-2xs">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Cartão Herói Gastronómico Moderno */}
        <div className="mt-3 relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200/80 shadow-xs">
          <div className="relative h-32 sm:h-40 w-full">
            <Image
              src="/images/cover.jpg"
              alt="Pizza, burger e acompanhamentos Gulas"
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/45 to-zinc-950/10" />

            <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] uppercase tracking-wider font-bold text-white mb-1.5">
                  <MapPin className="w-2.5 h-2.5 text-orange-400" />
                  <span>Vila das Aves</span>
                </div>
                <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {restaurant.fullName || restaurant.name}
                </h1>
                {restaurant.openingHours && (
                  <p className="text-[11px] text-zinc-300 font-medium hidden sm:flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-orange-400" />
                    <span>{restaurant.openingHours}</span>
                  </p>
                )}
              </div>

              {/* Selo Dinâmico "Aberto" / "Encerrado" */}
              {restaurant.isOpen ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-xs font-bold text-zinc-900 shrink-0 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Aberto</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/40 text-xs font-bold text-rose-100 shrink-0 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>Encerrado</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {!restaurant.isOpen && (
          <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-900 flex items-center justify-between gap-2">
            <span>O restaurante encontra-se temporariamente encerrado para receção de novos pedidos digitais.</span>
            {restaurant.openingHours && (
              <span className="text-[11px] font-mono text-rose-700 shrink-0 hidden sm:inline">
                {restaurant.openingHours}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
