'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedStaff } from '@/lib/auth/staff';

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

export interface NoteTermMetric {
  term: string;
  count: number;
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
}

export interface MarginLeakageMetric {
  term: string;
  count: number;
  category: string;
  estimatedCostPerUnit: number;
  totalEstimatedLossEur: number;
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
  unit_cost: number | null;
  notes: string | null;
  products?: {
    cost: number | null;
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

function getStartDateForPeriod(period: AnalyticsPeriod): string | null {
  const now = new Date();
  if (period === 'today') {
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0
    );
    return startOfToday.toISOString();
  }
  if (period === '7days') {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }
  if (period === '30days') {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString();
  }
  return null;
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

function extractSemanticNotes(texts: string[]) {
  const corpus = texts.join(' ').toLowerCase();

  // 1. Margin Leakages
  const leakageMap: Record<string, MarginLeakageMetric> = {};
  let totalLeakageEur = 0;

  for (const item of LEAKAGE_DICTIONARY) {
    const escaped = item.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = corpus.match(regex);
    if (matches && matches.length > 0) {
      const count = matches.length;
      const totalLoss = Math.round(count * item.cost * 100) / 100;
      totalLeakageEur += totalLoss;
      leakageMap[item.term] = {
        term: item.term,
        count,
        category: item.category,
        estimatedCostPerUnit: item.cost,
        totalEstimatedLossEur: totalLoss,
      };
    }
  }

  // 2. Operational Preferences
  const operationalMap: Record<string, OperationalPreferenceMetric> = {};
  for (const item of OPERATIONAL_DICTIONARY) {
    const escaped = item.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = corpus.match(regex);
    if (matches && matches.length > 0) {
      operationalMap[item.term] = {
        term: item.term,
        count: matches.length,
        type: item.type,
      };
    }
  }

  const marginLeakages = Object.values(leakageMap).sort((a, b) => b.count - a.count);
  const operationalPreferences = Object.values(operationalMap).sort(
    (a, b) => b.count - a.count
  );

  return {
    marginLeakages,
    totalMarginLeakageEur: Math.round(totalLeakageEur * 100) / 100,
    operationalPreferences,
  };
}

function extractTopNoteTerms(texts: string[]): NoteTermMetric[] {
  const termCounts: Record<string, number> = {};

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

  const fullCorpus = texts.join(' ').toLowerCase();

  for (const phrase of commonPhrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    const matches = fullCorpus.match(regex);
    if (matches && matches.length > 0) {
      termCounts[phrase] = (termCounts[phrase] ?? 0) + matches.length;
    }
  }

  for (const rawText of texts) {
    if (!rawText) continue;

    const cleaned = rawText
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleaned.split(' ');

    for (const word of words) {
      if (word.length >= 3 && !STOPWORDS_PT.has(word)) {
        termCounts[word] = (termCounts[word] ?? 0) + 1;
      }
    }
  }

  return Object.entries(termCounts)
    .map(([term, count]) => ({ term, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
}

function computeMarketBasket(orders: RawAnalyticsOrder[]): MarketBasketCombo[] {
  const itemFrequencies: Record<string, number> = {};
  const pairFrequencies: Record<string, { count: number; revenueSum: number }> = {};

  for (const order of orders) {
    const items = order.order_items || [];
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

    if (!staff) {
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
          unit_cost,
          notes,
          products (
            cost,
            price,
            categories (
              name,
              slug
            )
          )
        )
      `)
      .eq('restaurant_id', staff.restaurant.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    const startDate = getStartDateForPeriod(period);
    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    const { data: rawOrders, error } = await query;

    if (error) {
      console.error('[getAnalyticsSummary] Erro ao consultar Supabase:', error.message);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Ocorreu um erro ao consultar os dados analíticos.',
        },
      };
    }

    const orders = (rawOrders || []) as unknown as RawAnalyticsOrder[];
    const totalOrders = orders.length;

    let totalRevenue = 0;
    let totalTurnaroundMinutes = 0;
    let slaViolationCount = 0;

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

    const noteTexts: string[] = [];

    for (const order of orders) {
      const orderTotal = Number(order.total) || 0;
      totalRevenue += orderTotal;

      if (order.customer_notes) {
        noteTexts.push(order.customer_notes);
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
      if (!tableMap[tblNum]) {
        tableMap[tblNum] = { revenue: 0, ordersCount: 0, turnaroundSum: 0 };
      }
      tableMap[tblNum].revenue += orderTotal;
      tableMap[tblNum].ordersCount += 1;
      tableMap[tblNum].turnaroundSum += turnaroundMin;

      for (const item of order.order_items || []) {
        if (item.notes) {
          noteTexts.push(item.notes);
        }

        const prodKey = item.product_id || item.product_name || 'artigo-gerico';
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unit_price) || 0;

        let unitCost = item.unit_cost !== null ? Number(item.unit_cost) : null;
        if (unitCost === null && item.products?.cost !== null && item.products?.cost !== undefined) {
          unitCost = Number(item.products.cost);
        }
        if (unitCost === null || Number.isNaN(unitCost) || unitCost <= 0) {
          unitCost = Math.round(unitPrice * 0.32 * 100) / 100;
        }

        const categoryName = item.products?.categories?.name || 'Geral';

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
        productMap[prodKey].revenue += unitPrice * qty;
        productMap[prodKey].unitPriceSum += unitPrice * qty;
        productMap[prodKey].unitCostSum += unitCost * qty;
        productMap[prodKey].occurrences += qty;
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
    const semanticNotes = extractSemanticNotes(noteTexts);
    const topNoteTerms = extractTopNoteTerms(noteTexts);

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

    if (!staff) {
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
      .order('created_at', { ascending: false });

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
        o.table_number,
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
