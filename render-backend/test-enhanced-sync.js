// Comprehensive test to verify enhanced participant sync with session tracking
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { syncWebinarsEnhanced } = require('./services/zoomSyncServiceEnhanced');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testEnhancedSync() {
  console.log('=== ENHANCED PARTICIPANT SYNC TEST ===\n');
  console.log('This test will sync webinars with proper session tracking for participants\n');
  
  try {
    // Get connection and credentials
    const { data: connection } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_type', 'server_to_server')
      .single();
    
    if (!connection) {
      console.error('No server-to-server connection found');
      return;
    }
    
    const { data: credentials } = await supabase
      .from('zoom_credentials')
      .select('*')
      .eq('user_id', connection.user_id)
      .eq('is_active', true)
      .single();
    
    if (!credentials) {
      console.error('No active credentials found');
      return;
    }
    
    console.log('✅ Found connection and credentials\n');
    
    // Get initial counts
    const { count: initialParticipants } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true });
    
    const { count: initialSessions } = await supabase
      .from('zoom_participant_sessions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Initial state:
    - Participants: ${initialParticipants || 0}
    - Sessions: ${initialSessions || 0}\n`);
    
    // Create sync log
    const { data: syncLog } = await supabase
      .from('zoom_sync_logs')
      .insert({
        connection_id: connection.id,
        sync_type: 'enhanced_test',
        sync_status: 'started',
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    // Run enhanced sync
    console.log('Starting enhanced sync...\n');
    
    const results = await syncWebinarsEnhanced({
      connection,
      credentials,
      syncLogId: syncLog.id,
      syncType: 'enhanced',
      onProgress: async (progress, message) => {
        console.log(`[${progress}%] ${message}`);
      }
    });
    
    console.log('\n✅ Sync completed!');
    console.log(`Results:
    - Webinars processed: ${results.processedWebinars}
    - Total participants: ${results.totalParticipants}
    - Total sessions: ${results.totalSessions}
    - Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\nErrors encountered:');
      results.errors.forEach(error => {
        console.log(`- ${error.webinar_id}: ${error.error}`);
      });
    }
    
    // Get final counts
    const { count: finalParticipants } = await supabase
      .from('zoom_participants')
      .select('*', { count: 'exact', head: true });
    
    const { count: finalSessions } = await supabase
      .from('zoom_participant_sessions')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nFinal state:
    - Participants: ${finalParticipants || 0} (+${(finalParticipants || 0) - (initialParticipants || 0)})
    - Sessions: ${finalSessions || 0} (+${(finalSessions || 0) - (initialSessions || 0)})`);
    
    // Check a specific webinar with many participants
    const { data: sampleWebinar } = await supabase
      .from('zoom_webinars')
      .select('*')
      .order('actual_participant_count', { ascending: false })
      .limit(1)
      .single();
    
    if (sampleWebinar) {
      console.log(`\nSample webinar analysis:
      Topic: ${sampleWebinar.topic}
      Expected attendees: ${sampleWebinar.total_attendees}
      Actual participants: ${sampleWebinar.actual_participant_count}
      Unique participants: ${sampleWebinar.unique_participant_count}
      Total participant minutes: ${sampleWebinar.total_participant_minutes}`);
      
      // Check participants with multiple sessions
      const { data: multiSessionParticipants } = await supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', sampleWebinar.id)
        .gt('session_count', 1)
        .order('session_count', { ascending: false })
        .limit(5);
      
      if (multiSessionParticipants && multiSessionParticipants.length > 0) {
        console.log('\nParticipants with multiple sessions:');
        multiSessionParticipants.forEach(p => {
          console.log(`- ${p.participant_name}: ${p.session_count} sessions, total ${Math.round(p.total_duration / 60)} minutes`);
        });
      }
    }
    
    // Update sync log
    await supabase
      .from('zoom_sync_logs')
      .update({
        sync_status: 'completed',
        status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          participants_synced: results.totalParticipants,
          sessions_tracked: results.totalSessions,
          webinars_processed: results.processedWebinars
        }
      })
      .eq('id', syncLog.id);
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEnhancedSync();
