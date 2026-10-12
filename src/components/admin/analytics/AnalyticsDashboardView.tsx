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
    glowBorder: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  star: {
    label: 'Estrela',
    description: 'Alto volume e alta margem',
    badgeStyle: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
    glowBorder: 'border-amber-500/30 hover:border-amber-400/50',
    icon: Sparkles,
  },
  plowhorse: {
    label: 'Cavalo de Batalha',
    description: 'Alto volume e menor margem',
    badgeStyle: 'bg-sky-400/10 text-sky-300 border-sky-400/25',
    glowBorder: 'border-sky-500/30 hover:border-sky-400/50',
    icon: Award,
  },
  puzzle: {
    label: 'Quebra-Cabeças',
    description: 'Baixo volume e alta margem',
    badgeStyle: 'bg-purple-400/10 text-purple-300 border-purple-400/25',
    glowBorder: 'border-purple-500/30 hover:border-purple-400/50',
    icon: HelpCircle,
  },
  dog: {
    label: 'Inerte / Cão',
    description: 'Baixo volume e baixa rentabilidade',
    badgeStyle: 'bg-rose-400/10 text-rose-300 border-rose-400/25',
    glowBorder: 'border-rose-500/30 hover:border-rose-400/50',
    icon: Footprints,
  },
};

