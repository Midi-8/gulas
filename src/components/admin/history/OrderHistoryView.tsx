'use client';


import React, { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import { ManagedOrder, getOrderHistory, reopenCompletedOrder } from '@/actions/order-management';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { OrderHistoryDetailModal } from './OrderHistoryDetailModal';
import {
  RotateCcw,
  History,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Inbox,
  Calendar,
  Search,
  X,
  Filter,
  Undo2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';


interface OrderHistoryViewProps {
  restaurantName: string;
  restaurantSlug: string;
  initialOrders: ManagedOrder[];
}


type PeriodOption = 'all' | 'today' | '7days' | '30days';
type StatusOption = 'all' | 'completed' | 'cancelled';


export function OrderHistoryView({
  restaurantName,
  restaurantSlug,
  initialOrders,
}: OrderHistoryViewProps) {
  const [orders, setOrders] = useState<ManagedOrder[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ManagedOrder | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Reopen state: map of orderId -> { confirming, loading, error }
  type ReopenState = { confirming: boolean; loading: boolean; error: string | null };
  const [reopenMap, setReopenMap] = useState<Record<string, ReopenState>>({});


  // Filter States (M4.5.2)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusOption>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodOption>('all');


  const [isRefreshing, startRefreshTransition] = useTransition();


  // Set the timestamp only after client mount (avoids SSR hydration mismatch)
  useEffect(() => {
    const mountTimer = setTimeout(() => {
      setLastRefreshedAt(new Date());
    }, 0);

    return () => {
      clearTimeout(mountTimer);
    };
  }, []);


  const fetchHistory = useCallback(async () => {
    setError(null);
    try {
      const result = await getOrderHistory();
      if (!result.success) {
        setError(result.error.message);
      } else {
        setOrders(result.data);
        setLastRefreshedAt(new Date());
      }
    } catch {
      setError('Não foi possível carregar o histórico de pedidos.');
    } finally {
      setIsLoading(false);
    }
  }, []);


  const handleManualRefresh = () => {
    startRefreshTransition(async () => {
      await fetchHistory();
    });
  };

  // Handlers for reopen (undo completion)
  const handleReopenConfirm = (orderId: string) => {
    setReopenMap((prev) => ({
      ...prev,
      [orderId]: { confirming: true, loading: false, error: null },
    }));
  };

  const handleReopenCancel = (orderId: string) => {
    setReopenMap((prev) => ({
      ...prev,
      [orderId]: { confirming: false, loading: false, error: null },
    }));
  };

  const handleReopenExecute = async (order: ManagedOrder) => {
    setReopenMap((prev) => ({
      ...prev,
      [order.id]: { confirming: false, loading: true, error: null },
    }));
    try {
      const result = await reopenCompletedOrder({
        orderId: order.id,
        expectedUpdatedAt: order.updatedAt,
      });
      if (!result.success) {
        if (result.error.code === 'OPTIMISTIC_CONFLICT') {
          // Refresh history to get latest state
          await fetchHistory();
        }
        setReopenMap((prev) => ({
          ...prev,
          [order.id]: { confirming: false, loading: false, error: result.error.message },
        }));
      } else {
        // Remove from history view (it's now active in KDS)
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        setReopenMap((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
        // Close modal if it was showing this order
        setSelectedOrder((prev) => (prev?.id === order.id ? null : prev));
      }
    } catch {
      setReopenMap((prev) => ({
        ...prev,
        [order.id]: { confirming: false, loading: false, error: 'Erro ao reabrir pedido.' },
      }));
    }
  };


  // Dynamic tables list from loaded orders
  const availableTables = useMemo(() => {
    const tableSet = new Set<number>();
    orders.forEach((o) => tableSet.add(o.tableNumber));
    return Array.from(tableSet).sort((a, b) => a - b);
  }, [orders]);


  // Combined client-side filtering
  const filteredOrders = useMemo(() => {
    const referenceTime = (lastRefreshedAt ?? new Date()).getTime();
    const startOfToday = new Date(referenceTime);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();
    const sevenDaysAgoMs = referenceTime - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgoMs = referenceTime - 30 * 24 * 60 * 60 * 1000;
    const cleanQuery = searchQuery.replace('#', '').trim().toLowerCase();


    return orders.filter((order) => {
      // 1. Search Query (order number, space/hash tolerant)
      if (cleanQuery) {
        const orderNumStr = String(order.orderNumber);
        if (!orderNumStr.includes(cleanQuery)) {
          return false;
        }
      }


      // 2. Status Filter
      if (statusFilter !== 'all') {
        if (order.status !== statusFilter) {
          return false;
        }
      }


      // 3. Table Filter
      if (tableFilter !== 'all') {
        if (order.tableNumber !== Number(tableFilter)) {
          return false;
        }
      }


      // 4. Period Filter
      if (periodFilter !== 'all') {
        const orderTimestamp = new Date(order.createdAt).getTime();


        if (periodFilter === 'today' && orderTimestamp < startOfTodayMs) {
          return false;
        }
        if (periodFilter === '7days' && orderTimestamp < sevenDaysAgoMs) {
          return false;
        }
        if (periodFilter === '30days' && orderTimestamp < thirtyDaysAgoMs) {
          return false;
        }
      }


      return true;
    });
  }, [
    orders,
    searchQuery,
    statusFilter,
    tableFilter,
    periodFilter,
    lastRefreshedAt,
  ]);


  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    tableFilter !== 'all' ||
    periodFilter !== 'all';


  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTableFilter('all');
    setPeriodFilter('all');
  };


  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };


  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);


  // Global Loaded Metrics
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
  const totalHistoryCount = orders.length;


  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gulas-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-gulas-dark tracking-tight">
              Histórico de Pedidos
            </h1>
            <span className="hidden sm:inline-flex text-xs font-mono bg-gulas-gray-100 text-gulas-gray-600 px-2 py-0.5 rounded-md">
              /{restaurantSlug}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gulas-gray-500 mt-0.5">
            Registo de pedidos concluídos e cancelados &bull; {restaurantName}
          </p>
        </div>


        {/* Refresh button & info */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {lastRefreshedAt && (
            <span className="text-xs text-gulas-gray-400 hidden sm:inline-block">
              Última atualização:{' '}
              {lastRefreshedAt.toLocaleTimeString('pt-PT', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}


          <button
            type="button"
            disabled={isLoading || isRefreshing}
            onClick={handleManualRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gulas-gray-200 hover:bg-gulas-gray-100 text-gulas-dark text-xs sm:text-sm font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            aria-label="Atualizar histórico"
          >
            <RotateCcw
              className={`w-4 h-4 text-gulas-gray-600 ${isLoading || isRefreshing ? 'animate-spin' : ''
                }`}
            />
            <span>Atualizar</span>
          </button>
        </div>
      </div>


      {/* KPI Summary Cards (Representing the full loaded dataset) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Finalizados */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gulas-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gulas-gray-400">
              Total no Histórico
            </span>
            <p className="text-2xl sm:text-3xl font-black text-gulas-dark mt-0.5">
              {totalHistoryCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
            <History className="w-5 h-5" />
          </div>
        </div>


        {/* Concluídos */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gulas-gray-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gulas-gray-500">
              Concluídos com Sucesso
            </span>
            <p className="text-2xl sm:text-3xl font-black text-[#35271F] mt-0.5">
              {completedCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#EAE5DF] flex items-center justify-center text-[#5E4939]">
            <CheckCircle2 className="w-5 h-5 text-[#C09573]" />
          </div>
        </div>


        {/* Cancelados */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Cancelados
            </span>
            <p className="text-2xl sm:text-3xl font-black text-rose-900 mt-0.5">
              {cancelledCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>


      {/* Filter and Search Bar (M4.5.2) */}
      <div className="bg-white p-4 rounded-2xl border border-gulas-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* 1. Search by Order Number */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gulas-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar pedido (ex: 8)..."
              className="w-full pl-9 pr-9 py-2 bg-gulas-gray-100/80 border border-gulas-gray-200 rounded-xl text-xs sm:text-sm text-gulas-dark placeholder-gulas-gray-400 focus:outline-none focus:border-[#C09573] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gulas-gray-400 hover:text-gulas-dark transition-colors cursor-pointer"
                aria-label="Limpar pesquisa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>


          {/* 2. Select Status */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusOption)}
              className="px-3 py-2 bg-gulas-gray-100/80 border border-gulas-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gulas-dark focus:outline-none focus:border-[#C09573] focus:bg-white transition-all cursor-pointer flex-1 sm:flex-none"
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos os Estados</option>
              <option value="completed">Concluídos</option>
              <option value="cancelled">Cancelados</option>
            </select>


            {/* 3. Select Table (Dynamic) */}
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="px-3 py-2 bg-gulas-gray-100/80 border border-gulas-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gulas-dark focus:outline-none focus:border-[#C09573] focus:bg-white transition-all cursor-pointer flex-1 sm:flex-none"
              aria-label="Filtrar por mesa"
            >
              <option value="all">Todas as Mesas</option>
              {availableTables.map((num) => (
                <option key={num} value={String(num)}>
                  Mesa {num}
                </option>
              ))}
            </select>


            {/* 4. Select Period */}
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as PeriodOption)}
              className="px-3 py-2 bg-gulas-gray-100/80 border border-gulas-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gulas-dark focus:outline-none focus:border-[#C09573] focus:bg-white transition-all cursor-pointer flex-1 sm:flex-none"
              aria-label="Filtrar por período"
            >
              <option value="all">Todos os Períodos</option>
              <option value="today">Hoje</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
            </select>


            {/* Reset Button (Only visible if active filters) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-gulas-dark text-xs sm:text-sm font-bold transition-all cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar filtros</span>
              </button>
            )}
          </div>
        </div>


        {/* Filter Results Summary */}
        <div className="flex items-center justify-between text-xs text-gulas-gray-500 pt-1">
          <span className="flex items-center gap-1 font-medium">
            <Filter className="w-3 h-3 text-gulas-gray-400" />
            A mostrar <strong className="text-gulas-dark font-bold">{filteredOrders.length}</strong> de{' '}
            <strong className="text-gulas-dark font-bold">{orders.length}</strong> pedidos
          </span>
          {hasActiveFilters && (
            <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
              Filtros ativos
            </span>
          )}
        </div>
      </div>


      {/* Main Content Area */}
      {error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-rose-950">
            Não foi possível carregar o histórico
          </h3>
          <p className="text-xs text-rose-700">{error}</p>
          <button
            type="button"
            onClick={fetchHistory}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-gulas-gray-200 rounded-2xl p-10 sm:p-14 text-center max-w-lg mx-auto shadow-xs space-y-3">
          <div className="w-16 h-16 bg-gulas-cream text-gulas-gray-400 rounded-2xl flex items-center justify-center mx-auto border border-gulas-gray-200">
            <Inbox className="w-8 h-8 text-gulas-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-gulas-dark">
            Não existem pedidos no histórico
          </h3>
          <p className="text-xs sm:text-sm text-gulas-gray-500 max-w-xs mx-auto leading-relaxed">
            Os pedidos concluídos ou cancelados aparecerão arquivados nesta lista.
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Atualizar Lista</span>
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty State for Filters */
        <div className="bg-white border border-gulas-gray-200 rounded-2xl p-10 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-3">
          <div className="w-14 h-14 bg-[#EAE5DF] text-[#5E4939] rounded-2xl flex items-center justify-center mx-auto border border-[#E5DED6]">
            <Search className="w-6 h-6 text-[#C09573]" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gulas-dark">
            Nenhum pedido corresponde aos filtros
          </h3>
          <p className="text-xs sm:text-sm text-gulas-gray-500 max-w-xs mx-auto leading-relaxed">
            Tenta ajustar o termo de pesquisa, o estado, a mesa ou o período selecionado.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar Todos os Filtros</span>
          </button>
        </div>
      ) : (
        /* Orders List & Table */
        <div className="bg-white rounded-2xl border border-gulas-gray-200 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50/80 border-b border-gulas-gray-200 text-xs font-bold text-gulas-gray-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Pedido
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Mesa
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Data / Hora
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Artigos
                  </th>
                  <th scope="col" className="px-5 py-3.5">
                    Estado
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-right">
                    Total
                  </th>
                  <th scope="col" className="px-5 py-3.5 text-center">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gulas-gray-100">
                {filteredOrders.map((order) => {
                  const totalItemsCount = order.items.reduce(
                    (acc, item) => acc + item.quantity,
                    0
                  );
                   return (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-50/60 transition-colors"
                    >
                      <td className="px-5 py-4 font-black text-gulas-dark">
                        #{order.orderNumber}
                      </td>
                      <td className="px-5 py-4 font-bold text-gulas-dark">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-xs font-bold">
                          Mesa {order.tableNumber}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gulas-gray-500 font-medium">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-xs text-gulas-dark font-medium">
                        <span className="font-bold">{totalItemsCount}x</span>{' '}
                        artigo{totalItemsCount > 1 ? 's' : ''}
                      </td>
                      <td className="px-5 py-4">
                        <OrderStatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="px-5 py-4 font-black text-gulas-dark text-right">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-gulas-dark text-xs font-bold transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>

                          {order.status === 'completed' && (() => {
                            const rs = reopenMap[order.id];
                            if (rs?.confirming) {
                              return (
                                <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                  <span className="text-amber-900 font-medium">Reabrir #{order.orderNumber}?</span>
                                  <button
                                    type="button"
                                    onClick={() => handleReopenExecute(order)}
                                    className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all cursor-pointer"
                                    aria-label={`Confirmar reabertura do pedido ${order.orderNumber}`}
                                  >
                                    Sim
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleReopenCancel(order.id)}
                                    className="px-2 py-1 rounded bg-white border border-amber-200 text-amber-800 font-bold transition-all cursor-pointer"
                                  >
                                    Não
                                  </button>
                                </div>
                              );
                            }
                            if (rs?.loading) {
                              return <Loader2 className="w-4 h-4 animate-spin text-amber-600" />;
                            }
                            return (
                              <div className="flex flex-col gap-0.5 items-start">
                                <button
                                  type="button"
                                  onClick={() => handleReopenConfirm(order.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer"
                                  aria-label={`Desfazer conclusão do pedido ${order.orderNumber}`}
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  <span>Desfazer</span>
                                </button>
                                {rs?.error && (
                                  <span className="text-xs text-rose-700 font-medium">{rs.error}</span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>


          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-gulas-gray-100">
            {filteredOrders.map((order) => {
              const totalItemsCount = order.items.reduce(
                (acc, item) => acc + item.quantity,
                0
              );
              return (
                <div key={order.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-gulas-dark">
                          #{order.orderNumber}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-xs font-bold">
                          Mesa {order.tableNumber}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gulas-gray-500 font-medium mt-1">
                        <Calendar className="w-3.5 h-3.5 text-gulas-gray-400" />
                        <span>{formatDateTime(order.createdAt)}</span>
                      </div>
                    </div>
                    <OrderStatusBadge status={order.status} size="sm" />
                  </div>


                  <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                    <span className="text-xs text-gulas-gray-500">
                      {totalItemsCount} artigo{totalItemsCount > 1 ? 's' : ''} &bull;{' '}
                      <strong className="text-sm font-black text-gulas-dark">
                        {formatPrice(order.total)}
                      </strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] text-xs font-bold transition-all cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#C09573]" />
                        <span>Detalhes</span>
                      </button>

                      {order.status === 'completed' && (() => {
                        const rs = reopenMap[order.id];
                        if (rs?.confirming) {
                          return (
                            <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                              <span className="text-amber-900 font-bold">Confirmar?</span>
                              <button
                                type="button"
                                onClick={() => handleReopenExecute(order)}
                                className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                                aria-label={`Confirmar reabertura pedido ${order.orderNumber}`}
                              >
                                Sim
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReopenCancel(order.id)}
                                className="px-2 py-1 rounded border border-amber-200 text-amber-800 font-bold cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          );
                        }
                        if (rs?.loading) {
                          return <Loader2 className="w-4 h-4 animate-spin text-amber-600" />;
                        }
                        return (
                          <button
                            type="button"
                            onClick={() => handleReopenConfirm(order.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-all cursor-pointer"
                            aria-label={`Desfazer conclusão do pedido ${order.orderNumber}`}
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            <span>Desfazer</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                  {reopenMap[order.id]?.error && (
                    <p className="text-xs text-rose-700 font-medium">{reopenMap[order.id].error}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Detail Modal */}
      <OrderHistoryDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}