
import { SimpleTokenEncryption } from './encryption.ts';
import { ZoomUserData, ApiTestResult } from './types.ts';

export async function testZoomAPIConnection(connection: any): Promise<{
  success: boolean;
  userData?: ZoomUserData;
  apiTest: ApiTestResult;
}> {
  console.log('Attempting to decrypt access token...');
  let decryptedToken;
  
  try {
    decryptedToken = await SimpleTokenEncryption.decryptToken(
      connection.access_token, 
      connection.user_id
    );
    console.log('Token decryption result:', {
      originalLength: connection.access_token?.length,
      decryptedLength: decryptedToken?.length,
      decryptedPrefix: decryptedToken?.substring(0, 20) + '...'
    });
  } catch (decryptError) {
    console.error('Token decryption failed:', decryptError);
    throw {
      status: 'token_error',
      message: 'Failed to decrypt Zoom access token',
      decryptionError: decryptError.message
    };
  }

  console.log('Attempting Zoom API call with decrypted token...');
  try {
    const zoomResponse = await fetch('https://api.zoom.us/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${decryptedToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Zoom API response status:', zoomResponse.status);

    if (zoomResponse.ok) {
      const zoomData = await zoomResponse.json();
      console.log('Zoom API call successful, user data received');
      
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
          endpoint: '/users/me',
          success: true,
          responseStatus: zoomResponse.status
        }
      };
    } else {
      const errorText = await zoomResponse.text();
      console.error('Zoom API error:', zoomResponse.status, errorText);
      
      return {
        success: false,
        apiTest: {
          endpoint: '/users/me',
          success: false,
          responseStatus: zoomResponse.status,
          errorMessage: errorText
        }
      };
    }
  } catch (apiError) {
    console.error('Zoom API request failed:', apiError);
    
    return {
      success: false,
      apiTest: {
        endpoint: '/users/me',
        success: false,
        responseStatus: 0,
        errorMessage: apiError.message
      }
    };
  }
}
