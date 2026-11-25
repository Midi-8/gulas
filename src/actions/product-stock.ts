'use server';

import { z } from 'zod';
import { revalidatePath, updateTag } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthenticatedStaff, isOwner } from '@/lib/auth/staff';
import type { Database } from '@/lib/supabase/types';

const toggleProductAvailabilitySchema = z.object({
  productId: z.string().uuid('Identificador de produto inválido.'),
  isAvailable: z.boolean(),
});

const updateProductDetailsSchema = z.object({
  productId: z.string().uuid('Identificador de produto inválido.'),
  categoryId: z.string().uuid('Categoria inválida.').optional(),
  name: z.string().trim().min(1, 'O nome do artigo é obrigatório.').max(150),
  price: z.number().min(0, 'O preço não pode ser negativo.').max(9999),
  cost: z.number().min(0).max(9999).nullable().optional(),
  description: z.string().max(600).optional(),
  unitQuantity: z.string().max(50).nullable().optional(),
  imageUrl: z.string().trim().max(1000).nullable().optional(),
  badges: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  prepTimeMinutes: z.number().int().min(1).max(180).nullable().optional(),
  displayOrder: z.number().int().min(0).max(9999).optional(),
});

const createProductSchema = z.object({
  categoryId: z.string().uuid('Categoria inválida.'),
  name: z.string().trim().min(1, 'O nome do artigo é obrigatório.').max(150),
  price: z.number().min(0, 'O preço não pode ser negativo.').max(9999),
  cost: z.number().min(0).max(9999).nullable().optional(),
  description: z.string().max(600).optional(),
  unitQuantity: z.string().max(50).nullable().optional(),
  imageUrl: z.string().trim().max(1000).nullable().optional(),
  badges: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  prepTimeMinutes: z.number().int().min(1).max(180).nullable().optional(),
  displayOrder: z.number().int().min(0).max(9999).optional(),
});

const productIdSchema = z.object({
  productId: z.string().uuid('Identificador de produto inválido.'),
});

const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'O nome da categoria é obrigatório.').max(100),
  station: z.enum(['kitchen', 'bar']),
  displayOrder: z.number().int().min(0).max(9999).optional(),
});

const updateCategorySchema = z.object({
  categoryId: z.string().uuid('Identificador de categoria inválido.'),
  name: z.string().trim().min(1, 'O nome da categoria é obrigatório.').max(100),
  displayOrder: z.number().int().min(0).max(9999),
});

const categoryIdSchema = z.object({
  categoryId: z.string().uuid('Identificador de categoria inválido.'),
});

const updateRestaurantSettingsSchema = z.object({
  openingHours: z.string().trim().min(2, 'O horário é obrigatório.').max(100),
  phone: z.string().trim().max(50).optional().nullable(),
  tagline: z.string().trim().max(255).optional().nullable(),
});

export interface RestaurantSettingsData {
  openingHours: string;
  phone: string;
  tagline: string;
}

export interface CatalogCategoryItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  displayOrder: number;
}

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
  allergens: string[];
  prepTimeMinutes?: number | null;
  displayOrder: number;
}

export type ProductStockActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

// Nota: nunca selecionar a coluna `cost` em `products` (REVOKE SELECT aplicado ao perfil authenticated).
const PRODUCT_SELECT_COLUMNS = `
  id,
  name,
  description,
  price,
  is_available,
  display_order,
  category_id,
  unit_quantity,
  image_url,
  badges,
  allergens,
  prep_time_minutes,
  categories (
    id,
    name,
    slug,
    is_active,
    display_order
  )
`;

interface RawProductQueryRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  display_order: number;
  category_id: string;
  unit_quantity: string | null;
  image_url: string | null;
  badges: string[] | null;
  allergens: string[] | null;
  prep_time_minutes: number | null;
  categories:
    | { id: string; name: string; slug: string; is_active: boolean; display_order: number }
    | Array<{ id: string; name: string; slug: string; is_active: boolean; display_order: number }>
    | null;
}

