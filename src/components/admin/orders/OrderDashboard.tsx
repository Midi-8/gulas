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
  getActiveOrders,
  reopenCompletedOrder,
  updateOrderStatus,
} from '@/actions/order-management';
import { ValidNextStatus } from '@/lib/validations/order-management';
import { useOrdersRealtime } from '@/hooks/useOrdersRealtime';
import { useKdsAlerts } from '@/hooks/useKdsAlerts';
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock';
import { createClient } from '@/lib/supabase/client';
import { OrderCard } from './OrderCard';
import { ThermalReceipt } from './ThermalReceipt';
import ConsolidatedItems from '@/components/admin/kds/ConsolidatedItems';
import { clsx } from 'clsx';
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  Boxes,
  Check,
  Clock,
  Coffee,
  CookingPot,
  Flame,
  Inbox,
  LayoutGrid,
  Loader2,
  Map,
  Maximize,
  Minimize,
  Moon,
  Power,
  Printer,
  QrCode,
  Radio,
  RotateCcw,
  ShoppingBag,
  Sun,
  SunDim,
  Undo2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { QuickStockDrawer } from '@/components/admin/stock/QuickStockDrawer';
import { TableQrCodesModal } from '@/components/admin/qrcodes/TableQrCodesModal';
import {
  getRestaurantStockList,
  toggleRestaurantOpenStatus,
} from '@/actions/product-stock';

interface OrderDashboardProps {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  initialIsRestaurantOpen?: boolean;
  initialOrders: ManagedOrder[];
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
  icon: React.ReactNode;
}> = [
  {
    key: 'all',
    label: 'Todos',
    icon: <LayoutGrid className="w-3.5 h-3.5" />,
  },
  {
    key: 'bar',
    label: 'Bar / Copa',
    icon: <Coffee className="w-3.5 h-3.5" />,
  },
  {
    key: 'kitchen',
    label: 'Cozinha',
    icon: <CookingPot className="w-3.5 h-3.5" />,
  },
];

