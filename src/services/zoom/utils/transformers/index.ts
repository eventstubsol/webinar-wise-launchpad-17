
/**
 * Re-export all transformer classes from their respective modules
 */
export { WebinarTransformers } from './webinarTransformers';
export { ParticipantTransformers } from './participantTransformers';
export { InteractionTransformers } from './interactionTransformers';
export { MetricsTransformers } from './metricsTransformers';

/**
 * Legacy ZoomDataTransformers class for backward compatibility
 * This maintains the existing API while delegating to the new focused transformers
 */
export class ZoomDataTransformers {
  // Webinar transformations
  static transformWebinarForDatabase = WebinarTransformers.transformWebinarForDatabase;
  static transformRegistrant = WebinarTransformers.transformRegistrant;

  // Participant transformations
  static transformParticipant = ParticipantTransformers.transformParticipant;
  static normalizeEngagementData = ParticipantTransformers.normalizeEngagementData;

  // Interaction transformations
  static transformPoll = InteractionTransformers.transformPoll;
  static transformQnA = InteractionTransformers.transformQnA;

  // Metrics calculations
  static calculateWebinarMetrics = MetricsTransformers.calculateWebinarMetrics;
  static extractCustomQuestions = MetricsTransformers.extractCustomQuestions;
}
