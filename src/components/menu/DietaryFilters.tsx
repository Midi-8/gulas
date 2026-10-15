'use client';

import React, { useRef } from 'react';
import { clsx } from 'clsx';
import { Check, X } from 'lucide-react';
import { Product } from '@/types/restaurant';
import { useTranslations } from 'next-intl';

export type DietaryFilterId = 'vegan' | 'vegetarian' | 'gluten_free' | 'dairy_free';

export interface DietaryFilterOption {
  id: DietaryFilterId;
  labelKey: 'vegan' | 'vegetarian' | 'glutenFree' | 'dairyFree';
  emoji: string;
}

export const DIETARY_FILTERS: DietaryFilterOption[] = [
  { id: 'vegan', labelKey: 'vegan', emoji: '🌿' },
  { id: 'vegetarian', labelKey: 'vegetarian', emoji: '🥦' },
  { id: 'gluten_free', labelKey: 'glutenFree', emoji: '🌾' },
  { id: 'dairy_free', labelKey: 'dairyFree', emoji: '🥛' },
];

/**
 * Avalia se um produto cumpre um determinado critério de dieta ou alergénio.
 * Suporta inspeção de dietary_tags, badges, allergens e menções explícitas na descrição/nome.
 */
export function matchesDietaryFilter(product: Product, filterId: DietaryFilterId): boolean {
  const normTags = (product.dietary_tags || []).map((t) => t.toLowerCase().trim());
  const normBadges = (product.badges || []).map((b) => b.toLowerCase().trim());
  const normAllergens = (product.allergens || []).map((a) => a.toLowerCase().trim());
  const normDesc = (product.description || '').toLowerCase();
  const normName = (product.name || '').toLowerCase();

  switch (filterId) {
    case 'vegan': {
      // 1. Tags explícitas
      if (normTags.includes('vegan') || normTags.includes('vegano')) return true;
      // 2. Badges de produto
      if (normBadges.includes('vegan')) return true;
      // 3. Menções no título ou descrição
      if (
        normName.includes('vegan') ||
        normDesc.includes('vegan') ||
        normDesc.includes('100% vegetal') ||
        normDesc.includes('plant-based')
      ) {
        return true;
      }
      return false;
    }

    case 'vegetarian': {
      // Se for vegan, é por definição vegetariano
      if (matchesDietaryFilter(product, 'vegan')) return true;
      // 1. Tags explícitas
      if (
        normTags.includes('vegetarian') ||
        normTags.includes('vegetariano') ||
        normTags.includes('vegan')
      ) {
        return true;
      }
      // 2. Badges de produto
      if (normBadges.includes('vegetariano') || normBadges.includes('vegan')) return true;
      // 3. Menções no título ou descrição
      if (
        normName.includes('vegetariano') ||
        normName.startsWith('veg ') ||
        normName.includes('veg burger') ||
        normDesc.includes('vegetariano') ||
        normDesc.includes('vegetais')
      ) {
        const hasFishOrSeafood = normAllergens.some((a) =>
          a.includes('peixe') || a.includes('crustáceos') || a.includes('moluscos')
        );
        if (!hasFishOrSeafood) return true;
      }
      return false;
    }

    case 'gluten_free': {
      // 1. Tags explícitas de produto
      if (
        normTags.some((t) =>
          ['gluten_free', 'sem_gluten', 'sem glúten', 'sem gluten', 'gluten-free'].includes(t)
        )
      ) {
        return true;
      }
      // 2. Descrição ou nome assinala ausência de glúten
      if (
        normDesc.includes('sem glúten') ||
        normDesc.includes('sem gluten') ||
        normDesc.includes('gluten free') ||
        normName.includes('sem glúten')
      ) {
        return true;
      }
      // 3. Se tiver o alergénio 'Glúten', não é livre de glúten
      const hasGlutenAllergen = normAllergens.some((a) =>
        a.includes('glúten') || a.includes('gluten')
      );
      if (hasGlutenAllergen) {
        return false;
      }
      // 4. Itens naturalmente isentos de glúten (batatas simples/chips, bebidas)
      const isNaturallyGlutenFree =
        normName.includes('batata') ||
        normName.includes('chips') ||
        product.categoryId === 'cat_bebidas';

      return isNaturallyGlutenFree;
    }

    case 'dairy_free': {
      // 1. Tags explícitas de produto
      if (
        normTags.some((t) =>
          ['dairy_free', 'lactose_free', 'sem_lactose', 'sem lactose', 'dairy-free'].includes(t)
        )
      ) {
        return true;
      }
      // 2. Descrição assinala ausência de lactose
      if (
        normDesc.includes('sem lactose') ||
        normDesc.includes('dairy free') ||
        normDesc.includes('sem laticínios') ||
        normName.includes('sem lactose')
      ) {
        return true;
      }
      // 3. Se tiver o alergénio 'Laticínios' ou 'Lactose', não é sem lactose
      const hasDairyAllergen = normAllergens.some(
        (a) => a.includes('laticínios') || a.includes('lactose') || a.includes('leite')
      );
      if (hasDairyAllergen) {
        return false;
      }
      // 4. Se for vegano, não contém laticínios
      if (matchesDietaryFilter(product, 'vegan')) {
        return true;
      }
      // 5. Itens naturalmente isentos de lactose (bebidas sem leite, batatas sem queijo)
      const isNaturallyDairyFree =
        (product.categoryId === 'cat_bebidas' &&
          !normDesc.includes('leite') &&
          !normName.includes('latte') &&
          !normName.includes('cappuccino')) ||
        (normName.includes('batata') &&
          !normDesc.includes('queijo') &&
          !normDesc.includes('cheddar') &&
          !normDesc.includes('manteiga'));

      return isNaturallyDairyFree;
    }

    default:
      return true;
  }
}

