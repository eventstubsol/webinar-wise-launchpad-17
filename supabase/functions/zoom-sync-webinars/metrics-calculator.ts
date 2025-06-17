
/**
 * Update webinar metrics after syncing
 */
export async function updateWebinarMetrics(
  supabase: any,
  webinarDbId: string,
  registrants: any[],
  participants: any[]
): Promise<void> {
  console.log(`Calculating metrics for webinar ${webinarDbId}`);
  
  try {
    const totalRegistrants = registrants?.length || 0;
    const attendees = registrants?.filter(r => r.join_time) || [];
    const totalAttendees = participants?.length || attendees.length;
    
    let totalMinutes = 0;
    let avgAttendanceDuration = 0;
    
    if (participants && participants.length > 0) {
      // Use participant data for more accurate metrics
      totalMinutes = participants.reduce((sum, participant) => {
        return sum + (participant.duration || 0);
      }, 0);
      avgAttendanceDuration = Math.round(totalMinutes / participants.length);
    } else if (attendees.length > 0) {
      // Fallback to registrant data
      totalMinutes = attendees.reduce((sum, attendee) => {
        return sum + (attendee.duration || 0);
      }, 0);
      avgAttendanceDuration = Math.round(totalMinutes / attendees.length);
    }
    
    console.log(`Calculated metrics:`, {
      totalRegistrants,
      totalAttendees,
      totalMinutes,
      avgAttendanceDuration
    });

    const { error: updateError } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: totalRegistrants,
        total_attendees: totalAttendees,
        total_minutes: totalMinutes,
        avg_attendance_duration: avgAttendanceDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (updateError) {
      console.error('Failed to update webinar metrics:', updateError);
    } else {
      console.log(`Successfully updated metrics for webinar ${webinarDbId}`);
    }
  } catch (error) {
    console.error('Error calculating webinar metrics:', error);
  }
}
