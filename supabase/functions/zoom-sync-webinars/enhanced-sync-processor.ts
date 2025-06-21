
import { createSyncLog, updateSyncLog, updateSyncStage, saveWebinarToDatabase } from './database-operations.ts';
import { validateEnhancedRequest, EnhancedSyncRequest } from './enhanced-validation.ts';
import { TestModeManager, TestModeConfig } from './test-mode-manager.ts';
import { createZoomAPIClient } from './zoom-api-client.ts';

export async function processEnhancedWebinarSync(
  supabase: any,
  syncOperation: any,
  connection: any,
  syncLogId: string
): Promise<void> {
  console.log('=== ENHANCED SYNC PROCESSOR START ===');
  
  // Extract enhanced options
  const options = syncOperation.options || {};
  const testModeConfig = TestModeManager.prepareTestModeConfig(options);
  
  // Log configuration if verbose logging is enabled
  if (options.verboseLogging || testModeConfig.enhancedLogging) {
    console.log('ENHANCED SYNC: Configuration:', {
      syncType: syncOperation.syncType,
      testMode: testModeConfig.enabled,
      dryRun: testModeConfig.dryRun,
      maxWebinars: options.maxWebinars,
      respectRateLimits: options.respectRateLimits,
      enableAutoRetry: options.enableAutoRetry
    });
  }

  const zoomApiClient = await createZoomAPIClient(connection);
  
  try {
    await updateSyncStage(supabase, syncLogId, null, 'initializing_enhanced', 5);
    
    // Fetch webinars from Zoom with enhanced error handling
    console.log('ENHANCED SYNC: Fetching webinars from Zoom API...');
    const webinarsResponse = await zoomApiClient.makeRequest('/users/me/webinars?page_size=100');
    let webinars = webinarsResponse.webinars || [];
    
    if (webinars.length === 0) {
      console.log('ENHANCED SYNC: No webinars found');
      await updateSyncLog(supabase, syncLogId, {
        sync_status: 'completed',
        completed_at: new Date().toISOString(),
        total_items: 0,
        processed_items: 0
      });
      return;
    }

    // Apply test mode limitations
    if (testModeConfig.enabled) {
      webinars = TestModeManager.limitWebinarsForTestMode(webinars, testModeConfig);
      TestModeManager.logTestModeOperation('webinar_limitation', { 
        originalCount: webinarsResponse.webinars?.length || 0,
        limitedCount: webinars.length 
      }, testModeConfig);
    }

    // Apply max webinars limit if specified
    if (options.maxWebinars && webinars.length > options.maxWebinars) {
      console.log(`ENHANCED SYNC: Limiting webinars to ${options.maxWebinars} (was ${webinars.length})`);
      webinars = webinars.slice(0, options.maxWebinars);
    }

    await updateSyncLog(supabase, syncLogId, {
      total_items: webinars.length,
      processed_items: 0
    });
    
    console.log(`ENHANCED SYNC: Processing ${webinars.length} webinars`);
    
    let processedCount = 0;
    const operations: Array<{ operation: string; data: any; skipped: boolean }> = [];
    
    // Process each webinar with enhanced error handling
    for (const webinar of webinars) {
      try {
        await updateSyncStage(supabase, syncLogId, webinar.id, 'processing_webinar_enhanced', 
          Math.round(((processedCount + 0.5) / webinars.length) * 100));
        
        if (options.verboseLogging || testModeConfig.enhancedLogging) {
          console.log(`ENHANCED SYNC: Processing webinar ${processedCount + 1}/${webinars.length}: ${webinar.topic} (${webinar.id})`);
        }
        
        // Check if this is a dry run
        const shouldSkip = TestModeManager.shouldSkipDatabaseWrite(testModeConfig);
        
        if (!shouldSkip) {
          // Save webinar to database
          await saveWebinarToDatabase(supabase, webinar, connection.id);
          operations.push({
            operation: `Save webinar: ${webinar.topic}`,
            data: { id: webinar.id, topic: webinar.topic },
            skipped: false
          });
        } else {
          console.log(`DRY RUN: Skipping database write for webinar: ${webinar.topic}`);
          operations.push({
            operation: `Save webinar: ${webinar.topic}`,
            data: { id: webinar.id, topic: webinar.topic },
            skipped: true
          });
        }
        
        processedCount++;
        
        // Update progress
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount
        });
        
      } catch (webinarError) {
        console.error(`ENHANCED SYNC: Error processing webinar ${webinar.id}:`, webinarError);
        
        // Log the error operation
        operations.push({
          operation: `ERROR - Save webinar: ${webinar.topic}`,
          data: { id: webinar.id, error: webinarError.message },
          skipped: false
        });
        
        processedCount++;
        
        await updateSyncLog(supabase, syncLogId, {
          processed_items: processedCount,
          failed_items: processedCount - (operations.filter(op => !op.operation.startsWith('ERROR')).length)
        });
        
        // Continue processing other webinars unless forceSync is disabled
        if (!options.forceSync && !options.enableAutoRetry) {
          console.log('ENHANCED SYNC: Stopping on error (forceSync disabled)');
          break;
        }
      }
    }
    
    // Generate test mode report if enabled
    if (testModeConfig.enabled) {
      const report = this.generateTestModeReport(operations, testModeConfig);
      console.log(report);
    }
    
    // Complete sync
    await updateSyncStage(supabase, syncLogId, null, 'completed_enhanced', 100);
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'completed',
      completed_at: new Date().toISOString(),
      error_details: testModeConfig.enabled ? {
        testModeReport: operations,
        dryRun: testModeConfig.dryRun
      } : null
    });

    console.log('=== ENHANCED SYNC COMPLETED ===');
    console.log(`Total webinars processed: ${processedCount}`);
    console.log(`Operations performed: ${operations.length}`);
    console.log(`Dry run: ${testModeConfig.dryRun ? 'YES' : 'NO'}`);
    
  } catch (error) {
    console.error('ENHANCED SYNC: Operation failed:', error);
    
    await updateSyncLog(supabase, syncLogId, {
      sync_status: 'failed',
      error_message: error instanceof Error ? error.message : 'Enhanced sync failed',
      completed_at: new Date().toISOString(),
      sync_stage: 'failed',
      stage_progress_percentage: 0
    });

    throw error;
  }
}

function generateTestModeReport(
  operations: Array<{ operation: string; data: any; skipped: boolean }>,
  config: TestModeConfig
): string {
  if (!config.enabled) {
    return '';
  }

  const report = [
    '=== ENHANCED TEST MODE REPORT ===',
    `Configuration:`,
    `  - Test Mode: ${config.enabled ? 'ENABLED' : 'DISABLED'}`,
    `  - Dry Run: ${config.dryRun ? 'YES' : 'NO'}`,
    `  - Max Webinars: ${config.maxWebinars}`,
    `  - Enhanced Logging: ${config.enhancedLogging ? 'YES' : 'NO'}`,
    '',
    'Operations Summary:',
    `  - Total Operations: ${operations.length}`,
    `  - Executed: ${operations.filter(op => !op.skipped).length}`,
    `  - Skipped (Dry Run): ${operations.filter(op => op.skipped).length}`,
    `  - Errors: ${operations.filter(op => op.operation.startsWith('ERROR')).length}`,
    '',
    'Detailed Operations:',
    ...operations.map(op => 
      `  - ${op.operation}: ${op.skipped ? 'SKIPPED' : 'EXECUTED'}`
    ),
    '',
    '=== END ENHANCED TEST MODE REPORT ==='
  ];

  return report.join('\n');
}
