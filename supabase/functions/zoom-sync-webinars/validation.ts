
export async function validateRequest(req: Request, supabase: any) {
  console.log('Starting request validation...');
  
  // Get user from auth header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw { status: 401, message: 'No authorization header', isAuthError: true };
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (userError || !user) {
    console.error('User authentication failed:', userError);
    throw { status: 401, message: 'Invalid or expired token', isAuthError: true };
  }

  console.log('User authenticated:', user.id);

  // Parse request body
  const requestBody = await req.json();
  console.log('Request body:', requestBody);

  if (!requestBody.connectionId || !requestBody.syncType) {
    throw { status: 400, message: 'Missing required fields: connectionId and syncType' };
  }

  // Get and validate connection
  console.log(`Looking for connection: ${requestBody.connectionId} for user: ${user.id}`);
  
  const { data: connection, error: connectionError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', requestBody.connectionId)
    .eq('user_id', user.id)
    .single();

  if (connectionError || !connection) {
    console.error('Connection not found:', connectionError);
    throw { status: 404, message: 'Zoom connection not found' };
  }

  console.log('Connection found:', connection.id, 'status:', connection.connection_status);

  if (connection.connection_status !== 'active') {
    throw { status: 400, message: 'Zoom connection is not active' };
  }

  // Enhanced active sync check with timeout protection
  console.log('Checking for active syncs...');
  
  // First, clean up any zombie syncs that have been running for more than 10 minutes
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  
  const { error: cleanupError } = await supabase
    .from('zoom_sync_logs')
    .update({
      sync_status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: 'Sync timed out - automatically cleaned up after 10 minutes',
      updated_at: new Date().toISOString()
    })
    .eq('connection_id', requestBody.connectionId)
    .in('sync_status', ['started', 'in_progress'])
    .lt('started_at', tenMinutesAgo)
    .is('completed_at', null);

  if (cleanupError) {
    console.warn('Failed to cleanup zombie syncs:', cleanupError);
    // Continue anyway, this is not critical
  } else {
    console.log('Cleaned up any zombie syncs older than 10 minutes');
  }

  // Now check for genuinely active syncs
  const { data: activeSyncs, error: syncError } = await supabase
    .from('zoom_sync_logs')
    .select('id, sync_status, started_at')
    .eq('connection_id', requestBody.connectionId)
    .in('sync_status', ['started', 'in_progress'])
    .is('completed_at', null)
    .order('started_at', { ascending: false })
    .limit(1);

  if (syncError) {
    console.error('Error checking for active syncs:', syncError);
    throw { status: 500, message: 'Failed to check sync status' };
  }

  if (activeSyncs && activeSyncs.length > 0) {
    const activeSync = activeSyncs[0];
    console.log('Active sync found:', { id: activeSync.id, sync_status: activeSync.sync_status });
    
    // Check if this sync is actually recent (started within the last 10 minutes)
    const syncStartTime = new Date(activeSync.started_at).getTime();
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    
    if (now - syncStartTime < tenMinutes) {
      // This is a genuinely active recent sync
      throw {
        status: 409,
        message: 'Sync already in progress for this connection',
        body: { activeSyncId: activeSync.id }
      };
    } else {
      // This sync is old, mark it as failed and continue
      console.log('Found old sync, marking as failed and continuing...');
      await supabase
        .from('zoom_sync_logs')
        .update({
          sync_status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: 'Sync timed out - marked as failed to allow new sync',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeSync.id);
    }
  }

  // Validate token and check expiry
  const now = new Date();
  const expiresAt = new Date(connection.token_expires_at);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  console.log('Token expires at:', connection.token_expires_at, 'updated at:', connection.updated_at);
  console.log('Token validation - expires:', expiresAt.toISOString(), 'now:', now.toISOString());
  console.log('Token is expired:', expiresAt <= now);
  console.log('Token needs refresh (with buffer):', expiresAt <= fiveMinutesFromNow);

  if (expiresAt <= now) {
    throw { status: 401, message: 'Zoom token has expired. Please reconnect your account.', isAuthError: true };
  }

  if (expiresAt <= fiveMinutesFromNow) {
    console.log('Token expires soon, should refresh before sync');
    // For now, we'll proceed but log this - in production you might want to refresh the token
  }

  return { user, connection, requestBody };
}
