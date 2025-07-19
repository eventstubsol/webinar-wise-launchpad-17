import { supabase } from '@/integrations/supabase/client';

export const syncUserRole = async (userId: string): Promise<void> => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-zoom-user-role', {
      body: { userId }
    });

    if (error) {
      console.error('Error syncing user role:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to sync user role:', error);
    throw error;
  }
};

export const checkAndSyncAdminStatus = async (): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if we already have role information
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_zoom_admin')
      .eq('id', user.id)
      .single();

    // If role is already set and is admin, return true
    if (profile?.is_zoom_admin) {
      return true;
    }

    // Otherwise, sync with Zoom to get latest role
    await syncUserRole(user.id);

    // Re-fetch profile to get updated role
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('role, is_zoom_admin')
      .eq('id', user.id)
      .single();

    return updatedProfile?.is_zoom_admin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};
