import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Automatically clean up the URL if the user appended /rest/v1 or rest/v1/ by mistake from the Data API tab
export const supabaseUrl = rawUrl
  ? rawUrl.replace(/\/rest\/v1\/?$/, '').trim()
  : '';

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your-supabase-url' && 
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  supabaseAnonKey !== 'your-anon-key'
);

// Initialize safely. If credentials are empty or default, return null instead of throwing.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.warn(
    'QuoteFlow PK: Supabase environment variables are missing or set to defaults. Running in Demo / Sandbox Mode.'
  );
}
