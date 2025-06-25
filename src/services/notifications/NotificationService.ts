
import { toast } from 'sonner';

export class NotificationService {
  static showRateLimitWarning(remainingCalls: number, resetTime: string) {
    toast.warning(`Rate limit warning: Only ${remainingCalls} API calls remaining. Limit resets at ${resetTime}`);
  }

  static showSyncComplete(webinarCount: number, duration?: string) {
    const message = duration 
      ? `Sync completed successfully! ${webinarCount} webinars synchronized in ${duration}.`
      : `Sync completed successfully! ${webinarCount} webinars synchronized.`;
    toast.success(message);
  }

  static showSyncFailed(error: string) {
    toast.error(`Sync failed: ${error}`);
  }

  static showSyncError(error: string) {
    toast.error(`Sync error: ${error}`);
  }

  static showConnectionLost() {
    toast.error('Connection to Zoom lost. Please reconnect to continue syncing.');
  }

  static showConnectionRestored() {
    toast.success('Connection to Zoom restored.');
  }

  // Browser notification methods
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  static showBrowserNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission === 'granted') {
      return new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }
    return null;
  }

  // Toast notification callback system
  private static toastCallbacks: Array<(type: string, message: string) => void> = [];

  static onToast(callback: (type: string, message: string) => void) {
    this.toastCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.toastCallbacks.indexOf(callback);
      if (index > -1) {
        this.toastCallbacks.splice(index, 1);
      }
    };
  }

  private static notifyToastCallbacks(type: string, message: string) {
    this.toastCallbacks.forEach(callback => {
      try {
        callback(type, message);
      } catch (error) {
        console.error('Error in toast callback:', error);
      }
    });
  }

  // Enhanced notification methods that trigger callbacks
  static showInfo(message: string) {
    toast.info(message);
    this.notifyToastCallbacks('info', message);
  }

  static showSuccess(message: string) {
    toast.success(message);
    this.notifyToastCallbacks('success', message);
  }

  static showWarning(message: string) {
    toast.warning(message);
    this.notifyToastCallbacks('warning', message);
  }

  static showError(message: string) {
    toast.error(message);
    this.notifyToastCallbacks('error', message);
  }
}
