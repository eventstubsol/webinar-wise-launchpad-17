
import { supabase } from '@/integrations/supabase/client';
import { WebSocketMessage, WebSocketSubscription } from './types';

export class ConnectionManager {
  private subscriptions = new Map<string, WebSocketSubscription>();
  private channels = new Map<string, any>();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Removed automatic health checking to prevent infinite recursion
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
    
    // Clean up existing channels first
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

    // Check if we already have this subscription
    if (this.subscriptions.has(id)) {
      console.warn(`Subscription ${id} already exists, returning existing ID`);
      return id;
    }

    this.subscriptions.set(id, {
      id,
      channel: channelName,
      callback,
    });

    try {
      // Check if channel already exists and is subscribed
      let channel = this.channels.get(channelName);
      
      if (!channel) {
        // Create new channel only if it doesn't exist
        channel = supabase.channel(channelName);
        this.channels.set(channelName, channel);
        
        // Set up channel subscriptions
        this.setupChannelSubscriptions(channel, channelName, callback);

        // Subscribe to the channel only once
        channel.subscribe((status: string) => {
          console.log(`Channel ${channelName} status:`, status);
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
      } else {
        // Channel exists, just add the callback to existing subscriptions
        console.log(`Channel ${channelName} already exists, reusing it`);
      }
    } catch (error) {
      console.error('Error setting up subscription:', error);
      this.subscriptions.delete(id);
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
    } else if (channelName.startsWith('sync-')) {
      this.setupSyncSubscription(channel, callback);
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

  private setupSyncSubscription(channel: any, callback: (message: WebSocketMessage) => void) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'zoom_sync_logs',
      },
      (payload: any) => {
        callback({
          type: 'sync_update',
          data: payload,
          timestamp: new Date().toISOString(),
        });
      }
    );
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

    // Check if any other subscriptions are using this channel
    const channelStillInUse = Array.from(this.subscriptions.values())
      .some(sub => sub.channel === subscription.channel);

    if (!channelStillInUse) {
      const channel = this.channels.get(subscription.channel);
      if (channel) {
        try {
          supabase.removeChannel(channel);
          this.channels.delete(subscription.channel);
          console.log(`Removed unused channel: ${subscription.channel}`);
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
