'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedStaff } from '@/lib/auth/staff';
import { OrderStatus } from '@/types/restaurant';
import {
  getOrderByIdSchema,
  updateOrderStatusSchema,
  reopenOrderSchema,
  isValidStatusTransition,
} from '@/lib/validations/order-management';

export interface ManagedOrderItem {
  id: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  categorySlug: string | null;
}

export interface ManagedOrder {
  id: string;
  orderNumber: number;
  tableNumber: number;
  status: OrderStatus;
  subtotal: number;
  total: number;
  customerNotes: string | null;
  createdAt: string;
  updatedAt: string;
  items: ManagedOrderItem[];
}

export type OrderManagementErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_INPUT'
  | 'ORDER_NOT_FOUND'
  | 'INVALID_STATUS_TRANSITION'
  | 'OPTIMISTIC_CONFLICT'
  | 'DATABASE_ERROR';

export interface OrderManagementError {
  code: OrderManagementErrorCode;
  message: string;
}

export type OrderManagementActionResult<T> =
  | {
    success: true;
    data: T;
  }
  | {
    success: false;
    error: OrderManagementError;
  };

interface RawOrderItemRow {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  products?: {
    categories?: {
      slug: string;
    } | null;
  } | null;
}

interface RawOrderRow {
  id: string;
  order_number: number;
  table_number: number;
  status: string;
  subtotal: number;
  total: number;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: RawOrderItemRow[] | null;
}

function mapRawOrderToManagedOrder(row: RawOrderRow): ManagedOrder {
  const items: ManagedOrderItem[] = Array.isArray(row.order_items)
    ? row.order_items.map((item) => ({
      id: String(item.id),
      productId: item.product_id ? String(item.product_id) : null,
      productName: String(item.product_name),
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      notes: item.notes ? String(item.notes) : null,
      categorySlug: item.products?.categories?.slug ?? null,
    }))
    : [];

  return {
    id: String(row.id),
    orderNumber: Number(row.order_number),
    tableNumber: Number(row.table_number),
    status: row.status as OrderStatus,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    customerNotes: row.customer_notes ? String(row.customer_notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    items,
  };
}

const ORDER_SELECT = `
  id,
  order_number,
  table_number,
  status,
  subtotal,
  total,
  customer_notes,
  created_at,
  updated_at,
  order_items (
    id,
    product_id,
    product_name,
    quantity,
    unit_price,
    notes,
    products (
      categories (
        slug
      )
    )
  )
` as const;

function toComparableTimestamp(value: string): number | null {
  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function hasTimestampConflict(
  expectedUpdatedAt: string | undefined,
  databaseUpdatedAt: string | null
): boolean {
  if (!expectedUpdatedAt || !databaseUpdatedAt) {
    return false;
  }

  const expectedTimestamp = toComparableTimestamp(expectedUpdatedAt);
  const databaseTimestamp = toComparableTimestamp(databaseUpdatedAt);

  if (expectedTimestamp === null || databaseTimestamp === null) {
    return true;
  }

  return expectedTimestamp !== databaseTimestamp;
}

export async function getActiveOrders(): Promise<
  OrderManagementActionResult<ManagedOrder[]>
> {
  try {
    const staff = await getAuthenticatedStaff();

    if (!staff) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sessão expirada ou utilizador não autorizado.',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Serviço de base de dados indisponível.',
        },
      };
    }

    const activeStatuses: OrderStatus[] = [
      'pending',
      'accepted',
      'preparing',
      'ready',
    ];

    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('restaurant_id', staff.restaurant.id)
      .in('status', activeStatuses)
      .order('created_at', { ascending: true });

    if (error) {
      console.error(
        '[getActiveOrders] Erro ao consultar pedidos ativos:',
        error.message
      );

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Ocorreu um erro ao carregar os pedidos ativos.',
        },
      };
    }

    const managedOrders = (data || []).map((row) =>
      mapRawOrderToManagedOrder(row as unknown as RawOrderRow)
    );

    return {
      success: true,
      data: managedOrders,
    };
  } catch (err: unknown) {
    console.error('[getActiveOrders] Exceção inesperada:', err);

    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ocorreu um erro inesperado ao consultar os pedidos.',
      },
    };
  }
}

