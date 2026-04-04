import { supabase } from '../lib/supabase';

async function checkColumns() {
  const { data, error } = await supabase
    .from('service_requests')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    console.log("No data found to check columns.");
  }
}

checkColumns();
