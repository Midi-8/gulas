import React from 'react';
import { notFound } from 'next/navigation';
import {
  getRestaurantBySlugWithMenu,
  getTableByNumber,
} from '@/services/restaurantService';
import { RestaurantMenuView } from '@/components/menu/RestaurantMenuView';
import { setRequestLocale } from 'next-intl/server';
import { routing, Locale } from '@/i18n/routing';

interface TableMenuPageProps {
  params: Promise<{
    locale: string;
    restaurantSlug: string;
    tableNumber: string;
  }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: TableMenuPageProps) {
  const { locale, restaurantSlug, tableNumber } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    return { title: 'Not found' };
  }
  setRequestLocale(locale);

  const menuData = await getRestaurantBySlugWithMenu(restaurantSlug);
  if (!menuData) {
    return { title: 'Restaurante não encontrado' };
  }
  return {
    title: `${menuData.restaurant.name} — Mesa ${tableNumber} (${menuData.restaurant.location})`,
    description: `Menu Digital na Mesa ${tableNumber} do ${menuData.restaurant.fullName}`,
  };
}

export default async function TableMenuPage({ params }: TableMenuPageProps) {
  const { locale, restaurantSlug, tableNumber } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const num = parseInt(tableNumber, 10);

  if (isNaN(num)) {
    notFound();
  }

  const menuData = await getRestaurantBySlugWithMenu(restaurantSlug);
  if (!menuData) {
    notFound();
  }

  const table = await getTableByNumber(menuData.restaurant.id, num);
  if (!table || !table.active) {
    notFound();
  }

  return (
    <RestaurantMenuView
      restaurant={menuData.restaurant}
      categories={menuData.categories}
      products={menuData.products}
      initialTableNumber={num}
      lockTable={true}
    />
  );
}
