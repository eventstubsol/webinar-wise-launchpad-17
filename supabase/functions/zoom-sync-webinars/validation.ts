
export async function validateRequest(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing or invalid authorization header'), { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  
  if (userError || !user) {
    console.error('User authentication failed:', userError);
    throw Object.assign(new Error('Authentication failed'), { status: 401 });
  }

  let requestBody;
  try {
    requestBody = await req.json();
  } catch (error) {
    throw Object.assign(new Error('Invalid JSON in request body'), { status: 400 });
  }

  // Validate required fields
  if (!requestBody.connectionId) {
    throw Object.assign(new Error('connectionId is required'), { status: 400 });
  }

  if (!requestBody.syncType) {
    throw Object.assign(new Error('syncType is required'), { status: 400 });
  }

  const validSyncTypes = ['initial', 'incremental', 'manual', 'single', 'participants_only'];
  if (!validSyncTypes.includes(requestBody.syncType)) {
    throw Object.assign(new Error(`Invalid syncType. Must be one of: ${validSyncTypes.join(', ')}`), { status: 400 });
  }

  // Validate participants_only specific requirements
  if (requestBody.syncType === 'participants_only') {
    if (!requestBody.webinarIds || !Array.isArray(requestBody.webinarIds) || requestBody.webinarIds.length === 0) {
      throw Object.assign(new Error('webinarIds array is required for participants_only sync'), { status: 400 });
    }
    
    if (requestBody.webinarIds.length > 50) {
      throw Object.assign(new Error('Maximum 50 webinars allowed per participants_only sync'), { status: 400 });
    }
  }

  // Get and validate connection
  const { data: connection, error: connectionError } = await supabase
    .from('zoom_connections')
    .select('*')
    .eq('id', requestBody.connectionId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (connectionError || !connection) {
    console.error('Connection validation failed:', connectionError);
    throw Object.assign(new Error('Invalid or inactive connection'), { status: 400 });
  }

  return { user, connection, requestBody };
}
