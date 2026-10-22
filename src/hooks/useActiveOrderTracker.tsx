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
import {
  getOrderPublicStatus,
  getMultipleOrdersPublicStatus,
} from '@/actions/orders';
import { Order, OrderStatus } from '@/types/restaurant';


export const ACTIVE_ORDER_IDS_KEY = 'gulas_active_order_ids';
export const ACTIVE_ORDERS_DATA_KEY = 'gulas_active_orders_data';
export const ACTIVE_ORDER_ID_KEY = 'gulas_active_order_id';
export const ACTIVE_ORDER_DATA_KEY = 'gulas_active_order_data';
export const ACTIVE_ORDER_TOKENS_KEY = 'gulas_active_order_tokens';


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


export interface ActiveOrderTrackerContextValue {
  activeOrderIds: string[];
  activeOrders: ActiveTrackerOrder[];
  activeOrderId: string | null;
  activeOrder: ActiveTrackerOrder | null;
  status: OrderStatus | null;
  isLoading: boolean;
  completionNotice: string | null;
  isDetailModalOpen: boolean;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  setIsDetailModalOpen: (open: boolean) => void;
  openDetailModal: (orderId?: string) => void;
  closeDetailModal: () => void;
  setActiveOrderId: (
    orderId: string,
    initialData?: Partial<ActiveTrackerOrder> | Order
  ) => void;
  removeActiveOrder: (orderId: string) => void;
  clearActiveOrder: () => void;
  refreshOrder: () => Promise<void>;
}


const ActiveOrderTrackerContext =
  createContext<ActiveOrderTrackerContextValue | null>(null);


function isRecentOrder(createdAt?: string): boolean {
  if (!createdAt) return false;
  try {
    const age = Date.now() - new Date(createdAt).getTime();
    return age < 12 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}


function getInitialActiveOrderIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const multi = localStorage.getItem(ACTIVE_ORDER_IDS_KEY);
    if (multi) {
      const parsed = JSON.parse(multi);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (id) => typeof id === 'string' && id.trim() !== ''
        );
      }
    }
    const single = localStorage.getItem(ACTIVE_ORDER_ID_KEY);
    if (single && single.trim() !== '') {
      return [single.trim()];
    }
  } catch {
    // ignore
  }
  return [];
}


function getInitialActiveOrders(ids: string[]): ActiveTrackerOrder[] {
  if (typeof window === 'undefined' || ids.length === 0) return [];
  try {
    const multiData = localStorage.getItem(ACTIVE_ORDERS_DATA_KEY);
    if (multiData) {
      const parsed = JSON.parse(multiData);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (o): o is ActiveTrackerOrder =>
            Boolean(
              o &&
              typeof o.id === 'string' &&
              ids.includes(o.id) &&
              o.status !== 'completed' &&
              o.status !== 'cancelled' &&
              isRecentOrder(o.createdAt)
            )
        );
      }
    }
    const singleData = localStorage.getItem(ACTIVE_ORDER_DATA_KEY);
    if (singleData) {
      const parsed = JSON.parse(singleData) as ActiveTrackerOrder;
      if (
        parsed &&
        typeof parsed.id === 'string' &&
        ids.includes(parsed.id) &&
        parsed.status !== 'completed' &&
        parsed.status !== 'cancelled' &&
        isRecentOrder(parsed.createdAt)
      ) {
        return [parsed];
      }
    }
  } catch {
    // ignore
  }
  return [];
}


function getInitialOrderTokens(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(ACTIVE_ORDER_TOKENS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).filter(
          ([id, token]) =>
            typeof id === 'string' &&
            id.trim() !== '' &&
            typeof token === 'string' &&
            token.trim() !== ''
        )
      ) as Record<string, string>;
    }
  } catch {
    // ignore
  }
  return {};
}


function persistOrderTokens(tokens: Record<string, string>) {
  try {
    if (Object.keys(tokens).length > 0) {
      localStorage.setItem(ACTIVE_ORDER_TOKENS_KEY, JSON.stringify(tokens));
    } else {
      localStorage.removeItem(ACTIVE_ORDER_TOKENS_KEY);
    }
  } catch {
    // ignore
  }
}


