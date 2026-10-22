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
    id: 'b1111111-0024-4000-8000-000000000024',
    name: 'Bolo do Caco com Manteiga d’ Alho',
    price: 3,
    categorySlug: 'entradas',
  },
  {
    id: 'b1111111-0033-4000-8000-000000000033',
    name: 'Batata frita palito',
    price: 2.7,
    categorySlug: 'entradas',
  },
  {
    id: 'b1111111-0035-4000-8000-000000000035',
    name: 'Caracóizz ao Alho',
    price: 6,
    categorySlug: 'caracoizz',
  },
  {
    id: 'b1111111-0044-4000-8000-000000000044',
    name: 'PANUOZZO IBERICO',
    price: 12,
    categorySlug: 'panuozzos',
  },
  {
    id: 'b1111111-0121-4000-8000-000000000121',
    name: 'Coca-Cola 35cl',
    price: 2.1,
    categorySlug: 'bebidas',
  },
  {
    id: 'b1111111-0107-4000-8000-000000000107',
    name: 'LA ROSA IPA 33cl',
    price: 4,
    categorySlug: 'cervejas',
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
