import React from 'react';
import { notFound } from 'next/navigation';
import { getRestaurantBySlugWithMenu } from '@/services/restaurantService';
import { RestaurantMenuView } from '@/components/menu/RestaurantMenuView';
import { setRequestLocale } from 'next-intl/server';
import { routing, Locale } from '@/i18n/routing';

interface MenuPageProps {
  params: Promise<{
    locale: string;
    restaurantSlug: string;
  }>;
  searchParams?: Promise<{
    table?: string;
  }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: MenuPageProps) {
  const { locale, restaurantSlug } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    return { title: 'Not found' };
  }
  setRequestLocale(locale);

  const menuData = await getRestaurantBySlugWithMenu(restaurantSlug);
  if (!menuData) {
    return { title: 'Restaurante não encontrado' };
  }
  return {
    title: `${menuData.restaurant.fullName} (${menuData.restaurant.location}) — Menu Digital`,
    description: menuData.restaurant.description,
  };
}

export default async function RestaurantMenuPage({
  params,
  searchParams,
}: MenuPageProps) {
  const { locale, restaurantSlug } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const queryTable = resolvedSearchParams.table ? Number(resolvedSearchParams.table) : undefined;

  const menuData = await getRestaurantBySlugWithMenu(restaurantSlug);
  if (!menuData) {
    notFound();
  }

  return (
    <RestaurantMenuView
      restaurant={menuData.restaurant}
      categories={menuData.categories}
      products={menuData.products}
      initialTableNumber={queryTable}
      lockTable={!!queryTable}
    />
  );
}
