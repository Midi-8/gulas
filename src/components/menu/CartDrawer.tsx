'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Product } from '@/types/restaurant';
import { useCart } from '@/context/CartContext';
import { useActiveOrderTracker } from '@/hooks/useActiveOrderTracker';
import { formatCurrency, mockTables } from '@/data/mockRestaurant';
import {
  X,
  Trash2,
  Plus,
  Minus,
  Utensils,
  ShoppingBag,
  User,
  Phone,
  PackagePlus,
  Sparkles,
} from 'lucide-react';

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

  // Sugestões inteligentes de Cross-Sell (bebidas, acompanhamentos e sobremesas ainda não no carrinho)
  const crossSellSuggestions = useMemo(() => {
    if (items.length === 0 || allProducts.length === 0) return [];
    const cartProductIds = new Set(items.map((i) => i.product.id));
    const preferredKeywords = [
      'batata rústica',
      'palitos do bosque',
      'bolo do caco',
      'sangria a copo',
      'la rosa ipa',
      'bolinho de bolacha',
      'sorvete',
      'limontejo',
    ];

    const matches = allProducts.filter((p) => {
      if (!p.available || cartProductIds.has(p.id) || p.price <= 0) return false;
      const lower = p.name.toLowerCase();
      if (lower.includes('caixa take away')) return false;
      return preferredKeywords.some((kw) => lower.includes(kw));
    });

    // Deduplica por nome
    const seen = new Set<string>();
    const unique: Product[] = [];
    for (const m of matches) {
      const key = m.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(m);
      }
      if (unique.length >= 4) break;
    }
    return unique;
  }, [items, allProducts]);

  if (!isCartOpen) return null;

  const hasFamiliarPizza = items.some((i) =>
    i.product.unitQuantity?.toLowerCase().includes('familiar')
  );

  const takeAwayBoxes = allProducts.filter(
    (p) => p.available && p.name.toLowerCase().includes('caixa take away')
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
        setErrorMessage(
          'Por favor introduz o teu nome para identificar o pedido Take-Away.'
        );
        return;
      }
    } else {
      if (hasFamiliarPizza) {
        setErrorMessage(
          'As pizzas de tamanho Familiar são exclusivas para o serviço Take-Away. Por favor muda o tipo de pedido para "Levar / Take-Away" ou substitui pelo tamanho Normal.'
        );
        return;
      }
      if (
        selectedTableNumber === null ||
        selectedTableNumber === undefined ||
        selectedTableNumber <= 0
      ) {
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
        const takeAwayHeader = `[TAKE-AWAY] Cliente: ${customerName.trim()}${
          customerPhone.trim() ? ` (Tel: ${customerPhone.trim()})` : ''
        }`;
        finalCustomerNotes = finalCustomerNotes
          ? `${takeAwayHeader}\nNotas: ${finalCustomerNotes}`
          : takeAwayHeader;
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
        <div className="px-5 py-4 border-b border-zinc-200/80 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-zinc-900" />
            <h2 className="text-base font-bold text-zinc-900">O teu Pedido</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
              {items.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-medium text-zinc-400 hover:text-rose-600 px-2 py-1 rounded transition-colors cursor-pointer"
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
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#FAFAFA]">
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-zinc-400 mb-3 border border-zinc-200/80">
              <Utensils className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">
              O teu pedido está vazio
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed mb-5">
              Seleciona os teus pratos, entradas ou bebidas no menu para iniciar o pedido.
            </p>
            <button
              onClick={() => setIsCartOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all cursor-pointer"
            >
              Explorar Menu
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAFAFA]">
            {/* Tipo de Pedido: Sala vs Take-Away */}
            <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 space-y-3">
              {!isTableLocked && (
                <div className="flex p-1 bg-zinc-100 rounded-xl border border-zinc-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('dine_in');
                      if (selectedTableNumber === 0) setSelectedTableNumber(null);
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderType === 'dine_in'
                        ? 'bg-white text-zinc-900 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Na Mesa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('takeaway');
                      setSelectedTableNumber(0);
                      setErrorMessage(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      orderType === 'takeaway'
                        ? 'bg-zinc-900 text-white shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Take-Away</span>
                  </button>
                </div>
              )}

              {orderType === 'dine_in' && hasFamiliarPizza && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2">
                  <p className="text-[11px] text-amber-900 font-medium leading-snug">
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
                      className="w-full py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                    >
                      Mudar para Take-Away
                    </button>
                  )}
                </div>
              )}

              {orderType === 'dine_in' ? (
                <div className="space-y-1.5">
                  <label
                    htmlFor="cart-table-select"
                    className="text-xs font-semibold text-zinc-900 flex items-center justify-between"
                  >
                    <span>Mesa de Entrega</span>
                    {isTableLocked ? (
                      <span className="text-[10px] text-zinc-500 font-medium">
                        Associada via QR
                      </span>
                    ) : !selectedTableNumber || selectedTableNumber <= 0 ? (
                      <span className="text-[10px] text-zinc-500 font-medium">
                        Obrigatório
                      </span>
                    ) : null}
                  </label>
                  <select
                    id="cart-table-select"
                    disabled={isTableLocked}
                    value={
                      selectedTableNumber && selectedTableNumber > 0
                        ? selectedTableNumber
                        : ''
                    }
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setSelectedTableNumber(val);
                      if (val) setErrorMessage(null);
                    }}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-medium text-zinc-900 focus:outline-none focus:border-zinc-900 disabled:opacity-75 cursor-pointer ${
                      !selectedTableNumber || selectedTableNumber <= 0
                        ? 'bg-zinc-50 border-zinc-300'
                        : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <option value="">Seleciona a tua mesa (1 a 20)</option>
                    {mockTables.map((t) => (
                      <option key={t.id} value={t.number}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {takeAwayBoxes.length > 0 && !hasTakeAwayBoxInCart && (
                    <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1.5">
                      <span className="text-[11px] font-semibold text-zinc-800 flex items-center gap-1.5">
                        <PackagePlus className="w-3.5 h-3.5 text-zinc-600" />
                        Adicionar Caixa de Take-Away?
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {takeAwayBoxes.map((box) => (
                          <button
                            key={box.id}
                            type="button"
                            onClick={() => addItem(box, 1)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-[11px] font-medium text-zinc-900 transition-colors cursor-pointer"
                          >
                            + {box.name} ({formatCurrency(box.price)})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label
                      htmlFor="takeaway-name"
                      className="text-xs font-semibold text-zinc-900 flex items-center gap-1"
                    >
                      <User className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Nome para recolha *</span>
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
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      htmlFor="takeaway-phone"
                      className="text-xs font-semibold text-zinc-900 flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Telemóvel (opcional)</span>
                    </label>
                    <input
                      id="takeaway-phone"
                      type="tel"
                      placeholder="Ex: 912 345 678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Artigos no Pedido */}
            <div className="space-y-2">
              {items.map(({ product, quantity, notes }) => (
                <div
                  key={product.id}
                  className={`p-3.5 rounded-2xl bg-white border flex items-start gap-3 transition-all ${
                    !product.available
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-zinc-200/80'
                  }`}
                >
                  {product.imageUrl && (
                    <div className="relative w-13 h-13 rounded-xl overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200/60">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="52px"
                        className={`object-cover ${!product.available ? 'grayscale' : ''}`}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 truncate">
                            {product.name}
                          </h4>
                          {product.unitQuantity && (
                            <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200/80 text-[10px] font-medium text-zinc-600">
                              {product.unitQuantity}
                            </span>
                          )}
                        </div>
                        {!product.available && (
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-semibold">
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

                    {notes && (
                      <p className="text-[11px] text-zinc-500 bg-zinc-50 px-2 py-1 rounded-lg mt-1.5 line-clamp-2 border border-zinc-200/60">
                        {notes}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-xs font-semibold font-mono text-zinc-900">
                        {formatCurrency(product.price * quantity)}
                      </span>

                      <div className="flex items-center gap-1 bg-zinc-100 border border-zinc-200/80 rounded-full p-0.5">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-6 h-6 rounded-full bg-white text-zinc-900 hover:bg-zinc-200 flex items-center justify-center cursor-pointer"
                          aria-label="Diminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-semibold font-mono text-zinc-900 w-4 text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          disabled={!product.available}
                          className="w-6 h-6 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-40 flex items-center justify-center cursor-pointer"
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

            {/* Sugestões Inteligentes de Cross-Sell (Bloco 2) */}
            {crossSellSuggestions.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Completa a tua refeição</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  {crossSellSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className="min-w-[155px] max-w-[175px] p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 flex flex-col justify-between gap-2 shrink-0"
                    >
                      <div>
                        <p className="text-xs font-semibold text-zinc-900 line-clamp-1">
                          {suggestion.name}
                        </p>
                        <span className="text-[11px] font-mono text-zinc-500">
                          {formatCurrency(suggestion.price)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addItem(suggestion, 1)}
                        className="w-full py-1.5 px-2 rounded-lg bg-white hover:bg-zinc-900 text-zinc-900 hover:text-white border border-zinc-200 hover:border-zinc-900 text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações gerais */}
            <div>
              <label
                htmlFor="general-order-notes"
                className="text-xs font-semibold text-zinc-700 block mb-1"
              >
                Observações para a cozinha (opcional)
              </label>
              <input
                id="general-order-notes"
                type="text"
                maxLength={1000}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex: trazer tudo junto, sem cebola..."
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200/80 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
              />
            </div>

            {!isRestaurantOpen && (
              <div className="p-3 rounded-xl bg-rose-50/80 border border-rose-200 text-xs font-medium text-rose-900">
                O restaurante encontra-se encerrado de momento. A submissão de novos pedidos está pausada.
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
          <div className="p-4 bg-white border-t border-zinc-200/80 space-y-3">
            <div className="space-y-1 text-xs text-zinc-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-zinc-900 font-semibold font-mono">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1.5 border-t border-zinc-100">
                <span>Total (IVA incluído)</span>
                <span className="font-mono">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleConfirmOrder}
              disabled={isSubmitting || !isRestaurantOpen}
              className="w-full py-3.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 text-white disabled:text-zinc-400 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>A enviar pedido...</span>
                </div>
              ) : !isRestaurantOpen ? (
                <span>Restaurante Encerrado</span>
              ) : (
                <span>Submeter Pedido · {formatCurrency(total)}</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
