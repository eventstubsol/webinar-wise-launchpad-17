
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ValidationResult {
  user: any;
  connection: any;
  requestBody: any;
}

export async function validateRequest(req: Request, supabase: any): Promise<ValidationResult> {
  console.log('Starting request validation...');
  
  // Parse request body
  const requestBody = await req.json();
  console.log('Request body parsed successfully:', requestBody);
  
  // Validate request body
  if (!requestBody.connectionId || !requestBody.syncType) {
    throw Object.assign(new Error('Missing required fields: connectionId and syncType'), { status: 400 });
  }
  
  // Get and validate auth token
  const authHeader = req.headers.get('authorization');
  console.log('Auth header present:', !!authHeader);
  
  if (!authHeader) {
    throw Object.assign(new Error('Missing authorization header'), { status: 401, isAuthError: true });
  }
  
  const isBearerFormat = authHeader.startsWith('Bearer ');
  console.log('Auth header format: Bearer format:', isBearerFormat);
  
  if (!isBearerFormat) {
    throw Object.assign(new Error('Invalid authorization header format'), { status: 401, isAuthError: true });
  }
  
  const token = authHeader.substring(7);
  console.log('Extracted token length:', token.length);
  console.log('Token starts with:', token.substring(0, 20) + '...');
  
  // Verify user with Supabase
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !user) {
    console.error('User authentication failed:', userError);
    throw Object.assign(new Error('Invalid authentication token'), { status: 401, isAuthError: true });
  }
  
  console.log('User authenticated successfully:', user.id);
  
  // Get connection details
  console.log(`Looking for connection: ${requestBody.connectionId} for user: ${user.id}`);
  
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
  
  console.log('Connection found:', connection.id, 'status:', connection.connection_status);
  
  // Validate connection status
  if (connection.connection_status !== 'active') {
    console.error('Connection is not active:', connection.connection_status);
    throw Object.assign(new Error('Connection is not active. Please reconnect your Zoom account.'), { status: 400 });
  }
  
  // Log detailed token info (for debugging)
  console.log('Detailed token info from DB:', {
    id: connection.id,
    user_id: connection.user_id,
    connection_status: connection.connection_status,
    hasAccessToken: !!connection.access_token,
    accessTokenLength: connection.access_token?.length || 0,
    decryptedTokenLength: connection.access_token?.length || 0,
    hasRefreshToken: !!connection.refresh_token,
    refreshTokenLength: connection.refresh_token?.length || 0,
    expiresAt: connection.token_expires_at,
    updatedAt: connection.updated_at
  });
  
  // Validate token expiration
  console.log('Token expires at:', connection.token_expires_at, 'updated at:', connection.updated_at);
  
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
  
  console.log(`Token validation - expires: ${expiresAt.toISOString()}, now: ${now.toISOString()}`);
  
  const isExpired = now >= expiresAt;
  const needsRefresh = now.getTime() >= (expiresAt.getTime() - bufferTime);
  
  console.log('Token is expired:', isExpired);
  console.log('Token needs refresh (with buffer):', needsRefresh);
  
  if (isExpired) {
    throw Object.assign(new Error('Access token has expired. Please reconnect your Zoom account.'), { 
      status: 401, 
      isAuthError: true 
    });
  }
  
  // Clean up stuck syncs and check for active ones
  console.log('Checking for active syncs...');
  
  // First, mark old "started" syncs as failed (older than 10 minutes)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { error: cleanupError } = await supabase
    .from('zoom_sync_logs')
    .update({
      sync_status: 'failed',
      error_message: 'Sync timed out - marked as failed by cleanup process',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('connection_id', requestBody.connectionId)
    .eq('sync_status', 'started')
    .lt('created_at', tenMinutesAgo);

  if (cleanupError) {
    console.error('Error cleaning up stuck syncs:', cleanupError);
  } else {
    console.log('Cleaned up stuck syncs older than 10 minutes');
  }
  
  // Now check for any remaining active syncs
  const { data: activeSyncs, error: syncError } = await supabase
    .from('zoom_sync_logs')
    .select('id, sync_status, created_at')
    .eq('connection_id', requestBody.connectionId)
    .in('sync_status', ['started', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (syncError) {
    console.error('Error checking for active syncs:', syncError);
    throw Object.assign(new Error('Failed to check sync status'), { status: 500 });
  }
  
  if (activeSyncs && activeSyncs.length > 0) {
    const activeSync = activeSyncs[0];
    console.log('Active sync found:', { id: activeSync.id, sync_status: activeSync.sync_status });
    
    throw Object.assign(new Error('Sync already in progress for this connection'), { 
      status: 409,
      body: { activeSyncId: activeSync.id }
    });
  }
  
  console.log('No active syncs found, proceeding with new sync');
  
  return {
    user,
    connection,
    requestBody
  };
}
