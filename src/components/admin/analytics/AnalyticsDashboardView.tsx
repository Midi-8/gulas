'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
  AnalyticsPeriod,
  AnalyticsSummary,
  BcgCategory,
  BcgProductMetric,
  getAnalyticsSummary,
  exportAnalyticsCsv,
} from '@/actions/analytics';
import {
  TrendingUp,
  Download,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Sparkles,
  Search,
  RefreshCw,
  HelpCircle,
  Footprints,
  Flame,
  Award,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Zap,
  ShoppingBag,
  Sliders,
  DollarSign,
  AlertOctagon,
  Percent,
} from 'lucide-react';

interface AnalyticsDashboardViewProps {
  initialSummary: AnalyticsSummary;
  restaurantName: string;
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  today: 'Turno Hoje',
  '7days': '7 Dias',
  '30days': '30 Dias',
  all: 'Histórico',
};

const BCG_CONFIG: Record<
  BcgCategory,
  {
    label: string;
    description: string;
    badgeStyle: string;
    cardStyle: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  star: {
    label: 'Estrela',
    description: 'Alto volume e alta margem',
    badgeStyle: 'bg-[#C09573]/15 text-[#5E4939] border border-[#C09573]/40',
    cardStyle: 'border-[#C09573] bg-[#C09573]/10',
    icon: Sparkles,
  },
  plowhorse: {
    label: 'Cavalo de Batalha',
    description: 'Alto volume e menor margem',
    badgeStyle: 'bg-[#5E4939]/10 text-[#4C392D] border border-[#5E4939]/30',
    cardStyle: 'border-[#5E4939] bg-[#5E4939]/10',
    icon: Award,
  },
  puzzle: {
    label: 'Quebra-Cabeças',
    description: 'Baixo volume e alta margem',
    badgeStyle: 'bg-[#EAE5DF] text-[#35271F] border border-[#E5DED6]',
    cardStyle: 'border-[#A77B59] bg-[#EAE5DF]/80',
    icon: HelpCircle,
  },
  dog: {
    label: 'Inerte / Cão',
    description: 'Baixo volume e baixa rentabilidade',
    badgeStyle: 'bg-[#F5F4F1] text-[#4C453F] border border-[#E5DED6]',
    cardStyle: 'border-[#E5DED6] bg-[#F5F4F1]',
    icon: Footprints,
  },
};

