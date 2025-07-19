
import { toast } from 'sonner';
import { UnifiedZoomService } from './UnifiedZoomService';

interface TestResult {
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

/**
 * Simplified Zoom Connection Test Service using unified edge functions
 */
export class ZoomConnectionTestService {
  
  /**
   * Test Zoom connection
   */
  static async testConnection(connectionId: string): Promise<TestResult> {
    console.log(`🔍 Testing Zoom connection: ${connectionId}`);
    
    const startTime = Date.now();
    
    try {
      const result = await UnifiedZoomService.testConnection(connectionId);
      const responseTime = Date.now() - startTime;

      if (result.success) {
        return {
          success: true,
          message: 'Zoom connection is working properly',
          details: {
            ...result.details,
            responseTime,
            statusCode: 200
          }
        };
      } else {
        return {
          success: false,
          message: result.message || 'Connection test failed',
          details: {
            responseTime,
            statusCode: 400,
            error: result.message
          }
        };
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('Connection test error:', error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        details: {
          responseTime,
          statusCode: 500,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Show test results to user
   */
  static showTestResults(result: TestResult): void {
    if (result.success) {
      toast.success('Connection Test Successful', {
        description: `✅ ${result.message}`,
        duration: 5000,
      });
      
      console.log('🎉 Connection test passed:', result.details);
    } else {
      toast.error('Connection Test Failed', {
        description: `❌ ${result.message}`,
        duration: 7000,
      });
      
      console.error('💥 Connection test failed:', result.details);
    }
  }

  /**
   * Run comprehensive connection test
   */
  static async runComprehensiveTest(connectionId: string): Promise<{
    success: boolean;
    summary: string;
    details: any;
  }> {
    console.log(`🔍 Running comprehensive test for connection: ${connectionId}`);
    
    try {
      const connectionTest = await this.testConnection(connectionId);
      
      const summary = connectionTest.success 
        ? '✅ All tests passed - Your Zoom connection is healthy'
        : '❌ Connection issues detected - Please check your Zoom credentials';

      return {
        success: connectionTest.success,
        summary,
        details: {
          connectionTest: connectionTest.details,
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Comprehensive test error:', error);
      
      return {
        success: false,
        summary: '❌ Test failed due to system error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
