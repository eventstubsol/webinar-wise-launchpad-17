
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection } from '@/types/zoom';
import { syncUserRole } from '@/services/userRoleService';

interface UseZoomValidationProps {
  onConnectionSuccess?: (connection: ZoomConnection) => void;
  onConnectionError?: (error: string) => void;
}

interface ValidationResult {
  success: boolean;
  connection?: ZoomConnection;
  message?: string;
  error?: string;
}

interface ValidationPayload {
  account_id: string;
  client_id: string;
  client_secret: string;
}

export const useZoomValidation = ({ onConnectionSuccess, onConnectionError }: UseZoomValidationProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const { credentials } = useZoomCredentials();
  const { connection } = useZoomConnection();
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const validateCredentialsMutation = useMutation({
    mutationFn: async (payload?: ValidationPayload): Promise<ValidationResult> => {
      console.log('🔄 Starting Zoom validation process...');
      
      if (!user?.id) {
        console.error('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      // Use provided payload or fallback to existing credentials
      const validationData = payload || credentials;
      
      if (!validationData) {
        console.error('❌ No Zoom credentials available');
        throw new Error('Zoom credentials not configured');
      }

      console.log('📋 Validation data prepared:', {
        account_id: validationData.account_id ? '✓' : '❌',
        client_id: validationData.client_id ? '✓' : '❌',
        client_secret: validationData.client_secret ? '✓ (hidden)' : '❌',
        user_id: user.id
      });

      // Get current session to ensure we have valid auth
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('❌ No valid session found:', sessionError);
        throw new Error('Authentication session invalid. Please log in again.');
      }

      console.log('✅ Valid session confirmed, calling edge function...');
      
      try {
        // Call the edge function to validate credentials and create connection
        const { data, error } = await supabase.functions.invoke('validate-zoom-credentials', {
          body: {
            account_id: validationData.account_id,
            client_id: validationData.client_id,
            client_secret: validationData.client_secret
          }
        });

        console.log('📡 Edge function response received:', {
          hasData: !!data,
          hasError: !!error,
          dataKeys: data ? Object.keys(data) : [],
          errorMessage: error?.message
        });

        if (error) {
          console.error('❌ Edge function error:', error);
          throw new Error(`Edge function failed: ${error.message || 'Unknown error'}`);
        }

        if (!data) {
          console.error('❌ No data received from edge function');
          throw new Error('No response data received from validation service');
        }

        if (!data.success) {
          console.error('❌ Validation failed:', data.error);
          throw new Error(data.error || 'Credential validation failed');
        }

        console.log('✅ Validation successful:', {
          hasConnection: !!data.connection,
          connectionId: data.connection?.id,
          message: data.message
        });

        // Verify connection was actually created by checking the database
        if (data.connection?.id) {
          console.log('🔍 Verifying connection in database...');
          
          // Wait a moment for database consistency
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: dbConnection, error: dbError } = await supabase
            .from('zoom_connections')
            .select('*')
            .eq('id', data.connection.id)
            .single();

          if (dbError || !dbConnection) {
            console.error('❌ Connection verification failed:', dbError);
            throw new Error('Connection was not properly saved. Please try again.');
          }

          console.log('✅ Connection verified in database:', dbConnection.id);
        }

        // Sync user role after successful connection
        try {
          console.log('🔄 Syncing user role...');
          await syncUserRole(user.id);
          console.log('✅ User role synced successfully');
        } catch (error) {
          console.warn('⚠️ Failed to sync user role (non-critical):', error);
          // Don't fail the connection if role sync fails
        }

        return {
          success: true,
          connection: data.connection,
          message: data.message || 'Zoom credentials validated and connection established successfully'
        };

      } catch (functionError) {
        console.error('❌ Edge function call failed:', functionError);
        
        // Provide more specific error messages based on the error
        if (functionError.message?.includes('fetch')) {
          throw new Error('Network error: Unable to reach validation service. Please check your connection and try again.');
        } else if (functionError.message?.includes('auth')) {
          throw new Error('Authentication error: Please log out and log back in, then try again.');
        } else {
          throw functionError;
        }
      }
    },
    onSuccess: (result: ValidationResult) => {
      console.log('🎉 Validation mutation successful:', result);
      setIsValidating(false);
      setValidationResult(result);
      
      // Force immediate invalidation of all connection-related queries
      console.log('🔄 Invalidating queries...');
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      queryClient.invalidateQueries({ queryKey: ['zoom-connections'] });
      queryClient.invalidateQueries({ queryKey: ['zoom-credentials'] });
      
      // Update the cache optimistically with the new connection data
      if (result.connection) {
        console.log('💾 Updating query cache with new connection');
        queryClient.setQueryData(['zoom-connection', user?.id], result.connection);
      }
      
      toast({
        title: "Connection Successful!",
        description: result.message || "Your Zoom account has been connected successfully.",
      });
      
      if (result.connection) {
        console.log('🎯 Triggering success callback');
        onConnectionSuccess?.(result.connection);
      }
    },
    onError: (error: Error) => {
      console.error('❌ Validation mutation failed:', error);
      setIsValidating(false);
      setValidationResult({ success: false, error: error.message });
      const errorMessage = error.message || 'Failed to validate Zoom credentials';
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      onConnectionError?.(errorMessage);
    },
  });

  const startValidation = (payload?: ValidationPayload) => {
    console.log('🚀 Starting validation with payload:', payload ? 'provided' : 'using stored credentials');
    setIsValidating(true);
    setValidationResult(null);
    validateCredentialsMutation.mutate(payload);
  };

  return {
    isValidating,
    startValidation,
    credentials,
    user,
    validationResult,
  };
};
