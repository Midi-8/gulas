import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from '@/lib/supabase/config';

/**
 * Next.js 16 Proxy para renovação automática de sessão Supabase nas rotas /admin.
 * Garante que tablets de cozinha (KDS) em funcionamento contínuo não percam a sessão autenticada.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { supabaseUrl, supabaseKey, isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Renova o token JWT se necessário antes da renderização das rotas /admin
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: ['/admin/:path*'],
};