function slugifyCatalogName(name: string, prefix = ''): string {
  const baseSlug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 55);
  const combined = `${prefix}${baseSlug || 'item'}`.replace(/^-+|-+$/g, '').slice(0, 65);
  return `${combined}-${Date.now().toString(36).slice(-4)}`;
}

function mapProductRowToStockItem(
  row: RawProductQueryRow,
  explicitCost?: number | null
): ProductStockItem {
  const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const price = Number(row.price);
  const resolvedCost =
    explicitCost !== undefined && explicitCost !== null
      ? Math.round(Number(explicitCost) * 100) / 100
      : null;

  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price,
    cost: resolvedCost,
    isAvailable: Boolean(row.is_available),
    categoryId: row.category_id,
    categoryName: category?.name || 'Geral',
    categorySlug: category?.slug || 'geral',
    categoryIsActive: category?.is_active ?? true,
    unitQuantity: row.unit_quantity,
    imageUrl: row.image_url,
    badges: row.badges || [],
    allergens: row.allergens || [],
    prepTimeMinutes: row.prep_time_minutes,
    displayOrder: row.display_order,
  };
}

function revalidateMenuAndAdmin(slug: string) {
  try {
    updateTag('menu');
    revalidatePath(`/menu/${slug}`, 'page');
    revalidatePath(`/menu/${slug}`, 'layout');
    revalidatePath('/admin/orders', 'page');
    revalidatePath('/admin/analytics', 'page');
    revalidatePath('/admin/management', 'page');
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
    if (!staff || !isOwner(staff)) {
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
 * Server Action para editar detalhes de um artigo (nome, categoria, preço, custo, descrição, imagem, prep time, ordem, formato, badges).
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
    if (!staff || !isOwner(staff)) {
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

    const updatePayload: Database['public']['Tables']['products']['Update'] = {
      name: parsed.data.name,
      price: Number(parsed.data.price.toFixed(2)),
      description: parsed.data.description?.trim() || null,
      unit_quantity: parsed.data.unitQuantity?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.imageUrl !== undefined) {
      updatePayload.image_url = parsed.data.imageUrl?.trim() || null;
    }
    if (parsed.data.prepTimeMinutes !== undefined) {
      updatePayload.prep_time_minutes = parsed.data.prepTimeMinutes ?? null;
    }
    if (parsed.data.badges !== undefined) {
      updatePayload.badges = parsed.data.badges;
    }
    if (parsed.data.allergens !== undefined) {
      updatePayload.allergens = parsed.data.allergens;
    }

    if (parsed.data.categoryId) {
      updatePayload.category_id = parsed.data.categoryId;
    }
    if (parsed.data.displayOrder !== undefined) {
      updatePayload.display_order = parsed.data.displayOrder;
    }
    if (parsed.data.cost !== undefined) {
      updatePayload.cost =
        parsed.data.cost !== null ? Number(parsed.data.cost.toFixed(2)) : null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', parsed.data.productId)
      .eq('restaurant_id', staff.restaurant.id)
      .select(PRODUCT_SELECT_COLUMNS)
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

    return {
      success: true,
      data: mapProductRowToStockItem(
        updated as unknown as RawProductQueryRow,
        parsed.data.cost
      ),
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
    if (!staff || !isOwner(staff)) {
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

    const insertPayload: Database['public']['Tables']['products']['Insert'] = {
      restaurant_id: staff.restaurant.id,
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      slug: slugifyCatalogName(parsed.data.name),
      price: Number(parsed.data.price.toFixed(2)),
      description: parsed.data.description?.trim() || null,
      unit_quantity: parsed.data.unitQuantity?.trim() || null,
      image_url: parsed.data.imageUrl?.trim() || null,
      badges: parsed.data.badges || [],
      allergens: parsed.data.allergens || [],
      prep_time_minutes: parsed.data.prepTimeMinutes ?? null,
      is_available: true,
      display_order: parsed.data.displayOrder ?? 99,
    };

    if (parsed.data.cost !== undefined && parsed.data.cost !== null) {
      insertPayload.cost = Number(parsed.data.cost.toFixed(2));
    }

    const { data: created, error: createError } = await supabase
      .from('products')
      .insert(insertPayload)
      .select(PRODUCT_SELECT_COLUMNS)
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

    return {
      success: true,
      data: mapProductRowToStockItem(
        created as unknown as RawProductQueryRow,
        parsed.data.cost
      ),
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
 * Server Action para eliminar um artigo do menu.
 */
export async function deleteCatalogProduct(
  productId: string
): Promise<ProductStockActionResult<{ productId: string }>> {
  try {
    const parsed = productIdSchema.safeParse({ productId });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Identificador de artigo inválido.',
        },
      };
    }

    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
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

    const { data: deleted, error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', parsed.data.productId)
      .eq('restaurant_id', staff.restaurant.id)
      .select('id')
      .maybeSingle();

    if (deleteError) {
      console.error('[deleteCatalogProduct] Erro ao eliminar:', deleteError.message);
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Não foi possível eliminar o artigo.',
        },
      };
    }

    if (!deleted) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Artigo não encontrado ou sem permissão.',
        },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    return {
      success: true,
      data: { productId: deleted.id },
    };
  } catch (err: unknown) {
    console.error('[deleteCatalogProduct] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro ao eliminar o artigo.',
      },
    };
  }
}

/**
 * Server Action para duplicar um artigo existente (útil para variantes Normal/Familiar ou bebidas).
 */
export async function duplicateCatalogProduct(
  productId: string
): Promise<ProductStockActionResult<ProductStockItem>> {
  try {
    const parsed = productIdSchema.safeParse({ productId });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Identificador de artigo inválido.',
        },
      };
    }

    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
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

    const { data: orig, error: fetchError } = await supabase
      .from('products')
      .select(PRODUCT_SELECT_COLUMNS)
      .eq('id', parsed.data.productId)
      .eq('restaurant_id', staff.restaurant.id)
      .maybeSingle();

    if (fetchError || !orig) {
      return {
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Artigo original não encontrado.',
        },
      };
    }

    const rawOrig = orig as unknown as RawProductQueryRow;
    const copyName = `${rawOrig.name} (Cópia)`.slice(0, 150);

    const { data: created, error: createError } = await supabase
      .from('products')
      .insert({
        restaurant_id: staff.restaurant.id,
        category_id: rawOrig.category_id,
        name: copyName,
        slug: slugifyCatalogName(rawOrig.name),
        description: rawOrig.description,
        price: Number(rawOrig.price),
        image_url: rawOrig.image_url,
        is_available: true,
        display_order: (rawOrig.display_order ?? 0) + 1,
        badges: rawOrig.badges || [],
        unit_quantity: rawOrig.unit_quantity,
        allergens: rawOrig.allergens || [],
        prep_time_minutes: rawOrig.prep_time_minutes,
      })
      .select(PRODUCT_SELECT_COLUMNS)
      .maybeSingle();

    if (createError || !created) {
      console.error('[duplicateCatalogProduct] Erro ao duplicar:', createError?.message);
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Não foi possível duplicar o artigo.',
        },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    return {
      success: true,
      data: mapProductRowToStockItem(created as unknown as RawProductQueryRow),
    };
  } catch (err: unknown) {
    console.error('[duplicateCatalogProduct] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro inesperado ao duplicar o artigo.',
      },
    };
  }
}

