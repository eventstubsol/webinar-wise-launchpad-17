
/**
 * Edge Case Handler for complex scenarios and advanced features
 * Handles timezone complexity, large-scale operations, and advanced patterns
 */

interface TimezoneInfo {
  originalTimezone: string;
  utcTime: string;
  localTime: string;
  isDST: boolean;
  offset: string;
}

interface RecurrenceInfo {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  occurrences?: number;
  pattern: string;
}

interface LargeScaleResult {
  totalProcessed: number;
  batchCount: number;
  processingTime: number;
  errors: any[];
}

export class EdgeCaseHandler {
  private static instance: EdgeCaseHandler;
  private timezoneCache = new Map<string, any>();
  private recurrencePatterns = new Map<string, RecurrenceInfo>();

  private constructor() {}

  static getInstance(): EdgeCaseHandler {
    if (!this.instance) {
      this.instance = new EdgeCaseHandler();
    }
    return this.instance;
  }

  /**
   * Handle complex timezone scenarios
   */
  async handleTimezoneComplexity(webinarData: any): Promise<TimezoneInfo> {
    const { timezone, start_time } = webinarData;
    
    // Check cache first
    const cacheKey = `${timezone}-${start_time}`;
    if (this.timezoneCache.has(cacheKey)) {
      return this.timezoneCache.get(cacheKey);
    }

    try {
      const startDate = new Date(start_time);
      
      // Handle timezone conversion
      const timezoneInfo: TimezoneInfo = {
        originalTimezone: timezone,
        utcTime: startDate.toISOString(),
        localTime: this.convertToTimezone(startDate, timezone),
        isDST: this.isDaylightSavingTime(startDate, timezone),
        offset: this.getTimezoneOffset(timezone)
      };

      // Cache the result
      this.timezoneCache.set(cacheKey, timezoneInfo);
      
      return timezoneInfo;
    } catch (error) {
      console.warn('Timezone handling error:', error);
      return {
        originalTimezone: timezone,
        utcTime: start_time,
        localTime: start_time,
        isDST: false,
        offset: '+00:00'
      };
    }
  }

  /**
   * Parse complex recurrence patterns
   */
  parseRecurrencePattern(recurrence: any): RecurrenceInfo {
    const pattern = recurrence.type || 'unknown';
    
    // Check cache
    if (this.recurrencePatterns.has(pattern)) {
      return this.recurrencePatterns.get(pattern)!;
    }

    let recurrenceInfo: RecurrenceInfo;

    switch (recurrence.type) {
      case 1: // Daily
        recurrenceInfo = {
          type: 'daily',
          interval: recurrence.repeat_interval || 1,
          pattern: `Every ${recurrence.repeat_interval || 1} day(s)`,
          endDate: recurrence.end_date_time,
          occurrences: recurrence.end_times
        };
        break;

      case 2: // Weekly
        recurrenceInfo = {
          type: 'weekly',
          interval: recurrence.repeat_interval || 1,
          daysOfWeek: this.parseWeeklyDays(recurrence.weekly_days),
          pattern: `Every ${recurrence.repeat_interval || 1} week(s) on ${this.formatWeeklyDays(recurrence.weekly_days)}`,
          endDate: recurrence.end_date_time,
          occurrences: recurrence.end_times
        };
        break;

      case 3: // Monthly
        recurrenceInfo = {
          type: 'monthly',
          interval: recurrence.repeat_interval || 1,
          dayOfMonth: recurrence.monthly_day,
          pattern: `Every ${recurrence.repeat_interval || 1} month(s) on day ${recurrence.monthly_day}`,
          endDate: recurrence.end_date_time,
          occurrences: recurrence.end_times
        };
        break;

      default:
        recurrenceInfo = {
          type: 'custom',
          interval: 1,
          pattern: 'Custom recurrence pattern',
          endDate: recurrence.end_date_time,
          occurrences: recurrence.end_times
        };
    }

    // Cache the result
    this.recurrencePatterns.set(pattern, recurrenceInfo);
    
    return recurrenceInfo;
  }

