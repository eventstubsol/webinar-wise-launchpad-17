require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceSetAttendeeCount(webinarId, attendeeCount) {
  console.log(`\nSetting attendee count for webinar ${webinarId} to ${attendeeCount}`);
  
  const { data, error } = await supabase
    .from('zoom_webinars')
    .update({
      total_attendees: attendeeCount,
      unique_participant_count: attendeeCount,
      total_absentees: 0, // Will be recalculated
      updated_at: new Date().toISOString()
    })
    .eq('zoom_webinar_id', webinarId)
    .select()
    .single();
    
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✓ Updated successfully');
    console.log(`  Registrants: ${data.total_registrants}`);
    console.log(`  Attendees: ${data.total_attendees}`);
    console.log(`  Absentees: ${data.total_registrants - data.total_attendees}`);
  }
  
  return data;
}

async function fixKnownWebinars() {
  console.log('=== FIXING KNOWN WEBINAR ATTENDEE COUNTS ===\n');
  
  // These are the actual attendee counts you know are correct
  // Add more as needed
  const knownCounts = [
    { webinarId: '82293193909', actualAttendees: 1200 }, // Example - replace with actual
    // Add more webinars here with their correct counts
  ];
  
  for (const { webinarId, actualAttendees } of knownCounts) {
    await forceSetAttendeeCount(webinarId, actualAttendees);
  }
  
  // Recalculate absentees for all webinars
  console.log('\nRecalculating absentees for all webinars...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      UPDATE zoom_webinars
      SET total_absentees = GREATEST(0, total_registrants - total_attendees)
      WHERE status = 'ended'
      AND total_registrants > 0;
    `
  });
  
  if (error) {
    console.error('Error recalculating absentees:', error);
  } else {
    console.log('✓ Absentees recalculated successfully');
  }
}

// Allow command line usage
if (process.argv.length > 2) {
  const webinarId = process.argv[2];
  const attendeeCount = parseInt(process.argv[3]);
  
  if (!attendeeCount) {
    console.log('Usage: node simple-fix.js <webinar_id> <attendee_count>');
    console.log('Example: node simple-fix.js 82293193909 1200');
  } else {
    forceSetAttendeeCount(webinarId, attendeeCount).then(() => process.exit(0));
  }
} else {
  fixKnownWebinars().then(() => process.exit(0));
}
