
import { supabase } from '@/integrations/supabase/client';

/**
 * Service for managing webinar status updates and refresh operations
 */
export class WebinarStatusService {
  /**
   * Refresh status for webinars that might have changed state
   */
  static async refreshOutdatedStatuses(connectionId: string): Promise<void> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    
    try {
      // Find webinars that might need status updates:
      // 1. Started webinars that might have ended
      // 2. Available webinars that might have started
      // 3. Webinars that haven't been synced recently
      const { data: webinars, error } = await supabase
        .from('zoom_webinars')
        .select('id, webinar_id, status, start_time, duration, synced_at')
        .eq('connection_id', connectionId)
        .or(
          `status.eq.started,status.eq.available,synced_at.lt.${oneHourAgo.toISOString()}`
        );

      if (error) {
        console.error('Failed to fetch webinars for status refresh:', error);
        return;
      }

      console.log(`Found ${webinars?.length || 0} webinars that may need status updates`);

      if (!webinars || webinars.length === 0) {
        return;
      }

      // Trigger a background sync to update these webinars
      const { error: syncError } = await supabase.functions.invoke('zoom-sync-webinars', {
        body: {
          connectionId,
          syncType: 'incremental',
          options: {
            statusRefresh: true
          }
        }
      });

      if (syncError) {
        console.error('Failed to trigger status refresh sync:', syncError);
      } else {
        console.log('Status refresh sync triggered successfully');
      }

    } catch (error) {
      console.error('Error in refreshOutdatedStatuses:', error);
    }
  }

  /**
   * Get status color and label for UI display
   */
  static getStatusDisplay(status: string | null): { color: string; label: string; variant: string } {
    switch (status?.toLowerCase()) {
      case 'available':
        return { color: 'blue', label: 'Scheduled', variant: 'outline' };
      case 'started':
        return { color: 'green', label: 'Live', variant: 'default' };
      case 'ended':
        return { color: 'gray', label: 'Completed', variant: 'secondary' };
      case 'aborted':
        return { color: 'red', label: 'Cancelled', variant: 'destructive' };
      case 'deleted':
        return { color: 'red', label: 'Deleted', variant: 'destructive' };
      case 'unavailable':
        return { color: 'gray', label: 'Unavailable', variant: 'outline' };
      default:
        return { color: 'gray', label: status || 'Unknown', variant: 'secondary' };
    }
  }

  /**
   * Predict status based on timing if actual status is not reliable
   */
  static predictStatusFromTiming(startTime: string, duration: number): string {
    const now = new Date();
    const webinarStart = new Date(startTime);
    const webinarEnd = new Date(webinarStart.getTime() + (duration * 60 * 1000));

    if (now < webinarStart) {
      return 'available'; // Future webinar
    } else if (now >= webinarStart && now <= webinarEnd) {
      return 'started'; // Should be live
    } else {
      return 'ended'; // Should be completed
    }
  }
}
