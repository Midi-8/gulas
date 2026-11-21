'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ProductStockItem,
  CatalogCategoryItem,
  getRestaurantStockList,
  getRestaurantCategories,
  toggleProductAvailability,
  updateProductDetails,
  createCatalogProduct,
  deleteCatalogProduct,
  duplicateCatalogProduct,
  restoreAllOutOfStockProducts,
  toggleCategoryAvailability,
  createCatalogCategory,
  updateCatalogCategory,
  deleteCatalogCategory,
  getRestaurantSettings,
  updateRestaurantSettings,
} from '@/actions/product-stock';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

interface QuickStockDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  restaurantId: string;
  onStockChanged?: (productId: string, isAvailable: boolean) => void;
  initialProducts?: ProductStockItem[];
  initialCategories?: CatalogCategoryItem[];
  variant?: 'drawer' | 'page';
}

type ManagementSectionFilter = 'all' | 'bar' | 'kitchen';

function isBarCategorySlug(slug?: string | null): boolean {
  return (slug || '').toLowerCase().includes('bebida');
}

function computeProductMargin(price: number, cost: number | null | undefined) {
  if (cost === null || cost === undefined || cost <= 0) {
    return null;
  }
  const marginEur = Math.max(0, price - cost);
  const marginPct = price > 0 ? Math.round((marginEur / price) * 100) : 0;
  return { cost, marginEur, marginPct };
}

