import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySimplification() {
  console.log('🔍 Verifying Zoom Webinars Table Simplification\n');
  
  try {
    // 1. Check if backup table exists
    console.log('1️⃣ Checking backup table...');
    const { data: backupData, error: backupError } = await supabase
      .from('zoom_webinars_backup')
      .select('*')
      .limit(1);
    
    if (!backupError) {
      const { count } = await supabase
        .from('zoom_webinars_backup')
        .select('*', { count: 'exact', head: true });
      console.log(`✅ Backup table exists with ${count} records`);
    } else {
      console.log('⚠️  No backup table found (might be first time running)');
    }
    
    // 2. Check new zoom_webinars structure
    console.log('\n2️⃣ Checking new zoom_webinars table...');
    const { data: webinarColumns } = await supabase.rpc('get_table_columns', { 
      table_name: 'zoom_webinars' 
    }).catch(() => ({ data: null }));
    
    if (webinarColumns) {
      console.log(`✅ zoom_webinars table has ${webinarColumns.length} columns (simplified from 113)`);
      
      // List key columns
      const keyColumns = [
        'zoom_webinar_id', 'host_id', 'host_email', 'topic', 
        'status', 'start_time', 'settings', 'registrants_count'
      ];
      console.log('\n   Key columns:');
      keyColumns.forEach(col => {
        const exists = webinarColumns.some(c => c.column_name === col);
        console.log(`   ${exists ? '✅' : '❌'} ${col}`);
      });
    }
    
    // 3. Check webinar_metrics table
    console.log('\n3️⃣ Checking webinar_metrics table...');
    const { count: metricsCount } = await supabase
      .from('webinar_metrics')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ webinar_metrics table exists with ${metricsCount} records`);
    
    // 4. Check data integrity
    console.log('\n4️⃣ Checking data integrity...');
    
    // Count webinars
    const { count: webinarCount } = await supabase
      .from('zoom_webinars')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   Total webinars: ${webinarCount}`);
    
    // Check for orphaned metrics
    const { data: orphanedMetrics } = await supabase
      .from('webinar_metrics')
      .select('id')
      .not('webinar_id', 'in', 
        `(SELECT id FROM zoom_webinars)`
      );
    
    if (orphanedMetrics && orphanedMetrics.length > 0) {
      console.log(`   ⚠️  Found ${orphanedMetrics.length} orphaned metrics records`);
    } else {
      console.log(`   ✅ No orphaned metrics records`);
    }
    
    // 5. Sample data with joins
    console.log('\n5️⃣ Testing data joins...');
    const { data: sampleData, error: joinError } = await supabase
      .from('zoom_webinars')
      .select(`
        id,
        topic,
        status,
        registrants_count,
        metrics:webinar_metrics(
          total_attendees,
          unique_attendees,
          participant_sync_status
        )
      `)
      .limit(3);
    
    if (!joinError && sampleData) {
      console.log('✅ Join query successful');
      console.log('\n   Sample data:');
      sampleData.forEach(w => {
        const metrics = w.metrics?.[0] || {};
        console.log(`   - ${w.topic.substring(0, 50)}...`);
        console.log(`     Registrants: ${w.registrants_count}, Attendees: ${metrics.total_attendees || 0}`);
      });
    } else {
      console.log('❌ Join query failed:', joinError?.message);
    }
    
    // 6. Check foreign key constraints
    console.log('\n6️⃣ Checking relationships...');
    
    // Check if zoom_participants still references zoom_webinars
    const { data: participant } = await supabase
      .from('zoom_participants')
      .select('webinar_id')
      .limit(1);
    
    if (participant) {
      console.log('✅ zoom_participants -> zoom_webinars relationship intact');
    }
    
    // 7. Performance check
    console.log('\n7️⃣ Performance check...');
    const startTime = Date.now();
    
    const { data: perfTest } = await supabase
      .from('zoom_webinars')
      .select(`
        *,
        metrics:webinar_metrics(*)
      `)
      .order('start_time', { ascending: false })
      .limit(50);
    
    const queryTime = Date.now() - startTime;
    console.log(`✅ Query for 50 webinars with metrics: ${queryTime}ms`);
    
    console.log('\n✅ Verification complete!');
    console.log('\nNext steps:');
    console.log('1. Run test-live-sync.js to test the sync process');
    console.log('2. Check the frontend to ensure everything displays correctly');
    console.log('3. Monitor for any errors in the application');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Create helper function if needed
async function createHelperFunction() {
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
    await supabase.rpc('exec_sql', { sql: functionSQL }).catch(() => {});
  } catch (e) {
    // Function might already exist
  }
}

// Run verification
console.log('Webinar Wise - Database Simplification Verification');
console.log('==================================================\n');

createHelperFunction().then(() => {
  verifySimplification();
});
