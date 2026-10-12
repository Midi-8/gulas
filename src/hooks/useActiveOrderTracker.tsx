'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { getOrderPublicStatus } from '@/actions/orders';
import { Order, OrderStatus } from '@/types/restaurant';

export const ACTIVE_ORDER_ID_KEY = 'gulas_active_order_id';
export const ACTIVE_ORDER_DATA_KEY = 'gulas_active_order_data';

export interface TrackerOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string | null;
}

export interface ActiveTrackerOrder {
  id: string;
  orderNumber?: number;
  tableNumber: number;
  tableName?: string;
  restaurantId?: string;
  restaurantSlug?: string;
  restaurantName?: string;
  status: OrderStatus;
  subtotal: number;
  total: number;
  customerNotes?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: TrackerOrderItem[];
}

interface ActiveOrderTrackerContextValue {
  activeOrderId: string | null;
  activeOrder: ActiveTrackerOrder | null;
  status: OrderStatus | null;
  isLoading: boolean;
  completionNotice: string | null;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (open: boolean) => void;
  openDetailModal: () => void;
  closeDetailModal: () => void;
  setActiveOrderId: (
    orderId: string,
    initialData?: Partial<ActiveTrackerOrder> | Order
  ) => void;
  clearActiveOrder: () => void;
  refreshOrder: () => Promise<void>;
}

const ActiveOrderTrackerContext =
  createContext<ActiveOrderTrackerContextValue | null>(null);

