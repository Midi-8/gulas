import { createBrowserClient } from '@supabase/ssr';
import { Database } from './types';
import { getSupabaseEnv } from './config';

let clientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Retorna uma instância singleton do cliente Supabase para o browser.
 * Garante preservação de sessão, sincronização de tokens e reaproveitamento do WebSocket Realtime.
 */
export function createClient() {
  const { supabaseUrl, supabaseKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured) {
    return null;
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient<Database>(supabaseUrl, supabaseKey);
  }

  return clientInstance;
}
