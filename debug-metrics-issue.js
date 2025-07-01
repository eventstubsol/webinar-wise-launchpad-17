import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function debugMetricsIssue() {
  console.log('🔍 Debugging Metrics Query Issue\n');
  
  try {
    // 1. Test basic webinars query
    console.log('1️⃣ Testing basic webinars query...');
    const { data: webinars, error: webinarsError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .limit(1);
    
    if (webinarsError) {
      console.error('❌ Basic webinars query failed:', webinarsError);
    } else {
      console.log('✅ Basic webinars query works');
    }
    
    // 2. Test webinars with metrics join
    console.log('\n2️⃣ Testing webinars with metrics join...');
    const { data: webinarsWithMetrics, error: joinError } = await supabase
      .from('zoom_webinars')
      .select(`
        *,
        metrics:webinar_metrics(
          total_attendees,
          unique_attendees,
          participant_sync_status
        )
      `)
      .limit(1);
    
    if (joinError) {
      console.error('❌ Metrics join query failed:', joinError);
    } else {
      console.log('✅ Metrics join query works');
      console.log('Sample data:', JSON.stringify(webinarsWithMetrics?.[0], null, 2));
    }
    
    // 3. Test if zoom_registrants table exists
    console.log('\n3️⃣ Checking if zoom_registrants table exists...');
    const { data: registrants, error: registrantsError } = await supabase
      .from('zoom_registrants')
      .select('*')
      .limit(1);
    
    if (registrantsError) {
      console.log('⚠️  zoom_registrants table query failed (this might be expected):', registrantsError.message);
    } else {
      console.log('✅ zoom_registrants table exists');
    }
    
    // 4. Check foreign key relationships
    console.log('\n4️⃣ Checking foreign key relationships...');
    const { data: fkData } = await supabase.rpc('get_foreign_keys', {
      table_name: 'zoom_webinars'
    }).catch(() => ({ data: null }));
    
    if (fkData) {
      console.log('Foreign keys on zoom_webinars:', fkData);
    }
    
    // 5. Get a connection ID for testing
    console.log('\n5️⃣ Finding a test connection...');
    const { data: connections } = await supabase
      .from('zoom_connections')
      .select('id, zoom_email')
      .limit(1);
    
    if (connections && connections.length > 0) {
      const connectionId = connections[0].id;
      console.log(`✅ Found connection: ${connections[0].zoom_email} (${connectionId})`);
      
      // 6. Test the exact query that's failing
      console.log('\n6️⃣ Testing the problematic query...');
      const { data: problematicData, error: problematicError } = await supabase
        .from('zoom_webinars')
        .select(`
          *,
          zoom_registrants(count),
          zoom_participants(count)
        `)
        .eq('connection_id', connectionId);
      
      if (problematicError) {
        console.error('❌ Problematic query failed (as expected):', problematicError);
        console.log('\nThis confirms the issue - the old query format is incompatible with the new structure.');
      } else {
        console.log('✅ Problematic query somehow worked?');
      }
    }
    
    console.log('\n💡 Solution Summary:');
    console.log('- The zoom_webinars table has been simplified');
    console.log('- Metrics are now in a separate webinar_metrics table');
    console.log('- The frontend code has been updated to use the new structure');
    console.log('- You may need to refresh your browser to clear cached queries');
    
  } catch (error) {
    console.error('❌ Debug script failed:', error);
  }
}

// Create helper function if needed
async function createHelperFunction() {
  const functionSQL = `
    CREATE OR REPLACE FUNCTION get_foreign_keys(table_name text)
    RETURNS TABLE(
      constraint_name text,
      foreign_table_name text,
      foreign_column_name text
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        tc.constraint_name::text,
        ccu.table_name::text as foreign_table_name,
        ccu.column_name::text as foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = get_foreign_keys.table_name
        AND tc.constraint_type = 'FOREIGN KEY';
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `;
  
  try {
    await supabase.rpc('exec_sql', { sql: functionSQL }).catch(() => {});
  } catch (e) {
    // Function might already exist
  }
}

// Run the debug script
console.log('Webinar Wise - Metrics Query Debug');
console.log('==================================\n');

createHelperFunction().then(() => {
  debugMetricsIssue();
});
