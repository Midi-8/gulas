'use client';

import React, { useState } from 'react';
import {
  Category,
  Product,
  ProductModifier,
  getCartItemUnitPrice,
  getCartItemTotal,
} from '@/types/restaurant';
import { formatCurrency } from '@/data/mockRestaurant';
import { useCart } from '@/context/CartContext';
import { X, Plus, Minus, AlertCircle, Info, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ProductDetailModalProps {
  product: Product | null;
  allProducts?: Product[];
  categories?: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSelectVariant?: (variant: Product) => void;
}

export function getCartLineId(productId: string, modifiers?: ProductModifier[]): string {
  if (!modifiers || modifiers.length === 0) return productId;
  const sortedIds = [...modifiers].map((m) => m.id).sort().join('-');
  return `${productId}--${sortedIds}`;
}

/**
 * Derives a deterministic modifier UUID from a product UUID and a sequential index.
 * Pattern: d1111111-XXXX-4000-8000-00000000000ZZ
 *   XXXX = digits 9-12 of the product UUID (e.g. "0084" from "b1111111-0084-...")
 *   ZZ   = zero-padded index (01..NN)
 */
function modId(productId: string, idx: number): string {
  const prodNum = productId.substring(9, 13); // e.g. "0084"
  const idxStr = String(idx).padStart(2, '0');
  return `d1111111-${prodNum}-4000-8000-0000000000${idxStr}`;
}

/**
 * Returns the modifier presets for a specific product using deterministic UUIDs
 * that match the seed data in supabase/migrations/20261110_create_order_atomic_modifiers.sql.
 * Products not in the eligible set return empty arrays (no modifier section shown).
 */
const getProductModifiers = (
  product: Product
): { removeModifiers: ProductModifier[]; extraModifiers: ProductModifier[] } => {
  const id = product.id;

  // ── BURGERS ─────────────────────────────────────────────────────────────────

  // São Miguel Burger
  if (id === 'b1111111-0019-4000-8000-000000000019') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem molho', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem bacon', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 6), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Cebola caramelizada', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 9), label: 'Cogumelos Shitake', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 10), label: 'Extra Carne Bovina', priceDelta: 2.5, group: 'extra' },
        { id: modId(id, 11), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Cheeseburger Bacon Edition
  if (id === 'b1111111-0020-4000-8000-000000000020') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem pickles', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem molho', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem bacon', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 6), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Extra Carne Bovina', priceDelta: 2.5, group: 'extra' },
        { id: modId(id, 9), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Gulas Burger
  if (id === 'b1111111-0021-4000-8000-000000000021') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem bacon', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem cogumelos', priceDelta: 0, group: 'remove' },
        { id: modId(id, 5), label: 'Sem ovo', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 6), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 7), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 9), label: 'Cebola caramelizada', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 10), label: 'Cogumelos Shitake', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 11), label: 'Extra Carne Bovina', priceDelta: 2.5, group: 'extra' },
        { id: modId(id, 12), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Classic 2.0
  if (id === 'b1111111-0087-4000-8000-000000000087') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem molho', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem tomate', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem alface', priceDelta: 0, group: 'remove' },
        { id: modId(id, 5), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 6), label: 'Sem bacon', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 7), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 8), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 9), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 10), label: 'Cebola caramelizada', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 11), label: 'Cogumelos Shitake', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 12), label: 'Extra Carne Bovina', priceDelta: 2.5, group: 'extra' },
        { id: modId(id, 13), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Mostarda's
  if (id === 'b1111111-0088-4000-8000-000000000088') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem mostarda', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem presunto', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 6), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Cebola caramelizada', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 9), label: 'Extra Carne Bovina', priceDelta: 2.5, group: 'extra' },
        { id: modId(id, 10), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Frango Burger (sem Extra Carne Bovina)
  if (id === 'b1111111-0089-4000-8000-000000000089') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem molho', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem alface', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 6), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Cebola caramelizada', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 9), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // SPICY CHICKEN (sem Extra Carne Bovina)
  if (id === 'b1111111-0090-4000-8000-000000000090') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem picante', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem molho', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem rúcula', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 6), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Cebola caramelizada', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 9), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Veg Burger (vegetariano estrito: sem carne, sem bacon)
  if (id === 'b1111111-0091-4000-8000-000000000091') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem cogumelos', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem tomate', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem rúcula', priceDelta: 0, group: 'remove' },
        { id: modId(id, 5), label: 'Sem molho', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 6), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Cebola caramelizada', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 9), label: 'Cogumelos Shitake', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 10), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Cheese Burger
  if (id === 'b1111111-0092-4000-8000-000000000092') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem pickles', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem molho', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 4), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 5), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 6), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Cebola caramelizada', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 8), label: 'Extra Carne Bovina', priceDelta: 2.5, group: 'extra' },
        { id: modId(id, 9), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Classic Burger
  if (id === 'b1111111-0093-4000-8000-000000000093') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem fiambre', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem alface', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem tomate', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 6), label: 'Extra Cheddar', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Cebola caramelizada', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 9), label: 'Extra Carne Bovina', priceDelta: 2.5, group: 'extra' },
        { id: modId(id, 10), label: 'Molho da casa extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // ── PREGOS ───────────────────────────────────────────────────────────────────

  // Prego no Caco
  if (id === 'b1111111-0101-4000-8000-000000000101') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem fiambre', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem molho', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 4), label: 'Extra Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 5), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 6), label: 'Extra Queijo da Ilha', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Extra Bife', priceDelta: 2.5, group: 'extra' },
        { id: modId(id, 8), label: 'Molho de mostarda antiga', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // PREGO 2.0
  if (id === 'b1111111-0102-4000-8000-000000000102') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem bacon', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem ovo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem molho', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 6), label: 'Extra Bacon', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 7), label: 'Extra Queijo da Ilha', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Extra Bife', priceDelta: 2.5, group: 'extra' },
        { id: modId(id, 9), label: 'Molho de mostarda antiga', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // ── PANUOZZOS ────────────────────────────────────────────────────────────────

  // Panuozzo Caprese (vegetariano: sem carne, sem presunto)
  if (id === 'b1111111-0043-4000-8000-000000000043') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem tomate', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem rúcula', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem molho', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem mozzarella', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Mozzarella', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 6), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Molho de alho extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Panuozzo Iberico
  if (id === 'b1111111-0044-4000-8000-000000000044') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem presunto', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem queijo', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem rúcula', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem molho', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Mozzarella', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 6), label: 'Extra Bacon', priceDelta: 1.3, group: 'extra' },
        { id: modId(id, 7), label: 'Extra Prosciutto', priceDelta: 1.5, group: 'extra' },
        { id: modId(id, 8), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 9), label: 'Molho de alho extra', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // ── CARACÓIZZZ ───────────────────────────────────────────────────────────────

  // Caracóizz ao Alho
  if (id === 'b1111111-0035-4000-8000-000000000035') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 2), label: 'Molho de alho extra', priceDelta: 0.8, group: 'sauce' },
      ],
    };
  }

  // Caracóizz Clássicos
  if (id === 'b1111111-0036-4000-8000-000000000036') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem fiambre', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 3), label: 'Molho de alho extra', priceDelta: 0.8, group: 'sauce' },
      ],
    };
  }

  // Caracóizz Genovese
  if (id === 'b1111111-0037-4000-8000-000000000037') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem tomate cherry', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 3), label: 'Molho de alho extra', priceDelta: 0.8, group: 'sauce' },
      ],
    };
  }

  // Caracóizz Vegan (vegan estrito: sem carnes, sem queijos)
  if (id === 'b1111111-0038-4000-8000-000000000038') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem pimentos', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem cogumelos', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 4), label: 'Molho de alho extra', priceDelta: 0.8, group: 'sauce' },
      ],
    };
  }

  // Caracóizz Mexicanos
  if (id === 'b1111111-0039-4000-8000-000000000039') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem picante', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem jalapeño', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 4), label: 'Molho cheddar extra', priceDelta: 0.8, group: 'sauce' },
      ],
    };
  }

  // Caracóizz Cheddar e Bacon
  if (id === 'b1111111-0040-4000-8000-000000000040') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem bacon', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 3), label: 'Molho cheddar extra', priceDelta: 0.8, group: 'sauce' },
      ],
    };
  }

  // CARACÓIZZ POPULARES
  if (id === 'b1111111-0041-4000-8000-000000000041') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola granulada', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem chourição', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 4), label: 'Molho de alho extra', priceDelta: 0.8, group: 'sauce' },
      ],
    };
  }

  // Caracóizz Turcos
  if (id === 'b1111111-0042-4000-8000-000000000042') {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem picante', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 3), label: 'Molho de alho extra', priceDelta: 0.8, group: 'sauce' },
      ],
    };
  }

  // ── PIZZAS VEGETARIANAS / QUEIJO (sem bacon, sem pepperoni) ──────────────────
  // Vegetariana Normal (0057), Familiar (0058)
  // Clássica Normal (0063), Familiar (0064)
  // A Mais Formosa Normal (0055), Familiar (0056)
  // Margarida (0067), Romão (0069)
  if ([
    'b1111111-0057-4000-8000-000000000057',
    'b1111111-0058-4000-8000-000000000058',
    'b1111111-0063-4000-8000-000000000063',
    'b1111111-0064-4000-8000-000000000064',
    'b1111111-0055-4000-8000-000000000055',
    'b1111111-0056-4000-8000-000000000056',
    'b1111111-0067-4000-8000-000000000067',
    'b1111111-0069-4000-8000-000000000069',
  ].includes(id)) {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem azeitonas', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem cogumelos', priceDelta: 0, group: 'remove' },
        { id: modId(id, 5), label: 'Sem mozzarella', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 6), label: 'Extra Mozzarella', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 8), label: 'Queijo Parmesão', priceDelta: 0.8, group: 'extra' },
        { id: modId(id, 9), label: 'Burrata de leite italiano', priceDelta: 3.4, group: 'extra' },
        { id: modId(id, 10), label: 'Azeite trufado', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // ── PIZZAS DE PEIXE (sem bacon, sem pepperoni) ───────────────────────────────
  // Pescador Normal (0051), Familiar (0052), Dos Camarões (0071)
  if ([
    'b1111111-0051-4000-8000-000000000051',
    'b1111111-0052-4000-8000-000000000052',
    'b1111111-0071-4000-8000-000000000071',
  ].includes(id)) {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem azeitonas', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem mozzarella', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 5), label: 'Extra Mozzarella', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 6), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Queijo Parmesão', priceDelta: 0.8, group: 'extra' },
        { id: modId(id, 8), label: 'Burrata de leite italiano', priceDelta: 3.4, group: 'extra' },
        { id: modId(id, 9), label: 'Azeite trufado', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // ── PIZZAS TRADICIONAIS COM CARNE ────────────────────────────────────────────
  // Gulas (0045, 0046), Pepe (0047, 0048), Tabasco (0049, 0050),
  // Salamandra (0053, 0054), Kebab (0059, 0060), A Polémica (0061, 0062),
  // Mista (0065, 0066), PEPE DO BOSQUE (0068), Ibérica (0070), Calzone (0072)
  if ([
    'b1111111-0045-4000-8000-000000000045',
    'b1111111-0046-4000-8000-000000000046',
    'b1111111-0047-4000-8000-000000000047',
    'b1111111-0048-4000-8000-000000000048',
    'b1111111-0049-4000-8000-000000000049',
    'b1111111-0050-4000-8000-000000000050',
    'b1111111-0053-4000-8000-000000000053',
    'b1111111-0054-4000-8000-000000000054',
    'b1111111-0059-4000-8000-000000000059',
    'b1111111-0060-4000-8000-000000000060',
    'b1111111-0061-4000-8000-000000000061',
    'b1111111-0062-4000-8000-000000000062',
    'b1111111-0065-4000-8000-000000000065',
    'b1111111-0066-4000-8000-000000000066',
    'b1111111-0068-4000-8000-000000000068',
    'b1111111-0070-4000-8000-000000000070',
    'b1111111-0072-4000-8000-000000000072',
  ].includes(id)) {
    return {
      removeModifiers: [
        { id: modId(id, 1), label: 'Sem cebola', priceDelta: 0, group: 'remove' },
        { id: modId(id, 2), label: 'Sem orégãos', priceDelta: 0, group: 'remove' },
        { id: modId(id, 3), label: 'Sem azeitonas', priceDelta: 0, group: 'remove' },
        { id: modId(id, 4), label: 'Sem cogumelos', priceDelta: 0, group: 'remove' },
        { id: modId(id, 5), label: 'Sem mozzarella', priceDelta: 0, group: 'remove' },
      ],
      extraModifiers: [
        { id: modId(id, 6), label: 'Extra Mozzarella', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 7), label: 'Extra Bacon', priceDelta: 1.3, group: 'extra' },
        { id: modId(id, 8), label: 'Extra Pepperoni', priceDelta: 2.0, group: 'extra' },
        { id: modId(id, 9), label: 'Ovo', priceDelta: 1.0, group: 'extra' },
        { id: modId(id, 10), label: 'Queijo Parmesão', priceDelta: 0.8, group: 'extra' },
        { id: modId(id, 11), label: 'Burrata de leite italiano', priceDelta: 3.4, group: 'extra' },
        { id: modId(id, 12), label: 'Azeite trufado', priceDelta: 0.5, group: 'sauce' },
      ],
    };
  }

  // Produto sem modificadores (ex: Malhão 0094, Adiciona Burrata 0073, outros)
  return { removeModifiers: [], extraModifiers: [] };
};


