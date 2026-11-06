import React from 'react';
import { getAuthenticatedStaff } from '@/lib/auth/staff';
import { getOrderHistory } from '@/actions/order-management';
import { redirect } from 'next/navigation';
import { OrderHistoryView } from '@/components/admin/history/OrderHistoryView';

export const metadata = {
  title: 'Histórico de Pedidos — Gulas Admin',
  description: 'Histórico de pedidos concluídos e cancelados do restaurante',
};

export default async function AdminOrderHistoryPage() {
  const staff = await getAuthenticatedStaff();

  if (!staff) {
    redirect('/admin/login');
  }

  // Pre-fetch initial order history on the server
  const historyResult = await getOrderHistory({ limit: 250 });
  const initialOrders = historyResult.success ? historyResult.data : [];

  return (
    <OrderHistoryView
      restaurantName={staff.restaurant.name}
      restaurantSlug={staff.restaurant.slug}
      initialOrders={initialOrders}
    />
  );
}
