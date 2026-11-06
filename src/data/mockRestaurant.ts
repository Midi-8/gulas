import { Restaurant, Table, Category, Product } from '@/types/restaurant';
import {
  RESTAURANT_ID,
  menuAvisos,
  menuCategories,
  menuProducts,
} from '@/data/gulasCatalog';

export const mockRestaurant: Restaurant = {
  id: RESTAURANT_ID,
  name: 'Gulas',
  fullName: 'Gulas – Pizza, Burger & Coffee',
  slug: 'gulas',
  location: 'Vila das Aves, Portugal',
  tagline: 'Pizza • Burger • Coffee',
  description: menuAvisos.join(' '),
  coverImageUrl: '/images/cover.jpg',
  currency: 'EUR',
  timezone: 'Europe/Lisbon',
  address: 'Vila das Aves, Portugal',
  phone: '+351 252 870 120',
  isOpen: true,
  openingHours: '12:00 – 15:00 • 19:00 – 23:00',
};

export const mockCategories: Category[] = menuCategories;
export const mockProducts: Product[] = menuProducts;

export const mockTables: Table[] = [
  { id: 'tbl_1', restaurantId: RESTAURANT_ID, number: 1, name: 'Mesa 1 (Esplanada)', active: true },
  { id: 'tbl_2', restaurantId: RESTAURANT_ID, number: 2, name: 'Mesa 2 (Esplanada)', active: true },
  { id: 'tbl_3', restaurantId: RESTAURANT_ID, number: 3, name: 'Mesa 3 (Interior)', active: true },
  { id: 'tbl_4', restaurantId: RESTAURANT_ID, number: 4, name: 'Mesa 4 (Sala Principal)', active: true },
  { id: 'tbl_5', restaurantId: RESTAURANT_ID, number: 5, name: 'Mesa 5 (Sala Principal)', active: true },
  { id: 'tbl_6', restaurantId: RESTAURANT_ID, number: 6, name: 'Mesa 6 (Balcão / Janela)', active: true },
  { id: 'tbl_7', restaurantId: RESTAURANT_ID, number: 7, name: 'Mesa 7 (Sala Principal)', active: true },
  { id: 'tbl_8', restaurantId: RESTAURANT_ID, number: 8, name: 'Mesa 8 (Central)', active: true },
  { id: 'tbl_9', restaurantId: RESTAURANT_ID, number: 9, name: 'Mesa 9 (Grupo)', active: true },
  { id: 'tbl_10', restaurantId: RESTAURANT_ID, number: 10, name: 'Mesa 10 (Reservado)', active: true },
  { id: 'tbl_11', restaurantId: RESTAURANT_ID, number: 11, name: 'Mesa 11', active: true },
  { id: 'tbl_12', restaurantId: RESTAURANT_ID, number: 12, name: 'Mesa 12', active: true },
  { id: 'tbl_13', restaurantId: RESTAURANT_ID, number: 13, name: 'Mesa 13', active: true },
  { id: 'tbl_14', restaurantId: RESTAURANT_ID, number: 14, name: 'Mesa 14', active: true },
  { id: 'tbl_15', restaurantId: RESTAURANT_ID, number: 15, name: 'Mesa 15', active: true },
  { id: 'tbl_16', restaurantId: RESTAURANT_ID, number: 16, name: 'Mesa 16', active: true },
  { id: 'tbl_17', restaurantId: RESTAURANT_ID, number: 17, name: 'Mesa 17', active: true },
  { id: 'tbl_18', restaurantId: RESTAURANT_ID, number: 18, name: 'Mesa 18', active: true },
  { id: 'tbl_19', restaurantId: RESTAURANT_ID, number: 19, name: 'Mesa 19', active: true },
  { id: 'tbl_20', restaurantId: RESTAURANT_ID, number: 20, name: 'Mesa 20', active: true },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}
