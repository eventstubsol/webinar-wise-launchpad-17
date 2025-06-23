const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testV2Sync() {
  console.log('Testing zoom-sync-webinars-v2 function...\n');

  try {
    // First, get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Not authenticated. Please log in first.');
      return;
    }

    // Get zoom connection
    const { data: connections, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (connError || !connections) {
      console.error('No Zoom connection found. Please connect Zoom first.');
      return;
    }

    console.log('Found Zoom connection:', connections.zoom_email);
    console.log('Testing v2 sync function...\n');

    // Test the v2 function
    const { data, error } = await supabase.functions.invoke('zoom-sync-webinars-v2', {
      body: {
        connectionId: connections.id,
        syncMode: 'full',
        dateRange: {
          pastDays: 7,
          futureDays: 30
        }
      }
    });

    if (error) {
      console.error('Error calling v2 function:', error);
      console.error('Error details:', error.message);
    } else {
      console.log('V2 sync started successfully!');
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (data.syncId) {
        console.log(`\nSync ID: ${data.syncId}`);
        console.log('You can monitor progress in the sync_progress_updates table');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testV2Sync();
