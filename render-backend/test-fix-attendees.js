// Test script to fix attendee counts and resync webinars
require('dotenv').config();
const { fixUniqueAttendees, resyncWebinarAttendees } = require('./services/fixAttendeeCount');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testFix() {
  console.log('=== TESTING ATTENDEE COUNT FIX ===\n');
  
  try {
    // Step 1: Fix all existing attendee counts
    console.log('Step 1: Fixing unique attendee counts for all webinars...');
    const fixResult = await fixUniqueAttendees();
    console.log('Fix completed:', fixResult);
    console.log('\n-----------------------------------\n');
    
    // Step 2: Find a webinar with high registrants but low attendees
    console.log('Step 2: Finding a webinar to resync...');
    const { data: testWebinar, error } = await supabase
      .from('zoom_webinars')
      .select('zoom_webinar_id, topic, total_registrants, total_attendees, connection_id')
      .eq('status', 'ended')
      .gt('total_registrants', 100)
      .lt('total_attendees', 10)
      .limit(1)
      .single();

    if (error || !testWebinar) {
      console.log('No webinars found that need resyncing');
      return;
    }

    console.log(`Found webinar to test: ${testWebinar.topic}`);
    console.log(`Current state: ${testWebinar.total_attendees} attendees out of ${testWebinar.total_registrants} registrants`);
    console.log('\n-----------------------------------\n');
    
    // Step 3: Resync this webinar
    console.log('Step 3: Resyncing webinar participants...');
    const resyncResult = await resyncWebinarAttendees(
      testWebinar.zoom_webinar_id,
      testWebinar.connection_id
    );
    
    console.log('\nResync completed:');
    console.log(`- Old attendee count: ${resyncResult.oldAttendees}`);
    console.log(`- New attendee count: ${resyncResult.newAttendees}`);
    console.log(`- Total sessions: ${resyncResult.totalSessions}`);
    console.log(`- Absentees: ${resyncResult.absentees}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testFix().then(() => {
  console.log('\n=== TEST COMPLETED ===');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
