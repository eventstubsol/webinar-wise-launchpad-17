
import { ConnectionManager } from './ConnectionManager';
import { WebSocketMessage, WebSocketSubscription } from './types';

class WebSocketService {
  private static instance: WebSocketService;
  private connectionManager: ConnectionManager;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  private constructor() {
    this.connectionManager = new ConnectionManager();
  }

  public subscribe(
    channelName: string,
    callback: (message: WebSocketMessage) => void,
    subscriptionId?: string
  ): string {
    return this.connectionManager.subscribe(channelName, callback, subscriptionId);
  }

  public unsubscribe(subscriptionId: string): void {
    this.connectionManager.unsubscribe(subscriptionId);
  }

  public broadcast(channelName: string, eventName: string, data: any): void {
    this.connectionManager.broadcast(channelName, eventName, data);
  }

  public getConnectionStatus(): boolean {
    return this.connectionManager.getConnectionStatus();
  }

  public getActiveChannels(): string[] {
    return this.connectionManager.getActiveChannels();
  }

  public getSubscriptionCount(): number {
    return this.connectionManager.getSubscriptionCount();
  }

  public disconnect(): void {
    this.connectionManager.disconnect();
  }
}

export const webSocketService = WebSocketService.getInstance();
