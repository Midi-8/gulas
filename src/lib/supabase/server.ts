import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './types';
import { getSupabaseEnv } from './config';

export async function createServerSupabaseClient() {
  const { supabaseUrl, supabaseKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    console.error(
      '[SUPABASE CONFIG ERROR]: Variáveis de ambiente Supabase ausentes no servidor.'
    );
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}
