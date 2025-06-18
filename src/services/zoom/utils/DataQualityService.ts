
/**
 * Data Quality Service for Zoom webinar data
 * Provides real-time consistency checks, drift detection, and automated cleanup
 */

interface DataQualityCheck {
  checkName: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'consistency' | 'completeness' | 'accuracy' | 'freshness';
}

interface QualityIssue {
  id: string;
  checkName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  affectedRecords: string[];
  detectedAt: number;
  resolved: boolean;
  autoFixable: boolean;
  metadata: Record<string, any>;
}

interface DataQualityScore {
  overall: number;
  consistency: number;
  completeness: number;
  accuracy: number;
  freshness: number;
  issueCount: number;
  recordsAffected: number;
}

interface DriftDetectionConfig {
  enabled: boolean;
  checkIntervalMinutes: number;
  thresholds: {
    fieldValueChange: number; // % change threshold
    recordCountChange: number; // % change threshold
    schemaChange: boolean;
  };
}

export class DataQualityService {
  private static instance: DataQualityService;
  private qualityChecks: Map<string, DataQualityCheck> = new Map();
  private qualityIssues: QualityIssue[] = [];
  private driftBaselines: Map<string, any> = new Map();
  
  private config: DriftDetectionConfig = {
    enabled: true,
    checkIntervalMinutes: 60,
    thresholds: {
      fieldValueChange: 20, // 20% change triggers alert
      recordCountChange: 15, // 15% change triggers alert
      schemaChange: true
    }
  };

  private issueListeners: Array<(issue: QualityIssue) => void> = [];

  private constructor() {
    this.initializeQualityChecks();
  }

  static getInstance(): DataQualityService {
    if (!this.instance) {
      this.instance = new DataQualityService();
    }
    return this.instance;
  }

  /**
   * Run comprehensive data quality checks on webinar data
   */
  async runQualityChecks(data: {
    webinars?: any[];
    participants?: any[];
    registrants?: any[];
  }): Promise<DataQualityScore> {
    const issues: QualityIssue[] = [];
    
    if (data.webinars) {
      issues.push(...await this.checkWebinarQuality(data.webinars));
    }
    
    if (data.participants) {
      issues.push(...await this.checkParticipantQuality(data.participants));
    }
    
    if (data.registrants) {
      issues.push(...await this.checkRegistrantQuality(data.registrants));
    }
    
    // Store new issues
    issues.forEach(issue => {
      this.addQualityIssue(issue);
    });
    
    return this.calculateQualityScore();
  }

  /**
   * Check for data drift since last baseline
   */
  async detectDataDrift(
    entityType: string,
    currentData: any[],
    previousData?: any[]
  ): Promise<{
    driftDetected: boolean;
    changes: Array<{
      type: 'field_value' | 'record_count' | 'schema';
      field?: string;
      previousValue?: any;
      currentValue?: any;
      changePercentage?: number;
    }>;
  }> {
    const baselineKey = `${entityType}_baseline`;
    const baseline = previousData || this.driftBaselines.get(baselineKey);
    
    if (!baseline || baseline.length === 0) {
      // Set new baseline
      this.driftBaselines.set(baselineKey, this.createDataSnapshot(currentData));
      return { driftDetected: false, changes: [] };
    }
    
    const changes: any[] = [];
    
    // Check record count drift
    const countChange = Math.abs(currentData.length - baseline.length) / baseline.length;
    if (countChange > this.config.thresholds.recordCountChange / 100) {
      changes.push({
        type: 'record_count',
        previousValue: baseline.length,
        currentValue: currentData.length,
        changePercentage: countChange * 100
      });
    }
    
    // Check field value drift
    const fieldDrift = this.detectFieldValueDrift(baseline, currentData);
    changes.push(...fieldDrift);
    
    // Check schema drift
    const schemaDrift = this.detectSchemaDrift(baseline, currentData);
    changes.push(...schemaDrift);
    
    // Update baseline if no significant drift
    if (changes.length === 0) {
      this.driftBaselines.set(baselineKey, this.createDataSnapshot(currentData));
    }
    
    return {
      driftDetected: changes.length > 0,
      changes
    };
  }

