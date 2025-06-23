
import { updateSyncLog } from './database-operations.ts';

// Enhanced verification types with better error handling
export interface EnhancedSyncBaseline {
  totalWebinars: number;
  totalParticipants: number;
  totalRegistrants: number;
  pastWebinars: number;
  endedWebinars: number;
  webinarsWithParticipants: number;
  webinarsWithRegistrants: number;
  fieldPopulationStats: FieldPopulationStats;
  capturedAt: string;
}

export interface FieldPopulationStats {
  totalFields: number;
  populatedFields: number;
  missingFields: string[];
  populationRate: number;
}

export interface EnhancedVerificationResult {
  passed: boolean;
  hasDataLoss: boolean;
  hasIntegrityWarnings: boolean;
  hasVerificationErrors: boolean;
  hasFieldMappingIssues: boolean;
  baseline: EnhancedSyncBaseline;
  postSync: EnhancedSyncBaseline;
  issues: VerificationIssue[];
  fieldValidation: FieldValidationResult;
  summary: {
    webinarsDelta: number;
    participantsDelta: number;
    registrantsDelta: number;
    integrityScore: number;
    fieldCompletionScore: number;
  };
}

export interface VerificationIssue {
  type: 'data_loss' | 'integrity_warning' | 'verification_error' | 'field_mapping_error';
  severity: 'critical' | 'warning' | 'info';
  category: 'webinars' | 'participants' | 'registrants' | 'field_mapping' | 'general';
  message: string;
  details: any;
  webinarIds?: string[];
  affectedFields?: string[];
}

export interface FieldValidationResult {
  requiredFields: string[];
  populatedFields: string[];
  missingFields: string[];
  partiallyPopulatedFields: string[];
  fieldCompletionRate: number;
  criticalFieldsMissing: boolean;
}

/**
 * Enhanced baseline capture with field validation and timeout protection
 */
export async function captureEnhancedBaseline(
  supabase: any,
  connectionId: string,
  timeoutMs: number = 30000
): Promise<EnhancedSyncBaseline> {
  console.log(`📊 ENHANCED BASELINE: Capturing with timeout protection (${timeoutMs}ms)`);
  
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Baseline capture timeout')), timeoutMs)
  );

  try {
    const baselinePromise = async (): Promise<EnhancedSyncBaseline> => {
      // Get webinar field population stats
      const { data: webinarFieldStats, error: fieldError } = await supabase.rpc('get_webinar_field_stats', {
        p_connection_id: connectionId
      });

      if (fieldError) {
        console.warn('Field stats query failed, using basic stats:', fieldError);
      }

      // Get basic counts with timeout protection
      const [webinarStats, participantCount, registrantCount] = await Promise.all([
        supabase
          .from('zoom_webinars')
          .select('id, start_time, status, total_attendees, total_registrants, topic, duration, host_email, settings')
          .eq('connection_id', connectionId),
        supabase
          .from('zoom_participants')
          .select('id', { count: 'exact' })
          .eq('connection_id', connectionId),
        supabase
          .from('zoom_registrants')
          .select('id', { count: 'exact' })
          .eq('connection_id', connectionId)
      ]);

      if (webinarStats.error) throw new Error(`Webinar stats error: ${webinarStats.error.message}`);
      if (participantCount.error) throw new Error(`Participant count error: ${participantCount.error.message}`);
      if (registrantCount.error) throw new Error(`Registrant count error: ${registrantCount.error.message}`);

      const webinars = webinarStats.data || [];
      const now = new Date();
      
      // Calculate field population statistics
      const fieldPopulationStats = calculateFieldPopulation(webinars);
      
      // Calculate breakdown metrics
      const pastWebinars = webinars.filter(w => w.start_time && new Date(w.start_time) < now).length;
      const endedWebinars = webinars.filter(w => ['ended', 'finished'].includes(w.status?.toLowerCase())).length;
      const webinarsWithParticipants = webinars.filter(w => (w.total_attendees || 0) > 0).length;
      const webinarsWithRegistrants = webinars.filter(w => (w.total_registrants || 0) > 0).length;

      return {
        totalWebinars: webinars.length,
        totalParticipants: participantCount.count || 0,
        totalRegistrants: registrantCount.count || 0,
        pastWebinars,
        endedWebinars,
        webinarsWithParticipants,
        webinarsWithRegistrants,
        fieldPopulationStats,
        capturedAt: new Date().toISOString()
      };
    };

    const result = await Promise.race([baselinePromise(), timeoutPromise]);
    
    console.log(`✅ ENHANCED BASELINE: Captured successfully`, {
      webinars: result.totalWebinars,
      participants: result.totalParticipants,
      registrants: result.totalRegistrants,
      fieldCompletionRate: result.fieldPopulationStats.populationRate
    });

    return result;
  } catch (error) {
    console.error('❌ ENHANCED BASELINE: Capture failed:', error);
    throw new Error(`Enhanced baseline capture failed: ${error.message}`);
  }
}

