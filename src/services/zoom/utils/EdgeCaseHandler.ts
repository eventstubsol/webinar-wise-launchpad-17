
/**
 * Edge Case Handler for complex Zoom scenarios
 * Handles timezone complexity, large-scale webinars, recurring patterns, multi-account support
 */

interface TimezoneMapping {
  zoomTimezone: string;
  ianaTimezone: string;
  offsetMinutes: number;
  supportsDST: boolean;
}

interface LargeScaleConfig {
  batchSize: number;
  concurrentRequests: number;
  memoryThreshold: number;
  processingDelay: number;
}

interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  monthOfYear?: number;
  endDate?: string;
  occurrenceCount?: number;
  customPattern?: string;
}

export class EdgeCaseHandler {
  private static instance: EdgeCaseHandler;
  
  private timezoneMap: Map<string, TimezoneMapping> = new Map();
  private largeScaleConfig: LargeScaleConfig = {
    batchSize: 100,
    concurrentRequests: 5,
    memoryThreshold: 500 * 1024 * 1024, // 500MB
    processingDelay: 100 // ms between batches
  };

  private constructor() {
    this.initializeTimezoneMapping();
  }

  static getInstance(): EdgeCaseHandler {
    if (!this.instance) {
      this.instance = new EdgeCaseHandler();
    }
    return this.instance;
  }

  /**
   * Advanced timezone handling for complex scheduling scenarios
   */
  async handleTimezoneComplexity(webinarData: any): Promise<{
    localTime: string;
    utcTime: string;
    userTimezone: string;
    isDST: boolean;
    timezoneOffset: number;
    conflicts: string[];
  }> {
    const conflicts: string[] = [];
    
    // Get timezone information
    const zoomTz = webinarData.timezone || 'UTC';
    const mapping = this.timezoneMap.get(zoomTz) || this.createFallbackMapping(zoomTz);
    
    // Convert to UTC
    const startTime = new Date(webinarData.start_time);
    const utcTime = this.convertToUTC(startTime, mapping);
    
    // Check for DST transitions
    const isDST = this.isDaylightSavingTime(startTime, mapping);
    if (isDST !== this.isDaylightSavingTime(new Date(), mapping)) {
      conflicts.push('Webinar crosses daylight saving time transition');
    }
    
    // Check for timezone ambiguity
    if (this.isAmbiguousTime(startTime, mapping)) {
      conflicts.push('Webinar time falls during DST transition (ambiguous time)');
    }
    
    // Detect user timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const userLocalTime = this.convertToTimezone(utcTime, userTimezone);
    
    return {
      localTime: userLocalTime.toISOString(),
      utcTime: utcTime.toISOString(),
      userTimezone,
      isDST,
      timezoneOffset: mapping.offsetMinutes,
      conflicts
    };
  }