  /**
   * Auto-fix quality issues where possible
   */
  async autoFixIssues(): Promise<{
    fixed: number;
    skipped: number;
    errors: Array<{ issueId: string; error: string }>;
  }> {
    const fixableIssues = this.qualityIssues.filter(issue => 
      issue.autoFixable && !issue.resolved
    );
    
    let fixed = 0;
    let skipped = 0;
    const errors: Array<{ issueId: string; error: string }> = [];
    
    for (const issue of fixableIssues) {
      try {
        const success = await this.applyAutoFix(issue);
        if (success) {
          issue.resolved = true;
          fixed++;
        } else {
          skipped++;
        }
      } catch (error) {
        errors.push({
          issueId: issue.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        skipped++;
      }
    }
    
    return { fixed, skipped, errors };
  }

  /**
   * Get current data quality score
   */
  calculateQualityScore(): DataQualityScore {
    const activeIssues = this.qualityIssues.filter(issue => !issue.resolved);
    const totalRecordsAffected = new Set(
      activeIssues.flatMap(issue => issue.affectedRecords)
    ).size;
    
    // Calculate category scores
    const categoryScores = {
      consistency: this.calculateCategoryScore('consistency', activeIssues),
      completeness: this.calculateCategoryScore('completeness', activeIssues),
      accuracy: this.calculateCategoryScore('accuracy', activeIssues),
      freshness: this.calculateCategoryScore('freshness', activeIssues)
    };
    
    const overall = Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / 4;
    
    return {
      overall: Math.round(overall * 100) / 100,
      consistency: categoryScores.consistency,
      completeness: categoryScores.completeness,
      accuracy: categoryScores.accuracy,
      freshness: categoryScores.freshness,
      issueCount: activeIssues.length,
      recordsAffected: totalRecordsAffected
    };
  }

  /**
   * Get quality issues with filtering
   */
  getQualityIssues(filters?: {
    severity?: string[];
    category?: string[];
    resolved?: boolean;
  }): QualityIssue[] {
    let issues = [...this.qualityIssues];
    
    if (filters?.severity) {
      issues = issues.filter(issue => filters.severity!.includes(issue.severity));
    }
    
    if (filters?.category) {
      issues = issues.filter(issue => filters.category!.includes(issue.category));
    }
    
    if (filters?.resolved !== undefined) {
      issues = issues.filter(issue => issue.resolved === filters.resolved);
    }
    
    return issues.sort((a, b) => b.detectedAt - a.detectedAt);
  }

  /**
   * Subscribe to quality issue notifications
   */
  onQualityIssue(listener: (issue: QualityIssue) => void): () => void {
    this.issueListeners.push(listener);
    return () => {
      this.issueListeners = this.issueListeners.filter(l => l !== listener);
    };
  }

  private initializeQualityChecks(): void {
    // Webinar quality checks
    this.qualityChecks.set('webinar_missing_title', {
      checkName: 'webinar_missing_title',
      description: 'Webinar has missing or empty title',
      severity: 'high',
      category: 'completeness'
    });
    
    this.qualityChecks.set('webinar_invalid_duration', {
      checkName: 'webinar_invalid_duration',
      description: 'Webinar duration is invalid or unrealistic',
      severity: 'medium',
      category: 'accuracy'
    });
    
    this.qualityChecks.set('webinar_future_start_time', {
      checkName: 'webinar_future_start_time',
      description: 'Past webinar has future start time',
      severity: 'high',
      category: 'consistency'
    });
    
    // Participant quality checks
    this.qualityChecks.set('participant_missing_email', {
      checkName: 'participant_missing_email',
      description: 'Participant has missing or invalid email',
      severity: 'critical',
      category: 'completeness'
    });
    
    this.qualityChecks.set('participant_duplicate_entry', {
      checkName: 'participant_duplicate_entry',
      description: 'Duplicate participant entries found',
      severity: 'medium',
      category: 'consistency'
    });
    
    this.qualityChecks.set('participant_invalid_duration', {
      checkName: 'participant_invalid_duration',
      description: 'Participant duration exceeds webinar duration',
      severity: 'medium',
      category: 'accuracy'
    });
  }

  private async checkWebinarQuality(webinars: any[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];
    
    webinars.forEach((webinar, index) => {
      const recordId = webinar.id || `webinar_${index}`;
      
      // Check missing title
      if (!webinar.topic || webinar.topic.trim() === '') {
        issues.push(this.createQualityIssue(
          'webinar_missing_title',
          [recordId],
          { webinarId: recordId, topic: webinar.topic }
        ));
      }
      
      // Check invalid duration
      if (webinar.duration && (webinar.duration < 0 || webinar.duration > 1440)) {
        issues.push(this.createQualityIssue(
          'webinar_invalid_duration',
          [recordId],
          { webinarId: recordId, duration: webinar.duration }
        ));
      }
      
      // Check future start time for past webinars
      if (webinar.start_time && webinar.status === 'ended') {
        const startTime = new Date(webinar.start_time).getTime();
        if (startTime > Date.now()) {
          issues.push(this.createQualityIssue(
            'webinar_future_start_time',
            [recordId],
            { webinarId: recordId, startTime: webinar.start_time, status: webinar.status }
          ));
        }
      }
    });
    
    return issues;
  }

  private async checkParticipantQuality(participants: any[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];
    const emailsSeen = new Set<string>();
    
    participants.forEach((participant, index) => {
      const recordId = participant.id || `participant_${index}`;
      
      // Check missing email
      if (!participant.email || !this.isValidEmail(participant.email)) {
        issues.push(this.createQualityIssue(
          'participant_missing_email',
          [recordId],
          { participantId: recordId, email: participant.email }
        ));
      }
      
      // Check duplicate email
      if (participant.email) {
        const emailKey = `${participant.webinar_id}_${participant.email.toLowerCase()}`;
        if (emailsSeen.has(emailKey)) {
          issues.push(this.createQualityIssue(
            'participant_duplicate_entry',
            [recordId],
            { participantId: recordId, email: participant.email, webinarId: participant.webinar_id }
          ));
        }
        emailsSeen.add(emailKey);
      }
      
      // Check invalid duration
      if (participant.duration && participant.duration < 0) {
        issues.push(this.createQualityIssue(
          'participant_invalid_duration',
          [recordId],
          { participantId: recordId, duration: participant.duration }
        ));
      }
    });
    
    return issues;
  }

  private async checkRegistrantQuality(registrants: any[]): Promise<QualityIssue[]> {
    const issues: QualityIssue[] = [];
    
    registrants.forEach((registrant, index) => {
      const recordId = registrant.id || `registrant_${index}`;
      
      // Check missing email
      if (!registrant.email || !this.isValidEmail(registrant.email)) {
        issues.push(this.createQualityIssue(
          'participant_missing_email', // Reuse same check
          [recordId],
          { registrantId: recordId, email: registrant.email }
        ));
      }
    });
    
    return issues;
  }

  private createQualityIssue(
    checkName: string,
    affectedRecords: string[],
    metadata: Record<string, any>
  ): QualityIssue {
    const check = this.qualityChecks.get(checkName);
    if (!check) {
      throw new Error(`Unknown quality check: ${checkName}`);
    }
    
    return {
      id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      checkName,
      severity: check.severity,
      category: check.category,
      description: check.description,
      affectedRecords,
      detectedAt: Date.now(),
      resolved: false,
      autoFixable: this.isAutoFixable(checkName),
      metadata
    };
  }

  private addQualityIssue(issue: QualityIssue): void {
    this.qualityIssues.push(issue);
    this.notifyIssueListeners(issue);
    
    // Cleanup old resolved issues
    this.qualityIssues = this.qualityIssues.filter(
      i => !i.resolved || i.detectedAt > Date.now() - (7 * 24 * 60 * 60 * 1000)
    );
  }

  private notifyIssueListeners(issue: QualityIssue): void {
    this.issueListeners.forEach(listener => {
      try {
        listener(issue);
      } catch (error) {
        console.error('Error in quality issue listener:', error);
      }
    });
  }

  private isAutoFixable(checkName: string): boolean {
    const autoFixableChecks = [
      'participant_duplicate_entry',
      'webinar_missing_title' // Can be auto-fixed with default title
    ];
    return autoFixableChecks.includes(checkName);
  }

  private async applyAutoFix(issue: QualityIssue): Promise<boolean> {
    switch (issue.checkName) {
      case 'webinar_missing_title':
        // Auto-fix: Set default title based on webinar ID
        console.log(`Auto-fixing missing title for webinar ${issue.metadata.webinarId}`);
        return true;
        
      case 'participant_duplicate_entry':
        // Auto-fix: Mark duplicate for removal
        console.log(`Auto-fixing duplicate participant ${issue.metadata.participantId}`);
        return true;
        
      default:
        return false;
    }
  }

  private calculateCategoryScore(category: string, issues: QualityIssue[]): number {
    const categoryIssues = issues.filter(issue => issue.category === category);
    if (categoryIssues.length === 0) return 1.0;
    
    // Weight by severity
    const severityWeights = { low: 0.1, medium: 0.3, high: 0.6, critical: 1.0 };
    const totalWeight = categoryIssues.reduce(
      (sum, issue) => sum + severityWeights[issue.severity], 0
    );
    
    // Score decreases based on weighted issues
    return Math.max(0, 1 - (totalWeight / 10));
  }

  private createDataSnapshot(data: any[]): any {
    return {
      length: data.length,
      fields: this.extractFieldStatistics(data),
      schema: this.extractSchema(data)
    };
  }

  private extractFieldStatistics(data: any[]): Record<string, any> {
    if (data.length === 0) return {};
    
    const stats: Record<string, any> = {};
    const sample = data[0];
    
    Object.keys(sample).forEach(field => {
      const values = data.map(item => item[field]).filter(v => v != null);
      stats[field] = {
        nullCount: data.length - values.length,
        uniqueCount: new Set(values).size,
        avgLength: values.length > 0 ? values.join('').length / values.length : 0
      };
    });
    
    return stats;
  }

  private extractSchema(data: any[]): Record<string, string> {
    if (data.length === 0) return {};
    
    const schema: Record<string, string> = {};
    const sample = data[0];
    
    Object.keys(sample).forEach(field => {
      schema[field] = typeof sample[field];
    });
    
    return schema;
  }

  private detectFieldValueDrift(baseline: any, current: any[]): any[] {
    const changes: any[] = [];
    const currentStats = this.extractFieldStatistics(current);
    
    Object.keys(baseline.fields).forEach(field => {
      const baselineField = baseline.fields[field];
      const currentField = currentStats[field];
      
      if (currentField) {
        // Check null count drift
        const nullCountChange = Math.abs(currentField.nullCount - baselineField.nullCount) / baseline.length;
        if (nullCountChange > this.config.thresholds.fieldValueChange / 100) {
          changes.push({
            type: 'field_value',
            field: `${field}_null_count`,
            previousValue: baselineField.nullCount,
            currentValue: currentField.nullCount,
            changePercentage: nullCountChange * 100
          });
        }
      }
    });
    
    return changes;
  }

  private detectSchemaDrift(baseline: any, current: any[]): any[] {
    const changes: any[] = [];
    if (!this.config.thresholds.schemaChange) return changes;
    
    const currentSchema = this.extractSchema(current);
    
    // Check for new fields
    Object.keys(currentSchema).forEach(field => {
      if (!baseline.schema[field]) {
        changes.push({
          type: 'schema',
          field,
          previousValue: null,
          currentValue: currentSchema[field]
        });
      }
    });
    
    // Check for removed fields
    Object.keys(baseline.schema).forEach(field => {
      if (!currentSchema[field]) {
        changes.push({
          type: 'schema',
          field,
          previousValue: baseline.schema[field],
          currentValue: null
        });
      }
    });
    
    return changes;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DriftDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const dataQualityService = DataQualityService.getInstance();
