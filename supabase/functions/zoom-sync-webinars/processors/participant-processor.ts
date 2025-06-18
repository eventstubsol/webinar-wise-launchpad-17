
// UPDATED: Use enhanced participant processor as default
export { syncWebinarParticipantsEnhanced as syncWebinarParticipants } from './participant-processor-enhanced.ts';

// Re-export enhanced transformer for backward compatibility
export { transformParticipantForDatabaseEnhanced as transformParticipantForDatabase } from './participant-transformer-enhanced.ts';
