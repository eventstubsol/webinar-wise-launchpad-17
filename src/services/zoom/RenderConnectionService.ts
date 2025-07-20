
import { ZoomConnection } from '@/types/zoom';
import { TokenStatus } from './utils/tokenUtils';

interface ConnectionHealthCheck {
  success: boolean;
  status: 'connected' | 'disconnected' | 'invalid_token' | 'expired_token' | 'error';
  message: string;
  details?: any;
  timestamp: string;
}

interface TokenRefreshResult {
  success: boolean;
  connection?: ZoomConnection;
  error?: string;
  newTokenExpiresAt?: string;
}

export class RenderConnectionService {
  private static readonly RENDER_API_BASE = 'https://zoom-backend-service.onrender.com';

  // Token Management Operations
  static async refreshToken(connectionId: string): Promise<TokenRefreshResult> {
    try {
      const response = await fetch(`${this.RENDER_API_BASE}/api/zoom/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        connection: result.connection,
        newTokenExpiresAt: result.newTokenExpiresAt,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async refreshTokenSilently(connectionId: string): Promise<boolean> {
    try {
      const result = await this.refreshToken(connectionId);
      return result.success;
    } catch (error) {
      console.error('Silent token refresh failed:', error);
      return false;
    }
  }

  // Connection Testing
  static async testConnection(connectionId: string): Promise<ConnectionHealthCheck> {
    try {
      const response = await fetch(`${this.RENDER_API_BASE}/api/zoom/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: result.success,
        status: result.status,
        message: result.message,
        details: result.details,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Connection test error:', error);
      return {
        success: false,
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection test failed',
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Connection Status Management
  static async checkConnectionHealth(connectionId: string): Promise<{
    isHealthy: boolean;
    status: TokenStatus;
    details: any;
  }> {
    try {
      const response = await fetch(`${this.RENDER_API_BASE}/api/zoom/connection-health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        isHealthy: result.isHealthy,
        status: result.tokenStatus || TokenStatus.INVALID,
        details: result.details,
      };
    } catch (error) {
      console.error('Connection health check error:', error);
      return {
        isHealthy: false,
        status: TokenStatus.INVALID,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  // Auto-recovery mechanisms
  static async attemptConnectionRecovery(connectionId: string): Promise<{
    success: boolean;
    recoverySteps: string[];
    finalStatus: string;
  }> {
    const recoverySteps: string[] = [];
    
    try {
      // Step 1: Check current status
      recoverySteps.push('Checking connection status...');
      const healthCheck = await this.checkConnectionHealth(connectionId);
      
      if (healthCheck.isHealthy) {
        recoverySteps.push('Connection is already healthy');
        return {
          success: true,
          recoverySteps,
          finalStatus: 'healthy',
        };
      }

      // Step 2: Attempt token refresh
      recoverySteps.push('Attempting token refresh...');
      const refreshResult = await this.refreshToken(connectionId);
      
      if (refreshResult.success) {
        recoverySteps.push('Token refresh successful');
        
        // Step 3: Verify connection after refresh
        recoverySteps.push('Verifying connection...');
        const verifyResult = await this.testConnection(connectionId);
        
        if (verifyResult.success) {
          recoverySteps.push('Connection recovery successful');
          return {
            success: true,
            recoverySteps,
            finalStatus: 'recovered',
          };
        }
      }

      recoverySteps.push('Recovery failed - manual intervention required');
      return {
        success: false,
        recoverySteps,
        finalStatus: 'requires_manual_fix',
      };
    } catch (error) {
      recoverySteps.push(`Recovery error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        success: false,
        recoverySteps,
        finalStatus: 'error',
      };
    }
  }

  // Real-time health monitoring
  static async startHealthMonitoring(connectionId: string, callback: (status: ConnectionHealthCheck) => void): Promise<() => void> {
    const interval = setInterval(async () => {
      const health = await this.checkConnectionHealth(connectionId);
      callback({
        success: health.isHealthy,
        status: health.isHealthy ? 'connected' : 'error',
        message: health.isHealthy ? 'Connection healthy' : 'Connection issues detected',
        details: health.details,
        timestamp: new Date().toISOString(),
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }
}
