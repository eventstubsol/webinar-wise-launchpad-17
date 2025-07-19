
import { WebinarTransformers } from './webinarTransformers';
import { ParticipantTransformers } from './participantTransformers';
import { InteractionTransformers } from './interactionTransformers';
import { MetricsTransformers } from './metricsTransformers';

// Export all transformer classes
export { WebinarTransformers } from './webinarTransformers';
export { ParticipantTransformers } from './participantTransformers';
export { InteractionTransformers } from './interactionTransformers';
export { MetricsTransformers } from './metricsTransformers';

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
}
