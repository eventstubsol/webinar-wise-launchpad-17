
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface OAuthExchangeRequest {
  code: string;
  state: string;
  redirectUri: string;
}

interface OAuthExchangeResponse {
  success: boolean;
  connection?: {
    id: string;
    zoom_email: string;
    zoom_account_type: string;
  };
  error?: string;
}

const ZoomOAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Extract OAuth parameters from URL
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // OAuth token exchange mutation
  const exchangeTokenMutation = useMutation({
    mutationFn: async (request: OAuthExchangeRequest): Promise<OAuthExchangeResponse> => {
      const { data, error } = await supabase.functions.invoke('zoom-oauth-exchange', {
        body: request
      });

      if (error) {
        throw new Error(error.message || 'Failed to exchange OAuth code');
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.success && data.connection) {
        setStatus('success');
        
        // Clear OAuth state from session storage
        sessionStorage.removeItem('zoom_oauth_state');
        
        // Invalidate zoom connection queries to refetch
        queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
        
        toast({
          title: "Success!",
          description: `Zoom account ${data.connection.zoom_email} connected successfully.`,
        });

        // Redirect to dashboard after a short delay to show success state
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000);
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    },
    onError: (error: Error) => {
      console.error('OAuth exchange error:', error);
      setStatus('error');
      setErrorMessage(error.message);
      
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });

      // Redirect to dashboard after showing error
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
    }
  });

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your Zoom account.",
        variant: "destructive",
      });
      navigate('/login', { replace: true });
      return;
    }

    // Check for OAuth errors
    if (error) {
      setStatus('error');
      const message = errorDescription || 
        (error === 'access_denied' ? 'You denied access to your Zoom account.' : 
         `OAuth error: ${error}`);
      setErrorMessage(message);
      
      toast({
        title: "Connection Cancelled",
        description: message,
        variant: "destructive",
      });

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
      return;
    }

    // Check for required parameters
    if (!code || !state) {
      setStatus('error');
      setErrorMessage('Missing required OAuth parameters.');
      
      toast({
        title: "Invalid Callback",
        description: "Missing required OAuth parameters.",
        variant: "destructive",
      });

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
      return;
    }

    // Validate state parameter
    const storedState = sessionStorage.getItem('zoom_oauth_state');
    if (!storedState || storedState !== state) {
      setStatus('error');
      setErrorMessage('Invalid state parameter. Possible security issue.');
      
      toast({
        title: "Security Error",
        description: "Invalid OAuth state. Please try connecting again.",
        variant: "destructive",
      });

      // Clear potentially compromised state
      sessionStorage.removeItem('zoom_oauth_state');

      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000);
      return;
    }

    // All validations passed, exchange the code for tokens
    exchangeTokenMutation.mutate({
      code,
      state,
      redirectUri: `${window.location.origin}/auth/zoom/callback`
    });
  }, [code, state, error, errorDescription, user, navigate, toast, exchangeTokenMutation]);

  const renderStatusContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting Your Zoom Account
            </h2>
            <p className="text-gray-600">
              Please wait while we establish the connection...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Successful!
            </h2>
            <p className="text-gray-600">
              Your Zoom account has been connected. Redirecting to dashboard...
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-gray-600 mb-4">
              {errorMessage}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        {renderStatusContent()}
      </div>
    </div>
  );
};

export default ZoomOAuthCallback;
