'use client';

import React, {
  useCallback,
  useEffect,
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
import { OrderCard } from './OrderCard';
import ConsolidatedItems from '@/components/admin/kds/ConsolidatedItems';
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  Boxes,
  Clock,
  Coffee,
  CookingPot,
  Flame,
  Inbox,
  LayoutGrid,
  Loader2,
  Radio,
  RotateCcw,
  Sun,
  SunDim,
  Undo2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { QuickStockDrawer } from '@/components/admin/stock/QuickStockDrawer';
import { getRestaurantStockList } from '@/actions/product-stock';

interface OrderDashboardProps {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  initialOrders: ManagedOrder[];
}

type SectionFilter = 'all' | 'bar' | 'kitchen';

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
  initialOrders,
}: OrderDashboardProps) {
  const [orders, setOrders] = useState<ManagedOrder[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
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

  const previousOrderIdsRef = useRef<Set<string>>(
    new Set(initialOrders.map((order) => order.id))
  );
  const isInitialLoadRef = useRef(true);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

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
      // Ignorar erros de rede silenciosamente
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

  return (
    <div className="space-y-6 pb-12">
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {a11yAnnouncement}
      </div>

      <div className="flex flex-col justify-between gap-4 border-b border-gulas-gray-200 pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-gulas-dark sm:text-3xl">
              Gestão de Pedidos
            </h1>

            <span className="hidden rounded-md bg-gulas-gray-100 px-2 py-0.5 font-mono text-xs text-gulas-gray-600 sm:inline-flex">
              /{restaurantSlug}
            </span>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-all ${isConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-zinc-200 bg-zinc-100 text-zinc-600'
                }`}
              title={
                isConnected
                  ? 'Sincronização em tempo real ativa'
                  : 'A ligar ao canal em tempo real...'
              }
            >
              <span
                className={`h-2 w-2 rounded-full ${isConnected ? 'animate-pulse bg-emerald-500' : 'bg-zinc-400'
                  }`}
              />

              <span className="hidden sm:inline">
                {isConnected ? 'Tempo Real Ativo' : 'A Conectar...'}
              </span>

              <Radio className="h-3 w-3 sm:hidden" />
            </div>

            {/* Wake Lock Screen Indicator & Control for Kitchen Tablet */}
            {isWakeLockSupported ? (
              isWakeLockActive ? (
                <button
                  type="button"
                  onClick={() => void releaseWakeLock()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900 transition-all hover:bg-amber-100"
                  title="Ecrã do tablet mantido sempre ligado na cozinha. Clique para libertar."
                  aria-label="Ecrã do tablet mantido sempre ligado. Clique para permitir suspensão"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <Sun className="h-3.5 w-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Ecrã Ligado</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestWakeLock()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-200"
                  title="O ecrã pode suspender por inatividade. Clique para manter ligado."
                  aria-label="Manter ecrã do tablet sempre ligado"
                >
                  <span className="h-2 w-2 rounded-full bg-zinc-400" />
                  <SunDim className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="hidden sm:inline">
                    {wakeLockStatus === 'error' ? 'Tentar Ecrã Ligado' : 'Manter Ecrã Ligado'}
                  </span>
                </button>
              )
            ) : (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-400"
                title="Screen Wake Lock não suportado neste browser. Configure a suspensão nas definições do tablet."
              >
                <SunDim className="h-3.5 w-3.5 text-zinc-400" />
                <span>Wake Lock N/D</span>
              </span>
            )}
          </div>

          <p className="mt-0.5 text-xs text-gulas-gray-500 sm:text-sm">
            Monitor de Cozinha e Sala (KDS) &bull; {restaurantName}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Quick Stock Management Trigger Button */}
          <button
            type="button"
            onClick={() => setIsStockDrawerOpen(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E5DED6] bg-[#FFFFFF] px-3.5 py-2 text-xs font-bold text-[#35271F] shadow-xs transition-all hover:bg-[#EAE5DF] hover:border-[#C09573]/50 sm:text-sm"
            aria-label="Gerir stock e artigos esgotados"
          >
            <Boxes className="h-4 w-4 text-[#C09573]" />
            <span>Gerir Stock / Esgotados</span>
            {outOfStockCount > 0 && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-900 border border-amber-300">
                {outOfStockCount} esgotados
              </span>
            )}
          </button>

          {lastRefreshedAt && (
            <span className="hidden text-xs text-gulas-gray-400 sm:inline-block">
              Última atualização:{' '}
              {lastRefreshedAt.toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}

          {alertsState === 'idle' ? (
            <button
              type="button"
              id="kds-alerts-activate-btn"
              onClick={activateAlerts}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#5E4939] px-4 py-2.5 text-xs font-bold text-[#F5F4F1] shadow-xs transition-all hover:bg-[#453426] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E4939] sm:text-sm"
              aria-label="Ativar alertas sonoros e de vibração para pedidos novos"
            >
              <Bell className="h-4 w-4" />
              <span>Ativar alertas</span>
            </button>
          ) : (
            <button
              type="button"
              id="kds-alerts-deactivate-btn"
              onClick={deactivateAlerts}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#EAE5DF] border border-[#C09573] px-4 py-2.5 text-xs font-bold text-[#5E4939] shadow-xs transition-all hover:bg-[#E5DED6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C09573] sm:text-sm"
              aria-label="Alertas ativos. Clique para desativar"
              aria-pressed
            >
              <BellOff className="h-4 w-4 text-[#C09573]" />
              <span>Alertas ativos</span>
            </button>
          )}

          <button
            type="button"
            disabled={isLoading || isRefreshing}
            onClick={handleManualRefresh}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E5DED6] bg-[#FFFFFF] px-4 py-2.5 text-xs font-bold text-[#35271F] shadow-xs transition-all hover:bg-[#EAE5DF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E4939] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            aria-label="Atualizar lista de pedidos"
          >
            <RotateCcw
              className={`h-4 w-4 text-[#78716C] ${
                isLoading || isRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-2xl border border-[#E5DED6] bg-[#FFFFFF] p-4 shadow-xs sm:p-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Total Ativos
            </span>
            <p className="mt-0.5 text-2xl font-black text-[#35271F] sm:text-3xl">
              {totalActiveCount}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAE5DF] text-[#5E4939]">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#E5DED6] bg-[#FFFFFF] p-4 shadow-xs sm:p-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              A Aguardar
            </span>
            <p className="mt-0.5 text-2xl font-black text-[#35271F] sm:text-3xl">
              {pendingCount}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAE5DF] text-[#C09573]">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#E5DED6] bg-[#FFFFFF] p-4 shadow-xs sm:p-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Em Preparação
            </span>
            <p className="mt-0.5 text-2xl font-black text-[#35271F] sm:text-3xl">
              {preparingCount}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAE5DF] text-[#5E4939]">
            <Flame className="h-5 w-5 text-[#C09573]" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-[#E5DED6] bg-[#FFFFFF] p-4 shadow-xs sm:p-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#78716C]">
              Prontos p/ Entrega
            </span>
            <p className="mt-0.5 text-2xl font-black text-[#5E4939] sm:text-3xl">
              {readyCount}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAE5DF] text-[#5E4939]">
            <BellRing className="h-5 w-5 text-[#C09573]" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-bold uppercase tracking-wider text-[#78716C]">
          Secção:
        </span>

        {SECTION_FILTERS.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setSectionFilter(key)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E4939] sm:text-sm ${
              sectionFilter === key
                ? 'border-[#5E4939] bg-[#5E4939] text-[#F5F4F1] shadow-xs'
                : 'border-[#E5DED6] bg-[#FFFFFF] text-[#35271F] hover:bg-[#EAE5DF]'
            }`}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>

      <ConsolidatedItems orders={filteredOrders} />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center space-y-3 py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gulas-green" />
          <p className="text-sm font-bold text-gulas-dark">
            Carregando pedidos...
          </p>
          <p className="text-xs text-gulas-gray-500">
            A sincronizar dados da cozinha e sala
          </p>
        </div>
      ) : dashboardError ? (
        <div
          role="alert"
          className="mx-auto max-w-lg space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center sm:p-8"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-rose-950">
            Não foi possível carregar os pedidos
          </h3>
          <p className="text-xs text-rose-700">{dashboardError}</p>
          <button
            type="button"
            onClick={fetchOrders}
            className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="mx-auto max-w-lg space-y-3 rounded-2xl border border-gulas-gray-200 bg-white p-10 text-center shadow-xs sm:p-14">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gulas-gray-200 bg-gulas-cream text-gulas-gray-400">
            <Inbox className="h-8 w-8 text-gulas-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gulas-dark">
            {sectionFilter === 'all'
              ? 'Não existem pedidos ativos.'
              : `Não existem pedidos para ${sectionFilter === 'bar' ? 'Bar / Copa' : 'Cozinha'
              }.`}
          </h3>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-gulas-gray-500 sm:text-sm">
            Assim que os clientes submeterem pedidos a partir do menu digital das
            mesas, eles surgirão aqui automaticamente em tempo real.
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Verificar Novos Pedidos</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isNew={newOrderIds.has(order.id)}
              isUpdating={Boolean(updatingMap[order.id])}
              error={orderErrorMap[order.id]}
              onClearError={() =>
                setOrderErrorMap((previous) => ({
                  ...previous,
                  [order.id]: null,
                }))
              }
              onUpdateStatus={handleUpdateStatus}
            />
          ))}
        </div>
      )}

      {/* Undo Toast for completed orders */}
      {undoOrder && (
        <aside
          role="status"
          aria-label="Aviso de pedido concluído com opção de desfazer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-[#35271F] px-4 py-3 text-[#F5F4F1] shadow-xl border border-[#E5DED6]/30 animate-in slide-in-from-bottom-5 fade-in duration-200"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-[#C09573]" />
            <span className="font-semibold text-[#EAE5DF]">
              Pedido <strong className="text-white">#{undoOrder.orderNumber}</strong> (Mesa {undoOrder.tableNumber}) concluído.
            </span>
          </div>

          <div className="flex items-center gap-1.5 border-l border-[#E5DED6]/30 pl-2">
            <button
              type="button"
              disabled={isUndoing}
              onClick={handleUndo}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#FFFFFF] px-3 py-1.5 text-xs font-bold text-[#35271F] transition-all hover:bg-[#EAE5DF] active:scale-95 disabled:opacity-50 shadow-2xs"
            >
              {isUndoing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#35271F]" />
              ) : (
                <Undo2 className="h-3.5 w-3.5 text-[#5E4939]" />
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

      {/* Quick Stock Management Drawer */}
      <QuickStockDrawer
        isOpen={isStockDrawerOpen}
        onClose={() => setIsStockDrawerOpen(false)}
        restaurantId={restaurantId}
        onStockChanged={() => {
          refreshStockCount();
        }}
      />
    </div>
  );
}