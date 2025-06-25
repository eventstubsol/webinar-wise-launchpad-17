
import { toast } from 'sonner';

export class NotificationService {
  static showRateLimitWarning(remainingCalls: number, resetTime: string) {
    toast.warning(`Rate limit warning: Only ${remainingCalls} API calls remaining. Limit resets at ${resetTime}`);
  }

  static showSyncComplete(webinarCount: number) {
    toast.success(`Sync completed successfully! ${webinarCount} webinars synchronized.`);
  }

  static showSyncFailed(error: string) {
    toast.error(`Sync failed: ${error}`);
  }

  static showConnectionLost() {
    toast.error('Connection to Zoom lost. Please reconnect to continue syncing.');
  }

  static showConnectionRestored() {
    toast.success('Connection to Zoom restored.');
  }
}
