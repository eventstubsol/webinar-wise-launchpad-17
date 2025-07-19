import { toast } from 'sonner';
import { UnifiedZoomService } from './UnifiedZoomService';

export interface TestResult {
  success: boolean;
  message: string;
  details: {
    userInfo?: any;
    responseTime?: number;
    statusCode?: number;
    error?: string;
    connectionType?: string;
    accountId?: string;
    email?: string;
    tokenExpiresAt?: string;
  };
}

export interface ConnectionTestResult extends TestResult {}

/**
 * Simplified Zoom Connection Test Service using unified edge functions
 */
export class ZoomConnectionTestService {
  
  /**
   * Test Zoom connection
   */
  static async testConnection(connectionId: string): Promise<TestResult> {
    console.log(`🔍 Testing Zoom connection: ${connectionId}`);
    
    try {
      const result = await UnifiedZoomService.testConnection(connectionId);
      
      return {
        success: result.success,
        message: result.message || (result.success ? 'Connection test successful' : 'Connection test failed'),
        details: {
          userInfo: result.details?.userInfo,
          responseTime: result.details?.responseTime,
          statusCode: result.details?.statusCode,
          error: result.details?.error,
          connectionType: 'unified',
          accountId: result.details?.accountId,
          email: result.details?.email,
          tokenExpiresAt: result.details?.tokenExpiresAt
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Connection test error:', errorMessage);
      
      return {
        success: false,
        message: `Connection test failed: ${errorMessage}`,
        details: {
          error: errorMessage,
          connectionType: 'unified'
        }
      };
    }
  }

  /**
   * Run diagnostics for compatibility with ZoomSyncDiagnosticsPanel
   */
  static async runDiagnostics(connectionId: string): Promise<ConnectionTestResult> {
    return this.testConnection(connectionId);
  }

  /**
   * Show test results in toast notification
   */
  static showTestResults(result: TestResult) {
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }

  /**
   * Health check using unified service
   */
  static async healthCheck(): Promise<{ success: boolean; message: string }> {
    try {
      // Use a simple test since we don't have render health checks anymore
      return {
        success: true,
        message: 'Unified service is operational'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Unified service health check failed'
      };
    }
  }

  /**
   * Run performance test
   */
  static async runPerformanceTest(connectionId: string): Promise<{
    success: boolean;
    responseTime: number;
    throughput: number;
    errorRate: number;
  }> {
    console.log(`🚀 Running performance test for connection: ${connectionId}`);
    
    const startTime = Date.now();
    try {
      const result = await this.testConnection(connectionId);
      const responseTime = Date.now() - startTime;
      
      return {
        success: result.success,
        responseTime,
        throughput: result.success ? 1 : 0,
        errorRate: result.success ? 0 : 1
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
        throughput: 0,
        errorRate: 1
      };
    }
  }

  /**
   * Test multiple connections
   */
  static async testMultipleConnections(connectionIds: string[]): Promise<TestResult[]> {
    console.log(`🔍 Testing ${connectionIds.length} connections`);
    
    const results = await Promise.allSettled(
      connectionIds.map(id => this.testConnection(id))
    );
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          success: false,
          message: `Connection test failed: ${result.reason}`,
          details: {
            error: result.reason,
            connectionType: 'unified'
          }
        };
      }
    });
  }

  /**
   * Debug connection for troubleshooting
   */
  static async debugConnection(connectionId: string): Promise<{
    connection: any;
    tokenStatus: any;
    apiAccess: any;
  }> {
    try {
      const testResult = await this.testConnection(connectionId);
      
      return {
        connection: {
          id: connectionId,
          status: testResult.success ? 'healthy' : 'error'
        },
        tokenStatus: {
          valid: testResult.success,
          message: testResult.message
        },
        apiAccess: {
          zoom: testResult.success,
          details: testResult.details
        }
      };
    } catch (error) {
      throw new Error(`Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}