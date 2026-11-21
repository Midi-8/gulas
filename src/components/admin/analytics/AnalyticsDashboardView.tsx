'use client';

import React, { useState, useTransition, useMemo, useCallback, useEffect } from 'react';
import {
  AnalyticsPeriod,
  AnalyticsSummary,
  BcgCategory,
  BcgProductMetric,
  NoteProductBreakdown,
  getAnalyticsSummary,
  exportAnalyticsCsv,
} from '@/actions/analytics';

function formatNoteProducts(products: NoteProductBreakdown[]): string {
  return products.map((p) => `${p.productName} (${p.count}x)`).join(' • ');
}

interface AnalyticsDashboardViewProps {
  initialSummary: AnalyticsSummary;
  restaurantName: string;
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: 'Turno Hoje',
  '7days': '7 Dias',
  '30days': '30 Dias',
  all: 'Sempre',
};

const BCG_CONFIG: Record<
  BcgCategory,
  {
    label: string;
    description: string;
    badgeStyle: string;
    cardStyle: string;
  }
> = {
  star: {
    label: 'Top Rentáveis',
    description: 'Vende muito e alta margem',
    badgeStyle: 'bg-amber-50 text-amber-900 border-2 border-amber-500',
    cardStyle: 'border-amber-500 bg-amber-50/40',
  },
  plowhorse: {
    label: 'Populares',
    description: 'Vende muito e menor margem',
    badgeStyle: 'bg-zinc-900 text-white border-2 border-zinc-900',
    cardStyle: 'border-zinc-800 bg-zinc-50',
  },
  puzzle: {
    label: 'Alta Margem',
    description: 'Vende pouco e alta margem',
    badgeStyle: 'bg-orange-50 text-orange-900 border-2 border-orange-600',
    cardStyle: 'border-orange-600 bg-orange-50/40',
  },
  dog: {
    label: 'Baixa Saída',
    description: 'Vende pouco e baixa margem',
    badgeStyle: 'bg-zinc-100 text-zinc-700 border-2 border-zinc-400',
    cardStyle: 'border-zinc-400 bg-zinc-50',
  },
};

