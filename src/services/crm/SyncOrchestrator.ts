
import { supabase } from '@/integrations/supabase/client';
import { CRMConnectionManager } from './CRMConnectionManager';
import { CRMConnection, CRMFieldMapping, CRMSyncLog, CRMSyncResult, CRMContact } from '@/types/crm';

export interface SyncOptions {
  direction?: 'incoming' | 'outgoing' | 'bidirectional';
  batchSize?: number;
  dryRun?: boolean;
  conflictResolution?: 'last_write_wins' | 'manual_review' | 'crm_wins' | 'webinar_wins';
}

export class SyncOrchestrator {
  static async syncConnection(connectionId: string, options: SyncOptions = {}): Promise<CRMSyncResult> {
    const connection = await CRMConnectionManager.getConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const adapter = CRMConnectionManager.createAdapter(connection);
    const fieldMappings = await CRMConnectionManager.getFieldMappings(connectionId);

    // Create sync log entry
    const syncLog = await this.createSyncLog({
      connection_id: connectionId,
      sync_type: 'full_sync',
      operation_type: 'update',
      direction: options.direction || connection.sync_direction,
      status: 'pending',
      records_processed: 0,
      records_success: 0,
      records_failed: 0,
      records_conflicts: 0,
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    try {
      let result: CRMSyncResult;

      switch (options.direction || connection.sync_direction) {
        case 'outgoing':
          result = await this.syncTowardsCRM(connection, adapter, fieldMappings, options);
          break;
        case 'incoming':
          result = await this.syncFromCRM(connection, adapter, fieldMappings, options);
          break;
        case 'bidirectional':
          const outgoingResult = await this.syncTowardsCRM(connection, adapter, fieldMappings, options);
          const incomingResult = await this.syncFromCRM(connection, adapter, fieldMappings, options);
          result = this.mergeResults([outgoingResult, incomingResult]);
          break;
        default:
          throw new Error(`Invalid sync direction: ${options.direction}`);
      }

      // Update sync log with results
      await this.updateSyncLog(syncLog.id, {
        status: result.success ? 'success' : 'failed',
        records_processed: result.recordsProcessed,
        records_success: result.recordsSuccess,
        records_failed: result.recordsFailed,
        records_conflicts: result.recordsConflicts,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(syncLog.started_at).getTime()
      });

      return result;
    } catch (error) {
      // Update sync log with error
      await this.updateSyncLog(syncLog.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - new Date(syncLog.started_at).getTime()
      });

      throw error;
    }
  }

  private static async syncTowardsCRM(
    connection: CRMConnection,
    adapter: any,
    fieldMappings: CRMFieldMapping[],
    options: SyncOptions
  ): Promise<CRMSyncResult> {
    // Get webinar participants to sync to CRM
    const { data: participants, error } = await supabase
      .from('zoom_participants')
      .select(`
        *,
        zoom_webinars!inner(user_id)
      `)
      .eq('zoom_webinars.user_id', connection.user_id)
      .limit(options.batchSize || 1000);

    if (error) {
      throw new Error(`Failed to fetch participants: ${error.message}`);
    }

    const contactsToSync = participants?.map(participant => this.mapParticipantToContact(participant, fieldMappings)) || [];

    if (options.dryRun) {
      return {
        success: true,
        recordsProcessed: contactsToSync.length,
        recordsSuccess: contactsToSync.length,
        recordsFailed: 0,
        recordsConflicts: 0,
        errors: [],
        conflicts: []
      };
    }

    return await adapter.syncContacts(contactsToSync);
  }

  private static async syncFromCRM(
    connection: CRMConnection,
    adapter: any,
    fieldMappings: CRMFieldMapping[],
    options: SyncOptions
  ): Promise<CRMSyncResult> {
    const result: CRMSyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsSuccess: 0,
      recordsFailed: 0,
      recordsConflicts: 0,
      errors: [],
      conflicts: []
    };

    let hasMore = true;
    let offset: string | undefined;

    while (hasMore) {
      try {
        const { contacts, nextOffset } = await adapter.getContacts(options.batchSize || 100, offset);
        
        for (const contact of contacts) {
          try {
            if (options.dryRun) {
              result.recordsSuccess++;
            } else {
              await this.importContactToWebinar(contact, connection, fieldMappings);
              result.recordsSuccess++;
            }
          } catch (error) {
            result.recordsFailed++;
            result.errors.push(`Failed to import contact ${contact.email}: ${error}`);
          }
        }

        result.recordsProcessed += contacts.length;
        offset = nextOffset;
        hasMore = !!nextOffset;
      } catch (error) {
        result.errors.push(`Failed to fetch contacts: ${error}`);
        hasMore = false;
        result.success = false;
      }
    }

    return result;
  }

