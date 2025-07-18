// Dynamic URL configuration for different environments
export class UrlConfig {
  private static getBaseUrl(): string {
    // Check for custom domain environment variable
    const customDomain = Deno.env.get('CUSTOM_DOMAIN');
    if (customDomain) {
      return `https://${customDomain}`;
    }
    
    // Check for production domain
    const productionDomain = Deno.env.get('PRODUCTION_DOMAIN');
    if (productionDomain) {
      return `https://${productionDomain}`;
    }
    
    // Default to Lovable preview URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (supabaseUrl) {
      // Extract project ID from Supabase URL
      const projectId = supabaseUrl.split('//')[1].split('.')[0];
      return `https://${projectId}.lovable.app`;
    }
    
    // Ultimate fallback - should not happen in production
    return 'https://webinar-wise-launchpad-17.lovable.app';
  }

  static getAuthCallbackUrl(): string {
    return `${this.getBaseUrl()}/auth/zoom/callback`;
  }

  static getAuthSuccessUrl(): string {
    return `${this.getBaseUrl()}/dashboard`;
  }

  static getAuthFailureUrl(): string {
    return `${this.getBaseUrl()}/auth/zoom/error`;
  }

  static getCurrentEnvironment(): 'development' | 'staging' | 'production' {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    if (supabaseUrl?.includes('localhost')) {
      return 'development';
    }
    if (supabaseUrl?.includes('staging')) {
      return 'staging';
    }
    return 'production';
  }
}