export async function getOrderById(
  orderIdOrInput: unknown
): Promise<OrderManagementActionResult<ManagedOrder>> {
  try {
    const rawInput =
      typeof orderIdOrInput === 'string'
        ? { orderId: orderIdOrInput }
        : orderIdOrInput;

    const parsed = getOrderByIdSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message:
            parsed.error.issues[0]?.message ??
            'Identificador de pedido inválido.',
        },
      };
    }

    const { orderId } = parsed.data;
    const staff = await getAuthenticatedStaff();

    if (!staff) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sessão expirada ou utilizador não autorizado.',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Serviço de base de dados indisponível.',
        },
      };
    }

    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', orderId)
      .eq('restaurant_id', staff.restaurant.id)
      .maybeSingle();

    if (error) {
      console.error(
        `[getOrderById] Erro ao consultar pedido ${orderId}:`,
        error.message
      );

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Ocorreu um erro ao obter os detalhes do pedido.',
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message:
            'Pedido não encontrado ou não pertence a este restaurante.',
        },
      };
    }

    return {
      success: true,
      data: mapRawOrderToManagedOrder(data as unknown as RawOrderRow),
    };
  } catch (err: unknown) {
    console.error('[getOrderById] Exceção inesperada:', err);

    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ocorreu um erro inesperado ao obter os detalhes do pedido.',
      },
    };
  }
}

