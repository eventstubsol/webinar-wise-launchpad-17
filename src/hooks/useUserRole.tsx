import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserRole {
  role: 'owner' | 'admin' | 'member';
  isZoomAdmin: boolean;
  canViewAllUsers: boolean;
}

export const useUserRole = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>({
    role: 'member',
    isZoomAdmin: false,
    canViewAllUsers: false
  });

  useEffect(() => {
    if (user && profile) {
      fetchUserRole();
    }
  }, [user, profile]);

  const fetchUserRole = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // First check if we already have role information in the profile
      if (profile?.role && profile?.is_zoom_admin !== undefined) {
        setUserRole({
          role: profile.role as 'owner' | 'admin' | 'member',
          isZoomAdmin: profile.is_zoom_admin,
          canViewAllUsers: profile.is_zoom_admin
        });
        return;
      }

      // If not, sync with Zoom to get the latest role information
      const { data, error } = await supabase.functions.invoke('sync-zoom-user-role', {
        body: { userId: user.id }
      });

      if (error) {
        console.error('Error syncing user role:', error);
        // Don't show error toast for role sync, just use default role
        return;
      }

      if (data?.success) {
        setUserRole({
          role: data.role || 'member',
          isZoomAdmin: data.isAdmin || false,
          canViewAllUsers: data.isAdmin || false
        });
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRole = async () => {
    await fetchUserRole();
  };

  return {
    ...userRole,
    loading,
    refreshRole
  };
};
