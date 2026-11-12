'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedStaff } from '@/lib/auth/staff';

export type ActionResult<T = unknown> = {
  ok: boolean;
  error?: string;
  data?: T;
};

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
  imageUrl?: string | null;
  displayOrder: number;
}

export interface CategoryStockItem {
  id: string;
  name: string;
  slug: string;
  position: number;
}

export type ProductStockActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

function slugify(text: string): string {
  return (
    text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'categoria'
  );
}

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
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'page');
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'layout');
      revalidatePath('/admin/orders', 'page');
      revalidatePath('/admin/analytics', 'page');
      revalidatePath('/admin/stock', 'page');
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
 * Consulta a lista completa de categorias do restaurante autenticado.
 */
export async function getRestaurantCategories(): Promise<ActionResult<CategoryStockItem[]>> {
  try {
    const staff = await getAuthenticatedStaff();
    if (!staff) {
      return { ok: false, error: 'Sessão expirada ou utilizador não autorizado.' };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return { ok: false, error: 'Serviço de base de dados indisponível.' };
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, display_order')
      .eq('restaurant_id', staff.restaurant.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('[getRestaurantCategories] Erro na consulta de categorias:', error.message);
      return { ok: false, error: 'Não foi possível carregar as categorias.' };
    }

    const categories: CategoryStockItem[] = (data || []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      position: c.display_order,
    }));

    return { ok: true, data: categories };
  } catch (err: unknown) {
    console.error('[getRestaurantCategories] Exceção inesperada:', err);
    return { ok: false, error: 'Ocorreu um erro ao carregar as categorias.' };
  }
}

/**
 * Atualiza a imagem de um produto no banco de dados.
 * Valida staff, atualiza campo de imagem e revalida rotas do admin e menu público.
 */
export async function updateProductImage(
  productId: string,
  imageUrl: string
): Promise<ActionResult<{ productId: string; imageUrl: string }>> {
  try {
    if (!productId || typeof productId !== 'string') {
      return { ok: false, error: 'Identificador de produto inválido.' };
    }
    if (!imageUrl || typeof imageUrl !== 'string') {
      return { ok: false, error: 'URL da imagem inválida.' };
    }

    const staff = await getAuthenticatedStaff();
    if (!staff) {
      return { ok: false, error: 'Sessão expirada ou utilizador não autorizado.' };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return { ok: false, error: 'Serviço de base de dados indisponível.' };
    }

    // Verifica pertença ao restaurante
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .eq('restaurant_id', staff.restaurant.id)
      .maybeSingle();

    if (fetchError || !product) {
      return { ok: false, error: 'Artigo não encontrado ou não autorizado.' };
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .eq('restaurant_id', staff.restaurant.id);

    if (updateError) {
      console.error('[updateProductImage] Erro no update da imagem:', updateError.message);
      return { ok: false, error: 'Falha ao atualizar a fotografia do artigo.' };
    }

    // Revalidação do Admin e do menu público
    try {
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'page');
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'layout');
      revalidatePath('/admin/stock', 'page');
      revalidatePath('/admin/orders', 'page');
    } catch (revalErr) {
      console.warn('[updateProductImage] Revalidação suave:', revalErr);
    }

    return {
      ok: true,
      data: {
        productId,
        imageUrl,
      },
    };
  } catch (err: unknown) {
    console.error('[updateProductImage] Exceção inesperada:', err);
    return { ok: false, error: 'Ocorreu um erro ao atualizar a imagem.' };
  }
}

/**
 * Cria uma nova categoria.
 * Valida staff, valida nome, calcula posição se omitida e revalida rotas.
 */
