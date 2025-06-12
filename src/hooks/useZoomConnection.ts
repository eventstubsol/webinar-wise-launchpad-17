
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
      // Poll more frequently when disconnected
      return data ? 30000 : 5000; // 30s when connected, 5s when disconnected
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
