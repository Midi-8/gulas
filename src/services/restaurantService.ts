import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Database } from '@/lib/supabase/types';
import {
  Restaurant,
  Category,
  Product,
  Table,
  ProductBadge,
} from '@/types/restaurant';
import {
  mockRestaurant,
  mockCategories,
  mockProducts,
  mockTables,
} from '@/data/mockRestaurant';

type RestaurantRow = Database['public']['Tables']['restaurants']['Row'];
type CategoryRow = Database['public']['Tables']['categories']['Row'];
type ProductRow = Database['public']['Tables']['products']['Row'];
type TableRow = Database['public']['Tables']['tables']['Row'];

type PublicProductRow = Pick<
  ProductRow,
  | 'id'
  | 'restaurant_id'
  | 'category_id'
  | 'name'
  | 'description'
  | 'price'
  | 'image_url'
  | 'is_available'
  | 'display_order'
  | 'badges'
  | 'unit_quantity'
  | 'includes_notes'
  | 'customization_note'
  | 'allergens'
  | 'prep_time_minutes'
>;

function isSupabaseConfigured(): boolean {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://emjhabwmuvmjwshbkgvt.supabase.co';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_8gy1y8hhb_fCnAz1brYe9Q_VrbpuV2u';

  return Boolean(url && key && !url.includes('your-project'));
}

function mapRestaurantFromRow(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    slug: row.slug,
    tagline: row.tagline || '',
    description: row.description || '',
    location: row.location || '',
    logoUrl: row.logo_url || undefined,
    coverImageUrl: row.cover_image_url || '',
    currency: row.currency,
    timezone: row.timezone,
    address: row.address || '',
    phone: row.phone || undefined,
    isOpen: row.is_open,
    openingHours: row.opening_hours || '',
  };
}

function mapCategoryFromRow(row: CategoryRow): Category {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    slug: row.slug,
    description: row.description || undefined,
    subtitle: row.subtitle || undefined,
    position: row.display_order,
    active: row.is_active,
    isSpecialty: row.is_specialty,
  };
}

function mapProductFromRow(row: PublicProductRow): Product {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description || '',
    price: Number(row.price),
    cost: undefined,
    imageUrl: row.image_url || '',
    available: row.is_available,
    position: row.display_order,
    badges: (row.badges as ProductBadge[]) || [],
    unitQuantity: row.unit_quantity || undefined,
    includesNotes: row.includes_notes || undefined,
    customizationNote: row.customization_note || undefined,
    allergens: row.allergens || [],
    prepTimeMinutes: row.prep_time_minutes || undefined,
  };
}

function mapTableFromRow(row: TableRow): Table {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    number: row.number,
    name: row.name,
    active: row.is_active,
  };
}

export async function getRestaurantBySlug(
  slug: string
): Promise<Restaurant | null> {
  if (!isSupabaseConfigured()) {
    if (slug === mockRestaurant.slug || slug === 'casa-do-norte') {
      return mockRestaurant;
    }

    return null;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error(
      `[restaurantService] Error fetching restaurant by slug "${slug}":`,
      error
    );

    throw new Error(`Falha ao carregar restaurante: ${error.message}`);
  }

  if (!data) return null;

  return mapRestaurantFromRow(data);
}

export async function getRestaurantMenu(
  restaurantId: string
): Promise<{ categories: Category[]; products: Product[] }> {
  if (!isSupabaseConfigured()) {
    return {
      categories: mockCategories,
      products: mockProducts,
    };
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { categories: [], products: [] };
  }

  const [categoriesRes, productsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),

    supabase
      .from('products')
      .select(`
        id,
        restaurant_id,
        category_id,
        name,
        description,
        price,
        image_url,
        is_available,
        display_order,
        badges,
        unit_quantity,
        includes_notes,
        customization_note,
        allergens,
        prep_time_minutes
      `)
      .eq('restaurant_id', restaurantId)
      .eq('is_available', true)
      .order('display_order', { ascending: true }),
  ]);

  if (categoriesRes.error) {
    console.error(
      '[restaurantService] Error fetching categories:',
      categoriesRes.error
    );

    throw new Error(
      `Falha ao carregar categorias: ${categoriesRes.error.message}`
    );
  }

  if (productsRes.error) {
    console.error(
      '[restaurantService] Error fetching products:',
      productsRes.error
    );

    throw new Error(
      `Falha ao carregar produtos: ${productsRes.error.message}`
    );
  }

  return {
    categories: (categoriesRes.data || []).map(mapCategoryFromRow),
    products: (productsRes.data || []).map(mapProductFromRow),
  };
}

export async function getRestaurantBySlugWithMenu(
  slug: string
): Promise<{
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
} | null> {
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) return null;

  const menu = await getRestaurantMenu(restaurant.id);

  return {
    restaurant,
    categories: menu.categories,
    products: menu.products,
  };
}

export async function getTableByNumber(
  restaurantId: string,
  tableNumber: number
): Promise<Table | null> {
  if (!isSupabaseConfigured()) {
    const table = mockTables.find(
      (t) => t.number === tableNumber && t.active
    );

    return table || null;
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('number', tableNumber)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error(
      `[restaurantService] Error fetching table ${tableNumber} for restaurant ${restaurantId}:`,
      error
    );

    throw new Error(`Falha ao verificar mesa: ${error.message}`);
  }

  if (!data) return null;

  return mapTableFromRow(data);
}