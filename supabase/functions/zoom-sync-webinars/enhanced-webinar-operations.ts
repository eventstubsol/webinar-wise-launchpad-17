
export class EnhancedWebinarOperations {
  /**
   * Enhanced status detection based on webinar timing and Zoom API data
   */
  static calculateSmartStatus(webinar: any): string {
    console.log(`Calculating smart status for webinar ${webinar.id}:`, {
      status: webinar.status,
      start_time: webinar.start_time,
      duration: webinar.duration
    });

    // If Zoom provides explicit status, use it with proper mapping
    if (webinar.status) {
      const mappedStatus = this.mapZoomStatus(webinar.status);
      if (mappedStatus !== 'scheduled') {
        console.log(`Using explicit Zoom status: ${webinar.status} -> ${mappedStatus}`);
        return mappedStatus;
      }
    }

    // If no start time, treat as scheduled
    if (!webinar.start_time) {
      console.log('No start time found, defaulting to scheduled');
      return 'scheduled';
    }

    const now = new Date();
    const startTime = new Date(webinar.start_time);
    const duration = webinar.duration || 60; // Default 60 minutes
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));

    console.log(`Time calculation:`, {
      now: now.toISOString(),
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    // Time-based status detection
    if (now < startTime) {
      console.log('Future webinar, marking as scheduled');
      return 'scheduled';
    } else if (now >= startTime && now <= endTime) {
      console.log('Webinar is currently running, marking as started');
      return 'started';
    } else {
      console.log('Past webinar, marking as finished');
      return 'finished';
    }
  }

  /**
   * Map Zoom API status values to our database values
   */
  static mapZoomStatus(zoomStatus: string): string {
    const normalizedStatus = zoomStatus.toLowerCase().trim();
    
    switch (normalizedStatus) {
      case 'available':
      case 'waiting':
      case 'pending':
        return 'scheduled';
      case 'started':
      case 'live':
      case 'in_progress':
        return 'started';
      case 'ended':
      case 'finished':
      case 'completed':
        return 'finished';
      case 'cancelled':
      case 'canceled':
        return 'cancelled';
      default:
        console.log(`Unknown Zoom status '${zoomStatus}', will use timing-based detection`);
        return 'scheduled';
    }
  }

  /**
   * Transform webinar with enhanced status detection
   */
  static transformWebinarForDatabase(webinarData: any, connectionId: string): any {
    const detectedStatus = this.calculateSmartStatus(webinarData);
    
    console.log(`Transformed webinar ${webinarData.id} status: ${webinarData.status} -> ${detectedStatus}`);
    
    return {
      connection_id: connectionId,
      webinar_id: webinarData.id?.toString(),
      webinar_uuid: webinarData.uuid,
      host_id: webinarData.host_id,
      host_email: webinarData.host_email || null,
      topic: webinarData.topic,
      agenda: webinarData.agenda || null,
      type: webinarData.type || 5,
      status: detectedStatus, // Use enhanced status detection
      start_time: webinarData.start_time || null,
      duration: webinarData.duration || null,
      timezone: webinarData.timezone || null,
      registration_required: !!webinarData.registration_url,
      registration_type: webinarData.settings?.registration_type || null,
      registration_url: webinarData.registration_url || null,
      join_url: webinarData.join_url || null,
      approval_type: webinarData.settings?.approval_type || null,
      alternative_hosts: webinarData.settings?.alternative_hosts ? 
        webinarData.settings.alternative_hosts.split(',').map((h: string) => h.trim()) : null,
      max_registrants: webinarData.settings?.registrants_restrict_number || null,
      max_attendees: null,
      occurrence_id: webinarData.occurrences?.[0]?.occurrence_id || null,
      total_registrants: null,
      total_attendees: null,
      total_minutes: null,
      avg_attendance_duration: null,
      synced_at: new Date().toISOString(),
      password: webinarData.password || null,
      h323_password: webinarData.h323_password || null,
      pstn_password: webinarData.pstn_password || null,
      encrypted_password: webinarData.encrypted_password || null,
      settings: webinarData.settings || null,
      tracking_fields: webinarData.tracking_fields || null,
      recurrence: webinarData.recurrence || null,
      occurrences: webinarData.occurrences || null,
      start_url: webinarData.start_url || null,
      encrypted_passcode: webinarData.encrypted_passcode || null,
      creation_source: webinarData.creation_source || null,
      is_simulive: webinarData.is_simulive || false,
      record_file_id: webinarData.record_file_id || null,
      transition_to_live: webinarData.transition_to_live || false,
      webinar_created_at: webinarData.created_at || null,
    };
  }

  /**
   * Upsert webinar with enhanced status detection
   */
  static async upsertWebinar(supabase: any, webinarData: any, connectionId: string): Promise<string> {
    const transformedWebinar = this.transformWebinarForDatabase(webinarData, connectionId);
    
    const { data, error } = await supabase
      .from('zoom_webinars')
      .upsert(
        {
          ...transformedWebinar,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'connection_id,webinar_id',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .single();

    if (error) {
      console.error('Failed to upsert enhanced webinar:', error);
      throw new Error(`Failed to upsert webinar: ${error.message}`);
    }

    console.log(`Enhanced webinar upserted with smart status: ${data.id}`);
    return data.id;
  }

  /**
   * Update webinar metrics after processing
   */
  static async updateWebinarMetrics(supabase: any, webinarDbId: string): Promise<void> {
    // Get registrant count
    const { count: registrantCount } = await supabase
      .from('zoom_registrants')
      .select('*', { count: 'exact', head: true })
      .eq('webinar_id', webinarDbId);

    // Get participant metrics
    const { data: participants } = await supabase
      .from('zoom_participants')
      .select('duration')
      .eq('webinar_id', webinarDbId);

    const totalAttendees = participants?.length || 0;
    const totalMinutes = participants?.reduce((sum, p) => sum + (p.duration || 0), 0) || 0;
    const avgDuration = totalAttendees > 0 ? Math.round(totalMinutes / totalAttendees) : 0;

    // Update webinar with calculated metrics
    const { error } = await supabase
      .from('zoom_webinars')
      .update({
        total_registrants: registrantCount || 0,
        total_attendees: totalAttendees,
        total_minutes: totalMinutes,
        avg_attendance_duration: avgDuration,
        updated_at: new Date().toISOString()
      })
      .eq('id', webinarDbId);

    if (error) {
      console.error('Failed to update webinar metrics:', error);
      throw error;
    }

    console.log(`Updated metrics for webinar ${webinarDbId}: ${registrantCount || 0} registrants, ${totalAttendees} attendees`);
  }
}
