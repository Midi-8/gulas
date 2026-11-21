'use client';

import React, { useState, useMemo, useCallback, useTransition, useEffect } from 'react';
import { ManagedOrder, getOrderHistory, reopenCompletedOrder } from '@/actions/order-management';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { ThermalReceipt } from '../orders/ThermalReceipt';
import { OrderHistoryDetailModal } from './OrderHistoryDetailModal';

interface OrderHistoryViewProps {
  restaurantName: string;
  restaurantSlug: string;
  initialOrders: ManagedOrder[];
}

type PeriodOption = 'all' | 'today' | '7days' | '30days';
type StatusOption = 'all' | 'completed' | 'cancelled';

const FILTER_BUTTON_CLASS =
  'h-10 px-4 cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white active:scale-[0.98] shrink-0';

const STATUS_FILTER_LABELS: Record<StatusOption, string> = {
  all: 'Todos os Estados',
  completed: 'Concluídos',
  cancelled: 'Cancelados',
};

const PERIOD_FILTER_LABELS: Record<PeriodOption, string> = {
  all: 'Todos os Períodos',
  today: 'Hoje',
  '7days': 'Últimos 7 dias',
  '30days': 'Últimos 30 dias',
};

function getOrderDurationMinutes(createdAt: string, updatedAt: string): number {
  const start = new Date(createdAt).getTime();
  const end = new Date(updatedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 60000));
}

