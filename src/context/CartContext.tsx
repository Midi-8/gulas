'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useRef,
} from 'react';
import {
  Product,
  CartItem,
  Order,
  OrderStatus,
  ProductModifier,
  getCartItemTotal,
} from '@/types/restaurant';
import { getCartLineId } from '@/components/menu/ProductDetailModal';
import { createOrder } from '@/actions/orders';

interface CartContextType {
  items: CartItem[];
  addItem: (
    product: Product,
    quantity?: number,
    notes?: string,
    selectedModifiers?: ProductModifier[]
  ) => void;
  removeItem: (idOrProductId: string) => void;
  updateQuantity: (idOrProductId: string, quantity: number) => void;
  updateNotes: (idOrProductId: string, notes: string) => void;
  syncCatalogProducts: (catalog: Product[]) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  restaurantSlug: string | null;
  setRestaurantSlug: (slug: string | null) => void;
  selectedTableNumber: number | null;
  setSelectedTableNumber: (tableNumber: number | null) => void;
  isTableLocked: boolean;
  setIsTableLocked: (locked: boolean) => void;
  submitOrder: (customerNotes?: string) => Promise<Order>;
  isSubmitting: boolean;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  isOrderSuccessModalOpen: boolean;
  setIsOrderSuccessModalOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const STORAGE_KEY = 'gulas_cart_state_v1';
const CART_TABLE_TTL_MS = 3 * 60 * 60 * 1000; // 3 horas para expiração da mesa pré-selecionada
const CART_ITEMS_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas para artigos no carrinho
const ACTIVE_ORDER_IDS_KEY = 'gulas_active_order_ids';
const ACTIVE_ORDERS_DATA_KEY = 'gulas_active_orders_data';
const ACTIVE_ORDER_ID_KEY = 'gulas_active_order_id';
const ACTIVE_ORDER_DATA_KEY = 'gulas_active_order_data';
const ACTIVE_ORDER_TOKENS_KEY = 'gulas_active_order_tokens';

function readStoredArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function readStoredTokens(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_TOKENS_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const tokens: Record<string, string> = {};

    Object.entries(parsed).forEach(([id, token]) => {
      if (
        id.trim() !== '' &&
        typeof token === 'string' &&
        token.trim() !== ''
      ) {
        tokens[id] = token.trim();
      }
    });

    return tokens;
  } catch {
    return {};
  }
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Os valores iniciais são iguais no servidor e no navegador.
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedTableNumber, setSelectedTableNumber] =
    useState<number | null>(null);
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTableLocked, setIsTableLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isOrderSuccessModalOpen, setIsOrderSuccessModalOpen] =
    useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const submittingRef = useRef(false);

  // Recuperar o carrinho apenas depois da montagem no navegador.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (parsed && typeof parsed === 'object') {
          const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : null;
          const ageMs = savedAt !== null ? Date.now() - savedAt : null;
          const isTableFresh = ageMs !== null && ageMs >= 0 && ageMs < CART_TABLE_TTL_MS;
          const areItemsFresh = ageMs === null || (ageMs >= 0 && ageMs < CART_ITEMS_TTL_MS);

          queueMicrotask(() => {
            if (Array.isArray(parsed.items) && areItemsFresh) {
              const hydrated = parsed.items.map((item: CartItem) => ({
                ...item,
                id: item.id || getCartLineId(item.product.id, item.selectedModifiers),
              }));
              setItems(hydrated);
            }

            if (
              isTableFresh &&
              typeof parsed.selectedTableNumber === 'number' &&
              Number.isInteger(parsed.selectedTableNumber) &&
              parsed.selectedTableNumber >= 0
            ) {
              setSelectedTableNumber(parsed.selectedTableNumber);
            }
          });
        }
      }
    } catch {
      // Continuar com o carrinho vazio se os dados não forem legíveis.
    } finally {
      setIsStorageLoaded(true);
    }
  }, []);

  // Não sobrescrever os dados antes de os recuperar.
  useEffect(() => {
    if (!isStorageLoaded) return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items,
          selectedTableNumber,
          savedAt: Date.now(),
        })
      );
    } catch {
      // O carrinho continua disponível em memória.
    }
  }, [items, selectedTableNumber, isStorageLoaded]);

  const showToast = (msg: string) => {
    setToastMessage(msg);

    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  const addItem = (
    product: Product,
    quantity = 1,
    notes?: string,
    selectedModifiers?: ProductModifier[]
  ) => {
    if (!product.available) {
      showToast('Este artigo encontra-se indisponível de momento.');
      return;
    }

    const targetLineId = getCartLineId(product.id, selectedModifiers);

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          (item.id || getCartLineId(item.product.id, item.selectedModifiers)) ===
          targetLineId
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const currentItem = updated[existingIndex];
        const incomingNote = notes?.trim();
        const existingNote = currentItem.notes?.trim();

        let mergedNotes = currentItem.notes;
        if (incomingNote) {
          if (!existingNote) {
            mergedNotes = incomingNote;
          } else if (
            !existingNote.toLowerCase().includes(incomingNote.toLowerCase())
          ) {
            mergedNotes = `${existingNote} | ${incomingNote}`;
          }
        }

        updated[existingIndex] = {
          ...currentItem,
          id: targetLineId,
          quantity: currentItem.quantity + quantity,
          notes: mergedNotes,
          selectedModifiers: selectedModifiers ?? currentItem.selectedModifiers,
        };

        return updated;
      }

      return [
        ...prev,
        {
          id: targetLineId,
          product,
          quantity,
          notes: notes?.trim() || undefined,
          selectedModifiers:
            selectedModifiers && selectedModifiers.length > 0
              ? selectedModifiers
              : undefined,
        },
      ];
    });

    showToast(`Adicionado: ${product.name}`);
  };

  const removeItem = (targetId: string) => {
    setItems((prev) => {
      const hasLineMatch = prev.some(
        (item) =>
          (item.id || getCartLineId(item.product.id, item.selectedModifiers)) ===
          targetId
      );
      if (hasLineMatch) {
        return prev.filter(
          (item) =>
            (item.id || getCartLineId(item.product.id, item.selectedModifiers)) !==
            targetId
        );
      }
      return prev.filter((item) => item.product.id !== targetId);
    });
  };

  const updateQuantity = (targetId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(targetId);
      return;
    }

    setItems((prev) => {
      const hasLineMatch = prev.some(
        (item) =>
          (item.id || getCartLineId(item.product.id, item.selectedModifiers)) ===
          targetId
      );

      return prev.map((item) => {
        const itemLineId =
          item.id || getCartLineId(item.product.id, item.selectedModifiers);
        const matches = hasLineMatch
          ? itemLineId === targetId
          : item.product.id === targetId;

        return matches ? { ...item, quantity } : item;
      });
    });
  };

  const updateNotes = (targetId: string, notes: string) => {
    setItems((prev) => {
      const hasLineMatch = prev.some(
        (item) =>
          (item.id || getCartLineId(item.product.id, item.selectedModifiers)) ===
          targetId
      );

      return prev.map((item) => {
        const itemLineId =
          item.id || getCartLineId(item.product.id, item.selectedModifiers);
        const matches = hasLineMatch
          ? itemLineId === targetId
          : item.product.id === targetId;

        return matches ? { ...item, notes } : item;
      });
    });
  };

  const syncCatalogProducts = React.useCallback((catalog: Product[]) => {
    if (!catalog || catalog.length === 0) return;
    const byId = new Map(catalog.map((p) => [p.id, p]));
    setItems((prev) => {
      let changed = false;
      const next = prev.map((item) => {
        const fresh = byId.get(item.product.id);
        if (
          fresh &&
          (fresh.available !== item.product.available ||
            fresh.price !== item.product.price ||
            fresh.name !== item.product.name)
        ) {
          changed = true;
          return {
            ...item,
            product: {
              ...item.product,
              available: fresh.available,
              price: fresh.price,
              name: fresh.name,
            },
          };
        }
        return item;
      });
      return changed ? next : prev;
    });
  }, []);

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + getCartItemTotal(item),
        0
      ),
    [items]
  );

  const total = subtotal;

  const submitOrder = async (customerNotes?: string): Promise<Order> => {
    if (!isStorageLoaded) {
      throw new Error('O carrinho está a carregar. Aguarda um momento.');
    }

    if (submittingRef.current) {
      throw new Error('Já existe um pedido em processamento.');
    }

    if (items.length === 0) {
      throw new Error('O carrinho está vazio.');
    }

    if (selectedTableNumber === null || selectedTableNumber === undefined || selectedTableNumber < 0) {
      setIsCartOpen(true);
      throw new Error('Por favor selecione a mesa ou escolha Take-away.');
    }

    if (!restaurantSlug) {
      throw new Error('Restaurante não identificado.');
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const sizeLabels = new Set(['normal', 'familiar', '20cl', '33cl']);
      const payloadItems = items.map((item) => {
        const rawNotes = item.notes?.trim() || '';
        const uq = item.product.unitQuantity?.trim() || '';
        const shouldTagSize =
          uq &&
          sizeLabels.has(uq.toLowerCase()) &&
          !rawNotes.toLowerCase().includes(uq.toLowerCase());

        const finalNotes = shouldTagSize
          ? rawNotes
            ? `Tamanho: ${uq} | ${rawNotes}`
            : `Tamanho: ${uq}`
          : rawNotes || null;

        return {
          productId: item.product.id,
          quantity: item.quantity,
          notes: finalNotes,
          modifierIds: (item.selectedModifiers ?? []).map((modifier) => modifier.id),
        };
      });

      const result = await createOrder({
        restaurantSlug,
        tableNumber: selectedTableNumber,
        customerNotes: customerNotes?.trim() || null,
        items: payloadItems,
      });

      if (!result.success) {
        throw new Error(result.error.message);
      }

      const orderData = result.data;

      const newOrder: Order & { trackingToken: string } = {
        id: orderData.orderId,
        orderNumber: orderData.orderNumber,
        restaurantId: orderData.restaurantId,
        restaurantSlug: orderData.restaurantSlug,
        restaurantName: orderData.restaurantName,
        tableId: orderData.tableId,
        tableNumber: orderData.tableNumber,
        tableName: orderData.tableName || `Mesa ${orderData.tableNumber}`,
        items: [...items],
        subtotal: orderData.subtotal,
        total: orderData.total,
        status: (orderData.status as OrderStatus) || 'pending',
        createdAt: orderData.createdAt,
        customerNotes: orderData.customerNotes || undefined,
        trackingToken: orderData.trackingToken,
      };

      setActiveOrder(newOrder);

      const serializedNewOrder = {
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        tableNumber: newOrder.tableNumber,
        tableName: newOrder.tableName,
        restaurantId: newOrder.restaurantId,
        restaurantSlug: newOrder.restaurantSlug,
        restaurantName: newOrder.restaurantName,
        status: newOrder.status,
        subtotal: newOrder.subtotal,
        total: newOrder.total,
        customerNotes: newOrder.customerNotes,
        createdAt: newOrder.createdAt,
        items: orderData.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes,
        })),
      };

      try {
        const tokensMap = readStoredTokens();
        tokensMap[newOrder.id] = newOrder.trackingToken;

        // O token tem de estar guardado antes de emitir os eventos.
        localStorage.setItem(
          ACTIVE_ORDER_TOKENS_KEY,
          JSON.stringify(tokensMap)
        );

        const existingIds = readStoredArray<unknown>(
          ACTIVE_ORDER_IDS_KEY
        ).filter(
          (id): id is string =>
            typeof id === 'string' && id.trim() !== ''
        );

        const nextIds = Array.from(
          new Set([...existingIds, newOrder.id])
        );

        const existingOrders =
          readStoredArray<typeof serializedNewOrder>(
            ACTIVE_ORDERS_DATA_KEY
          ).filter(
            (order) =>
              order &&
              typeof order.id === 'string' &&
              order.id !== newOrder.id
          );

        const nextOrders = [...existingOrders, serializedNewOrder];

        localStorage.setItem(
          ACTIVE_ORDER_IDS_KEY,
          JSON.stringify(nextIds)
        );
        localStorage.setItem(
          ACTIVE_ORDERS_DATA_KEY,
          JSON.stringify(nextOrders)
        );
        localStorage.setItem(ACTIVE_ORDER_ID_KEY, newOrder.id);
        localStorage.setItem(
          ACTIVE_ORDER_DATA_KEY,
          JSON.stringify(serializedNewOrder)
        );

        window.dispatchEvent(
          new CustomEvent('gulas_active_order_created', {
            detail: {
              orderId: newOrder.id,
              order: serializedNewOrder,
            },
          })
        );

        window.dispatchEvent(
          new CustomEvent('gulas_order_status_update', {
            detail: {
              orderId: newOrder.id,
              status: newOrder.status,
              order: serializedNewOrder,
            },
          })
        );
      } catch {
        console.warn(
          '[CartContext] Pedido criado, mas não foi possível guardar ' +
          'o acompanhamento neste navegador.'
        );

        showToast(
          'Pedido criado, mas não foi possível guardar o acompanhamento ' +
          'neste navegador. Não voltes a enviar o mesmo pedido.'
        );
      }

      setIsOrderSuccessModalOpen(true);
      setIsCartOpen(false);
      clearCart();

      return newOrder;
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateNotes,
        syncCatalogProducts,
        clearCart,
        itemCount,
        subtotal,
        total,
        isCartOpen,
        setIsCartOpen,
        restaurantSlug,
        setRestaurantSlug,
        selectedTableNumber,
        setSelectedTableNumber,
        isTableLocked,
        setIsTableLocked,
        submitOrder,
        isSubmitting,
        activeOrder,
        setActiveOrder,
        isOrderSuccessModalOpen,
        setIsOrderSuccessModalOpen,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
};