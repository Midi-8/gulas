'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedStaff, canManageCatalogAndAnalytics } from '@/lib/auth/staff';

export type AnalyticsPeriod = 'today' | '7days' | '30days' | 'all';

export type BcgCategory = 'star' | 'plowhorse' | 'puzzle' | 'dog';

export interface BcgProductMetric {
  productId: string;
  productName: string;
  categoryName: string;
  quantitySold: number;
  unitPrice: number;
  unitCost: number;
  unitMargin: number;
  marginPercent: number;
  totalRevenue: number;
  totalProfit: number;
  classification: BcgCategory;
}

export interface TableMetric {
  tableNumber: number;
  orderCount: number;
  totalRevenue: number;
  averageTicket: number;
  avgTurnaroundMinutes: number;
}

export interface HourlyMetric {
  hour: number;
  hourLabel: string;
  orderCount: number;
  totalRevenue: number;
  avgTurnaroundMinutes: number;
}

export interface NoteProductBreakdown {
  productName: string;
  count: number;
}

export interface NoteTermMetric {
  term: string;
  count: number;
  topProducts: NoteProductBreakdown[];
}

export interface MarketBasketCombo {
  id: string;
  itemA: string;
  itemB: string;
  coOccurrenceCount: number;
  affinityPercent: number; // % dos pedidos de itemA que também têm itemB
  estimatedComboRevenue: number;
}

export interface OperationalPreferenceMetric {
  term: string;
  count: number;
  type: 'dietary' | 'preparation' | 'removal' | 'service';
  topProducts: NoteProductBreakdown[];
}

export interface MarginLeakageMetric {
  term: string;
  count: number;
  category: string;
  estimatedCostPerUnit: number;
  totalEstimatedLossEur: number;
  topProducts: NoteProductBreakdown[];
}

export interface RunRateMetrics {
  hourlyVelocity: number; // € / hora
  ordersVelocity: number; // pedidos / hora
  projectedPeriodRevenue: number; // Projeção do fecho de turno ou do mês
  projectionLabel: string;
  paceIndicator: 'high' | 'normal' | 'moderate';
}

export interface SparklineData {
  revenuePoints: number[];
  ordersPoints: number[];
  turnaroundPoints: number[];
}

export interface WhatIfBaseline {
  totalUnitsSold: number;
  averageUnitPrice: number;
  averageUnitCost: number;
  currentRevenue: number;
  currentGrossProfit: number;
  currentMarginPercent: number;
}

export interface PeriodComparisonMetrics {
  previousLabel: string;
  hasComparison: boolean;
  revenueDeltaPercent: number | null;
  ordersDeltaPercent: number | null;
  ticketDeltaPercent: number | null;
  slaDeltaPoints: number | null;
  previousRevenue: number;
  previousOrders: number;
}

export interface ChannelMetricItem {
  channel: 'dine_in' | 'takeaway';
  label: string;
  orderCount: number;
  revenue: number;
  revenueSharePercent: number;
  averageTicket: number;
  avgTurnaroundMinutes: number;
}

export interface ChannelSplitMetrics {
  dineIn: ChannelMetricItem;
  takeaway: ChannelMetricItem;
}

export interface StationPerformanceMetric {
  station: 'bar' | 'kitchen';
  label: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  revenueSharePercent: number;
  marginPercent: number;
}

export interface CategoryPerformanceMetric {
  categoryName: string;
  categorySlug: string;
  station: 'bar' | 'kitchen';
  unitsSold: number;
  revenue: number;
  profit: number;
  marginPercent: number;
  revenueSharePercent: number;
}

export interface CancelledProductMetric {
  productName: string;
  categoryName: string;
  cancelledQty: number;
  lostRevenue: number;
}

export interface CancellationAnalytics {
  cancelledOrdersCount: number;
  cancellationRatePercent: number;
  lostRevenueEur: number;
  avgCancelledTicketEur: number;
  topCancelledProducts: CancelledProductMetric[];
}

export interface UnsoldProductMetric {
  productId: string;
  productName: string;
  categoryName: string;
  unitPrice: number;
  isAvailable: boolean;
}

export interface AnalyticsSummary {
  period: AnalyticsPeriod;
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  averageTurnaroundMinutes: number;
  slaViolationCount: number;
  slaViolationRate: number;
  slaComplianceRate: number;
  menuEngineering: BcgProductMetric[];
  bcgSummary: {
    starsCount: number;
    plowhorsesCount: number;
    puzzlesCount: number;
    dogsCount: number;
  };
  tablePerformance: TableMetric[];
  hourlyPerformance: HourlyMetric[];
  topNoteTerms: NoteTermMetric[];
  // Novos Motores Analíticos Preditivos & Estratégicos:
  runRate: RunRateMetrics;
  marketBasketCombos: MarketBasketCombo[];
  operationalPreferences: OperationalPreferenceMetric[];
  marginLeakages: MarginLeakageMetric[];
  totalMarginLeakageEur: number;
  sparklines: SparklineData;
  whatIfBaseline: WhatIfBaseline;
  periodComparison: PeriodComparisonMetrics;
  channelSplit: ChannelSplitMetrics;
  stationSplit: StationPerformanceMetric[];
  categoryPerformance: CategoryPerformanceMetric[];
  cancellations: CancellationAnalytics;
  unsoldProducts: UnsoldProductMetric[];
}

export type AnalyticsActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

interface RawAnalyticsOrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost?: number | null;
  notes: string | null;
  products?: {
    cost?: number | null;
    price: number | null;
    categories?: {
      name: string;
      slug: string;
    } | null;
  } | null;
}

interface RawAnalyticsOrder {
  id: string;
  order_number: number;
  table_number: number;
  status: string;
  subtotal: number;
  total: number;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: RawAnalyticsOrderItem[] | null;
}

interface RawCatalogProductRow {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  categories:
    | { name: string; slug: string }
    | Array<{ name: string; slug: string }>
    | null;
}

interface PeriodWindows {
  currentStartMs: number | null;
  previousStartMs: number | null;
  previousStartIso: string | null;
  previousLabel: string;
  hasComparison: boolean;
}

