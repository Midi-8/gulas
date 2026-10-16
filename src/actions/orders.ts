'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createOrderSchema } from '@/lib/validations/order';


export interface CreateOrderItemResult {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
}


export interface CreateOrderResultData {
  orderId: string;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  tableId: string;
  tableNumber: number;
  tableName?: string;
  orderNumber: number;
  status: string;
  subtotal: number;
  total: number;
  customerNotes: string | null;
  createdAt: string;
  trackingToken: string;
  items: CreateOrderItemResult[];
}


export type CreateOrderActionResult =
  | {
    success: true;
    data: CreateOrderResultData;
  }
  | {
    success: false;
    error: {
      code:
      | 'VALIDATION_ERROR'
      | 'EMPTY_CART'
      | 'RESTAURANT_INACTIVE'
      | 'RESTAURANT_CLOSED'
      | 'TABLE_INVALID'
      | 'PRODUCT_UNAVAILABLE'
      | 'PRODUCT_INVALID'
      | 'INVALID_QUANTITY'
      | 'DATABASE_ERROR';
      message: string;
    };
  };


/**
 * Mapeamento controlado de mensagens de erro emitidas pela RPC PostgreSQL para
 * códigos de erro estruturados e mensagens amigáveis em Português.
 */
function mapDatabaseError(rawMessage: string): {
  code:
  | 'VALIDATION_ERROR'
  | 'EMPTY_CART'
  | 'RESTAURANT_INACTIVE'
  | 'RESTAURANT_CLOSED'
  | 'TABLE_INVALID'
  | 'PRODUCT_UNAVAILABLE'
  | 'PRODUCT_INVALID'
  | 'INVALID_QUANTITY'
  | 'DATABASE_ERROR';
  message: string;
} {
  const msg = rawMessage.toLowerCase();


  if (msg.includes('restaurant_not_found') || msg.includes('restaurant_inactive')) {
    return {
      code: 'RESTAURANT_INACTIVE',
      message: 'O restaurante não foi encontrado ou encontra-se inativo.',
    };
  }


  if (msg.includes('restaurant_closed')) {
    return {
      code: 'RESTAURANT_CLOSED',
      message: 'O restaurante encontra-se encerrado de momento e não está a aceitar pedidos.',
    };
  }


  if (msg.includes('table_invalid')) {
    return {
      code: 'TABLE_INVALID',
      message: 'A mesa selecionada não é válida ou encontra-se indisponível.',
    };
  }


  if (msg.includes('empty_cart')) {
    return {
      code: 'EMPTY_CART',
      message: 'O carrinho encontra-se vazio.',
    };
  }


  if (msg.includes('product_unavailable')) {
    // Extrai o nome do produto se disponível na mensagem da RPC
    const match = rawMessage.match(/artigo\s+"([^"]+)"/i);
    const productName = match ? ` "${match[1]}"` : '';
    return {
      code: 'PRODUCT_UNAVAILABLE',
      message: `O artigo${productName} encontra-se indisponível ou esgotado de momento.`,
    };
  }


  if (msg.includes('product_invalid')) {
    return {
      code: 'PRODUCT_INVALID',
      message: 'Um ou mais artigos selecionados não são válidos para este restaurante.',
    };
  }


  if (msg.includes('invalid_quantity')) {
    return {
      code: 'INVALID_QUANTITY',
      message: 'A quantidade de artigos no pedido é inválida.',
    };
  }


  if (msg.includes('invalid_notes')) {
    return {
      code: 'VALIDATION_ERROR',
      message: 'As observações enviadas excedem os limites permitidos.',
    };
  }


  return {
    code: 'DATABASE_ERROR',
    message: 'Ocorreu um erro ao registar o teu pedido. Por favor tenta novamente.',
  };
}


/**
 * Server Action segura para submissão de pedidos no Gulas.
 * Executa validação Zod, resolução do restaurante via slug e transação atómica via RPC.
 */
