'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedStaff } from '@/lib/auth/staff';
import { createOrder, CreateOrderActionResult } from '@/actions/orders';
import {
  getActiveOrders,
  updateOrderStatus,
  reopenCompletedOrder,
  ManagedOrder,
  OrderManagementActionResult,
} from '@/actions/order-management';
import { ValidNextStatus, ALLOWED_STATUS_TRANSITIONS } from '@/lib/validations/order-management';

export interface TestBenchProduct {
  id: string;
  name: string;
  price: number;
  categorySlug?: string;
}

export interface TestBenchContextResult {
  restaurantSlug: string;
  restaurantId: string;
  isStaffAuthenticated: boolean;
  staffEmail?: string;
  products: TestBenchProduct[];
}

const FALLBACK_PRODUCTS: TestBenchProduct[] = [
  {
    id: 'b1111111-0001-4000-8000-000000000001',
    name: "Bolo do Caco com Manteiga d'Alho",
    price: 3.8,
    categorySlug: 'entradas',
  },
  {
    id: 'b1111111-0007-4000-8000-000000000007',
    name: 'Batata Frita Palito',
    price: 3.4,
    categorySlug: 'entradas',
  },
  {
    id: 'b1111111-0009-4000-8000-000000000009',
    name: 'Caracóizz ao Alho',
    price: 7.8,
    categorySlug: 'caracoizzz',
  },
  {
    id: 'b1111111-0017-4000-8000-000000000017',
    name: 'Panuozzo Ibérico',
    price: 15.0,
    categorySlug: 'panuozzos',
  },
  {
    id: 'b1111111-0051-4000-8000-000000000051',
    name: 'Coca-Cola Zero (33cl)',
    price: 2.0,
    categorySlug: 'bebidas',
  },
  {
    id: 'b1111111-0053-4000-8000-000000000053',
    name: 'Cerveja Super Bock (33cl)',
    price: 2.2,
    categorySlug: 'bebidas',
  },
];

export async function getTestBenchContext(): Promise<TestBenchContextResult> {
  const staff = await getAuthenticatedStaff();
  const supabase = await createServerSupabaseClient();

  let products = FALLBACK_PRODUCTS;

  if (supabase) {
    try {
      const { data: dbProducts } = await supabase
        .from('products')
        .select('id, name, price, categories(slug)')
        .eq('is_available', true)
        .limit(15);

      if (dbProducts && dbProducts.length > 0) {
        products = dbProducts.map((p) => {
          const categorySlug =
            p.categories && typeof p.categories === 'object' && 'slug' in p.categories
              ? String((p.categories as { slug: string }).slug)
              : undefined;

          return {
            id: String(p.id),
            name: String(p.name),
            price: Number(p.price),
            categorySlug,
          };
        });
      }
    } catch {
      // Use fallback products if query fails
    }
  }

  return {
    restaurantSlug: staff?.restaurant.slug || 'gulas',
    restaurantId: staff?.restaurant.id || 'e1a1a1a1-1111-4111-a111-111111111111',
    isStaffAuthenticated: Boolean(staff),
    staffEmail: staff?.email,
    products,
  };
}

export async function dispatchSimulatedOrder(params: {
  restaurantSlug?: string;
  tableNumber: number;
  customerNotes?: string | null;
  items: Array<{ productId: string; quantity: number; notes?: string | null }>;
}): Promise<CreateOrderActionResult> {
  return createOrder({
    restaurantSlug: params.restaurantSlug || 'gulas',
    tableNumber: params.tableNumber,
    customerNotes: params.customerNotes,
    items: params.items,
  });
}

export async function fetchActiveOrdersForBench(): Promise<
  OrderManagementActionResult<ManagedOrder[]>
> {
  return getActiveOrders();
}

export async function advanceOrderForBench(params: {
  orderId: string;
  currentStatus: string;
  expectedUpdatedAt: string;
}): Promise<OrderManagementActionResult<ManagedOrder>> {
  const nextTransitions = ALLOWED_STATUS_TRANSITIONS[params.currentStatus];
  const nextStatus = nextTransitions?.[0] as ValidNextStatus | undefined;

  if (!nextStatus) {
    return {
      success: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: `O pedido encontra-se no estado "${params.currentStatus}" e não tem próxima transição direta.`,
      },
    };
  }

  return updateOrderStatus({
    orderId: params.orderId,
    nextStatus,
    expectedUpdatedAt: params.expectedUpdatedAt,
  });
}

export async function completeOrderForBench(params: {
  orderId: string;
  expectedUpdatedAt: string;
}): Promise<OrderManagementActionResult<ManagedOrder>> {
  return updateOrderStatus({
    orderId: params.orderId,
    nextStatus: 'completed',
    expectedUpdatedAt: params.expectedUpdatedAt,
  });
}

export async function reopenOrderForBench(params: {
  orderId: string;
  expectedUpdatedAt: string;
}): Promise<OrderManagementActionResult<ManagedOrder>> {
  return reopenCompletedOrder({
    orderId: params.orderId,
    expectedUpdatedAt: params.expectedUpdatedAt,
  });
}
