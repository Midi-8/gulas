'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Restaurant, Category, Product } from '@/types/restaurant';
import { RestaurantHeader } from '@/components/menu/RestaurantHeader';
import { CategoryNav } from '@/components/menu/CategoryNav';
import { SearchBar, MenuFilterType } from '@/components/menu/SearchBar';
import { ProductCard } from '@/components/menu/ProductCard';
import { ProductDetailModal } from '@/components/menu/ProductDetailModal';
import { CartDrawer } from '@/components/menu/CartDrawer';
import { FloatingCartBar } from '@/components/menu/FloatingCartBar';
import { OrderConfirmationModal } from '@/components/menu/OrderConfirmationModal';
import { ActiveOrderBanner } from '@/components/menu/ActiveOrderBanner';
import { ActiveOrderDetailModal } from '@/components/menu/ActiveOrderDetailModal';
import { Toast } from '@/components/ui/Toast';
import { useCart } from '@/context/CartContext';
import { Utensils } from 'lucide-react';
import { menuAvisos } from '@/data/gulasCatalog';

import { createClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

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
  const { setSelectedTableNumber, setIsTableLocked, setRestaurantSlug } = useCart();
  const [menuProducts, setMenuProducts] = useState<Product[]>(products);
  const [prevProducts, setPrevProducts] = useState<Product[]>(products);
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MenuFilterType>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  if (products !== prevProducts) {
    setPrevProducts(products);
    setMenuProducts(products);
  }

  // Realtime subscription for instant stock / price updates
  useEffect(() => {
    if (!restaurant.id) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`customer-menu-products-${restaurant.id}`)
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
  }, [restaurant.slug, initialTableNumber, lockTable, setRestaurantSlug, setSelectedTableNumber, setIsTableLocked]);

  // Handle open product modal
  const handleOpenProductDetails = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  // Filter products by search and badge filters
  const filteredProducts = useMemo(() => {
    return menuProducts.filter((p) => {
      // Search matching
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Filter pill matching
      let matchesPill = true;
      if (activeFilter === 'especialidade') {
        const specialtyCategory = categories.some(
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
  }, [menuProducts, searchQuery, activeFilter, categories]);

  // Group filtered products by category
  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const category of categories) {
      const catProducts = filteredProducts
        .filter((p) => p.categoryId === category.id)
        .sort((a, b) => a.position - b.position);
      if (catProducts.length > 0 || searchQuery === '') {
        map.set(category.id, catProducts);
      }
    }
    return map;
  }, [categories, filteredProducts, searchQuery]);

  return (
    <div className="min-h-screen bg-[#F5F4F1] text-[#35271F] pb-24">
      {/* Toast Feedback */}
      <Toast />

      {/* Gulas Header */}
      <RestaurantHeader restaurant={restaurant} />

      <div className="max-w-4xl mx-auto px-4 pt-3 space-y-1.5">
        {menuAvisos.map((aviso) => (
          <p
            key={aviso}
            className="text-[11px] sm:text-xs font-semibold text-[#5E4939] bg-[#EAE5DF] border border-[#E5DED6] rounded-lg px-3 py-2"
          >
            {aviso}
          </p>
        ))}
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
        categories={categories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
      />

      {/* Menu Content */}
      <main className="max-w-4xl mx-auto px-4 py-5 space-y-8">
        {filteredProducts.length === 0 ? (
          <div className="py-14 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-[#EAE5DF] flex items-center justify-center mx-auto text-[#4C453F]">
              <Utensils className="w-5 h-5 text-[#A89F95]" />
            </div>
            <h3 className="text-sm font-bold text-[#35271F]">Nenhum artigo encontrado</h3>
            <p className="text-xs text-[#4C453F] max-w-xs mx-auto">
              Tenta alterar os termos da tua pesquisa ou remover o filtro selecionado.
            </p>
          </div>
        ) : (
          categories.map((category) => {
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
                <div className="pb-1.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 border-b border-[#E5DED6]">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-[#35271F] tracking-tight uppercase">
                      {category.name}
                    </h2>
                    <span className="text-xs font-semibold text-[#A89F95]">
                      ({items.length})
                    </span>
                  </div>

                  {category.subtitle && (
                    <span className="text-[11px] font-bold text-[#C09573] sm:text-right">
                      {category.subtitle}
                    </span>
                  )}
                </div>
                {category.description && (
                  <p className="text-[11px] sm:text-xs text-[#4C453F] leading-relaxed">
                    {category.description}
                  </p>
                )}

                {/* Products Grid: 1 col on mobile, 2 cols on desktop */}
                {items.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-2 italic">
                    Sem artigos disponíveis nesta categoria com o filtro atual.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {items.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onOpenDetails={handleOpenProductDetails}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>

      {/* Floating Bottom Cart Bar (Mobile & Desktop) */}
      <FloatingCartBar />

      {/* Cart Slide Drawer */}
      <CartDrawer />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      {/* Order Confirmation & Status Tracker Modal */}
      <OrderConfirmationModal />

      {/* Live Order Detail & Stepper Modal */}
      <ActiveOrderDetailModal />

      {/* Live Order Tracking Banner (Pílula Flutuante) montado no topo visual (z-[60]) */}
      <ActiveOrderBanner />
    </div>
  );
};
