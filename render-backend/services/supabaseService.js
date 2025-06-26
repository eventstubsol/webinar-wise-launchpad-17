
const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  async getUserCredentials(userId) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_credentials')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching Zoom credentials:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch Zoom credentials:', error);
      return null;
    }
  }

  async getZoomConnection(connectionId) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (error) {
        console.error('Error fetching Zoom connection:', error);
        throw new Error(`Failed to fetch Zoom connection: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to get Zoom connection:', error);
      throw error;
    }
  }

  async getSyncLog(syncId) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('id', syncId)
        .single();

      if (error) {
        console.error('Error fetching sync log:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch sync log:', error);
      return null;
    }
  }

  async createSyncLog(syncLogData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_sync_logs')
        .insert([syncLogData]);

      if (error) {
        console.error('Error creating sync log:', error);
        throw new Error(`Failed to create sync log: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to create sync log:', error);
      throw error;
    }
  }

  async updateSyncLog(syncId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_sync_logs')
        .update(updateData)
        .eq('id', syncId);

      if (error) {
        console.error('Error updating sync log:', error);
        throw new Error(`Failed to update sync log: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to update sync log:', error);
      throw error;
    }
  }

  async storeWebinar(webinarData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_webinars')
        .upsert([webinarData], { onConflict: 'connection_id, webinar_id' })
        .select('id');

      if (error) {
        console.error('Error storing webinar:', error);
        throw new Error(`Failed to store webinar: ${error.message}`);
      }

      return data && data.length > 0 ? data[0].id : null;
    } catch (error) {
      console.error('Failed to store webinar:', error);
      throw error;
    }
  }

  async storeParticipants(participantData) {
    try {
      console.log(`📥 Starting to store ${participantData.length} participants in database`);
      
      // CRITICAL: Pre-validation before database insertion
      const validatedParticipants = participantData.map((participant, index) => {
        // CRITICAL: Ensure required 'name' field is present and valid (NOT NULL constraint)
        if (!participant.name || typeof participant.name !== 'string' || participant.name.trim() === '') {
          const fallbackName = participant.participant_name || 
                              participant.participant_email || 
                              participant.email || 
                              `Emergency Fallback ${index + 1}`;
          
          console.error(`❌ CRITICAL: Participant ${index} missing/invalid 'name' field. Original: "${participant.name}", using fallback: "${fallbackName}"`);
          participant.name = fallbackName;
        }
        
        // Ensure name is trimmed and valid
        participant.name = participant.name.trim();
        
        // Enhanced session tracking - generate participant_session_id if not present
        if (!participant.participant_session_id && participant.participant_email && participant.join_time) {
          participant.participant_session_id = `${participant.participant_email}_${new Date(participant.join_time).getTime() / 1000}`;
        }
        
        // Log participant data for debugging
        console.log(`🔍 Validating participant ${index + 1}: name="${participant.name}", id="${participant.participant_id}", session_id="${participant.participant_session_id}"`);
        
        // Return validated participant with timestamps and session defaults
        return {
          ...participant,
          session_sequence: participant.session_sequence || 1,
          is_rejoin_session: participant.is_rejoin_session || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      });

      // Final safety check - ensure NO participants have null/empty names
      const invalidParticipants = validatedParticipants.filter(p => !p.name || p.name.trim() === '');
      if (invalidParticipants.length > 0) {
        console.error('❌ CRITICAL: Found participants with invalid names after validation:', invalidParticipants);
        throw new Error(`Data validation failed: ${invalidParticipants.length} participants have invalid names after validation`);
      }

      console.log(`✅ All ${validatedParticipants.length} participants passed validation with session tracking`);

      // Attempt database insertion with enhanced error handling and session tracking
      const { data, error } = await this.supabase
        .from('zoom_participants')
        .upsert(validatedParticipants, { 
          onConflict: 'webinar_id,participant_email,join_time',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('❌ Database insertion error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        console.error('❌ Sample participant data causing error:');
        console.error(JSON.stringify(validatedParticipants.slice(0, 2), null, 2));
        
        // Enhanced error message for debugging session tracking
        if (error.message.includes('unique constraint')) {
          console.error('❌ Unique constraint violation - this suggests duplicate participant sessions');
          const problematicFields = validatedParticipants.map((p, i) => ({
            index: i,
            name: p.name,
            email: p.participant_email,
            join_time: p.join_time,
            session_id: p.participant_session_id
          }));
          console.error('❌ Participant session analysis:', problematicFields);
        }
        
        throw new Error(`Failed to store participants: ${error.message}`);
      }

      console.log(`✅ Successfully stored ${participantData.length} participants with session tracking in database`);
      return data;
    } catch (error) {
      console.error('❌ Failed to store participants - Full error details:', error);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  async storeRegistrants(registrantData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_registrants')
        .upsert(registrantData, { onConflict: 'webinar_id, registrant_id' });

      if (error) {
        console.error('Error storing registrants:', error);
        throw new Error(`Failed to store registrants: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to store registrants:', error);
      throw error;
    }
  }

  async getWebinarByZoomId(webinarId, connectionId) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_webinars')
        .select('id')
        .eq('webinar_id', webinarId)
        .eq('connection_id', connectionId)
        .single();

      if (error) {
        console.error('Error fetching webinar by Zoom ID:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get webinar by Zoom ID:', error);
      return null;
    }
  }

  async updateZoomConnection(connectionId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_connections')
        .update(updateData)
        .eq('id', connectionId);

      if (error) {
        console.error('Error updating Zoom connection:', error);
        throw new Error(`Failed to update Zoom connection: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to update Zoom connection:', error);
      throw error;
    }
  }

  async getRegistrantCount(webinarId) {
    try {
      const { count, error } = await this.supabase
        .from('zoom_registrants')
        .select('*', { count: 'exact' })
        .eq('webinar_id', webinarId);

      if (error) {
        console.error('Error fetching registrant count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Failed to get registrant count:', error);
      return 0;
    }
  }

  async getParticipantMetrics(webinarId) {
    try {
      // Enhanced query to include session analysis
      const { data: participants, error } = await this.supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', webinarId);

      if (error) {
        console.error('Error fetching participants for metrics:', error);
        return {
          totalAttendees: 0,
          uniqueAttendees: 0,
          rejoinSessions: 0,
          totalMinutes: 0,
          avgDuration: 0,
          avgAttentiveness: 0,
          avgCameraUsage: 0,
          totalInteractions: 0
        };
      }

      const participantsList = participants || [];
      
      // Calculate enhanced metrics with session analysis
      const uniqueEmails = new Set(participantsList.map(p => p.participant_email).filter(Boolean));
      const rejoinSessions = participantsList.filter(p => p.is_rejoin_session).length;
      const totalMinutes = participantsList.reduce((sum, p) => sum + (p.duration || 0), 0);
      const avgDuration = participantsList.length > 0 ? totalMinutes / participantsList.length : 0;
      
      const totalAttentiveness = participantsList.reduce((sum, p) => sum + (p.attentiveness_score || 0), 0);
      const avgAttentiveness = participantsList.length > 0 ? totalAttentiveness / participantsList.length : 0;
      
      const totalCameraUsage = participantsList.reduce((sum, p) => sum + (p.camera_on_duration || 0), 0);
      const avgCameraUsage = participantsList.length > 0 ? totalCameraUsage / participantsList.length : 0;
      
      const totalInteractions = participantsList.reduce((sum, p) => 
        sum + (p.posted_chat ? 1 : 0) + (p.answered_polling ? 1 : 0) + (p.asked_question ? 1 : 0), 0
      );

      return {
        totalAttendees: participantsList.length,
        uniqueAttendees: uniqueEmails.size,
        rejoinSessions: rejoinSessions,
        totalMinutes: Math.round(totalMinutes / 60), // Convert to minutes
        avgDuration: Math.round(avgDuration / 60), // Convert to minutes
        avgAttentiveness: Math.round(avgAttentiveness * 100) / 100,
        avgCameraUsage: Math.round(avgCameraUsage / 60), // Convert to minutes
        totalInteractions: totalInteractions
      };
    } catch (error) {
      console.error('Failed to get participant metrics:', error);
      return {
        totalAttendees: 0,
        uniqueAttendees: 0,
        rejoinSessions: 0,
        totalMinutes: 0,
        avgDuration: 0,
        avgAttentiveness: 0,
        avgCameraUsage: 0,
        totalInteractions: 0
      };
    }
  }

  async updateWebinarMetrics(webinarId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_webinars')
        .update(updateData)
        .eq('id', webinarId);

      if (error) {
        console.error('Error updating webinar metrics:', error);
        throw new Error(`Failed to update webinar metrics: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to update webinar metrics:', error);
      throw error;
    }
  }

  async updateRegistrantAttendance(webinarId, attendanceData) {
    try {
      // Prepare the updates in a single query
      const updates = attendanceData.map(item => ({
        registrant_id: item.registrant_id,
        attended: item.attended,
        join_time: item.join_time,
        leave_time: item.leave_time,
        duration: item.duration
      }));

      // Execute the batch update
      const { data, error } = await this.supabase
        .from('zoom_registrants')
        .upsert(
          updates.map(update => ({
            webinar_id: webinarId,
            registrant_id: update.registrant_id,
            attended: update.attended,
            join_time: update.join_time,
            leave_time: update.leave_time,
            duration: update.duration
          })),
          { onConflict: 'webinar_id, registrant_id' }
        );

      if (error) {
        console.error('Error updating registrant attendance:', error);
        throw new Error(`Failed to update registrant attendance: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Failed to update registrant attendance:', error);
      throw error;
    }
  }

  async updateWebinarStatus(webinarId, connectionId) {
    try {
      console.log(`🔄 Updating status for webinar DB ID: ${webinarId}`);
      
      const { data, error } = await this.supabase
        .rpc('batch_update_webinar_statuses');
      
      if (error) {
        console.error('Error updating webinar statuses:', error);
        throw error;
      }
      
      console.log(`✅ Batch status update completed:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Failed to update webinar status:`, error);
      throw error;
    }
  }

  async getWebinarsWithCalculatedStatus(connectionId, limit = 50) {
    try {
      const { data, error } = await this.supabase
        .from('zoom_webinars_with_calculated_status')
        .select('*')
        .eq('connection_id', connectionId)
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching webinars with calculated status:', error);
        throw error;
      }

      console.log(`📊 Fetched ${data?.length || 0} webinars with calculated status`);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch webinars with calculated status:', error);
      throw error;
    }
  }

  // Enhanced method: Get webinars that need participant data sync with better status calculation
  async getWebinarsNeedingParticipantSync(connectionId, limit = 10) {
    try {
      console.log(`🔍 Finding webinars needing participant sync for connection: ${connectionId}`);
      
      const { data, error } = await this.supabase
        .from('zoom_webinars_with_calculated_status')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('calculated_status', 'ended')
        .in('participant_sync_status', ['pending', 'not_applicable', 'failed'])
        .order('start_time', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching webinars needing participant sync:', error);
        throw error;
      }

      console.log(`🎯 Found ${data?.length || 0} webinars needing participant sync`);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch webinars needing participant sync:', error);
      throw error;
    }
  }

  // NEW: Reset participant sync status for data recovery
  async resetParticipantSyncForRecovery(connectionId) {
    try {
      console.log(`🔄 Resetting participant sync status for data recovery, connection: ${connectionId}`);
      
      // Reset all ended webinars back to pending for participant sync
      const { data, error } = await this.supabase
        .from('zoom_webinars_with_calculated_status')
        .select('id, webinar_id, topic, calculated_status, participant_sync_status')
        .eq('connection_id', connectionId)
        .eq('calculated_status', 'ended');

      if (error) {
        console.error('❌ Error fetching webinars for reset:', error);
        throw error;
      }

      console.log(`📊 Found ${data?.length || 0} ended webinars for participant sync reset`);
      
      const webinarsToReset = data?.filter(w => 
        w.participant_sync_status !== 'synced' && 
        w.participant_sync_status !== 'pending'
      ) || [];

      if (webinarsToReset.length === 0) {
        console.log(`ℹ️ No webinars need participant sync reset`);
        return { resetCount: 0, totalEnded: data?.length || 0 };
      }

      // Reset participant sync status
      const { error: updateError } = await this.supabase
        .from('zoom_webinars')
        .update({
          participant_sync_status: 'pending',
          participant_sync_attempted_at: null,
          participant_sync_completed_at: null,
          participant_sync_error: null,
          updated_at: new Date().toISOString()
        })
        .in('id', webinarsToReset.map(w => w.id));

      if (updateError) {
        console.error('❌ Error resetting participant sync status:', updateError);
        throw updateError;
      }

      console.log(`✅ Reset participant sync status for ${webinarsToReset.length} webinars`);
      return { 
        resetCount: webinarsToReset.length, 
        totalEnded: data?.length || 0,
        resetWebinars: webinarsToReset.map(w => ({ id: w.id, topic: w.topic }))
      };
    } catch (error) {
      console.error('❌ Failed to reset participant sync for recovery:', error);
      throw error;
    }
  }

  async updateParticipantSyncStatus(webinarDbId, status, error = null) {
    try {
      console.log(`🔄 Updating participant sync status for webinar ${webinarDbId}: ${status}`);
      
      const updateData = {
        participant_sync_status: status,
        participant_sync_attempted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (status === 'synced') {
        updateData.participant_sync_completed_at = new Date().toISOString();
        updateData.participant_sync_error = null;
        console.log(`✅ Marking participant sync as completed for webinar: ${webinarDbId}`);
      } else if (status === 'failed' && error) {
        updateData.participant_sync_error = error;
        console.log(`❌ Marking participant sync as failed for webinar: ${webinarDbId}, error: ${error}`);
      } else if (status === 'pending') {
        updateData.participant_sync_completed_at = null;
        updateData.participant_sync_error = null;
        console.log(`🔄 Resetting participant sync status to pending for webinar: ${webinarDbId}`);
      }

      const { data, dbError } = await this.supabase
        .from('zoom_webinars')
        .update(updateData)
        .eq('id', webinarDbId);

      if (dbError) {
        console.error('❌ Error updating participant sync status:', dbError);
        throw dbError;
      }

      console.log(`✅ Updated participant sync status to: ${status} for webinar: ${webinarDbId}`);
      return data;
    } catch (error) {
      console.error('❌ Failed to update participant sync status:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService();
