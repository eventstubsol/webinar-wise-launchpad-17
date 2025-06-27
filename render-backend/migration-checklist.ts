/**
 * Edge Functions Migration Checklist
 * This file tracks all edge functions and their migration status to Render backend
 */

export const EDGE_FUNCTIONS_TO_MIGRATE = {
  // Email-related functions
  email: {
    functions: [
      {
        name: 'enhanced-email-sender',
        status: 'TODO',
        description: 'Sends personalized emails with tracking',
        dependencies: ['Resend API', 'Email tracking'],
        renderEndpoint: '/api/email/send'
      },
      {
        name: 'email-tracking',
        status: 'TODO',
        description: 'Tracks email opens, clicks, and unsubscribes',
        dependencies: ['Tracking pixel generation'],
        renderEndpoint: '/api/email/track/:action'
      },
      {
        name: 'process-email-queue',
        status: 'TODO',
        description: 'Processes queued emails in batches',
        dependencies: ['Queue management', 'Batch processing'],
        renderEndpoint: '/api/email/process-queue'
      },
      {
        name: 'campaign-scheduler',
        status: 'TODO',
        description: 'Schedules and manages email campaigns',
        dependencies: ['Cron jobs', 'Campaign logic'],
        renderEndpoint: '/api/campaigns/schedule'
      },
      {
        name: 'launch-campaign',
        status: 'TODO',
        description: 'Launches email campaigns',
        dependencies: ['Audience segmentation', 'A/B testing'],
        renderEndpoint: '/api/campaigns/launch'
      },
      {
        name: 'manage-email-preferences',
        status: 'TODO',
        description: 'Manages user email preferences and unsubscribes',
        dependencies: ['Preference tokens'],
        renderEndpoint: '/api/email/preferences'
      }
    ]
  },

  // AI/Analytics functions
  ai: {
    functions: [
      {
        name: 'ai-insights-generator',
        status: 'TODO',
        description: 'Generates AI-powered insights from webinar data',
        dependencies: ['OpenAI API', 'Data aggregation'],
        renderEndpoint: '/api/ai/generate-insights'
      },
      {
        name: 'update-predictive-models',
        status: 'TODO',
        description: 'Updates ML models for predictions',
        dependencies: ['Model training', 'Data processing'],
        renderEndpoint: '/api/ai/update-models'
      },
      {
        name: 'realtime-analytics-processor',
        status: 'TODO',
        description: 'Processes real-time analytics data',
        dependencies: ['Analytics aggregation', 'Real-time updates'],
        renderEndpoint: '/api/analytics/process'
      }
    ]
  },

  // CRM Integration functions
  crm: {
    functions: [
      {
        name: 'crm-oauth-callback',
        status: 'TODO',
        description: 'Handles OAuth callbacks for CRM integrations',
        dependencies: ['OAuth flow', 'Token exchange'],
        renderEndpoint: '/api/crm/oauth/callback'
      },
      {
        name: 'crm-webhook-receiver',
        status: 'TODO',
        description: 'Receives and processes CRM webhooks',
        dependencies: ['Webhook validation', 'Event processing'],
        renderEndpoint: '/api/crm/webhook'
      }
    ]
  },

  // Zoom-related functions (already migrated or unused)
  zoom: {
    functions: [
      {
        name: 'zoom-sync-webinars',
        status: 'MIGRATED',
        description: 'Main webinar sync function',
        renderEndpoint: '/zoom/sync-webinars'
      },
      {
        name: 'zoom-sync-webinars-v2',
        status: 'NOT_DEPLOYED',
        description: 'V2 sync function that was never deployed',
        renderEndpoint: 'N/A'
      },
      {
        name: 'zoom-oauth-callback',
        status: 'MIGRATED',
        description: 'Zoom OAuth callback handler',
        renderEndpoint: '/zoom/oauth/callback'
      },
      {
        name: 'zoom-oauth-exchange',
        status: 'MIGRATED',
        description: 'Zoom OAuth token exchange',
        renderEndpoint: '/zoom/oauth/exchange'
      },
      {
        name: 'zoom-token-refresh',
        status: 'MIGRATED',
        description: 'Refreshes Zoom OAuth tokens',
        renderEndpoint: '/zoom/refresh-token'
      }
    ]
  },

  // Utility functions
  utility: {
    functions: [
      {
        name: 'export-user-data',
        status: 'TODO',
        description: 'Exports user data for GDPR compliance',
        dependencies: ['Data aggregation', 'Format conversion'],
        renderEndpoint: '/api/user/export-data'
      },
      {
        name: 'delete-account',
        status: 'TODO',
        description: 'Handles account deletion requests',
        dependencies: ['Data cleanup', 'Auth deletion'],
        renderEndpoint: '/api/user/delete-account'
      },
      {
        name: 'generate-pdf-report',
        status: 'TODO',
        description: 'Generates PDF reports from data',
        dependencies: ['PDF generation', 'Template rendering'],
        renderEndpoint: '/api/reports/generate-pdf'
      },
      {
        name: 'send-scheduled-report',
        status: 'TODO',
        description: 'Sends scheduled reports to users',
        dependencies: ['Scheduling', 'Report generation'],
        renderEndpoint: '/api/reports/send-scheduled'
      }
    ]
  },

  // Unused or deprecated functions
  unused: {
    functions: [
      'clear-zoom-connections',
      'fix-webinar-sync-data',
      'process-behavioral-events',
      'process-participant-retries',
      'resend-webhook',
      'run-optimization-algorithms',
      'test-sync-error-handling',
      'test-zoom-rate-limits',
      'validate-zoom-credentials',
      'zoom-delta-sync',
      'zoom-progressive-sync',
      'zoom-sync-diagnostics',
      'zoom-sync-progress',
      'zoom-sync-simple',
      'zoom-test-fetch',
      'zoom-webhook'
    ]
  }
};

// Helper function to get migration progress
export function getMigrationProgress() {
  let total = 0;
  let migrated = 0;
  let todo = 0;
  let notNeeded = 0;

  Object.values(EDGE_FUNCTIONS_TO_MIGRATE).forEach(category => {
    if (category.functions && Array.isArray(category.functions)) {
      category.functions.forEach(func => {
        total++;
        if (func.status === 'MIGRATED') migrated++;
        else if (func.status === 'TODO') todo++;
        else if (func.status === 'NOT_DEPLOYED' || func.status === 'DEPRECATED') notNeeded++;
      });
    }
  });

  return {
    total,
    migrated,
    todo,
    notNeeded,
    percentComplete: Math.round((migrated / total) * 100)
  };
}

// Helper function to get functions by status
export function getFunctionsByStatus(status: string) {
  const functions = [];
  
  Object.entries(EDGE_FUNCTIONS_TO_MIGRATE).forEach(([category, data]) => {
    if (data.functions && Array.isArray(data.functions)) {
      data.functions.forEach(func => {
        if (func.status === status) {
          functions.push({
            category,
            ...func
          });
        }
      });
    }
  });
  
  return functions;
}
