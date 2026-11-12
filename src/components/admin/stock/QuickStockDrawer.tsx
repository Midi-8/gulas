'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useTransition,
  useCallback,
  useRef,
} from 'react';
import Image from 'next/image';
import {
  ProductStockItem,
  CategoryStockItem,
  getRestaurantStockList,
  getRestaurantCategories,
  toggleProductAvailability,
  updateProductImage,
  createCategory,
  updateCategoryPosition,
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
  Camera,
  ArrowUp,
  ArrowDown,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';

interface QuickStockDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  onStockChanged?: (productId: string, isAvailable: boolean) => void;
}

interface ImageUploadStatus {
  state: 'idle' | 'resizing' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  previewUrl?: string;
}

/**
 * Redimensiona a imagem no browser para no máximo 800x800 px mantendo a proporção
 * e converte para WebP com qualidade 0.82 via <canvas>.
 */
async function processAndCompressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Falha ao ler o ficheiro local.'));

    reader.onload = (event) => {
      const img = new window.Image();

      img.onerror = () => reject(new Error('Falha ao decodificar a imagem.'));

      img.onload = () => {
        const MAX_DIMENSION = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D não suportado neste navegador.'));
          return;
        }

        // Desenhar a imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Conversão obrigatória para WebP com qualidade 0.82
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Erro na conversão para WebP no browser.'));
            }
          },
          'image/webp',
          0.82
        );
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export function QuickStockDrawer({
  isOpen,
  onClose,
  restaurantId,
  onStockChanged,
}: QuickStockDrawerProps) {
  // Tabs: 'products' | 'categories'
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');

  const [products, setProducts] = useState<ProductStockItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<CategoryStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filtros de produtos
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterOutOfStockOnly, setFilterOutOfStockOnly] = useState(false);
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

  // Upload de Imagens
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, ImageUploadStatus>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Gestor de Categorias
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoryActionPending, setCategoryActionPending] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Transitions
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [, startServerTransition] = useTransition();

  // Carregar produtos e categorias
  const loadData = useCallback(async () => {
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

      if (catRes.ok && catRes.data) {
        setCategoriesList(catRes.data);
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
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, loadData]);

  // Realtime subscription para sincronização multi-dispositivo
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
                    imageUrl: updatedRow.image_url ?? item.imageUrl,
                  }
                : item
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          void getRestaurantCategories().then((res) => {
            if (res.ok && res.data) {
              setCategoriesList(res.data);
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, restaurantId]);

  // Fechar com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Categorias consolidadas (da lista oficial com fallback aos produtos)
  const categories = useMemo(() => {
    if (categoriesList.length > 0) {
      return categoriesList.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        position: c.position,
      }));
    }
    const map = new Map<string, { id: string; slug: string; name: string; position: number }>();
    products.forEach((p, idx) => {
      if (p.categorySlug && p.categoryName && !map.has(p.categorySlug)) {
        map.set(p.categorySlug, {
          id: p.categoryId,
          slug: p.categorySlug,
          name: p.categoryName,
          position: idx + 1,
        });
      }
    });
    return Array.from(map.values());
  }, [categoriesList, products]);

  // Contagem de esgotados
  const outOfStockCount = useMemo(() => {
    return products.filter((p) => !p.isAvailable).length;
  }, [products]);

  // Filtragem de produtos
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

  // Comutação de disponibilidade com Optimistic UI
  const handleToggle = async (productId: string, currentAvailable: boolean) => {
    const nextState = !currentAvailable;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(50);
      } catch {
        // Ignorar se não suportado
      }
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: nextState } : p))
    );
    setPendingToggles((prev) => ({ ...prev, [productId]: true }));

    if (onStockChanged) {
      onStockChanged(productId, nextState);
    }

    const res = await toggleProductAvailability(productId, nextState);

    setPendingToggles((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });

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

  // Upload e compressão de imagem para o produto
  const handleFileChange = async (productId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Pré-visualização imediata
    const localPreviewUrl = URL.createObjectURL(file);
    setUploadStatuses((prev) => ({
      ...prev,
      [productId]: {
        state: 'resizing',
        previewUrl: localPreviewUrl,
      },
    }));

    try {
      // 2. Compressão no browser: max 800x800, WebP 0.82
      const compressedBlob = await processAndCompressImage(file);

      setUploadStatuses((prev) => ({
        ...prev,
        [productId]: {
          state: 'uploading',
          previewUrl: localPreviewUrl,
        },
      }));

      // 3. Enviar para a API route de upload
      const formData = new FormData();
      formData.append('file', compressedBlob, `${productId}.webp`);
      formData.append('productId', productId);

      const response = await fetch('/api/admin/product-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.ok || !result.url) {
        throw new Error(result.error || 'Falha no upload para o servidor.');
      }

      const publicImageUrl = result.url;

      // 4. Executar Server Action para atualizar o banco e revalidar cache
      startServerTransition(async () => {
        const actionResult = await updateProductImage(productId, publicImageUrl);

        if (actionResult.ok) {
          // Atualiza estado local de produtos
          setProducts((prev) =>
            prev.map((p) => (p.id === productId ? { ...p, imageUrl: publicImageUrl } : p))
          );

          setUploadStatuses((prev) => ({
            ...prev,
            [productId]: {
              state: 'success',
              previewUrl: publicImageUrl,
            },
          }));

          // Remove estado de sucesso após 4 segundos
          setTimeout(() => {
            setUploadStatuses((prev) => {
              const next = { ...prev };
              if (next[productId]?.state === 'success') {
                delete next[productId];
              }
              return next;
            });
          }, 4000);
        } else {
          throw new Error(actionResult.error || 'Erro ao guardar fotografia no artigo.');
        }
      });
    } catch (err: unknown) {
      console.error('[QuickStockDrawer] Erro no upload:', err);
      const msg = err instanceof Error ? err.message : 'Erro ao processar imagem.';
      setUploadStatuses((prev) => ({
        ...prev,
        [productId]: {
          state: 'error',
          errorMessage: msg,
          previewUrl: undefined,
        },
      }));
    } finally {
      // Limpa input file para permitir selecionar o mesmo ficheiro novamente se desejado
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Criação de Nova Categoria
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setCategoryActionPending(true);
    setCategoryMessage(null);

    startServerTransition(async () => {
      try {
        const res = await createCategory(name);
        if (res.ok && res.data) {
          setNewCategoryName('');
          setCategoryMessage({
            type: 'success',
            text: `Categoria "${res.data.name}" criada com sucesso!`,
          });
          // Atualiza lista local
          const updatedCategories = await getRestaurantCategories();
          if (updatedCategories.ok && updatedCategories.data) {
            setCategoriesList(updatedCategories.data);
          }
        } else {
          setCategoryMessage({
            type: 'error',
            text: res.error || 'Falha ao criar categoria.',
          });
        }
      } catch {
        setCategoryMessage({
          type: 'error',
          text: 'Erro de comunicação ao criar categoria.',
        });
      } finally {
        setCategoryActionPending(false);
      }
    });
  };

  // Mover Posição de Categoria (Up / Down)
  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    if (isCategoryActionPending) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoriesList.length) return;

    const currentCat = categoriesList[index];
    const targetCat = categoriesList[targetIndex];
    if (!currentCat || !targetCat) return;

    // Troca otimista na lista
    const newList = [...categoriesList];
    const tempPosition = currentCat.position;
    const newTargetPosition = targetCat.position;

    // Garante posições distintas caso estejam iguais
    const finalCurrentPos =
      direction === 'up'
        ? Math.min(newTargetPosition, tempPosition)
        : Math.max(newTargetPosition, tempPosition);
    const finalTargetPos =
      direction === 'up'
        ? Math.max(newTargetPosition, tempPosition) + 1
        : Math.min(newTargetPosition, tempPosition) - 1;

    newList[index] = { ...currentCat, position: finalCurrentPos };
    newList[targetIndex] = { ...targetCat, position: finalTargetPos };

    // Ordena pela nova posição
    newList.sort((a, b) => a.position - b.position);
    setCategoriesList(newList);

    setCategoryActionPending(true);
    startServerTransition(async () => {
      try {
        // Atualiza ambas as posições para persistência consistente
        await Promise.all([
          updateCategoryPosition(currentCat.id, finalCurrentPos),
          updateCategoryPosition(targetCat.id, finalTargetPos),
        ]);

        const refreshed = await getRestaurantCategories();
        if (refreshed.ok && refreshed.data) {
          setCategoriesList(refreshed.data);
        }
      } catch (err) {
        console.error('[handleMoveCategory] Erro ao mover categoria:', err);
        // Recarrega do servidor em caso de erro
        void loadData();
      } finally {
        setCategoryActionPending(false);
      }
    });
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
                  Menu & Gestão de Stock
                </h2>
                {outOfStockCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-900 border border-amber-300 font-mono text-[11px] font-bold">
                    {outOfStockCount} esgotados
                  </span>
                )}
              </div>
              <p className="text-xs text-[#4C453F]">
                Upload de fotos WebP, disponibilidade e categorias do menu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => startRefreshTransition(loadData)}
              disabled={isLoading || isRefreshing}
              className="w-9 h-9 rounded-xl bg-[#EAE5DF] text-[#4C453F] hover:text-[#35271F] hover:bg-[#E5DED6] flex items-center justify-center transition-all cursor-pointer"
              title="Recarregar dados"
              aria-label="Recarregar"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#EAE5DF] text-[#4C453F] hover:text-[#35271F] hover:bg-[#E5DED6] flex items-center justify-center transition-all cursor-pointer"
              aria-label="Fechar gaveta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation: Artigos vs Categorias */}
        <div className="flex border-b border-[#E5DED6] bg-[#F5F4F1] px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'products'
                ? 'bg-[#FFFFFF] text-[#35271F] border-t-2 border-[#5E4939] shadow-2xs'
                : 'text-[#4C453F] hover:text-[#35271F] hover:bg-[#EAE5DF]'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Artigos & Fotos ({products.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-[#FFFFFF] text-[#35271F] border-t-2 border-[#5E4939] shadow-2xs'
                : 'text-[#4C453F] hover:text-[#35271F] hover:bg-[#EAE5DF]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gestor de Categorias ({categoriesList.length || categories.length})</span>
          </button>
        </div>

        {/* TAB 1: ARTIGOS & UPLOAD DE FOTOS */}
        {activeTab === 'products' && (
          <>
            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-[#E5DED6] bg-[#FFFFFF] space-y-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4C453F]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar artigo..."
                  className="w-full pl-10 pr-4 py-2 bg-[#F5F4F1] border border-[#E5DED6] rounded-xl text-xs sm:text-sm text-[#35271F] placeholder-[#4C453F]/60 focus:outline-none focus:border-[#C09573] transition-colors shadow-2xs"
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
                      : 'bg-[#F5F4F1] text-[#4C453F] border-[#E5DED6] hover:bg-[#EAE5DF]'
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
                        : 'bg-[#F5F4F1] text-[#4C453F] border-[#E5DED6] hover:bg-[#EAE5DF]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F5F4F1]">
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
                  const isPendingToggle = Boolean(pendingToggles[product.id]);
                  const uploadStatus = uploadStatuses[product.id];
                  const isUploading =
                    uploadStatus?.state === 'resizing' || uploadStatus?.state === 'uploading';
                  const displayImage = uploadStatus?.previewUrl || product.imageUrl;

                  return (
                    <div
                      key={product.id}
                      className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-3 ${
                        product.isAvailable
                          ? 'bg-[#FFFFFF] border-[#E5DED6] hover:border-[#C09573]/50 shadow-2xs'
                          : 'bg-[#EAE5DF]/70 border-amber-300/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Thumbnail / Image Upload Button */}
                        <div className="relative group/thumb flex-shrink-0">
                          <input
                            ref={(el) => {
                              fileInputRefs.current[product.id] = el;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => void handleFileChange(product.id, e)}
                            disabled={isUploading}
                          />

                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[product.id]?.click()}
                            disabled={isUploading}
                            className="relative w-16 h-16 rounded-xl overflow-hidden bg-[#EAE5DF] border border-[#E5DED6] flex items-center justify-center transition-all hover:ring-2 hover:ring-[#C09573] cursor-pointer"
                            title="Carregar nova fotografia (compressão WebP max 800x800)"
                          >
                            {displayImage ? (
                              <Image
                                src={displayImage}
                                alt={product.name}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            ) : (
                              <Camera className="w-6 h-6 text-[#4C453F]/60" />
                            )}

                            {/* Overlay com ícone de câmara ao passar o cursor */}
                            <div className="absolute inset-0 bg-[#35271F]/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                              <Camera className="w-5 h-5 text-white drop-shadow-sm" />
                            </div>

                            {/* Estado de loading / redimensionamento */}
                            {isUploading && (
                              <div className="absolute inset-0 bg-[#35271F]/70 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-[#F5F4F1] animate-spin" />
                              </div>
                            )}

                            {/* Estado de sucesso */}
                            {uploadStatus?.state === 'success' && (
                              <div className="absolute inset-0 bg-emerald-700/80 flex items-center justify-center">
                                <Check className="w-5 h-5 text-white stroke-[3]" />
                              </div>
                            )}
                          </button>
                        </div>

                        {/* Informação do Artigo */}
                        <div className="flex-1 min-w-0 pr-1">
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

                          <div className="flex items-center gap-2 text-xs text-[#4C453F] mb-1">
                            <span className="font-medium">{product.categoryName}</span>
                            <span>&bull;</span>
                            <span className="font-mono font-bold text-[#35271F]">
                              {product.price.toFixed(2)}€
                            </span>
                          </div>

                          {/* Botão de upload rápido textual */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRefs.current[product.id]?.click()}
                              disabled={isUploading}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5E4939] hover:text-[#C09573] transition-colors cursor-pointer"
                            >
                              <Camera className="w-3 h-3" />
                              <span>{product.imageUrl ? 'Alterar foto' : 'Adicionar foto'}</span>
                            </button>

                            {uploadStatus?.state === 'resizing' && (
                              <span className="text-[10px] text-amber-700 font-medium animate-pulse">
                                A comprimir WebP (800px)...
                              </span>
                            )}
                            {uploadStatus?.state === 'uploading' && (
                              <span className="text-[10px] text-[#C09573] font-medium animate-pulse">
                                A enviar fotografia...
                              </span>
                            )}
                            {uploadStatus?.state === 'success' && (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Atualizado!
                              </span>
                            )}
                          </div>

                          {uploadStatus?.state === 'error' && (
                            <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              <span>{uploadStatus.errorMessage || 'Falha no upload.'}</span>
                            </p>
                          )}
                        </div>

                        {/* Switch de Disponibilidade */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={product.isAvailable}
                            disabled={isPendingToggle}
                            onClick={() => handleToggle(product.id, product.isAvailable)}
                            className={`relative inline-flex h-9 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C09573] focus:ring-offset-2 ${
                              product.isAvailable ? 'bg-[#5E4939]' : 'bg-[#DDD5CB]'
                            } ${isPendingToggle ? 'opacity-60 cursor-wait' : ''}`}
                          >
                            <span className="sr-only">Comutar disponibilidade de {product.name}</span>
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-flex h-8 w-8 transform items-center justify-center rounded-full bg-[#FFFFFF] shadow-md ring-0 transition duration-200 ease-in-out ${
                                product.isAvailable ? 'translate-x-7' : 'translate-x-0'
                              }`}
                            >
                              {isPendingToggle ? (
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
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* TAB 2: GESTOR DE CATEGORIAS */}
        {activeTab === 'categories' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F4F1]">
            {/* Criar Nova Categoria */}
            <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C09573]" />
                <h3 className="text-sm font-bold text-[#35271F]">Criar Nova Categoria</h3>
              </div>

              <form onSubmit={(e) => void handleCreateCategory(e)} className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Ex: Pratos do Dia, Cocktails..."
                  disabled={isCategoryActionPending}
                  className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-[#F5F4F1] border border-[#E5DED6] rounded-xl text-[#35271F] placeholder-[#4C453F]/60 focus:outline-none focus:border-[#C09573] transition-colors"
                />
                <button
                  type="submit"
                  disabled={isCategoryActionPending || !newCategoryName.trim()}
                  className="px-4 py-2 bg-[#5E4939] text-[#F5F4F1] font-bold text-xs rounded-xl hover:bg-[#453426] disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isCategoryActionPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Criar</span>
                </button>
              </form>

              {categoryMessage && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    categoryMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {categoryMessage.type === 'success' ? (
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  )}
                  <span>{categoryMessage.text}</span>
                </div>
              )}
            </div>

            {/* Reordenar Categorias */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4C453F]">
                  Ordem de Exibição no Menu Público
                </h3>
                <span className="text-[11px] text-[#4C453F]">
                  Use as setas para mover as categorias
                </span>
              </div>

              {categoriesList.length === 0 ? (
                <div className="py-10 text-center bg-[#FFFFFF] rounded-2xl border border-[#E5DED6] p-4">
                  <Layers className="w-8 h-8 text-[#A89F95] mx-auto mb-2" />
                  <p className="text-xs font-bold text-[#35271F]">Nenhuma categoria cadastrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categoriesList.map((cat, idx) => {
                    const isFirst = idx === 0;
                    const isLast = idx === categoriesList.length - 1;
                    const productCount = products.filter(
                      (p) => p.categoryId === cat.id || p.categorySlug === cat.slug
                    ).length;

                    return (
                      <div
                        key={cat.id}
                        className="p-3 bg-[#FFFFFF] border border-[#E5DED6] rounded-xl shadow-2xs flex items-center justify-between gap-3 hover:border-[#C09573]/50 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-[#EAE5DF] text-[#35271F] font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <h4 className="text-sm font-bold text-[#35271F] truncate">
                              {cat.name}
                            </h4>
                            <p className="text-[11px] text-[#4C453F]">
                              {productCount} {productCount === 1 ? 'artigo' : 'artigos'}
                            </p>
                          </div>
                        </div>

                        {/* Botões Mover Para Cima / Baixo */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleMoveCategory(idx, 'up')}
                            disabled={isFirst || isCategoryActionPending}
                            className="w-8 h-8 rounded-lg bg-[#F5F4F1] border border-[#E5DED6] text-[#35271F] hover:bg-[#EAE5DF] hover:border-[#C09573] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                            title="Mover para cima"
                            aria-label={`Mover ${cat.name} para cima`}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleMoveCategory(idx, 'down')}
                            disabled={isLast || isCategoryActionPending}
                            className="w-8 h-8 rounded-lg bg-[#F5F4F1] border border-[#E5DED6] text-[#35271F] hover:bg-[#EAE5DF] hover:border-[#C09573] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
                            title="Mover para baixo"
                            aria-label={`Mover ${cat.name} para baixo`}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

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
