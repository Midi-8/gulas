import React from 'react';
import { notFound } from 'next/navigation';
import { getRestaurantBySlugWithMenu } from '@/services/restaurantService';
import { RestaurantMenuView } from '@/components/menu/RestaurantMenuView';

interface MenuPageProps {
  params: Promise<{
    restaurantSlug: string;
  }>;
  searchParams?: Promise<{
    table?: string;
  }>;
}

export async function generateMetadata({ params }: MenuPageProps) {
  const { restaurantSlug } = await params;
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
  const { restaurantSlug } = await params;
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
