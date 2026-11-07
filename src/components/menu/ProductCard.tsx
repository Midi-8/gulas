'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/types/restaurant';
import { formatCurrency } from '@/data/mockRestaurant';
import { useCart } from '@/context/CartContext';
import { Plus, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';

interface ProductCardProps {
  product: Product;
  variants?: Product[];
  onOpenDetails: (product: Product) => void;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variants,
  onOpenDetails,
  priority = false,
}) => {
  const { items, addItem, updateQuantity } = useCart();
  const [imageFailed, setImageFailed] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  const hasMultipleVariants = Boolean(variants && variants.length > 1);
  const variantIds = hasMultipleVariants
    ? new Set(variants!.map((v) => v.id))
    : new Set([product.id]);

  const matchingCartItems = items.filter((item) =>
    variantIds.has(item.product.id)
  );
  const currentQuantity = matchingCartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const isAnyVariantAvailable = hasMultipleVariants
    ? variants!.some((v) => v.available)
    : product.available;

  const minPrice = hasMultipleVariants
    ? Math.min(...variants!.map((v) => v.price))
    : product.price;
  const maxPrice = hasMultipleVariants
    ? Math.max(...variants!.map((v) => v.price))
    : product.price;

  const unitBadgeText = hasMultipleVariants
    ? variants!
        .map((v) => v.unitQuantity)
        .filter(Boolean)
        .join(' · ')
    : product.unitQuantity;

  const hasValidImage = Boolean(product.imageUrl && !imageFailed);

  const triggerHaptic = (ms: number = 12) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorado caso o browser bloqueie
      }
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAnyVariantAvailable) return;
    if (hasMultipleVariants) {
      onOpenDetails(product);
      return;
    }
    triggerHaptic(16);
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 240);
    addItem(product, 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasMultipleVariants) {
      onOpenDetails(product);
      return;
    }
    triggerHaptic(12);
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 220);
    updateQuantity(product.id, currentQuantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(8);
    const targetItem = matchingCartItems[matchingCartItems.length - 1];
    if (targetItem) {
      updateQuantity(targetItem.product.id, targetItem.quantity - 1);
    }
  };

  return (
    <article
      onClick={() => onOpenDetails(product)}
      className={clsx(
        'group relative flex items-stretch justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white border transition-all duration-200 cursor-pointer select-none active:scale-[0.995]',
        currentQuantity > 0
          ? 'border-zinc-900/35 shadow-2xs ring-1 ring-zinc-900/5'
          : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs',
        !isAnyVariantAvailable && 'opacity-60 bg-zinc-50/70'
      )}
    >
      {/* Coluna Esquerda: Tipografia Estruturada & Preço */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="space-y-1.5">
          {/* Badges e Formato */}
          {(unitBadgeText ||
            !isAnyVariantAvailable ||
            (product.badges && product.badges.length > 0)) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {!isAnyVariantAvailable && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-700 uppercase tracking-wider">
                  Esgotado
                </span>
              )}
              {unitBadgeText && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/70">
                  {unitBadgeText}
                </span>
              )}
              {product.badges?.map((badgeKey) => (
                <Badge key={badgeKey} badgeType={badgeKey} size="sm" />
              ))}
            </div>
          )}

          {/* Título do Produto */}
          <h3 className="text-[15px] sm:text-base font-semibold text-zinc-900 group-hover:text-zinc-700 tracking-tight leading-snug transition-colors line-clamp-2">
            {product.name}
          </h3>

          {/* Descrição */}
          {product.description && (
            <p className="text-xs sm:text-[13px] text-zinc-500 font-normal leading-relaxed line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Notas técnicas discretas */}
          {(product.customizationNote || product.includesNotes) && (
            <p className="text-[11px] text-zinc-400 font-normal leading-snug line-clamp-1 pt-0.5">
              {[product.includesNotes, product.customizationNote]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>

        {/* Rodapé: Preço e Controlo (quando não tem imagem) */}
        <div className="mt-3.5 pt-2.5 flex items-center justify-between gap-2">
          <span className="text-sm sm:text-[15px] font-semibold font-mono text-zinc-900 tracking-tight">
            {hasMultipleVariants && minPrice !== maxPrice
              ? `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`
              : formatCurrency(product.price)}
          </span>

          {!hasValidImage && (
            <div>
              {isAnyVariantAvailable ? (
                currentQuantity > 0 ? (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 bg-zinc-100 rounded-full p-0.5 border border-zinc-200"
                  >
                    <button
                      type="button"
                      onClick={handleDecrement}
                      className="w-7 h-7 rounded-full bg-white text-zinc-900 hover:bg-zinc-200 flex items-center justify-center transition-colors active:scale-90 shadow-2xs cursor-pointer"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-semibold font-mono text-zinc-900 w-5 text-center">
                      {currentQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      className={clsx(
                        'w-7 h-7 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 flex items-center justify-center transition-all duration-200 active:scale-75 shadow-2xs cursor-pointer',
                        isPulsing && 'scale-110 ring-2 ring-zinc-900/20'
                      )}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleQuickAdd}
                    className={clsx(
                      'w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-900 text-zinc-900 hover:text-white border border-zinc-200/80 hover:border-zinc-900 flex items-center justify-center transition-all duration-200 active:scale-75 cursor-pointer',
                      isPulsing && 'scale-110 bg-zinc-900 text-white'
                    )}
                    aria-label={`Adicionar ${product.name}`}
                  >
                    <Plus className="w-4 h-4 stroke-[2]" />
                  </button>
                )
              ) : (
                <span className="text-[11px] font-medium text-zinc-400 select-none">
                  Indisponível
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Coluna Direita: Imagem Real (apenas quando existe fotografia do produto) */}
      {hasValidImage && (
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200/60 shrink-0 self-center">
          {!isImageLoaded && (
            <div className="absolute inset-0 bg-zinc-100 animate-pulse" />
          )}
          <Image
            src={product.imageUrl!}
            alt={product.name}
            fill
            priority={priority}
            sizes="120px"
            className={clsx(
              'object-cover transition-transform duration-500 ease-out group-hover:scale-105',
              !isImageLoaded ? 'opacity-0' : 'opacity-100',
              !isAnyVariantAvailable && 'grayscale contrast-75'
            )}
            onLoad={() => setIsImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />

          {/* Controlo sobreposto no canto inferior direito da imagem */}
          {isAnyVariantAvailable && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-1.5 right-1.5"
            >
              {currentQuantity > 0 ? (
                <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xs rounded-full p-0.5 border border-zinc-200 shadow-sm">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-[11px] font-semibold font-mono text-zinc-900 w-4 text-center">
                    {currentQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="w-6 h-6 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className={clsx(
                    'w-7 h-7 rounded-full bg-white/95 backdrop-blur-xs hover:bg-zinc-900 text-zinc-900 hover:text-white border border-zinc-200/80 flex items-center justify-center shadow-sm transition-all cursor-pointer',
                    isPulsing && 'scale-110 bg-zinc-900 text-white'
                  )}
                  aria-label={`Adicionar ${product.name}`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
};
