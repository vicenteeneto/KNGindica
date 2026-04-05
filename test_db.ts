import { supabase } from './src/lib/supabase';
async function test() {
  try {
    const { data, error } = await supabase.from('freelance_orders').select('*').limit(1);
    if (error) {
      console.error('Error selecting:', JSON.stringify(error, null, 2));
      return;
    }
    if (data && data.length > 0) {
      console.log('Columns:', JSON.stringify(Object.keys(data[0]), null, 2));
    } else {
      console.log('No data found in freelance_orders');
    }
  } catch (err) {
    console.error('Catch error:', err);
  }
}
test();
