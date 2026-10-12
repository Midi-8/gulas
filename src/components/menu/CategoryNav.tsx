'use client';

import React, { useRef, useEffect } from 'react';
import { Category } from '@/types/restaurant';
import { clsx } from 'clsx';

interface CategoryNavProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Mantém a categoria ativa centrada no scroll horizontal
  useEffect(() => {
    if (activeBtnRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const btn = activeBtnRef.current;
      const targetScroll =
        btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
      container.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
    }
  }, [activeCategoryId]);

  const handleCategoryClick = (categoryId: string) => {
    onSelectCategory(categoryId);
    const element = document.getElementById(`section-${categoryId}`);
    if (element) {
      const yOffset = -90; // compensação da altura da barra adesiva
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav
      aria-label="Categorias do menu"
      className="sticky top-0 z-30 bg-[#F5F4F1]/90 backdrop-blur-sm border-b border-[#E5DED6] py-2.5 transition-all"
    >
      <div className="max-w-4xl mx-auto px-4">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {categories.map((category) => {
            const isActive = activeCategoryId === category.id;
            return (
              <button
                key={category.id}
                ref={isActive ? activeBtnRef : null}
                onClick={() => handleCategoryClick(category.id)}
                className={clsx(
                  'whitespace-nowrap px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer active:scale-95 border',
                  isActive
                    ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939] shadow-xs'
                    : 'bg-[#FFFFFF] text-[#4C453F] border-[#E5DED6] hover:border-[#C09573]/60 hover:text-[#35271F] hover:bg-[#EAE5DF]/60'
                )}
              >
                {category.name}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
