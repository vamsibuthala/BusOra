import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('http'));

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

if (isSupabaseConfigured) {
  console.log('⚡ Connected to Supabase at:', supabaseUrl);
} else {
  console.log('ℹ️ Supabase credentials not set in .env. Running with fast in-memory store.');
  console.log('   (To use live Supabase, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env)');
}
