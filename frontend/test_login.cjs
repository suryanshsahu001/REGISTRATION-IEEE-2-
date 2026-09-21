const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://quzabrsiwpqlbrbqfalh.supabase.co', 'sb_publishable_JK7aNrvR9v_zhA0oYIV4dw_k4DcQRGp');

async function testLogin() {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@medha2026.com',
    password: 'medha2026admin'
  });

  if (authError) {
    console.error("Auth Error:", authError);
    return;
  }

  console.log("Logged in successfully. User ID:", authData.user.id);

  console.log("Querying profile...");
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error("Profile Query Error:", profileError);
  } else {
    console.log("Profile Data:", profile);
  }
}

testLogin();
