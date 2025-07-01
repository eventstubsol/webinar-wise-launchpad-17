import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLiveSync() {
  console.log('🚀 Testing Live Sync with Simplified Structure\n');
  
  try {
    // 1. Verify table structure
    console.log('1️⃣ Verifying table structure...');
    
    // Check zoom_webinars table
    const { data: webinarSample, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('*')
      .limit(1);
    
    if (!webinarError) {
      console.log('✅ zoom_webinars table exists and is accessible');
    } else {
      console.error('❌ Error accessing zoom_webinars:', webinarError.message);
      return;
    }
    
    // Check webinar_metrics table
    const { data: metricsSample, error: metricsError } = await supabase
      .from('webinar_metrics')
      .select('*')
      .limit(1);
    
    if (!metricsError) {
      console.log('✅ webinar_metrics table exists and is accessible');
    } else {
      console.error('❌ Error accessing webinar_metrics:', metricsError.message);
      return;
    }
    
    // 2. Get active connection
    console.log('\n2️⃣ Finding active Zoom connection...');
    const { data: connection, error: connError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_status', 'active')
      .single();
    
    if (connError || !connection) {
      console.log('❌ No active Zoom connection found. Please connect to Zoom first.');
      return;
    }
    
    console.log(`✅ Found active connection: ${connection.zoom_email}`);
    
    // 3. Get credentials
    const { data: credentials, error: credError } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connection.user_id)
      .eq('is_active', true)
      .single();
    
    if (credError || !credentials) {
      console.log('❌ No active credentials found.');
      return;
    }
    
    console.log('✅ Found active credentials');
    
    // 4. Trigger sync via Render backend
    console.log('\n3️⃣ Triggering sync via Render backend...');
    
    const syncUrl = `${process.env.RENDER_BACKEND_URL || 'https://webinar-wise-launchpad-17.onrender.com'}/api/zoom/sync`;
    
    console.log(`Calling: ${syncUrl}`);
    
    const syncResponse = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.RENDER_API_KEY || 'your-api-key-here'
      },
      body: JSON.stringify({
        connectionId: connection.id,
        syncType: 'manual',
        userId: connection.user_id
      })
    });
    
    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('❌ Sync request failed:', errorText);
      return;
    }
    
    const syncResult = await syncResponse.json();
    console.log('✅ Sync triggered successfully:', syncResult);
    
    // Wait for sync to complete
    console.log('\n4️⃣ Waiting for sync to complete...');
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check sync log status
      const { data: syncLog } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('id', syncResult.syncLogId)
        .single();
      
      if (syncLog && syncLog.sync_status === 'completed') {
        console.log('✅ Sync completed successfully!');
        break;
      } else if (syncLog && syncLog.sync_status === 'failed') {
        console.error('❌ Sync failed:', syncLog.error_message);
        break;
      }
      
      attempts++;
      process.stdout.write('.');
    }
    
    // 5. Verify synced data
    console.log('\n\n5️⃣ Verifying synced data...');
    
    // Count webinars
    const { count: webinarCount } = await supabase
      .from('zoom_webinars')
      .select('*', { count: 'exact', head: true })
      .eq('connection_id', connection.id);
    
    console.log(`✅ Total webinars synced: ${webinarCount}`);
    
    // Get sample webinars with metrics
    const { data: sampleWebinars } = await supabase
      .from('zoom_webinars')
      .select(`
        id,
        topic,
        status,
        start_time,
        registrants_count,
        metrics:webinar_metrics(
          total_attendees,
          unique_attendees,
          participant_sync_status
        )
      `)
      .eq('connection_id', connection.id)
      .order('start_time', { ascending: false })
      .limit(5);
    
    if (sampleWebinars && sampleWebinars.length > 0) {
      console.log('\n📊 Sample webinars:');
      sampleWebinars.forEach(w => {
        const metrics = w.metrics?.[0] || {};
        console.log(`
  📌 ${w.topic}
     Status: ${w.status}
     Date: ${new Date(w.start_time).toLocaleDateString()}
     Registrants: ${w.registrants_count}
     Attendees: ${metrics.total_attendees || 0}
     Sync Status: ${metrics.participant_sync_status || 'pending'}
        `);
      });
    }
    
    // 6. Check for any sync errors
    const { data: recentErrors } = await supabase
      .from('zoom_sync_logs')
      .select('error_message, error_details')
      .eq('connection_id', connection.id)
      .not('error_message', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentErrors && recentErrors.length > 0) {
      console.log('\n⚠️  Recent sync errors:');
      recentErrors.forEach(err => {
        console.log(`- ${err.error_message}`);
      });
    }
    
    console.log('\n✅ Live sync test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
console.log('Webinar Wise - Live Sync Test');
console.log('================================\n');
testLiveSync();
