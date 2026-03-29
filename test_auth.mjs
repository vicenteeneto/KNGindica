import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhtrvhievhrgmzijgpkk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodHJ2aGlldmhyZ216aWpncGtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MTUzNjUsImV4cCI6MjA4ODQ5MTM2NX0.-rp4pLWKCOSPOGp10WaTbTjNoUcLhgGdXG6P-eMXETs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const email = 'netu.araujo@gmail.com';
  const password = 'A7x510682.';
  
  console.log('Trying to sign in...');
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (signInError) {
    console.log('Sign in error:', signInError.message);
  } else {
    console.log('Sign in success! Current password is correct.');
  }
}

main();
