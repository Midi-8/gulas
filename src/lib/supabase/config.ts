const DEFAULT_SUPABASE_URL = 'https://emjhabwmuvmjwshbkgvt.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_8gy1y8hhb_fCnAz1brYe9Q_VrbpuV2u';

export function getSupabaseEnv() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  const isConfigured = Boolean(
    supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')
  );

  return {
    supabaseUrl,
    supabaseKey,
    isConfigured,
  };
}
