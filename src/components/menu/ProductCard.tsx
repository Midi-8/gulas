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
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetails }) => {
  const { items, addItem, updateQuantity } = useCart();
  const [imageFailed, setImageFailed] = useState(false);

  const cartItem = items.find((item) => item.product.id === product.id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.available) return;
    addItem(product, 1);
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, currentQuantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQuantity(product.id, currentQuantity - 1);
  };

  return (
    <article
      onClick={() => onOpenDetails(product)}
      className={clsx(
        'group relative flex flex-col justify-between rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] transition-all duration-200 hover:border-[#C09573]/50 hover:shadow-sm cursor-pointer select-none active:scale-[0.99] overflow-hidden',
        !product.available && 'opacity-70 bg-[#F5F4F1]'
      )}
    >
      {/* Top Media: Fotografia com enquadramento panorâmico ou fallback refinado */}
      <div className="relative aspect-[16/10] sm:aspect-[4/3] w-full overflow-hidden bg-[#EAE5DF] border-b border-[#E5DED6]">
        {product.imageUrl && !imageFailed ? (
          <>
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 420px"
              className={clsx(
                'object-cover transition-transform duration-500 ease-out group-hover:scale-105',
                !product.available && 'grayscale contrast-75'
              )}
              onError={() => setImageFailed(true)}
            />
            {/* Gradiente de proteção de contraste muito suave */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#35271F]/40 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          /* Fallback visual refinado para artigos sem fotografia */
          <div className="w-full h-full bg-gradient-to-br from-[#EAE5DF] via-[#F5F4F1] to-[#EAE5DF] flex items-center justify-center relative overflow-hidden">
            <svg
              className="absolute inset-0 w-full h-full opacity-15"
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
                  <circle cx="12" cy="12" r="1.5" fill="#5E4939" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#pattern-grid-${product.id})`} />
            </svg>
            <div className="w-12 h-12 rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-5 h-5 text-[#5E4939]" />
            </div>
          </div>
        )}

        {/* Badges Flutuantes sobre a Imagem */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5">
            {!product.available && (
              <span className="text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full bg-[#35271F]/90 text-[#F5F4F1] border border-[#E5DED6]/40 backdrop-blur-xs shadow-xs">
                Temporariamente Esgotado
              </span>
            )}
            {product.badges?.map((badgeKey) => (
              <Badge key={badgeKey} badgeType={badgeKey} size="sm" />
            ))}
          </div>

          {product.unitQuantity && (
            <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFFFFF]/95 text-[#35271F] border border-[#E5DED6] shadow-xs backdrop-blur-xs">
              {product.unitQuantity}
            </span>
          )}
        </div>
      </div>

      {/* Corpo do Cartão: Hierarquia Tipográfica e Descrição */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-[#35271F] group-hover:text-[#5E4939] tracking-tight leading-snug transition-colors line-clamp-2">
            {product.name}
          </h3>

          {product.description && (
            <p className="text-xs sm:text-sm text-[#4C453F] font-normal leading-relaxed line-clamp-2 mt-1.5">
              {product.description}
            </p>
          )}

          {product.customizationNote && (
            <p className="text-[11px] text-[#5E4939] font-medium leading-relaxed line-clamp-2 mt-1">
              {product.customizationNote}
            </p>
          )}

          {product.includesNotes && (
            <p className="text-[11px] sm:text-xs text-[#C09573] font-semibold pt-1.5">
              {product.includesNotes}
            </p>
          )}
        </div>

        {/* Rodapé: Preço e Botão de Ação */}
        <div className="mt-4 pt-3 border-t border-[#E5DED6] flex items-center justify-between">
          <span className="text-base sm:text-lg font-bold font-mono text-[#C09573] tracking-tight">
            {formatCurrency(product.price)}
          </span>

          {/* Botão de Adição ou Contador Reativo */}
          {product.available ? (
            currentQuantity > 0 ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 bg-[#EAE5DF] rounded-full p-0.5 border border-[#E5DED6]"
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="w-7 h-7 rounded-full bg-[#FFFFFF] text-[#35271F] hover:bg-[#E5DED6] flex items-center justify-center transition-colors active:scale-90 shadow-2xs cursor-pointer"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-bold font-mono text-[#35271F] w-5 text-center">
                  {currentQuantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-7 h-7 rounded-full bg-[#5E4939] text-[#F5F4F1] hover:bg-[#453426] flex items-center justify-center transition-colors active:scale-90 shadow-2xs cursor-pointer"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickAdd}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] flex items-center justify-center transition-all shadow-xs active:scale-95 cursor-pointer"
                aria-label={`Adicionar ${product.name}`}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            )
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-[#EAE5DF] text-[#78716C] text-[11px] font-bold border border-[#E5DED6] select-none">
              Esgotado
            </span>
          )}
        </div>
      </div>
    </article>
  );
};