export function QuickStockDrawer({
  isOpen = true,
  onClose,
  restaurantId,
  onStockChanged,
  initialProducts,
  initialCategories,
  variant = 'drawer',
}: QuickStockDrawerProps) {
  const [products, setProducts] = useState<ProductStockItem[]>(
    () => initialProducts ?? []
  );
  const [categoryList, setCategoryList] = useState<CatalogCategoryItem[]>(
    () => initialCategories ?? []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState<ManagementSectionFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterOutOfStockOnly, setFilterOutOfStockOnly] = useState(false);
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});
  const [pendingCategoryToggles, setPendingCategoryToggles] = useState<Record<string, boolean>>({});
  const [pendingDuplicates, setPendingDuplicates] = useState<Record<string, boolean>>({});
  const [isRestoringAll, setIsRestoringAll] = useState(false);

  // Inline product editing state
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUnitQuantity, setEditUnitQuantity] = useState('');
  const [editDisplayOrder, setEditDisplayOrder] = useState('0');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState<string | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Create new product state
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUnitQuantity, setNewUnitQuantity] = useState('');
  const [newDisplayOrder, setNewDisplayOrder] = useState('99');
  const [isSavingNew, setIsSavingNew] = useState(false);

  // Category manager state
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatStation, setNewCatStation] = useState<'kitchen' | 'bar'>('kitchen');
  const [newCatOrder, setNewCatOrder] = useState('50');
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [categoryDrafts, setCategoryDrafts] = useState<
    Record<string, { name: string; displayOrder: string }>
  >({});
  const [pendingCatActions, setPendingCatActions] = useState<Record<string, boolean>>({});

  // Restaurant settings state (Horário, Telefone e Subtítulo)
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsHours, setSettingsHours] = useState('');
  const [settingsPhone, setSettingsPhone] = useState('');
  const [settingsTagline, setSettingsTagline] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedMsg, setSettingsSavedMsg] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [stockRes, catRes] = await Promise.all([
        getRestaurantStockList(),
        getRestaurantCategories(),
      ]);
      if (stockRes.success) {
        setProducts(stockRes.data);
      } else {
        setErrorMessage(stockRes.error.message || 'Falha ao carregar artigos.');
      }
      if (catRes.success) {
        setCategoryList(catRes.data);
      }
    } catch (err: unknown) {
      console.error('[QuickStockDrawer] Erro:', err);
      setErrorMessage('Erro de comunicação com o servidor.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || initialProducts !== undefined) return;
    const timer = setTimeout(() => {
      void loadProducts();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, initialProducts, loadProducts]);

  useEffect(() => {
    const onGlobalRefresh = () => {
      void loadProducts();
    };
    window.addEventListener('gulas:admin-refresh', onGlobalRefresh);
    return () => {
      window.removeEventListener('gulas:admin-refresh', onGlobalRefresh);
    };
  }, [loadProducts]);

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
                    imageUrl: updatedRow.image_url,
                    prepTimeMinutes: updatedRow.prep_time_minutes,
                    displayOrder: updatedRow.display_order,
                    badges: updatedRow.badges || [],
                    allergens: updatedRow.allergens || [],
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
      if (variant === 'drawer' && e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [variant, isOpen, onClose]);

  const categories = useMemo<CatalogCategoryItem[]>(() => {
    const map = new Map<string, CatalogCategoryItem>();
    for (const c of categoryList) {
      map.set(c.id, c);
    }
    for (const p of products) {
      if (!map.has(p.categoryId)) {
        map.set(p.categoryId, {
          id: p.categoryId,
          name: p.categoryName,
          slug: p.categorySlug,
          isActive: p.categoryIsActive,
          displayOrder: 50,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'pt-PT')
    );
  }, [categoryList, products]);

  const productCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
    }
    return counts;
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
      if (sectionFilter === 'bar' && !isBarCategorySlug(item.categorySlug)) {
        return false;
      }
      if (sectionFilter === 'kitchen' && isBarCategorySlug(item.categorySlug)) {
        return false;
      }
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
  }, [products, sectionFilter, selectedCategory, filterOutOfStockOnly, searchQuery]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        categorySlug: string;
        categoryIsActive: boolean;
        displayOrder: number;
        items: ProductStockItem[];
      }
    >();

    const catLookup = new Map(categories.map((c) => [c.id, c]));

    for (const item of filteredProducts) {
      const existing = groups.get(item.categoryId);
      if (existing) {
        existing.items.push(item);
      } else {
        const catMeta = catLookup.get(item.categoryId);
        groups.set(item.categoryId, {
          categoryId: item.categoryId,
          categoryName: catMeta?.name || item.categoryName,
          categorySlug: catMeta?.slug || item.categorySlug,
          categoryIsActive: catMeta?.isActive ?? item.categoryIsActive,
          displayOrder: catMeta?.displayOrder ?? 50,
          items: [item],
        });
      }
    }

    // Mostrar também categorias vazias quando não há pesquisa ou filtro de esgotados ativo
    if (!filterOutOfStockOnly && !searchQuery.trim()) {
      for (const cat of categories) {
        if (selectedCategory !== 'all' && cat.id !== selectedCategory) continue;
        if (sectionFilter === 'bar' && !isBarCategorySlug(cat.slug)) continue;
        if (sectionFilter === 'kitchen' && isBarCategorySlug(cat.slug)) continue;
        if (!groups.has(cat.id)) {
          groups.set(cat.id, {
            categoryId: cat.id,
            categoryName: cat.name,
            categorySlug: cat.slug,
            categoryIsActive: cat.isActive,
            displayOrder: cat.displayOrder,
            items: [],
          });
        }
      }
    }

    return Array.from(groups.values())
      .map((g) => ({
        ...g,
        items: [...g.items].sort(
          (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'pt-PT')
        ),
      }))
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder ||
          a.categoryName.localeCompare(b.categoryName, 'pt-PT')
      );
  }, [
    filteredProducts,
    categories,
    selectedCategory,
    sectionFilter,
    filterOutOfStockOnly,
    searchQuery,
  ]);

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

  const handleRestoreAllOutOfStock = async () => {
    if (isRestoringAll || stats.outOfStock === 0) return;
    setIsRestoringAll(true);
    setErrorMessage(null);

    try {
      const res = await restoreAllOutOfStockProducts();
      if (res.success) {
        setProducts((prev) => prev.map((p) => ({ ...p, isAvailable: true })));
        setFilterOutOfStockOnly(false);
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao repor todos os artigos esgotados.');
    } finally {
      setIsRestoringAll(false);
    }
  };

  const handleToggleCategory = async (categoryId: string, currentActive: boolean) => {
    if (pendingCategoryToggles[categoryId]) return;
    const nextActive = !currentActive;

    setPendingCategoryToggles((prev) => ({ ...prev, [categoryId]: true }));
    setCategoryList((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, isActive: nextActive } : c))
    );
    setProducts((prev) =>
      prev.map((p) =>
        p.categoryId === categoryId ? { ...p, categoryIsActive: nextActive } : p
      )
    );
    setErrorMessage(null);

    try {
      const res = await toggleCategoryAvailability(categoryId, nextActive);
      if (!res.success) {
        setCategoryList((prev) =>
          prev.map((c) => (c.id === categoryId ? { ...c, isActive: currentActive } : c))
        );
        setProducts((prev) =>
          prev.map((p) =>
            p.categoryId === categoryId ? { ...p, categoryIsActive: currentActive } : p
          )
        );
        setErrorMessage(res.error.message);
      }
    } catch {
      setCategoryList((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, isActive: currentActive } : c))
      );
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

  const getCategoryDraft = (cat: CatalogCategoryItem) =>
    categoryDrafts[cat.id] ?? {
      name: cat.name,
      displayOrder: String(cat.displayOrder),
    };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingCat || !newCatName.trim()) return;
    const parsedOrder = Number(newCatOrder);
    setIsCreatingCat(true);
    setErrorMessage(null);
    try {
      const res = await createCatalogCategory({
        name: newCatName.trim(),
        station: newCatStation,
        displayOrder: Number.isNaN(parsedOrder) ? 50 : Math.max(0, Math.round(parsedOrder)),
      });
      if (res.success) {
        setCategoryList((prev) => [...prev, res.data]);
        setNewCatName('');
        setNewCatOrder('50');
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao criar nova categoria.');
    } finally {
      setIsCreatingCat(false);
    }
  };

  const handleSaveCategoryEdit = async (cat: CatalogCategoryItem) => {
    const draft = getCategoryDraft(cat);
    const parsedOrder = Number(draft.displayOrder);
    if (!draft.name.trim() || Number.isNaN(parsedOrder) || parsedOrder < 0) {
      setErrorMessage('Preenche um nome e ordem válidos para a categoria.');
      return;
    }

    setPendingCatActions((prev) => ({ ...prev, [cat.id]: true }));
    setErrorMessage(null);
    try {
      const res = await updateCatalogCategory({
        categoryId: cat.id,
        name: draft.name.trim(),
        displayOrder: Math.round(parsedOrder),
      });
      if (res.success) {
        setCategoryList((prev) =>
          prev.map((c) => (c.id === cat.id ? res.data : c))
        );
        setProducts((prev) =>
          prev.map((p) =>
            p.categoryId === cat.id ? { ...p, categoryName: res.data.name } : p
          )
        );
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao atualizar categoria.');
    } finally {
      setPendingCatActions((prev) => {
        const next = { ...prev };
        delete next[cat.id];
        return next;
      });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    setPendingCatActions((prev) => ({ ...prev, [catId]: true }));
    setErrorMessage(null);
    try {
      const res = await deleteCatalogCategory(catId);
      if (res.success) {
        setCategoryList((prev) => prev.filter((c) => c.id !== catId));
        if (selectedCategory === catId) {
          setSelectedCategory('all');
        }
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao eliminar categoria.');
    } finally {
      setPendingCatActions((prev) => {
        const next = { ...prev };
        delete next[catId];
        return next;
      });
    }
  };

  const startEditingProduct = (item: ProductStockItem) => {
    setEditingProductId(item.id);
    setConfirmDeleteProductId(null);
    setEditCategoryId(item.categoryId);
    setEditName(item.name);
    setEditPrice(item.price.toFixed(2));
    setEditCost(item.cost !== null && item.cost !== undefined ? item.cost.toFixed(2) : '');
    setEditDescription(item.description || '');
    setEditUnitQuantity(item.unitQuantity || '');
    setEditDisplayOrder(String(item.displayOrder ?? 0));
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
    const parsedOrder = Number(editDisplayOrder);
    if (Number.isNaN(parsedOrder) || parsedOrder < 0) {
      setErrorMessage('Introduz uma ordem de exibição válida (0 ou superior).');
      return;
    }

    setIsSavingEdit(true);
    setErrorMessage(null);
    try {
      const res = await updateProductDetails({
        productId,
        categoryId: editCategoryId || undefined,
        name: editName,
        price: parsedPrice,
        cost: parsedCost,
        description: editDescription,
        unitQuantity: editUnitQuantity || null,
        displayOrder: Math.round(parsedOrder),
      });

      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? res.data : p))
        );
        setEditingProductId(null);
        setConfirmDeleteProductId(null);
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao guardar alterações do artigo.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDuplicateProduct = async (productId: string) => {
    if (pendingDuplicates[productId]) return;
    setPendingDuplicates((prev) => ({ ...prev, [productId]: true }));
    setErrorMessage(null);
    try {
      const res = await duplicateCatalogProduct(productId);
      if (res.success) {
        setProducts((prev) => [...prev, res.data]);
        startEditingProduct(res.data);
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao duplicar o artigo.');
    } finally {
      setPendingDuplicates((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (isDeletingProduct) return;
    setIsDeletingProduct(true);
    setErrorMessage(null);
    try {
      const res = await deleteCatalogProduct(productId);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        setEditingProductId(null);
        setConfirmDeleteProductId(null);
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao eliminar o artigo.');
    } finally {
      setIsDeletingProduct(false);
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
    if (parsedCost !== null && (Number.isNaN(parsedCost) || parsedCost < 0)) {
      setErrorMessage('Introduz um custo válido ou deixa em branco.');
      return;
    }
    const parsedOrder = newDisplayOrder.trim() !== '' ? Number(newDisplayOrder) : 99;

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
        displayOrder: Number.isNaN(parsedOrder) ? 99 : Math.max(0, Math.round(parsedOrder)),
      });

      if (res.success) {
        setProducts((prev) => [...prev, res.data]);
        setIsCreatingProduct(false);
        setNewName('');
        setNewPrice('');
        setNewCost('');
        setNewDescription('');
        setNewUnitQuantity('');
        setNewDisplayOrder('99');
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao criar novo artigo.');
    } finally {
      setIsSavingNew(false);
    }
  };

  const handleOpenSettings = async () => {
    const nextState = !isEditingSettings;
    setIsEditingSettings(nextState);
    setSettingsSavedMsg(null);
    if (nextState) {
      const res = await getRestaurantSettings();
      if (res.success) {
        setSettingsHours(res.data.openingHours);
        setSettingsPhone(res.data.phone);
        setSettingsTagline(res.data.tagline);
      }
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingSettings) return;
    setIsSavingSettings(true);
    setErrorMessage(null);
    setSettingsSavedMsg(null);
    try {
      const res = await updateRestaurantSettings({
        openingHours: settingsHours,
        phone: settingsPhone,
        tagline: settingsTagline,
      });
      if (res.success) {
        setSettingsSavedMsg('Definições guardadas com sucesso!');
      } else {
        setErrorMessage(res.error.message);
      }
    } catch {
      setErrorMessage('Erro ao guardar definições do restaurante.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (variant === 'drawer' && !isOpen) return null;

  const content = (
    <>
      {/* Header */}
      <div className="px-5 sm:px-7 py-5 bg-white border-b border-zinc-200/80 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-950 tracking-tight">
            Gestão de Menu, Preços &amp; Stock
          </h1>

          {variant === 'drawer' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3 rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white transition-all cursor-pointer"
              aria-label="Fechar gaveta"
            >
              Fechar
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleOpenSettings()}
              className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] ${
                isEditingSettings
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'bg-zinc-50 border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
              }`}
              title="Editar horário de serviço, telefone e subtítulo"
            >
              Horário &amp; Informações
            </button>
            <button
              type="button"
              onClick={() => setIsManagingCategories((v) => !v)}
              className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] ${
                isManagingCategories
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'bg-zinc-50 border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
              }`}
            >
              Gerir Categorias ({categories.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingProduct((v) => !v);
                if (!newCategoryId && categories[0]) {
                  setNewCategoryId(categories[0].id);
                }
              }}
              className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] ${
                isCreatingProduct
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'bg-zinc-50 border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
              }`}
            >
              Novo Artigo
            </button>
          </div>

          {stats.outOfStock > 0 && (
            <button
              type="button"
              disabled={isRestoringAll}
              onClick={() => void handleRestoreAllOutOfStock()}
              className="h-10 px-4 cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-600 hover:border-emerald-700 hover:text-white active:scale-[0.98] disabled:opacity-50"
            >
              {isRestoringAll
                ? 'A repor stock...'
                : `Repor Todos os Esgotados (${stats.outOfStock})`}
            </button>
          )}
        </div>
      </div>

        {/* Painel de Horário, Telefone e Subtítulo do Restaurante */}
        {isEditingSettings && (
          <form
            onSubmit={handleSaveSettings}
            className="p-4 bg-zinc-50 border-b border-zinc-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Horário &amp; Informações do Menu
              </span>
              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Horário de Serviço *
                </label>
                <input
                  type="text"
                  required
                  value={settingsHours}
                  onChange={(e) => setSettingsHours(e.target.value)}
                  placeholder="12:00 – 15:00 • 19:00 – 23:00"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={settingsPhone}
                  onChange={(e) => setSettingsPhone(e.target.value)}
                  placeholder="+351 252 870 120"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                Subtítulo / Aviso no Topo do Menu
              </label>
              <input
                type="text"
                value={settingsTagline}
                onChange={(e) => setSettingsTagline(e.target.value)}
                placeholder="Ex: Pizza · Burger · Coffee"
                className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              {settingsSavedMsg ? (
                <span className="text-xs font-semibold text-emerald-700">
                  {settingsSavedMsg}
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={isSavingSettings}
                className="h-10 px-5 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingSettings ? 'A guardar...' : 'Guardar Definições'}
              </button>
            </div>
          </form>
        )}

        {/* Painel de Gestão de Categorias */}
        {isManagingCategories && (
          <div className="p-5 sm:p-6 bg-zinc-50 border-b border-zinc-200 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                Gerir Categorias do Menu
              </span>
              <button
                type="button"
                onClick={() => setIsManagingCategories(false)}
                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <form
              onSubmit={handleCreateCategory}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3.5 rounded-2xl bg-white border border-zinc-200/90"
            >
              <div className="sm:col-span-5">
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                  Nova Categoria *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Sugestões do Chef"
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                  Secção
                </label>
                <select
                  value={newCatStation}
                  onChange={(e) =>
                    setNewCatStation(e.target.value as 'kitchen' | 'bar')
                  }
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                >
                  <option value="kitchen">Cozinha</option>
                  <option value="bar">Bar / Copa</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                  Ordem
                </label>
                <input
                  type="number"
                  min="0"
                  value={newCatOrder}
                  onChange={(e) => setNewCatOrder(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>
              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={isCreatingCat}
                  className="w-full h-9 px-3 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingCat ? 'A criar...' : 'Criar'}
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const draft = getCategoryDraft(cat);
                const count = productCountByCategory[cat.id] ?? 0;
                const isCatBusy =
                  Boolean(pendingCatActions[cat.id]) ||
                  Boolean(pendingCategoryToggles[cat.id]);
                const isBar = isBarCategorySlug(cat.slug);

                return (
                  <div
                    key={cat.id}
                    className="grid grid-cols-1 sm:grid-cols-12 items-center gap-2 p-2.5 rounded-xl bg-white border border-zinc-200/80"
                  >
                    <div className="sm:col-span-4 flex items-center gap-2">
                      <input
                        type="text"
                        value={draft.name}
                        onChange={(e) =>
                          setCategoryDrafts((prev) => ({
                            ...prev,
                            [cat.id]: { ...draft, name: e.target.value },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold border bg-zinc-100 text-zinc-700 border-zinc-200">
                        {isBar ? 'Bar / Copa' : 'Cozinha'}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {count} art.
                      </span>
                    </div>

                    <div className="sm:col-span-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 font-semibold">
                        Ordem:
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={draft.displayOrder}
                        onChange={(e) =>
                          setCategoryDrafts((prev) => ({
                            ...prev,
                            [cat.id]: { ...draft, displayOrder: e.target.value },
                          }))
                        }
                        className="w-16 px-2 py-1 text-xs font-mono bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 focus:bg-white focus:outline-none focus:border-zinc-900"
                      />
                    </div>

                    <div className="sm:col-span-4 flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={isCatBusy}
                        onClick={() => void handleSaveCategoryEdit(cat)}
                        className="h-8 px-3 rounded-lg border border-zinc-900 bg-zinc-900 text-white text-[11px] font-semibold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        disabled={isCatBusy}
                        onClick={() => void handleToggleCategory(cat.id, cat.isActive)}
                        className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {cat.isActive ? 'Visível' : 'Oculta'}
                      </button>
                      <button
                        type="button"
                        disabled={isCatBusy || count > 0}
                        onClick={() => void handleDeleteCategory(cat.id)}
                        title={
                          count > 0
                            ? 'Só podes eliminar categorias sem artigos'
                            : 'Eliminar categoria vazia'
                        }
                        className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-[11px] font-semibold hover:bg-rose-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Formulário de Criação de Novo Artigo */}
        {isCreatingProduct && (
          <form
            onSubmit={handleCreateProduct}
            className="p-5 sm:p-6 bg-zinc-50 border-b border-zinc-200 space-y-3"
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                  Formato / Unid.
                </label>
                <input
                  type="text"
                  value={newUnitQuantity}
                  onChange={(e) => setNewUnitQuantity(e.target.value)}
                  placeholder="Normal / Familiar / 33cl"
                  className="w-full px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
                  Ordem no Menu
                </label>
                <input
                  type="number"
                  min="0"
                  value={newDisplayOrder}
                  onChange={(e) => setNewDisplayOrder(e.target.value)}
                  placeholder="99"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-zinc-900"
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

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSavingNew}
                className="h-10 px-5 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSavingNew ? 'A criar...' : 'Criar Artigo'}
              </button>
            </div>
          </form>
        )}

        {/* Quick KPI Bar & Filters */}
        <div className="px-5 sm:px-7 py-4 bg-zinc-50/70 border-b border-zinc-200/80 space-y-3">
          <div className="flex flex-row items-stretch gap-2 sm:gap-3 w-full">
            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 sm:gap-3 rounded-xl border-2 border-zinc-800 bg-white px-3 sm:px-4 py-2.5 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-700 truncate">
                Total Menu
              </span>
              <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-zinc-950 shrink-0">
                {stats.total}
              </span>
            </div>

            <div className="flex-1 min-w-0 flex items-center justify-between gap-2 sm:gap-3 rounded-xl border-2 border-emerald-600 bg-white px-3 sm:px-4 py-2.5 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-800 truncate">
                Disponíveis
              </span>
              <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-zinc-950 shrink-0">
                {stats.available}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setFilterOutOfStockOnly((v) => !v)}
              className={`flex-1 min-w-0 flex items-center justify-between gap-2 sm:gap-3 rounded-xl border-2 px-3 sm:px-4 py-2.5 shadow-2xs transition-all cursor-pointer ${
                filterOutOfStockOnly
                  ? 'bg-rose-600 text-white border-rose-700'
                  : 'bg-white border-rose-500 text-rose-800 hover:bg-rose-50'
              }`}
            >
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                Esgotados {filterOutOfStockOnly ? '(Filtro)' : ''}
              </span>
              <span className="text-base sm:text-lg font-bold font-mono tracking-tight shrink-0">
                {stats.outOfStock}
              </span>
            </button>
          </div>

          {/* Search input */}
          <div className="flex items-center bg-white border border-zinc-200/90 focus-within:border-zinc-900 h-10 rounded-xl shadow-2xs transition-colors overflow-hidden">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar artigo por nome, descrição ou categoria..."
              className="h-full w-full px-3.5 bg-transparent text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="h-full px-3 border-l border-zinc-200 text-[11px] font-semibold text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer transition-colors"
                aria-label="Limpar pesquisa"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Filtros de Secção (Bar/Copa vs Cozinha) & Categorias */}
          <div className="flex flex-wrap items-center gap-2 pb-0.5">
            {(
              [
                { key: 'all', label: 'Todos' },
                { key: 'bar', label: 'Bar / Copa' },
                { key: 'kitchen', label: 'Cozinha' },
              ] as const
            ).map((sec) => (
              <button
                key={sec.key}
                type="button"
                onClick={() => setSectionFilter(sec.key)}
                className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] whitespace-nowrap ${
                  sectionFilter === sec.key
                    ? 'bg-zinc-900 border-zinc-900 text-white'
                    : 'bg-white border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
                }`}
              >
                {sec.label}
              </button>
            ))}

            {categories.length > 0 && (
              <span className="hidden sm:inline-block h-6 w-px bg-zinc-200 mx-1" />
            )}

            {categories.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] whitespace-nowrap ${
                    selectedCategory === 'all'
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-white border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
                  }`}
                >
                  Todas Categorias
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : !cat.isActive
                        ? 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                        : 'bg-white border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Product List */}
        <div
          className={
            variant === 'page'
              ? 'px-5 sm:px-7 py-5 space-y-6'
              : 'flex-1 overflow-y-auto px-5 py-4 space-y-6'
          }
        >
          {isLoading ? (
            <div className="py-16 text-center text-zinc-500">
              <span className="text-xs font-semibold">A carregar catálogo...</span>
            </div>
          ) : groupedByCategory.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-semibold text-zinc-950">
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
                  <div className="flex items-center justify-between px-1 pb-1.5 border-b border-zinc-200/80">
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
                      className={`px-3 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer shadow-2xs ${
                        group.categoryIsActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                      }`}
                      title="Ativar ou ocultar esta categoria inteira no menu público"
                    >
                      {group.categoryIsActive ? 'Categoria Visível' : 'Categoria Oculta'}
                    </button>
                  </div>

                  {group.items.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/70 text-xs text-zinc-500">
                      Categoria sem artigos de momento. Clica em &quot;Novo Artigo&quot; para adicionar o primeiro.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {group.items.map((item) => {
                        const isPending = Boolean(pendingToggles[item.id]);
                        const isDuplicating = Boolean(pendingDuplicates[item.id]);
                        const isEditing = editingProductId === item.id;
                        const marginInfo = computeProductMargin(item.price, item.cost);

                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl border transition-all ${
                              item.isAvailable
                                ? 'bg-white border-zinc-200/80 hover:border-zinc-300'
                                : 'bg-zinc-50 border-rose-200/70'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
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
                                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
                                  <span className="text-xs font-mono font-semibold text-zinc-900">
                                    {item.price.toFixed(2)} €
                                  </span>
                                  {marginInfo && (
                                    <>
                                      <span className="text-[10px] font-mono text-zinc-400">
                                        Custo: {marginInfo.cost.toFixed(2)} €
                                      </span>
                                      <span
                                        className={`text-[10px] font-mono font-semibold ${
                                          marginInfo.marginPct >= 60
                                            ? 'text-emerald-700'
                                            : 'text-zinc-600'
                                        }`}
                                      >
                                        Margem: +{marginInfo.marginEur.toFixed(2)} € ({marginInfo.marginPct}%)
                                      </span>
                                    </>
                                  )}
                                  <span className="text-[10px] font-mono text-zinc-400">
                                    #{item.displayOrder}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <button
                                  type="button"
                                  disabled={isDuplicating}
                                  onClick={() => void handleDuplicateProduct(item.id)}
                                  className="h-9 px-3 rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white disabled:opacity-50 cursor-pointer"
                                  title="Criar uma cópia deste artigo"
                                >
                                  {isDuplicating ? 'A copiar...' : 'Duplicar'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isEditing) {
                                      setEditingProductId(null);
                                      setConfirmDeleteProductId(null);
                                    } else {
                                      startEditingProduct(item);
                                    }
                                  }}
                                  className={`h-9 px-3.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                                    isEditing
                                      ? 'bg-zinc-900 text-white border-zinc-900'
                                      : 'bg-zinc-50 text-zinc-700 border-zinc-200/90 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
                                  }`}
                                  title="Editar preço, categoria, ordem, tempo ou imagem"
                                >
                                  {isEditing ? 'Fechar' : 'Editar'}
                                </button>

                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleToggleStock(item)}
                                  className={`h-9 px-4 rounded-xl border text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                                    item.isAvailable
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-rose-50 hover:text-rose-800 hover:border-rose-200'
                                      : 'bg-rose-600 border-rose-700 text-white hover:bg-emerald-600 hover:border-emerald-700'
                                  } ${isPending ? 'opacity-60 cursor-wait' : ''}`}
                                >
                                  {isPending
                                    ? 'A atualizar...'
                                    : item.isAvailable
                                    ? 'Ativo'
                                    : 'Repor'}
                                </button>
                              </div>
                            </div>

                            {/* Painel Inline de Edição */}
                            {isEditing && (
                              <div className="px-3 pb-3 pt-2.5 border-t border-zinc-100 bg-zinc-50/70 space-y-2.5">
                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                                  <div>
                                    <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">
                                      Categoria
                                    </label>
                                    <select
                                      value={editCategoryId}
                                      onChange={(e) => setEditCategoryId(e.target.value)}
                                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-zinc-900"
                                    >
                                      {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
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

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                                  <div>
                                    <label className="block text-[10px] font-semibold text-zinc-500 mb-0.5">
                                      Ordem no Menu
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={editDisplayOrder}
                                      onChange={(e) => setEditDisplayOrder(e.target.value)}
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

                                <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1">
                                  {confirmDeleteProductId === item.id ? (
                                      <>
                                        <button
                                          type="button"
                                          disabled={isDeletingProduct}
                                          onClick={() => void handleDeleteProduct(item.id)}
                                          className="px-3 py-1.5 rounded-xl border border-rose-700 bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                                        >
                                          {isDeletingProduct
                                            ? 'A eliminar...'
                                            : 'Confirmar Eliminação'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteProductId(null)}
                                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer"
                                        >
                                          Manter
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteProductId(item.id)}
                                        className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold hover:bg-rose-600 hover:text-white cursor-pointer transition-colors"
                                      >
                                        Eliminar
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingProductId(null);
                                        setConfirmDeleteProductId(null);
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-900 cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSavingEdit}
                                      onClick={() => handleSaveEdit(item.id)}
                                      className="px-4 py-1.5 rounded-xl border border-zinc-900 bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 cursor-pointer transition-all"
                                    >
                                      {isSavingEdit ? 'A guardar...' : 'Guardar'}
                                    </button>
                                  </div>
                                </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
    </>
  );

  if (variant === 'page') {
    return (
      <div className="space-y-6 pb-12">
        <div className="rounded-3xl border border-zinc-200/90 bg-white text-zinc-900 shadow-xs overflow-hidden flex flex-col">
          {content}
        </div>
      </div>
    );
  }

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
        {content}
      </aside>
    </div>
  );
}
