import { createServerSupabaseClient } from '@/lib/supabase/server';

export type StaffRole = 'owner' | 'manager' | 'staff';

export interface AuthenticatedStaff {
  userId: string;
  email: string;
  profile: {
    id: string;
    fullName: string | null;
    role: StaffRole;
    restaurantId: string;
  };
  restaurant: {
    id: string;
    name: string;
    fullName: string;
    slug: string;
    isActive: boolean;
  };
}

const ALLOWED_ROLES: StaffRole[] = ['owner', 'manager', 'staff'];

/**
 * Validates the current user session server-side.
 * Verifies that the user exists in auth.users, has an active profile in public.profiles,
 * has a valid role ('owner' | 'manager' | 'staff'), and belongs to an active restaurant.
 * 
 * Returns safe staff information or null if unauthenticated or unauthorized.
 */
export async function getAuthenticatedStaff(): Promise<AuthenticatedStaff | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return null;
  }

  // 1. Get authenticated user from session cookie
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  // 2. Fetch profile associated with this user ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, restaurant_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !profile.restaurant_id) {
    console.warn(
      `[getAuthenticatedStaff]: Perfil não encontrado ou sem restaurante para user ${user.id}:`,
      profileError?.message
    );
    return null;
  }

  // 3. Verify role authorization
  if (!ALLOWED_ROLES.includes(profile.role as StaffRole)) {
    console.warn(
      `[getAuthenticatedStaff]: Cargo não autorizado ("${profile.role}") para user ${user.id}. Permitidos:`,
      ALLOWED_ROLES
    );
    return null;
  }

  // 4. Fetch associated restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('id, name, full_name, slug, is_active')
    .eq('id', profile.restaurant_id)
    .single();

  if (restaurantError || !restaurant) {
    console.warn(
      `[getAuthenticatedStaff]: Restaurante ${profile.restaurant_id} não encontrado ou inativo:`,
      restaurantError?.message
    );
    return null;
  }

  return {
    userId: user.id,
    email: user.email ?? '',
    profile: {
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role as StaffRole,
      restaurantId: profile.restaurant_id,
    },
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      fullName: restaurant.full_name,
      slug: restaurant.slug,
      isActive: restaurant.is_active,
    },
  };
}
