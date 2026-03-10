import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhtrvhievhrgmzijgpkk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodHJ2aGlldmhyZ216aWpncGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTUzNjUsImV4cCI6MjA4ODQ5MTM2NX0.-rp4pLWKCOSPOGp10WaTbTjNoUcLhgGdXG6P-eMXETs';

// Note: Ensure you have added these to your environment variables (.env) for production!
// export const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL || supabaseUrl,
//   import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseAnonKey
// );

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
