
/**
 * Legacy export for backward compatibility
 * This file maintains the existing import structure while the actual implementation
 * has been moved to focused transformer modules
 */
export { ZoomDataTransformers } from './transformers';

// Also export the individual transformer classes for direct use
export {
  WebinarTransformers,
  ParticipantTransformers,
  InteractionTransformers,
  MetricsTransformers
} from './transformers';

// Export the main transformer with updated field mappings
export class ZoomDataTransformers {
  static transformWebinarForDatabase(apiWebinar: any, connectionId: string) {
    return WebinarTransformers.transformWebinarForDatabase(apiWebinar, connectionId);
  }
}
