
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ValidationResult {
  user: any;
  connection: any;
  requestBody: any;
}

export async function validateRequestEnhanced(req: Request, supabase: any): Promise<ValidationResult> {
  console.log('=== Enhanced Validation Start ===');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Parse request body
  const requestBody = await req.json();
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  // Validate request body
  if (!requestBody.connectionId || !requestBody.syncType) {
    throw Object.assign(new Error('Missing required fields: connectionId and syncType'), { status: 400 });
  }
  
  // Get and validate auth token
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Invalid authorization header'), { status: 401, isAuthError: true });
  }
  
  const token = authHeader.substring(7);
  
  // Verify user with Supabase
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !user) {
    console.error('User authentication failed:', userError);
    throw Object.assign(new Error('Invalid authentication token'), { status: 401, isAuthError: true });
  }
  
  console.log(`User authenticated: ${user.id}`);
  
  // Get connection details
  const { data: connection, error: connectionError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', requestBody.connectionId)
    .eq('user_id', user.id)
    .single();
  
  if (connectionError || !connection) {
    console.error('Connection not found:', connectionError);
    throw Object.assign(new Error('Connection not found or access denied'), { status: 404 });
  }
  
  console.log(`Connection validated: ${connection.id}, status: ${connection.connection_status}`);
  
  // Validate connection status
  if (connection.connection_status !== 'active') {
    throw Object.assign(new Error('Connection is not active. Please reconnect your Zoom account.'), { status: 400 });
  }
  
  // Enhanced cleanup logic with better debugging
  console.log('=== Starting Enhanced Cleanup ===');
  const now = new Date();
  const cleanupThreshold = new Date(now.getTime() - (10 * 60 * 1000)); // 10 minutes ago
  
  console.log(`Current time: ${now.toISOString()}`);
  console.log(`Cleanup threshold: ${cleanupThreshold.toISOString()}`);
  
  // First, get all active syncs to debug
  const { data: activeSyncsDebug, error: debugError } = await supabase
    .from('zoom_sync_logs')
    .select('*')
    .eq('connection_id', requestBody.connectionId)
    .in('sync_status', ['started', 'in_progress']);
  
  if (debugError) {
    console.error('Error fetching active syncs for debug:', debugError);
  } else {
    console.log('All active syncs for debugging:', JSON.stringify(activeSyncsDebug, null, 2));
  }
  
  // Enhanced cleanup with better error handling
  const { data: cleanedSyncs, error: cleanupError } = await supabase
    .from('zoom_sync_logs')
    .update({
      sync_status: 'failed',
      error_message: 'Sync timed out - cleaned up by enhanced validation',
      completed_at: now.toISOString(),
      updated_at: now.toISOString()
    })
    .eq('connection_id', requestBody.connectionId)
    .in('sync_status', ['started', 'in_progress'])
    .lt('created_at', cleanupThreshold.toISOString())
    .select();

  if (cleanupError) {
    console.error('Enhanced cleanup error:', cleanupError);
    // Don't throw here, just log and continue
  } else {
    console.log(`Enhanced cleanup completed. Cleaned ${cleanedSyncs?.length || 0} stuck syncs:`, cleanedSyncs);
  }
  
  // Now check for any remaining active syncs
  const { data: remainingActiveSyncs, error: activeCheckError } = await supabase
    .from('zoom_sync_logs')
    .select('id, sync_status, created_at, sync_type')
    .eq('connection_id', requestBody.connectionId)
    .in('sync_status', ['started', 'in_progress'])
    .order('created_at', { ascending: false });
  
  if (activeCheckError) {
    console.error('Error checking remaining active syncs:', activeCheckError);
    throw Object.assign(new Error('Failed to validate sync status'), { status: 500 });
  }
  
  if (remainingActiveSyncs && remainingActiveSyncs.length > 0) {
    const activeSync = remainingActiveSyncs[0];
    const syncAge = new Date().getTime() - new Date(activeSync.created_at).getTime();
    const syncAgeMinutes = Math.round(syncAge / (1000 * 60));
    
    console.log(`Active sync found: ${activeSync.id}, age: ${syncAgeMinutes} minutes`);
    
    // If sync is very old (>30 minutes), force cleanup
    if (syncAgeMinutes > 30) {
      console.log('Forcing cleanup of very old sync...');
      const { error: forceCleanupError } = await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'failed',
          error_message: `Force cleaned - sync was ${syncAgeMinutes} minutes old`,
          completed_at: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', activeSync.id);
      
      if (forceCleanupError) {
        console.error('Force cleanup failed:', forceCleanupError);
        throw Object.assign(new Error('Failed to force cleanup old sync'), { status: 500 });
      }
      
      console.log('Force cleanup completed, allowing new sync');
    } else {
      throw Object.assign(new Error(`Sync already in progress (${syncAgeMinutes} minutes old)`), { 
        status: 409,
        body: { activeSyncId: activeSync.id, syncAge: syncAgeMinutes }
      });
    }
  }
  
  console.log('=== Enhanced Validation Complete ===');
  
  return {
    user,
    connection,
    requestBody
  };
}
