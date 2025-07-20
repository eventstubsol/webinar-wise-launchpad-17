
import { TestModeManager } from './test-mode-manager.ts';

export interface EnhancedSyncRequest {
  connectionId: string;
  syncType: 'initial' | 'incremental' | 'manual' | 'single' | 'participants_only';
  webinarId?: string;
  webinarIds?: string[];
  syncLogId?: string;
  requestId?: string;
  options?: {
    // Test Mode
    testMode?: boolean;
    maxWebinarsInTest?: number;
    
    // Rate Limiting
    respectRateLimits?: boolean;
    maxConcurrentRequests?: number;
    
    // Error Recovery
    enableAutoRetry?: boolean;
    maxRetryAttempts?: number;
    retryDelayStrategy?: 'immediate' | 'linear' | 'exponential';
    
    // Feature Flags
    dryRun?: boolean;
    maxWebinars?: number;
    skipValidation?: boolean;
    verboseLogging?: boolean;
    
    // Processing Control
    forceSync?: boolean;
    skipEligibilityCheck?: boolean;
    includeRegistrants?: boolean;
    includeParticipants?: boolean;
  };
}

function isServiceRoleToken(token: string): boolean {
  try {
    // Service role tokens have different structure than user JWTs
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'service_role' && !payload.sub;
  } catch {
    return false;
  }
}

export async function validateEnhancedRequest(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing or invalid authorization header'), { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  let user;
  let connection;
  let requestBody: EnhancedSyncRequest;

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

  // Handle different authentication types
  if (isServiceRoleToken(token)) {
    console.log('🔧 Service role authentication detected, validating connection...');
    
    // For service role calls, get connection and derive user from connection
    const { data: connectionData, error: connectionError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', requestBody.connectionId)
      .eq('connection_status', 'active')
      .single();

    if (connectionError || !connectionData) {
      console.error('Connection validation failed for service role:', connectionError);
      throw Object.assign(new Error('Invalid or inactive connection'), { status: 400 });
    }

    connection = connectionData;
    
    // Create a user object from the connection data
    user = {
      id: connectionData.user_id,
      email: connectionData.zoom_email || 'service-role@zoom.connection'
    };
    
    console.log(`✅ Service role validation successful for user: ${user.id}`);
    
  } else {
    console.log('👤 User JWT authentication detected, validating token...');
    
    // For user JWT calls, validate the token normally
    const { data: { user: jwtUser }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !jwtUser) {
      console.error('User authentication failed:', userError);
      throw Object.assign(new Error('Authentication failed'), { status: 401 });
    }

    user = jwtUser;

    // Get and validate connection ownership
    const { data: connectionData, error: connectionError } = await supabase
      .from('zoom_connections')
      .select('*')
      .eq('id', requestBody.connectionId)
      .eq('user_id', user.id)
      .eq('connection_status', 'active')
      .single();

    if (connectionError || !connectionData) {
      console.error('Connection validation failed for user:', connectionError);
      throw Object.assign(new Error('Invalid or inactive connection'), { status: 400 });
    }

    connection = connectionData;
    console.log(`✅ User JWT validation successful for user: ${user.id}`);
  }

  // Enhanced validation for test mode
  if (requestBody.options?.testMode) {
    const testModeValidation = TestModeManager.validateTestModeOptions(requestBody.options);
    if (!testModeValidation.valid) {
      throw Object.assign(new Error(`Test mode validation failed: ${testModeValidation.errors.join(', ')}`), { status: 400 });
    }
  }

  // Validate numeric limits
  if (requestBody.options?.maxWebinars && requestBody.options.maxWebinars < 1) {
    throw Object.assign(new Error('maxWebinars must be greater than 0'), { status: 400 });
  }

  if (requestBody.options?.maxConcurrentRequests && (requestBody.options.maxConcurrentRequests < 1 || requestBody.options.maxConcurrentRequests > 20)) {
    throw Object.assign(new Error('maxConcurrentRequests must be between 1 and 20'), { status: 400 });
  }

  if (requestBody.options?.maxRetryAttempts && (requestBody.options.maxRetryAttempts < 0 || requestBody.options.maxRetryAttempts > 10)) {
    throw Object.assign(new Error('maxRetryAttempts must be between 0 and 10'), { status: 400 });
  }

  // Validate participants_only specific requirements
  if (requestBody.syncType === 'participants_only') {
    if (!requestBody.webinarIds || !Array.isArray(requestBody.webinarIds) || requestBody.webinarIds.length === 0) {
      throw Object.assign(new Error('webinarIds array is required for participants_only sync'), { status: 400 });
    }
    
    const maxWebinars = requestBody.options?.testMode 
      ? (requestBody.options.maxWebinarsInTest || 1)
      : 50;
      
    if (requestBody.webinarIds.length > maxWebinars) {
      throw Object.assign(new Error(`Maximum ${maxWebinars} webinars allowed per participants_only sync`), { status: 400 });
    }
  }

  return { user, connection, requestBody };
}