export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  allProducts = [],
  isOpen,
  onClose,
  onSelectVariant,
}) => {
  const { addItem, items, selectedTableNumber, isTableLocked, setSelectedTableNumber } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedModifiers, setSelectedModifiers] = useState<ProductModifier[]>([]);
  const [prevProductId, setPrevProductId] = useState<string | null>(null);

  if (product && product.id !== prevProductId) {
    setPrevProductId(product.id);
    setQuantity(1);
    setNotes('');
    setSelectedModifiers([]);
  }

  if (!isOpen || !product) return null;

  const existingInCart = items.find((i) => i.product.id === product.id);

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

  const { removeModifiers, extraModifiers } = getProductModifiers(product);
  const isEligibleCategory =
    removeModifiers.length > 0 || extraModifiers.length > 0;

  const toggleModifier = (mod: ProductModifier) => {
    setSelectedModifiers((prev) => {
      const exists = prev.some((m) => m.id === mod.id);
      if (exists) {
        return prev.filter((m) => m.id !== mod.id);
      }
      return [...prev, mod];
    });
  };

  const tempCartItem = {
    product,
    quantity,
    selectedModifiers,
  };
  const unitPrice = getCartItemUnitPrice(tempCartItem);
  const totalPrice = getCartItemTotal(tempCartItem);
  const modifiersDelta = Math.max(0, unitPrice - product.price);

  const handleAddToCart = () => {
    if (isFamiliar && !isTableLocked && selectedTableNumber === null) {
      setSelectedTableNumber(0);
    }

    addItem(
      product,
      quantity,
      notes.trim() || undefined,
      selectedModifiers.length > 0 ? selectedModifiers : undefined
    );

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-250 border border-zinc-200/80 text-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/95 text-zinc-900 hover:bg-zinc-100 border border-zinc-200 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {product.badges?.map((badgeKey) => (
              <Badge key={badgeKey} badgeType={badgeKey} size="md" />
            ))}
            {product.unitQuantity && (
              <span className="text-xs text-zinc-700 font-medium px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200/80">
                {product.unitQuantity}
              </span>
            )}
            {existingInCart && (
              <span className="text-xs text-zinc-700 font-medium px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200/80">
                No pedido: {existingInCart.quantity}×
              </span>
            )}
          </div>

          {/* Title & Price */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 tracking-tight">
              {product.name}
            </h2>
            <span className="text-lg sm:text-xl font-bold font-mono text-zinc-900 shrink-0">
              {formatCurrency(product.price)}
            </span>
          </div>

          {/* Full description */}
          {product.description && (
            <p className="text-xs sm:text-sm text-zinc-500 font-normal leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Seletor de Tamanho */}
          {sizeVariants.length > 1 && onSelectVariant && (
            <div className="space-y-2 pt-1">
              <span className="text-xs font-semibold text-zinc-900 block">
                Escolhe o formato:
              </span>
              <div className="grid grid-cols-2 gap-2">
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
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${isSelected
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-zinc-50 text-zinc-900 border-zinc-200/80 hover:border-zinc-400'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold">
                          {variant.unitQuantity}
                        </span>
                        <span
                          className={`text-xs font-mono font-semibold ${isSelected ? 'text-zinc-200' : 'text-zinc-900'
                            }`}
                        >
                          {formatCurrency(variant.price)}
                        </span>
                      </div>
                      {variantIsFamiliar && (
                        <span
                          className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-zinc-300' : 'text-zinc-500'
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
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center gap-2 text-xs text-amber-900 font-medium">
              <ShoppingBag className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Tamanho <strong>Familiar</strong> exclusivo para <strong>Take-Away</strong>.
              </span>
            </div>
          )}

          {/* Included sides note */}
          {product.includesNotes && (
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-2 text-xs text-zinc-700 font-medium">
              <Info className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>{product.includesNotes}</span>
            </div>
          )}

          {/* Customization Note */}
          {product.customizationNote && (
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center gap-2 text-xs text-zinc-600">
              <Info className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>{product.customizationNote}</span>
            </div>
          )}

          {/* Allergens warning */}
          {product.allergens && product.allergens.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-start gap-2 text-xs text-zinc-600">
              <AlertCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-800">Alergénios: </span>
                <span>{product.allergens.join(', ')}</span>
              </div>
            </div>
          )}

          {/* Secção de Modificadores: Remover & Adicionar Extras */}
          {isEligibleCategory && (
            <div className="space-y-4 pt-1">
              {/* Opções de Remoção (Preço 0,00€) */}
              {removeModifiers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900">
                      Remover ingredientes (opcional)
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      Sem custo adicional
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {removeModifiers.map((mod) => {
                      const isSelected = selectedModifiers.some((m) => m.id === mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModifier(mod)}
                          className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${isSelected
                            ? 'bg-zinc-900 text-white border-zinc-900 font-medium shadow-xs'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200/80 hover:border-zinc-400'
                            }`}
                        >
                          <span className={isSelected ? 'text-zinc-300' : 'text-zinc-400'}>
                            {isSelected ? '✕' : '−'}
                          </span>
                          <span>{mod.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Opções de Extras Pagos */}
              {extraModifiers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900">
                      Adicionar extras
                    </span>
                    {selectedModifiers.some((m) => m.priceDelta > 0) && (
                      <span className="text-xs font-mono font-semibold text-zinc-900">
                        +{formatCurrency(modifiersDelta)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {extraModifiers.map((mod) => {
                      const isSelected = selectedModifiers.some((m) => m.id === mod.id);
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => toggleModifier(mod)}
                          className={`px-3 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 border ${isSelected
                            ? 'bg-zinc-900 text-white border-zinc-900 font-medium shadow-xs'
                            : 'bg-zinc-50 text-zinc-700 border-zinc-200/80 hover:border-zinc-400'
                            }`}
                        >
                          <span className={isSelected ? 'text-zinc-300' : 'text-zinc-400'}>
                            {isSelected ? '✓' : '+'}
                          </span>
                          <span>{mod.label}</span>
                          <span
                            className={`font-mono text-[11px] ${isSelected ? 'text-zinc-300' : 'text-zinc-500'
                              }`}
                          >
                            +{formatCurrency(mod.priceDelta)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Special instructions */}
          <div className="space-y-1.5 pt-1">
            <label htmlFor="product-notes" className="text-xs font-semibold text-zinc-900 block">
              Observações para a cozinha (opcional)
            </label>
            <textarea
              id="product-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, sem molho picante, se tiveres alguma alergia alimentar indica aqui..."
              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:bg-white transition-colors resize-none"
            />
            <p className="text-[11px] text-amber-800 font-medium">
              Se tiveres alguma alergia alimentar, indica aqui para avisar a cozinha.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-zinc-200/80 flex items-center justify-between gap-3">
          {/* Quantity Controls */}
          <div className="flex items-center gap-2 bg-zinc-100 border border-zinc-200/80 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-8 h-8 rounded-lg bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-900 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
              aria-label="Diminuir"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs sm:text-sm font-semibold font-mono text-zinc-900 w-5 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg bg-white hover:bg-zinc-200 text-zinc-900 flex items-center justify-center transition-colors active:scale-90 cursor-pointer"
              aria-label="Aumentar"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!product.available}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 text-white disabled:text-zinc-400 font-semibold text-xs sm:text-sm flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
          >
            <span>{product.available ? 'Adicionar ao pedido' : 'Indisponível'}</span>
            {product.available && (
              <span className="text-zinc-200 font-mono">{formatCurrency(totalPrice)}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