function PeriodDeltaBadge({
  delta,
  previousLabel,
  hasComparison,
  unit = '%',
}: {
  delta: number | null;
  previousLabel: string;
  hasComparison: boolean;
  unit?: '%' | ' pp';
}) {
  if (!hasComparison) {
    return (
      <span className="text-[11px] font-medium text-zinc-400">
        {previousLabel}
      </span>
    );
  }

  if (delta === null) {
    return (
      <span className="text-[11px] font-medium text-zinc-400">
        Sem base {previousLabel}
      </span>
    );
  }

  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  const formatted = `${isPositive ? '+' : ''}${delta.toFixed(1)}${unit}`;
  const toneClass = isNeutral
    ? 'bg-zinc-100 text-zinc-700 border-zinc-200'
    : isPositive
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : 'bg-rose-50 text-rose-800 border-rose-200';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-mono font-semibold shrink-0 ${toneClass}`}
    >
      <span>{formatted}</span>
      <span className="font-sans font-medium opacity-80">{previousLabel}</span>
    </span>
  );
}

export function AnalyticsDashboardView({
  initialSummary,
  restaurantName,
}: AnalyticsDashboardViewProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialSummary.period);
  const [summary, setSummary] = useState<AnalyticsSummary>(initialSummary);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedBcgFilter, setSelectedBcgFilter] = useState<'all' | BcgCategory>('all');
  const [productSearch, setProductSearch] = useState('');

  const [simulatedPriceAdjustmentPct, setSimulatedPriceAdjustmentPct] = useState<number>(5);
  const [demandElasticity, setDemandElasticity] = useState<number>(-0.2);

  const loadAnalyticsForPeriod = useCallback((targetPeriod: AnalyticsPeriod) => {
    setErrorMessage(null);
    startTransition(async () => {
      const res = await getAnalyticsSummary(targetPeriod);
      if (res.success) {
        setSummary(res.data);
      } else {
        setErrorMessage(res.error.message || 'Erro ao carregar dados analíticos.');
      }
    });
  }, []);

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    if (newPeriod === period && !isPending) return;
    setPeriod(newPeriod);
    loadAnalyticsForPeriod(newPeriod);
  };

  useEffect(() => {
    const onGlobalRefresh = () => {
      loadAnalyticsForPeriod(period);
    };
    window.addEventListener('gulas:admin-refresh', onGlobalRefresh);
    return () => {
      window.removeEventListener('gulas:admin-refresh', onGlobalRefresh);
    };
  }, [period, loadAnalyticsForPeriod]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const res = await exportAnalyticsCsv(period);
      if (!res.success) {
        alert(res.error.message || 'Erro ao exportar CSV.');
        return;
      }

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `relatorio-analytics-${period}-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error('Falha ao exportar CSV:', err);
      alert('Não foi possível transferir o ficheiro CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return summary.menuEngineering.filter((item: BcgProductMetric) => {
      const matchesCategory =
        selectedBcgFilter === 'all' || item.classification === selectedBcgFilter;
      const matchesSearch =
        productSearch.trim() === '' ||
        item.productName.toLowerCase().includes(productSearch.toLowerCase()) ||
        item.categoryName.toLowerCase().includes(productSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [summary.menuEngineering, selectedBcgFilter, productSearch]);

  const maxHourlyOrders = useMemo(() => {
    if (!summary.hourlyPerformance.length) return 1;
    return Math.max(...summary.hourlyPerformance.map((h) => h.orderCount), 1);
  }, [summary.hourlyPerformance]);

  const maxTableRevenue = useMemo(() => {
    if (!summary.tablePerformance.length) return 1;
    return Math.max(...summary.tablePerformance.map((t) => t.totalRevenue), 1);
  }, [summary.tablePerformance]);

  const simulationResults = useMemo(() => {
    const baseline = summary.whatIfBaseline;
    if (!baseline || baseline.totalUnitsSold === 0) {
      return {
        newRevenue: 0,
        newProfit: 0,
        revenueDelta: 0,
        profitDelta: 0,
        marginExpansionPct: 0,
        ticketDelta: 0,
      };
    }

    const priceMultiplier = 1 + simulatedPriceAdjustmentPct / 100;
    const volumeMultiplier = 1 + (demandElasticity * simulatedPriceAdjustmentPct) / 100;

    const simulatedUnits = baseline.totalUnitsSold * volumeMultiplier;
    const simulatedPrice = baseline.averageUnitPrice * priceMultiplier;
    const simulatedRevenue = simulatedUnits * simulatedPrice;

    const simulatedCost = simulatedUnits * baseline.averageUnitCost;
    const simulatedProfit = simulatedRevenue - simulatedCost;

    const revenueDelta = simulatedRevenue - baseline.currentRevenue;
    const profitDelta = simulatedProfit - baseline.currentGrossProfit;

    const simulatedMarginPct =
      simulatedRevenue > 0 ? (simulatedProfit / simulatedRevenue) * 100 : 0;
    const marginExpansionPct = simulatedMarginPct - baseline.currentMarginPercent;

    const ticketDelta =
      summary.totalOrders > 0 ? revenueDelta / summary.totalOrders : 0;

    return {
      newRevenue: Math.round(simulatedRevenue * 100) / 100,
      newProfit: Math.round(simulatedProfit * 100) / 100,
      revenueDelta: Math.round(revenueDelta * 100) / 100,
      profitDelta: Math.round(profitDelta * 100) / 100,
      marginExpansionPct: Math.round(marginExpansionPct * 10) / 10,
      ticketDelta: Math.round(ticketDelta * 100) / 100,
    };
  }, [summary.whatIfBaseline, summary.totalOrders, simulatedPriceAdjustmentPct, demandElasticity]);

  return (
    <div data-restaurant={restaurantName} className="space-y-6 pb-16 text-zinc-950 font-sans">
      {/* 1. CABEÇALHO ANÁLISE */}
      <section
        aria-label="Cabeçalho de Análise & Inteligência de Negócio"
        className="rounded-3xl border border-zinc-200/90 bg-white p-5 sm:p-7 shadow-xs"
      >
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950">
            Análise &amp; Inteligência de Negócio
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex flex-wrap items-center gap-2">
              {(['today', '7days', '30days', 'all'] as AnalyticsPeriod[]).map((p) => {
                const isActive = period === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePeriodChange(p)}
                    disabled={isPending}
                    className={`h-10 px-4 cursor-pointer rounded-xl border text-xs font-semibold shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50 ${
                      isActive
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : 'bg-zinc-50 border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting || isPending}
              className="ml-auto h-10 px-4 cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white active:scale-[0.98] disabled:opacity-50"
            >
              {isExporting ? 'A Exportar...' : 'Exportar Relatório (CSV)'}
            </button>
          </div>
        </div>

        {isPending && (
          <p className="mt-4 text-xs font-mono text-zinc-500 animate-pulse">
            A recalcular agregações em tempo real...
          </p>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {errorMessage}
          </div>
        )}
      </section>

      {/* 2. FAIXA DE KPIS COM SPARKLINES */}
      <section
        aria-label="Indicadores principais de negócio"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
      >
        {/* KPI 1: Faturação Total */}
        <div className="rounded-2xl bg-white border-2 border-zinc-800 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider block mb-2">
              Faturação Total
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-950">
              {summary.totalRevenue.toLocaleString('pt-PT', {
                style: 'currency',
                currency: 'EUR',
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-zinc-900">
              {summary.runRate.hourlyVelocity.toFixed(2)}€/h
            </span>
            <PeriodDeltaBadge
              delta={summary.periodComparison.revenueDeltaPercent}
              previousLabel={summary.periodComparison.previousLabel}
              hasComparison={summary.periodComparison.hasComparison}
            />
          </div>
        </div>

        {/* KPI 2: Ticket Médio */}
        <div className="rounded-2xl bg-white border-2 border-zinc-800 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-zinc-700 uppercase tracking-wider block mb-2">
              Ticket Médio
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-950">
              {summary.averageTicket.toLocaleString('pt-PT', {
                style: 'currency',
                currency: 'EUR',
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs text-zinc-600 font-semibold">
              {summary.totalOrders} pedidos
            </span>
            <PeriodDeltaBadge
              delta={summary.periodComparison.ticketDeltaPercent}
              previousLabel={summary.periodComparison.previousLabel}
              hasComparison={summary.periodComparison.hasComparison}
            />
          </div>
        </div>

        {/* KPI 3: Cumprimento SLA */}
        <div
          className={`rounded-2xl bg-white border-2 p-5 shadow-2xs flex flex-col justify-between ${
            summary.slaComplianceRate >= 80
              ? 'border-emerald-600'
              : 'border-rose-500'
          }`}
        >
          <div>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider block mb-2 ${
                summary.slaComplianceRate >= 80
                  ? 'text-emerald-800'
                  : 'text-rose-800'
              }`}
            >
              Cumprimento SLA
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-950">
              {summary.slaComplianceRate}%
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs gap-2">
              <span
                className={`px-2 py-0.5 rounded-lg font-mono font-semibold ${
                  summary.slaViolationCount > 0
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {summary.slaViolationCount} violações (&gt;20m)
              </span>
              <span className="font-mono text-zinc-600">
                Méd: {summary.averageTurnaroundMinutes}m
              </span>
            </div>
            <div>
              <PeriodDeltaBadge
                delta={summary.periodComparison.slaDeltaPoints}
                previousLabel={summary.periodComparison.previousLabel}
                hasComparison={summary.periodComparison.hasComparison}
                unit=" pp"
              />
            </div>
          </div>
        </div>

        {/* KPI 4: Ritmo de Pedidos */}
        <div className="rounded-2xl bg-white border-2 border-orange-600 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider block mb-2">
              Ritmo de Pedidos
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-950">
              {summary.totalOrders}{' '}
              <span className="text-sm font-normal text-zinc-500">ped</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-zinc-900">
              {summary.runRate.ordersVelocity} ped/h
            </span>
            <PeriodDeltaBadge
              delta={summary.periodComparison.ordersDeltaPercent}
              previousLabel={summary.periodComparison.previousLabel}
              hasComparison={summary.periodComparison.hasComparison}
            />
          </div>
        </div>

        {/* KPI 5: Projeção Live */}
        <div className="rounded-2xl bg-white border-2 border-amber-500 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-2">
              Projeção Live
            </span>
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-zinc-950">
              {summary.runRate.projectedPeriodRevenue.toLocaleString('pt-PT', {
                style: 'currency',
                currency: 'EUR',
              })}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-zinc-600">
            <span className="truncate">{summary.runRate.projectionLabel}</span>
            <span className="font-bold text-zinc-700 uppercase text-[10px] bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-lg shrink-0">
              {summary.runRate.paceIndicator === 'high' ? 'Acelerado' : 'Estável'}
            </span>
          </div>
        </div>
      </section>

      {/* 2B. SALA VS TAKE-AWAY & SECÇÕES (BAR / COPA VS COZINHA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Canal: Sala vs Take-Away */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200/80">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                Sala vs. Take-Away
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Compara a faturação, o número de pedidos e o tempo de entrega entre mesas e pedidos para levar.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-zinc-700 bg-zinc-50 px-3 py-1 rounded-xl border border-zinc-200/90 shrink-0">
              {summary.totalOrders} pedidos
            </span>
          </div>

          <div className="space-y-4">
            {[summary.channelSplit.dineIn, summary.channelSplit.takeaway].map((ch) => (
              <div
                key={ch.channel}
                className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-950">{ch.label}</span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-white border border-zinc-200 text-zinc-800">
                      {ch.revenueSharePercent.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-base font-mono font-bold text-zinc-950">
                    {ch.revenue.toLocaleString('pt-PT', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                </div>

                <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, ch.revenueSharePercent)}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      ch.channel === 'dine_in' ? 'bg-zinc-900' : 'bg-amber-500'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-zinc-600">
                  <span>{ch.orderCount} pedidos</span>
                  <span>Ticket Méd: {ch.averageTicket.toFixed(2)}€</span>
                  <span>Tempo Méd: {ch.avgTurnaroundMinutes}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Secção: Cozinha vs Bar / Copa */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200/80">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                Cozinha vs. Bar / Copa
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Mostra o peso das vendas, unidades servidas e lucro gerado por cada secção de trabalho.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-zinc-700 bg-zinc-50 px-3 py-1 rounded-xl border border-zinc-200/90 shrink-0">
              {summary.categoryPerformance.length} categorias
            </span>
          </div>

          <div className="space-y-4">
            {summary.stationSplit.map((st) => (
              <div
                key={st.station}
                className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-950">{st.label}</span>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-white border border-zinc-200 text-zinc-800">
                      {st.revenueSharePercent.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-base font-mono font-bold text-zinc-950">
                    {st.revenue.toLocaleString('pt-PT', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </span>
                </div>

                <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, st.revenueSharePercent)}%` }}
                    className="h-full rounded-full transition-all duration-300 bg-zinc-900"
                  />
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-zinc-600">
                  <span>{st.unitsSold} un. vendidas</span>
                  <span>Lucro: {st.profit.toFixed(2)}€</span>
                  <span>Margem: {st.marginPercent.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2C. DESEMPENHO POR CATEGORIA DO MENU */}
      <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-zinc-200/80">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
              Vendas por Categoria
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Resumo das unidades vendidas, faturação e margem de lucro de cada categoria do menu.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-800 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200/90 self-start shrink-0">
            {summary.categoryPerformance.length} Categorias com Saída
          </span>
        </div>

        {summary.categoryPerformance.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            Sem artigos vendidos por categoria no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200/90">
            <table className="w-full text-left text-xs sm:text-sm text-zinc-900">
              <thead className="bg-zinc-50 text-zinc-600 text-[11px] uppercase tracking-wider font-bold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Secção</th>
                  <th className="py-3 px-4 text-right">Unidades</th>
                  <th className="py-3 px-4 text-right">Quota</th>
                  <th className="py-3 px-4 text-right">Margem</th>
                  <th className="py-3 px-4 text-right">Faturação</th>
                  <th className="py-3 px-4 text-right">Lucro Bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 bg-white">
                {summary.categoryPerformance.map((cat) => (
                  <tr key={cat.categorySlug + cat.categoryName} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-zinc-950">
                      {cat.categoryName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-zinc-100 text-zinc-800 border-zinc-200">
                        {cat.station === 'bar' ? 'Bar / Copa' : 'Cozinha'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-950">
                      {cat.unitsSold}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-700">
                      {cat.revenueSharePercent.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-700">
                      {cat.marginPercent.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-950">
                      {cat.revenue.toFixed(2)}€
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-600">
                      {cat.profit.toFixed(2)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. HISTOGRAMA DE FLUXO HORÁRIO */}
      <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-zinc-200/80">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
              Pedidos por Hora (24h)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Mostra as horas de maior movimento e o tempo médio de resposta ao longo do dia.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-zinc-900 inline-block" />
              <span>Volume Padrão</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gradient-to-t from-zinc-900 to-zinc-500 inline-block" />
              <span>Pico de Turno</span>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-4 pt-6">
          <div className="min-w-[800px] h-80 relative flex items-end gap-2 pb-8 border-b-2 border-zinc-200">
            {summary.hourlyPerformance.map((h) => {
              const heightPct =
                maxHourlyOrders > 0
                  ? Math.round((h.orderCount / maxHourlyOrders) * 100)
                  : 0;
              const isPeak = h.orderCount === maxHourlyOrders && h.orderCount > 0;

              return (
                <div
                  key={h.hour}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative"
                >
                  <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-xs rounded-xl py-2 px-3 pointer-events-none whitespace-nowrap shadow-xl z-30 border border-zinc-700">
                    <div className="font-bold text-zinc-300">{h.hourLabel}</div>
                    <div>
                      {h.orderCount} pedidos • {h.totalRevenue.toFixed(2)}€
                    </div>
                    <div className="text-amber-300">
                      Tempo médio: {h.avgTurnaroundMinutes} min
                    </div>
                  </div>

                  {h.orderCount > 0 && (
                    <span
                      className={`text-xs font-mono font-bold mb-1.5 transition-colors ${
                        isPeak ? 'text-zinc-950 text-sm scale-110' : 'text-zinc-800'
                      }`}
                    >
                      {h.orderCount}
                    </span>
                  )}

                  <div
                    style={{ height: `${Math.max(heightPct, 5)}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      h.orderCount === 0
                        ? 'bg-zinc-100'
                        : isPeak
                        ? 'bg-gradient-to-t from-zinc-900 via-zinc-600 to-zinc-500 shadow-md ring-2 ring-zinc-400/50'
                        : 'bg-gradient-to-t from-zinc-900 to-zinc-600 group-hover:brightness-110'
                    }`}
                  />

                  <span className="absolute -bottom-6 text-xs font-mono font-bold text-zinc-500 group-hover:text-zinc-950">
                    {h.hour}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-zinc-500 font-semibold pt-2">
          <span>Abertura / Manhã (08h — 11h)</span>
          <span className="text-zinc-900 font-bold">Serviço de Almoço (12h — 15h)</span>
          <span className="text-zinc-900 font-bold">Serviço de Jantar (19h — 23h)</span>
        </div>
      </div>

      {/* 4. ENGENHARIA DE MENU & CROSS-SELLING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                Desempenho dos Artigos
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Classifica cada prato ou bebida conforme a quantidade vendida e o lucro que gera.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['star', 'plowhorse', 'puzzle', 'dog'] as BcgCategory[]).map((cat) => {
                const cfg = BCG_CONFIG[cat];
                const count =
                  cat === 'star'
                    ? summary.bcgSummary.starsCount
                    : cat === 'plowhorse'
                    ? summary.bcgSummary.plowhorsesCount
                    : cat === 'puzzle'
                    ? summary.bcgSummary.puzzlesCount
                    : summary.bcgSummary.dogsCount;
                const isSelected = selectedBcgFilter === cat;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedBcgFilter(isSelected ? 'all' : cat)}
                    className={`px-3 py-2 rounded-xl text-left border-2 transition-all cursor-pointer shadow-2xs ${
                      isSelected
                        ? `${cfg.cardStyle} ring-2 ring-zinc-900/15`
                        : 'bg-zinc-50 border-zinc-200/90 hover:border-zinc-400 text-zinc-700'
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate text-zinc-950">
                      {cfg.label}
                    </div>
                    <div className="text-base font-mono font-bold text-zinc-950">
                      {count}
                    </div>
                    <div className="text-[10px] font-medium text-zinc-500 truncate">
                      {cfg.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center flex-1 bg-zinc-50 border border-zinc-200/90 focus-within:bg-white focus-within:border-zinc-900 h-10 rounded-xl shadow-2xs transition-colors overflow-hidden">
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Pesquisar por artigo ou categoria..."
                className="h-full w-full px-3.5 bg-transparent text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="h-full px-3 border-l border-zinc-200 text-[11px] font-semibold text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 cursor-pointer transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
            {selectedBcgFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedBcgFilter('all')}
                className="h-10 px-4 cursor-pointer rounded-xl border border-zinc-200/90 bg-zinc-50 text-xs font-semibold text-zinc-700 shadow-2xs transition-all hover:bg-zinc-900 hover:border-zinc-900 hover:text-white shrink-0"
              >
                Limpar Filtro ({BCG_CONFIG[selectedBcgFilter].label})
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200/90 max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs sm:text-sm text-zinc-900">
              <thead className="bg-zinc-50 sticky top-0 z-10 text-zinc-600 text-[11px] uppercase tracking-wider font-bold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-3.5">Classificação</th>
                  <th className="py-3 px-3.5">Artigo</th>
                  <th className="py-3 px-3.5 text-right">Qtd.</th>
                  <th className="py-3 px-3.5 text-right">PVP</th>
                  <th className="py-3 px-3.5 text-right">Margem Unit.</th>
                  <th className="py-3 px-3.5 text-right">Faturação</th>
                  <th className="py-3 px-3.5 text-right">Lucro Bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 bg-white">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      Nenhum artigo encontrado para o filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const bcg = BCG_CONFIG[p.classification];
                    return (
                      <tr key={p.productId} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${bcg.badgeStyle}`}
                          >
                            {bcg.label}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-zinc-950">
                          {p.productName}
                          <span className="block text-xs text-zinc-500 font-normal">
                            {p.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-zinc-950">
                          {p.quantitySold}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-zinc-800">
                          {p.unitPrice.toFixed(2)}€
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-zinc-900 font-semibold">
                          +{p.unitMargin.toFixed(2)}€{' '}
                          <span className="text-[11px] text-zinc-500">
                            ({p.marginPercent.toFixed(0)}%)
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-zinc-950">
                          {p.totalRevenue.toFixed(2)}€
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-semibold text-zinc-600">
                          {p.totalProfit.toFixed(2)}€
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Market Basket / Top Combos */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                  Artigos Mais Pedidos Juntos
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  Mostra os pares de artigos que os clientes costumam pedir na mesma mesa.
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-zinc-800 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-zinc-200 shrink-0">
                Afinidade de Venda
              </span>
            </div>

            {summary.marketBasketCombos.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Ainda sem pedidos suficientes com múltiplos itens para calcular afinidade.
              </div>
            ) : (
              <div className="space-y-3 mt-5">
                {summary.marketBasketCombos.map((combo, idx) => (
                  <div
                    key={combo.id}
                    className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-zinc-950 mb-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-6 h-6 rounded-lg bg-zinc-900 text-white font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                          #{idx + 1}
                        </span>
                        <span className="truncate">{combo.itemA}</span>
                        <span className="text-zinc-400">+</span>
                        <span className="text-zinc-950 truncate">{combo.itemB}</span>
                      </div>
                      <span className="font-mono text-zinc-900 font-bold text-sm shrink-0 ml-2">
                        {combo.affinityPercent}%
                      </span>
                    </div>

                    <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden my-2">
                      <div
                        style={{ width: `${Math.min(100, combo.affinityPercent)}%` }}
                        className="h-full bg-zinc-800 rounded-full transition-all duration-300"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
                      <span>{combo.coOccurrenceCount} pedidos combinados</span>
                      <span className="font-mono text-zinc-950 font-bold">
                        Méd: {combo.estimatedComboRevenue.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-800 leading-relaxed">
            <strong className="text-zinc-950 block mb-1">Dica de Menu:</strong>
            Itens com afinidade superior a 60% devem ser promovidos como sugestão de acompanhamento no menu digital para maximizar o ticket médio.
          </div>
        </div>
      </div>

      {/* 5. MINERAÇÃO DE NOTAS & SIMULADOR WHAT-IF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                  Notas e Pedidos dos Clientes
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  Identifica preferências frequentes nas notas e pedidos de extras que não estão a ser cobrados.
                </p>
              </div>
              {summary.totalMarginLeakageEur > 0 && (
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border-2 border-rose-500 shrink-0">
                  -{summary.totalMarginLeakageEur.toFixed(2)}€ fuga estimada
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              <div className="p-4 rounded-2xl bg-rose-50/50 border-2 border-rose-200 space-y-3">
                <span className="text-xs font-bold text-rose-900 block">
                  Extras / Fugas de Margem
                </span>
                {summary.marginLeakages.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-3 text-center">
                    Sem pedidos de molhos/extras não cobrados registados.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {summary.marginLeakages.slice(0, 5).map((leak) => (
                      <div
                        key={leak.term}
                        className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-white border border-rose-200/80 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-zinc-950 block">{leak.term}</span>
                          <span className="text-[10px] text-zinc-500 block truncate">
                            {leak.topProducts.length > 0
                              ? formatNoteProducts(leak.topProducts)
                              : leak.category}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono text-rose-700 font-bold block">
                            {leak.count}x
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            ~{leak.totalEstimatedLossEur.toFixed(2)}€
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
                <span className="text-xs font-bold text-zinc-950 block">
                  Preferências de Clientes
                </span>
                {summary.operationalPreferences.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-3 text-center">
                    Sem preferências operacionais registadas no período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {summary.operationalPreferences.slice(0, 5).map((op) => (
                      <div
                        key={op.term}
                        className="flex items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-zinc-950 block">{op.term}</span>
                          {op.topProducts.length > 0 && (
                            <span className="text-[10px] text-zinc-500 block truncate">
                              {formatNoteProducts(op.topProducts)}
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-zinc-900 font-bold px-2 py-0.5 rounded-lg bg-zinc-100 border border-zinc-200 shrink-0">
                          {op.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-zinc-200/80">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2.5">
                Termos Mais Frequentes nas Notas:
              </span>
              {summary.topNoteTerms.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  Sem termos registados nas notas deste período.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {summary.topNoteTerms.slice(0, 12).map((t) => (
                    <div
                      key={t.term}
                      className="flex items-start justify-between gap-2.5 px-3 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/90"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-zinc-950 block capitalize">
                          {t.term}
                        </span>
                        {t.topProducts.length > 0 && (
                          <span className="text-[11px] text-zinc-500 block truncate">
                            {formatNoteProducts(t.topProducts)}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-white border border-zinc-200 text-zinc-950 font-mono font-bold text-[11px] shrink-0">
                        {t.count}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-800">
            <strong className="text-zinc-950">Ação Recomendada:</strong> Se os clientes pedem com frequência &quot;molho extra&quot; ou &quot;mais batatas&quot; nas notas, adicione estes adicionais como opções pagas no menu digital para proteger as margens.
          </div>
        </div>

        {/* Simulador Dinâmico What-If */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                Simulador de Preços
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Calcula quanto pode ganhar em faturação e lucro se ajustar os preços do menu.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {[2, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setSimulatedPriceAdjustmentPct(pct)}
                  className={`h-9 px-3.5 rounded-xl border text-xs font-mono font-semibold shadow-2xs transition-all cursor-pointer active:scale-[0.98] ${
                    simulatedPriceAdjustmentPct === pct
                      ? 'bg-zinc-900 border-zinc-900 text-white'
                      : 'bg-zinc-50 border-zinc-200/90 text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 mb-1.5">
                <span>Ajuste Médio de PVP</span>
                <span className="font-mono text-zinc-950 font-bold text-sm">
                  +{simulatedPriceAdjustmentPct}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={simulatedPriceAdjustmentPct}
                onChange={(e) => setSimulatedPriceAdjustmentPct(Number(e.target.value))}
                className="w-full accent-zinc-900 cursor-pointer h-2 bg-zinc-200 rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-900 mb-1.5">
                <span>Elasticidade da Procura</span>
                <span className="font-mono text-zinc-950 font-bold text-xs">
                  {demandElasticity === 0
                    ? 'Inelástica (0)'
                    : demandElasticity === -0.2
                    ? 'Conservadora (-0.2)'
                    : 'Moderada (-0.4)'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { val: 0, label: 'Inelástica (0)' },
                  { val: -0.2, label: 'Conservadora (-0.2)' },
                  { val: -0.4, label: 'Moderada (-0.4)' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setDemandElasticity(opt.val)}
                    className={`flex-1 h-9 px-3 rounded-xl border text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-[0.98] ${
                      demandElasticity === opt.val
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200/90 bg-white text-zinc-700 hover:bg-zinc-900 hover:border-zinc-900 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-white border-2 border-zinc-800 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-700 block mb-1">
                Lucro Bruto Adicional
              </span>
              <div className="text-xl sm:text-2xl font-mono font-bold text-zinc-950">
                +{simulationResults.profitDelta.toLocaleString('pt-PT', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </div>
              <span className="text-[11px] text-zinc-500 font-semibold mt-1 block">
                Novo Total: {simulationResults.newProfit.toFixed(2)}€
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border-2 border-emerald-600 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                Nova Faturação
              </span>
              <div className="text-xl sm:text-2xl font-mono font-bold text-zinc-950">
                {simulationResults.newRevenue.toLocaleString('pt-PT', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </div>
              <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
                +{simulationResults.revenueDelta.toFixed(2)}€ receita
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border-2 border-amber-500 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
                Expansão de Margem
              </span>
              <div className="text-xl sm:text-2xl font-mono font-bold text-zinc-950">
                +{simulationResults.marginExpansionPct}%
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Base: {summary.whatIfBaseline.currentMarginPercent.toFixed(1)}%
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white border-2 border-orange-600 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-800 block mb-1">
                Impacto Médio / Mesa
              </span>
              <div className="text-xl sm:text-2xl font-mono font-bold text-zinc-950">
                +{simulationResults.ticketDelta.toFixed(2)}€
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                por cliente atendido
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5B. CANCELAMENTOS & RECEITA PERDIDA + ARTIGOS SEM VENDAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bloco 4: Cancelamentos & Receita Perdida */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200/80">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                Cancelamentos e Valor Perdido
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Mostra quantos pedidos foram cancelados, o valor perdido e os artigos mais afetados.
              </p>
            </div>
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-full border-2 shrink-0 ${
                summary.cancellations.cancellationRatePercent > 5
                  ? 'bg-rose-50 text-rose-800 border-rose-500'
                  : 'bg-zinc-50 text-zinc-800 border-zinc-200'
              }`}
            >
              {summary.cancellations.cancellationRatePercent.toFixed(1)}% dos pedidos
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-white border-2 border-zinc-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                Cancelados
              </span>
              <span className="text-lg sm:text-xl font-mono font-bold text-zinc-950">
                {summary.cancellations.cancelledOrdersCount}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border-2 border-rose-500 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block mb-1">
                Valor Perdido
              </span>
              <span className="text-lg sm:text-xl font-mono font-bold text-zinc-950">
                {summary.cancellations.lostRevenueEur.toFixed(2)}€
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white border-2 border-zinc-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
                Ticket Médio
              </span>
              <span className="text-lg sm:text-xl font-mono font-bold text-zinc-950">
                {summary.cancellations.avgCancelledTicketEur.toFixed(2)}€
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider block mb-2.5">
              Artigos Mais Afetados por Cancelamentos
            </span>
            {summary.cancellations.topCancelledProducts.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs rounded-xl bg-zinc-50 border border-zinc-200/80">
                Sem pedidos cancelados registados neste período.
              </div>
            ) : (
              <div className="space-y-2">
                {summary.cancellations.topCancelledProducts.map((item) => (
                  <div
                    key={item.productName}
                    className="flex items-center justify-between text-xs p-3 rounded-xl bg-zinc-50 border border-zinc-200/80"
                  >
                    <div>
                      <span className="font-semibold text-zinc-950 block">
                        {item.productName}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {item.categoryName}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-rose-700 block">
                        {item.cancelledQty} un.
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {item.lostRevenue.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bloco 5: Artigos Sem Vendas ("Parados") */}
        <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200/80">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
                Artigos Sem Vendas
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                Lista os artigos do menu que não tiveram nenhuma saída no período selecionado.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-zinc-800 bg-zinc-50 px-3 py-1 rounded-xl border border-zinc-200/90 shrink-0">
              {summary.unsoldProducts.length} sem saída
            </span>
          </div>

          {summary.unsoldProducts.length === 0 ? (
            <div className="py-12 text-center text-emerald-700 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-xs font-semibold">
              Todos os artigos do menu registaram vendas neste período.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {summary.unsoldProducts.map((prod) => (
                <div
                  key={prod.productId}
                  className="flex items-center justify-between gap-3 text-xs p-3 rounded-xl bg-zinc-50 border border-zinc-200/80"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-zinc-950 block truncate">
                      {prod.productName}
                    </span>
                    <span className="text-[11px] text-zinc-500 block truncate">
                      {prod.categoryName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        prod.isAvailable
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-300'
                      }`}
                    >
                      {prod.isAvailable ? 'Ativo' : 'Esgotado'}
                    </span>
                    <span className="font-mono font-bold text-zinc-900">
                      {prod.unitPrice.toFixed(2)}€
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 6. ANÁLISE DE MESAS & ESPAÇO */}
      <div className="rounded-2xl bg-white border border-zinc-200/90 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-200/80">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 tracking-tight">
              Faturação por Mesa
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Mostra as mesas da sala com maior faturação, número de pedidos e gasto médio.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-zinc-800 bg-zinc-50 px-3 py-1.5 rounded-xl border border-zinc-200/90 shrink-0">
            {summary.tablePerformance.length} Mesas Faturadas
          </span>
        </div>

        {summary.tablePerformance.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            Sem pedidos faturados por mesa no período.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            {summary.tablePerformance.slice(0, 8).map((tbl, idx) => {
              const pct =
                maxTableRevenue > 0
                  ? Math.round((tbl.totalRevenue / maxTableRevenue) * 100)
                  : 0;

              return (
                <div
                  key={tbl.tableNumber}
                  className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 hover:border-zinc-400 transition-all"
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-zinc-950 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center font-bold">
                        #{idx + 1}
                      </span>
                      <span>
                        {tbl.tableNumber === 0 ? 'Take-Away / Balcão' : `Mesa ${tbl.tableNumber}`}
                      </span>
                    </div>
                    <span className="font-mono text-zinc-950 font-bold">
                      {tbl.totalRevenue.toFixed(2)}€
                    </span>
                  </div>

                  <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden my-2">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-zinc-800 rounded-full transition-all duration-300"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-1">
                    <span>{tbl.orderCount} ped</span>
                    <span>Ticket: {tbl.averageTicket.toFixed(2)}€</span>
                    <span>{tbl.avgTurnaroundMinutes}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