/**
 * Calculate field population statistics for webinars
 */
function calculateFieldPopulation(webinars: any[]): FieldPopulationStats {
  if (webinars.length === 0) {
    return {
      totalFields: 39,
      populatedFields: 0,
      missingFields: [],
      populationRate: 0
    };
  }

  // Define all 39 expected database fields
  const expectedFields = [
    'connection_id', 'webinar_id', 'uuid', 'webinar_uuid', 'occurrence_id',
    'host_id', 'host_email', 'topic', 'agenda', 'type', 'status', 'start_time',
    'duration', 'timezone', 'webinar_created_at', 'registration_required',
    'registration_type', 'registration_url', 'join_url', 'start_url',
    'approval_type', 'max_registrants', 'max_attendees', 'password',
    'h323_passcode', 'pstn_password', 'encrypted_passcode', 'webinar_passcode',
    'pmi', 'is_simulive', 'simulive_webinar_id', 'total_registrants',
    'total_attendees', 'total_absentees', 'total_minutes', 'avg_attendance_duration',
    'attendees_count', 'registrants_count', 'settings'
  ];

  let totalPopulatedFields = 0;
  const missingFields = new Set<string>();

  // Check each webinar for field population
  webinars.forEach(webinar => {
    expectedFields.forEach(field => {
      const value = webinar[field];
      if (value !== null && value !== undefined && value !== '') {
        totalPopulatedFields++;
      } else {
        missingFields.add(field);
      }
    });
  });

  const totalPossibleFields = expectedFields.length * webinars.length;
  const populationRate = totalPossibleFields > 0 ? (totalPopulatedFields / totalPossibleFields) * 100 : 0;

  return {
    totalFields: expectedFields.length,
    populatedFields: totalPopulatedFields,
    missingFields: Array.from(missingFields),
    populationRate: Math.round(populationRate * 100) / 100
  };
}

/**
 * Enhanced verification with comprehensive field validation and timeout protection
 */