function getPeriodWindows(period: AnalyticsPeriod): PeriodWindows {
  const now = new Date();
  if (period === 'today') {
    const currentStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    const previousStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
      0
    );
    return {
      currentStartMs: currentStart.getTime(),
      previousStartMs: previousStart.getTime(),
      previousStartIso: previousStart.toISOString(),
      previousLabel: 'vs. ontem',
      hasComparison: true,
    };
  }
  if (period === '7days') {
    const dayMs = 24 * 60 * 60 * 1000;
    const currentStart = new Date(now.getTime() - 7 * dayMs);
    const previousStart = new Date(now.getTime() - 14 * dayMs);
    return {
      currentStartMs: currentStart.getTime(),
      previousStartMs: previousStart.getTime(),
      previousStartIso: previousStart.toISOString(),
      previousLabel: 'vs. 7 dias ant.',
      hasComparison: true,
    };
  }
  if (period === '30days') {
    const dayMs = 24 * 60 * 60 * 1000;
    const currentStart = new Date(now.getTime() - 30 * dayMs);
    const previousStart = new Date(now.getTime() - 60 * dayMs);
    return {
      currentStartMs: currentStart.getTime(),
      previousStartMs: previousStart.getTime(),
      previousStartIso: previousStart.toISOString(),
      previousLabel: 'vs. 30 dias ant.',
      hasComparison: true,
    };
  }
  return {
    currentStartMs: null,
    previousStartMs: null,
    previousStartIso: null,
    previousLabel: 'Histórico global',
    hasComparison: false,
  };
}

function getStartDateForPeriod(period: AnalyticsPeriod): string | null {
  const { currentStartMs } = getPeriodWindows(period);
  return currentStartMs !== null ? new Date(currentStartMs).toISOString() : null;
}

