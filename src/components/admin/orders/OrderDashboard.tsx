'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import {
  ManagedOrder,
  changeOrderTable,
  getActiveOrders,
  reopenCompletedOrder,
  updateOrderStatus,
} from '@/actions/order-management';
import { ValidNextStatus } from '@/lib/validations/order-management';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useKdsAlerts } from '@/hooks/useKdsAlerts';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { OrderCard } from './OrderCard';
import { ThermalReceipt } from './ThermalReceipt';
import ConsolidatedItems from '@/components/admin/kds/ConsolidatedItems';
import { TableQrCodesModal } from '@/components/admin/qrcodes/TableQrCodesModal';
import { toggleRestaurantOpenStatus } from '@/actions/product-stock';

interface OrderDashboardProps {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  initialIsRestaurantOpen?: boolean;
  initialOrders: ManagedOrder[];
  isOwner: boolean;
}

type SectionFilter = 'all' | 'bar' | 'kitchen';
type KdsViewMode = 'orders' | 'tables';

interface TableServiceCall {
  id: string;
  tableNumber: number;
  type: 'bill_card' | 'bill_cash' | 'call_staff';
  label: string;
  nif?: string | null;
  createdAt: string;
}

const SECTION_FILTERS: Array<{
  key: SectionFilter;
  label: string;
}> = [
    {
      key: 'all',
      label: 'Todos',
    },
    {
      key: 'bar',
      label: 'Bar / Copa',
    },
    {
      key: 'kitchen',
      label: 'Cozinha',
    },
  ];

