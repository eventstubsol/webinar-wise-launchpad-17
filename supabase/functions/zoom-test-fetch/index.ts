
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple token encryption/decryption service (copied from zoom-sync-webinars)
const IV_LENGTH = 16;
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_SALT') || 'default-salt-is-not-secure-change-me';

class SimpleTokenEncryption {
  private static async getKey(salt: string): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(ENCRYPTION_KEY),
      { name: "HKDF" },
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "HKDF",
        salt: new TextEncoder().encode(salt),
        info: new TextEncoder().encode("ZoomTokenEncryption"),
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  }

  static async decryptToken(encryptedToken: string, salt: string): Promise<string> {
    // 1. Try to decrypt using AES-GCM
    try {
        console.log('Attempting AES-GCM decryption...');
        const key = await this.getKey(salt);
        const data = new Uint8Array(atob(encryptedToken).split('').map(c => c.charCodeAt(0)));
        const iv = data.slice(0, IV_LENGTH);
        const encrypted = data.slice(IV_LENGTH);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            encrypted
        );
        
        console.log('Successfully decrypted token using AES-GCM.');
        return new TextDecoder().decode(decrypted);
    } catch(e) {
        console.log(`AES-GCM decryption failed: ${e.message}. Attempting fallbacks.`);
        
        // 2. Fallback for tokens that might be just base64 encoded
        try {
            console.log('Attempting base64 decoding fallback...');
            const decoded = atob(encryptedToken);
            console.log('Successfully decoded token using base64 fallback.');
            return decoded;
        } catch (e2) {
            console.log(`Base64 decoding failed: ${e2.message}. Assuming plain text token.`);
            // 3. If base64 decoding fails, it might be a plain token
            return encryptedToken;
        }
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Zoom Test Fetch Started ===');
    
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    // Look for user's Zoom connections
    console.log('Looking up Zoom connections...');
    const { data: connections, error: connectionError } = await supabaseClient
      .from('zoom_connections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (connectionError) {
      console.error('Database query error:', connectionError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Database query failed', 
          details: connectionError 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${connections?.length || 0} Zoom connections`);

    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          status: 'no_connections',
          message: 'No Zoom connections found for this user',
          data: {
            userInfo: {
              id: user.id,
              email: user.email
            },
            connectionCount: 0
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get the primary or most recent connection
    const primaryConnection = connections.find(c => c.is_primary) || connections[0];
    console.log('Using connection:', {
      id: primaryConnection.id,
      status: primaryConnection.connection_status,
      hasAccessToken: !!primaryConnection.access_token,
      tokenExpiresAt: primaryConnection.token_expires_at,
      accessTokenLength: primaryConnection.access_token?.length
    });

    // Check token expiration
    const now = new Date();
    const expiresAt = new Date(primaryConnection.token_expires_at);
    const isExpired = now >= expiresAt;

    if (isExpired) {
      console.log('Token is expired');
      return new Response(
        JSON.stringify({
          success: true,
          status: 'token_expired',
          message: 'Zoom access token has expired',
          data: {
            connection: {
              id: primaryConnection.id,
              status: primaryConnection.connection_status,
              expiresAt: primaryConnection.token_expires_at,
              isExpired: true
            }
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Decrypt the token before making API call
    console.log('Attempting to decrypt access token...');
    let decryptedToken;
    try {
      decryptedToken = await SimpleTokenEncryption.decryptToken(
        primaryConnection.access_token, 
        primaryConnection.user_id
      );
      console.log('Token decryption result:', {
        originalLength: primaryConnection.access_token?.length,
        decryptedLength: decryptedToken?.length,
        decryptedPrefix: decryptedToken?.substring(0, 20) + '...'
      });
    } catch (decryptError) {
      console.error('Token decryption failed:', decryptError);
      return new Response(
        JSON.stringify({
          success: true,
          status: 'token_error',
          message: 'Failed to decrypt Zoom access token',
          data: {
            connection: {
              id: primaryConnection.id,
              status: primaryConnection.connection_status
            },
            decryptionError: decryptError.message
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Try to make a simple Zoom API call with the decrypted token
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
        
        return new Response(
          JSON.stringify({
            success: true,
            status: 'connected',
            message: 'Zoom API connection successful',
            data: {
              connection: {
                id: primaryConnection.id,
                status: primaryConnection.connection_status,
                expiresAt: primaryConnection.token_expires_at,
                isExpired: false
              },
              zoomUser: {
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
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      } else {
        const errorText = await zoomResponse.text();
        console.error('Zoom API error:', zoomResponse.status, errorText);
        
        return new Response(
          JSON.stringify({
            success: true,
            status: 'api_error',
            message: 'Zoom API call failed',
            data: {
              connection: {
                id: primaryConnection.id,
                status: primaryConnection.connection_status
              },
              apiTest: {
                endpoint: '/users/me',
                success: false,
                responseStatus: zoomResponse.status,
                errorMessage: errorText
              },
              tokenInfo: {
                wasDecrypted: true,
                tokenLength: decryptedToken?.length
              }
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } catch (apiError) {
      console.error('Zoom API request failed:', apiError);
      
      return new Response(
        JSON.stringify({
          success: true,
          status: 'network_error',
          message: 'Failed to connect to Zoom API',
          data: {
            connection: {
              id: primaryConnection.id,
              status: primaryConnection.connection_status
            },
            apiTest: {
              endpoint: '/users/me',
              success: false,
              error: apiError.message
            }
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
