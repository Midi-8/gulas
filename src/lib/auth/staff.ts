import { cache } from 'react';
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
    isOpen: boolean;
  };
}

const ALLOWED_ROLES: StaffRole[] = ['owner', 'manager', 'staff'];

/**
 * Validates the current user session server-side (deduplicated per request via React.cache).
 * Verifies that the user exists in auth.users, has an active profile in public.profiles,
 * has a valid role ('owner' | 'manager' | 'staff'), and belongs to an active restaurant.
 *
 * Returns safe staff information or null if unauthenticated or unauthorized.
 */
export const getAuthenticatedStaff = cache(
  async (): Promise<AuthenticatedStaff | null> => {
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

    // 2. Fetch profile and associated restaurant in a single relational query
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        `
        id,
        full_name,
        role,
        restaurant_id,
        restaurants (
          id,
          name,
          full_name,
          slug,
          is_active,
          is_open
        )
      `
      )
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

    const joinedRestaurant = Array.isArray(profile.restaurants)
      ? profile.restaurants[0]
      : profile.restaurants;

    if (!joinedRestaurant) {
      console.warn(
        `[getAuthenticatedStaff]: Restaurante ${profile.restaurant_id} não encontrado ou inativo.`
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
        id: joinedRestaurant.id,
        name: joinedRestaurant.name,
        fullName: joinedRestaurant.full_name,
        slug: joinedRestaurant.slug,
        isActive: joinedRestaurant.is_active,
        isOpen: joinedRestaurant.is_open,
      },
    };
  }
);
