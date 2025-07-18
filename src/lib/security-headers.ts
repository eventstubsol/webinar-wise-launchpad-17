// Security Headers and CSP Configuration

export const getContentSecurityPolicy = (): string => {
  const policy = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for React dev mode
      'https://apis.google.com',
      'https://accounts.google.com',
      'https://www.gstatic.com'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components and Tailwind
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'data:'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://*.supabase.co',
      'https://*.zoom.us'
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.zoom.us',
      'https://zoom.us',
      'https://*.onrender.com'
    ],
    'frame-src': [
      "'self'",
      'https://accounts.google.com',
      'https://zoom.us'
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  };

  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};

export const getSecurityHeaders = () => ({
  'Content-Security-Policy': getContentSecurityPolicy(),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
});

// Apply security headers to document
export const applySecurityHeaders = () => {
  const headers = getSecurityHeaders();
  
  Object.entries(headers).forEach(([name, value]) => {
    const meta = document.createElement('meta');
    meta.httpEquiv = name;
    meta.content = value;
    document.head.appendChild(meta);
  });
};