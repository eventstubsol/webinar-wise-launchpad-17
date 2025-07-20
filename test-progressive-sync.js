const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testProgressiveSync() {
  try {
    console.log('Testing progressive sync...');
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('User error:', userError);
      return;
    }
    
    // Get primary connection
    const { data: connections, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .eq('connection_status', 'active')
      .single();
      
    if (connError) {
      console.error('Connection error:', connError);
      return;
    }
    
    console.log('Found connection:', connections.id);
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('zoom-progressive-sync', {
      body: {
        connection_id: connections.id
      }
    });
    
    if (error) {
      console.error('Edge function error:', error);
      // Try to get more details
      if (error.context) {
        console.error('Error context:', error.context);
      }
      if (error.details) {
        console.error('Error details:', error.details);
      }
      return;
    }
    
    console.log('Success:', data);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testProgressiveSync();