/**
 * Garante que o produto cumpre todos os filtros alimentares ativos em simultâneo (interseção / AND).
 */
export function matchesAllDietaryFilters(
  product: Product,
  activeFilters: DietaryFilterId[]
): boolean {
  if (activeFilters.length === 0) return true;
  return activeFilters.every((filterId) => matchesDietaryFilter(product, filterId));
}

interface DietaryFiltersProps {
  activeFilters: DietaryFilterId[];
  onToggleFilter: (filterId: DietaryFilterId) => void;
  onClearFilters?: () => void;
  filteredCount?: number;
}

export const DietaryFilters: React.FC<DietaryFiltersProps> = ({
  activeFilters,
  onToggleFilter,
  onClearFilters,
  filteredCount,
}) => {
  const t = useTranslations('Menu');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasActiveFilters = activeFilters.length > 0;

  return (
    <div
      role="region"
      aria-label={t('all')}
      className="bg-[#F5F4F1] border-b border-[#E5DED6] py-2 transition-all"
    >
      <div className="max-w-4xl mx-auto px-4">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {DIETARY_FILTERS.map((filter) => {
            const isActive = activeFilters.includes(filter.id);
            const labelText = t(filter.labelKey);

            return (
              <button
                key={filter.id}
                type="button"
                role="checkbox"
                aria-checked={isActive}
                aria-label={labelText}
                onClick={() => onToggleFilter(filter.id)}
                className={clsx(
                  'whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5 border select-none',
                  isActive
                    ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939] shadow-xs'
                    : 'bg-[#FFFFFF] text-[#4C453F] border-[#E5DED6] hover:border-[#C09573]/60 hover:text-[#35271F] hover:bg-[#EAE5DF]/40'
                )}
              >
                <span className="text-sm leading-none" aria-hidden="true">
                  {filter.emoji}
                </span>
                <span>{labelText}</span>
                {isActive && (
                  <Check className="w-3.5 h-3.5 stroke-[2.5] text-[#C09573] animate-in zoom-in-50 duration-150" />
                )}
              </button>
            );
          })}

          {/* Botão de Limpeza Rápida com contador de filtros ativos */}
          {hasActiveFilters && onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              aria-label={t('clear')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[#A89F95] hover:text-[#35271F] hover:bg-[#EAE5DF] transition-colors shrink-0 cursor-pointer active:scale-95"
            >
              <X className="w-3.5 h-3.5 stroke-[2]" />
              <span>
                {t('clear')} ({activeFilters.length})
              </span>
            </button>
          )}

          {/* Indicador de resultados filtrados quando ativo */}
          {hasActiveFilters && typeof filteredCount === 'number' && (
            <span className="text-[11px] font-semibold text-[#A89F95] shrink-0 ml-auto hidden sm:inline-block">
              {filteredCount} {filteredCount === 1 ? t('dishAvailable') : t('dishesAvailable')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

