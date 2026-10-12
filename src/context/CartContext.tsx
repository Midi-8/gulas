'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
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

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items)) {
          return parsed.items;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [restaurantSlug, setRestaurantSlug] = useState<string | null>(null);

  const [selectedTableNumber, setSelectedTableNumber] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.selectedTableNumber === 'number' && parsed.selectedTableNumber > 0) {
          return parsed.selectedTableNumber;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isTableLocked, setIsTableLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isOrderSuccessModalOpen, setIsOrderSuccessModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          items,
          selectedTableNumber,
        })
      );
    } catch {
      // ignore
    }
  }, [items, selectedTableNumber]);

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
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const currentItem = updated[existingIndex];
        updated[existingIndex] = {
          ...currentItem,
          quantity: currentItem.quantity + quantity,
          notes: notes !== undefined ? notes : currentItem.notes,
        };
        return updated;
      } else {
        return [...prev, { product, quantity, notes }];
      }
    });

    showToast(`Adicionado: ${product.name}`);
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const updateNotes = (productId: string, notes: string) => {
    setItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, notes } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [items]);

  const total = subtotal;

  const submitOrder = async (customerNotes?: string): Promise<Order> => {
    if (isSubmitting) {
      throw new Error('Já existe um pedido em processamento.');
    }
    if (items.length === 0) {
      throw new Error('O carrinho está vazio');
    }
    if (!selectedTableNumber) {
      setIsCartOpen(true);
      throw new Error('Por favor selecione o número da mesa');
    }
    if (!restaurantSlug) {
      throw new Error('Restaurante não identificado');
    }

    setIsSubmitting(true);

    try {
      // 1. Converter CartItems para payload seguro (apenas productId, quantity, notes)
      const payloadItems = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
        notes: item.notes ? item.notes.trim() : null,
      }));

      // 2. Chamar a Server Action
      const result = await createOrder({
        restaurantSlug,
        tableNumber: selectedTableNumber,
        customerNotes: customerNotes?.trim() || null,
        items: payloadItems,
      });

      // 3. Tratar erro da Server Action
      if (!result.success) {
        throw new Error(result.error.message);
      }

      const orderData = result.data;

      // 4. Mapear resultado real para o estado Order
      const newOrder: Order = {
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
      };

      // 5. Atualizar estado e limpar carrinho em sucesso
      setActiveOrder(newOrder);

      // Persistir no localStorage para o Live Order Tracking e emitir evento reativo
      try {
        localStorage.setItem('gulas_active_order_id', newOrder.id);
        localStorage.setItem(
          'gulas_active_order_data',
          JSON.stringify({
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
            items: newOrder.items.map((i) => ({
              id: i.product.id,
              productName: i.product.name,
              quantity: i.quantity,
              unitPrice: i.product.price,
              notes: i.notes,
            })),
          })
        );
        window.dispatchEvent(
          new CustomEvent('gulas_order_status_update', {
            detail: { orderId: newOrder.id, status: newOrder.status },
          })
        );
      } catch {
        // ignore
      }

      setIsOrderSuccessModalOpen(true);
      setIsCartOpen(false);
      clearCart();

      return newOrder;
    } finally {
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
