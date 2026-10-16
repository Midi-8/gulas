'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { loginSchema, LoginInput } from '@/lib/validations/auth';
import { getAuthenticatedStaff } from '@/lib/auth/staff';

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action to authenticate a staff member.
 * Validates credentials against Supabase Auth and ensures the user
 * has a valid staff profile associated with a restaurant.
 */
export async function loginStaff(input: LoginInput): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dados de login inválidos.',
    };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    console.error(
      '[AUTH CONFIG ERROR]: createServerSupabaseClient() retornou null. Verifique se o ficheiro .env.local contém NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
    return {
      success: false,
      error:
        'Erro de configuração no servidor: credenciais do Supabase ausentes em .env.local. Reinicie o servidor após adicionar.',
    };
  }

  // 1. Authenticate with Supabase Auth
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    console.warn(
      `[AUTH LOGIN]: Falha de autenticação para "${parsed.data.email}":`,
      signInError.message
    );
    return {
      success: false,
      error: 'Credenciais inválidas. Verifique o email e a palavra-passe.',
    };
  }

  // 2. Validate that the authenticated user is an authorized staff member
  const staff = await getAuthenticatedStaff();
  if (!staff) {
    const { data: authUserData } = await supabase.auth.getUser();
    const userId = authUserData.user?.id;

    let specificMessage =
      'Conta sem permissões de staff/gerência: utilizador não registado na tabela de perfis.';

    if (userId) {
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id, role, restaurant_id')
        .eq('id', userId)
        .maybeSingle();

      console.warn(
        `[AUTH STAFF CHECK]: Utilizador ${userId} (${parsed.data.email}) autenticado com sucesso mas sem perfil de staff ativo:`,
        {
          profile,
          profileError: pError?.message,
        }
      );

      if (!profile) {
        specificMessage =
          'Conta sem permissões de staff/gerência: utilizador não registado na tabela de perfis.';
      } else if (!profile.restaurant_id) {
        specificMessage =
          'Conta sem restaurante associado no perfil de staff.';
      } else {
        specificMessage = `Conta sem permissões suficientes (cargo: "${profile.role}"). Apenas staff e gerência têm acesso.`;
      }
    }

    // If not authorized as staff, sign out immediately to prevent dangling session
    await supabase.auth.signOut();
    return {
      success: false,
      error: specificMessage,
    };
  }

  return { success: true };
}

/**
 * Server Action to terminate staff session and redirect to login.
 */
export async function logoutStaff(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect('/admin/login');
}
