/**
 * Supabase Integration Readiness Layer
 *
 * Designed so OneSpace 2.0 can connect directly to Supabase Auth, PostgreSQL,
 * and Storage once VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured.
 * Never simulates or fakes a cloud connection when keys are absent.
 */

export interface SupabaseStatus {
  configured: boolean;
  urlPresent: boolean;
  anonKeyPresent: boolean;
  storageBucket: string;
  modeLabel: string;
}

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      SUPABASE_URL.startsWith('https://') &&
      !SUPABASE_URL.includes('YOUR_PROJECT')
  );
}

export function getSupabaseStatus(): SupabaseStatus {
  const configured = isSupabaseConfigured();
  return {
    configured,
    urlPresent: Boolean(SUPABASE_URL),
    anonKeyPresent: Boolean(SUPABASE_ANON_KEY),
    storageBucket: 'myspace-files',
    modeLabel: configured
      ? 'Supabase Environment Detected'
      : 'Local Device Storage (Supabase Not Connected)',
  };
}
