
/**
 * Comprehensive data validation service for registrants and participants
 */
export class DataValidationService {
  /**
   * Validate registrant data quality and completeness
   */
  static validateRegistrantData(registrants: any[]): {
    isValid: boolean;
    completeness: number;
    issues: string[];
    validatedData: any[];
  } {
    const issues: string[] = [];
    const validatedData: any[] = [];
    let totalFields = 0;
    let completedFields = 0;
    
    for (const registrant of registrants) {
      const registrantIssues: string[] = [];
      
      // Validate required fields
      if (!registrant.email) {
        registrantIssues.push('Missing email address');
      } else if (!this.isValidEmail(registrant.email)) {
        registrantIssues.push('Invalid email format');
      }
      
      if (!registrant.registrant_id) {
        registrantIssues.push('Missing registrant ID');
      }
      
      // Calculate completeness
      const fields = [
        'email', 'first_name', 'last_name', 'org', 'job_title',
        'phone', 'city', 'country', 'industry'
      ];
      
      totalFields += fields.length;
      completedFields += fields.filter(field => registrant[field]).length;
      
      // Validate custom questions format
      if (registrant.custom_questions && typeof registrant.custom_questions !== 'object') {
        registrantIssues.push('Invalid custom questions format');
      }
      
      // Store validation results
      validatedData.push({
        ...registrant,
        validation_status: registrantIssues.length === 0 ? 'valid' : 'warning',
        validation_issues: registrantIssues
      });
      
      issues.push(...registrantIssues);
    }
    
    const completeness = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
    
    return {
      isValid: issues.length === 0,
      completeness: Math.round(completeness),
      issues: [...new Set(issues)], // Remove duplicates
      validatedData
    };
  }
  
  /**
   * Validate participant data quality and detect anomalies
   */
  static validateParticipantData(participants: any[]): {
    isValid: boolean;
    anomalies: string[];
    duplicates: any[];
    validatedData: any[];
  } {
    const anomalies: string[] = [];
    const duplicates: any[] = [];
    const validatedData: any[] = [];
    const seenEmails = new Map<string, any>();
    
    for (const participant of participants) {
      const participantAnomalies: string[] = [];
      
      // Validate required fields
      if (!participant.participant_id && !participant.participant_email) {
        participantAnomalies.push('Missing both participant ID and email');
      }
      
      // Validate timing data
      if (participant.join_time && participant.leave_time) {
        const joinTime = new Date(participant.join_time);
        const leaveTime = new Date(participant.leave_time);
        
        if (joinTime >= leaveTime) {
          participantAnomalies.push('Join time is after leave time');
        }
        
        const calculatedDuration = Math.floor((leaveTime.getTime() - joinTime.getTime()) / 1000 / 60);
        const reportedDuration = participant.duration || 0;
        
        if (Math.abs(calculatedDuration - reportedDuration) > 2) {
          participantAnomalies.push(`Duration mismatch: calculated ${calculatedDuration}min vs reported ${reportedDuration}min`);
        }
      }
      
      // Validate engagement metrics
      if (participant.attentiveness_score) {
        const score = parseInt(participant.attentiveness_score);
        if (score < 0 || score > 100) {
          participantAnomalies.push('Invalid attentiveness score');
        }
      }
      
      // Check for duplicates by email
      if (participant.participant_email) {
        const email = participant.participant_email.toLowerCase();
        if (seenEmails.has(email)) {
          duplicates.push({
            email,
            original: seenEmails.get(email),
            duplicate: participant
          });
        } else {
          seenEmails.set(email, participant);
        }
      }
      
      // Store validation results
      validatedData.push({
        ...participant,
        validation_status: participantAnomalies.length === 0 ? 'valid' : 'warning',
        validation_issues: participantAnomalies
      });
      
      anomalies.push(...participantAnomalies);
    }
    
    return {
      isValid: anomalies.length === 0 && duplicates.length === 0,
      anomalies: [...new Set(anomalies)],
      duplicates,
      validatedData
    };
  }
  
  /**
   * Cross-validate registrants against participants
   */
  static crossValidateData(registrants: any[], participants: any[]): {
    matchRate: number;
    noShowRegistrants: any[];
    unregisteredParticipants: any[];
    dataConsistencyIssues: string[];
  } {
    const issues: string[] = [];
    const noShowRegistrants: any[] = [];
    const unregisteredParticipants: any[] = [];
    
    // Find registrants who didn't attend
    for (const registrant of registrants) {
      const attended = participants.some(p => 
        (p.participant_email && p.participant_email.toLowerCase() === registrant.email.toLowerCase()) ||
        (p.registrant_id && p.registrant_id === registrant.registrant_id)
      );
      
      if (!attended && registrant.status === 'approved') {
        noShowRegistrants.push(registrant);
      }
    }
    
    // Find participants who weren't registered
    for (const participant of participants) {
      if (participant.participant_email) {
        const wasRegistered = registrants.some(r => 
          r.email.toLowerCase() === participant.participant_email.toLowerCase()
        );
        
        if (!wasRegistered) {
          unregisteredParticipants.push(participant);
        }
      }
    }
    
    const totalRegistrants = registrants.filter(r => r.status === 'approved').length;
    const attendedCount = totalRegistrants - noShowRegistrants.length;
    const matchRate = totalRegistrants > 0 ? (attendedCount / totalRegistrants) * 100 : 0;
    
    return {
      matchRate: Math.round(matchRate),
      noShowRegistrants,
      unregisteredParticipants,
      dataConsistencyIssues: issues
    };
  }
  
  /**
   * Generate comprehensive data quality report
   */
  static generateDataQualityReport(registrants: any[], participants: any[]): {
    overall_score: number;
    registrant_quality: any;
    participant_quality: any;
    cross_validation: any;
    recommendations: string[];
  } {
    const registrantValidation = this.validateRegistrantData(registrants);
    const participantValidation = this.validateParticipantData(participants);
    const crossValidation = this.crossValidateData(registrants, participants);
    
    // Calculate overall quality score
    let overallScore = 0;
    overallScore += registrantValidation.completeness * 0.3; // 30% weight
    overallScore += (participantValidation.isValid ? 100 : 50) * 0.3; // 30% weight
    overallScore += crossValidation.matchRate * 0.4; // 40% weight
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (registrantValidation.completeness < 70) {
      recommendations.push('Improve registrant data collection by making more fields required');
    }
    
    if (participantValidation.anomalies.length > 0) {
      recommendations.push('Review participant data anomalies for potential sync issues');
    }
    
    if (crossValidation.matchRate < 80) {
      recommendations.push('Investigate discrepancies between registrant and participant data');
    }
    
    if (crossValidation.unregisteredParticipants.length > 0) {
      recommendations.push('Review webinar settings to ensure registration is properly enforced');
    }
    
    return {
      overall_score: Math.round(overallScore),
      registrant_quality: registrantValidation,
      participant_quality: participantValidation,
      cross_validation: crossValidation,
      recommendations
    };
  }
  
  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