function Sparkline({
  data,
  color = '#C09573',
  gradientId,
  height = 42,
  width = 110,
}: {
  data: number[];
  color?: string;
  gradientId: string;
  height?: number;
  width?: number;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const coords = data.map((val, i) => {
    const x = i * step;
    const y = height - ((val - min) / range) * (height - 10) - 5;
    return { x, y };
  });

  const linePath = coords.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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

  // Menu Engineering filters
  const [selectedBcgFilter, setSelectedBcgFilter] = useState<'all' | BcgCategory>('all');
  const [productSearch, setProductSearch] = useState('');

  // What-If Decision Simulator State
  const [simulatedPriceAdjustmentPct, setSimulatedPriceAdjustmentPct] = useState<number>(5);
  const [demandElasticity, setDemandElasticity] = useState<number>(-0.2); // -0.2 is conservative for restaurants

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    if (newPeriod === period && !isPending) return;
    setPeriod(newPeriod);
    setErrorMessage(null);

    startTransition(async () => {
      const res = await getAnalyticsSummary(newPeriod);
      if (res.success) {
        setSummary(res.data);
      } else {
        setErrorMessage(res.error.message || 'Erro ao carregar dados analíticos.');
      }
    });
  };

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

  // Filtered BCG products
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

  // Hourly Chart max
  const maxHourlyOrders = useMemo(() => {
    if (!summary.hourlyPerformance.length) return 1;
    return Math.max(...summary.hourlyPerformance.map((h) => h.orderCount), 1);
  }, [summary.hourlyPerformance]);

  // Table rankings max revenue
  const maxTableRevenue = useMemo(() => {
    if (!summary.tablePerformance.length) return 1;
    return Math.max(...summary.tablePerformance.map((t) => t.totalRevenue), 1);
  }, [summary.tablePerformance]);

  // What-If Simulation Calculations
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
    <div className="space-y-8 pb-16 text-[#35271F] font-sans">
      {/* 1. CABEÇALHO ANALYTICS (Minimalista, Flat & Sólido em #FFFFFF) */}
      <div className="rounded-2xl bg-[#FFFFFF] text-[#35271F] border border-[#E5DED6] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wide bg-[#EAE5DF] text-[#5E4939] border border-[#E5DED6]">
                <span className="w-2 h-2 rounded-full bg-[#C09573] animate-pulse" />
                LIVE SYNC
              </span>
              <span className="text-xs font-mono text-[#78716C]">
                Centro de Comando &bull; {restaurantName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#35271F]">
              Inteligência de Negócio &amp; BI
            </h1>
            <p className="text-xs sm:text-sm text-[#4C453F] mt-1 max-w-xl leading-relaxed">
              Métricas de rentabilidade BCG, análise de cestas de compra, pressão operacional de cozinha e simulação preditiva.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector Toggle */}
            <div className="inline-flex p-1 bg-[#EAE5DF] border border-[#E5DED6] rounded-xl">
              {(['today', '7days', '30days'] as AnalyticsPeriod[]).map((p) => {
                const isActive = period === p;
                return (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    disabled={isPending}
                    className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                      isActive
                        ? 'bg-[#FFFFFF] text-[#35271F] shadow-xs'
                        : 'text-[#4C453F] hover:text-[#35271F]'
                    } disabled:opacity-50 cursor-pointer`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                );
              })}
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCsv}
              disabled={isExporting || isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5E4939] hover:bg-[#453426] text-[#F5F4F1] text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'A Exportar...' : 'Exportar Relatório (CSV)'}</span>
            </button>
          </div>
        </div>

        {isPending && (
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-[#C09573] animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>A recalcular agregações em tempo real...</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 2. FAIXA DE KPIS COM SPARKLINES (Cartões em #FFFFFF, Bordas #E5DED6, Destaque #C09573) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Faturação Total */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-5 shadow-xs relative overflow-hidden group hover:border-[#C09573]/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#4C453F] uppercase tracking-wider">
              Faturação Total
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#C09573]/15 text-[#5E4939] flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-[#C09573]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-[#35271F]">
            {summary.totalRevenue.toLocaleString('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#5E4939]">
              {summary.runRate.hourlyVelocity.toFixed(2)}€/h
            </span>
            <Sparkline
              data={summary.sparklines.revenuePoints}
              color="#C09573"
              gradientId="kpi-rev"
            />
          </div>
        </div>

        {/* KPI 2: Ticket Médio */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-5 shadow-xs relative overflow-hidden group hover:border-[#C09573]/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#4C453F] uppercase tracking-wider">
              Ticket Médio
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#5E4939]/10 text-[#5E4939] flex items-center justify-center">
              <Receipt className="w-4 h-4 text-[#5E4939]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-[#35271F]">
            {summary.averageTicket.toLocaleString('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[#4C453F] font-semibold">
              {summary.totalOrders} pedidos
            </span>
            <Sparkline
              data={summary.sparklines.ordersPoints}
              color="#5E4939"
              gradientId="kpi-orders"
            />
          </div>
        </div>

        {/* KPI 3: Cumprimento SLA (<20m) */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-5 shadow-xs relative overflow-hidden group hover:border-[#C09573]/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#4C453F] uppercase tracking-wider">
              Cumprimento SLA
            </span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                summary.slaComplianceRate >= 80
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {summary.slaComplianceRate >= 80 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              )}
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-[#35271F]">
            {summary.slaComplianceRate}%
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span
              className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                summary.slaViolationCount > 0
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {summary.slaViolationCount} violações (&gt;20m)
            </span>
            <span className="font-mono text-[#4C453F]">
              Méd: {summary.averageTurnaroundMinutes}m
            </span>
          </div>
        </div>

        {/* KPI 4: Ritmo de Pedidos */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-5 shadow-xs relative overflow-hidden group hover:border-[#C09573]/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#4C453F] uppercase tracking-wider">
              Ritmo de Pedidos
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#EAE5DF] text-[#5E4939] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#5E4939]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-[#35271F]">
            {summary.totalOrders} <span className="text-sm font-normal text-[#4C453F]">ped</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#5E4939]">
              {summary.runRate.ordersVelocity} ped/h
            </span>
            <Sparkline
              data={summary.sparklines.ordersPoints}
              color="#A77B59"
              gradientId="kpi-orders-pace"
            />
          </div>
        </div>

        {/* KPI 5: Projeção Live */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-5 shadow-xs relative overflow-hidden group hover:border-[#C09573]/60 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#4C453F] uppercase tracking-wider">
              Projeção Live
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#C09573]/15 text-[#C09573] flex items-center justify-center">
              <Flame className="w-4 h-4 text-[#C09573]" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-[#35271F]">
            {summary.runRate.projectedPeriodRevenue.toLocaleString('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-[#4C453F]">
            <span className="truncate">{summary.runRate.projectionLabel}</span>
            <span className="font-bold text-[#C09573] uppercase text-[10px] bg-[#EAE5DF] px-2 py-0.5 rounded">
              {summary.runRate.paceIndicator === 'high' ? 'Acelerado' : 'Estável'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. HISTOGRAMA DE FLUXO HORÁRIO EXPANDIDO (Altura h-80, Min-Width 800px, Tons Gulas) */}
      <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5DED6]">
          <div>
            <div className="flex items-center gap-2 text-[#C09573] text-xs font-mono uppercase tracking-wider mb-1">
              <Clock className="w-4 h-4 text-[#C09573]" />
              Pressão Operacional de Cozinha &amp; Sala
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#35271F]">
              Fluxo Horário &amp; Picos de Serviço (24 Horas)
            </h2>
            <p className="text-xs sm:text-sm text-[#4C453F] mt-0.5">
              Volume de pedidos e tempo médio de resolução distribuídos de 00:00 às 23:00.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-[#4C453F]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#5E4939] inline-block" />
              <span>Volume Padrão</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-gradient-to-t from-[#5E4939] to-[#C09573] inline-block" />
              <span>Pico de Turno</span>
            </div>
          </div>
        </div>

        {/* Expanded SVG Histogram */}
        <div className="w-full overflow-x-auto pb-4 pt-6">
          <div className="min-w-[800px] h-80 relative flex items-end gap-2 pb-8 border-b-2 border-[#E5DED6]">
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
                  {/* Floating Hover Tooltip */}
                  <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-[#35271F] text-[#F5F4F1] text-xs rounded-xl py-2 px-3 pointer-events-none whitespace-nowrap shadow-xl z-30 border border-[#E5DED6]/30">
                    <div className="font-bold text-[#C09573]">{h.hourLabel}</div>
                    <div>{h.orderCount} pedidos • {h.totalRevenue.toFixed(2)}€</div>
                    <div className="text-amber-200">Tempo médio: {h.avgTurnaroundMinutes} min</div>
                  </div>

                  {/* Persistent Numeric Label on top of active bars */}
                  {h.orderCount > 0 && (
                    <span
                      className={`text-xs font-mono font-bold mb-1.5 transition-colors ${
                        isPeak
                          ? 'text-[#C09573] text-sm scale-110'
                          : 'text-[#35271F] group-hover:text-[#5E4939]'
                      }`}
                    >
                      {h.orderCount}
                    </span>
                  )}

                  {/* Bar with Gulas Brand Gradient and Rounded Corners */}
                  <div
                    style={{ height: `${Math.max(heightPct, 5)}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      h.orderCount === 0
                        ? 'bg-[#EAE5DF]/60'
                        : isPeak
                        ? 'bg-gradient-to-t from-[#5E4939] via-[#C09573] to-[#A77B59] shadow-md shadow-[#C09573]/30 ring-2 ring-[#C09573]/50'
                        : 'bg-gradient-to-t from-[#5E4939] to-[#C09573] group-hover:brightness-110'
                    }`}
                  />

                  {/* Hour Label */}
                  <span className="absolute -bottom-6 text-xs font-mono font-bold text-[#4C453F] group-hover:text-[#35271F]">
                    {h.hour}h
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-[#4C453F] font-semibold pt-2">
          <span>Abertura / Manhã (08h — 11h)</span>
          <span className="text-[#5E4939] font-bold">Serviço de Almoço (12h — 15h)</span>
          <span className="text-[#5E4939] font-bold">Serviço de Jantar (19h — 23h)</span>
        </div>
      </div>

      {/* 4. SECÇÃO: ENGENHARIA DE MENU & CROSS-SELLING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna 1 & 2: Matriz BCG Interativa */}
        <div className="lg:col-span-2 rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#C09573] text-xs font-mono uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4 text-[#C09573]" />
                Matriz BCG de Rentabilidade
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#35271F]">
                Engenharia de Menu &amp; Artigos
              </h2>
            </div>

            {/* Quick Quadrants Selectors */}
            <div className="grid grid-cols-4 gap-2">
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
                    onClick={() => setSelectedBcgFilter(isSelected ? 'all' : cat)}
                    className={`px-3 py-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                      isSelected
                        ? `${cfg.cardStyle} ring-2 ring-[#C09573]`
                        : 'bg-[#F5F4F1] border-[#E5DED6] hover:border-[#C09573]/50 text-[#4C453F]'
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate text-[#35271F]">{cfg.label}</div>
                    <div className="text-lg font-mono font-black text-[#35271F]">{count}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4C453F]" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Pesquisar por artigo ou categoria..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F5F4F1] border border-[#E5DED6] rounded-xl text-xs sm:text-sm text-[#35271F] placeholder-[#4C453F]/60 focus:outline-none focus:border-[#C09573] transition-colors"
              />
            </div>
            {selectedBcgFilter !== 'all' && (
              <button
                onClick={() => setSelectedBcgFilter('all')}
                className="text-xs font-bold text-[#5E4939] hover:text-[#35271F] px-3.5 py-2.5 rounded-xl bg-[#EAE5DF] cursor-pointer"
              >
                Limpar Filtro ({selectedBcgFilter})
              </button>
            )}
          </div>

          {/* Spacious Products Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#E5DED6] max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs sm:text-sm text-[#35271F]">
              <thead className="bg-[#EAE5DF] sticky top-0 z-10 text-[#35271F] font-bold border-b border-[#E5DED6]">
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
              <tbody className="divide-y divide-[#E5DED6] bg-[#FFFFFF]">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#4C453F]">
                      Nenhum artigo encontrado para o filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const bcg = BCG_CONFIG[p.classification];
                    const Icon = bcg.icon;
                    return (
                      <tr key={p.productId} className="hover:bg-[#F5F4F1] transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${bcg.badgeStyle}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{bcg.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-bold text-[#35271F]">
                          {p.productName}
                          <span className="block text-xs text-[#4C453F] font-normal">
                            {p.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-[#35271F]">
                          {p.quantitySold}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-[#35271F]">
                          {p.unitPrice.toFixed(2)}€
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-[#5E4939] font-bold">
                          +{p.unitMargin.toFixed(2)}€{' '}
                          <span className="text-[11px] text-[#4C453F]">
                            ({p.marginPercent.toFixed(0)}%)
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-black text-[#35271F]">
                          {p.totalRevenue.toFixed(2)}€
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-[#C09573]">
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

        {/* Coluna 3: Market Basket / Top Combos de Cross-Selling */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-[#C09573] text-xs font-mono uppercase tracking-wider">
                <ShoppingBag className="w-4 h-4 text-[#C09573]" />
                Cross-Selling &amp; Cesta
              </div>
              <span className="text-xs font-mono font-bold text-[#5E4939] bg-[#EAE5DF] px-2.5 py-0.5 rounded-full border border-[#E5DED6]">
                Afinidade de Venda
              </span>
            </div>
            <h2 className="text-xl font-black text-[#35271F]">
              Top Combos Pedidos em Conjunto
            </h2>
            <p className="text-xs text-[#4C453F] mt-1">
              Probabilidade de compra combinada no mesmo pedido de mesa.
            </p>

            {summary.marketBasketCombos.length === 0 ? (
              <div className="py-12 text-center text-[#4C453F] text-xs">
                Ainda sem pedidos suficientes com múltiplos itens para calcular afinidade.
              </div>
            ) : (
              <div className="space-y-4 mt-5">
                {summary.marketBasketCombos.map((combo, idx) => (
                  <div
                    key={combo.id}
                    className="p-4 rounded-2xl bg-[#F5F4F1] border border-[#E5DED6] hover:border-[#C09573]/60 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#35271F] mb-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-6 h-6 rounded-lg bg-[#5E4939] text-[#F5F4F1] font-mono text-xs flex items-center justify-center flex-shrink-0 font-bold">
                          #{idx + 1}
                        </span>
                        <span className="truncate">{combo.itemA}</span>
                        <span className="text-[#C09573] text-sm">+</span>
                        <span className="text-[#5E4939] truncate">{combo.itemB}</span>
                      </div>
                      <span className="font-mono text-[#C09573] font-black text-sm flex-shrink-0 ml-2">
                        {combo.affinityPercent}%
                      </span>
                    </div>

                    {/* Progress indicator with required h-3 height and #C09573 fill */}
                    <div className="w-full bg-[#EAE5DF] h-3 rounded-full overflow-hidden my-2">
                      <div
                        style={{ width: `${Math.min(100, combo.affinityPercent)}%` }}
                        className="h-full bg-[#C09573] rounded-full transition-all duration-300"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#4C453F] font-semibold">
                      <span>{combo.coOccurrenceCount} pedidos combinados</span>
                      <span className="font-mono text-[#35271F] font-bold">
                        Méd: {combo.estimatedComboRevenue.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-[#EAE5DF] border border-[#E5DED6] text-xs text-[#35271F] leading-relaxed">
            <strong className="text-[#5E4939] block mb-1">Dica de Cardápio:</strong>
            Itens com afinidade superior a 60% devem ser promovidos como sugestão de acompanhamento no menu digital para maximizar o ticket médio.
          </div>
        </div>
      </div>

      {/* 5. SECÇÃO: MINERAÇÃO DE NOTAS & SIMULADOR WHAT-IF */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Painel Semântico de Observações (NLP em Português) */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-6 sm:p-8 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-[#C09573] text-xs font-mono uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4 text-[#C09573]" />
                Auditoria de Custos &amp; Preferências
              </div>
              {summary.totalMarginLeakageEur > 0 && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  -{summary.totalMarginLeakageEur.toFixed(2)}€ fuga estimada
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#35271F]">
              Mineração Semântica de Observações (NLP)
            </h2>
            <p className="text-xs sm:text-sm text-[#4C453F] mt-1">
              Discriminação entre preferências de confeção e pedidos de extras sem cobrança.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
              {/* Painel A: Fugas de Margem (Extras não cobrados) */}
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                  <span>Extras / Fugas de Margem</span>
                  <Flame className="w-4 h-4 text-rose-600" />
                </div>
                {summary.marginLeakages.length === 0 ? (
                  <p className="text-xs text-[#4C453F] py-3 text-center">
                    Sem pedidos de molhos/extras não cobrados registados.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {summary.marginLeakages.slice(0, 5).map((leak) => (
                      <div
                        key={leak.term}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#FFFFFF] border border-rose-200/60 shadow-2xs"
                      >
                        <div>
                          <span className="font-bold text-[#35271F] block">{leak.term}</span>
                          <span className="text-[10px] text-[#4C453F]">{leak.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-rose-700 font-bold block">
                            {leak.count}x
                          </span>
                          <span className="text-[10px] font-mono text-[#4C453F]">
                            ~{leak.totalEstimatedLossEur.toFixed(2)}€
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel B: Preferências Operacionais */}
              <div className="p-4 rounded-2xl bg-[#F5F4F1] border border-[#E5DED6] space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-[#35271F]">
                  <span>Preferências de Clientes</span>
                  <CheckCircle2 className="w-4 h-4 text-[#5E4939]" />
                </div>
                {summary.operationalPreferences.length === 0 ? (
                  <p className="text-xs text-[#4C453F] py-3 text-center">
                    Sem preferências operacionais registadas no período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {summary.operationalPreferences.slice(0, 5).map((op) => (
                      <div
                        key={op.term}
                        className="flex items-center justify-between text-xs p-2 rounded-xl bg-[#FFFFFF] border border-[#E5DED6] shadow-2xs"
                      >
                        <span className="font-bold text-[#35271F]">{op.term}</span>
                        <span className="font-mono text-[#5E4939] font-bold px-2 py-0.5 rounded bg-[#EAE5DF]">
                          {op.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Nuvem de Tags Expandida */}
            <div className="mt-5 pt-4 border-t border-[#E5DED6]">
              <span className="text-xs font-bold text-[#4C453F] uppercase tracking-wider block mb-2.5">
                Termos Mais Frequentes nas Notas:
              </span>
              <div className="flex flex-wrap gap-2">
                {summary.topNoteTerms.slice(0, 10).map((t) => (
                  <span
                    key={t.term}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EAE5DF] text-[#35271F] border border-[#E5DED6]"
                  >
                    <span>{t.term}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#FFFFFF] text-[#5E4939] font-mono font-bold shadow-2xs text-[11px]">
                      {t.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#EAE5DF] border border-[#E5DED6] text-xs text-[#35271F]">
            <strong className="text-[#5E4939]">Ação Recomendada:</strong> Se os clientes pedem com frequência &quot;molho extra&quot; ou &quot;mais batatas&quot; nas notas, adicione estes adicionais como opções pagas no menu digital para proteger as margens.
          </div>
        </div>

        {/* Simulador Dinâmico "What-If" */}
        <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#C09573] text-xs font-mono uppercase tracking-wider mb-1">
                <Sliders className="w-4 h-4 text-[#C09573]" />
                Simulador Estratégico &quot;What-If&quot;
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-[#35271F]">
                Impacto de Ajuste de Preço
              </h2>
              <p className="text-xs text-[#4C453F] mt-0.5">
                Simule variações e calcule o ganho projetado em lucro bruto.
              </p>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5">
              {[2, 5, 10, 15].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setSimulatedPriceAdjustmentPct(pct)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    simulatedPriceAdjustmentPct === pct
                      ? 'bg-[#5E4939] text-[#F5F4F1] shadow-xs'
                      : 'bg-[#EAE5DF] text-[#35271F] hover:bg-[#E5DED6]'
                  }`}
                >
                  +{pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Sliders in brand colors */}
          <div className="space-y-4 p-5 rounded-2xl bg-[#F5F4F1] border border-[#E5DED6]">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#35271F] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#C09573]" />
                  Ajuste Médio de PVP
                </span>
                <span className="font-mono text-[#5E4939] font-black text-sm">
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
                className="w-full accent-[#C09573] cursor-pointer h-2 bg-[#EAE5DF] rounded-lg"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-bold text-[#35271F] mb-1.5">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#C09573]" />
                  Elasticidade da Procura
                </span>
                <span className="font-mono text-[#5E4939] font-bold text-xs">
                  {demandElasticity === 0
                    ? 'Inelástica (0)'
                    : demandElasticity === -0.2
                    ? 'Conservadora (-0.2)'
                    : 'Moderada (-0.4)'}
                </span>
              </div>
              <div className="flex gap-2">
                {[
                  { val: 0, label: 'Inelástica (0)' },
                  { val: -0.2, label: 'Conservadora (-0.2)' },
                  { val: -0.4, label: 'Moderada (-0.4)' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setDemandElasticity(opt.val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      demandElasticity === opt.val
                        ? 'border-[#5E4939] bg-[#5E4939] text-[#F5F4F1]'
                        : 'border-[#E5DED6] bg-[#FFFFFF] text-[#4C453F] hover:bg-[#EAE5DF]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#EAE5DF] border border-[#E5DED6]">
              <span className="text-xs font-bold text-[#4C453F] block mb-1">
                Lucro Bruto Adicional
              </span>
              <div className="text-2xl font-mono font-black text-[#5E4939]">
                +{simulationResults.profitDelta.toLocaleString('pt-PT', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </div>
              <span className="text-[11px] text-[#4C453F] font-semibold mt-1 block">
                Novo Total: {simulationResults.newProfit.toFixed(2)}€
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F4F1] border border-[#E5DED6]">
              <span className="text-xs font-bold text-[#4C453F] block mb-1">
                Nova Faturação Estimada
              </span>
              <div className="text-2xl font-mono font-black text-[#35271F]">
                {simulationResults.newRevenue.toLocaleString('pt-PT', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </div>
              <span className="text-[11px] text-[#C09573] font-bold mt-1 block">
                +{simulationResults.revenueDelta.toFixed(2)}€ receita
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F4F1] border border-[#E5DED6]">
              <span className="text-xs font-bold text-[#4C453F] block mb-1">
                Expansão de Margem
              </span>
              <div className="text-2xl font-mono font-black text-[#C09573]">
                +{simulationResults.marginExpansionPct}%
              </div>
              <span className="text-[11px] text-[#4C453F] mt-1 block">
                Base: {summary.whatIfBaseline.currentMarginPercent.toFixed(1)}%
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F4F1] border border-[#E5DED6]">
              <span className="text-xs font-bold text-[#4C453F] block mb-1">
                Impacto Médio / Mesa
              </span>
              <div className="text-2xl font-mono font-black text-[#35271F]">
                +{simulationResults.ticketDelta.toFixed(2)}€
              </div>
              <span className="text-[11px] text-[#4C453F] mt-1 block">
                por cliente atendido
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. ANÁLISE DE MESAS & ESPAÇO */}
      <div className="rounded-2xl bg-[#FFFFFF] border border-[#E5DED6] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E5DED6]">
          <div>
            <div className="flex items-center gap-2 text-[#C09573] text-xs font-mono uppercase tracking-wider mb-1">
              <ArrowUpRight className="w-4 h-4 text-[#C09573]" />
              Faturação por Mesa &amp; Sala
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#35271F]">
              Performance de Espaço &amp; Mesas
            </h2>
          </div>
          <span className="text-xs font-mono font-bold text-[#5E4939] bg-[#EAE5DF] px-3 py-1.5 rounded-xl border border-[#E5DED6]">
            {summary.tablePerformance.length} Mesas Faturadas
          </span>
        </div>

        {summary.tablePerformance.length === 0 ? (
          <div className="py-8 text-center text-[#4C453F] text-xs">
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
                  className="p-4 rounded-2xl bg-[#F5F4F1] border border-[#E5DED6] hover:border-[#C09573]/60 transition-all"
                >
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#35271F] mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-[#5E4939] text-[#F5F4F1] font-mono text-[10px] flex items-center justify-center font-bold">
                        #{idx + 1}
                      </span>
                      <span>Mesa {tbl.tableNumber}</span>
                    </div>
                    <span className="font-mono text-[#5E4939] font-black">
                      {tbl.totalRevenue.toFixed(2)}€
                    </span>
                  </div>

                  <div className="w-full bg-[#EAE5DF] h-2 rounded-full overflow-hidden my-2">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-[#C09573] rounded-full transition-all duration-300"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-[#4C453F] pt-1">
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
