/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const configuredSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  configuredSupabaseUrl && configuredSupabaseAnonKey,
);

const supabaseUrl = configuredSupabaseUrl || 'https://example.supabase.co';
const supabaseAnonKey = configuredSupabaseAnonKey || 'demo-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: true,
    storage: globalThis.sessionStorage,
  },
});
