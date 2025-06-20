// Debug script to check why webinars aren't being updated
// Run this: node debug-webinar-update.js

import { createClient } from '@supabase/supabase-js';

// Update these values
const SUPABASE_URL = 'https://guwvvinnifypcxwbcnzz.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'; // Get from Supabase dashboard
const CONNECTION_ID = 'e03a3898-2e4d-4e69-a03e-2faf34d1f418';

async function debugWebinarUpdate() {
  if (SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
    console.error('Please update SUPABASE_ANON_KEY first!');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('🔍 Debugging Webinar Update Issue\n');

  // 1. Check recent sync logs
  console.log('1. Checking recent sync logs...');
  const { data: syncLogs, error: syncError } = await supabase
    .from('zoom_sync_logs')
    .select('*')
    .eq('connection_id', CONNECTION_ID)
    .order('created_at', { ascending: false })
    .limit(3);

  if (syncError) {
    console.error('Error fetching sync logs:', syncError);
    return;
  }

  console.log('Recent sync logs:');
  syncLogs.forEach(log => {
    console.log(`- ${log.id}: ${log.sync_status} (${log.processed_items}/${log.total_items})`);
    if (log.error_message) {
      console.log(`  Error: ${log.error_message}`);
    }
  });

  // 2. Check when webinars were last updated
  console.log('\n2. Checking last webinar update times...');
  const { data: webinars, error: webinarError } = await supabase
    .from('zoom_webinars')
    .select('webinar_id, topic, synced_at, updated_at')
    .eq('connection_id', CONNECTION_ID)
    .order('synced_at', { ascending: false })
    .limit(5);

  if (webinarError) {
    console.error('Error fetching webinars:', webinarError);
    return;
  }

  console.log('Last updated webinars:');
  webinars.forEach(w => {
    const syncedAt = new Date(w.synced_at);
    const now = new Date();
    const hoursSince = (now - syncedAt) / (1000 * 60 * 60);
    console.log(`- ${w.webinar_id}: ${w.topic.substring(0, 50)}...`);
    console.log(`  Last synced: ${syncedAt.toLocaleString()} (${hoursSince.toFixed(1)} hours ago)`);
  });

  // 3. Check edge function logs
  console.log('\n3. To check edge function logs:');
  console.log('- Go to Supabase Dashboard > Functions > zoom-sync-webinars > Logs');
  console.log('- Look for any error messages or failed operations');

  // 4. Test database update directly
  console.log('\n4. Testing direct database update...');
  const testWebinar = {
    webinar_id: 'test-' + Date.now(),
    webinar_uuid: 'test-uuid-' + Date.now(),
    connection_id: CONNECTION_ID,
    topic: 'Test Webinar - Debug Script',
    type: 5,
    start_time: new Date().toISOString(),
    duration: 60,
    timezone: 'UTC',
    status: 'scheduled',
    host_id: 'test-host',
    host_email: 'test@example.com',
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: insertError } = await supabase
    .from('zoom_webinars')
    .insert(testWebinar);

  if (insertError) {
    console.error('❌ Failed to insert test webinar:', insertError);
    console.error('This might indicate a database permission issue');
  } else {
    console.log('✅ Successfully inserted test webinar');
    
    // Clean up
    await supabase
      .from('zoom_webinars')
      .delete()
      .eq('webinar_id', testWebinar.webinar_id);
  }

  // 5. Check RLS policies
  console.log('\n5. Database policies to check:');
  console.log('- Ensure RLS is enabled on zoom_webinars table');
  console.log('- Check that the service role can insert/update');
  console.log('- Verify the user has proper permissions');

  console.log('\n📋 Summary:');
  console.log('If webinars aren\'t updating, possible causes:');
  console.log('1. Edge function is failing silently (check function logs)');
  console.log('2. Database constraints preventing updates');
  console.log('3. RLS policies blocking writes');
  console.log('4. Data validation errors (field too long, wrong type)');
  console.log('5. Unique constraint violations');
}

debugWebinarUpdate().catch(console.error);
