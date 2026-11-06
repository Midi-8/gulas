import React from 'react';
import { getAuthenticatedStaff } from '@/lib/auth/staff';
import { getActiveOrders } from '@/actions/order-management';
import { redirect } from 'next/navigation';
import { OrderDashboard } from '@/components/admin/orders/OrderDashboard';

export const metadata = {
  title: 'Gestão de Pedidos (KDS) — Gulas Admin',
  description: 'Painel de controlo de pedidos da cozinha e sala em tempo de execução',
};

export default async function AdminOrdersPage() {
  const staff = await getAuthenticatedStaff();

  if (!staff) {
    redirect('/admin/login');
  }

  // Pre-fetch initial active orders on the server
  const ordersResult = await getActiveOrders();
  const initialOrders = ordersResult.success ? ordersResult.data : [];

  return (
    <OrderDashboard
      restaurantId={staff.restaurant.id}
      restaurantName={staff.restaurant.name}
      restaurantSlug={staff.restaurant.slug}
      initialIsRestaurantOpen={staff.restaurant.isOpen}
      initialOrders={initialOrders}
    />
  );
}
