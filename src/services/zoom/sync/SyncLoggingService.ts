
/**
 * Enhanced logging service for sync debugging
 */
export class SyncLoggingService {
  private static getTimestamp(): string {
    return new Date().toISOString();
  }

  static logSyncStart(syncId: string, connectionId: string, syncType: string) {
    console.group(`🚀 [SYNC-START] ${this.getTimestamp()}`);
    console.log(`Sync ID: ${syncId}`);
    console.log(`Connection ID: ${connectionId}`);
    console.log(`Sync Type: ${syncType}`);
    console.groupEnd();
  }

  static logRenderServiceCall(endpoint: string, syncId?: string) {
    console.log(`📡 [RENDER-CALL] ${this.getTimestamp()} - ${endpoint}${syncId ? ` (Sync: ${syncId})` : ''}`);
  }

  static logRenderServiceResponse(endpoint: string, response: any, syncId?: string) {
    console.group(`📥 [RENDER-RESPONSE] ${this.getTimestamp()} - ${endpoint}`);
    if (syncId) console.log(`Sync ID: ${syncId}`);
    console.log('Response:', response);
    console.groupEnd();
  }

  static logDatabaseUpdate(table: string, operation: string, data: any, syncId?: string) {
    console.group(`💾 [DB-UPDATE] ${this.getTimestamp()} - ${table}.${operation}`);
    if (syncId) console.log(`Sync ID: ${syncId}`);
    console.log('Data:', data);
    console.groupEnd();
  }

  static logProgressUpdate(syncId: string, progress: number, operation: string, source: 'render' | 'database') {
    console.log(`📊 [PROGRESS] ${this.getTimestamp()} - Sync ${syncId}: ${progress}% (${operation}) [${source.toUpperCase()}]`);
  }

  static logSyncStuck(syncId: string, reason: string, minutesRunning: number) {
    console.group(`⚠️ [SYNC-STUCK] ${this.getTimestamp()}`);
    console.log(`Sync ID: ${syncId}`);
    console.log(`Reason: ${reason}`);
    console.log(`Minutes Running: ${minutesRunning}`);
    console.groupEnd();
  }

  static logSyncCommunicationFailure(syncId: string, error: any, attempt: number) {
    console.group(`💥 [COMM-FAILURE] ${this.getTimestamp()}`);
    console.log(`Sync ID: ${syncId}`);
    console.log(`Attempt: ${attempt}`);
    console.log('Error:', error);
    console.groupEnd();
  }

  static logSyncRecovery(syncId: string, action: string, result: any) {
    console.group(`🔧 [SYNC-RECOVERY] ${this.getTimestamp()}`);
    console.log(`Sync ID: ${syncId}`);
    console.log(`Action: ${action}`);
    console.log('Result:', result);
    console.groupEnd();
  }

  static logUserAction(action: string, syncId?: string, context?: any) {
    console.group(`👤 [USER-ACTION] ${this.getTimestamp()} - ${action}`);
    if (syncId) console.log(`Sync ID: ${syncId}`);
    if (context) console.log('Context:', context);
    console.groupEnd();
  }
}
