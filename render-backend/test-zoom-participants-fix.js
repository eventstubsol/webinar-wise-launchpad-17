// Test script to verify Zoom participants data sync improvements
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const zoomService = require('./services/zoomService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testParticipantsDataFix() {
  console.log('=== ZOOM PARTICIPANTS DATA FIX TEST ===\n');
  
  try {
    // 1. Get test connection
    const { data: connection } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('connection_type', 'server_to_server')
      .single();
    
    if (!connection) {
      console.error('No server-to-server connection found');
      return;
    }
    
    console.log('✅ Found connection:', connection.zoom_account_id);
    
    // 2. Get a test webinar
    const { data: webinar } = await supabase
      .from('zoom_webinars')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })
      .limit(1)
      .single();
    
    if (!webinar) {
      console.error('No completed webinar found');
      return;
    }
    
    console.log(`✅ Testing with webinar: ${webinar.topic} (${webinar.zoom_webinar_id})`);
    
    // 3. Clear existing participants for clean test
    await supabase
      .from('zoom_participants')
      .delete()
      .eq('webinar_id', webinar.id);
    
    console.log('✅ Cleared existing participants');
    
    // 4. Test Report Endpoint (with more data)
    console.log('\n📊 Testing Report Endpoint...');
    let reportParticipants = [];
    
    try {
      const reportResponse = await zoomService.getWebinarParticipantsReport(
        webinar.zoom_webinar_id,
        connection.access_token,
        { page_size: 300 }
      );
      
      reportParticipants = reportResponse.participants || [];
      console.log(`✅ Report endpoint returned ${reportParticipants.length} participants`);
      
      if (reportParticipants.length > 0) {
        console.log('\nSample participant from report:');
        const sample = reportParticipants[0];
        console.log('Fields available:', Object.keys(sample).join(', '));
        console.log('Has email:', !!sample.email || !!sample.user_email);
        console.log('Has location:', !!sample.location || !!sample.city);
        console.log('Has device:', !!sample.device);
        console.log('Has engagement metrics:', !!sample.attentiveness_score);
      }
    } catch (error) {
      console.log('❌ Report endpoint failed:', error.message);
    }
    
    // 5. Test Basic Endpoint (fallback)
    console.log('\n📊 Testing Basic Endpoint...');
    let basicParticipants = [];
    
    try {
      const basicResponse = await zoomService.getWebinarParticipants(
        webinar.zoom_webinar_id,
        connection.access_token,
        { page_size: 300, page_number: 1 }
      );
      
      basicParticipants = basicResponse.participants || [];
      console.log(`✅ Basic endpoint returned ${basicParticipants.length} participants`);
      
      if (basicParticipants.length > 0) {
        console.log('\nSample participant from basic:');
        const sample = basicParticipants[0];
        console.log('Fields available:', Object.keys(sample).join(', '));
      }
    } catch (error) {
      console.log('❌ Basic endpoint failed:', error.message);
    }
    
    // 6. Save participants using the better data source
    const participantsToSave = reportParticipants.length > 0 ? reportParticipants : basicParticipants;
    const source = reportParticipants.length > 0 ? 'report' : 'basic';
    
    console.log(`\n💾 Saving ${participantsToSave.length} participants from ${source} endpoint...`);
    
    const participantInserts = participantsToSave.map(participant => ({
      webinar_id: webinar.id,
      // Primary identifiers
      participant_uuid: participant.participant_user_id || participant.user_id || participant.id || '',
      participant_id: participant.id || participant.registrant_id || '',
      participant_email: participant.email || participant.user_email || null,
      participant_name: participant.name || participant.display_name || participant.user_name || '',
      // Legacy columns
      name: participant.name || participant.display_name || '',
      email: participant.email || participant.user_email || null,
      user_id: participant.user_id || null,
      registrant_id: participant.registrant_id || null,
      // Time fields
      join_time: participant.join_time || null,
      leave_time: participant.leave_time || null,
      duration: participant.duration || 0,
      // Advanced fields (from report)
      attentiveness_score: participant.attentiveness_score || null,
      location: participant.location || participant.city || null,
      city: participant.city || null,
      country: participant.country || null,
      device: participant.device || null,
      ip_address: participant.ip_address || null,
      network_type: participant.network_type || null,
      // Engagement metrics
      posted_chat: participant.posted_chat || false,
      raised_hand: participant.raised_hand || false,
      answered_polling: participant.answered_polling || false,
      asked_question: participant.asked_question || false,
      camera_on_duration: participant.camera_on_duration || 0,
      // Status
      status: participant.status || 'joined',
      participant_status: 'in_meeting'
    }));
    
    const { error: insertError } = await supabase
      .from('zoom_participants')
      .insert(participantInserts);
    
    if (insertError) {
      console.error('❌ Error inserting participants:', insertError);
    } else {
      console.log('✅ Participants saved successfully');
    }
    
    // 7. Analyze saved data
    console.log('\n📈 Analyzing saved data...');
    
    const { data: savedParticipants } = await supabase
      .from('zoom_participants')
      .select('*')
      .eq('webinar_id', webinar.id);
    
    if (savedParticipants && savedParticipants.length > 0) {
      const fieldStats = {
        total: savedParticipants.length,
        hasEmail: savedParticipants.filter(p => p.participant_email).length,
        hasLocation: savedParticipants.filter(p => p.location).length,
        hasDevice: savedParticipants.filter(p => p.device).length,
        hasAttentiveness: savedParticipants.filter(p => p.attentiveness_score !== null).length,
        hasEngagement: savedParticipants.filter(p => 
          p.posted_chat || p.raised_hand || p.answered_polling || p.asked_question
        ).length
      };
      
      console.log('\nData Quality Report:');
      console.log(`Total Participants: ${fieldStats.total}`);
      console.log(`With Email: ${fieldStats.hasEmail} (${((fieldStats.hasEmail/fieldStats.total)*100).toFixed(1)}%)`);
      console.log(`With Location: ${fieldStats.hasLocation} (${((fieldStats.hasLocation/fieldStats.total)*100).toFixed(1)}%)`);
      console.log(`With Device: ${fieldStats.hasDevice} (${((fieldStats.hasDevice/fieldStats.total)*100).toFixed(1)}%)`);
      console.log(`With Attentiveness Score: ${fieldStats.hasAttentiveness} (${((fieldStats.hasAttentiveness/fieldStats.total)*100).toFixed(1)}%)`);
      console.log(`With Engagement Data: ${fieldStats.hasEngagement} (${((fieldStats.hasEngagement/fieldStats.total)*100).toFixed(1)}%)`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testParticipantsDataFix();
