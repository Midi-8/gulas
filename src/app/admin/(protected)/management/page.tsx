import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedStaff } from '@/lib/auth/staff';
import {
  getRestaurantStockList,
  getRestaurantCategories,
} from '@/actions/product-stock';
import { QuickStockDrawer } from '@/components/admin/stock/QuickStockDrawer';

export const metadata = {
  title: 'Gestão de Menu, Preços & Stock — Gulas Admin',
  description: 'Gestor completo de menu, preços, fichas técnicas, categorias e stock',
};

export default async function AdminManagementPage() {
  const staff = await getAuthenticatedStaff();

  if (!staff) {
    redirect('/admin/login');
  }

  const [stockRes, categoriesRes] = await Promise.all([
    getRestaurantStockList(),
    getRestaurantCategories(),
  ]);
  const initialProducts = stockRes.success ? stockRes.data : [];
  const initialCategories = categoriesRes.success ? categoriesRes.data : [];

  return (
    <QuickStockDrawer
      variant="page"
      restaurantId={staff.restaurant.id}
      initialProducts={initialProducts}
      initialCategories={initialCategories}
    />
  );
}
