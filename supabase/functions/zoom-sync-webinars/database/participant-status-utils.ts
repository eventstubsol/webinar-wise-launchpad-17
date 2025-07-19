
/**
 * Participant sync status utilities
 */
export async function determineParticipantSyncStatus(webinarData: any): Promise<'not_applicable' | 'pending'> {
  console.log(`🔍 Determining participant sync status for webinar: ${webinarData.topic || webinarData.id}`);
  console.log(`  📅 Start time: ${webinarData.start_time}`);
  console.log(`  📊 Duration: ${webinarData.duration} minutes`);
  console.log(`  🔄 Status: ${webinarData.status}`);

  if (!webinarData.start_time) {
    console.log(`  ❌ No start time - returning 'not_applicable'`);
    return 'not_applicable';
  }

  const startTime = new Date(webinarData.start_time);
  const now = new Date();
  const duration = webinarData.duration || 60; // Default to 60 minutes if duration missing
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  const bufferEnd = new Date(endTime.getTime() + 10 * 60 * 1000); // 10 minute buffer

  console.log(`  🕐 Current time: ${now.toISOString()}`);
  console.log(`  🕑 Start time: ${startTime.toISOString()}`);
  console.log(`  🕒 End time: ${endTime.toISOString()}`);
  console.log(`  🕓 Buffer end: ${bufferEnd.toISOString()}`);

  // Future webinars are not applicable
  if (startTime > now) {
    console.log(`  ⏭️ Future webinar - returning 'not_applicable'`);
    return 'not_applicable';
  }

  // Webinars that haven't finished yet (including buffer) should not be synced
  if (now <= bufferEnd) {
    console.log(`  ⏳ Webinar still ongoing or recently ended - returning 'not_applicable'`);
    return 'not_applicable';
  }

  // Webinar has ended with buffer - eligible for participant sync
  console.log(`  ✅ Webinar has ended - returning 'pending'`);
  return 'pending';
}
