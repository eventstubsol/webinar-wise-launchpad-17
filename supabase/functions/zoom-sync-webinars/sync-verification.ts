import { updateSyncLog } from './database-operations.ts';

// Types for verification data
export interface SyncBaseline {
  totalWebinars: number;
  totalParticipants: number;
  totalRegistrants: number;
  pastWebinars: number;
  endedWebinars: number;
  webinarsWithParticipants: number;
  webinarsWithRegistrants: number;
  capturedAt: string;
}

export interface VerificationResult {
  passed: boolean;
  hasDataLoss: boolean;
  hasIntegrityWarnings: boolean;
  hasVerificationErrors: boolean;
  baseline: SyncBaseline;
  postSync: SyncBaseline;
  issues: VerificationIssue[];
  summary: {
    webinarsDelta: number;
    participantsDelta: number;
    registrantsDelta: number;
    integrityScore: number;
  };
}

export interface VerificationIssue {
  type: 'data_loss' | 'integrity_warning' | 'verification_error';
  severity: 'critical' | 'warning' | 'info';
  category: 'webinars' | 'participants' | 'registrants' | 'general';
  message: string;
  details: any;
  webinarIds?: string[];
}

/**
 * Capture baseline data before sync starts
 */
export async function capturePreSyncBaseline(
  supabase: any,
  connectionId: string
): Promise<SyncBaseline> {
  console.log(`📊 Capturing pre-sync baseline for connection: ${connectionId}`);
  
  try {
    // Get webinar counts and status breakdown
    const { data: webinarStats, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select('id, start_time, status, total_attendees, total_registrants')
      .eq('connection_id', connectionId);

    if (webinarError) {
      console.error('Error fetching webinar stats for baseline:', webinarError);
      throw new Error(`Failed to capture webinar baseline: ${webinarError.message}`);
    }

    // Get participant count
    const { count: participantCount, error: participantError } = await supabase
      .from('zoom_participants')
      .select('id', { count: 'exact' })
      .eq('connection_id', connectionId);

    if (participantError) {
      console.error('Error fetching participant count for baseline:', participantError);
      throw new Error(`Failed to capture participant baseline: ${participantError.message}`);
    }

    // Get registrant count  
    const { count: registrantCount, error: registrantError } = await supabase
      .from('zoom_registrants')
      .select('id', { count: 'exact' })
      .eq('connection_id', connectionId);

    if (registrantError) {
      console.error('Error fetching registrant count for baseline:', registrantError);
      throw new Error(`Failed to capture registrant baseline: ${registrantError.message}`);
    }

    const webinars = webinarStats || [];
    const now = new Date();
    
    // Calculate breakdown metrics
    const pastWebinars = webinars.filter(w => w.start_time && new Date(w.start_time) < now).length;
    const endedWebinars = webinars.filter(w => ['ended', 'finished'].includes(w.status?.toLowerCase())).length;
    const webinarsWithParticipants = webinars.filter(w => (w.total_attendees || 0) > 0).length;
    const webinarsWithRegistrants = webinars.filter(w => (w.total_registrants || 0) > 0).length;

    const baseline: SyncBaseline = {
      totalWebinars: webinars.length,
      totalParticipants: participantCount || 0,
      totalRegistrants: registrantCount || 0,
      pastWebinars,
      endedWebinars,
      webinarsWithParticipants,
      webinarsWithRegistrants,
      capturedAt: new Date().toISOString()
    };

    console.log(`✅ Pre-sync baseline captured:`, {
      webinars: baseline.totalWebinars,
      participants: baseline.totalParticipants,
      registrants: baseline.totalRegistrants,
      pastWebinars: baseline.pastWebinars,
      endedWebinars: baseline.endedWebinars
    });

    return baseline;
  } catch (error) {
    console.error('Failed to capture pre-sync baseline:', error);
    throw error;
  }
}

/**
 * Comprehensive sync verification after completion
 */
export async function verifySync(
  supabase: any,
  connectionId: string,
  baseline: SyncBaseline,
  syncLogId: string
): Promise<VerificationResult> {
  console.log(`🔍 Starting comprehensive sync verification for connection: ${connectionId}`);
  
  const issues: VerificationIssue[] = [];
  let hasDataLoss = false;
  let hasIntegrityWarnings = false;
  let hasVerificationErrors = false;

  try {
    // Capture post-sync baseline using same method
    const postSync = await capturePostSyncBaseline(supabase, connectionId);
    
    // 1. DATA LOSS VERIFICATION
    console.log(`📉 Checking for data loss...`);
    
    // Check for webinar data loss
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
      console.error(`❌ CRITICAL: Lost ${lostWebinars} webinars during sync`);
    }

    // Check for participant data loss
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
      console.error(`❌ CRITICAL: Lost ${lostParticipants} participants during sync`);
    }

    // Check for registrant data loss
    if (postSync.totalRegistrants < baseline.totalRegistrants) {
      const lostRegistrants = baseline.totalRegistrants - postSync.totalRegistrants;
      hasDataLoss = true;
      issues.push({
        type: 'data_loss',
        severity: 'critical',
        category: 'registrants',
        message: `Lost ${lostRegistrants} registrants during sync`,
        details: { 
          before: baseline.totalRegistrants, 
          after: postSync.totalRegistrants,
          lost: lostRegistrants
        }
      });
      console.error(`❌ CRITICAL: Lost ${lostRegistrants} registrants during sync`);
    }

    // 2. DATA QUALITY VERIFICATION
    console.log(`🔎 Checking data quality and integrity...`);
    
    // Get detailed webinar data for quality checks
    const { data: webinars, error: webinarError } = await supabase
      .from('zoom_webinars')
      .select(`
        id, webinar_id, title, start_time, status, 
        total_attendees, total_registrants,
        participant_sync_status
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
        hasIntegrityWarnings = true;
        issues.push({
          type: 'integrity_warning',
          severity: 'warning',
          category: 'participants',
          message: `${endedWebinarsWithoutParticipants.length} ended webinars have no participants`,
          details: { 
            count: endedWebinarsWithoutParticipants.length,
            webinars: endedWebinarsWithoutParticipants.map(w => ({
              id: w.webinar_id,
              title: w.title,
              status: w.status
            }))
          },
          webinarIds: endedWebinarsWithoutParticipants.map(w => w.webinar_id)
        });
        console.warn(`⚠️ WARNING: ${endedWebinarsWithoutParticipants.length} ended webinars have no participants`);
      }

      // Check past webinars without registrants (where registration might be expected)
      const pastWebinarsWithoutRegistrants = webinars.filter(w => {
        const isPast = w.start_time && new Date(w.start_time) < now;
        const hasNoRegistrants = (w.total_registrants || 0) === 0;
        return isPast && hasNoRegistrants;
      });

      if (pastWebinarsWithoutRegistrants.length > 0) {
        hasIntegrityWarnings = true;
        issues.push({
          type: 'integrity_warning',
          severity: 'info',
          category: 'registrants',
          message: `${pastWebinarsWithoutRegistrants.length} past webinars have no registrants`,
          details: { 
            count: pastWebinarsWithoutRegistrants.length,
            note: 'This may be normal for webinars that do not require registration'
          },
          webinarIds: pastWebinarsWithoutRegistrants.map(w => w.webinar_id)
        });
        console.log(`ℹ️ INFO: ${pastWebinarsWithoutRegistrants.length} past webinars have no registrants (may be normal)`);
      }

      // Check participant sync status issues
      const failedParticipantSyncs = webinars.filter(w => 
        w.participant_sync_status === 'failed'
      );

      if (failedParticipantSyncs.length > 0) {
        hasIntegrityWarnings = true;
        issues.push({
          type: 'integrity_warning',
          severity: 'warning',
          category: 'participants',
          message: `${failedParticipantSyncs.length} webinars have failed participant sync status`,
          details: { 
            count: failedParticipantSyncs.length,
            webinars: failedParticipantSyncs.map(w => ({
              id: w.webinar_id,
              title: w.title,
              syncStatus: w.participant_sync_status
            }))
          },
          webinarIds: failedParticipantSyncs.map(w => w.webinar_id)
        });
        console.warn(`⚠️ WARNING: ${failedParticipantSyncs.length} webinars have failed participant sync`);
      }
    }

    // 3. CALCULATE INTEGRITY SCORE (0-100)
    let integrityScore = 100;
    
    // Deduct points for data loss (most critical)
    if (hasDataLoss) {
      integrityScore -= 50; // Major penalty for data loss
    }
    
    // Deduct points for integrity warnings
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const warningIssues = issues.filter(i => i.severity === 'warning').length;
    const infoIssues = issues.filter(i => i.severity === 'info').length;
    
    integrityScore -= (criticalIssues * 20) + (warningIssues * 10) + (infoIssues * 5);
    integrityScore = Math.max(0, integrityScore); // Floor at 0

    // 4. BUILD VERIFICATION RESULT
    const result: VerificationResult = {
      passed: !hasDataLoss && !hasVerificationErrors,
      hasDataLoss,
      hasIntegrityWarnings,
      hasVerificationErrors,
      baseline,
      postSync,
      issues,
      summary: {
        webinarsDelta: postSync.totalWebinars - baseline.totalWebinars,
        participantsDelta: postSync.totalParticipants - baseline.totalParticipants,
        registrantsDelta: postSync.totalRegistrants - baseline.totalRegistrants,
        integrityScore
      }
    };

    // 5. LOG VERIFICATION RESULTS
    console.log(`🎯 Sync verification completed:`);
    console.log(`  - Verification passed: ${result.passed}`);
    console.log(`  - Data loss detected: ${hasDataLoss}`);
    console.log(`  - Integrity warnings: ${hasIntegrityWarnings}`);
    console.log(`  - Verification errors: ${hasVerificationErrors}`);
    console.log(`  - Integrity score: ${integrityScore}/100`);
    console.log(`  - Total issues found: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log(`📋 Issues breakdown:`);
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.webinarIds && issue.webinarIds.length > 0) {
          console.log(`      Affected webinars: ${issue.webinarIds.slice(0, 5).join(', ')}${issue.webinarIds.length > 5 ? '...' : ''}`);
        }
      });
    }

    return result;

  } catch (error) {
    console.error('Sync verification failed:', error);
    hasVerificationErrors = true;
    
    issues.push({
      type: 'verification_error',
      severity: 'critical',
      category: 'general',
      message: 'Sync verification process failed',
      details: { 
        error: error.message,
        stack: error.stack 
      }
    });

    // Return partial result with error
    return {
      passed: false,
      hasDataLoss: false,
      hasIntegrityWarnings: false,
      hasVerificationErrors: true,
      baseline,
      postSync: baseline, // Use baseline as fallback
      issues,
      summary: {
        webinarsDelta: 0,
        participantsDelta: 0,
        registrantsDelta: 0,
        integrityScore: 0
      }
    };
  }
}

