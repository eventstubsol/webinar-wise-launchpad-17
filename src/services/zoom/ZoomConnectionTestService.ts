
import { RenderZoomService } from './RenderZoomService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    userInfo?: any;
    responseTime?: number;
    statusCode?: number;
    error?: string;
    renderServiceStatus?: string;
    zoomApiStatus?: string;
    databaseStatus?: string;
    connectionData?: any;
  };
}

export class ZoomConnectionTestService {
  /**
   * Test Zoom connection with detailed diagnostics
   */
  static async testConnection(connectionId: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [ConnectionTest] Testing connection: ${connectionId}`);
      
      // First test the Render service health
      const healthCheck = await RenderZoomService.healthCheck();
      if (!healthCheck.success) {
        return {
          success: false,
          message: 'Render service is not available',
          details: { error: healthCheck.error }
        };
      }

      // Test the actual Zoom connection
      const testResult = await RenderZoomService.testConnection(connectionId);
      const responseTime = Date.now() - startTime;
      
      if (testResult.success) {
        console.log(`✅ [ConnectionTest] Connection test successful in ${responseTime}ms`);
        return {
          success: true,
          message: 'Zoom connection is working properly',
          details: {
            userInfo: testResult.data,
            responseTime,
            statusCode: 200
          }
        };
      } else {
        console.error(`❌ [ConnectionTest] Connection test failed:`, testResult.error);
        return {
          success: false,
          message: testResult.error || 'Connection test failed',
          details: {
            responseTime,
            statusCode: (testResult as any).statusCode || 500,
            error: testResult.error
          }
        };
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`💥 [ConnectionTest] Test error:`, error);
      
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  /**
   * Run comprehensive diagnostics on the connection
   */
  static async runDiagnostics(connectionId: string): Promise<{
    renderService: ConnectionTestResult;
    zoomApi: ConnectionTestResult;
    database: ConnectionTestResult;
    overall: ConnectionTestResult;
  }> {
    console.log(`🔬 [Diagnostics] Running comprehensive diagnostics for connection: ${connectionId}`);
    
    // Test Render service
    const renderService = await this.testRenderService();
    
    // Test Zoom API connection
    const zoomApi = await this.testConnection(connectionId);
    
    // Test database connectivity
    const database = await this.testDatabaseConnection(connectionId);
    
    // Overall assessment
    const allTestsPassed = renderService.success && zoomApi.success && database.success;
    const overall: ConnectionTestResult = {
      success: allTestsPassed,
      message: allTestsPassed 
        ? 'All systems operational' 
        : 'One or more systems have issues',
      details: {
        renderServiceStatus: renderService.success ? 'OK' : 'FAILED',
        zoomApiStatus: zoomApi.success ? 'OK' : 'FAILED',
        databaseStatus: database.success ? 'OK' : 'FAILED'
      }
    };

    return { renderService, zoomApi, database, overall };
  }

  private static async testRenderService(): Promise<ConnectionTestResult> {
    try {
      const result = await RenderZoomService.healthCheck();
      return {
        success: result.success,
        message: result.success ? 'Render service is healthy' : 'Render service is unavailable',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to reach Render service',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private static async testDatabaseConnection(connectionId: string): Promise<ConnectionTestResult> {
    try {
      const { data, error } = await supabase
        .from('zoom_connections')
        .select('id, zoom_email, connection_status')
        .eq('id', connectionId)
        .single();

      if (error) {
        return {
          success: false,
          message: 'Database connection failed',
          details: { error: error.message }
        };
      }

      return {
        success: true,
        message: 'Database connection is working',
        details: { connectionData: data }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database test failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Show connection test results in a user-friendly way
   */
  static showTestResults(results: ConnectionTestResult) {
    if (results.success) {
      toast.success(results.message, {
        description: results.details?.responseTime 
          ? `Response time: ${results.details.responseTime}ms`
          : undefined
      });
    } else {
      toast.error(results.message, {
        description: results.details?.error || 'Check the diagnostics for more details'
      });
    }
  }
}