export const ActiveOrderTrackerProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [activeOrderId, setActiveOrderIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(ACTIVE_ORDER_ID_KEY);
    } catch {
      return null;
    }
  });

  const [activeOrder, setActiveOrder] = useState<ActiveTrackerOrder | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const storedData = localStorage.getItem(ACTIVE_ORDER_DATA_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData) as ActiveTrackerOrder;
        if (parsed.status !== 'completed' && parsed.status !== 'cancelled') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeOrderIdRef = useRef<string | null>(activeOrderId);

  useEffect(() => {
    activeOrderIdRef.current = activeOrderId;
  }, [activeOrderId]);

  const clearActiveOrder = useCallback(() => {
    setActiveOrderIdState(null);
    setActiveOrder(null);
    setCompletionNotice(null);
    setIsDetailModalOpen(false);

    try {
      localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
      localStorage.removeItem(ACTIVE_ORDER_DATA_KEY);
    } catch {
      // ignore
    }

    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
  }, []);

  const handleStatusTransition = useCallback((newStatus: OrderStatus) => {
    setActiveOrder((current) => {
      if (!current) return current;
      if (current.status === newStatus) return current;

      const updated: ActiveTrackerOrder = {
        ...current,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(ACTIVE_ORDER_DATA_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }

      return updated;
    });

    // Se o pedido for concluído ou cancelado, aciona a limpeza automática após 8 segundos
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      const notice =
        newStatus === 'completed'
          ? 'O teu pedido foi concluído com sucesso. Bom apetite!'
          : 'O teu pedido foi cancelado.';

      setCompletionNotice(notice);

      // Limpa as chaves no localStorage imediatamente para novas compras não herdarem o ID
      try {
        localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
        localStorage.removeItem(ACTIVE_ORDER_DATA_KEY);
      } catch {
        // ignore
      }

      // Mantém o estado visível durante exatamente 8 segundos antes de ocultar
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
      completionTimerRef.current = setTimeout(() => {
        setCompletionNotice(null);
        setActiveOrderIdState(null);
        setActiveOrder(null);
        setIsDetailModalOpen(false);
      }, 8000);
    }
  }, []);

  const setActiveOrderId = useCallback(
    (
      orderId: string,
      initialData?: Partial<ActiveTrackerOrder> | Order
    ) => {
      if (!orderId) {
        clearActiveOrder();
        return;
      }

      try {
        localStorage.setItem(ACTIVE_ORDER_ID_KEY, orderId);
      } catch {
        // ignore
      }

      setActiveOrderIdState(orderId);
      setCompletionNotice(null);

      if (initialData) {
        const rawItems = (initialData.items || []) as Array<
          TrackerOrderItem | { product: { id: string; name: string; price: number }; quantity: number; notes?: string }
        >;

        const formattedItems: TrackerOrderItem[] = rawItems.map((item, idx) => {
          if ('product' in item) {
            return {
              id: String(item.product.id || idx),
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
              notes: item.notes,
            };
          }
          return {
            id: String(item.id || idx),
            productName: item.productName || 'Artigo',
            quantity: item.quantity || 1,
            unitPrice: Number(item.unitPrice || 0),
            notes: item.notes,
          };
        });

        const formattedOrder: ActiveTrackerOrder = {
          id: orderId,
          orderNumber:
            'orderNumber' in initialData ? initialData.orderNumber : undefined,
          tableNumber: initialData.tableNumber ?? 0,
          tableName: initialData.tableName || `Mesa ${initialData.tableNumber ?? ''}`,
          restaurantId: initialData.restaurantId,
          restaurantSlug: initialData.restaurantSlug,
          restaurantName: initialData.restaurantName,
          status: (initialData.status as OrderStatus) || 'pending',
          subtotal: initialData.subtotal ?? 0,
          total: initialData.total ?? 0,
          customerNotes: initialData.customerNotes,
          createdAt: initialData.createdAt || new Date().toISOString(),
          updatedAt:
            'updatedAt' in initialData && initialData.updatedAt
              ? initialData.updatedAt
              : new Date().toISOString(),
          items: formattedItems,
        };

        setActiveOrder(formattedOrder);

        try {
          localStorage.setItem(
            ACTIVE_ORDER_DATA_KEY,
            JSON.stringify(formattedOrder)
          );
        } catch {
          // ignore
        }
      }
    },
    [clearActiveOrder]
  );

  const fetchLatestStatus = useCallback(
    async (orderIdToFetch: string) => {
      if (!orderIdToFetch) return;

      try {
        const result = await getOrderPublicStatus(orderIdToFetch);
        if (result.success && result.data) {
          const fetched = result.data;
          setActiveOrder((current) => {
            const nextStatus = fetched.status as OrderStatus;
            const updated: ActiveTrackerOrder = {
              id: fetched.id,
              orderNumber: fetched.orderNumber,
              tableNumber: fetched.tableNumber,
              tableName: fetched.tableName || `Mesa ${fetched.tableNumber}`,
              restaurantId: current?.restaurantId,
              restaurantSlug: current?.restaurantSlug,
              restaurantName: current?.restaurantName,
              status: nextStatus,
              subtotal: fetched.subtotal,
              total: fetched.total,
              customerNotes: current?.customerNotes,
              createdAt: fetched.createdAt,
              updatedAt: fetched.updatedAt,
              items:
                fetched.items && fetched.items.length > 0
                  ? fetched.items
                  : current?.items || [],
            };

            try {
              localStorage.setItem(
                ACTIVE_ORDER_DATA_KEY,
                JSON.stringify(updated)
              );
            } catch {
              // ignore
            }

            return updated;
          });

          const currentStatus = fetched.status as OrderStatus;
          if (currentStatus === 'completed' || currentStatus === 'cancelled') {
            handleStatusTransition(currentStatus);
          }
        }
      } catch {
        // Falha tolerada em modo offline
      }
    },
    [handleStatusTransition]
  );

  const refreshOrder = useCallback(async () => {
    if (activeOrderIdRef.current) {
      setIsLoading(true);
      await fetchLatestStatus(activeOrderIdRef.current);
      setIsLoading(false);
    }
  }, [fetchLatestStatus]);

  // 1. Reconciliação inicial com o backend se houver pedido ativo recuperado do localStorage
  useEffect(() => {
    if (activeOrderId) {
      const timer = setTimeout(() => {
        void fetchLatestStatus(activeOrderId);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeOrderId, fetchLatestStatus]);

  // 2. Subscrição Supabase Realtime para a tabela orders
  useEffect(() => {
    if (!activeOrderId) return;
    if (activeOrder?.status === 'completed' || activeOrder?.status === 'cancelled') {
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    const channelName = `order-tracker-${activeOrderId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${activeOrderId}`,
        },
        (payload) => {
          const rec = payload.new as {
            id?: string;
            status?: OrderStatus;
            order_number?: number;
          };

          if (rec?.status) {
            handleStatusTransition(rec.status);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'status_update' },
        (msg: { payload?: { id?: string; status?: OrderStatus } }) => {
          const data = msg?.payload;
          if (data?.id === activeOrderId && data?.status) {
            handleStatusTransition(data.status);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeOrderId, activeOrder?.status, handleStatusTransition]);

  // 3. Reconciliação em mudanças de visibilidade ou reconexão Wi-Fi
  useEffect(() => {
    const handleRecheck = () => {
      if (document.visibilityState === 'visible' && activeOrderIdRef.current) {
        void fetchLatestStatus(activeOrderIdRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleRecheck);
    window.addEventListener('online', handleRecheck);

    return () => {
      document.removeEventListener('visibilitychange', handleRecheck);
      window.removeEventListener('online', handleRecheck);
    };
  }, [fetchLatestStatus]);

  // 4. Polling ultra-leve de reconciliação (cada 4s) enquanto houver pedido em curso
  useEffect(() => {
    if (!activeOrderId) return;
    if (activeOrder?.status === 'completed' || activeOrder?.status === 'cancelled') {
      return;
    }

    const interval = setInterval(() => {
      if (activeOrderIdRef.current) {
        void fetchLatestStatus(activeOrderIdRef.current);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [activeOrderId, activeOrder?.status, fetchLatestStatus]);

  // 5. Ouvinte de eventos customizados e storage para sincronização instantânea
  useEffect(() => {
    const handleCustomStatusUpdate = (e: Event) => {
      const evt = e as CustomEvent<{
        orderId: string;
        status?: OrderStatus;
        order?: Partial<ActiveTrackerOrder> | Order;
      }>;
      if (!evt.detail?.orderId) return;

      const incomingOrderId = evt.detail.orderId;

      // Se ainda não estiver associado a este pedido, associa imediatamente
      if (activeOrderIdRef.current !== incomingOrderId) {
        setActiveOrderIdState(incomingOrderId);
        activeOrderIdRef.current = incomingOrderId;
        try {
          localStorage.setItem(ACTIVE_ORDER_ID_KEY, incomingOrderId);
        } catch {
          // ignore
        }
        void fetchLatestStatus(incomingOrderId);
      }

      if (evt.detail.order) {
        setActiveOrderId(incomingOrderId, evt.detail.order);
      } else if (evt.detail.status) {
        handleStatusTransition(evt.detail.status);
      }
    };

    const handleActiveOrderCreated = (e: Event) => {
      const evt = e as CustomEvent<{
        orderId: string;
        order?: Partial<ActiveTrackerOrder> | Order;
      }>;
      if (evt.detail?.orderId) {
        setActiveOrderId(evt.detail.orderId, evt.detail.order);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === ACTIVE_ORDER_ID_KEY) {
        if (e.newValue) {
          setActiveOrderIdState(e.newValue);
          activeOrderIdRef.current = e.newValue;
          void fetchLatestStatus(e.newValue);
        } else {
          clearActiveOrder();
        }
      }
    };

    window.addEventListener(
      'gulas_order_status_update',
      handleCustomStatusUpdate
    );
    window.addEventListener(
      'gulas_active_order_created',
      handleActiveOrderCreated
    );
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener(
        'gulas_order_status_update',
        handleCustomStatusUpdate
      );
      window.removeEventListener(
        'gulas_active_order_created',
        handleActiveOrderCreated
      );
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [handleStatusTransition, setActiveOrderId, fetchLatestStatus, clearActiveOrder]);

  const openDetailModal = useCallback(() => setIsDetailModalOpen(true), []);
  const closeDetailModal = useCallback(() => setIsDetailModalOpen(false), []);

  const value: ActiveOrderTrackerContextValue = {
    activeOrderId,
    activeOrder,
    status: activeOrder?.status ?? null,
    isLoading,
    completionNotice,
    isDetailModalOpen,
    setIsDetailModalOpen,
    openDetailModal,
    closeDetailModal,
    setActiveOrderId,
    clearActiveOrder,
    refreshOrder,
  };

  return (
    <ActiveOrderTrackerContext.Provider value={value}>
      {children}
    </ActiveOrderTrackerContext.Provider>
  );
};

export const useActiveOrderTracker = (): ActiveOrderTrackerContextValue => {
  const context = useContext(ActiveOrderTrackerContext);
  if (!context) {
    throw new Error(
      'useActiveOrderTracker deve ser utilizado dentro de um ActiveOrderTrackerProvider'
    );
  }
  return context;
};
