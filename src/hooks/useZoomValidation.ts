
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useZoomCredentials } from '@/hooks/useZoomCredentials';
import { supabase } from '@/integrations/supabase/client';
import { ZoomConnection } from '@/types/zoom';

interface UseZoomValidationProps {
  onConnectionSuccess?: (connection: ZoomConnection) => void;
  onConnectionError?: (error: string) => void;
}

export const useZoomValidation = ({ onConnectionSuccess, onConnectionError }: UseZoomValidationProps = {}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isValidating, setIsValidating] = useState(false);
  const { credentials } = useZoomCredentials();

  const validateCredentialsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!credentials) {
        throw new Error('Zoom credentials not configured');
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      const response = await fetch('/functions/v1/validate-zoom-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to validate credentials');
      }

      return await response.json();
    },
    onSuccess: (result) => {
      setIsValidating(false);
      
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
      
      toast({
        title: "Success!",
        description: "Your Zoom credentials have been validated and connection established.",
      });
      
      if (result.connection) {
        onConnectionSuccess?.(result.connection);
      }
    },
    onError: (error: Error) => {
      setIsValidating(false);
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
    validateCredentialsMutation.mutate();
  };

  return {
    isValidating,
    startValidation,
    credentials,
    user,
  };
};
