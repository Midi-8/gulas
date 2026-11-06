'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { useActiveOrderTracker } from '@/hooks/useActiveOrderTracker';
import { formatCurrency, mockTables } from '@/data/mockRestaurant';
import { X, Trash2, Plus, Minus, Utensils, ShoppingBag, User, Phone } from 'lucide-react';

interface CartDrawerProps {
  isRestaurantOpen?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isRestaurantOpen = true,
}) => {
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

    // Check if any cart item is currently out of stock
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
    <div className="fixed inset-0 z-50 flex justify-end bg-[#35271F]/40 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#FFFFFF] h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-250 text-[#35271F]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#E5DED6] flex items-center justify-between bg-[#FFFFFF]">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#C09573]" />
            <h2 className="text-base font-black text-[#35271F]">O teu Pedido</h2>
            <span className="text-xs font-semibold text-[#4C453F]">
              ({items.reduce((acc, i) => acc + i.quantity, 0)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-[#A89F95] hover:text-rose-600 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Limpar
              </button>
            )}
            <button
              onClick={() => setIsCartOpen(false)}
              className="w-8 h-8 rounded-full bg-[#EAE5DF] text-[#4C453F] hover:bg-[#E5DED6] flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Fechar carrinho"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-[#EAE5DF] flex items-center justify-center text-[#A89F95] mb-3 border border-[#E5DED6]">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#35271F] mb-1">O teu pedido está vazio</h3>
            <p className="text-xs text-[#4C453F] max-w-xs leading-relaxed mb-5">
              Escolhe os teus caracóizzz, burgers ou pizzas no menu para adicionar.
            </p>
            <button
              onClick={() => setIsCartOpen(false)}
              className="px-4 py-2 rounded-xl bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Ver Menu
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F5F4F1]">
            {/* Tipo de Pedido: Sala vs Take-Away */}
            <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#E5DED6] space-y-2.5">
              {!isTableLocked && (
                <div className="flex p-0.5 bg-[#EAE5DF] rounded-lg border border-[#E5DED6]">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('dine_in');
                      if (selectedTableNumber === 0) setSelectedTableNumber(null);
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderType === 'dine_in'
                        ? 'bg-[#FFFFFF] text-[#35271F] shadow-xs'
                        : 'text-[#4C453F] hover:text-[#35271F]'
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
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderType === 'takeaway'
                        ? 'bg-[#5E4939] text-[#F5F4F1] shadow-xs'
                        : 'text-[#4C453F] hover:text-[#35271F]'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Levar / Take-Away</span>
                  </button>
                </div>
              )}

              {orderType === 'dine_in' && hasFamiliarPizza && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 space-y-2">
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
                      className="w-full py-1.5 px-2.5 rounded-md bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] text-[11px] font-bold transition-colors cursor-pointer"
                    >
                      Mudar para Levar / Take-Away
                    </button>
                  )}
                </div>
              )}

              {orderType === 'dine_in' ? (
                <div className="space-y-1.5">
                  <label htmlFor="cart-table-select" className="text-xs font-bold text-[#35271F] flex items-center justify-between">
                    <span>Mesa de Entrega:</span>
                    {isTableLocked ? (
                      <span className="text-[10px] text-[#C09573] font-bold">Bloqueada por QR</span>
                    ) : (!selectedTableNumber || selectedTableNumber <= 0) ? (
                      <span className="text-[10px] text-[#C09573] font-bold">Obrigatório</span>
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
                    className={`w-full px-3 py-1.5 rounded-lg border text-xs font-semibold text-[#35271F] focus:outline-none focus:border-[#C09573] disabled:opacity-75 cursor-pointer ${
                      (!selectedTableNumber || selectedTableNumber <= 0) ? 'bg-[#FFFFFF] border-[#C09573]/50' : 'bg-[#F5F4F1] border-[#E5DED6]'
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
                <div className="space-y-2">
                  <div className="p-2 bg-[#EAE5DF]/60 border border-[#E5DED6] rounded-lg">
                    <p className="text-[11px] text-[#5E4939] font-medium leading-relaxed">
                      🛍️ <strong>Take-Away:</strong> O teu pedido será embalado e chamado ao balcão para levantamento.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="takeaway-name" className="text-xs font-bold text-[#35271F] flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#C09573]" />
                      <span>Nome para levantar:</span>
                      <span className="text-[10px] text-[#C09573] font-bold">*</span>
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
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5DED6] bg-[#F5F4F1] text-xs font-semibold text-[#35271F] placeholder-[#A89F95] focus:outline-none focus:border-[#C09573] focus:bg-[#FFFFFF]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="takeaway-phone" className="text-xs font-bold text-[#35271F] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#C09573]" />
                      <span>Telemóvel (opcional):</span>
                    </label>
                    <input
                      id="takeaway-phone"
                      type="tel"
                      placeholder="Ex: 912 345 678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-[#E5DED6] bg-[#F5F4F1] text-xs font-semibold text-[#35271F] placeholder-[#A89F95] focus:outline-none focus:border-[#C09573] focus:bg-[#FFFFFF]"
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
                  className={`p-3 rounded-xl bg-white border flex items-start gap-3 shadow-2xs transition-all ${
                    !product.available
                      ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-300'
                      : 'border-[#E5DED6]'
                  }`}
                >
                  {product.imageUrl && (
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#EAE5DF] shrink-0 border border-[#E5DED6]">
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
                          <h4 className="text-xs sm:text-sm font-bold text-[#35271F] truncate">
                            {product.name}
                          </h4>
                          {product.unitQuantity && (
                            <span className="px-1.5 py-0.2 rounded bg-[#EAE5DF] border border-[#E5DED6] text-[10px] font-bold text-[#5E4939]">
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
                        className="text-[#A89F95] hover:text-red-600 p-0.5 transition-colors cursor-pointer"
                        aria-label="Remover item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-[#35271F] font-black mt-0.5">
                      {formatCurrency(product.price * quantity)}
                    </p>

                    {notes && (
                      <p className="text-[11px] text-[#4C453F] italic bg-[#F5F4F1] px-2 py-0.5 rounded mt-1 line-clamp-1 border border-[#E5DED6]">
                        &ldquo;{notes}&rdquo;
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-[#A89F95] font-medium">
                        {formatCurrency(product.price)} un.
                      </span>

                      {/* Quantity buttons */}
                      <div className="flex items-center gap-1.5 bg-[#EAE5DF] border border-[#E5DED6] rounded-full p-0.5">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-5 h-5 rounded-full bg-[#FFFFFF] text-[#35271F] hover:bg-[#E5DED6] flex items-center justify-center cursor-pointer shadow-2xs"
                          aria-label="Diminuir"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-xs font-bold text-[#35271F] w-4 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={!product.available}
                          className="w-5 h-5 rounded-full bg-[#5E4939] text-[#F5F4F1] hover:bg-[#453426] disabled:opacity-40 flex items-center justify-center cursor-pointer shadow-2xs"
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
              <label htmlFor="general-order-notes" className="text-xs font-bold text-[#35271F] block mb-1">
                Observações para a cozinha (opcional)
              </label>
              <input
                id="general-order-notes"
                type="text"
                maxLength={1000}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: trazer tudo junto, conta separada..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-[#E5DED6] text-xs text-[#35271F] placeholder-[#4C453F]/60 focus:outline-none focus:border-[#C09573]"
              />
            </div>

            {!isRestaurantOpen && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-900">
                O restaurante encontra-se temporariamente encerrado. Podes consultar o teu carrinho, mas a submissão de pedidos está pausada.
              </div>
            )}

            {errorMessage && (
              <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        {/* Footer with totals & checkout */}
        {items.length > 0 && (
          <div className="p-4 bg-white border-t border-[#E5DED6] space-y-3">
            <div className="space-y-1 text-xs text-[#4C453F]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-[#35271F] font-bold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>IVA incluído</span>
                <span>Incluso</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#35271F] pt-1.5 border-t border-[#E5DED6]">
                <span>Total</span>
                <span className="text-[#C09573]">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting || !isRestaurantOpen}
              className="w-full py-3 px-4 rounded-xl bg-[#5E4939] hover:bg-[#453426] disabled:bg-[#EAE5DF] text-[#F5F4F1] disabled:text-[#A89F95] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
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
