
import { SyncRequest } from './types.ts';

export async function validateRequest(req: Request, supabase: any) {
  console.log('Starting request validation...');
  
  // Auth validation
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    console.error('Missing or invalid authorization header');
    throw { status: 401, message: 'Missing or invalid authorization header' };
  }
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    console.error('Invalid authentication token:', authError);
    throw { status: 401, message: 'Invalid authentication token' };
  }
  console.log(`User authenticated: ${user.id}`);

  // Body validation
  const requestBody: SyncRequest = await req.json();
  console.log('Request body:', requestBody);
  
  if (!requestBody.connectionId || !requestBody.syncType) {
    console.error('Missing required fields in request body');
    throw { status: 400, message: 'Missing required fields: connectionId, syncType' };
  }
  
  if (requestBody.syncType === 'single' && !requestBody.webinarId) {
    console.error('Missing webinarId for single webinar sync');
    throw { status: 400, message: 'webinarId is required for single webinar sync' };
  }
  
  // Connection validation with detailed logging
  console.log(`Looking for connection: ${requestBody.connectionId} for user: ${user.id}`);
  
  const { data: connection, error: connectionError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', requestBody.connectionId)
    .eq('user_id', user.id)
    .single();

  if (connectionError) {
    console.error('Connection query error:', connectionError);
    throw { status: 404, message: 'Connection not found or access denied', details: connectionError };
  }
  
  if (!connection) {
    console.error('No connection found for the given criteria');
    throw { status: 404, message: 'Connection not found or access denied' };
  }
  
  console.log(`Connection found: ${connection.id}, status: ${connection.connection_status}`);
  
  if (connection.connection_status !== 'active') {
    console.error(`Connection is not active: ${connection.connection_status}`);
    throw { status: 400, message: `Connection is not active. Status: ${connection.connection_status}` };
  }
  
  // Check for active syncs
  console.log('Checking for active syncs...');
  const { data: activeSyncs, error: activeSyncError } = await supabase
    .from('zoom_sync_logs')
    .select('id, sync_status')
    .eq('connection_id', requestBody.connectionId)
    .in('sync_status', ['started', 'in_progress'])
    .limit(1);

  if (activeSyncError) {
    console.error('Error checking active syncs:', activeSyncError);
  }

  if (activeSyncs && activeSyncs.length > 0) {
    console.log('Active sync found:', activeSyncs[0]);
    throw { 
      status: 409, 
      message: 'Sync already in progress for this connection', 
      body: { activeSyncId: activeSyncs[0].id } 
    };
  }
  
  console.log('Validation completed successfully');
  return { user, connection, requestBody };
}
