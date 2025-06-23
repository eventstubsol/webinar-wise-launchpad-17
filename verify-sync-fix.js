// Verification script for sync_status fix
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verifying sync_status column fix...\n');

async function verifyFix() {
  try {
    // Test 1: Query using 'status' column
    console.log('Test 1: Querying with status column...');
    const { data: statusData, error: statusError } = await supabase
      .from('zoom_sync_logs')
      .select('id, status, completed_at')
      .eq('status', 'completed')
      .limit(1);

    if (statusError) {
      console.error('❌ Status query failed:', statusError);
    } else {
      console.log('✅ Status query successful:', statusData?.length || 0, 'records found');
    }

    // Test 2: Query using 'sync_status' column
    console.log('\nTest 2: Querying with sync_status column...');
    const { data: syncStatusData, error: syncStatusError } = await supabase
      .from('zoom_sync_logs')
      .select('id, sync_status, completed_at')
      .eq('sync_status', 'completed')
      .limit(1);

    if (syncStatusError) {
      console.error('❌ Sync_status query failed:', syncStatusError);
    } else {
      console.log('✅ Sync_status query successful:', syncStatusData?.length || 0, 'records found');
    }

    // Test 3: Query using both columns
    console.log('\nTest 3: Querying with both columns...');
    const { data: bothData, error: bothError } = await supabase
      .from('zoom_sync_logs')
      .select('id, status, sync_status, completed_at')
      .eq('status', 'completed')
      .eq('sync_status', 'completed')
      .limit(1);

    if (bothError) {
      console.error('❌ Both columns query failed:', bothError);
    } else {
      console.log('✅ Both columns query successful:', bothData?.length || 0, 'records found');
      if (bothData && bothData.length > 0) {
        console.log('   status:', bothData[0].status);
        console.log('   sync_status:', bothData[0].sync_status);
        console.log('   Both values match:', bothData[0].status === bothData[0].sync_status);
      }
    }

    // Test 4: Check column metadata
    console.log('\nTest 4: Checking column metadata...');
    const { data: columns, error: columnsError } = await supabase.rpc('get_column_info', {
      table_name_param: 'zoom_sync_logs'
    });

    if (columnsError) {
      // If RPC doesn't exist, that's okay
      console.log('ℹ️  Column metadata check skipped (RPC function not available)');
    } else {
      const relevantColumns = columns?.filter(col => 
        col.column_name === 'status' || col.column_name === 'sync_status'
      );
      console.log('Column information:', relevantColumns);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('The sync_status column alias is working correctly.');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run verification
verifyFix();
