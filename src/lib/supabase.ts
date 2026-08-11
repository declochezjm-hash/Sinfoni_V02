import { createClient } from '@supabase/supabase-js';

/**
 * Architecture Sinfoni :
 * - Tables métier dans le schéma SQL `app`
 * - API PostgREST / client → vues `public.*` uniquement
 * - NE PAS utiliser `db: { schema: 'app' }` : le schéma `app` n'est pas exposé
 *   par l'API → erreur "Database error querying schema"
 */
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}/supabase` : 'http://127.0.0.1:54321');
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Évite le deadlock navigator.locks (signIn / getSession qui pendent à l'infini)
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