/**
 * Server Action para repor todos os artigos esgotados para disponível (início de turno).
 */
export async function restoreAllOutOfStockProducts(): Promise<
  ProductStockActionResult<{ restoredCount: number }>
> {
  try {
    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
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

    const { data: updatedRows, error: updateError } = await supabase
      .from('products')
      .update({
        is_available: true,
        updated_at: new Date().toISOString(),
      })
      .eq('restaurant_id', staff.restaurant.id)
      .eq('is_available', false)
      .select('id');

    if (updateError) {
      console.error('[restoreAllOutOfStockProducts] Erro no update:', updateError.message);
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Não foi possível repor os artigos esgotados.',
        },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    return {
      success: true,
      data: { restoredCount: (updatedRows || []).length },
    };
  } catch (err: unknown) {
    console.error('[restoreAllOutOfStockProducts] Exceção inesperada:', err);
    return {
      success: false,
      error: {
        code: 'UNEXPECTED_ERROR',
        message: 'Ocorreu um erro inesperado ao repor o stock.',
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
    if (!staff || !isOwner(staff)) {
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
 * Lista todas as categorias do restaurante ordenadas por ordem de exibição.
 */
export async function getRestaurantCategories(): Promise<
  ProductStockActionResult<CatalogCategoryItem[]>
> {
  try {
    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sessão expirada ou utilizador não autorizado.' },
      };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Serviço de base de dados indisponível.' },
      };
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, slug, is_active, display_order')
      .eq('restaurant_id', staff.restaurant.id)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Não foi possível carregar as categorias.' },
      };
    }

    const categories: CatalogCategoryItem[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isActive: Boolean(row.is_active),
      displayOrder: row.display_order,
    }));

    return { success: true, data: categories };
  } catch (err: unknown) {
    console.error('[getRestaurantCategories] Exceção inesperada:', err);
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: 'Erro ao carregar categorias.' },
    };
  }
}

