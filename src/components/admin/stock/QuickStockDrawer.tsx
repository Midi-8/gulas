'use client';

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import {
  ProductStockItem,
  getRestaurantStockList,
  toggleProductAvailability,
  updateProductDetails,
  createCatalogProduct,
  toggleCategoryAvailability,
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
  Pencil,
  Plus,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react';

interface QuickStockDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  onStockChanged?: (productId: string, isAvailable: boolean) => void;
}

const AVAILABLE_BADGES = [
  { id: 'novidade', label: 'Novidade' },
  { id: 'especialidade', label: 'Especialidade' },
  { id: 'picante', label: 'Picante' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetariano', label: 'Vegetariano' },
  { id: 'popular', label: 'Popular' },
];

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
  const [pendingCategoryToggles, setPendingCategoryToggles] = useState<Record<string, boolean>>({});

  // Inline product editing state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUnitQuantity, setEditUnitQuantity] = useState('');
  const [editBadges, setEditBadges] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Create new product state
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUnitQuantity, setNewUnitQuantity] = useState('');
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [isSavingNew, setIsSavingNew] = useState(false);

  const [isRefreshing, startTransition] = useTransition();

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
                    description: updatedRow.description || '',
                    unitQuantity: updatedRow.unit_quantity,
                    badges: updatedRow.badges || [],
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; isActive: boolean }>();
    for (const p of products) {
      if (!map.has(p.categoryId)) {
        map.set(p.categoryId, {
          id: p.categoryId,
          name: p.categoryName,
          isActive: p.categoryIsActive,
        });
      }
    }
    return Array.from(map.values());
  }, [products]);

  const stats = useMemo(() => {
    const total = products.length;
    const outOfStock = products.filter((p) => !p.isAvailable).length;
    const available = total - outOfStock;
    return { total, available, outOfStock };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return products.filter((item) => {
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }
      if (filterOutOfStockOnly && item.isAvailable) {
        return false;
      }
      if (query) {
        return (
          item.name.toLowerCase().includes(query) ||
          item.categoryName.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [products, selectedCategory, filterOutOfStockOnly, searchQuery]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<
      string,
      { categoryId: string; categoryName: string; categoryIsActive: boolean; items: ProductStockItem[] }
    >();
    for (const item of filteredProducts) {
      const existing = groups.get(item.categoryId);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(item.categoryId, {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categoryIsActive: item.categoryIsActive,
          items: [item],
        });
      }
    }
    return Array.from(groups.values());
  }, [filteredProducts]);

  const handleToggleStock = async (item: ProductStockItem) => {
    if (pendingToggles[item.id]) return;

    const nextAvailable = !item.isAvailable;

    setPendingToggles((prev) => ({ ...prev, [item.id]: true }));
    setProducts((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, isAvailable: nextAvailable } : p))
    );
    setErrorMessage(null);

    try {
      const result = await toggleProductAvailability(item.id, nextAvailable);
      if (!result.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === item.id ? { ...p, isAvailable: !nextAvailable } : p))
        );
        setErrorMessage(result.error.message);
      } else {
        onStockChanged?.(item.id, nextAvailable);
      }
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, isAvailable: !nextAvailable } : p))
      );
      setErrorMessage('Falha ao atualizar o artigo.');
    } finally {
      setPendingToggles((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  };

  const handleToggleCategory = async (categoryId: string, currentActive: boolean) => {
    if (pendingCategoryToggles[categoryId]) return;
    const nextActive = !currentActive;

    setPendingCategoryToggles((prev) => ({ ...prev, [categoryId]: true }));
    setProducts((prev) =>
      prev.map((p) =>
        p.categoryId === categoryId ? { ...p, categoryIsActive: nextActive } : p
      )
    );
    setErrorMessage(null);

    try {
      const res = await toggleCategoryAvailability(categoryId, nextActive);
      if (!res.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.categoryId === categoryId ? { ...p, categoryIsActive: currentActive } : p
          )
        );
        setErrorMessage(res.error.message);
      }
    } catch {
      setProducts((prev) =>
        prev.map((p) =>
          p.categoryId === categoryId ? { ...p, categoryIsActive: currentActive } : p
        )
      );
      setErrorMessage('Falha ao alterar estado da categoria.');
    } finally {
      setPendingCategoryToggles((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
    }
  };

  const startEditingProduct = (item: ProductStockItem) => {
    setEditingProductId(item.id);
    setEditName(item.name);
    setEditPrice(item.price.toFixed(2));
    setEditCost(item.cost !== null && item.cost !== undefined ? item.cost.toFixed(2) : '');
    setEditDescription(item.description || '');
    setEditUnitQuantity(item.unitQuantity || '');
    setEditBadges(item.badges || []);
    setErrorMessage(null);
  };

  const handleSaveEdit = async (productId: string) => {
    const parsedPrice = Number(editPrice.replace(',', '.'));
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Introduz um preço válido.');
      return;
    }
    const parsedCost =
      editCost.trim() !== '' ? Number(editCost.replace(',', '.')) : null;
    if (parsedCost !== null && (Number.isNaN(parsedCost) || parsedCost < 0)) {
      setErrorMessage('Introduz um custo válido ou deixa em branco.');
      return;
    }

    setIsSavingEdit(true);
    setErrorMessage(null);
    try {
      const res = await updateProductDetails({
        productId,
        name: editName,
        price: parsedPrice,
        cost: parsedCost,
        description: editDescription,
        unitQuantity: editUnitQuantity || null,
        badges: editBadges,
      });

      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? res.data : p))
        );
        setEditingProductId(null);
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao guardar alterações do artigo.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCategoryId = newCategoryId || categories[0]?.id || '';
    if (!targetCategoryId) {
      setErrorMessage('Seleciona uma categoria.');
      return;
    }
    const parsedPrice = Number(newPrice.replace(',', '.'));
    if (!newName.trim() || Number.isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Preenche o nome e um preço válido.');
      return;
    }
    const parsedCost =
      newCost.trim() !== '' ? Number(newCost.replace(',', '.')) : null;

    setIsSavingNew(true);
    setErrorMessage(null);
    try {
      const res = await createCatalogProduct({
        categoryId: targetCategoryId,
        name: newName,
        price: parsedPrice,
        cost: parsedCost,
        description: newDescription,
        unitQuantity: newUnitQuantity || null,
        badges: newBadges,
      });

      if (res.success) {
        setProducts((prev) => [...prev, res.data]);
        setIsCreatingProduct(false);
        setNewName('');
        setNewPrice('');
        setNewCost('');
        setNewDescription('');
        setNewUnitQuantity('');
        setNewBadges([]);
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao criar novo artigo.');
    } finally {
      setIsSavingNew(false);
    }
  };

  const toggleBadgeInList = (
    badgeId: string,
    list: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (list.includes(badgeId)) {
      setter(list.filter((b) => b !== badgeId));
    } else {
      setter([...list, badgeId]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside className="relative z-10 w-full max-w-xl bg-white text-zinc-900 h-full shadow-2xl border-l border-zinc-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-zinc-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 leading-tight">
                Gestor de Menu, Preços & Stock
              </h2>
              <p className="text-xs text-zinc-500">
                Edita preços, descrições, categorias e disponibilidade em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setIsCreatingProduct((v) => !v);
                if (!newCategoryId && categories[0]) {
                  setNewCategoryId(categories[0].id);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Artigo</span>
            </button>
            <button
              type="button"
              onClick={() => startTransition(() => void loadProducts())}
              disabled={isLoading || isRefreshing}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Recarregar catálogo"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
              aria-label="Fechar gaveta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formulário de Criação de Novo Artigo */}
        {isCreatingProduct && (
          <form
            onSubmit={handleCreateProduct}
            className="p-4 bg-zinc-50 border-b border-zinc-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Criar Novo Artigo no Menu
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingProduct(false)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Categoria
                </label>
                <select
                  value={newCategoryId}
                  onChange={(e) => setNewCategoryId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Nome do Artigo *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Pizza Trufada"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Preço PVP (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="12.50"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Custo (€ opcional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newCost}
                  onChange={(e) => setNewCost(e.target.value)}
                  placeholder="3.80"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Formato / Unid.
                </label>
                <input
                  type="text"
                  value={newUnitQuantity}
                  onChange={(e) => setNewUnitQuantity(e.target.value)}
                  placeholder="Normal / 33cl"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                Descrição / Ingredientes
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ingredientes ou notas do prato..."
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_BADGES.map((b) => {
                  const active = newBadges.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => toggleBadgeInList(b.id, newBadges, setNewBadges)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                        active
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                      }`}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={isSavingNew}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
              >
                {isSavingNew ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Criar Artigo</span>
              </button>
            </div>
          </form>
        )}

        {/* Quick KPI Bar & Filters */}
        <div className="px-5 py-3.5 bg-zinc-50/70 border-b border-zinc-200 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="px-3 py-2 rounded-xl bg-white border border-zinc-200/80">
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">
                Total Menu
              </span>
              <span className="text-base font-bold font-mono text-zinc-900">
                {stats.total}
              </span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-white border border-zinc-200/80">
              <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 block">
                Disponíveis
              </span>
              <span className="text-base font-bold font-mono text-emerald-700">
                {stats.available}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFilterOutOfStockOnly((v) => !v)}
              className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                filterOutOfStockOnly
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white border-zinc-200/80 hover:border-rose-300'
              }`}
            >
              <span
                className={`text-[10px] font-medium uppercase tracking-wider block ${
                  filterOutOfStockOnly ? 'text-rose-100' : 'text-rose-600'
                }`}
              >
                Esgotados {filterOutOfStockOnly ? '(Filtro)' : ''}
              </span>
              <span
                className={`text-base font-bold font-mono ${
                  filterOutOfStockOnly ? 'text-white' : 'text-rose-600'
                }`}
              >
                {stats.outOfStock}
              </span>
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar artigo por nome, descrição ou categoria..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category pills */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                }`}
              >
                Todas
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  <span>{cat.name}</span>
                  {!cat.isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Categoria oculta" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Product List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-900" />
              <span className="text-xs font-medium">A carregar catálogo...</span>
            </div>
          ) : groupedByCategory.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <PackageX className="w-8 h-8 text-zinc-300 mx-auto" />
              <p className="text-sm font-semibold text-zinc-900">
                Nenhum artigo encontrado
              </p>
              <p className="text-xs text-zinc-500">
                Experimenta limpar os filtros ou pesquisar por outro termo.
              </p>
            </div>
          ) : (
            groupedByCategory.map((group) => {
              const isCatPending = Boolean(pendingCategoryToggles[group.categoryId]);
              return (
                <div key={group.categoryId} className="space-y-2">
                  <div className="flex items-center justify-between px-1 pb-1 border-b border-zinc-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                        {group.categoryName}
                      </h3>
                      <span className="text-[10px] font-mono text-zinc-400">
                        ({group.items.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isCatPending}
                      onClick={() =>
                        handleToggleCategory(group.categoryId, group.categoryIsActive)
                      }
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                        group.categoryIsActive
                          ? 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                      title="Ativar ou ocultar esta categoria inteira no menu público"
                    >
                      {group.categoryIsActive ? (
                        <>
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>Categoria Visível</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3 text-rose-600" />
                          <span>Categoria Oculta</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const isPending = Boolean(pendingToggles[item.id]);
                      const isEditing = editingProductId === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border transition-all ${
                            item.isAvailable
                              ? 'bg-white border-zinc-200/80 hover:border-zinc-300'
                              : 'bg-zinc-50 border-rose-200/70'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 p-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-sm font-semibold truncate ${
                                    item.isAvailable
                                      ? 'text-zinc-900'
                                      : 'text-zinc-400 line-through'
                                  }`}
                                >
                                  {item.name}
                                </span>
                                {item.unitQuantity && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10px] font-semibold border border-zinc-200 shrink-0">
                                    {item.unitQuantity}
                                  </span>
                                )}
                                {!item.isAvailable && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                                    Esgotado
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-mono font-semibold text-zinc-900">
                                  {item.price.toFixed(2)} €
                                </span>
                                {item.cost !== null && item.cost !== undefined && (
                                  <span className="text-[10px] font-mono text-zinc-400">
                                    Custo: {item.cost.toFixed(2)} €
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  isEditing
                                    ? setEditingProductId(null)
                                    : startEditingProduct(item)
                                }
                                className={`p-2 rounded-lg border text-xs transition-colors cursor-pointer ${
                                  isEditing
                                    ? 'bg-zinc-900 text-white border-zinc-900'
                                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                                }`}
                                title="Editar preço, descrição ou formato"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleToggleStock(item)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  item.isAvailable
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                    : 'bg-rose-600 text-white hover:bg-emerald-600'
                                } ${isPending ? 'opacity-60 cursor-wait' : ''}`}
                              >
                                {isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : item.isAvailable ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Ativo</span>
                                  </>
                                ) : (
                                  <span>Repor</span>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Painel Inline de Edição */}
                          {isEditing && (
                            <div className="px-3 pb-3 pt-2 border-t border-zinc-100 bg-zinc-50/70 space-y-2.5">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">
                                    Nome
                                  </label>
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">
                                    Formato / Unid.
                                  </label>
                                  <input
                                    type="text"
                                    value={editUnitQuantity}
                                    onChange={(e) => setEditUnitQuantity(e.target.value)}
                                    placeholder="Normal / Familiar / 33cl"
                                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">
                                    Preço PVP (€)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">
                                    Custo Food Cost (€)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={editCost}
                                    onChange={(e) => setEditCost(e.target.value)}
                                    placeholder="Opcional"
                                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">
                                  Descrição / Ingredientes
                                </label>
                                <textarea
                                  rows={2}
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900 resize-none"
                                />
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <div className="flex flex-wrap gap-1">
                                  {AVAILABLE_BADGES.map((b) => {
                                    const active = editBadges.includes(b.id);
                                    return (
                                      <button
                                        key={b.id}
                                        type="button"
                                        onClick={() =>
                                          toggleBadgeInList(b.id, editBadges, setEditBadges)
                                        }
                                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer ${
                                          active
                                            ? 'bg-zinc-900 text-white border-zinc-900'
                                            : 'bg-white text-zinc-600 border-zinc-200'
                                        }`}
                                      >
                                        {b.label}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingProductId(null)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isSavingEdit}
                                    onClick={() => handleSaveEdit(item.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                                  >
                                    {isSavingEdit ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Save className="w-3.5 h-3.5" />
                                    )}
                                    <span>Guardar</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