export function OrderDashboard({
  restaurantId,
  restaurantName,
  restaurantSlug,
  initialIsRestaurantOpen = true,
  initialOrders,
  isOwner,
}: OrderDashboardProps) {
  const [orders, setOrders] = useState<ManagedOrder[]>(initialOrders);
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(
    initialIsRestaurantOpen
  );
  const [isTogglingOpen, setIsTogglingOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<ManagedOrder | null>(null);
  const [autoPrintOnAccept, setAutoPrintOnAccept] = useState(false);
  const [viewMode, setViewMode] = useState<KdsViewMode>('orders');
  const [tableCalls, setTableCalls] = useState<TableServiceCall[]>([]);
  const tableCallsStorageKey = `gulas_kds_table_calls_${restaurantSlug || 'gulas'}`;
  const isTableCallsHydratedRef = useRef(false);
  const lastLocalMutationAtRef = useRef<number>(0);
  const statusBroadcastChannelRef = useRef<RealtimeChannel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [, setLastRefreshedAt] = useState<Date | null>(null);
  const [updatingMap, setUpdatingMap] = useState<Record<string, boolean>>({});
  const [orderErrorMap, setOrderErrorMap] = useState<
    Record<string, string | null>
  >({});
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const [kdsSearchQuery, setKdsSearchQuery] = useState('');
  const [onlyUrgentSla, setOnlyUrgentSla] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);

  useEffect(() => {
    const syncClock = () => setNowMs(Date.now());
    const initTimer = setTimeout(syncClock, 0);
    const interval = setInterval(syncClock, 15000);
    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, []);
  const {
    isSupported: isWakeLockSupported,
    isActive: isWakeLockActive,
    status: wakeLockStatus,
    requestWakeLock,
    releaseWakeLock,
  } = useScreenWakeLock(true);
  const [a11yAnnouncement, setA11yAnnouncement] = useState('');

  useEffect(() => {
    try {
      const savedAutoPrint = localStorage.getItem('gulas_kds_autoprint');
      if (savedAutoPrint === 'true') {
        queueMicrotask(() => setAutoPrintOnAccept(true));
      }
    } catch {
      // Ignorar
    }
  }, []);

  const toggleAutoPrint = () => {
    setAutoPrintOnAccept((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gulas_kds_autoprint', String(next));
      } catch {
        // Ignorar
      }
      return next;
    });
  };

  const previousOrderIdsRef = useRef<Set<string>>(
    new Set(initialOrders.map((order) => order.id))
  );
  const isInitialLoadRef = useRef(true);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const [, startRefreshTransition] = useTransition();
  const {
    alertsState,
    activateAlerts,
    deactivateAlerts,
    triggerNewOrderAlert,
  } = useKdsAlerts();

  // Subscrição em tempo real para Chamadas de Mesa ("Pedir a Conta" / "Chamar Staff") + Canal de Broadcast de Estado KDS -> Cliente
  useEffect(() => {
    try {
      const rawCalls = localStorage.getItem(tableCallsStorageKey);
      if (rawCalls) {
        const parsed = JSON.parse(rawCalls);
        if (Array.isArray(parsed)) {
          const twoHoursMs = 2 * 60 * 60 * 1000;
          const nowMs = Date.now();
          const validCalls = parsed.filter((c): c is TableServiceCall => {
            if (!c || typeof c.id !== 'string' || typeof c.tableNumber !== 'number') {
              return false;
            }
            const age = nowMs - new Date(c.createdAt).getTime();
            return !Number.isNaN(age) && age >= 0 && age < twoHoursMs;
          });
          if (validCalls.length > 0) {
            queueMicrotask(() => setTableCalls(validCalls));
          }
        }
      }
    } catch {
      // Ignorar
    } finally {
      isTableCallsHydratedRef.current = true;
    }

    const supabase = createClient();
    if (!supabase) return;

    const tableChannel = supabase
      .channel(`table-service-${restaurantSlug || 'gulas'}`)
      .on(
        'broadcast',
        { event: 'table_call' },
        (msg) => {
          const call = msg?.payload as TableServiceCall | undefined;
          if (!call || !call.tableNumber) return;

          setTableCalls((prev) => [
            call,
            ...prev.filter((c) => c.id !== call.id),
          ]);
          triggerNewOrderAlert();
        }
      )
      .subscribe();

    const statusChannel = supabase
      .channel('gulas-order-status-broadcast')
      .subscribe();
    statusBroadcastChannelRef.current = statusChannel;

    return () => {
      statusBroadcastChannelRef.current = null;
      void supabase.removeChannel(tableChannel);
      void supabase.removeChannel(statusChannel);
    };
  }, [restaurantSlug, tableCallsStorageKey, triggerNewOrderAlert]);

  useEffect(() => {
    if (!isTableCallsHydratedRef.current) return;
    try {
      localStorage.setItem(tableCallsStorageKey, JSON.stringify(tableCalls));
    } catch {
      // Ignorar
    }
  }, [tableCalls, tableCallsStorageKey]);

  interface UndoOrderState {
    orderId: string;
    orderNumber: number;
    tableNumber: number;
    updatedAt: string;
  }

  const [undoOrder, setUndoOrder] = useState<UndoOrderState | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mountTimer = setTimeout(() => {
      setLastRefreshedAt(new Date());
    }, 0);

    return () => {
      clearTimeout(mountTimer);
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      if (announcementTimerRef.current) {
        clearTimeout(announcementTimerRef.current);
      }
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    setDashboardError(null);
    setIsLoading(true);

    try {
      const result = await getActiveOrders();

      if (!result.success) {
        setDashboardError(result.error.message);
        return;
      }

      const currentIds = previousOrderIdsRef.current;
      const newlyAdded = new Set<string>();

      result.data.forEach((order) => {
        if (!currentIds.has(order.id)) {
          newlyAdded.add(order.id);
        }
      });

      if (newlyAdded.size > 0) {
        setNewOrderIds((previous) => new Set([...previous, ...newlyAdded]));

        if (highlightTimerRef.current) {
          clearTimeout(highlightTimerRef.current);
        }

        highlightTimerRef.current = setTimeout(() => {
          setNewOrderIds((previous) => {
            const next = new Set(previous);
            newlyAdded.forEach((id) => {
              next.delete(id);
            });
            return next;
          });
        }, 10000);
      }

      previousOrderIdsRef.current = new Set(
        result.data.map((order) => order.id)
      );
      setOrders(result.data);
      setLastRefreshedAt(new Date());
    } catch {
      setDashboardError('Não foi possível carregar os pedidos.');
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  }, []);

  const handleNewOrder = useCallback(
    (orderId: string) => {
      if (isInitialLoadRef.current) {
        return;
      }

      if (previousOrderIdsRef.current.has(orderId)) {
        return;
      }

      // Garante que um novo pedido vindo de fora nunca é ignorado pelo cooldown de mutação local
      lastLocalMutationAtRef.current = 0;

      triggerNewOrderAlert();
      setA11yAnnouncement('Novo pedido recebido.');

      if (announcementTimerRef.current) {
        clearTimeout(announcementTimerRef.current);
      }

      announcementTimerRef.current = setTimeout(() => {
        setA11yAnnouncement('');
      }, 2000);
    },
    [triggerNewOrderAlert]
  );

  const markLocalMutation = useCallback(() => {
    lastLocalMutationAtRef.current = Date.now();
  }, []);

  const handleRealtimeOrdersChange = useCallback(async () => {
    // Evita refetch completo duplicado imediatamente após uma mutação feita neste tablet
    if (Date.now() - lastLocalMutationAtRef.current < 1500) {
      return;
    }
    await fetchOrders();
  }, [fetchOrders]);

  const { isConnected } = useOrdersRealtime({
    restaurantId,
    onOrdersChange: handleRealtimeOrdersChange,
    onNewOrder: handleNewOrder,
  });

  // Fallback Polling Automático se o WebSocket cair
  useEffect(() => {
    if (isConnected) return;

    const fallbackInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      void fetchOrders();
    }, 10000);

    return () => clearInterval(fallbackInterval);
  }, [isConnected, fetchOrders]);

  const handleToggleRestaurantOpen = async () => {
    if (isTogglingOpen) return;
    setIsTogglingOpen(true);
    const nextOpen = !isRestaurantOpen;
    try {
      const res = await toggleRestaurantOpenStatus(nextOpen);
      if (res.success) {
        setIsRestaurantOpen(res.data.isOpen);
      } else {
        setDashboardError(res.error.message);
      }
    } catch {
      setDashboardError('Não foi possível alterar o estado do restaurante.');
    } finally {
      setIsTogglingOpen(false);
    }
  };

  const handlePrintOrder = useCallback((orderToPrint: ManagedOrder) => {
    setPrintingOrder(orderToPrint);
    setTimeout(() => {
      window.print();
    }, 80);
  }, []);

  const handleManualRefresh = useCallback(() => {
    startRefreshTransition(async () => {
      await fetchOrders();
    });
  }, [fetchOrders]);

  useEffect(() => {
    const onGlobalRefresh = () => {
      handleManualRefresh();
    };
    window.addEventListener('gulas:admin-refresh', onGlobalRefresh);
    return () => {
      window.removeEventListener('gulas:admin-refresh', onGlobalRefresh);
    };
  }, [handleManualRefresh]);

  const handleUpdateStatus = async (
    orderId: string,
    nextStatus: ValidNextStatus
  ) => {
    setUpdatingMap((previous) => ({ ...previous, [orderId]: true }));
    setOrderErrorMap((previous) => ({ ...previous, [orderId]: null }));

    try {
      const currentOrder = orders.find((order) => order.id === orderId);

      if (!currentOrder) {
        setOrderErrorMap((previous) => ({
          ...previous,
          [orderId]: 'Este pedido já não está disponível. Atualize a lista.',
        }));
        return;
      }

      markLocalMutation();

      const result = await updateOrderStatus({
        orderId,
        nextStatus,
        expectedUpdatedAt: currentOrder.updatedAt,
      });

      if (!result.success) {
        if (result.error.code === 'OPTIMISTIC_CONFLICT') {
          await fetchOrders();
        }

        setOrderErrorMap((previous) => ({
          ...previous,
          [orderId]: result.error.message,
        }));
        return;
      }

      // Emite broadcast instantâneo (<100ms) para o telemóvel do cliente sem esperar pelo fallback polling
      void statusBroadcastChannelRef.current?.send({
        type: 'broadcast',
        event: 'status_update',
        payload: {
          id: result.data.id,
          status: result.data.status,
        },
      });

      setNewOrderIds((previous) => {
        const next = new Set(previous);
        next.delete(orderId);
        return next;
      });

      if (nextStatus === 'accepted' && autoPrintOnAccept) {
        handlePrintOrder(result.data);
      }

      if (nextStatus === 'completed' || nextStatus === 'cancelled') {
        setOrders((previous) =>
          previous.filter((order) => order.id !== orderId)
        );
        previousOrderIdsRef.current.delete(orderId);

        if (nextStatus === 'completed' && isOwner) {
          if (undoTimerRef.current) {
            clearTimeout(undoTimerRef.current);
          }
          setUndoOrder({
            orderId: currentOrder.id,
            orderNumber: currentOrder.orderNumber,
            tableNumber: currentOrder.tableNumber,
            updatedAt: result.data.updatedAt,
          });
          undoTimerRef.current = setTimeout(() => {
            setUndoOrder(null);
          }, 6000);
        }
      } else {
        setOrders((previous) =>
          previous.map((order) =>
            order.id === orderId ? result.data : order
          )
        );
        previousOrderIdsRef.current.add(result.data.id);
      }

      setLastRefreshedAt(new Date());
    } catch {
      setOrderErrorMap((previous) => ({
        ...previous,
        [orderId]: 'Ocorreu um erro ao atualizar o pedido.',
      }));
    } finally {
      setUpdatingMap((previous) => ({ ...previous, [orderId]: false }));
    }
  };

  const handleCloseAllTableOrders = async (tableNum: number) => {
    if (!isOwner) return;

    const tableOrders = orders.filter(
      (order) => order.tableNumber === tableNum
    );

    for (const order of tableOrders) {
      await handleUpdateStatus(order.id, 'completed');
    }
  };


  const handleChangeOrderTable = async (
    orderId: string,
    newTableNumber: number
  ) => {
    setUpdatingMap((previous) => ({ ...previous, [orderId]: true }));
    setOrderErrorMap((previous) => ({ ...previous, [orderId]: null }));
    markLocalMutation();

    try {
      const res = await changeOrderTable({ orderId, newTableNumber });
      if (!res.success) {
        setOrderErrorMap((previous) => ({
          ...previous,
          [orderId]: res.error.message,
        }));
        return;
      }

      setOrders((previous) =>
        previous.map((order) => (order.id === orderId ? res.data : order))
      );
      setA11yAnnouncement(
        `Pedido #${res.data.orderNumber} transferido para ${newTableNumber === 0 ? 'Take-Away' : `Mesa ${newTableNumber}`
        }.`
      );
    } catch {
      setOrderErrorMap((previous) => ({
        ...previous,
        [orderId]: 'Erro ao transferir o pedido de mesa.',
      }));
    } finally {
      setUpdatingMap((previous) => ({ ...previous, [orderId]: false }));
    }
  };

  const handleUndo = async () => {
    if (!undoOrder || isUndoing) return;

    setIsUndoing(true);
    markLocalMutation();
    try {
      const result = await reopenCompletedOrder({
        orderId: undoOrder.orderId,
        expectedUpdatedAt: undoOrder.updatedAt,
      });

      if (!result.success) {
        if (result.error.code === 'OPTIMISTIC_CONFLICT') {
          await fetchOrders();
        }
        setDashboardError(result.error.message);
        return;
      }

      void statusBroadcastChannelRef.current?.send({
        type: 'broadcast',
        event: 'status_update',
        payload: {
          id: result.data.id,
          status: result.data.status,
        },
      });

      setOrders((previous) => [
        result.data,
        ...previous.filter((order) => order.id !== result.data.id),
      ]);
      previousOrderIdsRef.current.add(result.data.id);
      setA11yAnnouncement(
        `Pedido #${result.data.orderNumber} reaberto com sucesso.`
      );

      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
      setUndoOrder(null);
    } catch {
      setDashboardError('Não foi possível reverter a conclusão do pedido.');
    } finally {
      setIsUndoing(false);
    }
  };

  const pendingCount = orders.filter((order) => order.status === 'pending').length;
  const preparingCount = orders.filter(
    (order) => order.status === 'accepted' || order.status === 'preparing'
  ).length;
  const readyCount = orders.filter((order) => order.status === 'ready').length;
  const totalActiveCount = orders.length;

  const filteredOrders = orders.filter((order) => {
    if (sectionFilter !== 'all') {
      const hasBarItem = order.items.some(
        (item) => item.categorySlug === 'bebidas'
      );
      const hasKitchenItem = order.items.some(
        (item) => item.categorySlug !== 'bebidas'
      );

      if (sectionFilter === 'bar' && !hasBarItem) return false;
      if (sectionFilter === 'kitchen' && !hasKitchenItem) return false;
    }

    if (onlyUrgentSla && nowMs > 0) {
      const elapsedMs = nowMs - new Date(order.createdAt).getTime();
      if (elapsedMs < 20 * 60 * 1000) return false;
    }

    const q = kdsSearchQuery.replace('#', '').trim().toLowerCase();
    if (q) {
      const matchesNum = String(order.orderNumber).includes(q);
      const matchesTable =
        order.tableNumber === 0
          ? 'take-away takeaway'.includes(q)
          : `mesa ${order.tableNumber}`.includes(q) || String(order.tableNumber) === q;
      const matchesNotes = Boolean(order.customerNotes?.toLowerCase().includes(q));
      const matchesItem = order.items.some((item) =>
        item.productName.toLowerCase().includes(q)
      );
      if (!matchesNum && !matchesTable && !matchesNotes && !matchesItem) {
        return false;
      }
    }

    return true;
  });

  // Dados estruturados para a Vista de Mapa de Mesas (0 = Take-Away, 1..20 = Mesas)
  const tablesOverview = useMemo(() => {
    const slots = [0, ...Array.from({ length: 20 }, (_, i) => i + 1)];
    return slots.map((tableNumber) => {
      const activeForTable = orders.filter((o) => o.tableNumber === tableNumber);
      const totalBill = activeForTable.reduce((sum, o) => sum + o.total, 0);
      const hasReady = activeForTable.some((o) => o.status === 'ready');
      const hasPending = activeForTable.some((o) => o.status === 'pending');
      const hasCall = tableCalls.some((c) => c.tableNumber === tableNumber);

      return {
        tableNumber,
        label: tableNumber === 0 ? 'Take-Away / Balcão' : `Mesa ${tableNumber}`,
        orders: activeForTable,
        totalBill,
        hasReady,
        hasPending,
        hasCall,
      };
    });
  }, [orders, tableCalls]);

  return (
    <div
      className="space-y-6 pb-12 min-h-screen bg-transparent text-zinc-900 rounded-none"
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {a11yAnnouncement}
      </div>

      {/* Alertas ao Vivo de Assistência na Mesa ("Pedir a Conta" / "Chamar Staff") */}
      {tableCalls.length > 0 && (
        <div className="space-y-2.5">
          {tableCalls.map((call) => (
            <div
              key={call.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-zinc-800 bg-zinc-900 text-white shadow-md animate-in slide-in-from-top-2 duration-200"
            >
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-zinc-950 text-xs font-bold uppercase tracking-wide">
                    Mesa {call.tableNumber}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {call.label}
                  </span>
                  {call.nif && (
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-lg border border-zinc-700 bg-zinc-800 text-amber-300">
                      NIF: {call.nif}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1.5">
                  Solicitado pelo cliente na mesa às{' '}
                  {new Date(call.createdAt).toLocaleTimeString('pt-PT', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setTableCalls((prev) => prev.filter((c) => c.id !== call.id))
                }
                className="px-4 py-2 rounded-xl border border-white bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer shrink-0"
              >
                Marcar Atendido
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top Header & Operational Controls */}
      <section
        aria-label="Cabeçalho de controlo do Monitor"
        className="rounded-3xl border border-zinc-200/90 bg-white p-5 sm:p-7 shadow-xs"
      >
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Monitor de Operações
          </h1>

          {/* Opções operacionais em linha única, com QR Codes na mesma linha à direita */}
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex flex-wrap items-center gap-2">
              {isOwner && (
                <button
                  type="button"
                  disabled={isTogglingOpen}
                  onClick={handleToggleRestaurantOpen}
                  className={`inline-flex items-center gap-2 h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-60 ${isRestaurantOpen
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                    }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${isRestaurantOpen ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                  />
                  <span>
                    {isRestaurantOpen ? 'Receção: Aberta' : 'Receção: Encerrada'}
                  </span>
                </button>
              )}

              <span
                className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl border text-xs font-semibold shadow-2xs ${isConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                  }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                    }`}
                />
                <span>{isConnected ? 'Tempo Real' : 'A Sincronizar...'}</span>
              </span>

              {alertsState === 'idle' ? (
                <button
                  type="button"
                  id="kds-alerts-activate-btn"
                  onClick={activateAlerts}
                  className="h-10 px-4 cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white active:scale-[0.98]"
                >
                  Ativar Som
                </button>
              ) : (
                <button
                  type="button"
                  id="kds-alerts-deactivate-btn"
                  onClick={deactivateAlerts}
                  className="h-10 px-4 cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 shadow-2xs transition-all active:scale-[0.98]"
                >
                  Som Ativo
                </button>
              )}

              {isWakeLockSupported &&
                (isWakeLockActive ? (
                  <button
                    type="button"
                    onClick={() => void releaseWakeLock()}
                    className="h-10 px-4 cursor-pointer rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 shadow-2xs transition-all active:scale-[0.98]"
                    title="Ecrã mantido ligado"
                  >
                    Ecrã Ativo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void requestWakeLock()}
                    className="h-10 px-4 cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white active:scale-[0.98]"
                  >
                    {wakeLockStatus === 'error' ? 'Tentar Ecrã' : 'Fixar Ecrã'}
                  </button>
                ))}

              <button
                type="button"
                onClick={toggleAutoPrint}
                className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] ${autoPrintOnAccept
                  ? 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                  : 'bg-zinc-50 border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
                  }`}
                title="Imprimir automaticamente o talão térmico (80mm) sempre que um pedido for aceite"
              >
                Auto-Print: {autoPrintOnAccept ? 'ON' : 'OFF'}
              </button>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="ml-auto h-10 px-4 cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white active:scale-[0.98]"
              >
                QR Codes
              </button>
            )}
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <section
        aria-label="Resumo operacional em tempo real"
        className="flex flex-row items-stretch gap-2 sm:gap-3 w-full"
      >
        {[
          {
            label: 'Total Ativos',
            value: totalActiveCount,
            borderClass: 'border-zinc-800',
            labelClass: 'text-zinc-700',
          },
          {
            label: 'A Aguardar',
            value: pendingCount,
            borderClass: 'border-amber-500',
            labelClass: 'text-amber-800',
          },
          {
            label: 'Em Preparação',
            value: preparingCount,
            borderClass: 'border-orange-600',
            labelClass: 'text-orange-800',
          },
          {
            label: 'Prontos (Pass)',
            value: readyCount,
            borderClass: 'border-emerald-600',
            labelClass: 'text-emerald-800',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`flex-1 min-w-0 flex items-center justify-between gap-2 sm:gap-3 rounded-xl border-2 ${kpi.borderClass} bg-white px-3 sm:px-4 py-2.5 shadow-2xs`}
          >
            <span
              className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate ${kpi.labelClass}`}
            >
              {kpi.label}
            </span>
            <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-zinc-950 shrink-0">
              {kpi.value}
            </span>
          </div>
        ))}
      </section>

      {/* Barra de Modo de Vista (Pedidos vs Mapa de Mesas) & Filtro de Secção */}
      <section
        aria-label="Filtros e vista do monitor"
        className="rounded-2xl border border-zinc-200/90 bg-white p-2.5 sm:p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('orders')}
            className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] ${viewMode === 'orders'
              ? 'bg-zinc-900 border-zinc-900 text-white'
              : 'bg-zinc-50 border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
              }`}
          >
            Pedidos ({totalActiveCount})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tables')}
            className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] ${viewMode === 'tables'
              ? 'bg-zinc-900 border-zinc-900 text-white'
              : 'bg-zinc-50 border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
              }`}
          >
            Mapa de Sala (1–20)
          </button>
        </div>

        {viewMode === 'orders' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Pesquisa rápida no KDS */}
            <div className="flex items-center bg-zinc-50 border border-zinc-200/90 focus-within:bg-white focus-within:border-zinc-900 h-10 rounded-xl shadow-2xs transition-colors overflow-hidden">
              <input
                type="text"
                value={kdsSearchQuery}
                onChange={(e) => setKdsSearchQuery(e.target.value)}
                placeholder="Mesa, #pedido ou cliente..."
                className="h-full px-3.5 bg-transparent text-xs font-medium text-zinc-900 placeholder:text-zinc-400 w-44 sm:w-56 focus:outline-none"
              />
              {kdsSearchQuery && (
                <button
                  type="button"
                  onClick={() => setKdsSearchQuery('')}
                  className="h-full px-3 border-l border-zinc-200 text-[11px] font-semibold text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer transition-colors"
                  aria-label="Limpar pesquisa"
                >
                  Limpar
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOnlyUrgentSla((v) => !v)}
              className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] ${onlyUrgentSla
                ? 'bg-rose-600 border-rose-700 text-white'
                : 'bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100'
                }`}
              title="Mostrar apenas pedidos acima de 20 minutos de espera (SLA)"
            >
              Urgentes &gt; 20mn
            </button>

            {SECTION_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSectionFilter(key)}
                className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] ${sectionFilter === key
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'bg-zinc-50 border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Vista 1: Mapa de Sala ao Vivo (Bloco 3) */}
      {viewMode === 'tables' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tablesOverview.map((slot) => {
            const isOccupied = slot.orders.length > 0;
            return (
              <div
                key={slot.tableNumber}
                className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${isOccupied
                  ? slot.hasReady
                    ? 'bg-gradient-to-b from-emerald-50/70 to-white border-emerald-300 shadow-xs'
                    : 'bg-white border-zinc-200/90 shadow-xs'
                  : 'bg-zinc-100/70 border-zinc-200/80 text-zinc-500'
                  }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-zinc-950">
                      {slot.label}
                    </span>

                    {isOccupied ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${slot.hasReady
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                      >
                        {slot.hasReady
                          ? 'Pronto a Servir'
                          : `${slot.orders.length} Ativo(s)`}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-zinc-400">
                        Livre
                      </span>
                    )}
                  </div>

                  {isOccupied && (
                    <div className="space-y-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50 p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {slot.orders.map((o) => (
                          <span
                            key={o.id}
                            className="px-2 py-0.5 rounded-lg border border-zinc-200 bg-white text-[11px] font-mono font-semibold text-zinc-900"
                          >
                            #{o.orderNumber}
                          </span>
                        ))}
                      </div>
                      {isOwner && (
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-zinc-500">
                            Conta ativa:
                          </span>
                          <span className="text-sm font-bold font-mono text-zinc-950">
                            {slot.totalBill.toFixed(2)} €
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isOwner && isOccupied && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleCloseAllTableOrders(slot.tableNumber)
                    }
                    className="w-full py-2.5 px-3 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] cursor-pointer"
                  >
                    Concluir / Fechar Mesa
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <ConsolidatedItems orders={filteredOrders} />

          {isLoading ? (
            <div className="bg-white border border-zinc-200/90 rounded-2xl py-20 text-center shadow-xs">
              <p className="text-sm font-semibold text-zinc-700">
                A sincronizar pedidos...
              </p>
            </div>
          ) : dashboardError ? (
            <div
              role="alert"
              className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 sm:p-8 text-center shadow-xs space-y-3"
            >
              <h3 className="text-sm font-bold text-rose-950">
                Não foi possível carregar os pedidos
              </h3>
              <p className="text-xs text-rose-800">{dashboardError}</p>
              <button
                type="button"
                onClick={fetchOrders}
                className="mt-2 cursor-pointer rounded-xl border border-zinc-900 bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs transition-all hover:bg-zinc-800"
              >
                Tentar Novamente
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200/90 bg-white p-10 sm:p-14 text-center shadow-xs space-y-3">
              <h3 className="text-base font-bold tracking-tight text-zinc-950">
                {sectionFilter === 'all'
                  ? 'Sem pedidos ativos na bancada'
                  : `Sem pedidos ativos para ${sectionFilter === 'bar' ? 'Bar / Copa' : 'Cozinha'
                  }`}
              </h3>
              <p className="mx-auto max-w-xs text-xs leading-relaxed text-zinc-500">
                Os novos pedidos submetidos pelos clientes surgirão aqui automaticamente em tempo real.
              </p>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="mt-3 cursor-pointer rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 px-6 py-2.5 text-xs font-semibold text-white shadow-2xs transition-all active:scale-[0.98]"
              >
                Sincronizar Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={newOrderIds.has(order.id)}
                  isUpdating={Boolean(updatingMap[order.id])}
                  isOwner={isOwner}
                  error={orderErrorMap[order.id]}
                  onClearError={() =>
                    setOrderErrorMap((previous) => ({
                      ...previous,
                      [order.id]: null,
                    }))
                  }
                  onUpdateStatus={handleUpdateStatus}
                  onPrintOrder={handlePrintOrder}
                  onChangeTable={isOwner ? handleChangeOrderTable : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Undo Toast for completed orders */}
      {isOwner && undoOrder && (
        <aside
          role="status"
          aria-label="Aviso de pedido concluído com opção de desfazer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3.5 text-white shadow-xl animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-zinc-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              Pedido <strong className="text-white">#{undoOrder.orderNumber}</strong> (
              {undoOrder.tableNumber === 0
                ? 'Take-Away'
                : `Mesa ${undoOrder.tableNumber}`}
              ) concluído.
            </span>
          </div>

          <div className="flex items-center gap-2 border-l border-zinc-700 pl-3">
            <button
              type="button"
              disabled={isUndoing}
              onClick={handleUndo}
              className="cursor-pointer rounded-xl bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-950 transition-all hover:bg-zinc-100 active:scale-[0.98] disabled:opacity-50"
            >
              {isUndoing ? 'A reverter...' : 'Desfazer'}
            </button>

            <button
              type="button"
              onClick={() => {
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                setUndoOrder(null);
              }}
              className="cursor-pointer rounded-xl bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
              aria-label="Fechar aviso"
            >
              Fechar
            </button>
          </div>
        </aside>
      )}

      {/* Centro de QR Codes (Mesas & Take-Away) */}
      <TableQrCodesModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        restaurantName={restaurantName}
        restaurantSlug={restaurantSlug}
      />

      {/* Talão Térmico 80mm para Impressora de Cozinha */}
      <ThermalReceipt
        order={printingOrder}
        restaurantName={restaurantName}
        isOwner={isOwner}
      />
    </div>
  );
}
