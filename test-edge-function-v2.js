// Test script to verify edge function
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEdgeFunction() {
  console.log('🧪 Testing zoom-sync-webinars edge function...\n');

  try {
    // First, sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL || 'your-email@example.com',
      password: process.env.TEST_PASSWORD || 'your-password'
    });

    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.log('Please set TEST_EMAIL and TEST_PASSWORD in your .env file');
      return;
    }

    console.log('✅ Authenticated successfully');

    // Get the user's Zoom connection
    const { data: connections, error: connError } = await supabase
      .from('zoom_connections')
      .select('id, zoom_email, connection_status')
      .eq('connection_status', 'active')
      .limit(1);

    if (connError || !connections || connections.length === 0) {
      console.error('❌ No active Zoom connection found');
      return;
    }

    const connectionId = connections[0].id;
    console.log(`✅ Found active connection: ${connections[0].zoom_email}`);
    console.log(`   Connection ID: ${connectionId}\n`);

    // Test the edge function
    console.log('📤 Calling edge function...');
    const { data, error } = await supabase.functions.invoke('zoom-sync-webinars', {
      body: {
        zoom_connection_id: connectionId,
        test_mode: true
      },
      headers: {
        'zoom_connection_id': connectionId,
        'test_mode': 'true'
      }
    });

    if (error) {
      console.error('❌ Edge function error:', error);
      console.error('   Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Edge function succeeded!');
      console.log('   Response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testEdgeFunction();
