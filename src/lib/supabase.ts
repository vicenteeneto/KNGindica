import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yhtrvhievhrgmzijgpkk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodHJ2aGlldmhyZ216aWpncGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTUzNjUsImV4cCI6MjA4ODQ5MTM2NX0.-rp4pLWKCOSPOGp10WaTbTjNoUcLhgGdXG6P-eMXETs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
