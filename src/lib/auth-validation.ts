
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SecurityCheckResult {
  isValid: boolean;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export class AuthValidator {
  /**
   * Validate email format and domain
   */
  static validateEmail(email: string): SecurityCheckResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        message: 'Invalid email format',
        severity: 'error'
      };
    }

    // Check for common disposable email domains
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'yopmail.com'
    ];
    
    const domain = email.split('@')[1].toLowerCase();
    if (disposableDomains.includes(domain)) {
      return {
        isValid: false,
        message: 'Disposable email addresses are not allowed',
        severity: 'warning'
      };
    }

    return {
      isValid: true,
      message: 'Email format is valid',
      severity: 'info'
    };
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): SecurityCheckResult {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const passedChecks = Object.values(checks).filter(Boolean).length;

    if (passedChecks < 3) {
      return {
        isValid: false,
        message: 'Password is too weak. Use at least 8 characters with uppercase, lowercase, and numbers.',
        severity: 'error'
      };
    }

    if (passedChecks < 4) {
      return {
        isValid: true,
        message: 'Password strength is fair. Consider adding symbols for better security.',
        severity: 'warning'
      };
    }

    return {
      isValid: true,
      message: 'Password strength is strong',
      severity: 'info'
    };
  }

  /**
   * Check for common password patterns
   */
  static checkPasswordPatterns(password: string, email?: string): SecurityCheckResult {
    const commonPatterns = [
      'password', '123456', 'qwerty', 'abc123', 'admin',
      'welcome', 'login', 'user', 'test', 'demo'
    ];

    const lowerPassword = password.toLowerCase();
    
    for (const pattern of commonPatterns) {
      if (lowerPassword.includes(pattern)) {
        return {
          isValid: false,
          message: 'Password contains common patterns. Please choose a more unique password.',
          severity: 'error'
        };
      }
    }

    // Check if password contains email username
    if (email) {
      const emailUsername = email.split('@')[0].toLowerCase();
      if (lowerPassword.includes(emailUsername)) {
        return {
          isValid: false,
          message: 'Password should not contain your email username.',
          severity: 'error'
        };
      }
    }

    return {
      isValid: true,
      message: 'Password does not contain common patterns',
      severity: 'info'
    };
  }

  /**
   * Rate limiting check (client-side)
   */
  static checkRateLimit(action: 'login' | 'register' | 'reset'): SecurityCheckResult {
    const storageKey = `auth_attempt_${action}`;
    const maxAttempts = 5;
    const timeWindow = 15 * 60 * 1000; // 15 minutes

    try {
      const stored = localStorage.getItem(storageKey);
      const attempts = stored ? JSON.parse(stored) : [];
      const now = Date.now();

      // Clean old attempts
      const recentAttempts = attempts.filter((time: number) => now - time < timeWindow);

      if (recentAttempts.length >= maxAttempts) {
        return {
          isValid: false,
          message: `Too many ${action} attempts. Please try again in 15 minutes.`,
          severity: 'error'
        };
      }

      // Record this attempt
      recentAttempts.push(now);
      localStorage.setItem(storageKey, JSON.stringify(recentAttempts));

      return {
        isValid: true,
        message: 'Rate limit check passed',
        severity: 'info'
      };
    } catch (error) {
      // If localStorage fails, allow the action
      return {
        isValid: true,
        message: 'Rate limit check skipped',
        severity: 'info'
      };
    }
  }

  /**
   * Session validation
   */
  static async validateSession(): Promise<SecurityCheckResult> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        return {
          isValid: false,
          message: 'Session validation failed',
          severity: 'error'
        };
      }

      if (!session) {
        return {
          isValid: false,
          message: 'No active session',
          severity: 'info'
        };
      }

      // Check if session is expired
      const expiresAt = session.expires_at;
      if (expiresAt && expiresAt * 1000 < Date.now()) {
        return {
          isValid: false,
          message: 'Session has expired',
          severity: 'warning'
        };
      }

      return {
        isValid: true,
        message: 'Session is valid',
        severity: 'info'
      };
    } catch (error) {
      return {
        isValid: false,
        message: 'Session validation error',
        severity: 'error'
      };
    }
  }
}

/**
 * Security monitoring
 */
export class SecurityMonitor {
  static logSecurityEvent(event: string, details: Record<string, any>) {
    console.log(`[SECURITY] ${event}:`, details);
    
    // In production, send to security monitoring service
    // Example: analytics.track('security_event', { event, ...details });
  }

  static reportSuspiciousActivity(activity: string, context: Record<string, any>) {
    this.logSecurityEvent('suspicious_activity', { activity, ...context });
    
    // Note: We can't use the hook here, so we'll log and let calling code handle toast
    console.warn('[SECURITY] Suspicious activity detected:', { activity, ...context });
  }
}
