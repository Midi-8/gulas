import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedStaff } from '@/lib/auth/staff';
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
};

export default async function AdminAnalyticsPage() {
  const staff = await getAuthenticatedStaff();

  if (!staff) {
    redirect('/admin/login');
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
