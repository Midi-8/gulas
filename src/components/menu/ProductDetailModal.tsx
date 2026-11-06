'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Category, Product } from '@/types/restaurant';
import { formatCurrency } from '@/data/mockRestaurant';
import { useCart } from '@/context/CartContext';
import { X, Plus, Minus, AlertCircle, Info, Clock, ShoppingBag, Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ProductDetailModalProps {
  product: Product | null;
  allProducts?: Product[];
  categories?: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSelectVariant?: (variant: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allProducts = [],
  categories = [],
  isOpen,
  onClose,
  onSelectVariant,
}) => {
  const { addItem, items, selectedTableNumber, isTableLocked, setSelectedTableNumber } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
  const [prevProductId, setPrevProductId] = useState<string | null>(null);

  // Inicializa sempre em 1 unidade para evitar duplicar acidentalmente a quantidade já no carrinho
  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    setQuantity(1);
    setNotes('');
    setSelectedExtraIds([]);
  }

  if (!isOpen || !product) return null;

  const existingInCart = items.find((i) => i.product.id === product.id);

  // Procura variantes de tamanho (ex: Pizzas Clássicas Normal vs Familiar, Cerveja 20cl vs 33cl)
  const sizeVariants =
    product.unitQuantity && allProducts.length > 0
      ? allProducts.filter(
          (p) =>
            p.categoryId === product.categoryId &&
            p.name.trim().toLowerCase() === product.name.trim().toLowerCase() &&
            Boolean(p.unitQuantity)
        )
      : [];

  const isFamiliar = Boolean(
    product.unitQuantity?.toLowerCase().includes('familiar')
  );

  // Determinar se este artigo suporta Ingredientes Extra (Pizza / Panuozzo ou Burger / Prego)
  const currentCategory = categories.find((c) => c.id === product.categoryId);
  const currentSlug = currentCategory?.slug || '';

  let targetExtrasSlug: string | null = null;
  if (
    currentSlug === 'pizzas-classicas' ||
    currentSlug === 'pizzas-especiais' ||
    currentSlug === 'panuozzos'
  ) {
    targetExtrasSlug = 'ingredientes-extra-pizza';
  } else if (currentSlug === 'burgers' || currentSlug === 'pregos') {
    targetExtrasSlug = 'ingredientes-extra-burger';
  }

  const extrasCategory = targetExtrasSlug
    ? categories.find((c) => c.slug === targetExtrasSlug)
    : undefined;

  const canCustomizeExtras = !product.customizationNote
    ?.toLowerCase()
    .includes('sem alterações');

  const availableExtras =
    extrasCategory && canCustomizeExtras
      ? allProducts.filter(
          (p) =>
            p.categoryId === extrasCategory.id &&
            p.available &&
            !p.name.toLowerCase().includes('alteração de produto') &&
            !p.name.toLowerCase().includes('caixa take away')
        )
      : [];

  const selectedExtrasProducts = availableExtras.filter((ext) =>
    selectedExtraIds.includes(ext.id)
  );
  const extrasUnitTotal = selectedExtrasProducts.reduce(
    (sum, ext) => sum + ext.price,
    0
  );

  const toggleExtra = (extraId: string) => {
    setSelectedExtraIds((prev) =>
      prev.includes(extraId)
        ? prev.filter((id) => id !== extraId)
        : [...prev, extraId]
    );
  };

  const handleAddToCart = () => {
    if (isFamiliar && !isTableLocked && selectedTableNumber === null) {
      setSelectedTableNumber(0);
    }

    const extraNamesNote =
      selectedExtrasProducts.length > 0
        ? `Extras: ${selectedExtrasProducts.map((e) => e.name).join(', ')}`
        : '';

    const combinedNotes = [extraNamesNote, notes.trim()]
      .filter(Boolean)
      .join(' | ');

    addItem(product, quantity, combinedNotes || undefined);

    selectedExtrasProducts.forEach((extraProd) => {
      addItem(
        extraProd,
        quantity,
        `Ref: ${product.name}${product.unitQuantity ? ` (${product.unitQuantity})` : ''}`
      );
    });

    onClose();
  };

  const totalPrice = (product.price + extrasUnitTotal) * quantity;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-250 border border-zinc-200 text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/95 text-zinc-900 hover:bg-zinc-100 border border-zinc-200 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Image */}
        {product.imageUrl && (
          <div className="relative h-48 sm:h-56 w-full bg-zinc-100 shrink-0 border-b border-zinc-100">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 512px"
              className="object-cover"
            />
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {product.badges?.map((badgeKey) => (
              <Badge key={badgeKey} badgeType={badgeKey} size="md" />
            ))}
            {product.unitQuantity && (
              <span className="text-xs text-zinc-700 font-bold px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200">
                {product.unitQuantity}
              </span>
            )}
            {product.prepTimeMinutes && (
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500 font-medium">
                <Clock className="w-3 h-3" />
                {product.prepTimeMinutes} min
              </span>
            )}
            {existingInCart && (
              <span className="text-xs text-orange-700 font-bold px-2.5 py-0.5 rounded-full bg-orange-50 border border-orange-200">
                Já no pedido: {existingInCart.quantity}×
              </span>
            )}
          </div>

          {/* Title & Price */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-black text-zinc-950 tracking-tight">
              {product.name}
            </h2>
            <span className="text-lg sm:text-xl font-black font-mono text-orange-600 shrink-0">
              {formatCurrency(product.price)}
            </span>
          </div>

          {/* Full description */}
          {product.description && (
            <p className="text-xs sm:text-sm text-zinc-600 font-normal leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Seletor de Tamanho (Normal vs Familiar / 20cl vs 33cl) */}
          {sizeVariants.length > 1 && onSelectVariant && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-zinc-900 block">
                Escolhe o tamanho / formato:
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {sizeVariants.map((variant) => {
                  const isSelected = variant.id === product.id;
                  const variantIsFamiliar = variant.unitQuantity
                    ?.toLowerCase()
                    .includes('familiar');

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => onSelectVariant(variant)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                          : 'bg-zinc-50 text-zinc-900 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black">
                          {variant.unitQuantity}
                        </span>
                        <span
                          className={`text-xs font-mono font-bold ${
                            isSelected ? 'text-orange-400' : 'text-zinc-900'
                          }`}
                        >
                          {formatCurrency(variant.price)}
                        </span>
                      </div>
                      {variantIsFamiliar && (
                        <span
                          className={`text-[10px] mt-0.5 font-semibold ${
                            isSelected ? 'text-zinc-300' : 'text-amber-700'
                          }`}
                        >
                          Exclusivo Take-Away
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aviso de Pizza Tamanho Familiar exclusivo Take-Away */}
          {isFamiliar && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-900 font-semibold">
              <ShoppingBag className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Tamanho <strong>Familiar</strong> exclusivo para <strong>Take-Away</strong>.
              </span>
            </div>
          )}

          {/* Included sides note */}
          {product.includesNotes && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{product.includesNotes}</span>
            </div>
          )}

          {/* Customization Note */}
          {product.customizationNote && (
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center gap-2 text-xs text-zinc-600">
              <Info className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>{product.customizationNote}</span>
            </div>
          )}

          {/* Allergens warning */}
          {product.allergens && product.allergens.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start gap-2 text-xs text-zinc-600">
              <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-800">Alergénios: </span>
                <span>{product.allergens.join(', ')}</span>
              </div>
            </div>
          )}

          {/* Ingredientes Extra Selecionáveis */}
          {availableExtras.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900">
                  Adicionar Ingredientes Extra (opcional)
                </span>
                {selectedExtraIds.length > 0 && (
                  <span className="text-[11px] font-bold text-orange-600">
                    +{formatCurrency(extrasUnitTotal)}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {availableExtras.map((extra) => {
                  const isChecked = selectedExtraIds.includes(extra.id);
                  return (
                    <button
                      key={extra.id}
                      type="button"
                      onClick={() => toggleExtra(extra.id)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isChecked
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'bg-white border-zinc-300'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span className="text-xs font-semibold truncate">
                          {extra.name}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold shrink-0 ${
                          isChecked ? 'text-orange-300' : 'text-zinc-900'
                        }`}
                      >
                        +{formatCurrency(extra.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special instructions */}
          <div className="space-y-1.5 pt-1">
            <label htmlFor="product-notes" className="text-xs font-bold text-zinc-900 block">
              Observações para a cozinha (opcional)
            </label>
            <textarea
              id="product-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, sem molho picante, bem passado..."
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between gap-3">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-xl p-1 shrink-0 shadow-2xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 text-zinc-900 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
              aria-label="Diminuir"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-zinc-900 w-5 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-900 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
              aria-label="Aumentar"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!product.available}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 text-white disabled:text-zinc-400 font-bold text-xs sm:text-sm flex items-center justify-between transition-all shadow-xs active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{product.available ? 'Adicionar ao pedido' : 'Temporariamente Esgotado'}</span>
            {product.available && <span className="text-orange-400 font-mono">{formatCurrency(totalPrice)}</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
