
/**
 * Enhanced verification processing with timeout protection
 */
import { updateSyncStage } from '../database-operations.ts';
import { 
  verifyEnhancedSync, 
  generateEnhancedVerificationReport,
  type EnhancedSyncBaseline,
  type EnhancedVerificationResult 
} from '../enhanced-verification.ts';

export async function executeEnhancedVerification(
  supabase: any,
  connectionId: string,
  syncLogId: string,
  preSync: EnhancedSyncBaseline | null,
  verificationTimeoutMs: number
): Promise<EnhancedVerificationResult | null> {
  console.log(`🔍 ENHANCED VERIFICATION: Running comprehensive post-sync verification...`);
  await updateSyncStage(supabase, syncLogId, null, 'verifying_sync_enhanced', 90);
  
  if (!preSync) {
    console.warn('⚠️ ENHANCED VERIFICATION: No baseline available, skipping verification');
    return null;
  }
  
  try {
    const verificationResult = await verifyEnhancedSync(
      supabase, 
      connectionId, 
      preSync, 
      syncLogId, 
      verificationTimeoutMs
    );
    
    console.log(`✅ ENHANCED VERIFICATION: Completed successfully`);
    console.log(`  🎯 Verification passed: ${verificationResult.passed}`);
    console.log(`  📊 Integrity score: ${verificationResult.summary.integrityScore}/100`);
    console.log(`  📋 Field completion: ${verificationResult.summary.fieldCompletionScore}%`);
    
    return verificationResult;
    
  } catch (verifyError) {
    console.error('❌ ENHANCED VERIFICATION: Failed:', verifyError);
    return {
      passed: false,
      hasDataLoss: false,
      hasIntegrityWarnings: false,
      hasVerificationErrors: true,
      hasFieldMappingIssues: false,
      baseline: preSync,
      postSync: preSync,
      issues: [{
        type: 'verification_error',
        severity: 'critical',
        category: 'general',
        message: `Enhanced verification failed: ${verifyError.message}`,
        details: { error: verifyError.message }
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
    } as EnhancedVerificationResult;
  }
}
