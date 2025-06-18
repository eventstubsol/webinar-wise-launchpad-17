/**
 * Enhanced registrant operations with full Zoom API compliance and pagination
 */

import { supabase } from '@/integrations/supabase/client';
import { EnhancedRegistrantsApiClient, ZoomRegistrantsQueryParams } from '../../api/enhanced/EnhancedRegistrantsApiClient';
import { PaginationTokenService } from '../../utils/PaginationTokenService';

export class EnhancedRegistrantOperations {
  /**
   * Fetch and sync registrants with enhanced pagination support
   */
  static async syncWebinarRegistrantsEnhanced(
    client: EnhancedRegistrantsApiClient,
    webinarId: string,
    webinarDbId: string,
    params: ZoomRegistrantsQueryParams = {},
    userId: string
  ): Promise<{
    totalSynced: number;
    hasMore: boolean;
    nextPageToken?: string;
    warnings?: string[];
  }> {
    console.log(`🎯 ENHANCED REGISTRANT SYNC starting for webinar ${webinarId}`);
    
    try {
      // Check and cleanup token health
      await client.checkTokenHealth();

      // Fetch registrants from Zoom API with enhanced pagination
      const response = await client.getWebinarRegistrants(webinarId, params);
      
      if (!response.registrants || response.registrants.length === 0) {
        console.log(`📭 NO REGISTRANTS: Found 0 registrants for webinar ${webinarId}`);
        return { 
          totalSynced: 0, 
          hasMore: false,
          warnings: response.warnings
        };
      }
      
      console.log(`✅ REGISTRANTS FOUND: ${response.registrants.length} registrants for webinar ${webinarId}`);
      
      // Log deprecation warnings if present
      if (response.warnings && response.warnings.length > 0) {
        response.warnings.forEach(warning => {
          console.warn(`⚠️ API WARNING: ${warning}`);
        });
      }

      // Transform registrant data for database
      const transformedRegistrants = response.registrants.map(registrant => ({
        webinar_id: webinarDbId,
        registrant_id: registrant.id,
        registrant_email: registrant.email,
        first_name: registrant.first_name,
        last_name: registrant.last_name || null,
        address: registrant.address || null,
        city: registrant.city || null,
        state: registrant.state || null,
        zip: registrant.zip || null,
        country: registrant.country || null,
        phone: registrant.phone || null,
        industry: registrant.industry || null,
        org: registrant.org || null,
        job_title: registrant.job_title || null,
        purchasing_time_frame: registrant.purchasing_time_frame || null,
        role_in_purchase_process: registrant.role_in_purchase_process || null,
        no_of_employees: registrant.no_of_employees || null,
        comments: registrant.comments || null,
        custom_questions: registrant.custom_questions ? JSON.stringify(registrant.custom_questions) : null,
        status: registrant.status,
        join_url: registrant.join_url || null,
        create_time: registrant.create_time || null,
        registration_time: registrant.create_time || new Date().toISOString(),
        occurrence_id: params.occurrence_id || null,
        tracking_source_id: params.tracking_source_id || null,
        source_id: null,
        tracking_source: null,
        language: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Upsert registrants to database with enhanced conflict resolution
      const { error } = await supabase
        .from('zoom_registrants')
        .upsert(
          transformedRegistrants,
          {
            onConflict: 'webinar_id,registrant_id',
            ignoreDuplicates: false
          }
        );

      if (error) {
        console.error(`❌ DATABASE UPSERT ERROR:`, error);
        throw new Error(`Failed to upsert registrants: ${error.message}`);
      }

      console.log(`✅ ENHANCED REGISTRANT SYNC SUCCESS: ${response.registrants.length} registrants synced`);
      
      return {
        totalSynced: response.registrants.length,
        hasMore: response.pagination.has_more,
        nextPageToken: response.pagination.next_page_token,
        warnings: response.warnings
      };
      
    } catch (error) {
      console.error(`💥 ENHANCED REGISTRANT SYNC ERROR for webinar ${webinarId}:`, error);
      throw error;
    }
  }

  /**
   * Sync all registrants for a webinar using enhanced pagination
   */
  static async syncAllWebinarRegistrants(
    client: EnhancedRegistrantsApiClient,
    webinarId: string,
    webinarDbId: string,
    userId: string,
    initialParams: ZoomRegistrantsQueryParams = {}
  ): Promise<{
    totalSynced: number;
    pagesProcessed: number;
    warnings: string[];
  }> {
    let totalSynced = 0;
    let pagesProcessed = 0;
    const allWarnings: string[] = [];
    let nextPageToken: string | undefined;
    let hasMore = true;

    console.log(`🔄 STARTING COMPLETE REGISTRANT SYNC for webinar ${webinarId}`);

    while (hasMore) {
      const currentParams: ZoomRegistrantsQueryParams = {
        ...initialParams,
        next_page_token: nextPageToken
      };

      try {
        const result = await this.syncWebinarRegistrantsEnhanced(
          client,
          webinarId,
          webinarDbId,
          currentParams,
          userId
        );

        totalSynced += result.totalSynced;
        pagesProcessed++;
        hasMore = result.hasMore;
        nextPageToken = result.nextPageToken;

        if (result.warnings) {
          allWarnings.push(...result.warnings);
        }

        console.log(`📄 PAGE ${pagesProcessed} COMPLETE: ${result.totalSynced} registrants, hasMore: ${hasMore}`);

        // Small delay between pages to be respectful to API
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`❌ ERROR on page ${pagesProcessed + 1}:`, error);
        throw error;
      }
    }

    console.log(`🎉 COMPLETE SYNC FINISHED: ${totalSynced} total registrants across ${pagesProcessed} pages`);

    return {
      totalSynced,
      pagesProcessed,
      warnings: allWarnings
    };
  }

  /**
   * Get registrants with enhanced filtering and pagination
   */
  static async getRegistrantsWithFiltering(
    webinarDbId: string,
    options: {
      status?: string;
      occurrenceId?: string;
      trackingSourceId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    try {
      let query = supabase
        .from('zoom_registrants')
        .select('*')
        .eq('webinar_id', webinarDbId);

      // Apply filters
      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.occurrenceId) {
        query = query.eq('occurrence_id', options.occurrenceId);
      }

      if (options.trackingSourceId) {
        query = query.eq('tracking_source_id', options.trackingSourceId);
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, (options.offset + (options.limit || 50)) - 1);
      }

      // Order by registration time
      query = query.order('registration_time', { ascending: false });

      const { data: registrants, error } = await query;

      if (error) {
        console.error('Failed to get registrants with filtering:', error);
        return [];
      }

      return registrants || [];
    } catch (error) {
      console.error('Error getting registrants with filtering:', error);
      return [];
    }
  }

  /**
   * Get registrant count by status for analytics
   */
  static async getRegistrantCountByStatus(webinarDbId: string, occurrenceId?: string) {
    try {
      let query = supabase
        .from('zoom_registrants')
        .select('status', { count: 'exact', head: true })
        .eq('webinar_id', webinarDbId);

      if (occurrenceId) {
        query = query.eq('occurrence_id', occurrenceId);
      }

      const { count, error } = await query;

      if (error) {
        console.error('Failed to get registrant count by status:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting registrant count by status:', error);
      return 0;
    }
  }
}