function getDurationBadgeClass(minutes: number): string {
  if (minutes < 10) {
    return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
  if (minutes <= 20) {
    return 'bg-amber-50 text-amber-800 border-amber-200';
  }
  return 'bg-rose-50 text-rose-800 border-rose-300';
}

function formatItemsSummary(items: ManagedOrder['items']): string {
  if (!items || items.length === 0) return 'Sem artigos';
  return items.map((i) => `${i.quantity}x ${i.productName}`).join(', ');
}

export function OrderHistoryView({
  restaurantName,
  restaurantSlug,
  initialOrders,
}: OrderHistoryViewProps) {
  const [orders, setOrders] = useState<ManagedOrder[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ManagedOrder | null>(null);
  const [printingOrder, setPrintingOrder] = useState<ManagedOrder | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  type ReopenState = { confirming: boolean; loading: boolean; error: string | null };
  const [reopenMap, setReopenMap] = useState<Record<string, ReopenState>>({});

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusOption>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodOption>('all');

  const [, startRefreshTransition] = useTransition();

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
      const result = await getOrderHistory({ limit: 250 });
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

  const handleManualRefresh = useCallback(() => {
    startRefreshTransition(async () => {
      await fetchHistory();
    });
  }, [fetchHistory]);

  useEffect(() => {
    const onGlobalRefresh = () => {
      handleManualRefresh();
    };
    const onAfterPrint = () => {
      setPrintingOrder(null);
    };
    window.addEventListener('gulas:admin-refresh', onGlobalRefresh);
    window.addEventListener('afterprint', onAfterPrint);
    return () => {
      window.removeEventListener('gulas:admin-refresh', onGlobalRefresh);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [handleManualRefresh]);

  const handleQuickPrintOrder = useCallback((orderToPrint: ManagedOrder) => {
    setPrintingOrder(orderToPrint);
    setTimeout(() => {
      window.print();
    }, 80);
  }, []);

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
          await fetchHistory();
        }
        setReopenMap((prev) => ({
          ...prev,
          [order.id]: { confirming: false, loading: false, error: result.error.message },
        }));
      } else {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        setReopenMap((prev) => {
          const next = { ...prev };
          delete next[order.id];
          return next;
        });
        setSelectedOrder((prev) => (prev?.id === order.id ? null : prev));
      }
    } catch {
      setReopenMap((prev) => ({
        ...prev,
        [order.id]: { confirming: false, loading: false, error: 'Erro ao reabrir pedido.' },
      }));
    }
  };

  const filteredOrders = useMemo(() => {
    const referenceTime = (lastRefreshedAt ?? new Date()).getTime();
    const startOfToday = new Date(referenceTime);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();
    const sevenDaysAgoMs = referenceTime - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgoMs = referenceTime - 30 * 24 * 60 * 60 * 1000;
    const cleanQuery = searchQuery.replace('#', '').trim().toLowerCase();

    return orders.filter((order) => {
      if (cleanQuery) {
        const orderNumStr = String(order.orderNumber);
        const matchesOrderNum = orderNumStr.includes(cleanQuery);
        const matchesNotes = Boolean(
          order.customerNotes?.toLowerCase().includes(cleanQuery)
        );
        const matchesItem = order.items.some(
          (i) =>
            i.productName.toLowerCase().includes(cleanQuery) ||
            Boolean(i.notes?.toLowerCase().includes(cleanQuery))
        );

        if (!matchesOrderNum && !matchesNotes && !matchesItem) {
          return false;
        }
      }

      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

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
    periodFilter,
    lastRefreshedAt,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    statusFilter !== 'all' ||
    periodFilter !== 'all';

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
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

  const handleExportCsv = () => {
    const escapeCsvField = (val: string | number | null | undefined) => {
      const str = String(val ?? '').replace(/\r?\n|\r/g, ' ');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'Pedido',
      'Mesa / Servico',
      'Data / Hora',
      'Estado',
      'Qtd Artigos',
      'Artigos',
      'Notas / Observacoes',
      'Total (EUR)',
    ];

    const rows = filteredOrders.map((order) => {
      const totalItemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
      const itemsSummary = order.items
        .map((i) => `${i.quantity}x ${i.productName}${i.notes ? ` (${i.notes})` : ''}`)
        .join(' | ');
      const serviceLabel = order.tableNumber === 0 ? 'Take-Away' : `Mesa ${order.tableNumber}`;
      const statusLabel =
        order.status === 'completed'
          ? 'Concluido'
          : order.status === 'cancelled'
          ? 'Cancelado'
          : order.status;

      return [
        `#${order.orderNumber}`,
        serviceLabel,
        formatDateTime(order.createdAt),
        statusLabel,
        totalItemsCount,
        itemsSummary,
        order.customerNotes ?? '',
        order.total.toFixed(2).replace('.', ','),
      ]
        .map(escapeCsvField)
        .join(';');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsvField).join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `gulas-historico-pedidos-${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintZReport = () => {
    const completed = filteredOrders.filter((o) => o.status === 'completed');
    const cancelled = filteredOrders.filter((o) => o.status === 'cancelled');
    const totalRevenue = completed.reduce((acc, o) => acc + o.total, 0);
    const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

    const dineIn = completed.filter((o) => o.tableNumber > 0);
    const takeAway = completed.filter((o) => o.tableNumber === 0);
    const dineInRevenue = dineIn.reduce((acc, o) => acc + o.total, 0);
    const takeAwayRevenue = takeAway.reduce((acc, o) => acc + o.total, 0);

    const productSales = new Map<string, { qty: number; revenue: number }>();
    for (const ord of completed) {
      for (const item of ord.items) {
        const key = item.productName;
        const prev = productSales.get(key) || { qty: 0, revenue: 0 };
        productSales.set(key, {
          qty: prev.qty + item.quantity,
          revenue: prev.revenue + item.unitPrice * item.quantity,
        });
      }
    }
    const topProducts = Array.from(productSales.entries())
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 8);

    const periodLabelMap: Record<PeriodOption, string> = {
      all: 'Todo o Histórico',
      today: 'Turno Hoje',
      '7days': 'Últimos 7 Dias',
      '30days': 'Últimos 30 Dias',
    };

    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const topProductsRows = topProducts
      .map(
        ([name, stats]) => `
        <div class="row">
          <span>${stats.qty}x ${escapeHtml(name)}</span>
          <span>${stats.revenue.toFixed(2)}€</span>
        </div>`
      )
      .join('');

    const printWindow = window.open('', '_blank', 'width=420,height=720');
    if (!printWindow) return;

    const nowFormatted = new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt">
        <head>
          <meta charset="utf-8" />
          <title>Fecho de Caixa — ${escapeHtml(restaurantName)}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { box-sizing: border-box; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
            body { width: 76mm; margin: 0; padding: 4mm; color: #000; background: #fff; font-size: 11px; line-height: 1.4; }
            .center { text-align: center; }
            .bold { font-weight: 800; }
            .section { border-bottom: 1.5px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
            .row { display: flex; justify-content: space-between; gap: 8px; }
            .big { font-size: 15px; font-weight: 900; }
          </style>
        </head>
        <body>
          <div class="section center">
            <div class="bold" style="font-size:14px;text-transform:uppercase;">${escapeHtml(restaurantName)}</div>
            <div class="bold">FECHO DE CAIXA / RELATÓRIO Z</div>
            <div style="font-size:10px;">Período: ${periodLabelMap[periodFilter]}</div>
            <div style="font-size:10px;">Emitido em: ${nowFormatted}</div>
          </div>

          <div class="section">
            <div class="row big"><span>FATURAÇÃO</span><span>${totalRevenue.toFixed(2)}€</span></div>
            <div class="row"><span>Ticket Médio</span><span>${avgTicket.toFixed(2)}€</span></div>
            <div class="row"><span>Concluídos</span><span>${completed.length} pedidos</span></div>
            <div class="row"><span>Cancelados</span><span>${cancelled.length} pedidos</span></div>
          </div>

          <div class="section">
            <div class="bold" style="margin-bottom:2px;">POR CANAL</div>
            <div class="row"><span>Sala (${dineIn.length} ped.)</span><span>${dineInRevenue.toFixed(2)}€</span></div>
            <div class="row"><span>Take-Away (${takeAway.length} ped.)</span><span>${takeAwayRevenue.toFixed(2)}€</span></div>
          </div>

          <div class="section">
            <div class="bold" style="margin-bottom:2px;">TOP ARTIGOS VENDIDOS</div>
            ${topProductsRows || '<div>Sem artigos concluídos.</div>'}
          </div>

          <div class="center" style="font-size:9px;margin-top:8px;">
            Resumo interno de fecho operacional
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const completedOrders = filteredOrders.filter((o) => o.status === 'completed');
  const completedCount = completedOrders.length;
  const cancelledCount = filteredOrders.filter((o) => o.status === 'cancelled').length;
  const totalHistoryCount = filteredOrders.length;
  const filteredRevenue = completedOrders.reduce((acc, o) => acc + o.total, 0);

  return (
    <div data-restaurant={restaurantSlug} className="space-y-6 pb-12">
      {/* Cabeçalho Histórico */}
      <section
        aria-label="Cabeçalho do Histórico de Pedidos"
        className="rounded-3xl border border-zinc-200/90 bg-white p-5 sm:p-7 shadow-xs"
      >
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Histórico de Pedidos
          </h1>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrintZReport}
              className="h-10 px-4 cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white active:scale-[0.98]"
              aria-label="Imprimir Fecho de Caixa 80mm"
            >
              Fecho 80mm
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="h-10 px-4 cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white active:scale-[0.98]"
              aria-label="Exportar pedidos filtrados para CSV"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      </section>

      {/* KPI Summary Cards lado a lado a ocupar a largura total */}
      <section
        aria-label="Resumo do histórico"
        className="flex flex-row items-stretch gap-2 sm:gap-3 w-full"
      >
        {[
          {
            label: 'Total',
            value: totalHistoryCount,
            borderClass: 'border-zinc-800',
            labelClass: 'text-zinc-700',
          },
          {
            label: 'Concluídos',
            value: completedCount,
            borderClass: 'border-emerald-600',
            labelClass: 'text-emerald-800',
          },
          {
            label: 'Cancelados',
            value: cancelledCount,
            borderClass: 'border-rose-500',
            labelClass: 'text-rose-800',
          },
          {
            label: 'Faturação',
            value: formatPrice(filteredRevenue),
            borderClass: 'border-amber-500',
            labelClass: 'text-amber-800',
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

      {/* Filter and Search Bar */}
      <section
        aria-label="Filtros e pesquisa do histórico"
        className="rounded-2xl border border-zinc-200/90 bg-white p-2.5 sm:p-3 shadow-2xs space-y-2.5"
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          {/* Search input */}
          <div className="flex items-center flex-1 bg-zinc-50 border border-zinc-200/90 focus-within:bg-white focus-within:border-zinc-900 h-10 rounded-xl shadow-2xs transition-colors overflow-hidden">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar por n.º pedido, nota ou artigo..."
              className="h-full w-full px-3.5 bg-transparent text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="h-full px-3 border-l border-zinc-200 text-[11px] font-semibold text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer transition-colors"
                aria-label="Limpar pesquisa"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className={`relative inline-flex items-center justify-center ${FILTER_BUTTON_CLASS}`}>
              <span>{STATUS_FILTER_LABELS[statusFilter]}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusOption)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Filtrar por estado"
              >
                <option value="all" className="bg-white text-zinc-900">
                  Todos os Estados
                </option>
                <option value="completed" className="bg-white text-zinc-900">
                  Concluídos
                </option>
                <option value="cancelled" className="bg-white text-zinc-900">
                  Cancelados
                </option>
              </select>
            </div>

            <div className={`relative inline-flex items-center justify-center ${FILTER_BUTTON_CLASS}`}>
              <span>{PERIOD_FILTER_LABELS[periodFilter]}</span>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodOption)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Filtrar por período"
              >
                <option value="all" className="bg-white text-zinc-900">
                  Todos os Períodos
                </option>
                <option value="today" className="bg-white text-zinc-900">
                  Hoje
                </option>
                <option value="7days" className="bg-white text-zinc-900">
                  Últimos 7 dias
                </option>
                <option value="30days" className="bg-white text-zinc-900">
                  Últimos 30 dias
                </option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className={FILTER_BUTTON_CLASS}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500 px-1">
          <span className="font-medium">
            A mostrar <strong className="text-zinc-950 font-semibold">{filteredOrders.length}</strong> de{' '}
            <strong className="text-zinc-950 font-semibold">{orders.length}</strong> pedidos
          </span>
        </div>
      </section>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white border border-zinc-200/90 rounded-2xl py-20 text-center shadow-xs">
          <p className="text-sm font-semibold text-zinc-700">
            A carregar histórico...
          </p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-rose-950">
            Não foi possível carregar o histórico
          </h3>
          <p className="text-xs text-rose-800">{error}</p>
          <button
            type="button"
            onClick={fetchHistory}
            className="mt-2 h-10 px-5 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            Tentar Novamente
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-10 sm:p-14 text-center max-w-lg mx-auto shadow-xs space-y-3">
          <h3 className="text-base font-bold text-zinc-950">
            Não existem pedidos no histórico
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Os pedidos concluídos ou cancelados aparecerão arquivados nesta lista.
          </p>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="mt-3 h-10 px-5 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            Sincronizar Agora
          </button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white border border-zinc-200/90 rounded-2xl p-10 sm:p-12 text-center max-w-lg mx-auto shadow-xs space-y-3">
          <h3 className="text-base font-bold text-zinc-950">
            Nenhum pedido corresponde aos filtros
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Tenta ajustar o termo de pesquisa, o estado, a mesa ou o período selecionado.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-3 h-10 px-5 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            Limpar Todos os Filtros
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
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
                    Duração
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
              <tbody className="divide-y divide-zinc-200/80">
                {filteredOrders.map((order) => {
                  const totalItemsCount = order.items.reduce(
                    (acc, item) => acc + item.quantity,
                    0
                  );
                  const itemsSummary = formatItemsSummary(order.items);
                  const durationMinutes = getOrderDurationMinutes(
                    order.createdAt,
                    order.updatedAt
                  );
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-zinc-50/80 transition-colors"
                    >
                      <td className="px-5 py-4 font-bold font-mono text-zinc-950">
                        #{order.orderNumber}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {order.tableNumber === 0 ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-emerald-700 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider">
                            Take-Away
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-zinc-900 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-wider">
                            Mesa {order.tableNumber}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-zinc-500 whitespace-nowrap">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-xs text-zinc-900 max-w-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-zinc-950 shrink-0">
                            {totalItemsCount}x
                          </span>
                          <span
                            className="text-zinc-600 truncate"
                            title={itemsSummary}
                          >
                            {itemsSummary}
                          </span>
                        </div>
                        {order.customerNotes && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-900">
                            Nota: {order.customerNotes}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-mono font-semibold ${getDurationBadgeClass(
                            durationMinutes
                          )}`}
                        >
                          {durationMinutes} min
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <OrderStatusBadge status={order.status} size="sm" />
                      </td>
                      <td className="px-5 py-4 font-bold font-mono text-zinc-950 text-right whitespace-nowrap">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setPrintingOrder(null);
                              setSelectedOrder(order);
                            }}
                            className="px-3.5 py-1.5 rounded-xl border border-zinc-200/90 bg-zinc-50 hover:bg-zinc-900 hover:border-zinc-900 text-zinc-700 hover:text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                          >
                            Ver
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickPrintOrder(order)}
                            className="px-3.5 py-1.5 rounded-xl border border-zinc-200/90 bg-zinc-50 hover:bg-zinc-900 hover:border-zinc-900 text-zinc-700 hover:text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                            title="Reimprimir talão térmico (80mm)"
                          >
                            Imprimir
                          </button>

                          {order.status === 'completed' &&
                            (() => {
                              const rs = reopenMap[order.id];
                              if (rs?.confirming) {
                                return (
                                  <div className="flex items-center gap-1.5 p-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs">
                                    <span className="text-amber-900 font-semibold px-1">
                                      Reabrir #{order.orderNumber}?
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleReopenExecute(order)}
                                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all cursor-pointer"
                                      aria-label={`Confirmar reabertura do pedido ${order.orderNumber}`}
                                    >
                                      Sim
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReopenCancel(order.id)}
                                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold transition-all cursor-pointer"
                                    >
                                      Não
                                    </button>
                                  </div>
                                );
                              }
                              if (rs?.loading) {
                                return (
                                  <span className="text-xs font-semibold text-amber-700">
                                    A reabrir...
                                  </span>
                                );
                              }
                              return (
                                <div className="flex flex-col gap-0.5 items-start">
                                  <button
                                    type="button"
                                    onClick={() => handleReopenConfirm(order.id)}
                                    className="px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                                    aria-label={`Desfazer conclusão do pedido ${order.orderNumber}`}
                                  >
                                    Desfazer
                                  </button>
                                  {rs?.error && (
                                    <span className="text-xs text-rose-700 font-medium">
                                      {rs.error}
                                    </span>
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
          <div className="md:hidden divide-y divide-zinc-200/80">
            {filteredOrders.map((order) => {
              const totalItemsCount = order.items.reduce(
                (acc, item) => acc + item.quantity,
                0
              );
              const itemsSummary = formatItemsSummary(order.items);
              const durationMinutes = getOrderDurationMinutes(
                order.createdAt,
                order.updatedAt
              );
              return (
                <div key={order.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg font-bold font-mono text-zinc-950">
                          #{order.orderNumber}
                        </span>
                        {order.tableNumber === 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg border border-emerald-700 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider">
                            Take-Away
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg border border-zinc-900 bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-wider">
                            Mesa {order.tableNumber}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[11px] font-mono font-semibold ${getDurationBadgeClass(
                            durationMinutes
                          )}`}
                        >
                          {durationMinutes} min
                        </span>
                      </div>
                      <p className="text-xs font-mono text-zinc-500 mt-1">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} size="sm" />
                  </div>

                  <p className="text-xs text-zinc-600 line-clamp-2">
                    <strong className="font-mono text-zinc-900">{totalItemsCount}x</strong>{' '}
                    — {itemsSummary}
                  </p>

                  <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                    <strong className="text-sm font-bold font-mono text-zinc-950">
                      {formatPrice(order.total)}
                    </strong>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setPrintingOrder(null);
                          setSelectedOrder(order);
                        }}
                        className="px-3.5 py-1.5 rounded-xl border border-zinc-900 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      >
                        Detalhes
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickPrintOrder(order)}
                        className="px-3.5 py-1.5 rounded-xl border border-zinc-200/90 bg-zinc-50 hover:bg-zinc-900 hover:border-zinc-900 text-zinc-700 hover:text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                      >
                        Imprimir
                      </button>

                      {order.status === 'completed' &&
                        (() => {
                          const rs = reopenMap[order.id];
                          if (rs?.confirming) {
                            return (
                              <div className="flex items-center gap-1.5 p-1.5 bg-amber-50 border border-amber-300 rounded-xl text-xs">
                                <span className="text-amber-900 font-semibold px-1">
                                  Confirmar?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleReopenExecute(order)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
                                  aria-label={`Confirmar reabertura pedido ${order.orderNumber}`}
                                >
                                  Sim
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReopenCancel(order.id)}
                                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 font-semibold cursor-pointer"
                                >
                                  Não
                                </button>
                              </div>
                            );
                          }
                          if (rs?.loading) {
                            return (
                              <span className="text-xs font-semibold text-amber-700">
                                A reabrir...
                              </span>
                            );
                          }
                          return (
                            <button
                              type="button"
                              onClick={() => handleReopenConfirm(order.id)}
                              className="px-3.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                              aria-label={`Desfazer conclusão do pedido ${order.orderNumber}`}
                            >
                              Desfazer
                            </button>
                          );
                        })()}
                    </div>
                  </div>
                  {reopenMap[order.id]?.error && (
                    <p className="text-xs text-rose-700 font-medium">
                      {reopenMap[order.id].error}
                    </p>
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
        onReopen={(order) => void handleReopenExecute(order)}
      />

      {/* Talão Térmico 80mm fora do contentor transformado do modal */}
      <ThermalReceipt
        order={printingOrder ?? selectedOrder}
        restaurantName={restaurantName}
      />
    </div>
  );
}
