
/**
 * Participant data validation utilities
 */
export class ParticipantValidation {
  /**
   * Validate participant data structure
   */
  static validateParticipantData(participant: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Critical validations
    if (!participant) {
      errors.push('Participant data is null or undefined');
      return { isValid: false, errors, warnings };
    }

    // Check for any form of identifier
    const hasId = !!(
      participant.id || 
      participant.participant_id || 
      participant.user_id ||
      participant.email ||
      participant.participant_email ||
      participant.user_email
    );

    if (!hasId) {
      errors.push('No valid identifier found (id, email, or user_id)');
    }

    // Check for name
    const hasName = !!(
      participant.name ||
      participant.participant_name ||
      participant.display_name
    );

    if (!hasName) {
      warnings.push('No name field found');
    }

    // Check for email
    const hasEmail = !!(
      participant.email ||
      participant.participant_email ||
      participant.user_email
    );

    if (!hasEmail) {
      warnings.push('No email field found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