/**
 * Cria uma nova categoria no menu do restaurante.
 */
export async function createCatalogCategory(
  input: z.infer<typeof createCategorySchema>
): Promise<ProductStockActionResult<CatalogCategoryItem>> {
  try {
    const parsed = createCategorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Dados inválidos para criar categoria.',
        },
      };
    }

    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sessão expirada ou utilizador não autorizado.' },
      };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Serviço de base de dados indisponível.' },
      };
    }

    const barPrefix =
      parsed.data.station === 'bar' && !parsed.data.name.toLowerCase().includes('bebida')
        ? 'bebidas-'
        : '';

    const { data: created, error: createError } = await supabase
      .from('categories')
      .insert({
        restaurant_id: staff.restaurant.id,
        name: parsed.data.name,
        slug: slugifyCatalogName(parsed.data.name, barPrefix),
        display_order: parsed.data.displayOrder ?? 50,
        is_active: true,
      })
      .select('id, name, slug, is_active, display_order')
      .maybeSingle();

    if (createError || !created) {
      return {
        success: false,
        error: { code: 'CREATE_FAILED', message: 'Não foi possível criar a categoria.' },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    return {
      success: true,
      data: {
        id: created.id,
        name: created.name,
        slug: created.slug,
        isActive: Boolean(created.is_active),
        displayOrder: created.display_order,
      },
    };
  } catch (err: unknown) {
    console.error('[createCatalogCategory] Exceção inesperada:', err);
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: 'Erro inesperado ao criar categoria.' },
    };
  }
}

/**
 * Atualiza o nome e ordem de exibição de uma categoria existente.
 */
export async function updateCatalogCategory(
  input: z.infer<typeof updateCategorySchema>
): Promise<ProductStockActionResult<CatalogCategoryItem>> {
  try {
    const parsed = updateCategorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Dados inválidos para atualizar categoria.',
        },
      };
    }

    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sessão expirada ou utilizador não autorizado.' },
      };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Serviço de base de dados indisponível.' },
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from('categories')
      .update({
        name: parsed.data.name,
        display_order: parsed.data.displayOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.categoryId)
      .eq('restaurant_id', staff.restaurant.id)
      .select('id, name, slug, is_active, display_order')
      .maybeSingle();

    if (updateError || !updated) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Não foi possível atualizar a categoria.' },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        isActive: Boolean(updated.is_active),
        displayOrder: updated.display_order,
      },
    };
  } catch (err: unknown) {
    console.error('[updateCatalogCategory] Exceção inesperada:', err);
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: 'Erro inesperado ao atualizar categoria.' },
    };
  }
}

/**
 * Elimina uma categoria vazia (sem artigos associados).
 */
