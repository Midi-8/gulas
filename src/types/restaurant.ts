export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type ProductBadge =
  | 'picante'
  | 'vegetariano'
  | 'vegan'
  | 'especialidade'
  | 'novidade'
  | 'house_special'
  | 'popular'
  | 'promocao'
  | 'extra'
  | 'acompanhamento';

export interface Restaurant {
  id: string;
  name: string;
  fullName: string;
  slug: string;
  tagline: string;
  description: string;
  location: string;
  logoUrl?: string;
  coverImageUrl: string;
  currency: string;
  timezone: string;
  address: string;
  phone?: string;
  isOpen: boolean;
  openingHours: string;
  rating?: number;
  reviewCount?: number;
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  slug: string;
  description?: string;
  subtitle?: string;
  position: number;
  active: boolean;
  isSpecialty?: boolean;
}

export interface Product {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // in Euros
  cost?: number; // estimated ingredient cost for analytics
  imageUrl: string;
  available: boolean;
  position: number;
  badges?: ProductBadge[];
  unitQuantity?: string; // e.g. "6 unidades", "Média — 31 cm"
  includesNotes?: string; // e.g. "Inclui batata palito"
  customizationNote?: string; // e.g. "Opção queijo mozzarella sem custo adicional"
  allergens?: string[];
  prepTimeMinutes?: number;
}

export interface Table {
  id: string;
  restaurantId: string;
  number: number;
  name: string;
  active: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber?: number;
  restaurantId?: string;
  restaurantSlug?: string;
  restaurantName?: string;
  tableId?: string;
  tableNumber: number;
  tableName?: string;
  items: CartItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  customerNotes?: string;
  trackingToken?: string;
}