  /**
   * Handle large-scale webinars with 1000+ participants
   */
  async handleLargeScaleWebinar(
    webinarId: string,
    participantCount: number,
    processor: (batch: any[]) => Promise<void>
  ): Promise<{
    totalProcessed: number;
    batchCount: number;
    processingTime: number;
    memoryPeak: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalProcessed = 0;
    let batchCount = 0;
    let memoryPeak = 0;
    
    console.log(`Starting large-scale processing for webinar ${webinarId} with ${participantCount} participants`);
    
    try {
      // Adjust batch size based on participant count
      const adjustedBatchSize = this.calculateOptimalBatchSize(participantCount);
      
      // Process in memory-conscious batches
      for (let offset = 0; offset < participantCount; offset += adjustedBatchSize) {
        // Memory check
        const memoryUsage = process.memoryUsage().heapUsed;
        memoryPeak = Math.max(memoryPeak, memoryUsage);
        
        if (memoryUsage > this.largeScaleConfig.memoryThreshold) {
          console.warn(`High memory usage detected: ${Math.round(memoryUsage / 1024 / 1024)}MB`);
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          
          // Increase processing delay
          await this.sleep(this.largeScaleConfig.processingDelay * 2);
        }
        
        try {
          // Simulate batch fetching (in real implementation, this would fetch from Zoom API)
          const batch = await this.fetchParticipantBatch(webinarId, offset, adjustedBatchSize);
          
          // Process batch
          await processor(batch);
          
          totalProcessed += batch.length;
          batchCount++;
          
          // Progress reporting
          const progress = Math.round((totalProcessed / participantCount) * 100);
          console.log(`Large-scale processing: ${progress}% complete (${totalProcessed}/${participantCount})`);
          
          // Controlled delay to prevent overwhelming
          if (batchCount % this.largeScaleConfig.concurrentRequests === 0) {
            await this.sleep(this.largeScaleConfig.processingDelay);
          }
          
        } catch (batchError) {
          const error = `Batch ${batchCount + 1} failed: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`;
          errors.push(error);
          console.error(error);
        }
      }
      
    } catch (error) {
      errors.push(`Large-scale processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      totalProcessed,
      batchCount,
      processingTime,
      memoryPeak,
      errors
    };
  }

  /**
   * Handle complex recurring webinar patterns
   */
  parseRecurrencePattern(recurrenceData: any): {
    pattern: RecurrencePattern;
    nextOccurrences: Date[];
    isValid: boolean;
    validationErrors: string[];
  } {
    const validationErrors: string[] = [];
    
    // Parse Zoom recurrence format
    let pattern: RecurrencePattern;
    
    try {
      if (recurrenceData.type === 1) { // Daily
        pattern = {
          type: 'daily',
          interval: recurrenceData.repeat_interval || 1
        };
      } else if (recurrenceData.type === 2) { // Weekly
        pattern = {
          type: 'weekly',
          interval: recurrenceData.repeat_interval || 1,
          daysOfWeek: this.parseWeeklyDays(recurrenceData.weekly_days)
        };
      } else if (recurrenceData.type === 3) { // Monthly
        pattern = {
          type: 'monthly',
          interval: recurrenceData.repeat_interval || 1,
          dayOfMonth: recurrenceData.monthly_day
        };
      } else {
        pattern = {
          type: 'custom',
          interval: 1,
          customPattern: JSON.stringify(recurrenceData)
        };
      }
      
      // Add end conditions
      if (recurrenceData.end_date_time) {
        pattern.endDate = recurrenceData.end_date_time;
      }
      if (recurrenceData.end_times) {
        pattern.occurrenceCount = recurrenceData.end_times;
      }
      
    } catch (error) {
      validationErrors.push(`Failed to parse recurrence pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
      pattern = { type: 'custom', interval: 1 };
    }
    
    // Validate pattern
    if (pattern.interval <= 0) {
      validationErrors.push('Recurrence interval must be positive');
    }
    
    if (pattern.type === 'weekly' && (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0)) {
      validationErrors.push('Weekly recurrence must specify days of week');
    }
    
    // Calculate next occurrences
    const nextOccurrences = this.calculateNextOccurrences(pattern, new Date(), 10);
    
    return {
      pattern,
      nextOccurrences,
      isValid: validationErrors.length === 0,
      validationErrors
    };
  }

  /**
   * Handle multi-account Zoom integration
   */
  async handleMultiAccountScenario(
    accounts: Array<{ connectionId: string; accountId: string; priority: number }>,
    operation: (connectionId: string) => Promise<any>
  ): Promise<{
    results: Array<{ connectionId: string; success: boolean; data?: any; error?: string }>;
    primaryResult?: any;
    failoverUsed: boolean;
  }> {
    // Sort by priority
    const sortedAccounts = accounts.sort((a, b) => a.priority - b.priority);
    const results: Array<{ connectionId: string; success: boolean; data?: any; error?: string }> = [];
    let primaryResult: any;
    let failoverUsed = false;
    
    // Try primary account first
    const primaryAccount = sortedAccounts[0];
    try {
      const result = await operation(primaryAccount.connectionId);
      results.push({
        connectionId: primaryAccount.connectionId,
        success: true,
        data: result
      });
      primaryResult = result;
    } catch (error) {
      results.push({
        connectionId: primaryAccount.connectionId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Try failover accounts
      for (const account of sortedAccounts.slice(1)) {
        try {
          const result = await operation(account.connectionId);
          results.push({
            connectionId: account.connectionId,
            success: true,
            data: result
          });
          primaryResult = result;
          failoverUsed = true;
          break;
        } catch (failoverError) {
          results.push({
            connectionId: account.connectionId,
            success: false,
            error: failoverError instanceof Error ? failoverError.message : 'Unknown error'
          });
        }
      }
    }
    
    return {
      results,
      primaryResult,
      failoverUsed
    };
  }

  private initializeTimezoneMapping(): void {
    // Common Zoom timezone mappings
    const mappings: TimezoneMapping[] = [
      { zoomTimezone: 'America/New_York', ianaTimezone: 'America/New_York', offsetMinutes: -300, supportsDST: true },
      { zoomTimezone: 'America/Chicago', ianaTimezone: 'America/Chicago', offsetMinutes: -360, supportsDST: true },
      { zoomTimezone: 'America/Denver', ianaTimezone: 'America/Denver', offsetMinutes: -420, supportsDST: true },
      { zoomTimezone: 'America/Los_Angeles', ianaTimezone: 'America/Los_Angeles', offsetMinutes: -480, supportsDST: true },
      { zoomTimezone: 'Europe/London', ianaTimezone: 'Europe/London', offsetMinutes: 0, supportsDST: true },
      { zoomTimezone: 'Europe/Paris', ianaTimezone: 'Europe/Paris', offsetMinutes: 60, supportsDST: true },
      { zoomTimezone: 'Asia/Tokyo', ianaTimezone: 'Asia/Tokyo', offsetMinutes: 540, supportsDST: false },
      { zoomTimezone: 'Asia/Shanghai', ianaTimezone: 'Asia/Shanghai', offsetMinutes: 480, supportsDST: false },
      { zoomTimezone: 'Australia/Sydney', ianaTimezone: 'Australia/Sydney', offsetMinutes: 600, supportsDST: true },
    ];
    
    mappings.forEach(mapping => {
      this.timezoneMap.set(mapping.zoomTimezone, mapping);
    });
  }

  private createFallbackMapping(timezone: string): TimezoneMapping {
    return {
      zoomTimezone: timezone,
      ianaTimezone: timezone,
      offsetMinutes: 0,
      supportsDST: false
    };
  }

  private convertToUTC(date: Date, mapping: TimezoneMapping): Date {
    const offsetMs = mapping.offsetMinutes * 60 * 1000;
    return new Date(date.getTime() - offsetMs);
  }

  private convertToTimezone(utcDate: Date, timezone: string): Date {
    return new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
  }

  private isDaylightSavingTime(date: Date, mapping: TimezoneMapping): boolean {
    if (!mapping.supportsDST) return false;
    
    // Simplified DST detection (in real implementation, use proper timezone library)
    const year = date.getFullYear();
    const dstStart = new Date(year, 2, 14); // Approximate DST start
    const dstEnd = new Date(year, 10, 7);   // Approximate DST end
    
    return date >= dstStart && date < dstEnd;
  }

  private isAmbiguousTime(date: Date, mapping: TimezoneMapping): boolean {
    if (!mapping.supportsDST) return false;
    
    // Check if time falls during DST transition (simplified)
    const year = date.getFullYear();
    const dstEnd = new Date(year, 10, 7, 2, 0, 0); // 2 AM on DST end date
    const oneHourAfter = new Date(dstEnd.getTime() + 60 * 60 * 1000);
    
    return date >= dstEnd && date < oneHourAfter;
  }

  private calculateOptimalBatchSize(totalCount: number): number {
    if (totalCount <= 100) return Math.min(totalCount, 20);
    if (totalCount <= 1000) return 50;
    if (totalCount <= 5000) return 100;
    return 200; // For very large datasets
  }

  private async fetchParticipantBatch(webinarId: string, offset: number, limit: number): Promise<any[]> {
    // Simulate batch fetching - in real implementation, this would call Zoom API
    const batch: any[] = [];
    for (let i = 0; i < limit; i++) {
      batch.push({
        id: `participant_${offset + i}`,
        email: `user${offset + i}@example.com`,
        name: `User ${offset + i}`,
        join_time: new Date().toISOString()
      });
    }
    return batch;
  }

  private parseWeeklyDays(weeklyDays: string): number[] {
    if (!weeklyDays) return [1]; // Default to Monday
    
    // Parse Zoom's weekly days format (e.g., "1,3,5" for Mon, Wed, Fri)
    return weeklyDays.split(',').map(day => parseInt(day.trim())).filter(day => day >= 1 && day <= 7);
  }

  private calculateNextOccurrences(pattern: RecurrencePattern, startDate: Date, count: number): Date[] {
    const occurrences: Date[] = [];
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < count; i++) {
      switch (pattern.type) {
        case 'daily':
          currentDate = new Date(currentDate.getTime() + pattern.interval * 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          currentDate = new Date(currentDate.getTime() + pattern.interval * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + pattern.interval, currentDate.getDate());
          break;
        default:
          return occurrences; // Stop for custom patterns
      }
      
      if (pattern.endDate && currentDate > new Date(pattern.endDate)) {
        break;
      }
      
      occurrences.push(new Date(currentDate));
    }
    
    return occurrences;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update configuration
   */
  updateLargeScaleConfig(config: Partial<LargeScaleConfig>): void {
    this.largeScaleConfig = { ...this.largeScaleConfig, ...config };
  }
}

// Export singleton instance
export const edgeCaseHandler = EdgeCaseHandler.getInstance();
