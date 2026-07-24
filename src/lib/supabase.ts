import { createClient } from '@supabase/supabase-js';

// Helper to sanitize environment variables copied from Vercel / .env files
// Strips quotes ("), single quotes ('), whitespace, carriage returns, and newlines
const sanitizeEnvVar = (val: string | undefined): string => {
  if (!val) return '';
  return val
    .trim()
    .replace(/^["']|["']$/g, '') // Remove surrounding quotes
    .replace(/[\r\n]/g, '') // Remove newlines
    .trim();
};

const rawUrl = sanitizeEnvVar(import.meta.env.VITE_SUPABASE_URL);
const rawAnonKey = sanitizeEnvVar(import.meta.env.VITE_SUPABASE_ANON_KEY);

// Automatically clean up URL formatting: remove trailing slashes / rest API paths, ensure https protocol
let formattedUrl = rawUrl
  ? rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '')
  : '';

if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
  formattedUrl = `https://${formattedUrl}`;
}

export const supabaseUrl = formattedUrl;
export const supabaseAnonKey = rawAnonKey;

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
