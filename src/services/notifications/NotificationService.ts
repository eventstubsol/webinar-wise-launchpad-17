
interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

export class NotificationService {
  private static toastListeners: Array<(toast: ToastNotification) => void> = [];
  private static permissionGranted = false;

  static async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    }

    return false;
  }

  static async showBrowserNotification(options: NotificationOptions): Promise<void> {
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: options.requireInteraction || false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show browser notification:', error);
    }
  }

  static showToast(toast: Omit<ToastNotification, 'id'>): void {
    const toastWithId: ToastNotification = {
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.toastListeners.forEach(listener => listener(toastWithId));
  }

  static onToast(listener: (toast: ToastNotification) => void): () => void {
    this.toastListeners.push(listener);
    return () => {
      const index = this.toastListeners.indexOf(listener);
      if (index > -1) {
        this.toastListeners.splice(index, 1);
      }
    };
  }

  static showSyncComplete(webinarCount: number, duration: string): void {
    this.showToast({
      type: 'success',
      title: 'Sync Complete',
      message: `Successfully synced ${webinarCount} webinars in ${duration}`,
      duration: 5000,
    });

    this.showBrowserNotification({
      title: 'Webinar Sync Complete',
      body: `Successfully synced ${webinarCount} webinars in ${duration}`,
      tag: 'sync-complete',
    });
  }

  static showSyncError(error: string): void {
    this.showToast({
      type: 'error',
      title: 'Sync Failed',
      message: error,
      duration: 8000,
      actions: [
        {
          label: 'Retry',
          action: () => window.location.reload(),
        },
      ],
    });

    this.showBrowserNotification({
      title: 'Webinar Sync Failed',
      body: error,
      tag: 'sync-error',
      requireInteraction: true,
    });
  }

  static showRateLimitWarning(remainingCalls: number, resetTime: string): void {
    this.showToast({
      type: 'warning',
      title: 'Rate Limit Warning',
      message: `Only ${remainingCalls} API calls remaining. Resets at ${resetTime}`,
      duration: 10000,
    });
  }
}
