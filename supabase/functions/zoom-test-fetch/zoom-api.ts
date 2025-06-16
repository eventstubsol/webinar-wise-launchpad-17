
import { SimpleTokenEncryption } from './encryption.ts';
import { ZoomUserData, ApiTestResult } from './types.ts';

export async function testZoomAPIConnection(connection: any): Promise<{
  success: boolean;
  userData?: ZoomUserData;
  apiTest: ApiTestResult;
  tokenInfo?: any;
}> {
  console.log('=== Starting Token Decryption Process ===');
  console.log('Connection info:', {
    id: connection.id,
    hasAccessToken: !!connection.access_token,
    tokenLength: connection.access_token?.length,
    connectionStatus: connection.connection_status
  });
  
  let decryptedToken;
  let tokenInfo = {
    wasDecrypted: false,
    originalLength: connection.access_token?.length,
    decryptedLength: 0,
    tokenType: 'unknown',
    validationPassed: false
  };
  
  try {
    console.log('Attempting to decrypt access token...');
    decryptedToken = await SimpleTokenEncryption.decryptToken(
      connection.access_token, 
      connection.user_id
    );
    
    tokenInfo.wasDecrypted = true;
    tokenInfo.decryptedLength = decryptedToken?.length || 0;
    tokenInfo.validationPassed = true;
    
    // Determine token type
    if (decryptedToken.includes('.')) {
      tokenInfo.tokenType = 'JWT';
    } else if (decryptedToken.startsWith('SERVER_TO_SERVER_')) {
      tokenInfo.tokenType = 'Server-to-Server';
    } else {
      tokenInfo.tokenType = 'Other';
    }
    
    console.log('Token decryption successful:', {
      originalLength: tokenInfo.originalLength,
      decryptedLength: tokenInfo.decryptedLength,
      tokenType: tokenInfo.tokenType,
      decryptedPrefix: decryptedToken?.substring(0, 20) + '...'
    });
    
  } catch (decryptError) {
    console.error('Token decryption failed:', decryptError);
    tokenInfo.wasDecrypted = false;
    throw {
      status: 'token_error',
      message: 'Failed to decrypt Zoom access token',
      decryptionError: decryptError.message,
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
          'Authorization': `Bearer ${decryptedToken}`,
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
