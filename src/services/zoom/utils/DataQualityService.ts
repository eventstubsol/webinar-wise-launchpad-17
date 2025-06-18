
/**
 * Data Quality Service for monitoring and ensuring data integrity
 * Detects inconsistencies, validates data, and provides quality scoring
 */

interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  qualityScore: number;
  issues: DataQualityIssue[];
}

interface DataQualityIssue {
  id: string;
  type: 'missing_field' | 'invalid_format' | 'inconsistent_data' | 'data_drift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  field: string;
  message: string;
  recordId?: string;
  suggestedFix?: string;
  timestamp: number;
}

interface QualityCheckConfig {
  enableRealTimeChecks: boolean;
  enableDataDriftDetection: boolean;
  qualityThreshold: number;
  maxIssuesPerCheck: number;
}

export class DataQualityService {
  private static instance: DataQualityService;
  private qualityIssues: DataQualityIssue[] = [];
  private config: QualityCheckConfig = {
    enableRealTimeChecks: true,
    enableDataDriftDetection: true,
    qualityThreshold: 0.8,
    maxIssuesPerCheck: 100
  };
  
  private issueListeners: Array<(issue: DataQualityIssue) => void> = [];
  private baselineData = new Map<string, any>();

  private constructor() {}

  static getInstance(): DataQualityService {
    if (!this.instance) {
      this.instance = new DataQualityService();
    }
    return this.instance;
  }

  /**
   * Run comprehensive data quality checks
   */
  async runQualityChecks(data: {
    webinars?: any[];
    participants?: any[];
    registrants?: any[];
  }): Promise<DataQualityMetrics> {
    const allIssues: DataQualityIssue[] = [];
    let totalRecords = 0;
    let validRecords = 0;

    if (data.webinars) {
      const webinarMetrics = await this.checkWebinarDataQuality(data.webinars);
      allIssues.push(...webinarMetrics.issues);
      totalRecords += webinarMetrics.totalRecords;
      validRecords += webinarMetrics.validRecords;
    }

    if (data.participants) {
      const participantMetrics = await this.checkParticipantDataQuality(data.participants);
      allIssues.push(...participantMetrics.issues);
      totalRecords += participantMetrics.totalRecords;
      validRecords += participantMetrics.validRecords;
    }

    if (data.registrants) {
      const registrantMetrics = await this.checkRegistrantDataQuality(data.registrants);
      allIssues.push(...registrantMetrics.issues);
      totalRecords += registrantMetrics.totalRecords;
      validRecords += registrantMetrics.validRecords;
    }

    // Store issues and notify listeners
    this.qualityIssues.push(...allIssues.slice(0, this.config.maxIssuesPerCheck));
    this.notifyIssueListeners(allIssues);

    const qualityScore = totalRecords > 0 ? validRecords / totalRecords : 1;

    return {
      totalRecords,
      validRecords,
      invalidRecords: totalRecords - validRecords,
      qualityScore,
      issues: allIssues
    };
  }

  /**
   * Check webinar data quality
   */
  private async checkWebinarDataQuality(webinars: any[]): Promise<DataQualityMetrics> {
    const issues: DataQualityIssue[] = [];
    let validRecords = 0;

    for (const webinar of webinars) {
      let isValid = true;

      // Required field checks
      if (!webinar.id) {
        issues.push(this.createIssue('missing_field', 'critical', 'id', 'Webinar missing required ID', webinar.uuid));
        isValid = false;
      }

      if (!webinar.topic || webinar.topic.trim().length === 0) {
        issues.push(this.createIssue('missing_field', 'high', 'topic', 'Webinar missing topic/title', webinar.id));
        isValid = false;
      }

      // Date validation
      if (webinar.start_time && !this.isValidDate(webinar.start_time)) {
        issues.push(this.createIssue('invalid_format', 'high', 'start_time', 'Invalid start time format', webinar.id));
        isValid = false;
      }

      // Duration validation
      if (webinar.duration && (typeof webinar.duration !== 'number' || webinar.duration < 0)) {
        issues.push(this.createIssue('invalid_format', 'medium', 'duration', 'Invalid duration value', webinar.id));
        isValid = false;
      }

      // Data drift detection
      if (this.config.enableDataDriftDetection) {
        await this.detectDataDrift('webinar', webinar.id, webinar, issues);
      }

      if (isValid) validRecords++;
    }

    return {
      totalRecords: webinars.length,
      validRecords,
      invalidRecords: webinars.length - validRecords,
      qualityScore: webinars.length > 0 ? validRecords / webinars.length : 1,
      issues
    };
  }

  /**
   * Check participant data quality
   */
  private async checkParticipantDataQuality(participants: any[]): Promise<DataQualityMetrics> {
    const issues: DataQualityIssue[] = [];
    let validRecords = 0;

    for (const participant of participants) {
      let isValid = true;

      // Email validation
      if (participant.email && !this.isValidEmail(participant.email)) {
        issues.push(this.createIssue('invalid_format', 'high', 'email', 'Invalid email format', participant.id));
        isValid = false;
      }

      // Name validation
      if (!participant.name && !participant.display_name) {
        issues.push(this.createIssue('missing_field', 'medium', 'name', 'Participant missing name', participant.id));
        isValid = false;
      }

      // Join time validation
      if (participant.join_time && !this.isValidDate(participant.join_time)) {
        issues.push(this.createIssue('invalid_format', 'medium', 'join_time', 'Invalid join time format', participant.id));
        isValid = false;
      }

      // Duration consistency check
      if (participant.join_time && participant.leave_time) {
        const duration = new Date(participant.leave_time).getTime() - new Date(participant.join_time).getTime();
        if (duration < 0) {
          issues.push(this.createIssue('inconsistent_data', 'high', 'duration', 'Leave time before join time', participant.id));
          isValid = false;
        }
      }

      if (isValid) validRecords++;
    }

    return {
      totalRecords: participants.length,
      validRecords,
      invalidRecords: participants.length - validRecords,
      qualityScore: participants.length > 0 ? validRecords / participants.length : 1,
      issues
    };
  }