export async function updateOrderStatus(
  orderIdOrInput: unknown,
  maybeNextStatus?: unknown
): Promise<OrderManagementActionResult<ManagedOrder>> {
  try {
    const rawInput =
      typeof orderIdOrInput === 'string' && typeof maybeNextStatus === 'string'
        ? { orderId: orderIdOrInput, nextStatus: maybeNextStatus }
        : orderIdOrInput;

    const parsed = updateOrderStatusSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message:
            parsed.error.issues[0]?.message ??
            'Dados de atualização inválidos.',
        },
      };
    }

    const { orderId, nextStatus, expectedUpdatedAt } = parsed.data;
    const staff = await getAuthenticatedStaff();

    if (!staff) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sessão expirada ou utilizador não autorizado.',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Serviço de base de dados indisponível.',
        },
      };
    }

    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, updated_at, restaurant_id')
      .eq('id', orderId)
      .eq('restaurant_id', staff.restaurant.id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        `[updateOrderStatus] Erro ao verificar estado do pedido ${orderId}:`,
        fetchError.message
      );

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Ocorreu um erro ao verificar o estado atual do pedido.',
        },
      };
    }

    if (!currentOrder) {
      return {
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message:
            'Pedido não encontrado ou não pertence a este restaurante.',
        },
      };
    }

    const databaseUpdatedAt = String(currentOrder.updated_at);

    if (hasTimestampConflict(expectedUpdatedAt, databaseUpdatedAt)) {
      return {
        success: false,
        error: {
          code: 'OPTIMISTIC_CONFLICT',
          message:
            'Este pedido foi alterado por outro utilizador. A lista foi atualizada.',
        },
      };
    }

    const currentStatus = currentOrder.status as OrderStatus;

    if (!isValidStatusTransition(currentStatus, nextStatus as OrderStatus)) {
      return {
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Transição de estado inválida: não é permitido transitar de "${currentStatus}" para "${nextStatus}".`,
        },
      };
    }

    const now = new Date().toISOString();

    let updateQuery = supabase
      .from('orders')
      .update({
        status: nextStatus as OrderStatus,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('restaurant_id', staff.restaurant.id)
      .eq('status', currentStatus);

    if (expectedUpdatedAt) {
      updateQuery = updateQuery.eq('updated_at', databaseUpdatedAt);
    }

    const { data: updatedOrder, error: updateError } = await updateQuery
      .select(ORDER_SELECT)
      .maybeSingle();

    if (updateError) {
      console.error(
        `[updateOrderStatus] Erro ao atualizar pedido ${orderId}:`,
        updateError.message
      );

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Ocorreu um erro ao atualizar o estado do pedido.',
        },
      };
    }

    if (!updatedOrder) {
      return {
        success: false,
        error: {
          code: 'OPTIMISTIC_CONFLICT',
          message:
            'Este pedido foi alterado por outro utilizador. A lista foi atualizada.',
        },
      };
    }

    return {
      success: true,
      data: mapRawOrderToManagedOrder(
        updatedOrder as unknown as RawOrderRow
      ),
    };
  } catch (err: unknown) {
    console.error('[updateOrderStatus] Exceção inesperada:', err);

    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ocorreu um erro inesperado ao atualizar o estado do pedido.',
      },
    };
  }
}

export async function getOrderHistory(
  options?: { limit?: number }
): Promise<OrderManagementActionResult<ManagedOrder[]>> {
  try {
    const staff = await getAuthenticatedStaff();

    if (!staff) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sessão expirada ou utilizador não autorizado.',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Serviço de base de dados indisponível.',
        },
      };
    }

    const limit = Math.min(Math.max(Number(options?.limit) || 50, 1), 100);
    const historyStatuses: OrderStatus[] = ['completed', 'cancelled'];

    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT)
      .eq('restaurant_id', staff.restaurant.id)
      .in('status', historyStatuses)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(
        '[getOrderHistory] Erro ao consultar histórico de pedidos:',
        error.message
      );

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Ocorreu um erro ao carregar o histórico de pedidos.',
        },
      };
    }

    const managedOrders = (data || []).map((row) =>
      mapRawOrderToManagedOrder(row as unknown as RawOrderRow)
    );

    return {
      success: true,
      data: managedOrders,
    };
  } catch (err: unknown) {
    console.error('[getOrderHistory] Exceção inesperada:', err);

    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ocorreu um erro inesperado ao consultar o histórico.',
      },
    };
  }
}

export async function reopenCompletedOrder(
  input: unknown
): Promise<OrderManagementActionResult<ManagedOrder>> {
  try {
    const parsed = reopenOrderSchema.safeParse(
      typeof input === 'string' ? { orderId: input } : input
    );

    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message:
            parsed.error.issues[0]?.message ??
            'Identificador de pedido inválido.',
        },
      };
    }

    const { orderId, expectedUpdatedAt } = parsed.data;
    const staff = await getAuthenticatedStaff();

    if (!staff) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Sessão expirada ou utilizador não autorizado.',
        },
      };
    }

    const supabase = await createServerSupabaseClient();

    if (!supabase) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Serviço de base de dados indisponível.',
        },
      };
    }

    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status, updated_at, restaurant_id')
      .eq('id', orderId)
      .eq('restaurant_id', staff.restaurant.id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        `[reopenCompletedOrder] Erro ao verificar pedido ${orderId}:`,
        fetchError.message
      );

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Ocorreu um erro ao verificar o pedido.',
        },
      };
    }

    if (!currentOrder) {
      return {
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message:
            'Pedido não encontrado ou não pertence a este restaurante.',
        },
      };
    }

    if (currentOrder.status !== 'completed') {
      return {
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Apenas pedidos concluídos podem ser reabertos. Estado atual: "${currentOrder.status}".`,
        },
      };
    }

    const databaseUpdatedAt = String(currentOrder.updated_at);

    if (hasTimestampConflict(expectedUpdatedAt, databaseUpdatedAt)) {
      return {
        success: false,
        error: {
          code: 'OPTIMISTIC_CONFLICT',
          message:
            'Este pedido foi alterado por outro utilizador. A lista foi atualizada.',
        },
      };
    }

    const now = new Date().toISOString();

    let updateQuery = supabase
      .from('orders')
      .update({
        status: 'accepted' as OrderStatus,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('restaurant_id', staff.restaurant.id)
      .eq('status', 'completed');

    if (expectedUpdatedAt) {
      updateQuery = updateQuery.eq('updated_at', databaseUpdatedAt);
    }

    const { data: reopenedOrder, error: updateError } = await updateQuery
      .select(ORDER_SELECT)
      .maybeSingle();

    if (updateError) {
      console.error(
        `[reopenCompletedOrder] Erro ao reabrir pedido ${orderId}:`,
        updateError.message
      );

      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Ocorreu um erro ao reabrir o pedido.',
        },
      };
    }

    if (!reopenedOrder) {
      return {
        success: false,
        error: {
          code: 'OPTIMISTIC_CONFLICT',
          message:
            'Este pedido foi alterado por outro utilizador. A lista foi atualizada.',
        },
      };
    }

    return {
      success: true,
      data: mapRawOrderToManagedOrder(
        reopenedOrder as unknown as RawOrderRow
      ),
    };
  } catch (err: unknown) {
    console.error('[reopenCompletedOrder] Exceção inesperada:', err);

    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ocorreu um erro inesperado ao reabrir o pedido.',
      },
    };
  }
}