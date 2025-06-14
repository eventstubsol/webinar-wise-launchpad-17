
import { supabase } from '@/integrations/supabase/client';
import { WebSocketMessage, WebSocketSubscription } from './types';

export class ConnectionManager {
  private subscriptions = new Map<string, WebSocketSubscription>();
  private channels = new Map<string, any>();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Temporarily disable automatic health checking to prevent infinite recursion
    // this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    // Monitor connection status through subscription callbacks
    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 30000); // Check every 30 seconds
  }

  private checkConnectionHealth() {
    // Simplified health check without creating test channels to prevent recursion
    // Just check if we have active channels as a proxy for connection health
    this.isConnected = this.channels.size > 0;
  }

  private handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++;
      this.reconnectAllChannels();
    }, delay);
  }

  private async reconnectAllChannels() {
    console.log('Attempting to reconnect all channels...');
    
    const currentSubscriptions = Array.from(this.subscriptions.values());
    
    // Clean up existing channels
    this.channels.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('Error removing channel during reconnect:', error);
      }
    });
    this.channels.clear();

    // Recreate subscriptions
    for (const subscription of currentSubscriptions) {
      try {
        this.subscribe(subscription.channel, subscription.callback, subscription.id);
      } catch (error) {
        console.error('Error recreating subscription:', error);
      }
    }
  }

  public subscribe(
    channelName: string,
    callback: (message: WebSocketMessage) => void,
    subscriptionId?: string
  ): string {
    const id = subscriptionId || `${channelName}-${Date.now()}-${Math.random()}`;

    this.subscriptions.set(id, {
      id,
      channel: channelName,
      callback,
    });

    try {
      if (!this.channels.has(channelName)) {
        const channel = supabase.channel(channelName);
        this.channels.set(channelName, channel);
      }

      const channel = this.channels.get(channelName);
      this.setupChannelSubscriptions(channel, channelName, callback);

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to ${channelName}`);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Failed to subscribe to ${channelName}`);
          this.isConnected = false;
          this.handleReconnection();
        }
      });
    } catch (error) {
      console.error('Error setting up subscription:', error);
    }

    return id;
  }

  private setupChannelSubscriptions(channel: any, channelName: string, callback: (message: WebSocketMessage) => void) {
    if (channelName.startsWith('analytics-')) {
      this.setupAnalyticsSubscription(channel, callback);
    } else if (channelName.startsWith('processing-')) {
      this.setupProcessingSubscription(channel, callback);
    } else if (channelName.startsWith('webinar-')) {
      this.setupWebinarSubscription(channel, callback);
    } else {
      this.setupGenericSubscription(channel, callback);
    }
  }

  private setupAnalyticsSubscription(channel: any, callback: (message: WebSocketMessage) => void) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'analytics_cache',
      },
      (payload: any) => {
        callback({
          type: 'cache_update',
          data: payload,
          timestamp: new Date().toISOString(),
        });
      }
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'realtime_events',
      },
      (payload: any) => {
        callback({
          type: 'realtime_event',
          data: payload.new,
          timestamp: new Date().toISOString(),
        });
      }
    );
  }

  private setupProcessingSubscription(channel: any, callback: (message: WebSocketMessage) => void) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'processing_queue',
      },
      (payload: any) => {
        callback({
          type: 'processing_update',
          data: payload,
          timestamp: new Date().toISOString(),
        });
      }
    );
  }

  private setupWebinarSubscription(channel: any, callback: (message: WebSocketMessage) => void) {
    const tables = ['zoom_participants', 'zoom_polls', 'zoom_poll_responses', 'zoom_qna'];
    
    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        (payload: any) => {
          callback({
            type: 'webinar_data_update',
            data: { table, ...payload },
            timestamp: new Date().toISOString(),
          });
        }
      );
    });
  }

  private setupGenericSubscription(channel: any, callback: (message: WebSocketMessage) => void) {
    channel.on('broadcast', { event: '*' }, (payload: any) => {
      callback({
        type: 'broadcast',
        data: payload,
        timestamp: new Date().toISOString(),
      });
    });
  }

  public unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);

    const channelStillInUse = Array.from(this.subscriptions.values())
      .some(sub => sub.channel === subscription.channel);

    if (!channelStillInUse) {
      const channel = this.channels.get(subscription.channel);
      if (channel) {
        try {
          supabase.removeChannel(channel);
          this.channels.delete(subscription.channel);
        } catch (error) {
          console.warn('Error removing channel during unsubscribe:', error);
        }
      }
    }
  }

  public broadcast(channelName: string, eventName: string, data: any): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      try {
        channel.send({
          type: 'broadcast',
          event: eventName,
          payload: data,
        });
      } catch (error) {
        console.error('Error broadcasting message:', error);
      }
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  public getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  public getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.healthCheckInterval) {
      clearTimeout(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.channels.forEach(channel => {
      try {
        supabase.removeChannel(channel);
      } catch (error) {
        console.warn('Error removing channel during disconnect:', error);
      }
    });

    this.channels.clear();
    this.subscriptions.clear();
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }
}