function computePercentDelta(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function resolveStation(categorySlug?: string | null): 'bar' | 'kitchen' {
  return (categorySlug || '').toLowerCase().includes('bebida') ? 'bar' : 'kitchen';
}

function resolveItemUnitCost(item: RawAnalyticsOrderItem): number {
  let unitCost =
    item.unit_cost !== undefined && item.unit_cost !== null
      ? Number(item.unit_cost)
      : null;
  if (unitCost === null && item.products?.cost !== null && item.products?.cost !== undefined) {
    unitCost = Number(item.products.cost);
  }
  if (unitCost === null || Number.isNaN(unitCost) || unitCost < 0) {
    return 0;
  }
  return Math.round(unitCost * 100) / 100;
}

const STOPWORDS_PT = new Set([
  'de', 'a', 'o', 'que', 'e', 'do', 'da', 'em', 'um', 'para',
  'com', 'nao', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais',
  'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à',
  'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já',
  'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela',
  'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'quem',
  'nas', 'me', 'esse', 'eles', 'estão', 'você', 'tinha', 'foram', 'essa',
  'num', 'nem', 'suas', 'meu', 'às', 'minha', 'têm', 'numa', 'pelos',
  'elas', 'havia', 'seja', 'qual', 'será', 'nós', 'tenho', 'lhe', 'deles',
  'essas', 'esses', 'pelas', 'este', 'fosse', 'dele', 'tu', 'te', 'vocês',
  'vos', 'lhes', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'nosso',
  'nossa', 'nossos', 'nossas', 'dela', 'delas', 'esta', 'estes', 'estas',
  'aquele', 'aquela', 'aqueles', 'aquelas', 'isto', 'aquilo', 'estou', 'está',
  'estamos', 'estão', 'estive', 'esteve', 'estivemos', 'estiveram', 'estava',
  'estávamos', 'estavam', 'favor', 'porfavor', 'pf', 'pff', 'sff', 'obrigado',
  'obrigada', 'bem', 'mal', 'tudo', 'pouco',
]);

const LEAKAGE_DICTIONARY = [
  { pattern: 'molho extra', term: 'Molho Extra', category: 'Molhos & Condimentos', cost: 0.75 },
  { pattern: 'manteiga extra', term: 'Manteiga Extra', category: 'Pão & Entradas', cost: 0.60 },
  { pattern: 'dose extra', term: 'Dose Extra', category: 'Guarnições', cost: 2.00 },
  { pattern: 'dose reforçada', term: 'Dose Reforçada', category: 'Guarnições', cost: 2.50 },
  { pattern: 'reforçado', term: 'Porção Reforçada', category: 'Guarnições', cost: 1.80 },
  { pattern: 'mais batatas', term: 'Batatas Adicionais', category: 'Guarnições', cost: 1.50 },
  { pattern: 'mais molho', term: 'Molho Adicional', category: 'Molhos & Condimentos', cost: 0.75 },
  { pattern: 'queijo extra', term: 'Queijo Extra', category: 'Toppings', cost: 1.00 },
  { pattern: 'pão extra', term: 'Pão Adicional', category: 'Pão & Entradas', cost: 0.80 },
  { pattern: 'ovo extra', term: 'Ovo Adicional', category: 'Toppings', cost: 0.90 },
  { pattern: 'bacon extra', term: 'Bacon Adicional', category: 'Toppings', cost: 1.20 },
  { pattern: 'maionese extra', term: 'Maionese Extra', category: 'Molhos & Condimentos', cost: 0.60 },
  { pattern: 'ketchup extra', term: 'Ketchup Extra', category: 'Molhos & Condimentos', cost: 0.50 },
  { pattern: 'azeite extra', term: 'Azeite Extra', category: 'Condimentos', cost: 0.50 },
];

const OPERATIONAL_DICTIONARY: Array<{
  pattern: string;
  term: string;
  type: 'dietary' | 'preparation' | 'removal' | 'service';
}> = [
  { pattern: 'sem cebola', term: 'Sem Cebola', type: 'removal' },
  { pattern: 'sem tomate', term: 'Sem Tomate', type: 'removal' },
  { pattern: 'sem pickles', term: 'Sem Pickles', type: 'removal' },
  { pattern: 'sem molho', term: 'Sem Molho', type: 'removal' },
  { pattern: 'sem gelo', term: 'Sem Gelo', type: 'service' },
  { pattern: 'com gelo', term: 'Com Gelo', type: 'service' },
  { pattern: 'com limão', term: 'Com Limão', type: 'service' },
  { pattern: 'sem limão', term: 'Sem Limão', type: 'service' },
  { pattern: 'bem passado', term: 'Bem Passado', type: 'preparation' },
  { pattern: 'mal passado', term: 'Mal Passado', type: 'preparation' },
  { pattern: 'ao ponto', term: 'Ao Ponto', type: 'preparation' },
  { pattern: 'pouco picante', term: 'Pouco Picante', type: 'preparation' },
  { pattern: 'sem picante', term: 'Sem Picante', type: 'preparation' },
  { pattern: 'muito picante', term: 'Muito Picante', type: 'preparation' },
  { pattern: 'sem glúten', term: 'Sem Glúten / Celíaco', type: 'dietary' },
  { pattern: 'sem lactose', term: 'Sem Lactose', type: 'dietary' },
  { pattern: 'alergia', term: 'Alerta Alergénios', type: 'dietary' },
  { pattern: 'urgente', term: 'Pedido Urgente', type: 'service' },
  { pattern: 'conta separada', term: 'Conta Separada', type: 'service' },
];

interface AnnotatedNoteEntry {
  text: string;
  productName: string;
}

function sortTopNoteProducts(
  productCounts: Record<string, number>,
  limit = 3
): NoteProductBreakdown[] {
  return Object.entries(productCounts)
    .map(([productName, count]) => ({ productName, count }))
    .sort((a, b) => b.count - a.count || a.productName.localeCompare(b.productName, 'pt-PT'))
    .slice(0, limit);
}

function extractSemanticNotes(entries: AnnotatedNoteEntry[]) {
  // 1. Margin Leakages
  const leakageAcc: Record<
    string,
    {
      term: string;
      count: number;
      category: string;
      cost: number;
      productCounts: Record<string, number>;
    }
  > = {};
  let totalLeakageEur = 0;

  // 2. Operational Preferences
  const operationalAcc: Record<
    string,
    {
      term: string;
      count: number;
      type: 'dietary' | 'preparation' | 'removal' | 'service';
      productCounts: Record<string, number>;
    }
  > = {};

  for (const entry of entries) {
    const lowerText = entry.text.toLowerCase();

    for (const item of LEAKAGE_DICTIONARY) {
      const escaped = item.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        const hitCount = matches.length;
        totalLeakageEur += hitCount * item.cost;
        if (!leakageAcc[item.term]) {
          leakageAcc[item.term] = {
            term: item.term,
            count: 0,
            category: item.category,
            cost: item.cost,
            productCounts: {},
          };
        }
        leakageAcc[item.term].count += hitCount;
        leakageAcc[item.term].productCounts[entry.productName] =
          (leakageAcc[item.term].productCounts[entry.productName] ?? 0) + hitCount;
      }
    }

    for (const item of OPERATIONAL_DICTIONARY) {
      const escaped = item.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        const hitCount = matches.length;
        if (!operationalAcc[item.term]) {
          operationalAcc[item.term] = {
            term: item.term,
            count: 0,
            type: item.type,
            productCounts: {},
          };
        }
        operationalAcc[item.term].count += hitCount;
        operationalAcc[item.term].productCounts[entry.productName] =
          (operationalAcc[item.term].productCounts[entry.productName] ?? 0) + hitCount;
      }
    }
  }

  const marginLeakages: MarginLeakageMetric[] = Object.values(leakageAcc)
    .map((l) => ({
      term: l.term,
      count: l.count,
      category: l.category,
      estimatedCostPerUnit: l.cost,
      totalEstimatedLossEur: Math.round(l.count * l.cost * 100) / 100,
      topProducts: sortTopNoteProducts(l.productCounts),
    }))
    .sort((a, b) => b.count - a.count);

  const operationalPreferences: OperationalPreferenceMetric[] = Object.values(operationalAcc)
    .map((op) => ({
      term: op.term,
      count: op.count,
      type: op.type,
      topProducts: sortTopNoteProducts(op.productCounts),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    marginLeakages,
    totalMarginLeakageEur: Math.round(totalLeakageEur * 100) / 100,
    operationalPreferences,
  };
}

function extractTopNoteTerms(entries: AnnotatedNoteEntry[]): NoteTermMetric[] {
  const termAcc: Record<string, { count: number; productCounts: Record<string, number> }> = {};

  const recordTerm = (term: string, productName: string, qty: number) => {
    if (!termAcc[term]) {
      termAcc[term] = { count: 0, productCounts: {} };
    }
    termAcc[term].count += qty;
    termAcc[term].productCounts[productName] =
      (termAcc[term].productCounts[productName] ?? 0) + qty;
  };

  const commonPhrases = [
    'sem cebola',
    'bem passado',
    'mal passado',
    'ao ponto',
    'sem gelo',
    'com gelo',
    'com limão',
    'sem limão',
    'sem picante',
    'muito picante',
    'molho extra',
    'manteiga à parte',
    'urgente',
    'conta separada',
    'massa fina',
    'queijo extra',
  ];

  for (const entry of entries) {
    if (!entry.text) continue;
    let remainingText = entry.text.toLowerCase();

    for (const phrase of commonPhrases) {
      const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = remainingText.match(regex);
      if (matches && matches.length > 0) {
        recordTerm(phrase, entry.productName, matches.length);
        remainingText = remainingText.replace(regex, ' ');
      }
    }

    const cleaned = remainingText
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) continue;

    for (const word of cleaned.split(' ')) {
      if (word.length >= 3 && !STOPWORDS_PT.has(word)) {
        recordTerm(word, entry.productName, 1);
      }
    }
  }

  return Object.entries(termAcc)
    .map(([term, data]) => ({
      term,
      count: data.count,
      topProducts: sortTopNoteProducts(data.productCounts),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function isTechnicalSupplementItem(item: RawAnalyticsOrderItem): boolean {
  const catSlug = item.products?.categories?.slug?.toLowerCase() || '';
  if (catSlug.startsWith('ingredientes-extra')) return true;
  if (item.notes && /^ref\s*:/i.test(item.notes.trim())) return true;
  if (item.product_name.toLowerCase().includes('caixa take away')) return true;
  return false;
}

function cleanItemNoteForNlp(rawNote: string): string {
  return rawNote
    .split('|')
    .map((segment) => segment.trim())
    .filter(
      (segment) =>
        segment.length > 0 && !/^(tamanho|extras|ref)\s*:/i.test(segment)
    )
    .join(' ');
}

function computeMarketBasket(orders: RawAnalyticsOrder[]): MarketBasketCombo[] {
  const itemFrequencies: Record<string, number> = {};
  const pairFrequencies: Record<string, { count: number; revenueSum: number }> = {};

  for (const order of orders) {
    const items = (order.order_items || []).filter(
      (i) => !isTechnicalSupplementItem(i)
    );
    if (items.length < 2) continue;

    const uniqueProductNames = Array.from(
      new Set(items.map((i) => i.product_name.trim()))
    ).filter(Boolean);

    for (const name of uniqueProductNames) {
      itemFrequencies[name] = (itemFrequencies[name] || 0) + 1;
    }

    for (let i = 0; i < uniqueProductNames.length; i++) {
      for (let j = i + 1; j < uniqueProductNames.length; j++) {
        const p1 = uniqueProductNames[i];
        const p2 = uniqueProductNames[j];
        const key = p1 < p2 ? `${p1}|||${p2}` : `${p2}|||${p1}`;

        if (!pairFrequencies[key]) {
          pairFrequencies[key] = { count: 0, revenueSum: 0 };
        }
        pairFrequencies[key].count += 1;
        pairFrequencies[key].revenueSum += Number(order.total) || 0;
      }
    }
  }

  const combos: MarketBasketCombo[] = [];

  for (const [key, data] of Object.entries(pairFrequencies)) {
    const [pA, pB] = key.split('|||');
    const freqA = itemFrequencies[pA] || 1;
    const freqB = itemFrequencies[pB] || 1;

    // Direct affinity: which one triggers the pairing more strongly
    const affinityAtoB = Math.round((data.count / freqA) * 100);
    const affinityBtoA = Math.round((data.count / freqB) * 100);

    const isAtoBStronger = affinityAtoB >= affinityBtoA;
    const primary = isAtoBStronger ? pA : pB;
    const paired = isAtoBStronger ? pB : pA;
    const bestAffinity = Math.max(affinityAtoB, affinityBtoA);

    combos.push({
      id: key,
      itemA: primary,
      itemB: paired,
      coOccurrenceCount: data.count,
      affinityPercent: Math.min(100, bestAffinity),
      estimatedComboRevenue: Math.round((data.revenueSum / data.count) * 100) / 100,
    });
  }

  return combos
    .sort((a, b) => b.coOccurrenceCount * b.affinityPercent - a.coOccurrenceCount * a.affinityPercent)
    .slice(0, 8);
}

export async function getAnalyticsSummary(
  period: AnalyticsPeriod = 'today'
): Promise<AnalyticsActionResult<AnalyticsSummary>> {
  try {
    const staff = await getAuthenticatedStaff();

    if (!canManageCatalogAndAnalytics(staff)) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sessão expirada ou utilizador não autorizado.',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Serviço de base de dados indisponível.',
        },
      };
    }

    const windows = getPeriodWindows(period);

    let ordersQuery = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        table_number,
        status,
        subtotal,
        total,
        customer_notes,
        created_at,
        updated_at,
        order_items (
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          notes,
          products (
            price,
            categories (
              name,
              slug
            )
          )
        )
      `)
      .eq('restaurant_id', staff.restaurant.id)
      .in('status', ['completed', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(3000);

    if (windows.previousStartIso) {
      ordersQuery = ordersQuery.gte('created_at', windows.previousStartIso);
    }

    const productsQuery = supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        is_available,
        categories (
          name,
          slug
        )
      `)
      .eq('restaurant_id', staff.restaurant.id)
      .order('display_order', { ascending: true });

    const [ordersResult, productsResult] = await Promise.all([
      ordersQuery,
      productsQuery,
    ]);

    if (ordersResult.error) {
      console.error('[getAnalyticsSummary] Erro ao consultar Supabase:', ordersResult.error.message);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Ocorreu um erro ao consultar os dados analíticos.',
        },
      };
    }

    const allFetchedOrders = (ordersResult.data || []) as unknown as RawAnalyticsOrder[];
    const catalogProducts = (productsResult.data || []) as unknown as RawCatalogProductRow[];

    const orders: RawAnalyticsOrder[] = [];
    const cancelledOrders: RawAnalyticsOrder[] = [];
    const prevCompletedOrders: RawAnalyticsOrder[] = [];

    for (const row of allFetchedOrders) {
      const createdMs = new Date(row.created_at).getTime();
      const inCurrentPeriod =
        windows.currentStartMs === null || createdMs >= windows.currentStartMs;

      if (inCurrentPeriod) {
        if (row.status === 'completed') {
          orders.push(row);
        } else if (row.status === 'cancelled') {
          cancelledOrders.push(row);
        }
      } else if (
        windows.previousStartMs !== null &&
        createdMs >= windows.previousStartMs &&
        row.status === 'completed'
      ) {
        prevCompletedOrders.push(row);
      }
    }

    const totalOrders = orders.length;

    let totalRevenue = 0;
    let totalTurnaroundMinutes = 0;
    let slaViolationCount = 0;

    const channelAcc: Record<
      'dine_in' | 'takeaway',
      { orderCount: number; revenue: number; turnaroundSum: number }
    > = {
      dine_in: { orderCount: 0, revenue: 0, turnaroundSum: 0 },
      takeaway: { orderCount: 0, revenue: 0, turnaroundSum: 0 },
    };

    const tableMap: Record<
      number,
      { revenue: number; ordersCount: number; turnaroundSum: number }
    > = {};

    const hourlyMap: Record<
      number,
      { revenue: number; ordersCount: number; turnaroundSum: number }
    > = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { revenue: 0, ordersCount: 0, turnaroundSum: 0 };
    }

    const productMap: Record<
      string,
      {
        productId: string;
        productName: string;
        categoryName: string;
        quantitySold: number;
        revenue: number;
        unitPriceSum: number;
        unitCostSum: number;
        occurrences: number;
      }
    > = {};

    const categoryMap: Record<
      string,
      {
        categoryName: string;
        categorySlug: string;
        station: 'bar' | 'kitchen';
        unitsSold: number;
        revenue: number;
        profit: number;
      }
    > = {};

    const stationMap: Record<
      'bar' | 'kitchen',
      { unitsSold: number; revenue: number; profit: number }
    > = {
      bar: { unitsSold: 0, revenue: 0, profit: 0 },
      kitchen: { unitsSold: 0, revenue: 0, profit: 0 },
    };

    const noteEntries: AnnotatedNoteEntry[] = [];

    for (const order of orders) {
      const orderTotal = Number(order.total) || 0;
      totalRevenue += orderTotal;

      if (order.customer_notes) {
        const cleanedCustomerNote = order.customer_notes
          .replace(/^\[TAKE-AWAY\][^\n]*\n?(?:Notas:\s*)?/i, '')
          .trim();
        if (cleanedCustomerNote) {
          const uniqueMainProductNames = Array.from(
            new Set(
              (order.order_items || [])
                .filter((i) => !isTechnicalSupplementItem(i))
                .map((i) => (i.product_name || '').trim())
                .filter(Boolean)
            )
          );
          const attributedProduct =
            uniqueMainProductNames.length === 1
              ? uniqueMainProductNames[0]
              : 'Pedido Geral';
          noteEntries.push({
            text: cleanedCustomerNote,
            productName: attributedProduct,
          });
        }
      }

      const createdMs = new Date(order.created_at).getTime();
      const updatedMs = new Date(order.updated_at).getTime();
      const turnaroundMin = Math.max(
        0,
        Math.round((updatedMs - createdMs) / 60000)
      );

      totalTurnaroundMinutes += turnaroundMin;

      if (turnaroundMin > 20) {
        slaViolationCount += 1;
      }

      const orderDate = new Date(order.created_at);
      const hour = orderDate.getHours();
      if (hourlyMap[hour]) {
        hourlyMap[hour].revenue += orderTotal;
        hourlyMap[hour].ordersCount += 1;
        hourlyMap[hour].turnaroundSum += turnaroundMin;
      }

      const tblNum = Number(order.table_number) || 0;
      const channelKey = tblNum === 0 ? 'takeaway' : 'dine_in';
      channelAcc[channelKey].orderCount += 1;
      channelAcc[channelKey].revenue += orderTotal;
      channelAcc[channelKey].turnaroundSum += turnaroundMin;

      if (tblNum > 0) {
        if (!tableMap[tblNum]) {
          tableMap[tblNum] = { revenue: 0, ordersCount: 0, turnaroundSum: 0 };
        }
        tableMap[tblNum].revenue += orderTotal;
        tableMap[tblNum].ordersCount += 1;
        tableMap[tblNum].turnaroundSum += turnaroundMin;
      }

      for (const item of order.order_items || []) {
        if (item.notes) {
          const cleanedItemNote = cleanItemNoteForNlp(item.notes);
          if (cleanedItemNote) {
            noteEntries.push({
              text: cleanedItemNote,
              productName: (item.product_name || 'Artigo').trim(),
            });
          }
        }

        if (isTechnicalSupplementItem(item)) {
          continue;
        }

        const prodKey = item.product_id || item.product_name || 'artigo-gerico';
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        const unitCost = resolveItemUnitCost(item);
        const unitMargin = Math.max(0, unitPrice - unitCost);
        const itemRevenue = unitPrice * qty;
        const itemProfit = unitMargin * qty;

        const categoryName = item.products?.categories?.name || 'Geral';
        const categorySlug = item.products?.categories?.slug || 'geral';
        const station = resolveStation(categorySlug);

        if (!productMap[prodKey]) {
          productMap[prodKey] = {
            productId: item.product_id || prodKey,
            productName: item.product_name,
            categoryName,
            quantitySold: 0,
            revenue: 0,
            unitPriceSum: 0,
            unitCostSum: 0,
            occurrences: 0,
          };
        }

        productMap[prodKey].quantitySold += qty;
        productMap[prodKey].revenue += itemRevenue;
        productMap[prodKey].unitPriceSum += itemRevenue;
        productMap[prodKey].unitCostSum += unitCost * qty;
        productMap[prodKey].occurrences += qty;

        const catKey = `${station}::${categorySlug}::${categoryName}`;
        if (!categoryMap[catKey]) {
          categoryMap[catKey] = {
            categoryName,
            categorySlug,
            station,
            unitsSold: 0,
            revenue: 0,
            profit: 0,
          };
        }
        categoryMap[catKey].unitsSold += qty;
        categoryMap[catKey].revenue += itemRevenue;
        categoryMap[catKey].profit += itemProfit;

        stationMap[station].unitsSold += qty;
        stationMap[station].revenue += itemRevenue;
        stationMap[station].profit += itemProfit;
      }
    }

    const averageTicket =
      totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;
    const averageTurnaroundMinutes =
      totalOrders > 0
        ? Math.round((totalTurnaroundMinutes / totalOrders) * 10) / 10
        : 0;
    const slaViolationRate =
      totalOrders > 0
        ? Math.round((slaViolationCount / totalOrders) * 1000) / 10
        : 0;
    const slaComplianceRate =
      Math.round((100 - slaViolationRate) * 10) / 10;

    const rawProductList = Object.values(productMap).map((p) => {
      const avgPrice =
        p.occurrences > 0 ? p.unitPriceSum / p.occurrences : 0;
      const avgCost =
        p.occurrences > 0 ? p.unitCostSum / p.occurrences : 0;
      const unitMargin = Math.max(0, avgPrice - avgCost);
      const marginPercent =
        avgPrice > 0 ? Math.round((unitMargin / avgPrice) * 1000) / 10 : 0;
      const totalProfit = unitMargin * p.quantitySold;

      return {
        productId: p.productId,
        productName: p.productName,
        categoryName: p.categoryName,
        quantitySold: p.quantitySold,
        unitPrice: Math.round(avgPrice * 100) / 100,
        unitCost: Math.round(avgCost * 100) / 100,
        unitMargin: Math.round(unitMargin * 100) / 100,
        marginPercent,
        totalRevenue: Math.round(p.revenue * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
      };
    });

    const uniqueProductCount = rawProductList.length;
    const totalVolumeAll = rawProductList.reduce(
      (sum, p) => sum + p.quantitySold,
      0
    );
    const totalMarginSum = rawProductList.reduce(
      (sum, p) => sum + p.unitMargin,
      0
    );

    const avgVolumeThreshold =
      uniqueProductCount > 0 ? totalVolumeAll / uniqueProductCount : 0;
    const avgMarginThreshold =
      uniqueProductCount > 0 ? totalMarginSum / uniqueProductCount : 0;

    let starsCount = 0;
    let plowhorsesCount = 0;
    let puzzlesCount = 0;
    let dogsCount = 0;

    const menuEngineering: BcgProductMetric[] = rawProductList
      .map((p) => {
        const isHighVolume = p.quantitySold >= avgVolumeThreshold;
        const isHighMargin = p.unitMargin >= avgMarginThreshold;

        let classification: BcgCategory = 'dog';
        if (isHighVolume && isHighMargin) {
          classification = 'star';
          starsCount++;
        } else if (isHighVolume && !isHighMargin) {
          classification = 'plowhorse';
          plowhorsesCount++;
        } else if (!isHighVolume && isHighMargin) {
          classification = 'puzzle';
          puzzlesCount++;
        } else {
          classification = 'dog';
          dogsCount++;
        }

        return {
          ...p,
          classification,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const tablePerformance: TableMetric[] = Object.entries(tableMap)
      .map(([tableNumStr, data]) => {
        const tNum = Number(tableNumStr);
        const avgTicket =
          data.ordersCount > 0
            ? Math.round((data.revenue / data.ordersCount) * 100) / 100
            : 0;
        const avgTurnaround =
          data.ordersCount > 0
            ? Math.round((data.turnaroundSum / data.ordersCount) * 10) / 10
            : 0;

        return {
          tableNumber: tNum,
          orderCount: data.ordersCount,
          totalRevenue: Math.round(data.revenue * 100) / 100,
          averageTicket: avgTicket,
          avgTurnaroundMinutes: avgTurnaround,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const hourlyPerformance: HourlyMetric[] = Object.entries(hourlyMap).map(
      ([hourStr, data]) => {
        const hour = Number(hourStr);
        const avgTurnaround =
          data.ordersCount > 0
            ? Math.round((data.turnaroundSum / data.ordersCount) * 10) / 10
            : 0;

        return {
          hour,
          hourLabel: `${String(hour).padStart(2, '0')}:00`,
          orderCount: data.ordersCount,
          totalRevenue: Math.round(data.revenue * 100) / 100,
          avgTurnaroundMinutes: avgTurnaround,
        };
      }
    );

    // Run-rate & Live Velocity Calculations
    const activeHoursCount = Object.values(hourlyMap).filter(
      (h) => h.ordersCount > 0
    ).length;
    const effectiveHours = Math.max(1, activeHoursCount);

    const hourlyVelocity =
      Math.round((totalRevenue / effectiveHours) * 100) / 100;
    const ordersVelocity =
      Math.round((totalOrders / effectiveHours) * 10) / 10;

    let projectedPeriodRevenue = totalRevenue;
    let projectionLabel = 'Projeção Turno (Hoje)';

    if (period === 'today') {
      // Shift extrapolation (standard 8 operating hours service)
      const targetHours = 8;
      projectedPeriodRevenue =
        totalRevenue > 0
          ? Math.max(
              totalRevenue,
              Math.round(hourlyVelocity * targetHours * 100) / 100
            )
          : 0;
      projectionLabel = 'Projeção Fecho Turno (Hoje)';
    } else if (period === '7days') {
      // 30-day run rate extrapolation
      projectedPeriodRevenue =
        Math.round((totalRevenue / 7) * 30 * 100) / 100;
      projectionLabel = 'Run-Rate Mensal Projetado (30D)';
    } else if (period === '30days') {
      projectedPeriodRevenue = Math.round(totalRevenue * 100) / 100;
      projectionLabel = 'Volume Consolidado Mensal';
    } else if (period === 'all') {
      projectedPeriodRevenue = Math.round(totalRevenue * 100) / 100;
      projectionLabel = 'Volume Total Acumulado (Sempre)';
    }

    const runRate: RunRateMetrics = {
      hourlyVelocity,
      ordersVelocity,
      projectedPeriodRevenue,
      projectionLabel,
      paceIndicator:
        hourlyVelocity > 150 ? 'high' : hourlyVelocity > 50 ? 'normal' : 'moderate',
    };

    // Semantic NLP & Cost Leakage
    const semanticNotes = extractSemanticNotes(noteEntries);
    const topNoteTerms = extractTopNoteTerms(noteEntries);

    // Cross-Selling / Market Basket Pairs
    const marketBasketCombos = computeMarketBasket(orders);

    // KPI Sparklines (generated from chronological distribution)
    const activeHourlyPoints = hourlyPerformance.map((h) => h.totalRevenue);
    const activeHourlyOrders = hourlyPerformance.map((h) => h.orderCount);
    const activeHourlyTurnaround = hourlyPerformance.map((h) => h.avgTurnaroundMinutes);

    // Compress 24 hours into 8 smooth sparkline segments (each segment = 3 hours)
    const sparklineRevenue: number[] = [];
    const sparklineOrders: number[] = [];
    const sparklineTurnaround: number[] = [];

    for (let i = 0; i < 24; i += 3) {
      const sliceRev = activeHourlyPoints.slice(i, i + 3).reduce((a, b) => a + b, 0);
      const sliceOrders = activeHourlyOrders.slice(i, i + 3).reduce((a, b) => a + b, 0);
      const sliceTurn = activeHourlyTurnaround.slice(i, i + 3);
      const avgTurn =
        sliceTurn.length > 0
          ? sliceTurn.reduce((a, b) => a + b, 0) / sliceTurn.length
          : 0;

      sparklineRevenue.push(Math.round(sliceRev * 100) / 100);
      sparklineOrders.push(sliceOrders);
      sparklineTurnaround.push(Math.round(avgTurn * 10) / 10);
    }

    const sparklines: SparklineData = {
      revenuePoints: sparklineRevenue,
      ordersPoints: sparklineOrders,
      turnaroundPoints: sparklineTurnaround,
    };

    // What-If Baseline
    const totalGrossProfit = Math.round(
      rawProductList.reduce((sum, p) => sum + p.totalProfit, 0) * 100
    ) / 100;

    const avgPriceAll =
      totalVolumeAll > 0
        ? Math.round((totalRevenue / totalVolumeAll) * 100) / 100
        : 0;
    const avgCostAll =
      totalVolumeAll > 0
        ? Math.round(
            (rawProductList.reduce(
              (sum, p) => sum + p.unitCost * p.quantitySold,
              0
            ) /
              totalVolumeAll) *
              100
          ) / 100
        : 0;

    const currentMarginPercent =
      totalRevenue > 0
        ? Math.round((totalGrossProfit / totalRevenue) * 1000) / 10
        : 0;

    const whatIfBaseline: WhatIfBaseline = {
      totalUnitsSold: totalVolumeAll,
      averageUnitPrice: avgPriceAll,
      averageUnitCost: avgCostAll,
      currentRevenue: Math.round(totalRevenue * 100) / 100,
      currentGrossProfit: totalGrossProfit,
      currentMarginPercent,
    };

    // Comparação com Período Anterior
    let prevRevenue = 0;
    let prevTurnaroundViolations = 0;
    const prevOrdersCount = prevCompletedOrders.length;

    for (const prevOrder of prevCompletedOrders) {
      prevRevenue += Number(prevOrder.total) || 0;
      const createdMs = new Date(prevOrder.created_at).getTime();
      const updatedMs = new Date(prevOrder.updated_at).getTime();
      const turnaroundMin = Math.max(0, Math.round((updatedMs - createdMs) / 60000));
      if (turnaroundMin > 20) {
        prevTurnaroundViolations += 1;
      }
    }

    const prevAvgTicket = prevOrdersCount > 0 ? prevRevenue / prevOrdersCount : 0;
    const prevSlaComplianceRate =
      prevOrdersCount > 0
        ? Math.round((100 - (prevTurnaroundViolations / prevOrdersCount) * 100) * 10) / 10
        : 0;

    const periodComparison: PeriodComparisonMetrics = {
      previousLabel: windows.previousLabel,
      hasComparison: windows.hasComparison,
      revenueDeltaPercent: windows.hasComparison
        ? computePercentDelta(totalRevenue, prevRevenue)
        : null,
      ordersDeltaPercent: windows.hasComparison
        ? computePercentDelta(totalOrders, prevOrdersCount)
        : null,
      ticketDeltaPercent: windows.hasComparison
        ? computePercentDelta(averageTicket, prevAvgTicket)
        : null,
      slaDeltaPoints:
        windows.hasComparison && prevOrdersCount > 0
          ? Math.round((slaComplianceRate - prevSlaComplianceRate) * 10) / 10
          : null,
      previousRevenue: Math.round(prevRevenue * 100) / 100,
      previousOrders: prevOrdersCount,
    };

    // Sala vs. Take-Away
    const buildChannelMetric = (
      channel: 'dine_in' | 'takeaway',
      label: string
    ): ChannelMetricItem => {
      const acc = channelAcc[channel];
      return {
        channel,
        label,
        orderCount: acc.orderCount,
        revenue: Math.round(acc.revenue * 100) / 100,
        revenueSharePercent:
          totalRevenue > 0 ? Math.round((acc.revenue / totalRevenue) * 1000) / 10 : 0,
        averageTicket:
          acc.orderCount > 0 ? Math.round((acc.revenue / acc.orderCount) * 100) / 100 : 0,
        avgTurnaroundMinutes:
          acc.orderCount > 0
            ? Math.round((acc.turnaroundSum / acc.orderCount) * 10) / 10
            : 0,
      };
    };

    const channelSplit: ChannelSplitMetrics = {
      dineIn: buildChannelMetric('dine_in', 'Sala (Mesas)'),
      takeaway: buildChannelMetric('takeaway', 'Take-Away / Balcão'),
    };

    // Desempenho por Secção (Bar/Copa vs. Cozinha) e Categoria
    const totalCategorizedRevenue = Object.values(categoryMap).reduce(
      (sum, c) => sum + c.revenue,
      0
    );

    const stationSplit: StationPerformanceMetric[] = (['kitchen', 'bar'] as const).map(
      (st) => {
        const s = stationMap[st];
        return {
          station: st,
          label: st === 'bar' ? 'Bar / Copa' : 'Cozinha',
          unitsSold: s.unitsSold,
          revenue: Math.round(s.revenue * 100) / 100,
          profit: Math.round(s.profit * 100) / 100,
          revenueSharePercent:
            totalCategorizedRevenue > 0
              ? Math.round((s.revenue / totalCategorizedRevenue) * 1000) / 10
              : 0,
          marginPercent:
            s.revenue > 0 ? Math.round((s.profit / s.revenue) * 1000) / 10 : 0,
        };
      }
    );

    const categoryPerformance: CategoryPerformanceMetric[] = Object.values(categoryMap)
      .map((c) => ({
        categoryName: c.categoryName,
        categorySlug: c.categorySlug,
        station: c.station,
        unitsSold: c.unitsSold,
        revenue: Math.round(c.revenue * 100) / 100,
        profit: Math.round(c.profit * 100) / 100,
        marginPercent:
          c.revenue > 0 ? Math.round((c.profit / c.revenue) * 1000) / 10 : 0,
        revenueSharePercent:
          totalCategorizedRevenue > 0
            ? Math.round((c.revenue / totalCategorizedRevenue) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // Cancelamentos & Receita Perdida
    const cancelledOrdersCount = cancelledOrders.length;
    let lostRevenueEur = 0;
    const cancelledProductAcc: Record<string, CancelledProductMetric> = {};

    for (const cOrder of cancelledOrders) {
      lostRevenueEur += Number(cOrder.total) || 0;
      for (const item of cOrder.order_items || []) {
        if (isTechnicalSupplementItem(item)) continue;
        const pName = (item.product_name || 'Artigo').trim();
        const catName = item.products?.categories?.name || 'Geral';
        const qty = Number(item.quantity) || 1;
        const lost = (Number(item.unit_price) || 0) * qty;
        if (!cancelledProductAcc[pName]) {
          cancelledProductAcc[pName] = {
            productName: pName,
            categoryName: catName,
            cancelledQty: 0,
            lostRevenue: 0,
          };
        }
        cancelledProductAcc[pName].cancelledQty += qty;
        cancelledProductAcc[pName].lostRevenue += lost;
      }
    }

    const totalRelevantOrders = totalOrders + cancelledOrdersCount;
    const cancellations: CancellationAnalytics = {
      cancelledOrdersCount,
      cancellationRatePercent:
        totalRelevantOrders > 0
          ? Math.round((cancelledOrdersCount / totalRelevantOrders) * 1000) / 10
          : 0,
      lostRevenueEur: Math.round(lostRevenueEur * 100) / 100,
      avgCancelledTicketEur:
        cancelledOrdersCount > 0
          ? Math.round((lostRevenueEur / cancelledOrdersCount) * 100) / 100
          : 0,
      topCancelledProducts: Object.values(cancelledProductAcc)
        .map((p) => ({
          ...p,
          lostRevenue: Math.round(p.lostRevenue * 100) / 100,
        }))
        .sort((a, b) => b.cancelledQty - a.cancelledQty || b.lostRevenue - a.lostRevenue)
        .slice(0, 6),
    };

    // Artigos Sem Vendas ("Parados")
    const soldProductIds = new Set(rawProductList.map((p) => p.productId));
    const soldProductNames = new Set(
      rawProductList.map((p) => p.productName.trim().toLowerCase())
    );

    const unsoldProducts: UnsoldProductMetric[] = [];
    for (const prod of catalogProducts) {
      const cat = Array.isArray(prod.categories) ? prod.categories[0] : prod.categories;
      const catSlug = (cat?.slug || '').toLowerCase();
      if (
        catSlug.startsWith('ingredientes-extra') ||
        prod.name.toLowerCase().includes('caixa take away')
      ) {
        continue;
      }
      if (
        soldProductIds.has(prod.id) ||
        soldProductNames.has(prod.name.trim().toLowerCase())
      ) {
        continue;
      }
      unsoldProducts.push({
        productId: prod.id,
        productName: prod.name,
        categoryName: cat?.name || 'Geral',
        unitPrice: Math.round((Number(prod.price) || 0) * 100) / 100,
        isAvailable: Boolean(prod.is_available),
      });
    }

    unsoldProducts.sort((a, b) => {
      if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
      const catCmp = a.categoryName.localeCompare(b.categoryName, 'pt-PT');
      return catCmp !== 0 ? catCmp : a.productName.localeCompare(b.productName, 'pt-PT');
    });

    return {
      success: true,
      data: {
        period,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        averageTicket,
        averageTurnaroundMinutes,
        slaViolationCount,
        slaViolationRate,
        slaComplianceRate,
        menuEngineering,
        bcgSummary: {
          starsCount,
          plowhorsesCount,
          puzzlesCount,
          dogsCount,
        },
        tablePerformance,
        hourlyPerformance,
        topNoteTerms,
        runRate,
        marketBasketCombos,
        operationalPreferences: semanticNotes.operationalPreferences,
        marginLeakages: semanticNotes.marginLeakages,
        totalMarginLeakageEur: semanticNotes.totalMarginLeakageEur,
        sparklines,
        whatIfBaseline,
        periodComparison,
        channelSplit,
        stationSplit,
        categoryPerformance,
        cancellations,
        unsoldProducts,
      },
    };
  } catch (err: unknown) {
    console.error('[getAnalyticsSummary] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro inesperado ao calcular as análises.',
      },
    };
  }
}

export async function exportAnalyticsCsv(
  period: AnalyticsPeriod = '30days'
): Promise<AnalyticsActionResult<string>> {
  try {
    const staff = await getAuthenticatedStaff();

    if (!canManageCatalogAndAnalytics(staff)) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sessão expirada ou utilizador não autorizado.',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Serviço de base de dados indisponível.',
        },
      };
    }

    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        table_number,
        status,
        total,
        created_at,
        updated_at,
        order_items (
          product_name,
          quantity
        )
      `)
      .eq('restaurant_id', staff.restaurant.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(1500);

    const startDate = getStartDateForPeriod(period);
    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    const { data: rawOrders, error } = await query;

    if (error) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Erro ao extrair pedidos para exportação CSV.',
        },
      };
    }

    const orders = (rawOrders || []) as unknown as RawAnalyticsOrder[];

    const headers = [
      'Data/Hora',
      'ID Pedido',
      'Número',
      'Mesa',
      'Artigos',
      'Valor Total (€)',
      'Tempo Resolução (min)',
    ];

    const rows = orders.map((o) => {
      const created = new Date(o.created_at);
      const dateStr = created.toLocaleString('pt-PT');
      const createdMs = created.getTime();
      const updatedMs = new Date(o.updated_at).getTime();
      const resolutionMinutes = Math.max(
        0,
        Math.round((updatedMs - createdMs) / 60000)
      );

      const itemsStr = (o.order_items || [])
        .map((i) => `${i.quantity}x ${i.product_name}`)
        .join(' + ')
        .replace(/"/g, '""');

      const totalFormatted = (Number(o.total) || 0).toFixed(2).replace('.', ',');

      return [
        `"${dateStr}"`,
        `"${o.id}"`,
        o.order_number,
        o.table_number === 0 ? '"Take-Away"' : o.table_number,
        `"${itemsStr}"`,
        totalFormatted,
        resolutionMinutes,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');

    return {
      success: true,
      data: csvContent,
    };
  } catch (err: unknown) {
    console.error('[exportAnalyticsCsv] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Falha ao gerar o ficheiro CSV analítico.',
      },
    };
  }
}