export async function verifyEnhancedSync(
  supabase: any,
  connectionId: string,
  baseline: EnhancedSyncBaseline,
  syncLogId: string,
  timeoutMs: number = 30000
): Promise<EnhancedVerificationResult> {
  console.log(`🔍 ENHANCED VERIFICATION: Starting comprehensive verification with timeout protection`);
  
  const issues: VerificationIssue[] = [];
  let hasDataLoss = false;
  let hasIntegrityWarnings = false;
  let hasVerificationErrors = false;
  let hasFieldMappingIssues = false;

  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error('Verification timeout')), timeoutMs)
  );

  try {
    const verificationPromise = async (): Promise<EnhancedVerificationResult> => {
      // Capture post-sync baseline with timeout protection
      const postSync = await captureEnhancedBaseline(supabase, connectionId, 15000);
      
      // 1. DATA LOSS VERIFICATION
      console.log(`📉 ENHANCED VERIFICATION: Checking for data loss...`);
      
      if (postSync.totalWebinars < baseline.totalWebinars) {
        const lostWebinars = baseline.totalWebinars - postSync.totalWebinars;
        hasDataLoss = true;
        issues.push({
          type: 'data_loss',
          severity: 'critical',
          category: 'webinars',
          message: `Lost ${lostWebinars} webinars during sync`,
          details: { 
            before: baseline.totalWebinars, 
            after: postSync.totalWebinars,
            lost: lostWebinars
          }
        });
      }

      if (postSync.totalParticipants < baseline.totalParticipants) {
        const lostParticipants = baseline.totalParticipants - postSync.totalParticipants;
        hasDataLoss = true;
        issues.push({
          type: 'data_loss',
          severity: 'critical',
          category: 'participants',
          message: `Lost ${lostParticipants} participants during sync`,
          details: { 
            before: baseline.totalParticipants, 
            after: postSync.totalParticipants,
            lost: lostParticipants
          }
        });
      }

      // 2. FIELD MAPPING VALIDATION
      console.log(`🔎 ENHANCED VERIFICATION: Validating field mapping...`);
      
      const fieldValidation = await validateFieldMapping(supabase, connectionId);
      
      if (fieldValidation.criticalFieldsMissing) {
        hasFieldMappingIssues = true;
        issues.push({
          type: 'field_mapping_error',
          severity: 'critical',
          category: 'field_mapping',
          message: `Critical fields missing: ${fieldValidation.missingFields.join(', ')}`,
          details: fieldValidation,
          affectedFields: fieldValidation.missingFields
        });
      }

      if (fieldValidation.fieldCompletionRate < 90) {
        hasFieldMappingIssues = true;
        issues.push({
          type: 'field_mapping_error',
          severity: 'warning',
          category: 'field_mapping',
          message: `Low field completion rate: ${fieldValidation.fieldCompletionRate}%`,
          details: fieldValidation,
          affectedFields: fieldValidation.missingFields
        });
      }

      // 3. DATA QUALITY VERIFICATION
      console.log(`🔎 ENHANCED VERIFICATION: Checking data quality...`);
      
      const { data: webinars, error: webinarError } = await supabase
        .from('zoom_webinars')
        .select(`
          id, webinar_id, topic, start_time, status, 
          total_attendees, total_registrants,
          participant_sync_status, settings, host_email
        `)
        .eq('connection_id', connectionId);

      if (webinarError) {
        hasVerificationErrors = true;
        issues.push({
          type: 'verification_error',
          severity: 'warning',
          category: 'general',
          message: 'Failed to fetch webinar data for quality verification',
          details: { error: webinarError.message }
        });
      } else {
        // Check for data quality issues
        await checkDataQualityIssues(webinars, issues);
        hasIntegrityWarnings = issues.some(i => i.type === 'integrity_warning');
      }

      // 4. CALCULATE SCORES
      const integrityScore = calculateIntegrityScore(issues, hasDataLoss, hasVerificationErrors);
      const fieldCompletionScore = postSync.fieldPopulationStats.populationRate;

      return {
        passed: !hasDataLoss && !hasVerificationErrors && !hasFieldMappingIssues,
        hasDataLoss,
        hasIntegrityWarnings,
        hasVerificationErrors,
        hasFieldMappingIssues,
        baseline,
        postSync,
        issues,
        fieldValidation,
        summary: {
          webinarsDelta: postSync.totalWebinars - baseline.totalWebinars,
          participantsDelta: postSync.totalParticipants - baseline.totalParticipants,
          registrantsDelta: postSync.totalRegistrants - baseline.totalRegistrants,
          integrityScore,
          fieldCompletionScore
        }
      };
    };

    const result = await Promise.race([verificationPromise(), timeoutPromise]);
    
    console.log(`🎯 ENHANCED VERIFICATION: Completed successfully`, {
      passed: result.passed,
      integrityScore: result.summary.integrityScore,
      fieldCompletionScore: result.summary.fieldCompletionScore,
      totalIssues: result.issues.length
    });

    return result;

  } catch (error) {
    console.error('❌ ENHANCED VERIFICATION: Failed:', error);
    
    // Create fallback result
    return {
      passed: false,
      hasDataLoss: false,
      hasIntegrityWarnings: false,
      hasVerificationErrors: true,
      hasFieldMappingIssues: false,
      baseline,
      postSync: baseline, // Use baseline as fallback
      issues: [{
        type: 'verification_error',
        severity: 'critical',
        category: 'general',
        message: `Verification process failed: ${error.message}`,
        details: { error: error.message, stack: error.stack }
      }],
      fieldValidation: {
        requiredFields: [],
        populatedFields: [],
        missingFields: [],
        partiallyPopulatedFields: [],
        fieldCompletionRate: 0,
        criticalFieldsMissing: true
      },
      summary: {
        webinarsDelta: 0,
        participantsDelta: 0,
        registrantsDelta: 0,
        integrityScore: 0,
        fieldCompletionScore: 0
      }
    };
  }
}

