
/**
 * Legacy export for backward compatibility
 * This file maintains the existing import structure while the actual implementation
 * has been moved to focused transformer modules
 */
import { 
  WebinarTransformers,
  ParticipantTransformers,
  InteractionTransformers,
  MetricsTransformers
} from './transformers';

// Export the individual transformer classes for direct use
export {
  WebinarTransformers,
  ParticipantTransformers,
  InteractionTransformers,
  MetricsTransformers
} from './transformers';

// Main transformer class with all methods for backward compatibility
export class ZoomDataTransformers {
  // Webinar transformers
  static transformWebinarForDatabase(apiWebinar: any, connectionId: string) {
    return WebinarTransformers.transformWebinarForDatabase(apiWebinar, connectionId);
  }

  // Poll and Q&A transformers
  static transformPoll(apiPoll: any, webinarId: string) {
    return InteractionTransformers.transformPoll(apiPoll, webinarId);
  }

  static transformQnA(apiQnA: any, webinarId: string) {
    return InteractionTransformers.transformQnA(apiQnA, webinarId);
  }

  // Metrics calculations
  static calculateWebinarMetrics(participants: any[]) {
    return MetricsTransformers.calculateWebinarMetrics(participants);
  }

  // Participant transformers
  static transformParticipant(apiParticipant: any, webinarId: string) {
    return ParticipantTransformers.transformParticipant(apiParticipant, webinarId);
  }
}
