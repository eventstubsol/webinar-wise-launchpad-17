import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

console.log('🔧 Testing Service Role Access to zoom_webinars table...');
console.log('URL:', supabaseUrl);

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create regular client
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

async function testServiceRoleAccess() {
  try {
    // First, let's check if RLS is enabled
    console.log('\n📊 Checking RLS status on zoom_webinars table...');
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .rpc('check_rls_status', { table_name: 'zoom_webinars' });
    
    if (!rlsError && rlsStatus !== undefined) {
      console.log('RLS Status:', rlsStatus);
    }

    // Test 1: Try to select from zoom_webinars with service role
    console.log('\n🔍 Test 1: SELECT with service role key...');
    const { data: selectData, error: selectError, count } = await supabaseAdmin
      .from('zoom_webinars')
      .select('*', { count: 'exact', head: true });
    
    if (selectError) {
      console.error('❌ SELECT Error:', selectError);
    } else {
      console.log('✅ SELECT Success! Can see', count, 'webinars');
    }

    // Test 2: Try to insert a test webinar
    console.log('\n➕ Test 2: INSERT with service role key...');
    const testWebinar = {
      webinar_id: 'TEST_' + Date.now(),
      connection_id: 'e03a3898-2e4d-4e69-a03e-2faf34d1f418', // Your connection ID
      topic: 'Test Webinar for Service Role',
      type: 5,
      start_time: new Date().toISOString(),
      duration: 60,
      timezone: 'UTC',
      status: 'test',
      host_id: 'test_host',
      host_email: 'test@example.com',
      synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('zoom_webinars')
      .insert(testWebinar)
      .select();
    
    if (insertError) {
      console.error('❌ INSERT Error:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ INSERT Success!', insertData);
      
      // Clean up - delete the test webinar
      console.log('\n🧹 Cleaning up test webinar...');
      const { error: deleteError } = await supabaseAdmin
        .from('zoom_webinars')
        .delete()
        .eq('webinar_id', testWebinar.webinar_id);
      
      if (deleteError) {
        console.error('❌ DELETE Error:', deleteError);
      } else {
        console.log('✅ Cleanup successful');
      }
    }

    // Test 3: Check the JWT claims
    console.log('\n🔐 Test 3: Checking JWT claims...');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser();
    
    if (userError) {
      console.log('ℹ️ No user context with service role (expected)');
    } else {
      console.log('User context:', user);
    }

    // Test 4: Try raw SQL to check permissions
    console.log('\n🔧 Test 4: Raw SQL test...');
    const { data: sqlData, error: sqlError } = await supabaseAdmin
      .rpc('check_current_role');
    
    if (sqlError) {
      // Try a different approach
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('zoom_webinars')
        .select('connection_id')
        .limit(1);
      
      if (!roleError) {
        console.log('✅ Can execute queries');
      } else {
        console.error('❌ Query Error:', roleError);
      }
    } else {
      console.log('Current role:', sqlData);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Create a function to check current role
async function createRolCheckFunction() {
  console.log('\n🔨 Creating role check function...');
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION check_current_role()
      RETURNS text AS $$
      BEGIN
        RETURN current_setting('request.jwt.claims', true)::json->>'role';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  });
  
  if (error && !error.message.includes('already exists')) {
    console.error('Error creating function:', error);
  }
}

// Run the tests
testServiceRoleAccess();
