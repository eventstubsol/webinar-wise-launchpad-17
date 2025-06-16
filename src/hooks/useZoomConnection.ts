
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ZoomConnectionService } from '@/services/zoom/ZoomConnectionService';
import { TokenUtils, TokenStatus } from '@/services/zoom/utils/tokenUtils';

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
        return null;
      }
    },
    enabled: !!user?.id,
    refetchInterval: (query) => {
      if (query.state.error) {
        return false;
      }
      return query.state.data ? 60000 : 30000;
    },
    retry: (failureCount, error) => {
      if (failureCount >= 2) {
        return false;
      }
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  const tokenStatus = connection ? TokenUtils.getTokenStatus(connection) : TokenStatus.NO_CONNECTION;
  const isTokenValid = tokenStatus === TokenStatus.VALID;
  const isConnected = tokenStatus === TokenStatus.VALID || tokenStatus === TokenStatus.ACCESS_EXPIRED;
  const isExpired = tokenStatus === TokenStatus.REFRESH_EXPIRED || tokenStatus === TokenStatus.INVALID;

  return {
    connection,
    isLoading,
    error,
    refetch,
    tokenStatus,
    isTokenValid,
    isConnected,
    isExpired,
  };
};