function Sparkline({
  data,
  color = '#10b981',
  gradientId,
  height = 32,
  width = 96,
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
    const y = height - ((val - min) / range) * (height - 8) - 4;
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
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
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
    // Volume adjustment based on elasticity: % delta volume = elasticity * % delta price
    const volumeMultiplier = 1 + (demandElasticity * simulatedPriceAdjustmentPct) / 100;

    const simulatedUnits = baseline.totalUnitsSold * volumeMultiplier;
    const simulatedPrice = baseline.averageUnitPrice * priceMultiplier;
    const simulatedRevenue = simulatedUnits * simulatedPrice;

    // Costs scale with units produced
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
    <div className="space-y-8 pb-16 text-zinc-100 font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* 1. CABEÇALHO EXECUTIVO (Stripe / Linear / Vercel Pattern) */}
      <div className="relative rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/70 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Directional ambient glows */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wide bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE SYNC
              </span>
              <span className="text-xs font-mono text-zinc-400">
                v2.4 Executivo • {restaurantName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 flex items-center gap-3">
              Centro de Comando & BI
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl leading-relaxed">
              Análise preditiva de faturação, matriz BCG de rentabilidade, cesta de compras cruzadas e auditoria de fugas operacionais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector Toggle */}
            <div className="inline-flex p-1 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl shadow-inner">
              {(['today', '7days', '30days'] as AnalyticsPeriod[]).map((p) => {
                const isActive = period === p;
                return (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    disabled={isPending}
                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                        : 'text-zinc-400 hover:text-zinc-200'
                    } disabled:opacity-50`}
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/60 text-xs sm:text-sm font-semibold text-zinc-100 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className={`w-4 h-4 text-emerald-400 ${isExporting ? 'animate-bounce' : ''}`} />
              <span>{isExporting ? 'A Exportar...' : 'Exportar Relatório'}</span>
            </button>
          </div>
        </div>

        {isPending && (
          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-emerald-400 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>A sincronizar modelos preditivos com o Supabase...</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* 2. FAIXA DE KPIS COM SPARKLINES (5 CARDS EXECUTIVOS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Faturação Total */}
        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/60 p-5 relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/50 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Faturação Total</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-semibold tracking-tight text-zinc-100">
            {summary.totalRevenue.toLocaleString('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
              <span>{summary.runRate.hourlyVelocity.toFixed(2)}€/h</span>
            </div>
            <Sparkline
              data={summary.sparklines.revenuePoints}
              color="#10b981"
              gradientId="kpi-rev"
            />
          </div>
        </div>

        {/* KPI 2: Ticket Médio */}
        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/60 p-5 relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-sky-500/0 via-sky-500/50 to-sky-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Ticket Médio</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-semibold tracking-tight text-zinc-100">
            {summary.averageTicket.toLocaleString('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            })}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] text-zinc-400">
              {summary.totalOrders} faturados
            </div>
            <Sparkline
              data={summary.sparklines.ordersPoints}
              color="#0ea5e9"
              gradientId="kpi-orders"
            />
          </div>
        </div>

        {/* KPI 3: Cumprimento SLA (<20m) */}
        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/60 p-5 relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Cumprimento SLA</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                summary.slaComplianceRate >= 80
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {summary.slaComplianceRate >= 80 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <div className="text-2xl font-mono font-semibold tracking-tight text-zinc-100">
            {summary.slaComplianceRate}%
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                summary.slaViolationCount > 0
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'bg-emerald-500/15 text-emerald-300'
              }`}
            >
              {summary.slaViolationCount} violações (&gt;20m)
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Méd: {summary.averageTurnaroundMinutes}m
            </span>
          </div>
        </div>

        {/* KPI 4: Volume & Velocidade */}
        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/60 p-5 relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-purple-500/0 via-purple-500/50 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Ritmo de Pedidos</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-semibold tracking-tight text-zinc-100">
            {summary.totalOrders} <span className="text-sm font-normal text-zinc-400">pedidos</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-mono text-purple-400">
              {summary.runRate.ordersVelocity} ped/h
            </span>
            <Sparkline
              data={summary.sparklines.ordersPoints}
              color="#a855f7"
              gradientId="kpi-orders-pace"
            />
          </div>
        </div>

        {/* KPI 5: Projeção de Fecho / Run-Rate */}
        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/60 p-5 relative overflow-hidden group hover:border-zinc-700/80 transition-all">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-zinc-400">Projeção Live</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-mono font-semibold tracking-tight text-zinc-100">
            {summary.runRate.projectedPeriodRevenue.toLocaleString('pt-PT', {
              style: 'currency',
              currency: 'EUR',
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{summary.runRate.projectionLabel}</span>
            <span className="text-amber-400 font-bold uppercase text-[10px]">
              {summary.runRate.paceIndicator === 'high' ? 'Acelerado' : 'Estável'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SECÇÃO 1: ENGENHARIA DE MENU & CROSS-SELLING */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna 1 & 2: Matriz BCG Interativa */}
        <div className="lg:col-span-2 rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/70 p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wider mb-1">
                <Layers className="w-4 h-4" />
                Matriz BCG de Engenharia de Menu
              </div>
              <h2 className="text-xl font-bold text-zinc-100">
                Rentabilidade & Desempenho por Artigo
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
                    className={`px-3 py-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? `${cfg.badgeStyle} ring-1 ring-white/20`
                        : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <div className="text-[10px] font-semibold truncate">{cfg.label}</div>
                    <div className="text-lg font-mono font-bold text-zinc-100">{count}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Filtrar por nome do artigo ou categoria..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-950/60 border border-zinc-800/80 rounded-xl text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            {selectedBcgFilter !== 'all' && (
              <button
                onClick={() => setSelectedBcgFilter('all')}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-xl bg-zinc-800/50"
              >
                Limpar ({selectedBcgFilter})
              </button>
            )}
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto rounded-2xl border border-zinc-800/70 max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/90 sticky top-0 z-10 text-zinc-400 font-semibold border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Classificação</th>
                  <th className="py-2.5 px-3">Artigo</th>
                  <th className="py-2.5 px-3 text-right">Qtd.</th>
                  <th className="py-2.5 px-3 text-right">PVP</th>
                  <th className="py-2.5 px-3 text-right">Margem Unit.</th>
                  <th className="py-2.5 px-3 text-right">Faturação</th>
                  <th className="py-2.5 px-3 text-right">Lucro Bruto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 bg-zinc-900/20">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      Nenhum artigo encontrado para o filtro atual.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const bcg = BCG_CONFIG[p.classification];
                    const Icon = bcg.icon;
                    return (
                      <tr key={p.productId} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${bcg.badgeStyle}`}
                          >
                            <Icon className="w-3 h-3" />
                            <span>{bcg.label}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-zinc-100">
                          {p.productName}
                          <span className="block text-[10px] text-zinc-400 font-normal">
                            {p.categoryName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-200">
                          {p.quantitySold}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                          {p.unitPrice.toFixed(2)}€
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                          +{p.unitMargin.toFixed(2)}€{' '}
                          <span className="text-[10px] text-zinc-400">
                            ({p.marginPercent.toFixed(0)}%)
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-100">
                          {p.totalRevenue.toFixed(2)}€
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
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
        <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/70 p-6 sm:p-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sky-400 text-xs font-mono uppercase tracking-wider">
                <ShoppingBag className="w-4 h-4" />
                Cross-Selling & Cesta
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
                Afinidade de Venda
              </span>
            </div>
            <h2 className="text-xl font-bold text-zinc-100">
              Top Combos Pedidos em Conjunto
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Probabilidade de compra combinada no mesmo pedido de cliente.
            </p>

            {summary.marketBasketCombos.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                Ainda sem pedidos suficientes com múltiplos itens para calcular afinidade.
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {summary.marketBasketCombos.map((combo, idx) => (
                  <div
                    key={combo.id}
                    className="p-3.5 rounded-2xl bg-zinc-950/50 border border-zinc-800/70 hover:border-zinc-700/80 transition-all"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-200 mb-1.5">
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[10px] flex items-center justify-center flex-shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="truncate">{combo.itemA}</span>
                        <span className="text-zinc-500 text-[10px]">+</span>
                        <span className="text-emerald-400 truncate">{combo.itemB}</span>
                      </div>
                      <span className="font-mono text-sky-300 text-xs flex-shrink-0 ml-2">
                        {combo.affinityPercent}%
                      </span>
                    </div>

                    {/* Progress indicator of affinity */}
                    <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden my-1.5">
                      <div
                        style={{ width: `${Math.min(100, combo.affinityPercent)}%` }}
                        className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{combo.coOccurrenceCount} pedidos combinados</span>
                      <span className="font-mono text-zinc-300">
                        Méd: {combo.estimatedComboRevenue.toFixed(2)}€
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800/60 text-[11px] text-zinc-400 leading-relaxed">
            <strong className="text-zinc-300 block mb-0.5">Sugestão de Cardápio:</strong>
            Itens com afinidade superior a 60% devem ser promovidos como sugestão de acompanhamento no ecrã de checkout para elevar o ticket médio.
          </div>
        </div>
      </div>

      {/* 4. SECÇÃO 2: RITMO DE COZINHA & MINERAÇÃO SEMÂNTICA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Coluna 1: Histograma SVG com Fluxo Horário */}
        <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/70 p-6 sm:p-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wider mb-1">
                <Clock className="w-4 h-4" />
                Pressão Operacional de Cozinha
              </div>
              <h2 className="text-xl font-bold text-zinc-100">
                Fluxo Horário &amp; Picos de Serviço
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-400">00:00 — 23:00</span>
          </div>

          {/* SVG Histogram with rounded corners & gradients */}
          <div className="w-full overflow-x-auto pb-2 pt-4">
            <div className="min-w-[550px] h-48 relative flex items-end gap-1.5 pb-6 border-b border-zinc-800/80">
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
                    {/* Hover Tooltip */}
                    <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 text-zinc-100 text-[11px] rounded-lg py-1 px-2 pointer-events-none whitespace-nowrap shadow-xl z-20 border border-zinc-700">
                      <div className="font-bold">{h.hourLabel}</div>
                      <div>{h.orderCount} pedidos • {h.totalRevenue.toFixed(2)}€</div>
                      <div className="text-amber-300">Tempo médio: {h.avgTurnaroundMinutes} min</div>
                    </div>

                    {h.orderCount > 0 && (
                      <span className="text-[10px] font-mono text-zinc-400 mb-1 group-hover:text-zinc-100 transition-colors">
                        {h.orderCount}
                      </span>
                    )}

                    {/* Bar with rx="4" */}
                    <div
                      style={{ height: `${Math.max(heightPct, 4)}%` }}
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        h.orderCount === 0
                          ? 'bg-zinc-800/30'
                          : isPeak
                          ? 'bg-gradient-to-t from-emerald-600 via-amber-400 to-amber-300 shadow-md shadow-amber-500/20'
                          : 'bg-gradient-to-t from-emerald-600 to-emerald-400 group-hover:brightness-125'
                      }`}
                    />

                    <span className="absolute -bottom-5 text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300">
                      {h.hour}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
            <span>Serviço Almoço (12h-15h)</span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-emerald-600 to-amber-400 inline-block" />
              <span>Hora de Pico Máximo</span>
            </div>
            <span>Serviço Jantar (19h-23h)</span>
          </div>
        </div>

        {/* Coluna 2: Mineração Semântica de Observações */}
        <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/70 p-6 sm:p-7 space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-mono uppercase tracking-wider">
                <AlertOctagon className="w-4 h-4" />
                Auditoria de Custos &amp; Preferências
              </div>
              {summary.totalMarginLeakageEur > 0 && (
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  -{summary.totalMarginLeakageEur.toFixed(2)}€ fuga estimada
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-zinc-100">
              Mineração Semântica de Observações (NLP)
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Classificação entre customizações operacionais e pedidos de adicionais sem cobrança.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {/* Painel A: Fugas de Margem (Extras não cobrados) */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-rose-500/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                  <span>Extras / Fugas de Margem</span>
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                </div>
                {summary.marginLeakages.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 py-3 text-center">
                    Sem pedidos de molhos/extras não cobrados registados.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {summary.marginLeakages.slice(0, 5).map((leak) => (
                      <div
                        key={leak.term}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800"
                      >
                        <div>
                          <span className="font-semibold text-zinc-200 block">{leak.term}</span>
                          <span className="text-[10px] text-zinc-400">{leak.category}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-rose-400 font-bold block">
                            {leak.count}x
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            ~{leak.totalEstimatedLossEur.toFixed(2)}€
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel B: Preferências Operacionais */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                  <span>Preferências de Clientes</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                </div>
                {summary.operationalPreferences.length === 0 ? (
                  <p className="text-[11px] text-zinc-500 py-3 text-center">
                    Sem preferências ou notas operacionais no período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {summary.operationalPreferences.slice(0, 5).map((op) => (
                      <div
                        key={op.term}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800"
                      >
                        <span className="font-semibold text-zinc-200">{op.term}</span>
                        <span className="font-mono text-sky-300 font-bold px-1.5 py-0.5 rounded bg-sky-500/10">
                          {op.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-200">
            <strong>Recomendação de Gestão:</strong> Se o cliente pede repetidamente &quot;molho extra&quot; ou &quot;mais batatas&quot; nas notas, adicione essa opção como modificador pago (+0,75€) no menu para estancar a perda de margem.
          </div>
        </div>
      </div>

      {/* 5. SECÇÃO 3: SIMULADOR DINÂMICO &quot;WHAT-IF&quot; (SUPORTE À DECISÃO) */}
      <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/70 p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">
              <Sliders className="w-4 h-4" />
              Simulador Estratégico &quot;What-If&quot;
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-zinc-100">
              Projeção de Elasticidade &amp; Impacto na Margem
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Simule ajustes de preços e veja instantaneamente o impacto no lucro bruto e na receita com base nas vendas reais registadas.
            </p>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Ajuste Rápido:</span>
            {[2, 5, 10, 15].map((pct) => (
              <button
                key={pct}
                onClick={() => setSimulatedPriceAdjustmentPct(pct)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  simulatedPriceAdjustmentPct === pct
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                +{pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Sliders and Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
          {/* Slider 1: Ajuste de Preço (%) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-300 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-400" />
                Variação Média de Preço
              </span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
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
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-zinc-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0% (Sem alteração)</span>
              <span>+10%</span>
              <span>+25% (Agressivo)</span>
            </div>
          </div>

          {/* Slider 2: Sensibilidade de Elasticidade da Procura */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-zinc-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                Elasticidade da Procura (Sensibilidade ao Preço)
              </span>
              <span className="font-mono text-sky-400 font-bold text-sm">
                {demandElasticity === 0
                  ? 'Inelástica (0.0)'
                  : demandElasticity === -0.2
                  ? 'Conservadora (-0.2)'
                  : demandElasticity === -0.4
                  ? 'Moderada (-0.4)'
                  : `${demandElasticity}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDemandElasticity(0)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  demandElasticity === 0
                    ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Inelástica (0)
              </button>
              <button
                onClick={() => setDemandElasticity(-0.2)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  demandElasticity === -0.2
                    ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Conservadora (-0.2)
              </button>
              <button
                onClick={() => setDemandElasticity(-0.4)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  demandElasticity === -0.4
                    ? 'border-sky-500 bg-sky-500/15 text-sky-200'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Moderada (-0.4)
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              * A elasticidade estima a eventual retração de volume quando o preço sobe.
            </p>
          </div>
        </div>

        {/* Live Simulation Projection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Card 1: Ganho de Lucro Bruto */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-emerald-500/30">
            <span className="text-xs text-zinc-400 block mb-1">Lucro Bruto Adicional</span>
            <div className="text-2xl font-mono font-bold text-emerald-400">
              +{simulationResults.profitDelta.toLocaleString('pt-PT', {
                style: 'currency',
                currency: 'EUR',
              })}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Novo Total: {simulationResults.newProfit.toFixed(2)}€
            </span>
          </div>

          {/* Card 2: Nova Faturação Projetada */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 block mb-1">Nova Faturação Projetada</span>
            <div className="text-2xl font-mono font-bold text-zinc-100">
              {simulationResults.newRevenue.toLocaleString('pt-PT', {
                style: 'currency',
                currency: 'EUR',
              })}
            </div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              +{simulationResults.revenueDelta.toFixed(2)}€ de receita
            </span>
          </div>

          {/* Card 3: Expansão da Margem */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 block mb-1">Expansão de Margem Bruta</span>
            <div className="text-2xl font-mono font-bold text-sky-400">
              +{simulationResults.marginExpansionPct}%
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              Base: {summary.whatIfBaseline.currentMarginPercent.toFixed(1)}%
            </span>
          </div>

          {/* Card 4: Impacto no Ticket Médio */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 block mb-1">Impacto Médio por Pedido</span>
            <div className="text-2xl font-mono font-bold text-amber-400">
              +{simulationResults.ticketDelta.toFixed(2)}€
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">
              por cada mesa atendida
            </span>
          </div>
        </div>
      </div>

      {/* 6. ANÁLISE DE MESAS & ESPAÇO */}
      <div className="rounded-3xl bg-zinc-900/60 backdrop-blur-md border border-zinc-800/70 p-6 sm:p-7 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">
              <ArrowUpRight className="w-4 h-4" />
              Ranking de Mesas &amp; Faturação de Sala
            </div>
            <h2 className="text-xl font-bold text-zinc-100">
              Desempenho por Mesa &amp; Zona
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-400 bg-zinc-950 px-3 py-1 rounded-xl border border-zinc-800">
            {summary.tablePerformance.length} Mesas Faturadas
          </span>
        </div>

        {summary.tablePerformance.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            Sem mesas faturadas no período.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {summary.tablePerformance.slice(0, 8).map((tbl, idx) => {
              const pct =
                maxTableRevenue > 0
                  ? Math.round((tbl.totalRevenue / maxTableRevenue) * 100)
                  : 0;

              return (
                <div
                  key={tbl.tableNumber}
                  className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-200 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md bg-zinc-800 text-zinc-400 font-mono text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span>Mesa {tbl.tableNumber}</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">
                      {tbl.totalRevenue.toFixed(2)}€
                    </span>
                  </div>

                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full overflow-hidden my-2">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
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