export async function createOrder(
  input: unknown
): Promise<CreateOrderActionResult> {
  // 1. Validação estrita do input com Zod (inclui deteção de duplicados)
  const validationResult = createOrderSchema.safeParse(input);


  if (!validationResult.success) {
    const firstIssue = validationResult.error.issues[0];
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue?.message || 'Dados do pedido inválidos.',
      },
    };
  }


  const { restaurantSlug, tableNumber, customerNotes, items } =
    validationResult.data;


  // 2. Obter cliente Supabase server-side existente (sem service_role)
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


  // 3. Formatar itens para a RPC (apenas product_id, quantity, notes — sem preços!)
  const rpcItemsPayload = items.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
    notes: item.notes,
  }));


  try {
    // 4. Invocar RPC PostgreSQL transacional SECURITY DEFINER
    const { data, error } = await supabase.rpc('create_order_atomic', {
      p_restaurant_slug: restaurantSlug,
      p_table_number: tableNumber,
      p_customer_notes: customerNotes ?? null,
      p_items: rpcItemsPayload,
    });


    if (error) {
      console.error('[createOrder] Erro na RPC create_order_atomic:', error.message);
      const mappedError = mapDatabaseError(error.message);
      return {
        success: false,
        error: mappedError,
      };
    }


    // 5. Validar resposta da RPC
    const responsePayload = data as {
      success?: boolean;
      order?: {
        id: string;
        restaurant_id: string;
        restaurant_slug: string;
        restaurant_name: string;
        table_id: string;
        table_number: number;
        table_name?: string;
        order_number: number;
        status: string;
        subtotal: number;
        total: number;
        customer_notes: string | null;
        created_at: string;
        tracking_token: string;
        items: {
          id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          notes: string | null;
        }[];
      };
    };


    if (!responsePayload || !responsePayload.success || !responsePayload.order) {
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Resposta inesperada ao registar pedido.',
        },
      };
    }


    const orderData = responsePayload.order;


    // 6. Validar que o token de acompanhamento foi gerado e retornado
    if (!orderData.tracking_token || orderData.tracking_token.trim() === '') {
      console.error('[createOrder] RPC não retornou tracking_token:', orderData);
      return {
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: 'Erro ao gerar credencial de acompanhamento do pedido.',
        },
      };
    }


    return {
      success: true,
      data: {
        orderId: orderData.id,
        restaurantId: orderData.restaurant_id,
        restaurantSlug: orderData.restaurant_slug,
        restaurantName: orderData.restaurant_name,
        tableId: orderData.table_id,
        tableNumber: orderData.table_number,
        tableName: orderData.table_name,
        orderNumber: orderData.order_number,
        status: orderData.status,
        subtotal: Number(orderData.subtotal),
        total: Number(orderData.total),
        customerNotes: orderData.customer_notes,
        createdAt: orderData.created_at,
        trackingToken: orderData.tracking_token,
        items: (orderData.items || []).map((item) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          notes: item.notes,
        })),
      },
    };
  } catch (err: unknown) {
    const rawError = err instanceof Error ? err.message : String(err);
    console.error('[createOrder] Exceção inesperada:', rawError);
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Ocorreu um erro inesperado ao processar o pedido.',
      },
    };
  }
}


export interface PublicOrderStatusResult {
  id: string;
  orderNumber: number;
  tableNumber: number;
  tableName?: string;
  status: string;
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    notes: string | null;
  }>;
}


export type GetOrderPublicStatusResult =
  | {
    success: true;
    data: PublicOrderStatusResult;
  }
  | {
    success: false;
    error: string;
  };


/**
 * Server Action para consulta pública resiliente do estado de um pedido ativo.
 * Permite ao cliente acompanhar o progresso em tempo real mesmo se a ligação WebSocket falhar.
 */
