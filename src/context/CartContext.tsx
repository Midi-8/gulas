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
import { Product, CartItem, Order, OrderStatus } from '@/types/restaurant';
import { createOrder } from '@/actions/orders';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, notes?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
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
          if (Array.isArray(parsed.items)) {
            setItems(parsed.items);
          }

          if (
            typeof parsed.selectedTableNumber === 'number' &&
            Number.isInteger(parsed.selectedTableNumber) &&
            parsed.selectedTableNumber > 0
          ) {
            setSelectedTableNumber(parsed.selectedTableNumber);
          }
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

  const addItem = (product: Product, quantity = 1, notes?: string) => {
    if (!product.available) {
      showToast('Este artigo encontra-se indisponível de momento.');
      return;
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        const currentItem = updated[existingIndex];

        updated[existingIndex] = {
          ...currentItem,
          quantity: currentItem.quantity + quantity,
          notes: notes !== undefined ? notes : currentItem.notes,
        };

        return updated;
      }

      return [...prev, { product, quantity, notes }];
    });

    showToast(`Adicionado: ${product.name}`);
  };

  const removeItem = (productId: string) => {
    setItems((prev) =>
      prev.filter((item) => item.product.id !== productId)
    );
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const updateNotes = (productId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, notes } : item
      )
    );
  };

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
        (sum, item) => sum + item.product.price * item.quantity,
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

    if (!selectedTableNumber) {
      setIsCartOpen(true);
      throw new Error('Por favor selecione o número da mesa.');
    }

    if (!restaurantSlug) {
      throw new Error('Restaurante não identificado.');
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payloadItems = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        notes: item.notes?.trim() || null,
      }));

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