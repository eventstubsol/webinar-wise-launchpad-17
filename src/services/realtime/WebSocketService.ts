
import { supabase } from '@/integrations/supabase/client';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  channel?: string;
}

export interface WebSocketSubscription {
  id: string;
  channel: string;
  callback: (message: WebSocketMessage) => void;
}

class WebSocketService {
  private static instance: WebSocketService;
  private subscriptions = new Map<string, WebSocketSubscription>();
  private channels = new Map<string, any>();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private constructor() {
    this.setupGlobalErrorHandling();
  }

  private setupGlobalErrorHandling() {
    // Handle connection status changes
    supabase.realtime.onConnectionStateChange((state) => {
      this.isConnected = state === 'connected';
      
      if (state === 'disconnected' || state === 'error') {
        this.handleReconnection();
      } else if (state === 'connected') {
        this.reconnectAttempts = 0;
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      }
    });
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
    
    // Store current subscriptions
    const currentSubscriptions = Array.from(this.subscriptions.values());
    
    // Clear existing channels
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();

    // Recreate subscriptions
    for (const subscription of currentSubscriptions) {
      this.subscribe(subscription.channel, subscription.callback, subscription.id);
    }
  }

  public subscribe(
    channelName: string,
    callback: (message: WebSocketMessage) => void,
    subscriptionId?: string
  ): string {
    const id = subscriptionId || `${channelName}-${Date.now()}-${Math.random()}`;

    // Store subscription
    this.subscriptions.set(id, {
      id,
      channel: channelName,
      callback,
    });

    // Create or get existing channel
    if (!this.channels.has(channelName)) {
      const channel = supabase.channel(channelName);
      this.channels.set(channelName, channel);
    }

    const channel = this.channels.get(channelName);

    // Subscribe to different types of events based on channel name
    if (channelName.startsWith('analytics-')) {
      this.setupAnalyticsSubscription(channel, callback);
    } else if (channelName.startsWith('processing-')) {
      this.setupProcessingSubscription(channel, callback);
    } else if (channelName.startsWith('webinar-')) {
      this.setupWebinarSubscription(channel, callback);
    } else {
      this.setupGenericSubscription(channel, callback);
    }

    // Subscribe to the channel
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        console.log(`Successfully subscribed to ${channelName}`);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`Failed to subscribe to ${channelName}`);
        this.handleReconnection();
      }
    });

    return id;
  }

  private setupAnalyticsSubscription(channel: any, callback: (message: WebSocketMessage) => void) {
    // Listen to analytics cache updates
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

    // Listen to realtime events
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
    // Listen to processing queue updates
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
    // Listen to various webinar-related updates
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
    // Generic subscription for custom events
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

    // Check if any other subscriptions use this channel
    const channelStillInUse = Array.from(this.subscriptions.values())
      .some(sub => sub.channel === subscription.channel);

    if (!channelStillInUse) {
      const channel = this.channels.get(subscription.channel);
      if (channel) {
        supabase.removeChannel(channel);
        this.channels.delete(subscription.channel);
      }
    }
  }

  public broadcast(channelName: string, eventName: string, data: any): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: eventName,
        payload: data,
      });
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
    // Clear reconnection timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Remove all channels
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });

    // Clear data structures
    this.channels.clear();
    this.subscriptions.clear();
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }
}

export const webSocketService = WebSocketService.getInstance();
