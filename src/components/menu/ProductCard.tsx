'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/types/restaurant';
import { formatCurrency } from '@/data/mockRestaurant';
import { useCart } from '@/context/CartContext';
import { Plus, Minus, UtensilsCrossed } from 'lucide-react';
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
        .join(' / ')
    : product.unitQuantity;

  const triggerHaptic = (ms: number = 12) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Silenciosamente ignorado caso o browser bloqueie
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
    triggerHaptic(18);
    setIsPulsing(true);
    setTimeout(() => setIsPulsing(false), 260);
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
        'group relative flex flex-col justify-between rounded-2xl bg-white border border-zinc-200/80 transition-all duration-200 hover:border-zinc-300 hover:shadow-md cursor-pointer select-none active:scale-[0.99] overflow-hidden',
        !isAnyVariantAvailable && 'opacity-70 bg-zinc-50'
      )}
    >
      {/* Top Media */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-zinc-100 border-b border-zinc-100">
        {product.imageUrl && !imageFailed ? (
          <>
            {!isImageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-100 via-zinc-50 to-zinc-100 animate-pulse" />
            )}
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              priority={priority}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
              className={clsx(
                'object-cover transition-all duration-500 ease-out group-hover:scale-105',
                !isImageLoaded ? 'opacity-0 scale-95' : 'opacity-100 scale-100',
                !product.available && 'grayscale contrast-75'
              )}
              onLoad={() => setIsImageLoaded(true)}
              onError={() => setImageFailed(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/35 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-100 via-zinc-50 to-zinc-100 flex items-center justify-center relative overflow-hidden">
            <svg
              className="absolute inset-0 w-full h-full opacity-20"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern
                  id={`pattern-grid-${product.id}`}
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="12" cy="12" r="1.2" fill="#71717A" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#pattern-grid-${product.id})`} />
            </svg>
            <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center shadow-2xs">
              <UtensilsCrossed className="w-5 h-5 text-zinc-500" />
            </div>
          </div>
        )}

        {/* Badges Flutuantes sobre a Imagem */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5">
            {!isAnyVariantAvailable && (
              <span className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-zinc-950/90 text-white backdrop-blur-xs shadow-xs">
                Temporariamente Esgotado
              </span>
            )}
            {product.badges?.map((badgeKey) => (
              <Badge key={badgeKey} badgeType={badgeKey} size="sm" />
            ))}
          </div>

          {unitBadgeText && (
            <span className="text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/95 text-zinc-900 border border-zinc-200/80 shadow-2xs backdrop-blur-xs">
              {unitBadgeText}
            </span>
          )}
        </div>
      </div>

      {/* Corpo do Cartão */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-black text-zinc-900 group-hover:text-orange-600 tracking-tight leading-snug transition-colors line-clamp-2">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-xs sm:text-sm text-zinc-500 font-normal leading-relaxed line-clamp-2 mt-1.5">
              {product.description}
            </p>
          )}

          {product.customizationNote && (
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed line-clamp-2 mt-1">
              {product.customizationNote}
            </p>
          )}

          {product.includesNotes && (
            <p className="text-[11px] sm:text-xs text-emerald-700 font-semibold pt-1.5">
              {product.includesNotes}
            </p>
          )}
        </div>

        {/* Rodapé: Preço e Botão de Ação */}
        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-base sm:text-lg font-black font-mono text-zinc-950 tracking-tight">
            {hasMultipleVariants && minPrice !== maxPrice
              ? `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`
              : formatCurrency(product.price)}
          </span>

          {isAnyVariantAvailable ? (
            currentQuantity > 0 ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-zinc-100 rounded-full p-0.5 border border-zinc-200"
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-7 h-7 rounded-full bg-white text-zinc-900 hover:bg-zinc-200 flex items-center justify-center transition-colors active:scale-90 shadow-2xs cursor-pointer"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold font-mono text-zinc-900 w-5 text-center">
                  {currentQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className={clsx(
                    'w-7 h-7 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 flex items-center justify-center transition-all duration-200 active:scale-75 shadow-2xs cursor-pointer',
                    isPulsing && 'scale-115 ring-2 ring-orange-500/40'
                  )}
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                className={clsx(
                  'w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-zinc-900 hover:bg-orange-600 text-white flex items-center justify-center transition-all duration-200 shadow-xs active:scale-75 cursor-pointer',
                  isPulsing && 'scale-115 ring-4 ring-orange-500/30'
                )}
                aria-label={`Adicionar ${product.name}`}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            )
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-500 text-[11px] font-bold border border-zinc-200 select-none">
              Esgotado
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
