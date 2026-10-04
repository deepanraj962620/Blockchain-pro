// Supabase client factory.
// Returns null when Supabase is not configured so the app can fall back to SQLite.
const { createClient } = require('@supabase/supabase-js');

let cachedClient = null;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || 'files';

  if (!url || !(serviceRoleKey || anonKey)) {
    return null;
  }

  return {
    url,
    // Use the service role key when available (bypasses RLS), otherwise fall back to anon key.
    key: serviceRoleKey || anonKey,
    bucket
  };
}

// Returns a configured Supabase client or null if not configured.
function getSupabaseClient() {
  if (cachedClient) return cachedClient;

  const config = getSupabaseConfig();
  if (!config) return null;

  try {
    cachedClient = {
      client: createClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false }
      }),
      bucket: config.bucket
    };
    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err.message);
    return null;
  }
}

function isSupabaseConfigured() {
  return getSupabaseClient() !== null;
}

// Reset the cached client (primarily for tests / env changes).
function resetSupabaseClient() {
  cachedClient = null;
}

module.exports = {
  getSupabaseClient,
  getSupabaseConfig,
  isSupabaseConfigured,
  resetSupabaseClient
};
