'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { formatCurrency, mockTables } from '@/data/mockRestaurant';
import { X, Trash2, Plus, Minus, Utensils, ShoppingBag } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    total,
    selectedTableNumber,
    setSelectedTableNumber,
    isTableLocked,
    submitOrder,
    isSubmitting,
  } = useCart();

  const [orderNotes, setOrderNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    if (items.length === 0) return;
    if (!selectedTableNumber) {
      setErrorMessage('Por favor escolhe a mesa onde estás sentado.');
      return;
    }

    setErrorMessage(null);
    try {
      await submitOrder(orderNotes.trim() || undefined);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocorreu um erro ao submeter o pedido.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 text-[#141619]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#15803D]" />
            <h2 className="text-base font-black text-[#141619]">O teu Pedido</h2>
            <span className="text-xs font-semibold text-zinc-500">
              ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-zinc-400 hover:text-red-600 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Limpar
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fechar carrinho"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#141619] mb-1">O teu pedido está vazio</h3>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mb-5">
              Escolhe os teus caracóizzz, burgers ou pizzas no menu para adicionar.
            </p>
            <button
              onClick={() => setIsCartOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold transition-all cursor-pointer"
            >
              Ver Menu
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF8F5]">
            {/* Table Selection */}
            <div className={`p-3 rounded-xl bg-white border space-y-1.5 transition-all ${
              !selectedTableNumber
                ? 'border-amber-400 bg-amber-50/20 ring-2 ring-amber-200/60'
                : 'border-zinc-200/80'
            }`}>
              <label htmlFor="cart-table-select" className="text-xs font-bold text-[#141619] flex items-center justify-between">
                <span>Mesa de Entrega:</span>
                {isTableLocked ? (
                  <span className="text-[10px] text-[#15803D] font-bold">Bloqueada por QR</span>
                ) : !selectedTableNumber ? (
                  <span className="text-[10px] text-amber-700 font-bold">Obrigatório</span>
                ) : null}
              </label>
              <select
                id="cart-table-select"
                disabled={isTableLocked}
                value={selectedTableNumber ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedTableNumber(val);
                  if (val) setErrorMessage(null);
                }}
                className={`w-full px-3 py-1.5 rounded-lg border text-xs font-semibold text-[#141619] focus:outline-none focus:border-[#15803D] disabled:opacity-75 cursor-pointer ${
                  !selectedTableNumber ? 'bg-amber-50/50 border-amber-300' : 'bg-zinc-50 border-zinc-200'
                }`}
              >
                <option value="">-- Escolhe a tua mesa --</option>
                {mockTables.map((t) => (
                  <option key={t.id} value={t.number}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Item list */}
            <div className="space-y-2.5">
              {items.map(({ product, quantity, notes }) => (
                <div
                  key={product.id}
                  className="p-3 rounded-xl bg-white border border-zinc-200/80 flex items-start gap-3 shadow-2xs"
                >
                  {product.imageUrl && (
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-100">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs sm:text-sm font-bold text-[#141619] truncate">
                        {product.name}
                      </h4>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-zinc-400 hover:text-red-600 p-0.5 transition-colors cursor-pointer"
                        aria-label="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-[#15803D] font-black mt-0.5">
                      {formatCurrency(product.price * quantity)}
                    </p>

                    {notes && (
                      <p className="text-[11px] text-zinc-500 italic bg-zinc-50 px-2 py-0.5 rounded mt-1 line-clamp-1 border border-zinc-100">
                        &ldquo;{notes}&rdquo;
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-400 font-medium">
                        {formatCurrency(product.price)} un.
                      </span>

                      {/* Quantity buttons */}
                      <div className="flex items-center gap-1.5 bg-zinc-100 border border-zinc-200 rounded-full p-0.5">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-5 h-5 rounded-full bg-white text-zinc-700 hover:bg-zinc-200 flex items-center justify-center cursor-pointer shadow-2xs"
                          aria-label="Diminuir"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-xs font-bold text-[#141619] w-4 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="w-5 h-5 rounded-full bg-[#15803D] text-white hover:bg-[#166534] flex items-center justify-center cursor-pointer shadow-2xs"
                          aria-label="Aumentar"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* General notes */}
            <div className="pt-1">
              <label htmlFor="general-order-notes" className="text-xs font-bold text-[#141619] block mb-1">
                Observações para a cozinha (opcional)
              </label>
              <input
                id="general-order-notes"
                type="text"
                maxLength={1000}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: trazer tudo junto, conta separada..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-[#141619] placeholder-zinc-400 focus:outline-none focus:border-[#15803D]"
              />
            </div>

            {errorMessage && (
              <p className="text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        {/* Footer with totals & checkout */}
        {items.length > 0 && (
          <div className="p-4 bg-white border-t border-zinc-200 space-y-3">
            <div className="space-y-1 text-xs text-zinc-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[#141619] font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>IVA incluído</span>
                <span>Incluso</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#141619] pt-1.5 border-t border-zinc-100">
                <span>Total</span>
                <span className="text-[#15803D]">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-[#15803D] hover:bg-[#166534] disabled:bg-zinc-200 text-white disabled:text-zinc-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/10 active:scale-[0.99] cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>A enviar pedido...</span>
                </div>
              ) : (
                <span>Confirmar Pedido</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
