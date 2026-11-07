'use server';

import { z } from 'zod';
import { revalidatePath, updateTag } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedStaff } from '@/lib/auth/staff';

const toggleProductAvailabilitySchema = z.object({
  productId: z.string().uuid('Identificador de produto inválido.'),
  isAvailable: z.boolean(),
});

const updateProductDetailsSchema = z.object({
  productId: z.string().uuid('Identificador de produto inválido.'),
  name: z.string().trim().min(1, 'O nome do artigo é obrigatório.').max(150),
  price: z.number().min(0, 'O preço não pode ser negativo.').max(9999),
  cost: z.number().min(0).max(9999).nullable().optional(),
  description: z.string().max(600).optional(),
  unitQuantity: z.string().max(50).nullable().optional(),
  badges: z.array(z.string()).optional(),
  prepTimeMinutes: z.number().int().min(1).max(180).nullable().optional(),
});

const createProductSchema = z.object({
  categoryId: z.string().uuid('Categoria inválida.'),
  name: z.string().trim().min(1, 'O nome do artigo é obrigatório.').max(150),
  price: z.number().min(0, 'O preço não pode ser negativo.').max(9999),
  cost: z.number().min(0).max(9999).nullable().optional(),
  description: z.string().max(600).optional(),
  unitQuantity: z.string().max(50).nullable().optional(),
  badges: z.array(z.string()).optional(),
});

const toggleCategorySchema = z.object({
  categoryId: z.string().uuid('Identificador de categoria inválido.'),
  isActive: z.boolean(),
});

export interface ProductStockItem {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number | null;
  isAvailable: boolean;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  categoryIsActive: boolean;
  unitQuantity?: string | null;
  imageUrl?: string | null;
  badges: string[];
  prepTimeMinutes?: number | null;
  displayOrder: number;
}

export type ProductStockActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

function revalidateMenuAndAdmin(slug: string) {
  try {
    updateTag('menu');
    revalidatePath(`/menu/${slug}`, 'page');
    revalidatePath(`/menu/${slug}`, 'layout');
    revalidatePath('/admin/orders', 'page');
    revalidatePath('/admin/analytics', 'page');
  } catch (revalidateErr) {
    console.warn('[product-stock] Revalidação de cache suave:', revalidateErr);
  }
}

/**
 * Server Action para comutar a disponibilidade de um artigo em tempo real.
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

    revalidateMenuAndAdmin(staff.restaurant.slug);

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
 * Server Action para editar detalhes de um artigo (nome, preço, custo, descrição, formato, badges).
 */
export async function updateProductDetails(
  input: z.infer<typeof updateProductDetailsSchema>
): Promise<ProductStockActionResult<ProductStockItem>> {
  try {
    const parsed = updateProductDetailsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Dados de artigo inválidos.',
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

    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update({
        name: parsed.data.name,
        price: Number(parsed.data.price.toFixed(2)),
        cost:
          parsed.data.cost !== undefined && parsed.data.cost !== null
            ? Number(parsed.data.cost.toFixed(2))
            : null,
        description: parsed.data.description?.trim() || null,
        unit_quantity: parsed.data.unitQuantity?.trim() || null,
        badges: parsed.data.badges || [],
        prep_time_minutes: parsed.data.prepTimeMinutes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.productId)
      .eq('restaurant_id', staff.restaurant.id)
      .select(`
        id,
        name,
        description,
        price,
        cost,
        is_available,
        display_order,
        category_id,
        unit_quantity,
        image_url,
        badges,
        prep_time_minutes,
        categories (
          id,
          name,
          slug,
          is_active,
          display_order
        )
      `)
      .maybeSingle();

    if (updateError || !updated) {
      console.error('[updateProductDetails] Erro ao atualizar produto:', updateError?.message);
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Não foi possível guardar as alterações do artigo.',
        },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    const category = Array.isArray(updated.categories) ? updated.categories[0] : updated.categories;

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        description: updated.description || '',
        price: Number(updated.price),
        cost: updated.cost !== null && updated.cost !== undefined ? Number(updated.cost) : null,
        isAvailable: Boolean(updated.is_available),
        categoryId: updated.category_id,
        categoryName: category?.name || 'Geral',
        categorySlug: category?.slug || 'geral',
        categoryIsActive: category?.is_active ?? true,
        unitQuantity: updated.unit_quantity,
        imageUrl: updated.image_url,
        badges: updated.badges || [],
        prepTimeMinutes: updated.prep_time_minutes,
        displayOrder: updated.display_order,
      },
    };
  } catch (err: unknown) {
    console.error('[updateProductDetails] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro inesperado ao atualizar o artigo.',
      },
    };
  }
}

