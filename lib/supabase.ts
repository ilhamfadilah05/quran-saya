import { createClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

export function getSupabaseServerClient() {
  return createClient(getServerEnv('SUPABASE_URL'), getServerEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false }
  });
}
