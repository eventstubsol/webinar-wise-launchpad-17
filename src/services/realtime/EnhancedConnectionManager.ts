
import { supabase } from '@/integrations/supabase/client';

export interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
  pingTime?: number;
  lastCheck: string;
  consecutiveFailures: number;
  uptime: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ConnectionMetrics {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  averagePingTime: number;
  uptimePercentage: number;
  lastFailure?: string;
}

export class EnhancedConnectionManager {
  private static instance: EnhancedConnectionManager;
  private connectionStartTime = Date.now();
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private connectionHealth: ConnectionHealth = {
    status: 'disconnected',
    lastCheck: new Date().toISOString(),
    consecutiveFailures: 0,
    uptime: 0,
    quality: 'poor'
  };
  private listeners: ((health: ConnectionHealth) => void)[] = [];

  static getInstance(): EnhancedConnectionManager {
    if (!this.instance) {
      this.instance = new EnhancedConnectionManager();
    }
    return this.instance;
  }

  async startHealthMonitoring(): Promise<void> {
    // Initial health check
    await this.performHealthCheck();
    
    // Start periodic health checks every 30 seconds
    this.pingInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
  }

  stopHealthMonitoring(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Perform a simple query to test connection
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      const pingTime = Date.now() - startTime;
      
      if (error) {
        this.handleConnectionFailure('Database query failed', pingTime);
      } else {
        this.handleConnectionSuccess(pingTime);
      }
    } catch (error) {
      this.handleConnectionFailure(error instanceof Error ? error.message : 'Unknown error', Date.now() - startTime);
    }
  }

  private handleConnectionSuccess(pingTime: number): void {
    this.reconnectAttempts = 0;
    const uptime = Date.now() - this.connectionStartTime;
    
    this.connectionHealth = {
      status: this.determineStatus(pingTime),
      pingTime,
      lastCheck: new Date().toISOString(),
      consecutiveFailures: 0,
      uptime,
      quality: this.determineQuality(pingTime)
    };

    this.logConnectionHealth('success', pingTime);
    this.notifyListeners();
  }

  private handleConnectionFailure(error: string, pingTime: number): void {
    this.connectionHealth.consecutiveFailures++;
    this.connectionHealth.status = 'unhealthy';
    this.connectionHealth.lastCheck = new Date().toISOString();
    this.connectionHealth.quality = 'poor';

    this.logConnectionHealth('failure', pingTime, error);
    this.notifyListeners();

    // Attempt reconnection with exponential backoff
    this.attemptReconnection(error);
  }

  private async attemptReconnection(lastError: string): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.connectionHealth.status = 'disconnected';
      this.notifyListeners();
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    setTimeout(async () => {
      await this.performHealthCheck();
    }, delay);
  }

  private determineStatus(pingTime: number): ConnectionHealth['status'] {
    if (pingTime < 100) return 'healthy';
    if (pingTime < 500) return 'healthy';
    if (pingTime < 2000) return 'degraded';
    return 'unhealthy';
  }

  private determineQuality(pingTime: number): ConnectionHealth['quality'] {
    if (pingTime < 100) return 'excellent';
    if (pingTime < 300) return 'good';
    if (pingTime < 1000) return 'fair';
    return 'poor';
  }

  private async logConnectionHealth(status: 'success' | 'failure', pingTime: number, error?: string): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      await supabase
        .from('connection_health_log')
        .insert({
          user_id: user.user.id,
          connection_type: 'supabase',
          status,
          ping_time_ms: pingTime,
          error_message: error,
          metrics: {
            consecutiveFailures: this.connectionHealth.consecutiveFailures,
            reconnectAttempts: this.reconnectAttempts,
            uptime: this.connectionHealth.uptime
          }
        });
    } catch (logError) {
      console.error('Failed to log connection health:', logError);
    }
  }

  async getConnectionMetrics(days: number = 7): Promise<ConnectionMetrics> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: logs, error } = await supabase
        .from('connection_health_log')
        .select('*')
        .eq('user_id', user.user.id)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false });

      if (error) throw error;

      const totalConnections = logs?.length || 0;
      const successfulConnections = logs?.filter(log => log.status === 'success').length || 0;
      const failedConnections = totalConnections - successfulConnections;
      const averagePingTime = logs?.reduce((sum, log) => sum + (log.ping_time_ms || 0), 0) / totalConnections || 0;
      const uptimePercentage = totalConnections > 0 ? (successfulConnections / totalConnections) * 100 : 0;
      const lastFailure = logs?.find(log => log.status === 'failure')?.recorded_at;

      return {
        totalConnections,
        successfulConnections,
        failedConnections,
        averagePingTime: Math.round(averagePingTime),
        uptimePercentage: Math.round(uptimePercentage * 100) / 100,
        lastFailure
      };
    } catch (error) {
      console.error('Failed to get connection metrics:', error);
      return {
        totalConnections: 0,
        successfulConnections: 0,
        failedConnections: 0,
        averagePingTime: 0,
        uptimePercentage: 0
      };
    }
  }

  getConnectionHealth(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  onHealthChange(callback: (health: ConnectionHealth) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.connectionHealth);
      } catch (error) {
        console.error('Error in connection health listener:', error);
      }
    });
  }
}

export const connectionManager = EnhancedConnectionManager.getInstance();