export async function getOrderPublicStatus(
  orderId: string,
  trackingToken?: string | null
): Promise<GetOrderPublicStatusResult> {
  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
    return {
      success: false,
      error: 'Identificador do pedido inválido.',
    };
  }


  const cleanToken = typeof trackingToken === 'string' ? trackingToken.trim() : null;


  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      error: 'Serviço de base de dados indisponível.',
    };
  }


  try {
    // Consulta exclusivamente via RPC com validação do tracking_token criptográfico
    // NENHUM fallback para SELECT direto na tabela orders é permitido.
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_public_order_status',
      {
        p_order_id: orderId.trim(),
        p_tracking_token: cleanToken,
      }
    );


    if (rpcError) {
      console.error('[getOrderPublicStatus] Erro na RPC get_public_order_status:', rpcError.message);
      return {
        success: false,
        error: rpcError.message,
      };
    }


    if (!rpcData) {
      return {
        success: false,
        error: 'Pedido não encontrado ou credencial de acompanhamento inválida.',
      };
    }


    const order = rpcData as {
      id: string;
      order_number: number;
      table_number: number;
      status: string;
      subtotal: number;
      total: number;
      created_at: string;
      updated_at: string;
      items: Array<{
        id: string;
        product_name: string;
        quantity: number;
        unit_price: number;
        notes: string | null;
      }>;
    };


    return {
      success: true,
      data: {
        id: order.id,
        orderNumber: order.order_number,
        tableNumber: order.table_number,
        tableName: `Mesa ${order.table_number}`,
        status: order.status,
        subtotal: Number(order.subtotal),
        total: Number(order.total),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: (order.items || []).map((item) => ({
          id: item.id,
          productName: item.product_name,
          quantity: item.quantity,
          unitPrice: Number(item.unit_price),
          notes: item.notes,
        })),
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro ao consultar pedido.';
    return {
      success: false,
      error: message,
    };
  }
}


export interface MultiplePublicOrderStatusResult {
  orders: PublicOrderStatusResult[];
  foundIds: string[];
  missingIds: string[];
}


export type GetMultipleOrdersPublicStatusResult =
  | {
    success: true;
    data: MultiplePublicOrderStatusResult;
  }
  | {
    success: false;
    error: string;
  };


export type OrderQueryItem =
  | string
  | {
    orderId: string;
    trackingToken?: string | null;
  };


/**
 * Server Action para validação em lote e sincronização de pedidos ativos.
 * Exige identificador e token de acompanhamento para cada pedido.
 */
export async function getMultipleOrdersPublicStatus(
  orderQueries: OrderQueryItem[]
): Promise<GetMultipleOrdersPublicStatusResult> {
  if (!orderQueries || !Array.isArray(orderQueries) || orderQueries.length === 0) {
    return {
      success: true,
      data: {
        orders: [],
        foundIds: [],
        missingIds: [],
      },
    };
  }


  // Normalizar itens recebidos
  const normalized: Array<{ orderId: string; trackingToken: string | null }> = [];
  orderQueries.forEach((item) => {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      if (trimmed) normalized.push({ orderId: trimmed, trackingToken: null });
    } else if (item && typeof item.orderId === 'string') {
      const trimmedId = item.orderId.trim();
      const trimmedToken =
        typeof item.trackingToken === 'string' ? item.trackingToken.trim() : null;
      if (trimmedId) normalized.push({ orderId: trimmedId, trackingToken: trimmedToken });
    }
  });


  const uniqueById = new Map<string, string | null>();
  normalized.forEach(({ orderId, trackingToken }) => {
    if (!uniqueById.has(orderId)) {
      uniqueById.set(orderId, trackingToken);
    }
  });


  const orders: PublicOrderStatusResult[] = [];
  const foundIds: string[] = [];
  const missingIds: string[] = [];


  // Consulta individual resiliente via RPC protegida
  await Promise.all(
    Array.from(uniqueById.entries()).map(async ([orderId, trackingToken]) => {
      // Se não tiver tracking token, rejeita de imediato (Zero-Trust)
      if (!trackingToken) {
        missingIds.push(orderId);
        return;
      }


      const res = await getOrderPublicStatus(orderId, trackingToken);
      if (res.success && res.data) {
        orders.push(res.data);
        foundIds.push(orderId);
      } else {
        missingIds.push(orderId);
      }
    })
  );


  return {
    success: true,
    data: {
      orders,
      foundIds,
      missingIds,
    },
  };
}