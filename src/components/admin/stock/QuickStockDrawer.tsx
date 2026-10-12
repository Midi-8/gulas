'use client';

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import {
  ProductStockItem,
  getRestaurantStockList,
  toggleProductAvailability,
} from '@/actions/product-stock';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import {
  X,
  Search,
  Boxes,
  AlertTriangle,
  RefreshCw,
  Loader2,
  PackageX,
  Check,
} from 'lucide-react';

interface QuickStockDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  onStockChanged?: (productId: string, isAvailable: boolean) => void;
}

export function QuickStockDrawer({
  isOpen,
  onClose,
  restaurantId,
  onStockChanged,
}: QuickStockDrawerProps) {
  const [products, setProducts] = useState<ProductStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterOutOfStockOnly, setFilterOutOfStockOnly] = useState(false);
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

  const [isRefreshing, startTransition] = useTransition();

  // Load initial products when opened
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await getRestaurantStockList();
      if (res.success) {
        setProducts(res.data);
      } else {
        setErrorMessage(res.error.message || 'Falha ao carregar artigos.');
      }
    } catch (err: unknown) {
      console.error('[QuickStockDrawer] Erro:', err);
      setErrorMessage('Erro de comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      void loadProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, loadProducts]);

  // Realtime subscription for multi-device sync
  useEffect(() => {
    if (!isOpen || !restaurantId) return;

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`stock-mgmt-${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload: { new: Database['public']['Tables']['products']['Row'] }) => {
          const updatedRow = payload.new;
          if (!updatedRow?.id) return;

          setProducts((prev) =>
            prev.map((item) =>
              item.id === updatedRow.id
                ? {
                    ...item,
                    isAvailable: Boolean(updatedRow.is_available),
                    price: Number(updatedRow.price),
                    name: updatedRow.name,
                  }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, restaurantId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Categories extracted dynamically
  const categories = useMemo(() => {
    const set = new Map<string, string>();
    for (const p of products) {
      if (p.categorySlug && p.categoryName) {
        set.set(p.categorySlug, p.categoryName);
      }
    }
    return Array.from(set.entries()).map(([slug, name]) => ({ slug, name }));
  }, [products]);

  // Out-of-stock count
  const outOfStockCount = useMemo(() => {
    return products.filter((p) => !p.isAvailable).length;
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.categoryName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || p.categorySlug === selectedCategory;

      const matchesStockFilter = !filterOutOfStockOnly || !p.isAvailable;

      return matchesSearch && matchesCategory && matchesStockFilter;
    });
  }, [products, searchQuery, selectedCategory, filterOutOfStockOnly]);

  // Toggle Action with Optimistic UI & Haptics
  const handleToggle = async (productId: string, currentAvailable: boolean) => {
    const nextState = !currentAvailable;

    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // Ignorar se não suportado
      }
    }

    // 1. Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: nextState } : p))
    );
    setPendingToggles((prev) => ({ ...prev, [productId]: true }));

    if (onStockChanged) {
      onStockChanged(productId, nextState);
    }

    // 2. Server Action
    const res = await toggleProductAvailability(productId, nextState);

    setPendingToggles((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });

    // 3. Rollback on failure
    if (!res.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isAvailable: currentAvailable } : p))
      );
      if (onStockChanged) {
        onStockChanged(productId, currentAvailable);
      }
      alert(res.error.message || 'Erro ao atualizar disponibilidade.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#35271F]/40 animate-in fade-in duration-200">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-drawer-title"
        className="relative z-10 w-full max-w-lg bg-[#FFFFFF] h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-250 border-l border-[#E5DED6] text-[#35271F]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5DED6] bg-[#FFFFFF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5E4939] text-[#F5F4F1] flex items-center justify-center shadow-xs flex-shrink-0">
              <Boxes className="w-5 h-5 text-[#C09573]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="stock-drawer-title" className="text-base sm:text-lg font-black tracking-tight text-[#35271F]">
                  Gestão Rápida de Stock
                </h2>
                {outOfStockCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold">
                    {outOfStockCount} esgotados
                  </span>
                )}
              </div>
              <p className="text-xs text-[#4C453F]">
                Comute a disponibilidade para o menu e a cozinha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startTransition(loadProducts)}
              disabled={isLoading || isRefreshing}
              className="w-9 h-9 rounded-xl bg-[#EAE5DF] text-[#4C453F] hover:text-[#35271F] hover:bg-[#E5DED6] flex items-center justify-center transition-all cursor-pointer"
              title="Recarregar lista"
              aria-label="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#EAE5DF] text-[#4C453F] hover:text-[#35271F] hover:bg-[#E5DED6] flex items-center justify-center transition-all cursor-pointer"
              aria-label="Fechar gaveta de stock"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-[#E5DED6] bg-[#F5F4F1] space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4C453F]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar artigo..."
              className="w-full pl-10 pr-4 py-2 bg-[#FFFFFF] border border-[#E5DED6] rounded-xl text-xs sm:text-sm text-[#35271F] placeholder-[#4C453F]/60 focus:outline-none focus:border-[#C09573] transition-colors shadow-2xs"
            />
          </div>

          {/* Category Pills & Out of Stock Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => {
                setSelectedCategory('all');
                setFilterOutOfStockOnly(false);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                selectedCategory === 'all' && !filterOutOfStockOnly
                  ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939]'
                  : 'bg-[#FFFFFF] text-[#4C453F] border-[#E5DED6] hover:bg-[#EAE5DF]'
              }`}
            >
              Todos ({products.length})
            </button>

            {outOfStockCount > 0 && (
              <button
                onClick={() => setFilterOutOfStockOnly(!filterOutOfStockOnly)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  filterOutOfStockOnly
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                Esgotados ({outOfStockCount})
              </button>
            )}

            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  setFilterOutOfStockOnly(false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedCategory === cat.slug && !filterOutOfStockOnly
                    ? 'bg-[#5E4939] text-[#F5F4F1] border-[#5E4939]'
                    : 'bg-[#FFFFFF] text-[#4C453F] border-[#E5DED6] hover:bg-[#EAE5DF]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#F5F4F1]">
          {isLoading && products.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-[#C09573] mx-auto" />
              <p className="text-xs font-bold text-[#4C453F]">A carregar artigos do restaurante...</p>
            </div>
          ) : errorMessage ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#EAE5DF] flex items-center justify-center mx-auto text-[#4C453F]">
                <PackageX className="w-6 h-6 text-[#A89F95]" />
              </div>
              <h3 className="text-sm font-bold text-[#35271F]">Nenhum artigo encontrado</h3>
              <p className="text-xs text-[#4C453F] max-w-xs mx-auto">
                Tente ajustar os termos de pesquisa ou remover os filtros aplicados.
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isPendingThis = Boolean(pendingToggles[product.id]);

              return (
                <div
                  key={product.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    product.isAvailable
                      ? 'bg-[#FFFFFF] border-[#E5DED6] hover:border-[#C09573]/50'
                      : 'bg-[#EAE5DF]/70 border-amber-300/80 shadow-2xs'
                  }`}
                >
                  {/* Left: Product Info */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4
                        className={`text-sm font-bold truncate ${
                          product.isAvailable ? 'text-[#35271F]' : 'text-[#35271F] opacity-75'
                        }`}
                      >
                        {product.name}
                      </h4>
                      {!product.isAvailable && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 border border-amber-400 font-mono text-[10px] font-black uppercase tracking-wider flex-shrink-0">
                          Esgotado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#4C453F]">
                      <span className="font-medium">{product.categoryName}</span>
                      <span>&bull;</span>
                      <span className="font-mono font-bold text-[#35271F]">
                        {product.price.toFixed(2)}€
                      </span>
                    </div>
                  </div>

                  {/* Right: Large Touch-friendly Switch Toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={product.isAvailable}
                      disabled={isPendingThis}
                      onClick={() => handleToggle(product.id, product.isAvailable)}
                      className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C09573] focus:ring-offset-2 ${
                        product.isAvailable ? 'bg-[#5E4939]' : 'bg-[#DDD5CB]'
                      } ${isPendingThis ? 'opacity-60 cursor-wait' : ''}`}
                    >
                      <span className="sr-only">Comutar disponibilidade de {product.name}</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-flex h-8 w-8 transform items-center justify-center rounded-full bg-[#FFFFFF] shadow-md ring-0 transition duration-200 ease-in-out ${
                          product.isAvailable ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      >
                        {isPendingThis ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C09573]" />
                        ) : product.isAvailable ? (
                          <Check className="w-4 h-4 text-[#C09573] stroke-[3]" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-[#A89F95] stroke-[2.5]" />
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-[#E5DED6] bg-[#FFFFFF] flex items-center justify-between text-xs text-[#4C453F]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C09573]" />
            <span>Sincronização em tempo real ativa</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#5E4939] text-[#F5F4F1] font-bold hover:bg-[#453426] transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
