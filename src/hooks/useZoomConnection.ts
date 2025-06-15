
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';

export const useZoomConnection = () => {
  const { user } = useAuth();

  const {
    data: connection,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['zoom-connection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      try {
        return await ZoomConnectionService.getPrimaryConnection(user.id);
      } catch (error) {
        console.error('Error fetching zoom connection:', error);
        // Return null instead of throwing to prevent query from being stuck in error state
        return null;
      }
    },
    enabled: !!user?.id,
    refetchInterval: (data, query) => {
      // If we have a connection, check less frequently
      // If there's an error or no connection, check more frequently but with backoff
      if (query.state.error) {
        return false; // Don't auto-refetch on errors
      }
      return data ? 60000 : 30000; // 60s when connected, 30s when disconnected
    },
    retry: (failureCount, error) => {
      // Don't retry aggressively on connection errors
      if (failureCount >= 2) {
        return false;
      }
      
      // Don't retry on token decryption errors
      if (error && typeof error === 'object' && 'code' in error && error.code === 'DECRYPTION_FAILED') {
        return false;
      }
      
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 30000, // Consider data stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  const isConnected = !!connection && !ZoomConnectionService.isTokenExpired(connection.token_expires_at);
  const isExpired = !!connection && ZoomConnectionService.isTokenExpired(connection.token_expires_at);

  return {
    connection,
    isConnected,
    isExpired,
    isLoading,
    error,
    refetch,
  };
};