/**
 * Validate field mapping completeness
 */
async function validateFieldMapping(supabase: any, connectionId: string): Promise<FieldValidationResult> {
  const criticalFields = [
    'webinar_id', 'topic', 'host_email', 'start_time', 'status'
  ];
  
  const requiredFields = [
    'connection_id', 'webinar_id', 'topic', 'start_time', 'status', 
    'host_email', 'duration', 'type'
  ];

  const { data: webinars, error } = await supabase
    .from('zoom_webinars')
    .select('*')
    .eq('connection_id', connectionId)
    .limit(10);

  if (error || !webinars || webinars.length === 0) {
    return {
      requiredFields,
      populatedFields: [],
      missingFields: requiredFields,
      partiallyPopulatedFields: [],
      fieldCompletionRate: 0,
      criticalFieldsMissing: true
    };
  }

  const populatedFields = new Set<string>();
  const missingFields = new Set<string>();
  const partiallyPopulatedFields = new Set<string>();

  // Check field population across sample webinars
  requiredFields.forEach(field => {
    const populatedCount = webinars.filter(w => 
      w[field] !== null && w[field] !== undefined && w[field] !== ''
    ).length;
    
    if (populatedCount === webinars.length) {
      populatedFields.add(field);
    } else if (populatedCount === 0) {
      missingFields.add(field);
    } else {
      partiallyPopulatedFields.add(field);
    }
  });

  const fieldCompletionRate = (populatedFields.size / requiredFields.length) * 100;
  const criticalFieldsMissing = criticalFields.some(field => missingFields.has(field));

  return {
    requiredFields,
    populatedFields: Array.from(populatedFields),
    missingFields: Array.from(missingFields),
    partiallyPopulatedFields: Array.from(partiallyPopulatedFields),
    fieldCompletionRate: Math.round(fieldCompletionRate * 100) / 100,
    criticalFieldsMissing
  };
}

/**
 * Check for data quality issues
 */
async function checkDataQualityIssues(webinars: any[], issues: VerificationIssue[]): Promise<void> {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - (5 * 60 * 1000));
  
  // Check ended webinars without participants
  const endedWebinarsWithoutParticipants = webinars.filter(w => {
    const isEnded = ['ended', 'finished'].includes(w.status?.toLowerCase());
    const isOldEnough = w.start_time && new Date(w.start_time) < fiveMinutesAgo;
    const hasNoParticipants = (w.total_attendees || 0) === 0;
    return isEnded && isOldEnough && hasNoParticipants;
  });

  if (endedWebinarsWithoutParticipants.length > 0) {
    issues.push({
      type: 'integrity_warning',
      severity: 'warning',
      category: 'participants',
      message: `${endedWebinarsWithoutParticipants.length} ended webinars have no participants`,
      details: { 
        count: endedWebinarsWithoutParticipants.length,
        webinars: endedWebinarsWithoutParticipants.map(w => ({
          id: w.webinar_id,
          topic: w.topic,
          status: w.status
        }))
      },
      webinarIds: endedWebinarsWithoutParticipants.map(w => w.webinar_id)
    });
  }

  // Check for missing critical fields
  const webinarsWithMissingFields = webinars.filter(w => 
    !w.topic || !w.host_email || !w.start_time
  );

  if (webinarsWithMissingFields.length > 0) {
    issues.push({
      type: 'integrity_warning',
      severity: 'critical',
      category: 'field_mapping',
      message: `${webinarsWithMissingFields.length} webinars missing critical fields`,
      details: { 
        count: webinarsWithMissingFields.length,
        missingFields: ['topic', 'host_email', 'start_time']
      },
      webinarIds: webinarsWithMissingFields.map(w => w.webinar_id)
    });
  }
}

/**
 * Calculate overall integrity score
 */
