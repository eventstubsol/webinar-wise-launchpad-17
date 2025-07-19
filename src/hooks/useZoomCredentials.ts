
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ZoomCredentialsService } from '@/services/zoom/ZoomCredentialsService';
import { ZoomCredentialsInsert, ZoomCredentialsUpdate } from '@/types/zoomCredentials';

export const useZoomCredentials = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: credentials,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['zoom-credentials', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await ZoomCredentialsService.getActiveCredentials(user.id);
    },
    enabled: !!user?.id,
  });

  const createCredentialsMutation = useMutation({
    mutationFn: (data: ZoomCredentialsInsert) => 
      ZoomCredentialsService.createCredentials(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom-credentials'] });
    },
  });

  const updateCredentialsMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ZoomCredentialsUpdate }) =>
      ZoomCredentialsService.updateCredentials(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom-credentials'] });
    },
  });

  const deleteCredentialsMutation = useMutation({
    mutationFn: (id: string) => ZoomCredentialsService.deleteCredentials(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zoom-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['zoom-connection'] });
    },
  });

  const hasCredentials = !!credentials;

  return {
    credentials,
    hasCredentials,
    isLoading,
    error,
    refetch,
    createCredentials: createCredentialsMutation.mutate,
    updateCredentials: updateCredentialsMutation.mutate,
    deleteCredentials: deleteCredentialsMutation.mutate,
    isCreating: createCredentialsMutation.isPending,
    isUpdating: updateCredentialsMutation.isPending,
    isDeleting: deleteCredentialsMutation.isPending,
  };
};
