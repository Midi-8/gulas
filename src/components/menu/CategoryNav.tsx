'use client';

import React, { useRef, useEffect } from 'react';
import { Category } from '@/types/restaurant';
import { clsx } from 'clsx';
import { useLanguage } from '@/context/LanguageContext';

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
  const { translateCategoryName } = useLanguage();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement | null>(null);

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
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <nav
      aria-label="Categorias do menu"
      className="sticky top-0 z-30 bg-[#FAFAFA]/85 backdrop-blur-xl border-b border-zinc-200/70 py-2.5 transition-all"
    >
      <div className="max-w-4xl mx-auto px-4">
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {categories.map((category) => {
            const isActive = activeCategoryId === category.id;
            return (
              <button
                key={category.id}
                ref={isActive ? activeBtnRef : null}
                onClick={() => handleCategoryClick(category.id)}
                className={clsx(
                  'whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-semibold tracking-tight transition-all duration-200 shrink-0 cursor-pointer active:scale-95 border',
                  isActive
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-[0_2px_10px_rgba(24,24,27,0.16)]'
                    : 'bg-white/90 text-zinc-600 border-zinc-200/80 hover:border-zinc-300 hover:text-zinc-950 hover:bg-white'
                )}
              >
                {translateCategoryName(category.name)}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
