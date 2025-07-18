
// Route configuration for the application
export const ROUTES = {
  // Public routes
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  UNSUBSCRIBE: '/unsubscribe',
  PRIVACY_POLICY: '/privacy-policy',
  TERMS_OF_SERVICE: '/terms',
  SUPPORT: '/support',
  DOCUMENTATION: '/documentation',

  // Protected routes - Core
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',

  // Protected routes - Zoom Integration
  ZOOM_TEST: '/zoom-test',
  ZOOM_DIAGNOSTICS: '/zoom-diagnostics',

  // Protected routes - Data Management
  WEBINARS: '/webinars',
  WEBINAR_DETAIL: '/webinars/:webinarId',
  SYNC_CENTER: '/sync-center',
  CSV_UPLOAD: '/csv-upload',

  // Protected routes - Analytics
  ADVANCED_ANALYTICS: '/advanced-analytics',
  AI_INSIGHTS: '/ai-insights',
  EMAIL_ANALYTICS: '/email-analytics',
  PREDICTIVE_ANALYTICS: '/predictive-analytics',

  // Protected routes - Email & Campaigns
  TEMPLATES: '/templates',
  CAMPAIGNS: '/campaigns',
  SEGMENTATION: '/segmentation',
  PERSONALIZATION: '/personalization',

  // Protected routes - Integrations
  CRM: '/crm',
  INTEGRATIONS: '/integrations',

  // Protected routes - Reports
  REPORTS: '/reports',
} as const;
