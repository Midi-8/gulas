'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Restaurant, Category, Product } from '@/types/restaurant';
import { RestaurantHeader } from './RestaurantHeader';
import { SearchBar, MenuFilterType } from './SearchBar';
import { CategoryNav } from './CategoryNav';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { CartDrawer } from './CartDrawer';
import { FloatingCartBar } from './FloatingCartBar';
import { OrderConfirmationModal } from './OrderConfirmationModal';
import { ActiveOrderDetailModal } from './ActiveOrderDetailModal';
import { ActiveOrderBanner } from './ActiveOrderBanner';
import { Toast } from '@/components/ui/Toast';
import { useCart } from '@/context/CartContext';
import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { menuAvisos } from '@/data/gulasCatalog';
import { Utensils, Info, ChevronDown } from 'lucide-react';

interface RestaurantMenuViewProps {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
  initialTableNumber?: number;
  lockTable?: boolean;
}

export const RestaurantMenuView: React.FC<RestaurantMenuViewProps> = ({
  restaurant,
  categories,
  products,
  initialTableNumber,
  lockTable = false,
}) => {
  const {
    setSelectedTableNumber,
    setIsTableLocked,
    setRestaurantSlug,
    syncCatalogProducts,
  } = useCart();

  const [menuProducts, setMenuProducts] = useState<Product[]>(products);
  const [prevProducts, setPrevProducts] = useState<Product[]>(products);
  const [realtimeOpenOverride, setRealtimeOpenOverride] = useState<boolean | null>(null);
  const [showServiceInfo, setShowServiceInfo] = useState(false);
  const isRestaurantOpen = realtimeOpenOverride ?? restaurant.isOpen;

  // Categorias visíveis na navegação principal (oculta categorias técnicas de suplementos)
  const visibleCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.slug !== 'ingredientes-extra-pizza' &&
          c.slug !== 'ingredientes-extra-burger'
      ),
    [categories]
  );

  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    visibleCategories[0]?.id || categories[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MenuFilterType>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const isClickScrollingRef = useRef(false);

  // Sincroniza artigos presentes no carrinho quando o catálogo muda em tempo real (stock ou preços)
  useEffect(() => {
    syncCatalogProducts(menuProducts);
  }, [menuProducts, syncCatalogProducts]);

  // Sincronização da barra de categorias com a rolagem do utilizador
  useEffect(() => {
    if (visibleCategories.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrollingRef.current) return;

        const visibleSection = entries.find((entry) => entry.isIntersecting);
        if (visibleSection) {
          const categoryId = visibleSection.target.id.replace('section-', '');
          if (categoryId) {
            setActiveCategoryId(categoryId);
          }
        }
      },
      {
        rootMargin: '-80px 0px -65% 0px',
        threshold: 0.1,
      }
    );

    visibleCategories.forEach((cat) => {
      const el = document.getElementById(`section-${cat.id}`);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [visibleCategories]);

  const handleSelectCategory = (categoryId: string) => {
    isClickScrollingRef.current = true;
    setActiveCategoryId(categoryId);
    setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 750);
  };

  if (products !== prevProducts) {
    setPrevProducts(products);
    setMenuProducts(products);
  }

  // Realtime subscription for instant stock / price / open-closed updates
  useEffect(() => {
    if (!restaurant.id) return;

    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`public-menu-products-${restaurant.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload: { new: Database['public']['Tables']['products']['Row'] }) => {
          const updatedRow = payload.new;
          if (!updatedRow?.id) return;

          setMenuProducts((prev) =>
            prev.map((item) =>
              item.id === updatedRow.id
                ? {
                    ...item,
                    available: Boolean(updatedRow.is_available),
                    price: Number(updatedRow.price),
                    name: updatedRow.name,
                    description: updatedRow.description || '',
                  }
                : item
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'restaurants',
          filter: `id=eq.${restaurant.id}`,
        },
        (payload: { new: Database['public']['Tables']['restaurants']['Row'] }) => {
          if (payload.new && typeof payload.new.is_open === 'boolean') {
            setRealtimeOpenOverride(payload.new.is_open);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurant.id]);

  useEffect(() => {
    if (restaurant.slug) {
      setRestaurantSlug(restaurant.slug);
    }
    if (initialTableNumber) {
      setSelectedTableNumber(initialTableNumber);
      if (lockTable) {
        setIsTableLocked(true);
      }
    }
  }, [
    restaurant.slug,
    initialTableNumber,
    lockTable,
    setRestaurantSlug,
    setSelectedTableNumber,
    setIsTableLocked,
  ]);

  const handleOpenProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const filteredProducts = useMemo(() => {
    return menuProducts.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesPill = true;
      if (activeFilter === 'especialidade') {
        const specialtyCategory = visibleCategories.some(
          (c) => c.id === p.categoryId && c.isSpecialty
        );
        matchesPill =
          specialtyCategory ||
          !!p.badges?.some((b) => b === 'especialidade' || b === 'house_special');
      } else if (activeFilter === 'novidade') {
        matchesPill = !!p.badges?.includes('novidade');
      } else if (activeFilter === 'picante') {
        matchesPill = !!p.badges?.includes('picante');
      } else if (activeFilter === 'vegetariano') {
        matchesPill = !!p.badges?.some((b) => b === 'vegetariano' || b === 'vegan');
      }

      return matchesSearch && matchesPill;
    });
  }, [menuProducts, searchQuery, activeFilter, visibleCategories]);

  // Group filtered products by visible category and deduplicate size variants
  const productsByCategory = useMemo(() => {
    const map = new Map<string, Array<{ primary: Product; variants: Product[] }>>();
    for (const category of visibleCategories) {
      const catProducts = filteredProducts
        .filter((p) => p.categoryId === category.id)
        .sort((a, b) => a.position - b.position);

      const groupedByName = new Map<string, Product[]>();
      for (const prod of catProducts) {
        const key = prod.unitQuantity
          ? prod.name.trim().toLowerCase()
          : `${prod.id}`;
        const existing = groupedByName.get(key) || [];
        existing.push(prod);
        groupedByName.set(key, existing);
      }

      const deduplicated = Array.from(groupedByName.values()).map((variants) => {
        const sortedVariants = [...variants].sort((a, b) => a.price - b.price);
        return {
          primary: sortedVariants[0],
          variants: sortedVariants,
        };
      });

      if (deduplicated.length > 0 || searchQuery === '') {
        map.set(category.id, deduplicated);
      }
    }
    return map;
  }, [visibleCategories, filteredProducts, searchQuery]);

  const liveRestaurant = useMemo(
    () => ({ ...restaurant, isOpen: isRestaurantOpen }),
    [restaurant, isRestaurantOpen]
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 pb-28">
      {/* Toast Feedback */}
      <Toast />

      {/* Gulas Header */}
      <RestaurantHeader restaurant={liveRestaurant} />

      {/* Barra Compacta de Notas de Serviço & Alergénios */}
      <div className="max-w-4xl mx-auto px-4 pt-2.5">
        <button
          type="button"
          onClick={() => setShowServiceInfo((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-xs font-medium text-zinc-600 bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2 hover:border-zinc-300 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2 truncate">
            <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">
              Pizzas Familiares exclusivas Take-Away · Alergénios & informações
            </span>
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${
              showServiceInfo ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showServiceInfo && (
          <div className="mt-1.5 p-3 rounded-xl bg-white border border-zinc-200/80 space-y-1.5 text-xs text-zinc-600">
            {menuAvisos.map((aviso) => (
              <p key={aviso} className="leading-relaxed flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-zinc-400 mt-1.5 shrink-0" />
                <span>{aviso}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Sticky Categories Navigation */}
      <CategoryNav
        categories={visibleCategories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={handleSelectCategory}
      />

      {/* Menu Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-10">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-zinc-200/80 p-8">
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
              <Utensils className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Nenhum artigo encontrado
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Tenta alterar os termos da pesquisa ou remover o filtro selecionado.
            </p>
          </div>
        ) : (
          visibleCategories.map((category, catIndex) => {
            const items = productsByCategory.get(category.id) || [];
            if (items.length === 0 && (searchQuery !== '' || activeFilter !== 'all')) {
              return null;
            }

            return (
              <section
                key={category.id}
                id={`section-${category.id}`}
                className="scroll-mt-20 space-y-3"
              >
                {/* Category Header */}
                <div className="pb-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-zinc-200/80">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight">
                      {category.name}
                    </h2>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                      {items.length}
                    </span>
                  </div>

                  {category.subtitle && (
                    <span className="text-[11px] font-medium text-zinc-500 sm:text-right">
                      {category.subtitle}
                    </span>
                  )}
                </div>
                {category.description && (
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    {category.description}
                  </p>
                )}

                {/* Products Grid */}
                {items.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-2">
                    Sem artigos disponíveis nesta categoria com o filtro atual.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {items.map(({ primary, variants }, itemIndex) => (
                      <ProductCard
                        key={primary.id}
                        product={primary}
                        variants={variants}
                        onOpenDetails={handleOpenProductDetails}
                        priority={catIndex === 0 && itemIndex < 2}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      <FloatingCartBar />

      {/* Cart Slide Drawer */}
      <CartDrawer isRestaurantOpen={isRestaurantOpen} allProducts={menuProducts} />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        allProducts={menuProducts}
        categories={categories}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onSelectVariant={(variant) => setSelectedProduct(variant)}
      />

      {/* Order Confirmation & Status Tracker Modal */}
      <OrderConfirmationModal />

      {/* Live Order Detail & Stepper Modal */}
      <ActiveOrderDetailModal allProducts={menuProducts} />

      {/* Live Order Tracking Banner */}
      <ActiveOrderBanner />
    </div>
  );
};
