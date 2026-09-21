const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://quzabrsiwpqlbrbqfalh.supabase.co', 'sb_publishable_JK7aNrvR9v_zhA0oYIV4dw_k4DcQRGp');

async function check() {
  const { data, error } = await supabase.from('users').select('*');
  console.log('Users in public.users:', data);
  if (error) console.error(error);
}
check();
