import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const SUPABASE_URL = 'https://guwvvinnifypcxwbcnzz.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testDirectDatabaseWrite() {
  console.log('🔧 Testing direct database write with service role key...\n');

  try {
    // Test 1: Can we SELECT with service role?
    console.log('📊 Test 1: SELECT with service role...');
    const { data: selectData, error: selectError, count } = await supabase
      .from('zoom_webinars')
      .select('*', { count: 'exact', head: true });
    
    if (selectError) {
      console.error('❌ SELECT failed:', selectError);
    } else {
      console.log('✅ SELECT successful! Can see', count, 'webinars');
    }

    // Test 2: Try to INSERT a test webinar
    console.log('\n➕ Test 2: INSERT with service role...');
    const testWebinar = {
      webinar_id: 'TEST_SERVICE_' + Date.now(),
      connection_id: 'e03a3898-2e4d-4e69-a03e-2faf34d1f418',
      topic: 'Service Role Test Webinar',
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

    const { data: insertData, error: insertError } = await supabase
      .from('zoom_webinars')
      .insert(testWebinar)
      .select();
    
    if (insertError) {
      console.error('❌ INSERT failed:', insertError);
      console.error('Error details:', JSON.stringify(insertError, null, 2));
    } else {
      console.log('✅ INSERT successful!', insertData);
      
      // Clean up - delete the test webinar
      console.log('\n🧹 Cleaning up test webinar...');
      const { error: deleteError } = await supabase
        .from('zoom_webinars')
        .delete()
        .eq('webinar_id', testWebinar.webinar_id);
      
      if (deleteError) {
        console.error('❌ DELETE failed:', deleteError);
      } else {
        console.log('✅ Cleanup successful');
      }
    }

    // Test 3: Try to UPDATE an existing webinar
    console.log('\n📝 Test 3: UPDATE with service role...');
    // First, get an existing webinar
    const { data: existingWebinar } = await supabase
      .from('zoom_webinars')
      .select('id, webinar_id, topic')
      .limit(1)
      .single();

    if (existingWebinar) {
      const originalTopic = existingWebinar.topic;
      const { error: updateError } = await supabase
        .from('zoom_webinars')
        .update({ 
          topic: originalTopic + ' (test update)',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingWebinar.id);
      
      if (updateError) {
        console.error('❌ UPDATE failed:', updateError);
      } else {
        console.log('✅ UPDATE successful!');
        
        // Revert the change
        await supabase
          .from('zoom_webinars')
          .update({ 
            topic: originalTopic,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingWebinar.id);
        console.log('✅ Reverted topic change');
      }
    }

    // Test 4: Check who we are
    console.log('\n🔐 Test 4: Check authentication context...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('ℹ️ No user context with service role (expected)');
    } else {
      console.log('User context:', user);
    }

    // Test 5: Raw SQL to check role
    console.log('\n🔧 Test 5: Check database role...');
    const { data: roleData, error: roleError } = await supabase
      .rpc('get_current_role', {});
    
    if (roleError) {
      // Create the function and try again
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION get_current_role()
          RETURNS json AS $$
          BEGIN
            RETURN json_build_object(
              'current_user', current_user,
              'session_user', session_user,
              'current_role', current_setting('role', true),
              'jwt_role', current_setting('request.jwt.claims', true)::json->>'role',
              'is_superuser', current_setting('is_superuser', true)
            );
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      }).catch(() => {});
      
      const { data: retryData } = await supabase.rpc('get_current_role', {});
      if (retryData) {
        console.log('Database role info:', retryData);
      }
    } else {
      console.log('Database role info:', roleData);
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the test
testDirectDatabaseWrite();
