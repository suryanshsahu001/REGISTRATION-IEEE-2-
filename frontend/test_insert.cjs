const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://quzabrsiwpqlbrbqfalh.supabase.co', 'sb_publishable_JK7aNrvR9v_zhA0oYIV4dw_k4DcQRGp');

async function testInsert() {
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: 'admin@medha2026.com',
    password: 'medha2026admin'
  });

  console.log("Trying to insert profile...");
  const { data, error } = await supabase.from('users').insert({
    id: authData.user.id,
    name: 'Admin',
    email: authData.user.email,
    mobile: '0000000000',
    college: 'Admin',
    department: 'Admin',
    year: 'Admin',
    role: 'admin'
  });

  if (error) {
    console.error("Insert Error:", error);
  } else {
    console.log("Insert Success!");
  }
}

testInsert();
