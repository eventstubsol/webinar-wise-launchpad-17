// Fix all webinars attendee counts
require('dotenv').config();
const { fixUniqueAttendees } = require('./services/fixAttendeeCount');

async function fixAll() {
  console.log('=== FIXING ALL WEBINAR ATTENDEE COUNTS ===\n');
  
  try {
    const result = await fixUniqueAttendees();
    
    console.log('\n=== FIX COMPLETED ===');
    console.log(`Total webinars updated: ${result.updatedCount}`);
    
    if (result.examples && result.examples.length > 0) {
      console.log('\nWebinars that were fixed:');
      result.examples.forEach((ex, i) => {
        console.log(`\n${i + 1}. ${ex.topic}`);
        console.log(`   Webinar ID: ${ex.zoom_webinar_id}`);
        console.log(`   Before: ${ex.old_attendees} attendees`);
        console.log(`   After: ${ex.new_attendees} unique attendees (${ex.total_sessions} total sessions)`);
        console.log(`   Registrants: ${ex.registrants}, Absentees: ${ex.absentees}`);
      });
    }
    
  } catch (error) {
    console.error('Error fixing attendee counts:', error);
  }
}

fixAll().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
