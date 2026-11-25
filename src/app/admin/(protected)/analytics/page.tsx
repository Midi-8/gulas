import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedStaff, isOwner } from '@/lib/auth/staff';
import { getAnalyticsSummary, AnalyticsSummary } from '@/actions/analytics';
import { AnalyticsDashboardView } from '@/components/admin/analytics/AnalyticsDashboardView';

export const metadata = {
  title: 'Centro de Comando & BI — Gulas Admin',
  description: 'Análise de performance, engenharia de menu e inteligência de negócio',
};

const EMPTY_SUMMARY: AnalyticsSummary = {
  period: 'today',
  totalRevenue: 0,
  totalOrders: 0,
  averageTicket: 0,
  averageTurnaroundMinutes: 0,
  slaViolationCount: 0,
  slaViolationRate: 0,
  slaComplianceRate: 100,
  menuEngineering: [],
  bcgSummary: {
    starsCount: 0,
    plowhorsesCount: 0,
    puzzlesCount: 0,
    dogsCount: 0,
  },
  tablePerformance: [],
  hourlyPerformance: [],
  topNoteTerms: [],
  runRate: {
    hourlyVelocity: 0,
    ordersVelocity: 0,
    projectedPeriodRevenue: 0,
    projectionLabel: 'Projeção Fecho Turno (Hoje)',
    paceIndicator: 'moderate',
  },
  marketBasketCombos: [],
  operationalPreferences: [],
  marginLeakages: [],
  totalMarginLeakageEur: 0,
  sparklines: {
    revenuePoints: [0, 0, 0, 0, 0, 0, 0, 0],
    ordersPoints: [0, 0, 0, 0, 0, 0, 0, 0],
    turnaroundPoints: [0, 0, 0, 0, 0, 0, 0, 0],
  },
  whatIfBaseline: {
    totalUnitsSold: 0,
    averageUnitPrice: 0,
    averageUnitCost: 0,
    currentRevenue: 0,
    currentGrossProfit: 0,
    currentMarginPercent: 0,
  },
  periodComparison: {
    previousLabel: 'vs. ontem',
    hasComparison: true,
    revenueDeltaPercent: null,
    ordersDeltaPercent: null,
    ticketDeltaPercent: null,
    slaDeltaPoints: null,
    previousRevenue: 0,
    previousOrders: 0,
  },
  channelSplit: {
    dineIn: {
      channel: 'dine_in',
      label: 'Sala (Mesas)',
      orderCount: 0,
      revenue: 0,
      revenueSharePercent: 0,
      averageTicket: 0,
      avgTurnaroundMinutes: 0,
    },
    takeaway: {
      channel: 'takeaway',
      label: 'Take-Away / Balcão',
      orderCount: 0,
      revenue: 0,
      revenueSharePercent: 0,
      averageTicket: 0,
      avgTurnaroundMinutes: 0,
    },
  },
  stationSplit: [
    {
      station: 'kitchen',
      label: 'Cozinha',
      unitsSold: 0,
      revenue: 0,
      profit: 0,
      revenueSharePercent: 0,
      marginPercent: 0,
    },
    {
      station: 'bar',
      label: 'Bar / Copa',
      unitsSold: 0,
      revenue: 0,
      profit: 0,
      revenueSharePercent: 0,
      marginPercent: 0,
    },
  ],
  categoryPerformance: [],
  cancellations: {
    cancelledOrdersCount: 0,
    cancellationRatePercent: 0,
    lostRevenueEur: 0,
    avgCancelledTicketEur: 0,
    topCancelledProducts: [],
  },
  unsoldProducts: [],
};

export default async function AdminAnalyticsPage() {
  const staff = await getAuthenticatedStaff();

  if (!staff) {
    redirect('/admin/login');
  }

  if (!isOwner(staff)) {
    redirect('/admin/orders');
  }

  // Pre-fetch initial analytics for today/current shift
  const res = await getAnalyticsSummary('today');
  const initialSummary: AnalyticsSummary = res.success ? res.data : EMPTY_SUMMARY;

  return (
    <AnalyticsDashboardView
      initialSummary={initialSummary}
      restaurantName={staff.restaurant.name}
    />
  );
}
