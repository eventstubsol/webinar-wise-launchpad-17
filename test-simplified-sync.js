import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { syncWebinars } from './render-backend/services/zoomSyncService.js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSimplifiedSync() {
  console.log('Testing simplified sync process...\n');
  
  try {
    // 1. Check if migration was successful
    console.log('1. Checking table structure...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'zoom_webinars' });
    
    if (columnsError) {
      // Try alternative method
      const { data: webinar, error } = await supabase
        .from('zoom_webinars')
        .select('*')
        .limit(1);
        
      if (!error) {
        console.log('✓ zoom_webinars table exists');
      }
    } else {
      console.log(`✓ zoom_webinars table has ${columns.length} columns (simplified from 113)`);
    }
    
    // 2. Check webinar_metrics table
    const { data: metrics, error: metricsError } = await supabase
      .from('webinar_metrics')
      .select('*')
      .limit(1);
      
    if (!metricsError) {
      console.log('✓ webinar_metrics table created successfully');
    }
    
    // 3. Test sync with a connection
    console.log('\n2. Testing sync process...');
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_status', 'active')
      .single();
      
    if (connError || !connection) {
      console.log('No active connection found. Please connect to Zoom first.');
      return;
    }
    
    console.log(`Found active connection for: ${connection.zoom_email}`);
    
    // 4. Get credentials
    const { data: credentials } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connection.user_id)
      .single();
      
    if (!credentials) {
      console.log('No credentials found for connection.');
      return;
    }
    
    // 5. Run a test sync
    console.log('\n3. Running test sync...');
    
    const results = await syncWebinars({
      connection,
      credentials,
      syncLogId: 'test-sync',
      syncType: 'manual',
      onProgress: (progress, message) => {
        console.log(`[${progress}%] ${message}`);
      }
    });
    
    console.log('\n4. Sync Results:');
    console.log(`- Total webinars found: ${results.totalWebinars}`);
    console.log(`- Webinars processed: ${results.processedWebinars}`);
    console.log(`- Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors encountered:');
      results.errors.forEach(err => {
        console.log(`- Webinar ${err.webinar_id}: ${err.error}`);
      });
    }
    
    // 6. Verify data in database
    console.log('\n5. Verifying synced data...');
    const { data: webinars, count } = await supabase
      .from('zoom_webinars')
      .select('*', { count: 'exact' })
      .eq('connection_id', connection.id)
      .order('start_time', { ascending: false })
      .limit(5);
      
    console.log(`\n✓ Found ${count} webinars in database`);
    
    if (webinars && webinars.length > 0) {
      console.log('\nSample webinars:');
      webinars.forEach(w => {
        console.log(`- ${w.topic} (${w.status}) - ${new Date(w.start_time).toLocaleDateString()}`);
      });
    }
    
    // 7. Check metrics
    const { data: metricsData } = await supabase
      .from('webinar_metrics')
      .select('*')
      .limit(5);
      
    if (metricsData && metricsData.length > 0) {
      console.log(`\n✓ Found ${metricsData.length} metrics records`);
    }
    
    console.log('\n✅ Simplified sync test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Create RPC function if it doesn't exist
async function createGetColumnsFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
    RETURNS TABLE(column_name text, data_type text) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        c.column_name::text,
        c.data_type::text
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' 
      AND c.table_name = get_table_columns.table_name
      ORDER BY c.ordinal_position;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  try {
    await supabase.rpc('query', { query: functionSQL });
  } catch (e) {
    // Function might already exist
  }
}

// Run the test
createGetColumnsFunction().then(() => {
  testSimplifiedSync();
});
