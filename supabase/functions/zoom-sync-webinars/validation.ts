
import { SyncRequest } from './types.ts';

export async function validateRequest(req: Request, supabase: any) {
  // Auth validation
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw { status: 401, message: 'Missing or invalid authorization header' };
  }
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    throw { status: 401, message: 'Invalid authentication token' };
  }

  // Body validation
  const requestBody: SyncRequest = await req.json();
  if (!requestBody.connectionId || !requestBody.syncType) {
    throw { status: 400, message: 'Missing required fields: connectionId, syncType' };
  }
  if (requestBody.syncType === 'single' && !requestBody.webinarId) {
    throw { status: 400, message: 'webinarId is required for single webinar sync' };
  }
  
  // Connection validation
  const { data: connection, error: connectionError } = await supabase
    .from('zoom_connections')
    .select('id, user_id, connection_status, access_token, refresh_token, token_expires_at')
    .eq('id', requestBody.connectionId)
    .eq('user_id', user.id)
    .single();

  if (connectionError || !connection) {
    throw { status: 404, message: 'Connection not found or access denied' };
  }
  if (connection.connection_status !== 'active') {
    throw { status: 400, message: 'Connection is not active' };
  }
  
  // Check for active syncs
  const { data: activeSyncs } = await supabase
      .from('zoom_sync_logs')
      .select('id')
      .eq('connection_id', requestBody.connectionId)
      .in('sync_status', ['started', 'in_progress'])
      .limit(1);

  if (activeSyncs && activeSyncs.length > 0) {
    throw { status: 409, message: 'Sync already in progress for this connection', body: { activeSyncId: activeSyncs[0].id } };
  }
  
  return { user, connection, requestBody };
}
