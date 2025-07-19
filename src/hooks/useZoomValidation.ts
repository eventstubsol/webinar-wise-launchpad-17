
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
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Use provided payload or fallback to existing credentials
      const validationData = payload || credentials;
      
      if (!validationData) {
        throw new Error('Zoom credentials not configured');
      }

      console.log('🔄 Calling validate-zoom-credentials edge function...');
      
      // Call the edge function to validate credentials and create connection
      const { data, error } = await supabase.functions.invoke('validate-zoom-credentials', {
        body: {
          account_id: validationData.account_id,
          client_id: validationData.client_id,
          client_secret: validationData.client_secret
        }
      });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw new Error(error.message || 'Failed to validate credentials');
      }

      if (!data?.success) {
        console.error('❌ Validation failed:', data?.error);
        throw new Error(data?.error || 'Credential validation failed');
      }

      console.log('✅ Credentials validated successfully:', data);

      // Sync user role after successful connection
      try {
        await syncUserRole(user.id);
        console.log('User role synced successfully');
      } catch (error) {
        console.error('Failed to sync user role:', error);
        // Don't fail the connection if role sync fails
      }

      return {
        success: true,
        connection: data.connection,
        message: data.message || 'Zoom credentials validated and connection established successfully'
      };
    },
    onSuccess: (result: ValidationResult) => {
      setIsValidating(false);
      setValidationResult(result);
      
      // Immediately invalidate and refetch all connection-related queries
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      queryClient.invalidateQueries({ queryKey: ['zoom-connections'] });
      queryClient.invalidateQueries({ queryKey: ['zoom-credentials'] });
      
      // Update the cache optimistically with the new connection data
      if (result.connection) {
        queryClient.setQueryData(['zoom-connection', user?.id], result.connection);
      }
      
      toast({
        title: "Success!",
        description: result.message || "Your Zoom credentials have been validated and connection established.",
      });
      
      if (result.connection) {
        onConnectionSuccess?.(result.connection);
      }
    },
    onError: (error: Error) => {
      setIsValidating(false);
      setValidationResult({ success: false, error: error.message });
      const errorMessage = error.message || 'Failed to validate Zoom credentials';
      
      console.error('❌ Validation error:', error);
      
      toast({
        title: "Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      onConnectionError?.(errorMessage);
    },
  });

  const startValidation = (payload?: ValidationPayload) => {
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
