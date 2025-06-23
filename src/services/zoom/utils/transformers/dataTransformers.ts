
/**
 * Updated legacy export for backward compatibility
 * This file maintains the existing import structure while using the enhanced implementation
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

// Enhanced main transformer class with comprehensive field mapping
export class ZoomDataTransformers {
  // Enhanced webinar transformers with comprehensive field mapping
  static transformWebinarForDatabase(apiWebinar: any, connectionId: string) {
    console.log(`🔄 LEGACY TRANSFORMER: Using enhanced WebinarTransformers for webinar ${apiWebinar.id}`);
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

  // Enhanced participant transformers
  static transformParticipant(apiParticipant: any, webinarId: string) {
    return ParticipantTransformers.transformParticipant(apiParticipant, webinarId);
  }
}
