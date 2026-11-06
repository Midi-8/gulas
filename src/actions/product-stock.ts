'use server';

import { z } from 'zod';
import { revalidatePath, updateTag } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedStaff } from '@/lib/auth/staff';

const toggleProductAvailabilitySchema = z.object({
  productId: z.string().uuid('Identificador de produto inválido.'),
  isAvailable: z.boolean(),
});

export interface ProductStockItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  unitQuantity?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
}

export type ProductStockActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

/**
 * Server Action para comutar a disponibilidade de um artigo em tempo real.
 * Garante validação estrita de staff e isolamento por restaurant_id.
 */
export async function toggleProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<ProductStockActionResult<{ productId: string; isAvailable: boolean; productName: string }>> {
  try {
    const parsed = toggleProductAvailabilitySchema.safeParse({ productId, isAvailable });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Parâmetros inválidos.',
        },
      };
    }

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

    // 1. Verificar se o produto existe e pertence ao restaurante do staff autenticado
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name, restaurant_id, is_available')
      .eq('id', parsed.data.productId)
      .eq('restaurant_id', staff.restaurant.id)
      .maybeSingle();

    if (fetchError || !product) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Artigo não encontrado ou não pertence ao seu restaurante.',
        },
      };
    }

    // 2. Atualizar disponibilidade
    const { error: updateError } = await supabase
      .from('products')
      .update({
        is_available: parsed.data.isAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.productId)
      .eq('restaurant_id', staff.restaurant.id);

    if (updateError) {
      console.error('[toggleProductAvailability] Erro no update do Supabase:', updateError.message);
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Falha ao atualizar o stock do artigo.',
        },
      };
    }

    // 3. Revalidar rotas críticas do Next.js
    try {
      updateTag('menu');
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'page');
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'layout');
      revalidatePath('/admin/orders', 'page');
      revalidatePath('/admin/analytics', 'page');
    } catch (revalidateErr) {
      console.warn('[toggleProductAvailability] Revalidação de cache suave:', revalidateErr);
    }

    return {
      success: true,
      data: {
        productId: parsed.data.productId,
        isAvailable: parsed.data.isAvailable,
        productName: product.name,
      },
    };
  } catch (err: unknown) {
    console.error('[toggleProductAvailability] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro inesperado ao alterar o stock.',
      },
    };
  }
}

/**
 * Consulta a lista completa de produtos e o seu estado de stock para o restaurante autenticado.
 */
export async function getRestaurantStockList(): Promise<ProductStockActionResult<ProductStockItem[]>> {
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

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        is_available,
        display_order,
        category_id,
        unit_quantity,
        image_url,
        categories (
          id,
          name,
          slug,
          display_order
        )
      `)
      .eq('restaurant_id', staff.restaurant.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[getRestaurantStockList] Erro na consulta de produtos:', error.message);
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: 'Não foi possível carregar a lista de artigos.',
        },
      };
    }

    const items: ProductStockItem[] = (data || []).map((row) => {
      const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
      return {
        id: row.id,
        name: row.name,
        price: Number(row.price),
        isAvailable: Boolean(row.is_available),
        categoryId: row.category_id,
        categoryName: category?.name || 'Geral',
        categorySlug: category?.slug || 'geral',
        unitQuantity: row.unit_quantity,
        imageUrl: row.image_url,
        displayOrder: row.display_order,
      };
    });

    return {
      success: true,
      data: items,
    };
  } catch (err: unknown) {
    console.error('[getRestaurantStockList] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro ao carregar os dados de stock.',
      },
    };
  }
}

/**
 * Server Action para abrir ou encerrar a receção de pedidos digitais do restaurante em tempo real.
 */
export async function toggleRestaurantOpenStatus(
  isOpen: boolean
): Promise<ProductStockActionResult<{ isOpen: boolean }>> {
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

    const { data: updatedRestaurant, error: updateError } = await supabase
      .from('restaurants')
      .update({
        is_open: Boolean(isOpen),
        updated_at: new Date().toISOString(),
      })
      .eq('id', staff.restaurant.id)
      .select('id, is_open')
      .maybeSingle();

    if (updateError || !updatedRestaurant) {
      console.error(
        '[toggleRestaurantOpenStatus] Erro ou bloqueio RLS no update:',
        updateError?.message
      );
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message:
            'Não foi possível persistir o estado de abertura do restaurante (verifique permissões na base de dados).',
        },
      };
    }

    try {
      updateTag('menu');
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'page');
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'layout');
      revalidatePath('/admin/orders', 'page');
    } catch (revalidateErr) {
      console.warn('[toggleRestaurantOpenStatus] Revalidação suave:', revalidateErr);
    }

    return {
      success: true,
      data: { isOpen: Boolean(isOpen) },
    };
  } catch (err: unknown) {
    console.error('[toggleRestaurantOpenStatus] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro ao alterar o estado do restaurante.',
      },
    };
  }
}
