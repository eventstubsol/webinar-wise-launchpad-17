
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
      return await ZoomConnectionService.getPrimaryConnection(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: (data) => {
      // If we have a connection, check less frequently
      // If no connection, only poll occasionally to avoid spam
      return data ? 30000 : 60000; // 30s when connected, 60s when disconnected
    },
    retry: (failureCount, error) => {
      // Don't retry on 406 errors, they're expected when no connection exists
      if (error && typeof error === 'object' && 'status' in error && error.status === 406) {
        return false;
      }
      return failureCount < 2;
    },
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
