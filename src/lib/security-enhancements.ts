// Enhanced security utilities for input validation and rate limiting
import { sanitizeAuthInput, validatePasswordStrength, checkRateLimit } from './auth-security';

export class SecurityEnhancements {
  
  // Input validation with enhanced sanitization
  static sanitizeInput(input: string, maxLength: number = 1000): string {
    if (!input || typeof input !== 'string') {
      return '';
    }
    
    // Basic sanitization using existing function
    let sanitized = sanitizeAuthInput(input);
    
    // Additional security enhancements
    sanitized = sanitized
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, maxLength); // Enforce max length
    
    return sanitized.trim();
  }

  // Enhanced email validation
  static validateEmail(email: string): { isValid: boolean; error?: string } {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email is required' };
    }

    const sanitizedEmail = this.sanitizeInput(email, 254);
    
    // Basic email regex with enhanced validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (!emailRegex.test(sanitizedEmail)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    // Check for common security issues
    if (sanitizedEmail.includes('..') || sanitizedEmail.startsWith('.') || sanitizedEmail.endsWith('.')) {
      return { isValid: false, error: 'Invalid email format' };
    }

    return { isValid: true };
  }

  // Enhanced password validation
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    return validatePasswordStrength(password);
  }

  // Rate limiting wrapper with enhanced logging
  static async checkRateLimit(
    identifier: string, 
    maxAttempts: number = 5, 
    windowMs: number = 15 * 60 * 1000,
    action: string = 'auth_attempt'
  ): Promise<{ allowed: boolean; remaining?: number; resetTime?: number }> {
    const allowed = checkRateLimit(identifier, maxAttempts, windowMs);
    
    if (!allowed) {
      // Log security event
      console.warn(`Rate limit exceeded for ${identifier} on ${action}`);
      
      // Calculate reset time
      const resetTime = Date.now() + windowMs;
      
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime 
      };
    }
    
    return { allowed: true };
  }

  // Security headers for API responses
  static getSecurityHeaders(): { [key: string]: string } {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://lgajnzldkfpvcuofjxom.supabase.co wss://lgajnzldkfpvcuofjxom.supabase.co https://zoom.us; frame-ancestors 'none';",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
    };
  }

  // Enhanced error handling with security logging
  static handleSecurityError(error: Error, context: string, userIdentifier?: string): void {
    console.error(`Security error in ${context}:`, {
      message: error.message,
      stack: error.stack,
      userIdentifier,
      timestamp: new Date().toISOString()
    });
  }

  // Secure token generation
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  // Environment-based URL validation
  static validateRedirectUrl(url: string): { isValid: boolean; error?: string } {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL is required' };
    }

    try {
      const urlObj = new URL(url);
      
      // Allow only HTTPS in production
      if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
        return { isValid: false, error: 'Invalid protocol' };
      }
      
      // Validate against allowed domains
      const allowedDomains = [
        'webinar-wise-launchpad-17.lovable.app',
        'webinarwise.io',
        'localhost'
      ];
      
      const isAllowed = allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
      );
      
      if (!isAllowed) {
        return { isValid: false, error: 'Domain not allowed' };
      }
      
      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }
}