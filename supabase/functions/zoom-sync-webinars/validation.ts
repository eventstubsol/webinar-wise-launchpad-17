
import { validateZoomConnection } from './zoom-api-client.ts';
import { clearAllStuckSyncsForConnection } from './sync-recovery.ts';

export async function validateRequest(req: Request, supabase: any) {
  console.log('Starting request validation...');
  
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    const error = new Error('Missing authorization header');
    error.isAuthError = true;
    throw error;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  if (userError || !user) {
    console.error('Authentication failed:', userError);
    const error = new Error('Invalid or expired token');
    error.isAuthError = true;
    throw error;
  }

  console.log(`User authenticated: ${user.id}`);

  const requestBody = await req.json();
  console.log('Request body:', requestBody);

  if (!requestBody.connectionId || !requestBody.syncType) {
    throw new Error('Missing required parameters: connectionId and syncType');
  }

  // Get the connection
  console.log(`Looking for connection: ${requestBody.connectionId} for user: ${user.id}`);
  const { data: connection, error: connectionError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', requestBody.connectionId)
    .eq('user_id', user.id)
    .single();

  if (connectionError || !connection) {
    console.error('Connection fetch error:', connectionError);
    throw new Error('Connection not found or access denied');
  }

  console.log(`Connection found: ${connection.id}, status: ${connection.connection_status}`);

  // ENHANCED: Clear ALL stuck syncs for this connection before proceeding
  console.log('Clearing all stuck syncs for connection...');
  await clearAllStuckSyncsForConnection(supabase, requestBody.connectionId);

  // Check for active syncs AFTER clearing ALL stuck ones
  console.log('Checking for remaining active syncs...');
  const { data: activeSyncs, error: syncError } = await supabase
    .from('zoom_sync_logs')
    .select('id, sync_status, created_at')
    .eq('connection_id', requestBody.connectionId)
    .in('sync_status', ['started', 'in_progress'])
    .limit(1);

  if (syncError) {
    console.error('Error checking active syncs:', syncError);
    throw new Error('Failed to check sync status');
  }

  if (activeSyncs && activeSyncs.length > 0) {
    console.log('Active sync still found after clearing:', activeSyncs[0]);
    const error = new Error('Sync already in progress for this connection');
    error.status = 409;
    error.body = { activeSyncId: activeSyncs[0].id };
    throw error;
  }

  console.log('All stuck syncs cleared, connection ready for new sync');
  return { user, connection, requestBody };
}

export async function validateZoomConnection(connection: any): Promise<void> {
  if (!connection.access_token) {
    throw new Error('No access token available');
  }

  console.log('Raw connection data from DB:', {
    id: connection.id,
    user_id: connection.user_id,
    zoom_user_id: connection.zoom_user_id,
    zoom_email: connection.zoom_email,
    zoom_account_id: connection.zoom_account_id,
    zoom_account_type: connection.zoom_account_type,
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    token_expires_at: connection.token_expires_at,
    scopes: connection.scopes,
    connection_status: connection.connection_status,
    is_primary: connection.is_primary,
    auto_sync_enabled: connection.auto_sync_enabled,
    sync_frequency_hours: connection.sync_frequency_hours,
    last_sync_at: connection.last_sync_at,
    next_sync_at: connection.next_sync_at,
    created_at: connection.created_at,
    updated_at: connection.updated_at,
    connection_type: connection.connection_type,
    client_id: connection.client_id,
    client_secret: connection.client_secret,
    account_id: connection.account_id
  });

  // Try to decrypt the access token using different methods
  let decryptedToken = connection.access_token;
  
  try {
    console.log('Attempting AES-GCM decryption...');
    // Try AES-GCM decryption first
    const algorithm = { name: 'AES-GCM', iv: new Uint8Array(12) };
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(Deno.env.get('ENCRYPTION_SALT') || 'fallback-key'),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode('zoom-token-salt'),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
    
    const encryptedData = new Uint8Array(Buffer.from(connection.access_token, 'base64'));
    const decryptedData = await crypto.subtle.decrypt(algorithm, key, encryptedData);
    decryptedToken = new TextDecoder().decode(decryptedData);
    
    console.log('AES-GCM decryption successful');
  } catch (aesError) {
    console.log('AES-GCM decryption failed:', aesError.message, 'Attempting fallbacks.');
    
    try {
      console.log('Attempting base64 decoding fallback...');
      // Try base64 decoding
      decryptedToken = atob(connection.access_token);
      console.log('Base64 decoding successful');
    } catch (base64Error) {
      console.log('Base64 decoding failed:', base64Error.message, 'Assuming plain text token.');
      // Assume it's already plaintext
      decryptedToken = connection.access_token;
    }
  }

  console.log('Detailed token info from DB:', {
    id: connection.id,
    user_id: connection.user_id,
    connection_status: connection.connection_status,
    hasAccessToken: !!connection.access_token,
    accessTokenLength: connection.access_token?.length,
    decryptedTokenLength: decryptedToken?.length,
    hasRefreshToken: !!connection.refresh_token,
    refreshTokenLength: connection.refresh_token?.length,
    expiresAt: connection.token_expires_at,
    updatedAt: connection.updated_at
  });

  // Validate token expiration
  if (connection.token_expires_at) {
    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const isExpired = now >= expiresAt;
    const needsRefresh = (expiresAt.getTime() - now.getTime()) < (5 * 60 * 1000); // 5 minutes buffer

    console.log(`Token expires at: ${connection.token_expires_at}, updated at: ${connection.updated_at}`);
    console.log(`Token validation - expires: ${expiresAt.toISOString()}, now: ${now.toISOString()}`);
    console.log(`Token is expired: ${isExpired}`);
    console.log(`Token needs refresh (with buffer): ${needsRefresh}`);

    if (isExpired) {
      const error = new Error('Zoom token has expired');
      error.isAuthError = true;
      throw error;
    }
  }
}
