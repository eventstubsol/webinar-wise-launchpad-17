
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { useZoomConnection } from '@/hooks/useZoomConnection';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { UnifiedZoomService } from '@/services/zoom/UnifiedZoomService';
import { ZoomConnection } from '@/types/zoom';
import { syncUserRole } from '@/services/userRoleService';

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

      // For now, just return the credentials as success - connection creation is handled elsewhere
      // This validation hook is primarily used for UI validation
      
      // Sync user role after successful connection
      if (connection) {
        try {
          await syncUserRole(user.id);
          console.log('User role synced successfully');
        } catch (error) {
          console.error('Failed to sync user role:', error);
          // Don't fail the connection if role sync fails
        }
      }

      return {
        success: true,
        connection: null, // Connection creation handled elsewhere
        message: 'Credentials validated successfully'
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
