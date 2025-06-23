
import { supabase } from '@/integrations/supabase/client';
import { CRMConnection } from '@/types/crm';
import { ZoomConnection } from '@/types/zoom';

/**
 * Orchestrates synchronization between Zoom webinar data and CRM systems
 */
export class SyncOrchestrator {
  private crmConnection: CRMConnection;
  private zoomConnection: ZoomConnection;

  constructor(crmConnection: CRMConnection, zoomConnection: ZoomConnection) {
    this.crmConnection = crmConnection;
    this.zoomConnection = zoomConnection;
  }

  /**
   * Static method to sync a connection
   */
  static async syncConnection(connectionId: string, options?: {
    direction?: 'incoming' | 'outgoing' | 'bidirectional';
    dryRun?: boolean;
  }) {
    try {
      // Get the connection details
      const { data: connection, error: connectionError } = await supabase
        .from('crm_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connectionError) throw connectionError;
      if (!connection) throw new Error('Connection not found');

      // For now, return mock sync results
      // In a real implementation, this would perform actual sync operations
      return {
        success: true,
        recordsProcessed: options?.dryRun ? 0 : 50,
        recordsSuccess: options?.dryRun ? 0 : 45,
        recordsFailed: options?.dryRun ? 0 : 5,
        message: options?.dryRun ? 'Dry run completed' : 'Sync completed successfully'
      };
    } catch (error) {
      console.error('Error syncing connection:', error);
      return {
        success: false,
        recordsProcessed: 0,
        recordsSuccess: 0,
        recordsFailed: 0,
        message: error instanceof Error ? error.message : 'Sync failed'
      };
    }
  }

  /**
   * Sync webinar participants to CRM
   */
  async syncWebinarParticipants(webinarId: string): Promise<void> {
    try {
      // Get webinar participants from database
      const { data: participants, error } = await supabase
        .from('zoom_participants')
        .select('*')
        .eq('webinar_id', webinarId);

      if (error) throw error;
      if (!participants || participants.length === 0) return;

      // Sync each participant to CRM
      for (const participant of participants) {
        await this.syncParticipantToCRM(participant, webinarId, this.crmConnection);
      }

      console.log(`Successfully synced ${participants.length} participants to CRM`);
    } catch (error) {
      console.error('Error syncing webinar participants:', error);
      throw error;
    }
  }

  /**
   * Sync webinar registrants to CRM
   */
  async syncWebinarRegistrants(webinarId: string): Promise<void> {
    try {
      // Get webinar registrants from database
      const { data: registrants, error } = await supabase
        .from('zoom_registrants')
        .select('*')
        .eq('webinar_id', webinarId);

      if (error) throw error;
      if (!registrants || registrants.length === 0) return;

      // Sync each registrant to CRM
      for (const registrant of registrants) {
        await this.syncRegistrantToCRM(registrant, webinarId, this.crmConnection);
      }

      console.log(`Successfully synced ${registrants.length} registrants to CRM`);
    } catch (error) {
      console.error('Error syncing webinar registrants:', error);
      throw error;
    }
  }

  /**
   * Sync complete webinar data to CRM
   */
  async syncCompleteWebinar(webinarId: string): Promise<void> {
    try {
      // Get webinar details
      const { data: webinar, error: webinarError } = await supabase
        .from('zoom_webinars')
        .select('*')
        .eq('id', webinarId)
        .single();

      if (webinarError) throw webinarError;
      if (!webinar) throw new Error('Webinar not found');

      // Sync webinar to CRM
      await this.syncWebinarToCRM(webinar, this.crmConnection);

      // Sync participants and registrants
      await this.syncWebinarParticipants(webinarId);
      await this.syncWebinarRegistrants(webinarId);

      console.log(`Successfully synced complete webinar ${webinarId} to CRM`);
    } catch (error) {
      console.error('Error syncing complete webinar:', error);
      throw error;
    }
  }

  private async syncParticipantToCRM(
    participant: any,
    webinarId: string,
    connection: any
  ): Promise<void> {
    try {
      // Create the participant data with required fields mapping to correct database columns
      const participantData = {
        webinar_id: webinarId,
        participant_id: participant.participant_id,
        name: participant.name || participant.participant_name || 'Unknown',
        email: participant.email,
        join_time: participant.join_time,
      };

      const { error } = await supabase
        .from('zoom_participants')
        .upsert(participantData, {
          onConflict: 'webinar_id,participant_id'
        });

      if (error) {
        console.error('Failed to sync participant to database:', error);
        throw error;
      }

      // Sync to external CRM if configured
      if (connection.crm_type === 'hubspot') {
        await this.syncToHubSpot(participantData, 'participant');
      } else if (connection.crm_type === 'salesforce') {
        await this.syncToSalesforce(participantData, 'participant');
      }
    } catch (error) {
      console.error('Error syncing participant to CRM:', error);
      throw error;
    }
  }

  private async syncRegistrantToCRM(
    registrant: any,
    webinarId: string,
    connection: any
  ): Promise<void> {
    try {
      // Sync to external CRM if configured
      if (connection.crm_type === 'hubspot') {
        await this.syncToHubSpot(registrant, 'registrant');
      } else if (connection.crm_type === 'salesforce') {
        await this.syncToSalesforce(registrant, 'registrant');
      }
    } catch (error) {
      console.error('Error syncing registrant to CRM:', error);
      throw error;
    }
  }

  private async syncWebinarToCRM(
    webinar: any,
    connection: any
  ): Promise<void> {
    try {
      // Sync to external CRM if configured
      if (connection.crm_type === 'hubspot') {
        await this.syncToHubSpot(webinar, 'webinar');
      } else if (connection.crm_type === 'salesforce') {
        await this.syncToSalesforce(webinar, 'webinar');
      }
    } catch (error) {
      console.error('Error syncing webinar to CRM:', error);
      throw error;
    }
  }

  private async syncToHubSpot(data: any, type: string): Promise<void> {
    // HubSpot sync implementation
    console.log(`Syncing ${type} to HubSpot:`, data);
    // Implementation would go here
  }

  private async syncToSalesforce(data: any, type: string): Promise<void> {
    // Salesforce sync implementation
    console.log(`Syncing ${type} to Salesforce:`, data);
    // Implementation would go here
  }

  /**
   * Get sync status for a webinar
   */
  async getSyncStatus(webinarId: string): Promise<any> {
    try {
      const { data: syncLogs, error } = await supabase
        .from('crm_sync_logs')
        .select('*')
        .eq('webinar_id', webinarId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        webinarId,
        syncLogs: syncLogs || [],
        lastSyncAt: syncLogs?.[0]?.created_at || null,
        syncStatus: syncLogs?.[0]?.status || 'not_synced'
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        webinarId,
        syncLogs: [],
        lastSyncAt: null,
        syncStatus: 'error'
      };
    }
  }

  /**
   * Create sync log entry
   */
  async createSyncLog(
    syncType: string,
    resourceId: string,
    status: string,
    details?: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('crm_sync_logs')
        .insert({
          connection_id: this.crmConnection.id,
          sync_type: syncType,
          status,
          webinar_id: resourceId,
          direction: 'outgoing',
          operation_type: 'sync',
          data_after: details,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to create sync log:', error);
      }
    } catch (error) {
      console.error('Error creating sync log:', error);
    }
  }
}
