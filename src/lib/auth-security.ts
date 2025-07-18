// Authentication Security Enhancements

// Password strength validation
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak patterns
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /(.)\1{3,}/, // Repeated characters
  ];
  
  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common weak patterns');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Rate limiting for authentication attempts
const attemptCounts = new Map<string, { count: number; lastAttempt: number }>();

export const checkRateLimit = (identifier: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean => {
  const now = Date.now();
  const key = identifier.toLowerCase();
  const existing = attemptCounts.get(key);
  
  if (!existing) {
    attemptCounts.set(key, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Reset if outside window
  if (now - existing.lastAttempt > windowMs) {
    attemptCounts.set(key, { count: 1, lastAttempt: now });
    return true;
  }
  
  // Check if over limit
  if (existing.count >= maxAttempts) {
    return false;
  }
  
  // Increment count
  existing.count++;
  existing.lastAttempt = now;
  return true;
};

// Clear rate limit on successful auth
export const clearRateLimit = (identifier: string): void => {
  attemptCounts.delete(identifier.toLowerCase());
};

// Security headers for forms
export const getSecurityHeaders = () => ({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
});

// Input sanitization for auth forms
export const sanitizeAuthInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};