  private static mapParticipantToContact(participant: any, fieldMappings: CRMFieldMapping[]): Partial<CRMContact> {
    const contact: Partial<CRMContact> = {};

    for (const mapping of fieldMappings) {
      if (mapping.sync_direction === 'incoming') continue;

      const webinarValue = this.getNestedValue(participant, mapping.webinar_field);
      if (webinarValue !== undefined) {
        contact[mapping.crm_field as keyof CRMContact] = this.transformValue(webinarValue, mapping.transformation_rules);
      } else if (mapping.default_value) {
        contact[mapping.crm_field as keyof CRMContact] = mapping.default_value;
      }
    }

    return contact;
  }

  private static async importContactToWebinar(
    contact: CRMContact,
    connection: CRMConnection,
    fieldMappings: CRMFieldMapping[]
  ): Promise<void> {
    // Check if participant already exists
    const { data: existingParticipant } = await supabase
      .from('zoom_participants')
      .select('*')
      .eq('email', contact.email)
      .single();

    const participantData: any = {};

    for (const mapping of fieldMappings) {
      if (mapping.sync_direction === 'outgoing') continue;

      const crmValue = contact[mapping.crm_field as keyof CRMContact];
      if (crmValue !== undefined) {
        this.setNestedValue(participantData, mapping.webinar_field, this.transformValue(crmValue, mapping.transformation_rules));
      }
    }

    if (existingParticipant) {
      // Update existing participant
      const { error } = await supabase
        .from('zoom_participants')
        .update(participantData)
        .eq('id', existingParticipant.id);

      if (error) {
        throw new Error(`Failed to update participant: ${error.message}`);
      }
    } else {
      // Create new participant
      const { error } = await supabase
        .from('zoom_participants')
        .insert({
          ...participantData,
          email: contact.email,
          participant_uuid: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });

      if (error) {
        throw new Error(`Failed to create participant: ${error.message}`);
      }
    }
  }

  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private static transformValue(value: any, rules: Record<string, any>): any {
    if (!rules || Object.keys(rules).length === 0) {
      return value;
    }

    // Apply transformation rules
    if (rules.uppercase && typeof value === 'string') {
      value = value.toUpperCase();
    }
    if (rules.lowercase && typeof value === 'string') {
      value = value.toLowerCase();
    }
    if (rules.trim && typeof value === 'string') {
      value = value.trim();
    }
    if (rules.prefix && typeof value === 'string') {
      value = rules.prefix + value;
    }
    if (rules.suffix && typeof value === 'string') {
      value = value + rules.suffix;
    }

    return value;
  }

  private static mergeResults(results: CRMSyncResult[]): CRMSyncResult {
    return results.reduce((merged, result) => ({
      success: merged.success && result.success,
      recordsProcessed: merged.recordsProcessed + result.recordsProcessed,
      recordsSuccess: merged.recordsSuccess + result.recordsSuccess,
      recordsFailed: merged.recordsFailed + result.recordsFailed,
      recordsConflicts: merged.recordsConflicts + result.recordsConflicts,
      errors: [...merged.errors, ...result.errors],
      conflicts: [...merged.conflicts, ...result.conflicts]
    }), {
      success: true,
      recordsProcessed: 0,
      recordsSuccess: 0,
      recordsFailed: 0,
      recordsConflicts: 0,
      errors: [],
      conflicts: []
    });
  }

  private static async createSyncLog(log: Omit<CRMSyncLog, 'id'>): Promise<CRMSyncLog> {
    const { data, error } = await supabase
      .from('crm_sync_logs')
      .insert(log)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sync log: ${error.message}`);
    }

    return data;
  }

  private static async updateSyncLog(logId: string, updates: Partial<CRMSyncLog>): Promise<void> {
    const { error } = await supabase
      .from('crm_sync_logs')
      .update(updates)
      .eq('id', logId);

    if (error) {
      throw new Error(`Failed to update sync log: ${error.message}`);
    }
  }
}
