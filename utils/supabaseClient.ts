import { createClient } from '@supabase/supabase-js';

// Safely access environment variables
// Use fallback object if (import.meta as any).env is undefined
const env = (import.meta as any).env || {};

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URLs não encontradas. Verifique seu arquivo .env');
}

// Initialize Supabase client
// Use placeholder values if keys are missing to prevent crash on startup
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);