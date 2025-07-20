
/**
 * Enhanced sync processor - main entry point
 * Coordinates the enhanced sync workflow with comprehensive verification
 */
import { SyncOperation } from './types.ts';
import { orchestrateEnhancedWebinarSync } from './processors/enhanced-sync-orchestrator.ts';

/**
 * Enhanced sync processor with comprehensive error handling, field validation,
 * and robust verification logic
 */
export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: SyncOperation,
  connection: any,
  syncLogId: string
): Promise<void> {
  return await orchestrateEnhancedWebinarSync(supabase, syncOperation, connection, syncLogId);
}