export const ActiveOrderTrackerProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [activeOrderIds, setActiveOrderIdsState] = useState<string[]>(
    getInitialActiveOrderIds
  );


  const [activeOrders, setActiveOrders] = useState<ActiveTrackerOrder[]>(() =>
    getInitialActiveOrders(getInitialActiveOrderIds())
  );


  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);


  const activeOrderIdsRef = useRef<string[]>(activeOrderIds);
  useEffect(() => {
    activeOrderIdsRef.current = activeOrderIds;
  }, [activeOrderIds]);


  const activeOrdersRef = useRef<ActiveTrackerOrder[]>(activeOrders);
  useEffect(() => {
    activeOrdersRef.current = activeOrders;
  }, [activeOrders]);


  const orderTokensRef = useRef<Record<string, string>>(
    getInitialOrderTokens()
  );


  const persistOrders = useCallback(
    (ids: string[], orders: ActiveTrackerOrder[]) => {
      try {
        if (ids.length > 0) {
          localStorage.setItem(ACTIVE_ORDER_IDS_KEY, JSON.stringify(ids));
          localStorage.setItem(ACTIVE_ORDERS_DATA_KEY, JSON.stringify(orders));
          localStorage.setItem(ACTIVE_ORDER_ID_KEY, ids[ids.length - 1]);
          if (orders.length > 0) {
            localStorage.setItem(
              ACTIVE_ORDER_DATA_KEY,
              JSON.stringify(orders[orders.length - 1])
            );
          }
        } else {
          localStorage.removeItem(ACTIVE_ORDER_IDS_KEY);
          localStorage.removeItem(ACTIVE_ORDERS_DATA_KEY);
          localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
          localStorage.removeItem(ACTIVE_ORDER_DATA_KEY);
        }
      } catch {
        // ignore
      }
    },
    []
  );


  const clearActiveOrder = useCallback(() => {
    setActiveOrderIdsState([]);
    setActiveOrders([]);
    setSelectedOrderId(null);
    setCompletionNotice(null);
    setIsDetailModalOpen(false);


    orderTokensRef.current = {};
    persistOrderTokens({});


    try {
      localStorage.removeItem(ACTIVE_ORDER_IDS_KEY);
      localStorage.removeItem(ACTIVE_ORDERS_DATA_KEY);
      localStorage.removeItem(ACTIVE_ORDER_ID_KEY);
      localStorage.removeItem(ACTIVE_ORDER_DATA_KEY);
      localStorage.removeItem(ACTIVE_ORDER_TOKENS_KEY);
    } catch {
      // ignore
    }
  }, []);


  const purgeOrphanOrders = useCallback(
    (orphanIds?: string[]) => {
      setActiveOrderIdsState((prevIds) => {
        const nextIds =
          orphanIds && orphanIds.length > 0
            ? prevIds.filter((id) => !orphanIds.includes(id))
            : [];


        setActiveOrders((prevOrders) => {
          const nextOrders =
            orphanIds && orphanIds.length > 0
              ? prevOrders.filter((o) => !orphanIds.includes(o.id))
              : [];


          persistOrders(nextIds, nextOrders);
          return nextOrders;
        });


        if (orphanIds && orphanIds.length > 0) {
          const nextTokens = { ...orderTokensRef.current };
          orphanIds.forEach((id) => delete nextTokens[id]);
          orderTokensRef.current = nextTokens;
          persistOrderTokens(nextTokens);
        }


        setSelectedOrderId((current) =>
          current && (!orphanIds || orphanIds.includes(current))
            ? nextIds[nextIds.length - 1] || null
            : current
        );


        return nextIds;
      });
    },
    [persistOrders]
  );


  const removeActiveOrder = useCallback(
    (orderIdToRemove: string) => {
      setActiveOrderIdsState((prevIds) => {
        const nextIds = prevIds.filter((id) => id !== orderIdToRemove);
        setActiveOrders((prevOrders) => {
          const nextOrders = prevOrders.filter((o) => o.id !== orderIdToRemove);
          persistOrders(nextIds, nextOrders);
          return nextOrders;
        });


        const nextTokens = { ...orderTokensRef.current };
        delete nextTokens[orderIdToRemove];
        orderTokensRef.current = nextTokens;
        persistOrderTokens(nextTokens);


        setSelectedOrderId((current) =>
          current === orderIdToRemove
            ? nextIds[nextIds.length - 1] || null
            : current
        );


        return nextIds;
      });
    },
    [persistOrders]
  );


  const handleStatusTransition = useCallback(
    (targetOrderId: string, newStatus: OrderStatus) => {
      setActiveOrders((prevOrders) => {
        const target = prevOrders.find((o) => o.id === targetOrderId);
        if (!target || target.status === newStatus) return prevOrders;


        const updated = prevOrders.map((o) =>
          o.id === targetOrderId
            ? { ...o, status: newStatus, updatedAt: new Date().toISOString() }
            : o
        );


        if (newStatus === 'completed' || newStatus === 'cancelled') {
          const orderNum = target.orderNumber ? `#${target.orderNumber}` : '';
          const notice =
            newStatus === 'completed'
              ? `Pedido ${orderNum} concluído com sucesso. Bom apetite!`
              : `Pedido ${orderNum} cancelado.`;


          setCompletionNotice(notice);


          setTimeout(() => {
            setCompletionNotice((current) =>
              current === notice ? null : current
            );
            removeActiveOrder(targetOrderId);
          }, 8000);
        } else {
          persistOrders(activeOrderIdsRef.current, updated);
        }


        return updated;
      });
    },
    [persistOrders, removeActiveOrder]
  );


  const setActiveOrderId = useCallback(
    (
      orderId: string,
      initialData?: Partial<ActiveTrackerOrder> | Order
    ) => {
      if (!orderId || typeof orderId !== 'string') return;
      const cleanId = orderId.trim();
      if (!cleanId) return;


      setCompletionNotice(null);


      // Depois de um novo pedido ser criado, o CartContext pode ter guardado
      // o token pouco antes deste evento. Recarregamos o mapa de tokens.
      orderTokensRef.current = getInitialOrderTokens();


      let formatted: ActiveTrackerOrder | null = null;
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


        formatted = {
          id: cleanId,
          orderNumber:
            'orderNumber' in initialData ? initialData.orderNumber : undefined,
          tableNumber: initialData.tableNumber ?? 0,
          tableName:
            initialData.tableName ||
            `Mesa ${initialData.tableNumber ?? ''}`,
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
      }


      setActiveOrderIdsState((prev) => {
        const nextIds = prev.includes(cleanId) ? prev : [...prev, cleanId];
        setActiveOrders((prevOrders) => {
          const nextOrders = [...prevOrders];
          if (formatted) {
            const idx = nextOrders.findIndex((o) => o.id === cleanId);
            if (idx >= 0) {
              nextOrders[idx] = formatted;
            } else {
              nextOrders.push(formatted);
            }
          } else {
            if (!nextOrders.some((o) => o.id === cleanId)) {
              nextOrders.push({
                id: cleanId,
                tableNumber: 0,
                tableName: 'Mesa',
                status: 'pending',
                subtotal: 0,
                total: 0,
                createdAt: new Date().toISOString(),
                items: [],
              });
            }
          }
          persistOrders(nextIds, nextOrders);
          return nextOrders;
        });
        return nextIds;
      });


      setSelectedOrderId(cleanId);
    },
    [persistOrders]
  );


  const fetchLatestStatus = useCallback(
    async (orderIdToFetch: string) => {
      if (!orderIdToFetch) return;


      const trackingToken = orderTokensRef.current[orderIdToFetch] || null;


      try {
        const result = await getOrderPublicStatus(
          orderIdToFetch,
          trackingToken
        );


        if (result.success && result.data) {
          const fetched = result.data;
          const currentStatus = fetched.status as OrderStatus;


          setActiveOrders((prev) => {
            const exists = prev.some((o) => o.id === fetched.id);
            const updatedItem: ActiveTrackerOrder = {
              id: fetched.id,
              orderNumber: fetched.orderNumber,
              tableNumber: fetched.tableNumber,
              tableName: fetched.tableName || `Mesa ${fetched.tableNumber}`,
              status: currentStatus,
              subtotal: fetched.subtotal,
              total: fetched.total,
              createdAt: fetched.createdAt,
              updatedAt: fetched.updatedAt,
              items:
                fetched.items && fetched.items.length > 0
                  ? fetched.items
                  : prev.find((o) => o.id === fetched.id)?.items || [],
            };


            const next = exists
              ? prev.map((o) =>
                o.id === fetched.id ? { ...o, ...updatedItem } : o
              )
              : [...prev, updatedItem];


            persistOrders(activeOrderIdsRef.current, next);
            return next;
          });


          if (
            currentStatus === 'completed' ||
            currentStatus === 'cancelled'
          ) {
            handleStatusTransition(fetched.id, currentStatus);
          }
        } else if (!result.success) {
          console.warn(
            "[ActiveOrderTracker] Consulta individual falhou; pedido mantido localmente:",
            orderIdToFetch
          );
        }
      } catch {
        // Falha tolerada em modo offline
      }
    },
    [handleStatusTransition, persistOrders]
  );


  const fetchAllActiveStatuses = useCallback(async () => {
    const ids = activeOrderIdsRef.current;
    if (ids.length === 0) return;


    // Recarregar tokens: permite capturar tokens criados pelo CartContext.
    orderTokensRef.current = getInitialOrderTokens();


    const orderQueries = ids.map((id) => ({
      orderId: id,
      trackingToken: orderTokensRef.current[id] || null,
    }));


    try {
      const res = await getMultipleOrdersPublicStatus(orderQueries);
      if (res.success) {
        const { orders, missingIds } = res.data;


        if (orders.length === 0) {
          console.warn(
            "[ActiveOrderTracker] Consulta em lote não devolveu pedidos; acompanhamento mantido localmente:",
            ids
          );
          return;
        }


        if (missingIds.length > 0) {
          console.warn(
            "[ActiveOrderTracker] IDs não confirmados pela consulta em lote; mantidos localmente:",
            missingIds
          );
        }


        const stillActive = orders.filter(
          (o) => o.status !== 'completed' && o.status !== 'cancelled'
        );
        const finishedOrders = orders.filter(
          (o) => o.status === 'completed' || o.status === 'cancelled'
        );


        if (stillActive.length === 0) {
          if (finishedOrders.length > 0) {
            const last = finishedOrders[finishedOrders.length - 1];
            handleStatusTransition(last.id, last.status as OrderStatus);
          }
          return;
        }


        setActiveOrders((prev) => {
          const map = new Map<string, ActiveTrackerOrder>(
            prev.map((o) => [o.id, o])
          );


          stillActive.forEach((fetched) => {
            const currentStatus = fetched.status as OrderStatus;
            map.set(fetched.id, {
              id: fetched.id,
              orderNumber: fetched.orderNumber,
              tableNumber: fetched.tableNumber,
              tableName: fetched.tableName || `Mesa ${fetched.tableNumber}`,
              status: currentStatus,
              subtotal: fetched.subtotal,
              total: fetched.total,
              createdAt: fetched.createdAt,
              updatedAt: fetched.updatedAt,
              items: fetched.items || [],
            });
          });


          finishedOrders.forEach((o) => map.delete(o.id));


          const nextList = Array.from(map.values()).filter(
            (o) => o.status !== 'completed' && o.status !== 'cancelled'
          );


          const nextIds = nextList.map((o) => o.id);
          persistOrders(nextIds, nextList);
          return nextList;
        });


        setActiveOrderIdsState((prev) => {
          const finishedSet = new Set(finishedOrders.map((o) => o.id));
          return prev.filter((id) => !finishedSet.has(id));
        });
      }
    } catch {
      // Falha tolerada em modo offline momentâneo
    }
  }, [handleStatusTransition, persistOrders]);


  const refreshOrder = useCallback(async () => {
    setIsLoading(true);
    await fetchAllActiveStatuses();
    setIsLoading(false);
  }, [fetchAllActiveStatuses]);


  useEffect(() => {
    if (activeOrderIds.length > 0) {
      const timer = setTimeout(() => {
        void fetchAllActiveStatuses();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeOrderIds, fetchAllActiveStatuses]);


  useEffect(() => {
    if (activeOrderIds.length === 0) return;


    const supabase = createClient();
    if (!supabase) return;


    const channelName = `customer-orders-${activeOrderIds
      .slice(0, 3)
      .join('-')}-${activeOrderIds.length}`;
    const channel = supabase.channel(channelName);


    activeOrderIds.forEach((orderId) => {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const rec = payload.new as {
            id?: string;
            status?: OrderStatus;
          };


          if (rec?.id && rec?.status) {
            handleStatusTransition(rec.id, rec.status);
            void fetchLatestStatus(rec.id);
          }
        }
      );
    });


    channel.on(
      'broadcast',
      { event: 'status_update' },
      (msg: { payload?: { id?: string; status?: OrderStatus } }) => {
        const data = msg?.payload;
        if (
          data?.id &&
          data?.status &&
          activeOrderIdsRef.current.includes(data.id)
        ) {
          handleStatusTransition(data.id, data.status);
          void fetchLatestStatus(data.id);
        }
      }
    );


    channel.subscribe();


    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeOrderIds, handleStatusTransition, fetchLatestStatus]);


  useEffect(() => {
    const handleRecheck = () => {
      if (document.visibilityState === 'visible' && activeOrderIdsRef.current.length > 0) {
        void fetchAllActiveStatuses();
      }
    };


    document.addEventListener('visibilitychange', handleRecheck);
    window.addEventListener('online', handleRecheck);


    return () => {
      document.removeEventListener('visibilitychange', handleRecheck);
      window.removeEventListener('online', handleRecheck);
    };
  }, [fetchAllActiveStatuses]);


  useEffect(() => {
    if (activeOrderIds.length === 0) return;


    const interval = setInterval(() => {
      void fetchAllActiveStatuses();
    }, 4000);


    return () => clearInterval(interval);
  }, [activeOrderIds, fetchAllActiveStatuses]);


  useEffect(() => {
    const handleCustomStatusUpdate = (e: Event) => {
      const evt = e as CustomEvent<{
        orderId: string;
        status?: OrderStatus;
        order?: Partial<ActiveTrackerOrder> | Order;
      }>;
      if (!evt.detail?.orderId) return;


      const incomingOrderId = evt.detail.orderId;


      if (!activeOrderIdsRef.current.includes(incomingOrderId)) {
        setActiveOrderId(incomingOrderId, evt.detail.order);
      } else if (evt.detail.status) {
        handleStatusTransition(incomingOrderId, evt.detail.status);
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
      if (
        e.key === ACTIVE_ORDER_IDS_KEY ||
        e.key === ACTIVE_ORDER_ID_KEY ||
        e.key === ACTIVE_ORDER_TOKENS_KEY
      ) {
        const freshIds = getInitialActiveOrderIds();
        setActiveOrderIdsState(freshIds);
        activeOrderIdsRef.current = freshIds;
        const freshOrders = getInitialActiveOrders(freshIds);
        setActiveOrders(freshOrders);
        orderTokensRef.current = getInitialOrderTokens();
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
  }, [handleStatusTransition, setActiveOrderId]);


  const openDetailModal = useCallback((orderId?: string) => {
    if (orderId) {
      setSelectedOrderId(orderId);
    }
    setIsDetailModalOpen(true);
  }, []);


  const closeDetailModal = useCallback(() => setIsDetailModalOpen(false), []);


  const activeOrder =
    activeOrders.find((o) => o.id === selectedOrderId) ||
    activeOrders[activeOrders.length - 1] ||
    null;


  const activeOrderId =
    activeOrder?.id ||
    activeOrderIds[activeOrderIds.length - 1] ||
    null;


  const status = activeOrder?.status || null;


  const value: ActiveOrderTrackerContextValue = {
    activeOrderIds,
    activeOrders,
    activeOrderId,
    activeOrder,
    status,
    isLoading,
    completionNotice,
    isDetailModalOpen,
    selectedOrderId,
    setSelectedOrderId,
    setIsDetailModalOpen,
    openDetailModal,
    closeDetailModal,
    setActiveOrderId,
    removeActiveOrder,
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