export async function createCategory(
  name: string,
  position?: number
): Promise<ActionResult<CategoryStockItem>> {
  try {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      return { ok: false, error: 'O nome da categoria não pode estar vazio.' };
    }

    const staff = await getAuthenticatedStaff();
    if (!staff) {
      return { ok: false, error: 'Sessão expirada ou utilizador não autorizado.' };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return { ok: false, error: 'Serviço de base de dados indisponível.' };
    }

    // Se a posição não foi recebida, calcula a posição final
    let calculatedPosition = position;
    if (calculatedPosition === undefined) {
      const { data: maxCat } = await supabase
        .from('categories')
        .select('display_order')
        .eq('restaurant_id', staff.restaurant.id)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      calculatedPosition = (maxCat?.display_order ?? 0) + 1;
    }

    // Gera um slug amigável e único para o restaurante
    const baseSlug = slugify(trimmedName);
    let finalSlug = baseSlug;

    const { data: existingSlug } = await supabase
      .from('categories')
      .select('id')
      .eq('restaurant_id', staff.restaurant.id)
      .eq('slug', finalSlug)
      .maybeSingle();

    if (existingSlug) {
      finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    const { data: newCat, error: insertError } = await supabase
      .from('categories')
      .insert({
        restaurant_id: staff.restaurant.id,
        name: trimmedName,
        slug: finalSlug,
        display_order: calculatedPosition,
        is_active: true,
      })
      .select('id, name, slug, display_order')
      .single();

    if (insertError || !newCat) {
      console.error('[createCategory] Erro ao criar categoria:', insertError?.message);
      return { ok: false, error: 'Falha ao criar a nova categoria.' };
    }

    // Revalidação do Admin e do menu público
    try {
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'page');
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'layout');
      revalidatePath('/admin/stock', 'page');
      revalidatePath('/admin/categories', 'page');
    } catch (revalErr) {
      console.warn('[createCategory] Revalidação suave:', revalErr);
    }

    return {
      ok: true,
      data: {
        id: newCat.id,
        name: newCat.name,
        slug: newCat.slug,
        position: newCat.display_order,
      },
    };
  } catch (err: unknown) {
    console.error('[createCategory] Exceção inesperada:', err);
    return { ok: false, error: 'Ocorreu um erro ao criar a categoria.' };
  }
}

/**
 * Atualiza a posição de uma categoria.
 * Valida staff, atualiza a posição e revalida o Admin e o menu público.
 */
export async function updateCategoryPosition(
  categoryId: string,
  position: number
): Promise<ActionResult<{ categoryId: string; position: number }>> {
  try {
    if (!categoryId || typeof categoryId !== 'string') {
      return { ok: false, error: 'Identificador de categoria inválido.' };
    }
    if (typeof position !== 'number' || isNaN(position)) {
      return { ok: false, error: 'Posição inválida.' };
    }

    const staff = await getAuthenticatedStaff();
    if (!staff) {
      return { ok: false, error: 'Sessão expirada ou utilizador não autorizado.' };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return { ok: false, error: 'Serviço de base de dados indisponível.' };
    }

    // Verifica se a categoria pertence ao restaurante do staff
    const { data: category, error: fetchError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', categoryId)
      .eq('restaurant_id', staff.restaurant.id)
      .maybeSingle();

    if (fetchError || !category) {
      return { ok: false, error: 'Categoria não encontrada ou não autorizada.' };
    }

    const { error: updateError } = await supabase
      .from('categories')
      .update({
        display_order: position,
        updated_at: new Date().toISOString(),
      })
      .eq('id', categoryId)
      .eq('restaurant_id', staff.restaurant.id);

    if (updateError) {
      console.error('[updateCategoryPosition] Erro no update da categoria:', updateError.message);
      return { ok: false, error: 'Falha ao atualizar a posição da categoria.' };
    }

    // Revalidação do Admin e do menu público
    try {
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'page');
      revalidatePath(`/menu/${staff.restaurant.slug}`, 'layout');
      revalidatePath('/admin/stock', 'page');
      revalidatePath('/admin/categories', 'page');
    } catch (revalErr) {
      console.warn('[updateCategoryPosition] Revalidação suave:', revalErr);
    }

    return {
      ok: true,
      data: {
        categoryId,
        position,
      },
    };
  } catch (err: unknown) {
    console.error('[updateCategoryPosition] Exceção inesperada:', err);
    return { ok: false, error: 'Ocorreu um erro ao atualizar a posição da categoria.' };
  }
}
