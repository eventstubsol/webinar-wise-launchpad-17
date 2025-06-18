
import { ParticipantValidation } from './validation';
import { ParticipantStatusMapping } from './statusMapping';
import { ParticipantEngagement } from './engagement';
import { ParticipantTransformation } from './transformation';

/**
 * Unified ParticipantTransformers class maintaining the original API
 */
export class ParticipantTransformers {
  // Validation methods
  static validateParticipantData = ParticipantValidation.validateParticipantData;

  // Transformation methods
  static transformParticipant = ParticipantTransformation.transformParticipant;

  // Status mapping methods
  static mapParticipantStatus = ParticipantStatusMapping.mapParticipantStatus;

  // Engagement methods
  static normalizeEngagementData = ParticipantEngagement.normalizeEngagementData;
  static formatDuration = ParticipantEngagement.formatDuration;
  static formatStatus = ParticipantEngagement.formatStatus;
}

// Re-export individual classes for direct use
export {
  ParticipantValidation,
  ParticipantStatusMapping,
  ParticipantEngagement,
  ParticipantTransformation
};
