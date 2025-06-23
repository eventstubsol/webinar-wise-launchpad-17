import { supabase } from '@/integrations/supabase/client';

export class CRMSyncOrchestrator {
  private static instance: CRMSyncOrchestrator;
  private syncInProgress = false;

  static getInstance(): CRMSyncOrchestrator {
    if (!CRMSyncOrchestrator.instance) {
      CRMSyncOrchestrator.instance = new CRMSyncOrchestrator();
    }
    return CRMSyncOrchestrator.instance;
  }

  async startSync(connectionId: string, options: any = {}) {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    
    try {
      console.log('Starting CRM sync for connection:', connectionId);
      
      // Get connection details
      const { data: connection, error: connectionError } = await supabase
        .from('zoom_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError || !connection) {
        throw new Error('Connection not found');
      }

      // Get webinars to sync
      const { data: webinars, error: webinarsError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('connection_id', connectionId)
        .order('start_time', { ascending: false })
        .limit(options.maxWebinars || 100);

      if (webinarsError) {
        throw new Error('Failed to fetch webinars');
      }

      // Sync each webinar's participants
      for (const webinar of webinars || []) {
        await this.syncWebinarParticipants(webinar, connection);
      }

      console.log('CRM sync completed successfully');
      
    } catch (error) {
      console.error('CRM sync failed:', error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncWebinarParticipants(webinar: any, connection: any) {
    try {
      // Fetch participants from Zoom API
      const participants = await this.fetchParticipantsFromZoom(webinar.webinar_id, connection);
      
      // Sync each participant
      for (const participant of participants) {
        await this.syncParticipant(participant, connection.id, webinar.id);
      }
      
    } catch (error) {
      console.error('Failed to sync webinar participants:', error);
      throw error;
    }
  }

  private async fetchParticipantsFromZoom(webinarId: string, connection: any) {
    try {
      const response = await fetch(`https://api.zoom.us/v2/webinars/${webinarId}/participants`, {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Zoom API error: ${response.status}`);
      }

      const data = await response.json();
      return data.participants || [];
      
    } catch (error) {
      console.error('Failed to fetch participants from Zoom:', error);
      throw error;
    }
  }

  private async syncParticipant(participant: any, connectionId: string, webinarId: string) {
    try {
      // Insert participant with correct field mapping
      const { error } = await supabase
        .from('zoom_participants')
        .insert({
          webinar_id: webinarId,
          participant_id: participant.participant_id,
          name: participant.participant_name,
          email: participant.participant_email,
          join_time: participant.join_time,
          connection_id: connectionId,
        });

      if (error) {
        console.error('Error syncing participant:', error);
        throw error;
      }
    } catch (error) {
      console.error('Failed to sync participant:', error);
      throw error;
    }
  }

  async updateParticipantEngagement(participantId: string, engagementData: any) {
    try {
      const { error } = await supabase
        .from('zoom_participants')
        .update({
          attentiveness_score: engagementData.attentiveness_score,
          camera_on_duration: engagementData.camera_on_duration,
          asked_question: engagementData.asked_question,
          answered_polling: engagementData.answered_polling,
          updated_at: new Date().toISOString()
        })
        .eq('participant_id', participantId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update participant engagement:', error);
      throw error;
    }
  }

  async syncWithCRM(participantData: any, crmConfig: any) {
    try {
      // Placeholder for CRM integration
      console.log('Syncing with CRM:', participantData);
      
      // This would integrate with various CRM systems
      // based on the crmConfig (HubSpot, Salesforce, etc.)
      
      return { success: true };
    } catch (error) {
      console.error('CRM sync failed:', error);
      throw error;
    }
  }

  async generateSyncReport(connectionId: string) {
    try {
      const { data: syncLogs, error } = await supabase
        .from('zoom_sync_logs')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      return {
        recentSyncs: syncLogs,
        totalSyncs: syncLogs?.length || 0,
        lastSyncAt: syncLogs?.[0]?.created_at || null
      };
    } catch (error) {
      console.error('Failed to generate sync report:', error);
      throw error;
    }
  }

  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }
}
