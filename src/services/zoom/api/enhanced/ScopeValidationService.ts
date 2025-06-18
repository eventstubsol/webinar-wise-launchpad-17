
/**
 * Scope validation service for Zoom API compliance
 */

export interface ZoomScopeRequirement {
  requiredScopes: string[];
  granularScopes?: string[];
  operation: string;
}

export class ScopeValidationService {
  private static readonly SCOPE_REQUIREMENTS: Record<string, ZoomScopeRequirement> = {
    'list_webinar_registrants': {
      requiredScopes: ['webinar:read:admin', 'webinar:read'],
      granularScopes: ['webinar:read:list_registrants', 'webinar:read:list_registrants:admin'],
      operation: 'List webinar registrants'
    },
    'get_webinar_details': {
      requiredScopes: ['webinar:read:admin', 'webinar:read'],
      granularScopes: ['webinar:read:webinar', 'webinar:read:webinar:admin'],
      operation: 'Get webinar details'
    },
    'get_webinar_participants': {
      requiredScopes: ['webinar:read:admin'],
      granularScopes: ['webinar:read:list_participants:admin'],
      operation: 'Get webinar participants'
    }
  };

  /**
   * Validate if the connection has required scopes for an operation
   */
  static validateScopes(
    operation: string,
    connectionScopes: string[],
    useGranularScopes: boolean = false
  ): {
    isValid: boolean;
    missingScopes: string[];
    recommendation?: string;
  } {
    const requirement = this.SCOPE_REQUIREMENTS[operation];
    
    if (!requirement) {
      return {
        isValid: true,
        missingScopes: []
      };
    }

    const requiredScopes = useGranularScopes && requirement.granularScopes 
      ? requirement.granularScopes 
      : requirement.requiredScopes;

    const missingScopes = requiredScopes.filter(scope => 
      !connectionScopes.includes(scope)
    );

    const isValid = missingScopes.length === 0;

    let recommendation: string | undefined;
    if (!isValid) {
      if (useGranularScopes && requirement.granularScopes) {
        recommendation = `For enhanced security, consider using granular scopes: ${requirement.granularScopes.join(', ')}`;
      } else {
        recommendation = `Required scopes for ${requirement.operation}: ${requiredScopes.join(', ')}`;
      }
    }

    return {
      isValid,
      missingScopes,
      recommendation
    };
  }

  /**
   * Get recommended scopes for a Zoom app configuration
   */
  static getRecommendedScopes(includeGranular: boolean = false): {
    basicScopes: string[];
    granularScopes: string[];
    description: string;
  } {
    const basicScopes = [
      'webinar:read:admin',
      'webinar:read',
      'webinar:write:admin',
      'user:read:admin'
    ];

    const granularScopes = [
      'webinar:read:list_registrants:admin',
      'webinar:read:list_participants:admin',
      'webinar:read:webinar:admin',
      'webinar:read:list_webinars:admin'
    ];

    return {
      basicScopes,
      granularScopes,
      description: includeGranular 
        ? 'Granular scopes provide fine-grained access control for enhanced security'
        : 'Basic scopes provide comprehensive access to webinar data and management'
    };
  }

  /**
   * Check if error is scope-related and provide helpful guidance
   */
  static analyzeScopeError(error: any, operation: string): {
    isScopeError: boolean;
    guidance?: string;
    requiredScopes?: string[];
  } {
    const errorMessage = error.message?.toLowerCase() || '';
    const isScopeError = errorMessage.includes('scope') || 
                        errorMessage.includes('permission') || 
                        errorMessage.includes('unauthorized') ||
                        errorMessage.includes('forbidden');

    if (!isScopeError) {
      return { isScopeError: false };
    }

    const requirement = this.SCOPE_REQUIREMENTS[operation];
    const guidance = requirement 
      ? `Missing required scopes for ${requirement.operation}. Please update your Zoom app configuration.`
      : 'Insufficient permissions. Please check your Zoom app scopes configuration.';

    return {
      isScopeError: true,
      guidance,
      requiredScopes: requirement?.requiredScopes
    };
  }
}
