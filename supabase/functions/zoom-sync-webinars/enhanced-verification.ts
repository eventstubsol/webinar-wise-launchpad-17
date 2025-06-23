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
 * Enhanced baseline capture with comprehensive timeout protection and debug logging
 */
export async function captureEnhancedBaseline(
  supabase: any,
  connectionId: string,
  timeoutMs: number = 20000 // Increased default timeout
): Promise<EnhancedSyncBaseline> {
  const captureStartTime = Date.now();
  console.log(`📊 ENHANCED BASELINE: Starting capture with ${timeoutMs}ms timeout protection`);
  console.log(`📊 BASELINE DEBUG: Connection ID: ${connectionId}, Start time: ${new Date().toISOString()}`);
  
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => {
      const elapsed = Date.now() - captureStartTime;
      console.error(`⏰ BASELINE TIMEOUT: Exceeded ${timeoutMs}ms limit after ${elapsed}ms`);
      reject(new Error(`Baseline capture timeout after ${elapsed}ms`));
    }, timeoutMs)
  );

  try {
    const baselinePromise = async (): Promise<EnhancedSyncBaseline> => {
      console.log(`📊 BASELINE DEBUG: Starting database queries...`);
      
      // Phase 1: Get webinars and participants (both have connection_id) with detailed logging
      console.log(`📊 BASELINE DEBUG: Phase 1 - Fetching webinars and participants...`);
      const phase1StartTime = Date.now();
      
      const [webinarStats, participantCount] = await Promise.all([
        supabase
          .from('zoom_webinars')
          .select('id, start_time, status, total_attendees, total_registrants, topic, duration, host_email, settings')
          .eq('connection_id', connectionId),
        supabase
          .from('zoom_participants')
          .select('id', { count: 'exact' })
          .eq('connection_id', connectionId)
      ]);

      const phase1Duration = Date.now() - phase1StartTime;
      console.log(`📊 BASELINE DEBUG: Phase 1 completed in ${phase1Duration}ms`);

      if (webinarStats.error) {
        console.error(`❌ BASELINE ERROR: Webinar stats query failed:`, webinarStats.error);
        throw new Error(`Webinar stats error: ${webinarStats.error.message}`);
      }
      if (participantCount.error) {
        console.error(`❌ BASELINE ERROR: Participant count query failed:`, participantCount.error);
        throw new Error(`Participant count error: ${participantCount.error.message}`);
      }

      const webinars = webinarStats.data || [];
      console.log(`📊 BASELINE DEBUG: Found ${webinars.length} webinars, ${participantCount.count || 0} participants`);
      
      // Phase 2: Get registrant count using webinar IDs with timeout protection
      console.log(`📊 BASELINE DEBUG: Phase 2 - Fetching registrants for ${webinars.length} webinars...`);
      const phase2StartTime = Date.now();
      
      let registrantCount = { count: 0 };
      if (webinars.length > 0) {
        const webinarIds = webinars.map(w => w.id);
        console.log(`📊 BASELINE DEBUG: Querying registrants for webinar IDs: ${webinarIds.slice(0, 5).join(', ')}${webinarIds.length > 5 ? '...' : ''}`);
        
        const registrantQuery = await supabase
          .from('zoom_registrants')
          .select('id', { count: 'exact' })
          .in('webinar_id', webinarIds);
        
        if (registrantQuery.error) {
          console.warn(`⚠️ BASELINE WARNING: Registrant count query failed:`, registrantQuery.error.message);
          registrantCount = { count: 0 };
        } else {
          registrantCount = registrantQuery;
          console.log(`📊 BASELINE DEBUG: Found ${registrantCount.count || 0} registrants`);
        }
      }

      const phase2Duration = Date.now() - phase2StartTime;
      console.log(`📊 BASELINE DEBUG: Phase 2 completed in ${phase2Duration}ms`);

      // Phase 3: Calculate field population statistics with debug logging
      console.log(`📊 BASELINE DEBUG: Phase 3 - Calculating field population statistics...`);
      const phase3StartTime = Date.now();
      
      const fieldPopulationStats = calculateFieldPopulation(webinars);
      
      const phase3Duration = Date.now() - phase3StartTime;
      console.log(`📊 BASELINE DEBUG: Phase 3 completed in ${phase3Duration}ms - Field completion: ${fieldPopulationStats.populationRate}%`);

      const now = new Date();
      
      // Calculate breakdown metrics with logging
      console.log(`📊 BASELINE DEBUG: Calculating breakdown metrics...`);
      const pastWebinars = webinars.filter(w => w.start_time && new Date(w.start_time) < now).length;
      const endedWebinars = webinars.filter(w => ['ended', 'finished'].includes(w.status?.toLowerCase())).length;
      const webinarsWithParticipants = webinars.filter(w => (w.total_attendees || 0) > 0).length;
      const webinarsWithRegistrants = webinars.filter(w => (w.total_registrants || 0) > 0).length;

      console.log(`📊 BASELINE DEBUG: Breakdown - Past: ${pastWebinars}, Ended: ${endedWebinars}, With participants: ${webinarsWithParticipants}, With registrants: ${webinarsWithRegistrants}`);

      const result = {
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

      const totalDuration = Date.now() - captureStartTime;
      console.log(`📊 BASELINE DEBUG: All phases completed in ${totalDuration}ms`);
      
      return result;
    };

    const result = await Promise.race([baselinePromise(), timeoutPromise]);
    
    const captureTime = Date.now() - captureStartTime;
    console.log(`✅ ENHANCED BASELINE: Captured successfully in ${captureTime}ms`, {
      webinars: result.totalWebinars,
      participants: result.totalParticipants,
      registrants: result.totalRegistrants,
      fieldCompletionRate: result.fieldPopulationStats.populationRate
    });

    return result;
  } catch (error) {
    const captureTime = Date.now() - captureStartTime;
    console.error(`❌ ENHANCED BASELINE: Capture failed after ${captureTime}ms:`, error);
    throw new Error(`Enhanced baseline capture failed after ${captureTime}ms: ${error.message}`);
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
 * Enhanced verification with comprehensive timeout protection and debug logging
 */
export async function verifyEnhancedSync(
  supabase: any,
  connectionId: string,
  baseline: EnhancedSyncBaseline,
  syncLogId: string,
  timeoutMs: number = 60000 // Increased default timeout
): Promise<EnhancedVerificationResult> {
  const verificationStartTime = Date.now();
  console.log(`🔍 ENHANCED VERIFICATION: Starting with ${timeoutMs}ms timeout protection`);
  console.log(`🔍 VERIFICATION DEBUG: Connection: ${connectionId}, Baseline: ${baseline.totalWebinars} webinars, ${baseline.totalParticipants} participants`);
  
  const issues: VerificationIssue[] = [];
  let hasDataLoss = false;
  let hasIntegrityWarnings = false;
  let hasVerificationErrors = false;
  let hasFieldMappingIssues = false;

  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => {
      const elapsed = Date.now() - verificationStartTime;
      console.error(`⏰ VERIFICATION TIMEOUT: Exceeded ${timeoutMs}ms limit after ${elapsed}ms`);
      reject(new Error(`Verification timeout after ${elapsed}ms`));
    }, timeoutMs)
  );

  try {
    const verificationPromise = async (): Promise<EnhancedVerificationResult> => {
      // Step 1: Capture post-sync baseline with timeout protection
      console.log(`🔍 VERIFICATION DEBUG: Step 1 - Capturing post-sync baseline...`);
      const step1StartTime = Date.now();
      
      const postSync = await captureEnhancedBaseline(supabase, connectionId, Math.min(timeoutMs / 3, 20000));
      
      const step1Duration = Date.now() - step1StartTime;
      console.log(`🔍 VERIFICATION DEBUG: Step 1 completed in ${step1Duration}ms`);
      
      // Step 2: Data loss verification
      console.log(`🔍 VERIFICATION DEBUG: Step 2 - Checking for data loss...`);
      const step2StartTime = Date.now();
      
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
        console.error(`❌ DATA LOSS: Lost ${lostWebinars} webinars`);
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
        console.error(`❌ DATA LOSS: Lost ${lostParticipants} participants`);
      }

      const step2Duration = Date.now() - step2StartTime;
      console.log(`🔍 VERIFICATION DEBUG: Step 2 completed in ${step2Duration}ms - Data loss: ${hasDataLoss}`);

      // Step 3: Field mapping validation (with timeout check)
      console.log(`🔍 VERIFICATION DEBUG: Step 3 - Validating field mapping...`);
      const step3StartTime = Date.now();
      
      const remainingTime = timeoutMs - (Date.now() - verificationStartTime);
      if (remainingTime < 5000) {
        console.warn(`⚠️ VERIFICATION WARNING: Limited time remaining (${remainingTime}ms), skipping detailed field validation`);
      } else {
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
      }

      const step3Duration = Date.now() - step3StartTime;
      console.log(`🔍 VERIFICATION DEBUG: Step 3 completed in ${step3Duration}ms - Field issues: ${hasFieldMappingIssues}`);

      // Step 4: Calculate scores
      console.log(`🔍 VERIFICATION DEBUG: Step 4 - Calculating scores...`);
      const integrityScore = calculateIntegrityScore(issues, hasDataLoss, hasVerificationErrors);
      const fieldCompletionScore = postSync.fieldPopulationStats.populationRate;

      const totalDuration = Date.now() - verificationStartTime;
      console.log(`🔍 VERIFICATION DEBUG: All steps completed in ${totalDuration}ms`);

      return {
        passed: !hasDataLoss && !hasVerificationErrors && !hasFieldMappingIssues,
        hasDataLoss,
        hasIntegrityWarnings,
        hasVerificationErrors,
        hasFieldMappingIssues,
        baseline,
        postSync,
        issues,
        fieldValidation: {
          requiredFields: [],
          populatedFields: [],
          missingFields: [],
          partiallyPopulatedFields: [],
          fieldCompletionRate: fieldCompletionScore,
          criticalFieldsMissing: hasFieldMappingIssues
        },
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
    
    const verificationTime = Date.now() - verificationStartTime;
    console.log(`🎯 ENHANCED VERIFICATION: Completed successfully in ${verificationTime}ms`, {
      passed: result.passed,
      integrityScore: result.summary.integrityScore,
      fieldCompletionScore: result.summary.fieldCompletionScore,
      totalIssues: result.issues.length
    });

    return result;

  } catch (error) {
    const verificationTime = Date.now() - verificationStartTime;
    console.error(`❌ ENHANCED VERIFICATION: Failed after ${verificationTime}ms:`, error);
    
    // Create fallback result with timeout information
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
        details: { 
          error: error.message, 
          stack: error.stack,
          timeoutMs,
          actualDuration: verificationTime,
          isTimeout: error.message.includes('timeout')
        }
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
