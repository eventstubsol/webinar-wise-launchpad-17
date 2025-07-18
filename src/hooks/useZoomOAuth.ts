
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useZoomOAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const initiateZoomOAuth = async (returnUrl: string = '/dashboard') => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoom-oauth-init', {
        body: { returnUrl }
      });

      if (error) {
        throw new Error(error.message || 'Failed to initialize OAuth');
      }

      if (!data.success) {
        if (data.configRequired) {
          toast({
            title: "Configuration Required",
            description: data.message || 'Zoom OAuth credentials need to be configured.',
            variant: "destructive",
          });
          return { success: false, configRequired: true, data };
        }
        throw new Error(data.error || 'OAuth initialization failed');
      }

      // No need to store state in session storage anymore - it's handled in the database
      // Redirect to Zoom OAuth
      window.location.href = data.authUrl;
      return { success: true };

    } catch (error) {
      console.error('Zoom OAuth error:', error);
      toast({
        title: "OAuth Error",
        description: error instanceof Error ? error.message : 'Failed to start OAuth flow',
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    initiateZoomOAuth,
    isLoading
  };
};