/**
 * Capture post-sync baseline (same as pre-sync but with different logging)
 */
async function capturePostSyncBaseline(
  supabase: any,
  connectionId: string
): Promise<SyncBaseline> {
  console.log(`📊 Capturing post-sync baseline for verification...`);
  
  // Reuse the same logic as pre-sync baseline
  const baseline = await capturePreSyncBaseline(supabase, connectionId);
  
  console.log(`✅ Post-sync baseline captured:`, {
    webinars: baseline.totalWebinars,
    participants: baseline.totalParticipants,
    registrants: baseline.totalRegistrants,
    pastWebinars: baseline.pastWebinars,
    endedWebinars: baseline.endedWebinars
  });

  return baseline;
}

/**
 * Determine enhanced sync status based on verification results
 */
export function determineEnhancedSyncStatus(
  originalStatus: string,
  verificationResult: VerificationResult,
  processedCount: number,
  successCount: number
): string {
  // If original status === 'failed', keep failed status
  if (originalStatus === 'failed') {
    return 'failed';
  }

  // Check for verification-specific issues
  if (verificationResult.hasDataLoss) {
    return 'completed_with_data_loss';
  }

  if (verificationResult.hasVerificationErrors) {
    return 'completed_with_verification_errors';
  }

  if (verificationResult.hasIntegrityWarnings) {
    return 'completed_with_integrity_warnings';
  }

  // Check for processing issues
  if (processedCount !== successCount) {
    return 'completed_with_errors';
  }

  // All good!
  return 'completed';
}

