
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NotificationService } from '@/services/notifications/NotificationService';

interface RateLimitData {
  id: string;
  api_calls_made: number;
  api_calls_limit: number;
  reset_time: string;
  warning_threshold: number;
  updated_at: string;
}

export const useRateLimitMonitor = (connectionId: string, userId: string) => {
  const [rateLimitData, setRateLimitData] = useState<RateLimitData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRateLimitData = async () => {
    if (!connectionId || !userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rateLimitError } = await supabase
        .from('rate_limit_tracking')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (rateLimitError) throw rateLimitError;

      if (data) {
        setRateLimitData(data);
        
        // Check if we should show a warning
        const usagePercentage = (data.api_calls_made / data.api_calls_limit) * 100;
        if (usagePercentage >= data.warning_threshold) {
          const remainingCalls = data.api_calls_limit - data.api_calls_made;
          const resetTime = new Date(data.reset_time).toLocaleTimeString();
          
          NotificationService.showRateLimitWarning(remainingCalls, resetTime);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rate limit data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRateLimitData();

    // Set up real-time subscription for rate limit updates
    const channel = supabase
      .channel(`rate-limit-${connectionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rate_limit_tracking',
          filter: `connection_id=eq.${connectionId}`,
        },
        () => {
          loadRateLimitData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [connectionId, userId]);

  const getUsagePercentage = () => {
    if (!rateLimitData) return 0;
    return (rateLimitData.api_calls_made / rateLimitData.api_calls_limit) * 100;
  };

  const getRemainingCalls = () => {
    if (!rateLimitData) return 0;
    return Math.max(0, rateLimitData.api_calls_limit - rateLimitData.api_calls_made);
  };

  const getTimeUntilReset = () => {
    if (!rateLimitData) return null;
    const resetTime = new Date(rateLimitData.reset_time);
    const now = new Date();
    const diffMs = resetTime.getTime() - now.getTime();
    return Math.max(0, diffMs);
  };

  const canSync = () => {
    return getRemainingCalls() > 10; // Keep a buffer
  };

  return {
    rateLimitData,
    isLoading,
    error,
    getUsagePercentage,
    getRemainingCalls,
    getTimeUntilReset,
    canSync,
    refreshRateLimit: loadRateLimitData,
  };
};
