'use client';

import React from 'react';
import Image from 'next/image';
import { Product } from '@/types/restaurant';
import { formatCurrency } from '@/data/mockRestaurant';
import { useCart } from '@/context/CartContext';
import { Plus, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';

interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetails }) => {
  const { items, addItem, updateQuantity } = useCart();

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
    <div
      onClick={() => onOpenDetails(product)}
      className={clsx(
        'group relative flex flex-col justify-between rounded-xl sm:rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-3.5 sm:p-4 transition-all duration-200 hover:border-[#C09573]/60 shadow-xs cursor-pointer select-none active:scale-[0.99]',
        !product.available && 'opacity-60 bg-[#F5F4F1]'
      )}
    >
      <div className="flex gap-3 sm:gap-4 items-start">
        {/* Text details */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Badges & Meta */}
          {((product.badges && product.badges.length > 0) || product.unitQuantity || !product.available) && (
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {product.badges?.map((badgeKey) => (
                <Badge key={badgeKey} badgeType={badgeKey} size="sm" />
              ))}
              {product.unitQuantity && (
                <span className="text-[10px] text-[#4C453F] font-semibold px-1.5 py-0.5 rounded bg-[#EAE5DF]">
                  {product.unitQuantity}
                </span>
              )}
              {!product.available && (
                <span className="text-[10px] text-[#5E4939] bg-[#EAE5DF] border border-[#E5DED6] px-2 py-0.5 rounded-full font-bold tracking-tight">
                  Temporariamente Esgotado
                </span>
              )}
            </div>
          )}

          <h3 className="text-sm sm:text-base font-bold text-[#35271F] group-hover:text-[#5E4939] transition-colors line-clamp-1">
            {product.name}
          </h3>

          <p className="text-xs text-[#4C453F] font-normal line-clamp-2 leading-relaxed">
            {product.description}
          </p>

          {product.includesNotes && (
            <p className="text-[11px] text-[#C09573] font-semibold pt-0.5">
              {product.includesNotes}
            </p>
          )}
        </div>

        {/* Product image (if available) */}
        {product.imageUrl && (
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#EAE5DF] shrink-0 border border-[#E5DED6]">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 80px, 96px"
              className={clsx(
                'object-cover transition-transform duration-300 group-hover:scale-105',
                !product.available && 'grayscale'
              )}
            />
          </div>
        )}
      </div>

      {/* Footer: Price and Add button */}
      <div className="mt-3 pt-2.5 border-t border-[#E5DED6] flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-sm sm:text-base font-black text-[#C09573] tracking-tight">
            {formatCurrency(product.price)}
          </span>
        </div>

        {/* Add or Counter action */}
        {product.available ? (
          currentQuantity > 0 ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 bg-[#EAE5DF] rounded-full p-0.5 border border-[#E5DED6]"
            >
              <button
                onClick={handleDecrement}
                className="w-6 h-6 rounded-full bg-[#FFFFFF] text-[#35271F] hover:bg-[#E5DED6] flex items-center justify-center transition-colors active:scale-90 shadow-2xs cursor-pointer"
                aria-label="Diminuir quantidade"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-bold text-[#35271F] w-4 text-center">
                {currentQuantity}
              </span>
              <button
                onClick={handleIncrement}
                className="w-6 h-6 rounded-full bg-[#5E4939] text-[#F5F4F1] hover:bg-[#453426] flex items-center justify-center font-bold transition-colors active:scale-90 shadow-2xs cursor-pointer"
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleQuickAdd}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] flex items-center justify-center transition-all shadow-xs active:scale-90 cursor-pointer"
              aria-label={`Adicionar ${product.name}`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          )
        ) : (
          <button
            type="button"
            disabled
            onClick={(e) => e.stopPropagation()}
            className="px-3 py-1 rounded-full bg-[#EAE5DF] text-[#A89F95] text-xs font-bold border border-[#E5DED6] cursor-not-allowed select-none"
          >
            Esgotado
          </button>
        )}
      </div>
    </div>
  );
};