function calculateIntegrityScore(
  issues: VerificationIssue[], 
  hasDataLoss: boolean, 
  hasVerificationErrors: boolean
): number {
  let score = 100;
  
  // Major penalties
  if (hasDataLoss) score -= 50;
  if (hasVerificationErrors) score -= 30;
  
  // Issue-based penalties
  const criticalIssues = issues.filter(i => i.severity === 'critical').length;
  const warningIssues = issues.filter(i => i.severity === 'warning').length;
  const infoIssues = issues.filter(i => i.severity === 'info').length;
  
  score -= (criticalIssues * 20) + (warningIssues * 10) + (infoIssues * 5);
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate comprehensive verification report
 */
export function generateEnhancedVerificationReport(result: EnhancedVerificationResult): string {
  const { baseline, postSync, issues, summary, fieldValidation } = result;
  
  const report = [
    '=== ENHANCED SYNC VERIFICATION REPORT ===',
    '',
    'VERIFICATION SUMMARY:',
    `  - Overall Status: ${result.passed ? 'PASSED ✅' : 'FAILED ❌'}`,
    `  - Data Loss Detected: ${result.hasDataLoss ? 'YES ❌' : 'NO ✅'}`,
    `  - Field Mapping Issues: ${result.hasFieldMappingIssues ? 'YES ❌' : 'NO ✅'}`,
    `  - Integrity Warnings: ${result.hasIntegrityWarnings ? 'YES ⚠️' : 'NO ✅'}`,
    `  - Verification Errors: ${result.hasVerificationErrors ? 'YES ❌' : 'NO ✅'}`,
    '',
    'QUALITY SCORES:',
    `  - Integrity Score: ${summary.integrityScore}/100`,
    `  - Field Completion Score: ${summary.fieldCompletionScore}%`,
    '',
    'DATA CHANGE SUMMARY:',
    `  - Webinars: ${baseline.totalWebinars} → ${postSync.totalWebinars} (${summary.webinarsDelta >= 0 ? '+' : ''}${summary.webinarsDelta})`,
    `  - Participants: ${baseline.totalParticipants} → ${postSync.totalParticipants} (${summary.participantsDelta >= 0 ? '+' : ''}${summary.participantsDelta})`,
    `  - Registrants: ${baseline.totalRegistrants} → ${postSync.totalRegistrants} (${summary.registrantsDelta >= 0 ? '+' : ''}${summary.registrantsDelta})`,
    '',
    'FIELD MAPPING VALIDATION:',
    `  - Required Fields: ${fieldValidation.requiredFields.length}`,
    `  - Populated Fields: ${fieldValidation.populatedFields.length}`,
    `  - Missing Fields: ${fieldValidation.missingFields.length}`,
    `  - Completion Rate: ${fieldValidation.fieldCompletionRate}%`,
    `  - Critical Fields Missing: ${fieldValidation.criticalFieldsMissing ? 'YES ❌' : 'NO ✅'}`,
    ''
  ];

  if (fieldValidation.missingFields.length > 0) {
    report.push('MISSING FIELDS:');
    fieldValidation.missingFields.forEach(field => {
      report.push(`  - ${field}`);
    });
    report.push('');
  }

  if (issues.length > 0) {
    report.push('ISSUES FOUND:');
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    const infoIssues = issues.filter(i => i.severity === 'info');
    
    if (criticalIssues.length > 0) {
      report.push('  CRITICAL ISSUES:');
      criticalIssues.forEach(issue => {
        report.push(`    - ${issue.message}`);
        if (issue.affectedFields && issue.affectedFields.length > 0) {
          report.push(`      Affected fields: ${issue.affectedFields.join(', ')}`);
        }
      });
      report.push('');
    }
    
    if (warningIssues.length > 0) {
      report.push('  WARNINGS:');
      warningIssues.forEach(issue => {
        report.push(`    - ${issue.message}`);
      });
      report.push('');
    }
    
    if (infoIssues.length > 0) {
      report.push('  INFORMATION:');
      infoIssues.forEach(issue => {
        report.push(`    - ${issue.message}`);
      });
      report.push('');
    }
  } else {
    report.push('✅ No issues found - sync completed successfully with full data integrity!');
    report.push('');
  }

  report.push('=== END ENHANCED VERIFICATION REPORT ===');
  return report.join('\n');
}
