'use client';

import React from 'react';
import { Search, X, Sparkles, Leaf, Zap, Flame } from 'lucide-react';
import { clsx } from 'clsx';

export type MenuFilterType = 'all' | 'especialidade' | 'novidade' | 'picante' | 'vegetariano';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: MenuFilterType;
  onFilterChange: (filter: MenuFilterType) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-2 space-y-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A89F95] pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Procurar no menu..."
          className="w-full pl-10 pr-8 py-2 bg-[#FFFFFF] border border-[#E5DED6] rounded-xl text-xs sm:text-sm text-[#35271F] placeholder-[#A89F95] focus:outline-none focus:border-[#C09573] focus:ring-1 focus:ring-[#C09573]/20 transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A89F95] hover:text-[#35271F] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Quick Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => onFilterChange('all')}
          className={clsx(
            'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer border',
            activeFilter === 'all'
              ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939] shadow-xs'
              : 'text-[#4C453F] bg-[#FFFFFF] border-[#E5DED6] hover:bg-[#EAE5DF]'
          )}
        >
          Todos
        </button>

        <button
          onClick={() => onFilterChange('especialidade')}
          className={clsx(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer border',
            activeFilter === 'especialidade'
              ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939] shadow-xs'
              : 'text-[#4C453F] bg-[#FFFFFF] border-[#E5DED6] hover:bg-[#EAE5DF]'
          )}
        >
          <Sparkles className="w-3 h-3 text-[#C09573]" />
          Especialidades
        </button>

        <button
          onClick={() => onFilterChange('novidade')}
          className={clsx(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer border',
            activeFilter === 'novidade'
              ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939] shadow-xs'
              : 'text-[#4C453F] bg-[#FFFFFF] border-[#E5DED6] hover:bg-[#EAE5DF]'
          )}
        >
          <Zap className="w-3 h-3 text-[#C09573]" />
          Novidades
        </button>

        <button
          onClick={() => onFilterChange('picante')}
          className={clsx(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer border',
            activeFilter === 'picante'
              ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939] shadow-xs'
              : 'text-[#4C453F] bg-[#FFFFFF] border-[#E5DED6] hover:bg-[#EAE5DF]'
          )}
        >
          <Flame className="w-3 h-3 text-[#C09573]" />
          Picantes
        </button>

        <button
          onClick={() => onFilterChange('vegetariano')}
          className={clsx(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer border',
            activeFilter === 'vegetariano'
              ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939] shadow-xs'
              : 'text-[#4C453F] bg-[#FFFFFF] border-[#E5DED6] hover:bg-[#EAE5DF]'
          )}
        >
          <Leaf className="w-3 h-3 text-[#C09573]" />
          Vegetarianos
        </button>
      </div>
    </div>
  );
};
