
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { EdgeFunctionZoomService } from '@/services/zoom/EdgeFunctionZoomService';
import { RenderConnectionService } from '@/services/zoom/RenderConnectionService';
import { ZoomConnection } from '@/types/zoom';

interface UseZoomValidationProps {
  onConnectionSuccess?: (connection: ZoomConnection) => void;
  onConnectionError?: (error: string) => void;
}

// Enhanced interface to handle both types of responses
interface ValidationResult {
  success: boolean;
  connection?: ZoomConnection;
  message?: string;
  error?: string;
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
    mutationFn: async (): Promise<ValidationResult> => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!credentials) {
        throw new Error('Zoom credentials not configured');
      }

      // If there's an existing invalid connection, attempt recovery first
      if (connection && connection.access_token?.length < 50) {
        console.log('Attempting connection recovery before validation...');
        const recoveryResult = await RenderConnectionService.attemptConnectionRecovery(connection.id);
        
        if (recoveryResult.success) {
          // Recovery successful, test the connection
          const healthCheck = await RenderConnectionService.checkConnectionHealth(connection.id);
          if (healthCheck.isHealthy) {
            return { 
              success: true, 
              connection, 
              message: 'Connection recovered successfully' 
            };
          }
        }
        
        // Recovery failed, delete the connection
        console.log('Recovery failed, deleting invalid connection...');
        await ZoomConnectionService.deleteConnection(connection.id);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Use Render service for credential validation
      const result = await EdgeFunctionZoomService.validateCredentials(credentials);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to validate credentials');
      }

      // Convert the result to our interface format
      return {
        success: result.success,
        connection: result.connection,
        message: result.message || 'Credentials validated successfully'
      };
    },
    onSuccess: (result: ValidationResult) => {
      setIsValidating(false);
      setValidationResult(result);
      
      // Immediately invalidate and refetch connection data
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      
      // Also update the cache optimistically with the new connection data
      if (result.connection) {
        queryClient.setQueryData(['zoom-connection', user?.id], result.connection);
      }
      
      toast({
        title: "Success!",
        description: result.message || "Your Zoom credentials have been validated and connection established via Render API.",
      });
      
      if (result.connection) {
        onConnectionSuccess?.(result.connection);
      }
    },
    onError: (error: Error) => {
      setIsValidating(false);
      setValidationResult({ success: false, error: error.message });
      const errorMessage = error.message || 'Failed to validate Zoom credentials';
      toast({
        title: "Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
      onConnectionError?.(errorMessage);
    },
  });

  const startValidation = () => {
    setIsValidating(true);
    setValidationResult(null);
    validateCredentialsMutation.mutate();
  };

  return {
    isValidating,
    startValidation,
    credentials,
    user,
    validationResult,
  };
};