export function OrderDashboard({
  restaurantId,
  restaurantName,
  restaurantSlug,
  initialIsRestaurantOpen = true,
  initialOrders,
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
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [, setLastRefreshedAt] = useState<Date | null>(null);
  const [updatingMap, setUpdatingMap] = useState<Record<string, boolean>>({});
  const [orderErrorMap, setOrderErrorMap] = useState<
    Record<string, string | null>
  >({});
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const {
    isSupported: isWakeLockSupported,
    isActive: isWakeLockActive,
    status: wakeLockStatus,
    requestWakeLock,
    releaseWakeLock,
  } = useScreenWakeLock(true);
  const [a11yAnnouncement, setA11yAnnouncement] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    try {
      const savedDark = localStorage.getItem('gulas_kds_dark_mode');
      if (savedDark === 'true') {
        queueMicrotask(() => setIsDarkMode(true));
      }
      const savedAutoPrint = localStorage.getItem('gulas_kds_autoprint');
      if (savedAutoPrint === 'true') {
        queueMicrotask(() => setAutoPrintOnAccept(true));
      }
    } catch {
      // Ignorar
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('gulas_kds_dark_mode', String(next));
      } catch {
        // Ignorar
      }
      return next;
    });
  };

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

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // Ignorar
    }
  };

  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isStockDrawerOpen, setIsStockDrawerOpen] = useState(false);
  const [outOfStockCount, setOutOfStockCount] = useState(0);

  const refreshStockCount = useCallback(async () => {
    try {
      const res = await getRestaurantStockList();
      if (res.success) {
        const outCount = res.data.filter((p) => !p.isAvailable).length;
        setOutOfStockCount(outCount);
      }
    } catch {
      // Ignorar
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshStockCount();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshStockCount]);

  const {
    alertsState,
    activateAlerts,
    deactivateAlerts,
    triggerNewOrderAlert,
  } = useKdsAlerts();

  // Subscrição em tempo real para Chamadas de Mesa ("Pedir a Conta" / "Chamar Staff")
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantSlug, triggerNewOrderAlert]);

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

  const { isConnected } = useOrdersRealtime({
    restaurantId,
    onOrdersChange: fetchOrders,
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

  const handleManualRefresh = () => {
    startRefreshTransition(async () => {
      await fetchOrders();
    });
  };

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

        if (nextStatus === 'completed') {
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
    const tableOrders = orders.filter((o) => o.tableNumber === tableNum);
    for (const ord of tableOrders) {
      await handleUpdateStatus(ord.id, 'completed');
    }
  };

  const handleUndo = async () => {
    if (!undoOrder || isUndoing) return;

    setIsUndoing(true);
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
    if (sectionFilter === 'all') {
      return true;
    }

    const hasBarItem = order.items.some(
      (item) => item.categorySlug === 'bebidas'
    );
    const hasKitchenItem = order.items.some(
      (item) => item.categorySlug !== 'bebidas'
    );

    if (sectionFilter === 'bar') {
      return hasBarItem;
    }

    return hasKitchenItem;
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
      className={clsx(
        'space-y-6 pb-12 transition-colors duration-300 rounded-3xl min-h-screen',
        isDarkMode
          ? 'dark bg-zinc-950 text-zinc-100 p-4 sm:p-6 shadow-xl'
          : 'bg-transparent text-zinc-900'
      )}
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
        <div className="space-y-2">
          {tableCalls.map((call) => (
            <div
              key={call.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900 text-white border border-zinc-800 shadow-lg animate-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                  <BellRing className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-white text-zinc-900 text-xs font-bold">
                      Mesa {call.tableNumber}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {call.label}
                    </span>
                    {call.nif && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-zinc-800 text-amber-300 border border-zinc-700">
                        NIF: {call.nif}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Solicitado pelo cliente na mesa às{' '}
                    {new Date(call.createdAt).toLocaleTimeString('pt-PT', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setTableCalls((prev) => prev.filter((c) => c.id !== call.id))
                }
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Marcar Atendido</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Top Header & Operational Controls */}
      <div
        className={clsx(
          'flex flex-col justify-between gap-4 border-b pb-4 xl:flex-row xl:items-center',
          isDarkMode ? 'border-zinc-800' : 'border-zinc-200/80'
        )}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className={clsx(
                'text-xl font-bold tracking-tight sm:text-2xl',
                isDarkMode ? 'text-white' : 'text-zinc-900'
              )}
            >
              Monitor de Operação (KDS)
            </h1>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all ${
                isConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-600'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? 'animate-pulse bg-emerald-500' : 'bg-zinc-400'
                }`}
              />
              <span className="hidden sm:inline">
                {isConnected ? 'Tempo Real' : 'A Sincronizar...'}
              </span>
              <Radio className="h-3 w-3 sm:hidden" />
            </div>

            {/* Wake Lock */}
            {isWakeLockSupported &&
              (isWakeLockActive ? (
                <button
                  type="button"
                  onClick={() => void releaseWakeLock()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-700 transition-all hover:bg-zinc-50"
                  title="Ecrã mantido ligado"
                >
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Ecrã Ativo</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestWakeLock()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 transition-all hover:bg-zinc-200"
                >
                  <SunDim className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {wakeLockStatus === 'error' ? 'Tentar Ecrã' : 'Fixar Ecrã'}
                  </span>
                </button>
              ))}

            {/* Dark Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className={clsx(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all',
                isDarkMode
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
              )}
            >
              {isDarkMode ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-zinc-500" />
              )}
              <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>

            {/* Auto-Print 80mm Toggle (Bloco 3) */}
            <button
              type="button"
              onClick={toggleAutoPrint}
              className={clsx(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all',
                autoPrintOnAccept
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : isDarkMode
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100'
              )}
              title="Imprimir automaticamente o talão térmico (80mm) sempre que um pedido for aceite"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Auto-Print: {autoPrintOnAccept ? 'ON' : 'OFF'}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className={clsx(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all',
                isFullscreen
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : isDarkMode
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
              )}
            >
              {isFullscreen ? (
                <Minimize className="h-3.5 w-3.5" />
              ) : (
                <Maximize className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">
                {isFullscreen ? 'Sair Ecrã Inteiro' : 'Ecrã Inteiro'}
              </span>
            </button>
          </div>

          <p
            className={clsx(
              'mt-1 text-xs',
              isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            Cozinha, Copa e Sala em Tempo Real &middot; {restaurantName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
          {/* Receção Aberta / Encerrada */}
          <button
            type="button"
            disabled={isTogglingOpen}
            onClick={handleToggleRestaurantOpen}
            className={clsx(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all disabled:opacity-60',
              isRestaurantOpen
                ? isDarkMode
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100'
            )}
          >
            <Power className="h-3.5 w-3.5" />
            <span>
              {isRestaurantOpen ? 'Receção: Aberta' : 'Receção: Encerrada'}
            </span>
          </button>

          {/* Gestor de Menu, Preços & Stock */}
          <button
            type="button"
            onClick={() => setIsStockDrawerOpen(true)}
            className={clsx(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
              isDarkMode
                ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
            )}
          >
            <Boxes className="h-3.5 w-3.5 text-zinc-500" />
            <span>Menu, Preços & Stock</span>
            {outOfStockCount > 0 && (
              <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-700 border border-rose-200">
                {outOfStockCount} esgotados
              </span>
            )}
          </button>

          {/* QR Mesas */}
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className={clsx(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
              isDarkMode
                ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
            )}
          >
            <QrCode className="h-3.5 w-3.5 text-zinc-500" />
            <span>QR Mesas</span>
          </button>

          {alertsState === 'idle' ? (
            <button
              type="button"
              id="kds-alerts-activate-btn"
              onClick={activateAlerts}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-white transition-all"
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Ativar Som</span>
            </button>
          ) : (
            <button
              type="button"
              id="kds-alerts-deactivate-btn"
              onClick={deactivateAlerts}
              className={clsx(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all',
                isDarkMode
                  ? 'border-zinc-700 bg-zinc-800 text-zinc-200'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-800'
              )}
            >
              <BellOff className="h-3.5 w-3.5 text-emerald-600" />
              <span>Som Ativo</span>
            </button>
          )}

          <button
            type="button"
            disabled={isLoading || isRefreshing}
            onClick={handleManualRefresh}
            className={clsx(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50',
              isDarkMode
                ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
            )}
          >
            <RotateCcw
              className={`h-3.5 w-3.5 text-zinc-400 ${
                isLoading || isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Minimalistas */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div
          className={clsx(
            'flex items-center justify-between rounded-2xl border p-4 transition-all',
            isDarkMode
              ? 'bg-zinc-900 border-zinc-800 text-white'
              : 'bg-white border-zinc-200/80 text-zinc-900'
          )}
        >
          <div>
            <span
              className={clsx(
                'text-[11px] font-semibold uppercase tracking-wider',
                isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
              )}
            >
              Total Ativos
            </span>
            <p className="mt-0.5 text-2xl font-bold font-mono sm:text-3xl">
              {totalActiveCount}
            </p>
          </div>
          <div
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              isDarkMode
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-zinc-100 text-zinc-700'
            )}
          >
            <UtensilsCrossed className="h-4 w-4" />
          </div>
        </div>

        <div
          className={clsx(
            'flex items-center justify-between rounded-2xl border p-4 transition-all',
            isDarkMode
              ? 'bg-zinc-900 border-zinc-800 text-white'
              : 'bg-white border-zinc-200/80 text-zinc-900'
          )}
        >
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">
              A Aguardar
            </span>
            <p className="mt-0.5 text-2xl font-bold font-mono sm:text-3xl">
              {pendingCount}
            </p>
          </div>
          <div
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              isDarkMode
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-amber-50 text-amber-600'
            )}
          >
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div
          className={clsx(
            'flex items-center justify-between rounded-2xl border p-4 transition-all',
            isDarkMode
              ? 'bg-zinc-900 border-zinc-800 text-white'
              : 'bg-white border-zinc-200/80 text-zinc-900'
          )}
        >
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Em Preparação
            </span>
            <p className="mt-0.5 text-2xl font-bold font-mono sm:text-3xl">
              {preparingCount}
            </p>
          </div>
          <div
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              isDarkMode
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-zinc-100 text-zinc-700'
            )}
          >
            <Flame className="h-4 w-4" />
          </div>
        </div>

        <div
          className={clsx(
            'flex items-center justify-between rounded-2xl border p-4 transition-all',
            isDarkMode
              ? 'bg-zinc-900 border-zinc-800 text-white'
              : 'bg-white border-zinc-200/80 text-zinc-900'
          )}
        >
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
              Prontos (Pass)
            </span>
            <p className="mt-0.5 text-2xl font-bold font-mono sm:text-3xl">
              {readyCount}
            </p>
          </div>
          <div
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              isDarkMode
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-emerald-50 text-emerald-600'
            )}
          >
            <BellRing className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Barra de Modo de Vista (Comandas vs Mapa de Mesas) & Filtro de Secção */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setViewMode('orders')}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              viewMode === 'orders'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Comandas ({totalActiveCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('tables')}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
              viewMode === 'tables'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <Map className="w-3.5 h-3.5" />
            <span>Mapa de Sala (1–20)</span>
          </button>
        </div>

        {viewMode === 'orders' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {SECTION_FILTERS.map(({ key, label, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSectionFilter(key)}
                className={clsx(
                  'inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all',
                  sectionFilter === key
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900'
                    : isDarkMode
                    ? 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
                )}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vista 1: Mapa de Sala ao Vivo (Bloco 3) */}
      {viewMode === 'tables' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {tablesOverview.map((slot) => {
            const isOccupied = slot.orders.length > 0;
            return (
              <div
                key={slot.tableNumber}
                className={clsx(
                  'rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all',
                  isOccupied
                    ? slot.hasReady
                      ? isDarkMode
                        ? 'bg-zinc-900 border-emerald-500/50'
                        : 'bg-white border-emerald-400 shadow-xs'
                      : isDarkMode
                      ? 'bg-zinc-900 border-amber-500/40'
                      : 'bg-white border-zinc-900/30 shadow-xs'
                    : isDarkMode
                    ? 'bg-zinc-900/40 border-zinc-800/60 opacity-65'
                    : 'bg-white/60 border-zinc-200/70 opacity-75'
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold">
                      {slot.tableNumber === 0 ? (
                        <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <UtensilsCrossed className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                      {slot.label}
                    </span>

                    {isOccupied ? (
                      <span
                        className={clsx(
                          'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                          slot.hasReady
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        )}
                      >
                        {slot.hasReady ? 'Pronto a Servir' : `${slot.orders.length} Ativo(s)`}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-zinc-400">
                        Livre
                      </span>
                    )}
                  </div>

                  {isOccupied && (
                    <div className="space-y-1 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex flex-wrap gap-1">
                        {slot.orders.map((o) => (
                          <span
                            key={o.id}
                            className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono font-semibold"
                          >
                            #{o.orderNumber}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-[11px] text-zinc-500">
                          Conta ativa:
                        </span>
                        <span className="text-sm font-bold font-mono">
                          {slot.totalBill.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {isOccupied && (
                  <button
                    type="button"
                    onClick={() => void handleCloseAllTableOrders(slot.tableNumber)}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Concluir / Fechar Mesa</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <ConsolidatedItems orders={filteredOrders} isDarkMode={isDarkMode} />

          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-20 text-center">
              <Loader2 className="h-7 w-7 animate-spin text-zinc-900 dark:text-white" />
              <p className="text-sm font-semibold">A sincronizar pedidos...</p>
            </div>
          ) : dashboardError ? (
            <div
              role="alert"
              className="mx-auto max-w-lg space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center sm:p-8"
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-rose-950">
                Não foi possível carregar os pedidos
              </h3>
              <p className="text-xs text-rose-700">{dashboardError}</p>
              <button
                type="button"
                onClick={fetchOrders}
                className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-zinc-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Tentar Novamente</span>
              </button>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              className={clsx(
                'mx-auto max-w-lg space-y-3 rounded-2xl border p-10 text-center sm:p-14 transition-colors',
                isDarkMode
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-100'
                  : 'bg-white border-zinc-200/80 text-zinc-900'
              )}
            >
              <div
                className={clsx(
                  'mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border',
                  isDarkMode
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-400'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                )}
              >
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold tracking-tight">
                {sectionFilter === 'all'
                  ? 'Sem pedidos ativos na bancada'
                  : `Sem pedidos ativos para ${
                      sectionFilter === 'bar' ? 'Bar / Copa' : 'Cozinha'
                    }`}
              </h3>
              <p
                className={clsx(
                  'mx-auto max-w-xs text-xs leading-relaxed',
                  isDarkMode ? 'text-zinc-400' : 'text-zinc-500'
                )}
              >
                Os novos pedidos submetidos pelos clientes surgirão aqui automaticamente em tempo real.
              </p>
              <button
                type="button"
                onClick={handleManualRefresh}
                className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 px-4 py-2 text-xs font-semibold text-white transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Sincronizar Agora</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1800px]:grid-cols-5">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isNew={newOrderIds.has(order.id)}
                  isDarkMode={isDarkMode}
                  isUpdating={Boolean(updatingMap[order.id])}
                  error={orderErrorMap[order.id]}
                  onClearError={() =>
                    setOrderErrorMap((previous) => ({
                      ...previous,
                      [order.id]: null,
                    }))
                  }
                  onUpdateStatus={handleUpdateStatus}
                  onPrintOrder={handlePrintOrder}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Undo Toast for completed orders */}
      {undoOrder && (
        <aside
          role="status"
          aria-label="Aviso de pedido concluído com opção de desfazer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-white shadow-xl border border-zinc-800 animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-medium text-zinc-200">
              Pedido <strong className="text-white">#{undoOrder.orderNumber}</strong> (
              {undoOrder.tableNumber === 0
                ? 'Take-Away'
                : `Mesa ${undoOrder.tableNumber}`}
              ) concluído.
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-zinc-700 pl-2">
            <button
              type="button"
              disabled={isUndoing}
              onClick={handleUndo}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
            >
              {isUndoing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Undo2 className="h-3.5 w-3.5" />
              )}
              <span>Desfazer</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
                setUndoOrder(null);
              }}
              className="cursor-pointer rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              aria-label="Fechar aviso"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </aside>
      )}

      {/* Quick Stock & Menu Management Drawer */}
      <QuickStockDrawer
        isOpen={isStockDrawerOpen}
        onClose={() => setIsStockDrawerOpen(false)}
        restaurantId={restaurantId}
        onStockChanged={() => {
          void refreshStockCount();
        }}
      />

      {/* Centro de QR Codes (Mesas & Take-Away) */}
      <TableQrCodesModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        restaurantName={restaurantName}
        restaurantSlug={restaurantSlug}
      />

      {/* Talão Térmico 80mm para Impressora de Cozinha */}
      <ThermalReceipt order={printingOrder} restaurantName={restaurantName} />
    </div>
  );
}
