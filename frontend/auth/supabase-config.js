import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabaseUrl = 'https://lpcfgrphadnppqxpwxjv.supabase.co';
export const supabasePublishableKey = 'sb_publishable_hNfDIYrgE08OBFIP-D387A_oWajfvQA';

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
