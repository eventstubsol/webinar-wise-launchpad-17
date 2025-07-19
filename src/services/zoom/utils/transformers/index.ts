import { WebinarTransformers } from './webinarTransformers';
import { ParticipantTransformers } from './participantTransformers';
import { InteractionTransformers } from './interactionTransformers';
import { MetricsTransformers } from './metricsTransformers';
import { EnhancedDataTransformers } from './enhancedDataTransformers';

// Export all transformer classes
export { WebinarTransformers } from './webinarTransformers';
export { ParticipantTransformers } from './participantTransformers';
export { InteractionTransformers } from './interactionTransformers';
export { MetricsTransformers } from './metricsTransformers';
export { EnhancedDataTransformers } from './enhancedDataTransformers';

// Main data transformers class for backward compatibility
export class ZoomDataTransformers {
  static transformWebinarForDatabase(apiWebinar: any, connectionId: string) {
    return WebinarTransformers.transformWebinarForDatabase(apiWebinar, connectionId);
  }

  static transformPoll(apiPoll: any, webinarId: string) {
    return InteractionTransformers.transformPoll(apiPoll, webinarId);
  }

  static transformQnA(apiQnA: any, webinarId: string) {
    return InteractionTransformers.transformQnA(apiQnA, webinarId);
  }

  static calculateWebinarMetrics(participants: any[]) {
    return MetricsTransformers.calculateWebinarMetrics(participants);
  }

  // Enhanced transformation methods
  static transformEnhancedRegistrant(apiRegistrant: any, webinarId: string) {
    return EnhancedDataTransformers.transformEnhancedRegistrant(apiRegistrant, webinarId);
  }

  static transformEnhancedParticipant(apiParticipant: any, webinarId: string) {
    return EnhancedDataTransformers.transformEnhancedParticipant(apiParticipant, webinarId);
  }

  static matchRegistrantsWithParticipants(registrants: any[], participants: any[]) {
    return EnhancedDataTransformers.matchRegistrantsWithParticipants(registrants, participants);
  }
}
