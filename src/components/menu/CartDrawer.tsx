'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/types/restaurant';
import { useCart } from '@/context/CartContext';
import { useActiveOrderTracker } from '@/hooks/useActiveOrderTracker';
import { formatCurrency, mockTables } from '@/data/mockRestaurant';
import { X, Trash2, Plus, Minus, Utensils, ShoppingBag, User, Phone, PackagePlus } from 'lucide-react';

interface CartDrawerProps {
  isRestaurantOpen?: boolean;
  allProducts?: Product[];
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isRestaurantOpen = true,
  allProducts = [],
}) => {
  const {
    items,
    addItem,
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
  const { setActiveOrderId } = useActiveOrderTracker();

  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>(
    selectedTableNumber === 0 ? 'takeaway' : 'dine_in'
  );
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isCartOpen) return null;

  const hasFamiliarPizza = items.some((i) =>
    i.product.unitQuantity?.toLowerCase().includes('familiar')
  );

  // Procura "Caixa Take Away" disponível no catálogo caso o pedido seja Take-Away
  const takeAwayBoxes = allProducts.filter(
    (p) =>
      p.available &&
      p.name.toLowerCase().includes('caixa take away')
  );
  const hasTakeAwayBoxInCart = items.some((i) =>
    i.product.name.toLowerCase().includes('caixa take away')
  );

  const handleConfirmOrder = async () => {
    if (isSubmitting) return;
    if (items.length === 0) return;

    if (!isRestaurantOpen) {
      setErrorMessage(
        'O restaurante encontra-se encerrado de momento e não está a aceitar pedidos.'
      );
      return;
    }

    if (orderType === 'takeaway') {
      if (!customerName.trim()) {
        setErrorMessage('Por favor introduz o teu nome para identificar o pedido Take-Away.');
        return;
      }
    } else {
      if (hasFamiliarPizza) {
        setErrorMessage(
          'As pizzas de tamanho Familiar são exclusivas para o serviço Take-Away. Por favor muda o tipo de pedido para "Levar / Take-Away" ou substitui pelo tamanho Normal.'
        );
        return;
      }
      if (selectedTableNumber === null || selectedTableNumber === undefined || selectedTableNumber <= 0) {
        setErrorMessage('Por favor escolhe a mesa onde estás sentado.');
        return;
      }
    }

    const unavailableItem = items.find((i) => !i.product.available);
    if (unavailableItem) {
      setErrorMessage(
        `O artigo "${unavailableItem.product.name}" encontra-se temporariamente esgotado. Por favor remove-o do teu pedido para prosseguir.`
      );
      return;
    }

    setErrorMessage(null);
    try {
      let finalCustomerNotes = orderNotes.trim();
      if (orderType === 'takeaway') {
        const takeAwayHeader = `[TAKE-AWAY] Cliente: ${customerName.trim()}${customerPhone.trim() ? ` (Tel: ${customerPhone.trim()})` : ''}`;
        finalCustomerNotes = finalCustomerNotes ? `${takeAwayHeader}\nNotas: ${finalCustomerNotes}` : takeAwayHeader;
      }

      const createdOrder = await submitOrder(finalCustomerNotes || undefined);
      if (createdOrder?.id) {
        try {
          localStorage.setItem('gulas_active_order_id', createdOrder.id);
        } catch {
          // ignore
        }
        setActiveOrderId(createdOrder.id, createdOrder);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Ocorreu um erro ao submeter o pedido.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={() => setIsCartOpen(false)}
    >
      <div
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-600" />
            <h2 className="text-base font-black text-zinc-950">O teu Pedido</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {items.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-zinc-400 hover:text-rose-600 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Limpar
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fechar carrinho"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-zinc-50/50">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3 border border-zinc-200">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 mb-1">O teu pedido está vazio</h3>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mb-5">
              Escolhe os teus caracóizzz, burgers ou pizzas no menu para adicionar.
            </p>
            <button
              onClick={() => setIsCartOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Ver Menu
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-50">
            {/* Tipo de Pedido: Sala vs Take-Away */}
            <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 space-y-3 shadow-2xs">
              {!isTableLocked && (
                <div className="flex p-1 bg-zinc-100 rounded-xl border border-zinc-200/70">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('dine_in');
                      if (selectedTableNumber === 0) setSelectedTableNumber(null);
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderType === 'dine_in'
                        ? 'bg-white text-zinc-950 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>No Restaurante</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('takeaway');
                      setSelectedTableNumber(0);
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderType === 'takeaway'
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Levar / Take-Away</span>
                  </button>
                </div>
              )}

              {orderType === 'dine_in' && hasFamiliarPizza && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <p className="text-[11px] text-amber-900 font-semibold leading-snug">
                    Tens uma pizza de tamanho <strong>Familiar</strong> no pedido (exclusiva para Take-Away).
                  </p>
                  {!isTableLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderType('takeaway');
                        setSelectedTableNumber(0);
                        setErrorMessage(null);
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Mudar para Levar / Take-Away
                    </button>
                  )}
                </div>
              )}

              {orderType === 'dine_in' ? (
                <div className="space-y-1.5">
                  <label htmlFor="cart-table-select" className="text-xs font-bold text-zinc-900 flex items-center justify-between">
                    <span>Mesa de Entrega:</span>
                    {isTableLocked ? (
                      <span className="text-[10px] text-orange-600 font-bold">Bloqueada por QR</span>
                    ) : (!selectedTableNumber || selectedTableNumber <= 0) ? (
                      <span className="text-[10px] text-orange-600 font-bold">Obrigatório</span>
                    ) : null}
                  </label>
                  <select
                    id="cart-table-select"
                    disabled={isTableLocked}
                    value={(selectedTableNumber && selectedTableNumber > 0) ? selectedTableNumber : ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setSelectedTableNumber(val);
                      if (val) setErrorMessage(null);
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold text-zinc-900 focus:outline-none focus:border-zinc-900 disabled:opacity-75 cursor-pointer ${
                      (!selectedTableNumber || selectedTableNumber <= 0) ? 'bg-orange-50/50 border-orange-300' : 'bg-zinc-50 border-zinc-200'
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
              ) : (
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                    <p className="text-[11px] text-zinc-700 font-medium leading-relaxed">
                      🛍️ <strong>Take-Away:</strong> O teu pedido será preparado para levar e chamado ao balcão.
                    </p>
                  </div>

                  {/* Sugestão rápida de Caixa Take-Away se ainda não estiver no carrinho */}
                  {takeAwayBoxes.length > 0 && !hasTakeAwayBoxInCart && (
                    <div className="p-2.5 rounded-xl bg-orange-50/70 border border-orange-200/80 space-y-1.5">
                      <span className="text-[11px] font-bold text-orange-950 flex items-center gap-1.5">
                        <PackagePlus className="w-3.5 h-3.5 text-orange-600" />
                        Adicionar Caixa de Take-Away?
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {takeAwayBoxes.map((box) => (
                          <button
                            key={box.id}
                            type="button"
                            onClick={() => addItem(box, 1)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-orange-100 border border-orange-200 text-[11px] font-bold text-zinc-900 transition-colors cursor-pointer"
                          >
                            + {box.name} ({formatCurrency(box.price)})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="takeaway-name" className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-orange-600" />
                      <span>Nome para levantar:</span>
                      <span className="text-[10px] text-orange-600 font-bold">*</span>
                    </label>
                    <input
                      id="takeaway-name"
                      type="text"
                      placeholder="Ex: Miguel Silva"
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        if (e.target.value.trim()) setErrorMessage(null);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="takeaway-phone" className="text-xs font-bold text-zinc-900 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-orange-600" />
                      <span>Telemóvel (opcional):</span>
                    </label>
                    <input
                      id="takeaway-phone"
                      type="tel"
                      placeholder="Ex: 912 345 678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Item list */}
            <div className="space-y-2.5">
              {items.map(({ product, quantity, notes }) => (
                <div
                  key={product.id}
                  className={`p-3.5 rounded-2xl bg-white border flex items-start gap-3 shadow-2xs transition-all ${
                    !product.available
                      ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-300'
                      : 'border-zinc-200/80'
                  }`}
                >
                  {product.imageUrl && (
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200/70">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="56px"
                        className={`object-cover ${!product.available ? 'grayscale' : ''}`}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 truncate">
                            {product.name}
                          </h4>
                          {product.unitQuantity && (
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-bold text-zinc-700">
                              {product.unitQuantity}
                            </span>
                          )}
                        </div>
                        {!product.available && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                            Temporariamente Esgotado
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-zinc-400 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                        aria-label="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-zinc-950 font-black font-mono mt-0.5">
                      {formatCurrency(product.price * quantity)}
                    </p>

                    {notes && (
                      <p className="text-[11px] text-zinc-600 italic bg-zinc-50 px-2 py-0.5 rounded-md mt-1 line-clamp-2 border border-zinc-200/70">
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
                          className="w-6 h-6 rounded-full bg-white text-zinc-900 hover:bg-zinc-200 flex items-center justify-center cursor-pointer shadow-2xs"
                          aria-label="Diminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-zinc-900 w-4 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={!product.available}
                          className="w-6 h-6 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center cursor-pointer shadow-2xs"
                          aria-label="Aumentar"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* General notes */}
            <div className="pt-1">
              <label htmlFor="general-order-notes" className="text-xs font-bold text-zinc-900 block mb-1">
                Observações para a cozinha (opcional)
              </label>
              <input
                id="general-order-notes"
                type="text"
                maxLength={1000}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: trazer tudo junto, conta separada..."
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
              />
            </div>

            {!isRestaurantOpen && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-900">
                O restaurante encontra-se temporariamente encerrado. Podes consultar o teu carrinho, mas a submissão de pedidos está pausada.
              </div>
            )}

            {errorMessage && (
              <p className="text-xs text-rose-800 bg-rose-50 p-3 rounded-xl border border-rose-200 font-medium">
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
                <span className="text-zinc-900 font-bold font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>IVA incluído</span>
                <span>Incluso</span>
              </div>
              <div className="flex justify-between text-base font-black text-zinc-950 pt-1.5 border-t border-zinc-100">
                <span>Total</span>
                <span className="text-orange-600 font-mono">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting || !isRestaurantOpen}
              className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 text-white disabled:text-zinc-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>A enviar pedido...</span>
                </div>
              ) : !isRestaurantOpen ? (
                <span>Restaurante Encerrado</span>
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