  /**
   * Check registrant data quality
   */
  private async checkRegistrantDataQuality(registrants: any[]): Promise<DataQualityMetrics> {
    const issues: DataQualityIssue[] = [];
    let validRecords = 0;

    for (const registrant of registrants) {
      let isValid = true;

      // Email validation (required for registrants)
      if (!registrant.email || !this.isValidEmail(registrant.email)) {
        issues.push(this.createIssue('invalid_format', 'critical', 'email', 'Invalid or missing email for registrant', registrant.id));
        isValid = false;
      }

      // Registration time validation
      if (registrant.create_time && !this.isValidDate(registrant.create_time)) {
        issues.push(this.createIssue('invalid_format', 'medium', 'create_time', 'Invalid registration time format', registrant.id));
        isValid = false;
      }

      if (isValid) validRecords++;
    }

    return {
      totalRecords: registrants.length,
      validRecords,
      invalidRecords: registrants.length - validRecords,
      qualityScore: registrants.length > 0 ? validRecords / registrants.length : 1,
      issues
    };
  }

  /**
   * Detect data drift by comparing with baseline
   */
  private async detectDataDrift(
    entityType: string,
    entityId: string,
    currentData: any,
    issues: DataQualityIssue[]
  ): Promise<void> {
    const baselineKey = `${entityType}:${entityId}`;
    const baseline = this.baselineData.get(baselineKey);

    if (baseline) {
      // Check for significant changes in key fields
      const criticalFields = this.getCriticalFields(entityType);
      
      for (const field of criticalFields) {
        if (baseline[field] !== undefined && currentData[field] !== undefined) {
          if (baseline[field] !== currentData[field]) {
            issues.push(this.createIssue(
              'data_drift',
              'medium',
              field,
              `Field value changed from "${baseline[field]}" to "${currentData[field]}"`,
              entityId,
              'Review data consistency'
            ));
          }
        }
      }
    }

    // Update baseline with current data
    this.baselineData.set(baselineKey, { ...currentData });
  }

  /**
   * Calculate overall quality score
   */
  calculateQualityScore(): {
    overall: number;
    issueCount: number;
    recordsAffected: number;
    lastCalculated: string;
  } {
    const recentIssues = this.qualityIssues.filter(
      issue => issue.timestamp > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
    );

    const criticalIssues = recentIssues.filter(issue => issue.severity === 'critical').length;
    const highIssues = recentIssues.filter(issue => issue.severity === 'high').length;
    const mediumIssues = recentIssues.filter(issue => issue.severity === 'medium').length;
    const lowIssues = recentIssues.filter(issue => issue.severity === 'low').length;

    // Calculate weighted quality score
    const totalWeight = criticalIssues * 4 + highIssues * 3 + mediumIssues * 2 + lowIssues * 1;
    const maxWeight = recentIssues.length * 4; // If all were critical
    
    const overall = maxWeight > 0 ? Math.max(0, 1 - (totalWeight / maxWeight)) : 1;

    return {
      overall,
      issueCount: recentIssues.length,
      recordsAffected: new Set(recentIssues.map(i => i.recordId).filter(Boolean)).size,
      lastCalculated: new Date().toISOString()
    };
  }

  /**
   * Subscribe to quality issue notifications
   */
  onQualityIssue(listener: (issue: DataQualityIssue) => void): () => void {
    this.issueListeners.push(listener);
    return () => {
      this.issueListeners = this.issueListeners.filter(l => l !== listener);
    };
  }

  /**
   * Get recent quality issues
   */
  getRecentIssues(hours: number = 24): DataQualityIssue[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.qualityIssues.filter(issue => issue.timestamp >= cutoff);
  }

  private createIssue(
    type: DataQualityIssue['type'],
    severity: DataQualityIssue['severity'],
    field: string,
    message: string,
    recordId?: string,
    suggestedFix?: string
  ): DataQualityIssue {
    return {
      id: `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      field,
      message,
      recordId,
      suggestedFix,
      timestamp: Date.now()
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  private getCriticalFields(entityType: string): string[] {
    switch (entityType) {
      case 'webinar':
        return ['id', 'topic', 'start_time', 'host_id'];
      case 'participant':
        return ['email', 'user_id'];
      case 'registrant':
        return ['email', 'id'];
      default:
        return [];
    }
  }

  private notifyIssueListeners(issues: DataQualityIssue[]): void {
    issues.forEach(issue => {
      this.issueListeners.forEach(listener => {
        try {
          listener(issue);
        } catch (error) {
          console.error('Error in quality issue listener:', error);
        }
      });
    });
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<QualityCheckConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear old issues
   */
  cleanup(): void {
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    this.qualityIssues = this.qualityIssues.filter(issue => issue.timestamp >= cutoff);
  }
}

// Export singleton instance
export const dataQualityService = DataQualityService.getInstance();