/**
 * Generate comprehensive verification report
 */
export function generateVerificationReport(
  verificationResult: VerificationResult
): string {
  const { baseline, postSync, issues, summary } = verificationResult;
  
  const report = [
    '=== COMPREHENSIVE SYNC VERIFICATION REPORT ===',
    '',
    'VERIFICATION SUMMARY:',
    `  - Verification Status: ${verificationResult.passed ? 'PASSED' : 'FAILED'}`,
    `  - Data Loss Detected: ${verificationResult.hasDataLoss ? 'YES' : 'NO'}`,
    `  - Integrity Warnings: ${verificationResult.hasIntegrityWarnings ? 'YES' : 'NO'}`,
    `  - Verification Errors: ${verificationResult.hasVerificationErrors ? 'YES' : 'NO'}`,
    `  - Integrity Score: ${summary.integrityScore}/100`,
    '',
    'DATA CHANGE SUMMARY:',
    `  - Webinars: ${baseline.totalWebinars} → ${postSync.totalWebinars} (${summary.webinarsDelta >= 0 ? '+' : ''}${summary.webinarsDelta})`,
    `  - Participants: ${baseline.totalParticipants} → ${postSync.totalParticipants} (${summary.participantsDelta >= 0 ? '+' : ''}${summary.participantsDelta})`,
    `  - Registrants: ${baseline.totalRegistrants} → ${postSync.totalRegistrants} (${summary.registrantsDelta >= 0 ? '+' : ''}${summary.registrantsDelta})`,
    '',
    'DATA QUALITY METRICS:',
    `  - Past webinars: ${baseline.pastWebinars} → ${postSync.pastWebinars}`,
    `  - Ended webinars: ${baseline.endedWebinars} → ${postSync.endedWebinars}`,
    `  - Webinars with participants: ${baseline.webinarsWithParticipants} → ${postSync.webinarsWithParticipants}`,
    `  - Webinars with registrants: ${baseline.webinarsWithRegistrants} → ${postSync.webinarsWithRegistrants}`,
    ''
  ];

  if (issues.length > 0) {
    report.push('ISSUES FOUND:');
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    const infoIssues = issues.filter(i => i.severity === 'info');
    
    if (criticalIssues.length > 0) {
      report.push('  CRITICAL ISSUES:');
      criticalIssues.forEach(issue => {
        report.push(`    - ${issue.message}`);
        if (issue.webinarIds && issue.webinarIds.length > 0) {
          report.push(`      Affected webinars: ${issue.webinarIds.slice(0, 5).join(', ')}${issue.webinarIds.length > 5 ? '...' : ''}`);
        }
      });
      report.push('');
    }
    
    if (warningIssues.length > 0) {
      report.push('  WARNINGS:');
      warningIssues.forEach(issue => {
        report.push(`    - ${issue.message}`);
        if (issue.webinarIds && issue.webinarIds.length > 0) {
          report.push(`      Affected webinars: ${issue.webinarIds.slice(0, 5).join(', ')}${issue.webinarIds.length > 5 ? '...' : ''}`);
        }
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

  report.push('=== END VERIFICATION REPORT ===');
  return report.join('\n');
}
