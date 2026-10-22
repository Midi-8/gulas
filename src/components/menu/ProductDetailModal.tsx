'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Product } from '@/types/restaurant';
import { formatCurrency } from '@/data/mockRestaurant';
import { useCart } from '@/context/CartContext';
import { X, Plus, Minus, AlertCircle, Info, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const { addItem, items } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [prevProductId, setPrevProductId] = useState<string | null>(null);

  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    const existing = items.find((i) => i.product.id === product.id);
    setQuantity(existing ? existing.quantity : 1);
    setNotes(existing?.notes || '');
  }

  if (!isOpen || !product) return null;

  const handleAddToCart = () => {
    addItem(product, quantity, notes.trim() || undefined);
    onClose();
  };

  const totalPrice = product.price * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#35271F]/40 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#FFFFFF] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-250 border border-[#E5DED6] text-[#35271F]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-[#FFFFFF] text-[#35271F] hover:bg-[#EAE5DF] border border-[#E5DED6] flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Hero Image (if available) */}
        {product.imageUrl && (
          <div className="relative h-48 sm:h-56 w-full bg-[#EAE5DF] shrink-0 border-b border-[#E5DED6]">
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
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {/* Badges */}
          {((product.badges && product.badges.length > 0) || product.unitQuantity || product.prepTimeMinutes) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {product.badges?.map((badgeKey) => (
                <Badge key={badgeKey} badgeType={badgeKey} size="md" />
              ))}
              {product.unitQuantity && (
                <span className="text-xs text-zinc-600 font-semibold px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
                  {product.unitQuantity}
                </span>
              )}
              {product.prepTimeMinutes && (
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 font-medium">
                  <Clock className="w-3 h-3" />
                  {product.prepTimeMinutes} min
                </span>
              )}
            </div>
          )}

          {/* Title & Price */}
          <div className="flex items-start justify-between gap-3 pt-1">
            <h2 className="text-lg sm:text-xl font-black text-[#141619] tracking-tight">
              {product.name}
            </h2>
            <span className="text-lg sm:text-xl font-black text-[#15803D] shrink-0">
              {formatCurrency(product.price)}
            </span>
          </div>

          {/* Full description */}
          {product.description && (
            <p className="text-xs sm:text-sm text-zinc-600 font-normal leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Included sides note */}
          {product.includesNotes && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
              <Info className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{product.includesNotes}</span>
            </div>
          )}

          {/* Customization Note */}
          {product.customizationNote && (
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center gap-2 text-xs text-zinc-600">
              <Info className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>{product.customizationNote}</span>
            </div>
          )}

          {/* Allergens warning */}
          {product.allergens && product.allergens.length > 0 && (
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-start gap-2 text-xs text-zinc-600">
              <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-800">Alergénios: </span>
                <span>{product.allergens.join(', ')}</span>
              </div>
            </div>
          )}

          {/* Special instructions */}
          <div className="space-y-1 pt-1">
            <label htmlFor="product-notes" className="text-xs font-bold text-[#141619] block">
              Observações (opcional)
            </label>
            <textarea
              id="product-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, sem molho picante, bem passado..."
              className="w-full px-3 py-2 rounded-xl bg-[#F5F4F1] border border-[#E5DED6] text-xs sm:text-sm text-[#35271F] placeholder-[#A89F95] focus:outline-none focus:border-[#C09573] focus:bg-white transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#F5F4F1] border-t border-[#E5DED6] flex items-center justify-between gap-3">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#E5DED6] rounded-xl p-1 shrink-0 shadow-2xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-7 h-7 rounded-lg bg-[#EAE5DF] hover:bg-[#E5DED6] disabled:opacity-40 text-[#35271F] flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
              aria-label="Diminuir"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs sm:text-sm font-bold text-[#35271F] w-5 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-7 h-7 rounded-lg bg-[#EAE5DF] hover:bg-[#E5DED6] text-[#35271F] flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
              aria-label="Aumentar"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!product.available}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#5E4939] hover:bg-[#453426] disabled:bg-[#EAE5DF] text-[#F5F4F1] disabled:text-[#A89F95] font-bold text-xs sm:text-sm flex items-center justify-between transition-all shadow-xs active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{product.available ? 'Adicionar ao pedido' : 'Temporariamente Esgotado'}</span>
            {product.available && <span>{formatCurrency(totalPrice)}</span>}
          </button>
        </div>
      </div>
    </div>
  );
};
