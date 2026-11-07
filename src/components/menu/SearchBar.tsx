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
    <div className="max-w-4xl mx-auto px-4 pt-3 pb-2 space-y-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Pesquisar prato, bebida ou ingrediente..."
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-zinc-200/80 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Minimalist Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => onFilterChange('all')}
          className={clsx(
            'px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer border',
            activeFilter === 'all'
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'text-zinc-600 bg-white border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900'
          )}
        >
          Todos
        </button>

        <button
          onClick={() => onFilterChange('especialidade')}
          className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer border',
            activeFilter === 'especialidade'
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'text-zinc-600 bg-white border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900'
          )}
        >
          <Sparkles className="w-3 h-3 opacity-70" />
          Especialidades
        </button>

        <button
          onClick={() => onFilterChange('novidade')}
          className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer border',
            activeFilter === 'novidade'
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'text-zinc-600 bg-white border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900'
          )}
        >
          <Zap className="w-3 h-3 opacity-70" />
          Novidades
        </button>

        <button
          onClick={() => onFilterChange('picante')}
          className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer border',
            activeFilter === 'picante'
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'text-zinc-600 bg-white border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900'
          )}
        >
          <Flame className="w-3 h-3 opacity-70" />
          Picantes
        </button>

        <button
          onClick={() => onFilterChange('vegetariano')}
          className={clsx(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer border',
            activeFilter === 'vegetariano'
              ? 'bg-zinc-900 text-white border-zinc-900'
              : 'text-zinc-600 bg-white border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900'
          )}
        >
          <Leaf className="w-3 h-3 opacity-70" />
          Vegetarianos
        </button>
      </div>
    </div>
  );
};