/**
 * Server Action para criar um novo artigo no catálogo do restaurante.
 */
export async function createCatalogProduct(
  input: z.infer<typeof createProductSchema>
): Promise<ProductStockActionResult<ProductStockItem>> {
  try {
    const parsed = createProductSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Dados inválidos para criar artigo.',
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

    const baseSlug = parsed.data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
    const uniqueSlug = `${baseSlug || 'artigo'}-${Date.now().toString(36).slice(-4)}`;

    const { data: created, error: createError } = await supabase
      .from('products')
      .insert({
        restaurant_id: staff.restaurant.id,
        category_id: parsed.data.categoryId,
        name: parsed.data.name,
        slug: uniqueSlug,
        price: Number(parsed.data.price.toFixed(2)),
        cost:
          parsed.data.cost !== undefined && parsed.data.cost !== null
            ? Number(parsed.data.cost.toFixed(2))
            : null,
        description: parsed.data.description?.trim() || null,
        unit_quantity: parsed.data.unitQuantity?.trim() || null,
        badges: parsed.data.badges || [],
        is_available: true,
        display_order: 99,
      })
      .select(`
        id,
        name,
        description,
        price,
        cost,
        is_available,
        display_order,
        category_id,
        unit_quantity,
        image_url,
        badges,
        prep_time_minutes,
        categories (
          id,
          name,
          slug,
          is_active,
          display_order
        )
      `)
      .maybeSingle();

    if (createError || !created) {
      console.error('[createCatalogProduct] Erro ao criar produto:', createError?.message);
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Não foi possível criar o novo artigo.',
        },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    const category = Array.isArray(created.categories) ? created.categories[0] : created.categories;

    return {
      success: true,
      data: {
        id: created.id,
        name: created.name,
        description: created.description || '',
        price: Number(created.price),
        cost: created.cost !== null && created.cost !== undefined ? Number(created.cost) : null,
        isAvailable: Boolean(created.is_available),
        categoryId: created.category_id,
        categoryName: category?.name || 'Geral',
        categorySlug: category?.slug || 'geral',
        categoryIsActive: category?.is_active ?? true,
        unitQuantity: created.unit_quantity,
        imageUrl: created.image_url,
        badges: created.badges || [],
        prepTimeMinutes: created.prep_time_minutes,
        displayOrder: created.display_order,
      },
    };
  } catch (err: unknown) {
    console.error('[createCatalogProduct] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro inesperado ao criar o artigo.',
      },
    };
  }
}

/**
 * Server Action para ativar ou desativar uma categoria inteira no menu.
 */
export async function toggleCategoryAvailability(
  categoryId: string,
  isActive: boolean
): Promise<ProductStockActionResult<{ categoryId: string; isActive: boolean }>> {
  try {
    const parsed = toggleCategorySchema.safeParse({ categoryId, isActive });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Categoria inválida.',
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

    const { error: updateError } = await supabase
      .from('categories')
      .update({
        is_active: parsed.data.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.categoryId)
      .eq('restaurant_id', staff.restaurant.id);

    if (updateError) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Não foi possível alterar o estado da categoria.',
        },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    return {
      success: true,
      data: {
        categoryId: parsed.data.categoryId,
        isActive: parsed.data.isActive,
      },
    };
  } catch (err: unknown) {
    console.error('[toggleCategoryAvailability] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro inesperado ao atualizar a categoria.',
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
        description,
        price,
        cost,
        is_available,
        display_order,
        category_id,
        unit_quantity,
        image_url,
        badges,
        prep_time_minutes,
        categories (
          id,
          name,
          slug,
          is_active,
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
        description: row.description || '',
        price: Number(row.price),
        cost: row.cost !== null && row.cost !== undefined ? Number(row.cost) : null,
        isAvailable: Boolean(row.is_available),
        categoryId: row.category_id,
        categoryName: category?.name || 'Geral',
        categorySlug: category?.slug || 'geral',
        categoryIsActive: category?.is_active ?? true,
        unitQuantity: row.unit_quantity,
        imageUrl: row.image_url,
        badges: row.badges || [],
        prepTimeMinutes: row.prep_time_minutes,
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

    revalidateMenuAndAdmin(staff.restaurant.slug);

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
