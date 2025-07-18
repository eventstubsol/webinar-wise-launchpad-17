
// Security Headers and CSP Configuration

export const getContentSecurityPolicy = (): string => {
  const policy = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for React dev mode
      "'unsafe-eval'", // Required for some build tools
      'https://apis.google.com',
      'https://accounts.google.com',
      'https://www.gstatic.com',
      'https://zoom.us',
      'https://*.zoom.us'
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
      'https://*.zoom.us',
      'https://*.onrender.com'
    ],
    'frame-src': [
      "'self'",
      'https://accounts.google.com',
      'https://zoom.us',
      'https://*.zoom.us'
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'", 'https://zoom.us', 'https://*.zoom.us'],
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
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
});

// Apply security headers to document meta tags
export const applySecurityHeaders = () => {
  const headers = getSecurityHeaders();
  
  // Remove existing security meta tags to avoid duplicates
  const existingMetas = document.querySelectorAll('meta[http-equiv]');
  existingMetas.forEach(meta => {
    const httpEquiv = meta.getAttribute('http-equiv');
    if (httpEquiv && Object.keys(headers).includes(httpEquiv)) {
      meta.remove();
    }
  });
  
  // Add new security headers as meta tags
  Object.entries(headers).forEach(([name, value]) => {
    const meta = document.createElement('meta');
    meta.httpEquiv = name;
    meta.content = value;
    document.head.appendChild(meta);
  });
};

// Function to validate headers are properly set
export const validateSecurityHeaders = async (url: string = window.location.origin): Promise<{
  valid: boolean;
  missing: string[];
  present: string[];
}> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const requiredHeaders = Object.keys(getSecurityHeaders());
    const present: string[] = [];
    const missing: string[] = [];
    
    requiredHeaders.forEach(header => {
      if (response.headers.get(header)) {
        present.push(header);
      } else {
        missing.push(header);
      }
    });
    
    return {
      valid: missing.length === 0,
      missing,
      present
    };
  } catch (error) {
    console.error('Failed to validate security headers:', error);
    return {
      valid: false,
      missing: Object.keys(getSecurityHeaders()),
      present: []
    };
  }
};
