
import { SimpleTokenEncryption } from './encryption.ts';
import { ZoomUserData, ApiTestResult } from './types.ts';
import { ZoomServerToServerService } from './server-to-server-service.ts';

export async function testZoomAPIConnection(connection: any, supabaseClient: any): Promise<{
  success: boolean;
  userData?: ZoomUserData;
  apiTest: ApiTestResult;
  tokenInfo?: any;
}> {
  console.log('=== Starting Zoom API Connection Test ===');
  console.log('Connection info:', {
    id: connection.id,
    connectionType: connection.connection_type,
    hasAccessToken: !!connection.access_token,
    tokenLength: connection.access_token?.length,
    connectionStatus: connection.connection_status
  });
  
  let accessToken: string;
  let tokenInfo = {
    connectionType: connection.connection_type || 'oauth',
    wasDecrypted: false,
    wasGenerated: false,
    originalLength: connection.access_token?.length || 0,
    tokenLength: 0,
    tokenType: 'unknown',
    validationPassed: false
  };

  try {
    // Check if this is a Server-to-Server connection
    if (ZoomServerToServerService.isServerToServerConnection(connection)) {
      console.log('Detected Server-to-Server connection');
      tokenInfo.tokenType = 'Server-to-Server';
      
      // Validate that we have the required credentials
      const validation = ZoomServerToServerService.validateServerToServerConnection(connection);
      if (!validation.valid) {
        throw new Error(`Missing Server-to-Server credentials: ${validation.missing.join(', ')}`);
      }

      // Generate a fresh access token
      accessToken = await ZoomServerToServerService.getValidAccessToken(supabaseClient, connection);
      tokenInfo.wasGenerated = true;
      tokenInfo.tokenLength = accessToken.length;
      tokenInfo.validationPassed = true;
      
      console.log('Generated Server-to-Server access token successfully');
    } else {
      console.log('Processing OAuth connection - attempting token decryption');
      
      // For OAuth connections, decrypt the stored token
      try {
        accessToken = await SimpleTokenEncryption.decryptToken(
          connection.access_token, 
          connection.user_id
        );
        
        tokenInfo.wasDecrypted = true;
        tokenInfo.tokenLength = accessToken?.length || 0;
        tokenInfo.validationPassed = true;
        
        // Determine token type
        if (accessToken.includes('.')) {
          tokenInfo.tokenType = 'JWT';
        } else {
          tokenInfo.tokenType = 'OAuth';
        }
        
        console.log('OAuth token decryption successful');
      } catch (decryptError) {
        console.error('OAuth token decryption failed:', decryptError);
        throw new Error(`Failed to decrypt OAuth access token: ${decryptError.message}`);
      }
    }

  } catch (tokenError) {
    console.error('Token processing failed:', tokenError);
    throw {
      status: 'token_error',
      message: tokenError.message,
      tokenInfo
    };
  }

  console.log('=== Starting Zoom API Test ===');
  
  // Try multiple endpoints to better diagnose the issue
  const testEndpoints = [
    { path: '/users/me', description: 'Get current user' },
    { path: '/users/me/settings', description: 'Get user settings' }
  ];
  
  for (const endpoint of testEndpoints) {
    console.log(`Testing endpoint: ${endpoint.path} (${endpoint.description})`);
    
    try {
      const zoomResponse = await fetch(`https://api.zoom.us/v2${endpoint.path}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`Zoom API response for ${endpoint.path}:`, {
        status: zoomResponse.status,
        statusText: zoomResponse.statusText
      });

      if (zoomResponse.ok) {
        const zoomData = await zoomResponse.json();
        console.log(`Zoom API call successful for ${endpoint.path}`);
        
        return {
          success: true,
          userData: {
            id: zoomData.id,
            email: zoomData.email,
            first_name: zoomData.first_name,
            last_name: zoomData.last_name,
            type: zoomData.type,
            account_id: zoomData.account_id
          },
          apiTest: {
            endpoint: endpoint.path,
            success: true,
            responseStatus: zoomResponse.status
          },
          tokenInfo
        };
      } else {
        const errorText = await zoomResponse.text();
        console.error(`Zoom API error for ${endpoint.path}:`, zoomResponse.status, errorText);
        
        // If this is the last endpoint and it failed, return the error
        if (endpoint === testEndpoints[testEndpoints.length - 1]) {
          return {
            success: false,
            apiTest: {
              endpoint: endpoint.path,
              success: false,
              responseStatus: zoomResponse.status,
              errorMessage: errorText
            },
            tokenInfo
          };
        }
        
        // Continue to next endpoint if available
        console.log(`Continuing to next endpoint after ${endpoint.path} failed...`);
      }
    } catch (apiError) {
      console.error(`Network error for ${endpoint.path}:`, apiError);
      
      // If this is the last endpoint and it failed, return the error
      if (endpoint === testEndpoints[testEndpoints.length - 1]) {
        return {
          success: false,
          apiTest: {
            endpoint: endpoint.path,
            success: false,
            responseStatus: 0,
            errorMessage: apiError.message
          },
          tokenInfo
        };
      }
      
      // Continue to next endpoint if available
      console.log(`Continuing to next endpoint after network error on ${endpoint.path}...`);
    }
  }
  
  // This shouldn't be reached, but just in case
  return {
    success: false,
    apiTest: {
      endpoint: '/users/me',
      success: false,
      responseStatus: 0,
      errorMessage: 'All test endpoints failed'
    },
    tokenInfo
  };
}