  /**
   * Handle large-scale webinar operations (1000+ participants)
   */
  async handleLargeScaleWebinar(
    connectionId: string,
    participantCount: number,
    batchProcessor: (batch: any[]) => Promise<void>
  ): Promise<LargeScaleResult> {
    const startTime = Date.now();
    const batchSize = this.calculateOptimalBatchSize(participantCount);
    const errors: any[] = [];
    let totalProcessed = 0;
    let batchCount = 0;

    try {
      // Simulate processing large datasets in batches
      for (let i = 0; i < participantCount; i += batchSize) {
        const batchEnd = Math.min(i + batchSize, participantCount);
        const batch = this.generateSimulatedBatch(i, batchEnd);
        
        try {
          await batchProcessor(batch);
          totalProcessed += batch.length;
          batchCount++;
          
          // Add small delay to prevent overwhelming the system
          await this.sleep(100);
          
          // Log progress for very large operations
          if (batchCount % 10 === 0) {
            console.log(`Processed ${totalProcessed}/${participantCount} participants (${batchCount} batches)`);
          }
        } catch (error) {
          errors.push({
            batch: batchCount,
            range: `${i}-${batchEnd}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        totalProcessed,
        batchCount,
        processingTime,
        errors
      };
    } catch (error) {
      throw new Error(`Large-scale processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle multi-account Zoom integration scenarios
   */
  async handleMultiAccountIntegration(accounts: any[]): Promise<{
    connectedAccounts: number;
    failedAccounts: number;
    accountDetails: any[];
  }> {
    const results = {
      connectedAccounts: 0,
      failedAccounts: 0,
      accountDetails: []
    };

    for (const account of accounts) {
      try {
        // Simulate account validation
        const isValid = await this.validateZoomAccount(account);
        
        if (isValid) {
          results.connectedAccounts++;
          results.accountDetails.push({
            accountId: account.id,
            status: 'connected',
            features: this.getAccountFeatures(account)
          });
        } else {
          results.failedAccounts++;
          results.accountDetails.push({
            accountId: account.id,
            status: 'failed',
            error: 'Account validation failed'
          });
        }
      } catch (error) {
        results.failedAccounts++;
        results.accountDetails.push({
          accountId: account.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Advanced scheduling scenario handling
   */
  handleAdvancedScheduling(webinar: any): {
    conflicts: any[];
    suggestions: string[];
    optimizedTime?: string;
  } {
    const conflicts: any[] = [];
    const suggestions: string[] = [];

    // Check for common scheduling conflicts
    const startTime = new Date(webinar.start_time);
    const hour = startTime.getHours();
    const dayOfWeek = startTime.getDay();

    // Weekend scheduling
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      conflicts.push({
        type: 'weekend_scheduling',
        message: 'Webinar scheduled on weekend',
        impact: 'medium'
      });
      suggestions.push('Consider rescheduling to weekday for better attendance');
    }

    // Very early or late hours
    if (hour < 8 || hour > 18) {
      conflicts.push({
        type: 'off_hours',
        message: 'Webinar scheduled outside business hours',
        impact: 'high'
      });
      suggestions.push('Schedule between 9 AM - 5 PM for optimal attendance');
    }

    // Lunch time scheduling
    if (hour >= 12 && hour <= 13) {
      conflicts.push({
        type: 'lunch_time',
        message: 'Webinar scheduled during typical lunch hour',
        impact: 'low'
      });
      suggestions.push('Avoid 12-1 PM scheduling for better engagement');
    }

    return {
      conflicts,
      suggestions,
      optimizedTime: conflicts.length > 0 ? this.suggestOptimalTime(webinar) : undefined
    };
  }

  private convertToTimezone(date: Date, timezone: string): string {
    try {
      return date.toLocaleString('en-US', { timeZone: timezone });
    } catch (error) {
      return date.toISOString();
    }
  }

  private isDaylightSavingTime(date: Date, timezone: string): boolean {
    try {
      const january = new Date(date.getFullYear(), 0, 1);
      const july = new Date(date.getFullYear(), 6, 1);
      
      const janOffset = this.getTimezoneOffsetMinutes(january, timezone);
      const julyOffset = this.getTimezoneOffsetMinutes(july, timezone);
      const currentOffset = this.getTimezoneOffsetMinutes(date, timezone);
      
      return Math.min(janOffset, julyOffset) === currentOffset;
    } catch (error) {
      return false;
    }
  }

  private getTimezoneOffset(timezone: string): string {
    try {
      const date = new Date();
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      const targetTime = new Date(utc + this.getTimezoneOffsetMinutes(date, timezone) * 60000);
      const offset = targetTime.getTimezoneOffset();
      
      const hours = Math.floor(Math.abs(offset) / 60);
      const minutes = Math.abs(offset) % 60;
      const sign = offset <= 0 ? '+' : '-';
      
      return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '+00:00';
    }
  }

  private getTimezoneOffsetMinutes(date: Date, timezone: string): number {
    try {
      const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
      return (localDate.getTime() - utcDate.getTime()) / (1000 * 60);
    } catch (error) {
      return 0;
    }
  }

  private parseWeeklyDays(weeklyDays: string): number[] {
    if (!weeklyDays) return [];
    
    // Parse Zoom's weekly_days format
    return weeklyDays.split(',').map(day => parseInt(day.trim())).filter(day => !isNaN(day));
  }

  private formatWeeklyDays(weeklyDays: string): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const days = this.parseWeeklyDays(weeklyDays);
    
    return days.map(day => dayNames[day - 1] || 'Unknown').join(', ');
  }

  private calculateOptimalBatchSize(totalCount: number): number {
    // Calculate optimal batch size based on total count
    if (totalCount < 100) return 25;
    if (totalCount < 500) return 50;
    if (totalCount < 1000) return 100;
    return Math.min(200, Math.floor(totalCount / 10));
  }

  private generateSimulatedBatch(start: number, end: number): any[] {
    const batch = [];
    for (let i = start; i < end; i++) {
      batch.push({
        id: `participant_${i}`,
        email: `participant${i}@example.com`,
        name: `Participant ${i}`,
        join_time: new Date(Date.now() - Math.random() * 3600000).toISOString()
      });
    }
    return batch;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async validateZoomAccount(account: any): Promise<boolean> {
    // Simulate account validation
    return Math.random() > 0.1; // 90% success rate
  }

  private getAccountFeatures(account: any): string[] {
    const features = ['Basic Webinars'];
    
    if (account.plan_type === 'pro') {
      features.push('Advanced Analytics', 'Custom Branding');
    }
    
    if (account.plan_type === 'business') {
      features.push('Advanced Analytics', 'Custom Branding', 'API Access', 'Webhooks');
    }
    
    return features;
  }

  private suggestOptimalTime(webinar: any): string {
    // Suggest optimal time based on current webinar
    const currentTime = new Date(webinar.start_time);
    const optimizedTime = new Date(currentTime);
    
    // Move to Tuesday-Thursday, 10 AM - 3 PM
    const currentDay = optimizedTime.getDay();
    if (currentDay === 0 || currentDay === 6 || currentDay === 1 || currentDay === 5) {
      // Move to Tuesday
      const daysToAdd = currentDay === 0 ? 2 : currentDay === 1 ? 1 : currentDay === 5 ? 4 : 2;
      optimizedTime.setDate(optimizedTime.getDate() + daysToAdd);
    }
    
    // Set time to 10 AM
    optimizedTime.setHours(10, 0, 0, 0);
    
    return optimizedTime.toISOString();
  }

  /**
   * Clear caches periodically
   */
  cleanup(): void {
    // Clear timezone cache if it gets too large
    if (this.timezoneCache.size > 1000) {
      this.timezoneCache.clear();
    }
    
    // Clear recurrence patterns cache
    if (this.recurrencePatterns.size > 100) {
      this.recurrencePatterns.clear();
    }
  }
}

// Export singleton instance
export const edgeCaseHandler = EdgeCaseHandler.getInstance();