export async function deleteCatalogCategory(
  categoryId: string
): Promise<ProductStockActionResult<{ categoryId: string }>> {
  try {
    const parsed = categoryIdSchema.safeParse({ categoryId });
    if (!parsed.success) {
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Categoria inválida.' },
      };
    }

    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sessão expirada ou utilizador não autorizado.' },
      };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Serviço de base de dados indisponível.' },
      };
    }

    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', parsed.data.categoryId)
      .eq('restaurant_id', staff.restaurant.id);

    if (countError) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Não foi possível verificar artigos da categoria.' },
      };
    }

    if ((count ?? 0) > 0) {
      return {
        success: false,
        error: {
          code: 'CATEGORY_NOT_EMPTY',
          message: 'Esta categoria ainda tem artigos associados. Move ou elimina os artigos primeiro.',
        },
      };
    }

    const { data: deleted, error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', parsed.data.categoryId)
      .eq('restaurant_id', staff.restaurant.id)
      .select('id')
      .maybeSingle();

    if (deleteError || !deleted) {
      return {
        success: false,
        error: { code: 'DELETE_FAILED', message: 'Não foi possível eliminar a categoria.' },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    return {
      success: true,
      data: { categoryId: deleted.id },
    };
  } catch (err: unknown) {
    console.error('[deleteCatalogCategory] Exceção inesperada:', err);
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: 'Erro inesperado ao eliminar categoria.' },
    };
  }
}

/**
 * Consulta a lista completa de produtos e o seu estado de stock para o restaurante autenticado.
 */
export async function getRestaurantStockList(): Promise<ProductStockActionResult<ProductStockItem[]>> {
  try {
    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
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
      .select(PRODUCT_SELECT_COLUMNS)
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

    const items: ProductStockItem[] = (data || []).map((row) =>
      mapProductRowToStockItem(row as unknown as RawProductQueryRow)
    );

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
    if (!staff || !isOwner(staff)) {
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

/**
 * Obtém as configurações editáveis do restaurante (horário, telefone e subtítulo/aviso).
 */
export async function getRestaurantSettings(): Promise<ProductStockActionResult<RestaurantSettingsData>> {
  try {
    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sessão expirada ou utilizador não autorizado.' },
      };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Serviço de base de dados indisponível.' },
      };
    }

    const { data, error } = await supabase
      .from('restaurants')
      .select('opening_hours, phone, tagline')
      .eq('id', staff.restaurant.id)
      .maybeSingle();

    if (error || !data) {
      return {
        success: false,
        error: { code: 'FETCH_ERROR', message: 'Não foi possível carregar as definições.' },
      };
    }

    return {
      success: true,
      data: {
        openingHours: data.opening_hours || '',
        phone: data.phone || '',
        tagline: data.tagline || '',
      },
    };
  } catch (err: unknown) {
    console.error('[getRestaurantSettings] Exceção:', err);
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: 'Erro ao carregar definições do restaurante.' },
    };
  }
}

/**
 * Atualiza o horário, telefone e subtítulo/aviso do restaurante e revalida o menu público.
 */
export async function updateRestaurantSettings(
  input: z.infer<typeof updateRestaurantSettingsSchema>
): Promise<ProductStockActionResult<RestaurantSettingsData>> {
  try {
    const parsed = updateRestaurantSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Dados inválidos.',
        },
      };
    }

    const staff = await getAuthenticatedStaff();
    if (!staff || !isOwner(staff)) {
      return {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sessão expirada ou utilizador não autorizado.' },
      };
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return {
        success: false,
        error: { code: 'DATABASE_ERROR', message: 'Serviço de base de dados indisponível.' },
      };
    }

    const { data: updated, error } = await supabase
      .from('restaurants')
      .update({
        opening_hours: parsed.data.openingHours,
        phone: parsed.data.phone?.trim() || null,
        tagline: parsed.data.tagline?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staff.restaurant.id)
      .select('opening_hours, phone, tagline')
      .maybeSingle();

    if (error || !updated) {
      return {
        success: false,
        error: { code: 'UPDATE_FAILED', message: 'Não foi possível guardar as definições.' },
      };
    }

    revalidateMenuAndAdmin(staff.restaurant.slug);

    return {
      success: true,
      data: {
        openingHours: updated.opening_hours || '',
        phone: updated.phone || '',
        tagline: updated.tagline || '',
      },
    };
  } catch (err: unknown) {
    console.error('[updateRestaurantSettings] Exceção:', err);
    return {
      success: false,
      error: { code: 'UNEXPECTED_ERROR', message: 'Erro inesperado ao guardar definições.' },
    };
  }
}
