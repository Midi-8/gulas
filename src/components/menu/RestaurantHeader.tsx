'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Restaurant } from '@/types/restaurant';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import {
  ShoppingBag,
  UtensilsCrossed,
  MapPin,
  Clock,
  BellRing,
  CreditCard,
  Banknote,
  HandHelping,
  Check,
  X,
} from 'lucide-react';

interface RestaurantHeaderProps {
  restaurant: Restaurant;
}

const emptySubscribe = () => () => {};

export const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({ restaurant }) => {
  const { selectedTableNumber, isTableLocked, itemCount, setIsCartOpen, showToast } = useCart();
  const hasMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedRequestType, setSelectedRequestType] = useState<'bill_card' | 'bill_cash' | 'call_staff'>('bill_card');
  const [customerNif, setCustomerNif] = useState('');
  const [isSendingCall, setIsSendingCall] = useState(false);
  const [callSentSuccess, setCallSentSuccess] = useState(false);

  const handleSendTableRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableNumber || selectedTableNumber <= 0 || isSendingCall) return;

    setIsSendingCall(true);
    try {
      const supabase = createClient();
      const labelMap = {
        bill_card: 'Pedir a Conta (Multibanco / MB WAY)',
        bill_cash: 'Pedir a Conta (Dinheiro)',
        call_staff: 'Chamar Staff à Mesa',
      };

      const payload = {
        id: `${selectedTableNumber}-${Date.now()}`,
        tableNumber: selectedTableNumber,
        type: selectedRequestType,
        label: labelMap[selectedRequestType],
        nif: customerNif.trim() || null,
        createdAt: new Date().toISOString(),
      };

      if (supabase) {
        const channel = supabase.channel(`table-service-${restaurant.slug || 'gulas'}`);
        await new Promise<void>((resolve) => {
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              void channel
                .send({
                  type: 'broadcast',
                  event: 'table_call',
                  payload,
                })
                .finally(() => {
                  setTimeout(() => {
                    void supabase.removeChannel(channel);
                  }, 600);
                  resolve();
                });
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              resolve();
            }
          });
        });
      }

      setCallSentSuccess(true);
      showToast(`Pedido enviado para a equipa (Mesa ${selectedTableNumber})`);
      setTimeout(() => {
        setCallSentSuccess(false);
        setIsServiceModalOpen(false);
        setCustomerNif('');
      }, 1500);
    } catch {
      showToast('Não foi possível enviar o alerta. Tenta novamente.');
    } finally {
      setIsSendingCall(false);
    }
  };

  return (
    <>
      <header className="w-full bg-white border-b border-zinc-200/80">
        <div className="max-w-4xl mx-auto px-4 pt-3.5 pb-4">
          {/* Barra Superior Minimalista */}
          <div className="flex items-center justify-between gap-2">
            {/* Marca Gulas */}
            <Link href="/" className="flex items-center gap-2.5 group min-w-0">
              <Image
                src="/images/logo.jpg"
                alt="Gulas — Pizza, Burger & Coffee"
                width={40}
                height={40}
                className="w-9 h-9 rounded-xl object-contain bg-zinc-50 border border-zinc-200/80 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-bold text-base tracking-tight text-zinc-900 leading-none block truncate">
                  {restaurant.name}
                </span>
                <span className="text-[11px] font-normal text-zinc-500 leading-none block mt-0.5 truncate">
                  {restaurant.tagline || 'Pizza · Burger · Coffee'}
                </span>
              </div>
            </Link>

            {/* Controlos de Serviço: Mesa / Take-Away, Chamar Staff e Carrinho */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {!hasMounted ? (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 text-xs font-medium text-transparent select-none animate-pulse"
                  aria-hidden="true"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="invisible">Mesa 00</span>
                </div>
              ) : selectedTableNumber === 0 ? (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Pedido configurado para Take-Away. Clica para alterar."
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Take-Away</span>
                </button>
              ) : selectedTableNumber !== null && selectedTableNumber > 0 ? (
                <>
                  {isTableLocked ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200/80 text-xs font-medium text-zinc-900">
                      <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Mesa {selectedTableNumber}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsCartOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200/80 text-xs font-medium text-zinc-900 hover:bg-zinc-200/70 transition-colors cursor-pointer"
                      title="Alterar mesa ou mudar para Take-Away"
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Mesa {selectedTableNumber}</span>
                    </button>
                  )}

                  {/* Botão Chamar Staff / Pedir Conta */}
                  <button
                    type="button"
                    onClick={() => setIsServiceModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:border-zinc-300 transition-colors cursor-pointer"
                    title="Pedir a conta ou chamar staff à mesa"
                  >
                    <BellRing className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="hidden sm:inline">Conta / Staff</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-800 hover:bg-zinc-200/70 transition-colors cursor-pointer"
                  title="Escolher mesa ou opção Take-Away"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Mesa / Levar</span>
                </button>
              )}

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-xl bg-zinc-100 border border-zinc-200/80 text-zinc-900 hover:bg-zinc-200/70 transition-colors cursor-pointer"
                aria-label="Abrir pedido"
              >
                <ShoppingBag className="w-4 h-4 text-zinc-800" />
                {hasMounted && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full bg-zinc-900 text-white text-[10px] font-bold flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Cartão Editorial Compacto */}
          <div className="mt-3.5 relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-200/60">
            <div className="relative h-28 sm:h-36 w-full">
              <Image
                src="/images/cover.jpg"
                alt="Gulas — Pizza, Burger & Coffee"
                fill
                priority
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/45 to-zinc-950/15" />

              <div className="absolute bottom-3.5 left-4 right-4 flex items-end justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-300 mb-0.5">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    <span>Vila das Aves</span>
                    {restaurant.openingHours && (
                      <>
                        <span className="text-zinc-500">·</span>
                        <Clock className="w-3 h-3 text-zinc-400 hidden sm:inline" />
                        <span className="hidden sm:inline">{restaurant.openingHours}</span>
                      </>
                    )}
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                    {restaurant.fullName || restaurant.name}
                  </h1>
                </div>

                {/* Estado Dinâmico */}
                {restaurant.isOpen ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[11px] font-semibold text-zinc-900 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Aberto</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/90 border border-white/15 text-[11px] font-semibold text-rose-200 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>Encerrado</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!restaurant.isOpen && (
            <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-rose-50/80 border border-rose-200/80 text-xs font-medium text-rose-900 flex items-center justify-between gap-2">
              <span>O restaurante encontra-se encerrado de momento para novos pedidos.</span>
              {restaurant.openingHours && (
                <span className="text-[11px] font-mono text-rose-700 shrink-0 hidden sm:inline">
                  {restaurant.openingHours}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Modal Minimalista de Assistência na Mesa (Pedir Conta / Chamar Staff) */}
      {isServiceModalOpen && selectedTableNumber && selectedTableNumber > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs"
          onClick={() => setIsServiceModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white border border-zinc-200 p-5 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
                  Mesa {selectedTableNumber}
                </span>
                <h2 className="text-base font-bold text-zinc-900">
                  Assistência na Mesa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {callSentSuccess ? (
              <div className="py-6 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-zinc-900">
                  A equipa já recebeu o teu pedido!
                </p>
                <p className="text-xs text-zinc-500">
                  Um membro do staff irá dirigir-se à Mesa {selectedTableNumber} em breve.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendTableRequest} className="space-y-3.5">
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSelectedRequestType('bill_card')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedRequestType === 'bill_card'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold block">
                        Pedir a Conta · Multibanco / MB WAY
                      </span>
                      <span
                        className={`text-[11px] ${
                          selectedRequestType === 'bill_card'
                            ? 'text-zinc-300'
                            : 'text-zinc-500'
                        }`}
                      >
                        O staff leva o terminal de pagamento à mesa
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRequestType('bill_cash')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedRequestType === 'bill_cash'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <Banknote className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold block">
                        Pedir a Conta · Dinheiro
                      </span>
                      <span
                        className={`text-[11px] ${
                          selectedRequestType === 'bill_cash'
                            ? 'text-zinc-300'
                            : 'text-zinc-500'
                        }`}
                      >
                        Pagamento em numerário na mesa
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRequestType('call_staff')}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedRequestType === 'call_staff'
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <HandHelping className="w-4 h-4 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold block">
                        Chamar Staff à Mesa
                      </span>
                      <span
                        className={`text-[11px] ${
                          selectedRequestType === 'call_staff'
                            ? 'text-zinc-300'
                            : 'text-zinc-500'
                        }`}
                      >
                        Dúvida, guardanapos, talheres ou assistência
                      </span>
                    </div>
                  </button>
                </div>

                {selectedRequestType !== 'call_staff' && (
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                      NIF na fatura (opcional)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={9}
                      value={customerNif}
                      onChange={(e) => setCustomerNif(e.target.value.replace(/\D/g, ''))}
                      placeholder="Ex: 123456789"
                      className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-900"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSendingCall}
                  className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSendingCall ? 'A chamar staff...' : 'Confirmar Pedido à Equipa'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
