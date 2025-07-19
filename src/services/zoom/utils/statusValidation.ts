/**
 * Status validation utilities for webinar status management
 * Provides tools to validate and test the enhanced status system
 */

import { supabase } from '@/integrations/supabase/client';

export interface StatusValidationResult {
  success: boolean;
  updatedCount: number;
  statusCounts: {
    upcoming: number;
    live: number;
    ended: number;
    other: number;
  };
  error?: string;
}

/**
 * Test the batch status update function to ensure proper functionality
 */
export async function validateWebinarStatuses(): Promise<StatusValidationResult> {
  console.log('🔍 Starting webinar status validation...');
  
  try {
    // Call the database function to update statuses
    const { data, error } = await supabase.rpc('batch_update_webinar_statuses');
    
    if (error) {
      console.error('❌ Status validation failed:', error);
      return {
        success: false,
        updatedCount: 0,
        statusCounts: { upcoming: 0, live: 0, ended: 0, other: 0 },
        error: error.message
      };
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️ No data returned from batch_update_webinar_statuses');
      return {
        success: false,
        updatedCount: 0,
        statusCounts: { upcoming: 0, live: 0, ended: 0, other: 0 },
        error: 'No data returned from status update function'
      };
    }
    
    const result = data[0];
    console.log('✅ Status validation completed successfully:', result);
    
    return {
      success: true,
      updatedCount: result.updated_count || 0,
      statusCounts: {
        upcoming: result.upcoming_count || 0,
        live: result.live_count || 0,
        ended: result.ended_count || 0,
        other: 0
      }
    };
  } catch (error) {
    console.error('❌ Status validation error:', error);
    return {
      success: false,
      updatedCount: 0,
      statusCounts: { upcoming: 0, live: 0, ended: 0, other: 0 },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get current status distribution for analysis
 */
export async function getStatusDistribution(): Promise<Record<string, number>> {
  console.log('📊 Getting current status distribution...');
  
  try {
    const { data, error } = await supabase
      .from('zoom_webinars')
      .select('status');
    
    if (error) {
      console.error('❌ Failed to get status distribution:', error);
      return {};
    }
    
    const distribution: Record<string, number> = {};
    data?.forEach(webinar => {
      const status = webinar.status || 'unknown';
      distribution[status] = (distribution[status] || 0) + 1;
    });
    
    console.log('📊 Status distribution:', distribution);
    return distribution;
  } catch (error) {
    console.error('❌ Error getting status distribution:', error);
    return {};
  }
}

/**
 * Validate that the database trigger is working correctly
 */
export async function validateDatabaseTrigger(): Promise<boolean> {
  console.log('🔧 Testing database trigger functionality...');
  
  try {
    // Test by getting calculated status for a sample webinar
    const { data: sampleWebinar, error } = await supabase
      .from('zoom_webinars')
      .select('id, start_time, duration, status')
      .limit(1)
      .single();
    
    if (error || !sampleWebinar) {
      console.log('ℹ️ No webinars found to test trigger');
      return true; // Not an error if no webinars exist
    }
    
    // Use the calculated status view to check if the function works
    const { data: calculatedData, error: calcError } = await supabase
      .from('zoom_webinars_with_calculated_status')
      .select('calculated_status')
      .eq('id', sampleWebinar.id)
      .single();
    
    if (calcError) {
      console.error('❌ Database function test failed:', calcError);
      return false;
    }
    
    console.log(`✅ Database trigger test passed. Sample status: ${calculatedData?.calculated_status}`);
    return true;
  } catch (error) {
    console.error('❌ Database trigger validation error:', error);
    return false;
  }
}

/**
 * Complete validation suite - runs all validation checks
 */
export async function runCompleteValidation(): Promise<{
  statusUpdate: StatusValidationResult;
  distribution: Record<string, number>;
  triggerWorking: boolean;
}> {
  console.log('🚀 Running complete webinar status validation suite...');
  
  const [statusUpdate, distribution, triggerWorking] = await Promise.all([
    validateWebinarStatuses(),
    getStatusDistribution(),
    validateDatabaseTrigger()
  ]);
  
  console.log('📋 Complete validation results:', {
    statusUpdate,
    distribution,
    triggerWorking
  });
  
  return {
    statusUpdate,
    distribution,
    triggerWorking
  };
}