# Render Backend API Documentation

## Base URL
- Production: `https://webinar-wise-launchpad-17.onrender.com`
- Local: `http://localhost:10000`

## Authentication
All API endpoints (except health check) require a Bearer token in the Authorization header:
```
Authorization: Bearer <supabase-access-token>
```

## Endpoints

### Health Check
```
GET /health
```
Returns service health status. No authentication required.

**Response:**
```json
{
  "status": "ok",
  "service": "webinar-wise-backend",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Zoom Integration Endpoints

#### Test Connection
```
GET /test-connection
GET /test-connection?connection_id=<connection-id>
```
Tests Zoom API connectivity.

#### Validate Credentials
```
POST /validate-credentials
Content-Type: application/json

{
  "account_id": "string",
  "client_id": "string",
  "client_secret": "string"
}
```

#### OAuth Callback
```
GET /zoom/oauth/callback?code=<auth-code>&state=<state>
```
Handles Zoom OAuth callback.

#### Refresh Token
```
POST /refresh-token
Content-Type: application/json

{
  "refresh_token": "string",
  "connection_id": "string (optional)"
}
```

#### Start Sync
```
POST /start-sync
Content-Type: application/json

{
  "connection_id": "string",
  "sync_type": "manual|initial|incremental"
}
```

#### Get Sync Progress
```
GET /sync-progress/:syncId
```

#### Cancel Sync
```
POST /cancel-sync/:syncId
```

#### Sync Webinars
```
POST /sync-webinars
Content-Type: application/json

{
  "connection_id": "string",
  "webinar_id": "string (optional)",
  "type": "manual|auto"
}
```

### Email Endpoints (To Be Implemented)

#### Send Email
```
POST /api/email/send
Content-Type: application/json

{
  "campaign_id": "string",
  "recipient_email": "string",
  "subject": "string",
  "html_content": "string",
  "text_content": "string (optional)",
  "personalization_data": {
    "name": "string",
    "custom_fields": {}
  }
}
```

#### Track Email Event
```
GET /api/email/track/:action?id=<tracking-id>
```
Actions: open, click, unsubscribe

#### Process Email Queue
```
POST /api/email/process-queue
Content-Type: application/json

{
  "campaign_id": "string (optional)",
  "batch_size": 10
}
```

### Campaign Endpoints (To Be Implemented)

#### Launch Campaign
```
POST /api/campaigns/launch
Content-Type: application/json

{
  "campaign_id": "string"
}
```

#### Schedule Campaign
```
POST /api/campaigns/schedule
Content-Type: application/json

{
  "campaign_id": "string",
  "scheduled_time": "ISO 8601 timestamp",
  "recurring": {
    "frequency": "daily|weekly|monthly",
    "end_date": "ISO 8601 date"
  }
}
```

### AI/Analytics Endpoints (To Be Implemented)

#### Generate Insights
```
POST /api/ai/generate-insights
Content-Type: application/json

{
  "webinar_id": "string",
  "analysis_type": "engagement|content|sentiment|speaker|roi"
}
```

#### Process Analytics
```
POST /api/analytics/process
Content-Type: application/json

{
  "event_type": "string",
  "event_data": {}
}
```

### CRM Endpoints (To Be Implemented)

#### CRM OAuth Callback
```
GET /api/crm/oauth/callback?code=<code>&state=<state>&crm_type=<type>
```

#### CRM Webhook
```
POST /api/crm/webhook/:crm_type
Content-Type: application/json

{
  // CRM-specific webhook payload
}
```

### User Management Endpoints (To Be Implemented)

#### Export User Data
```
POST /api/user/export-data
```
Returns all user data in JSON format for GDPR compliance.

#### Delete Account
```
POST /api/user/delete-account
```
Permanently deletes user account and all associated data.

### Report Endpoints (To Be Implemented)

#### Generate PDF Report
```
POST /api/reports/generate-pdf
Content-Type: application/json

{
  "report_type": "webinar|campaign|analytics",
  "data_range": {
    "start": "ISO 8601 date",
    "end": "ISO 8601 date"
  },
  "format": "pdf|excel"
}
```

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (optional)",
  "requestId": "unique-request-id"
}
```

Common HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Rate Limit Exceeded
- 500: Internal Server Error
- 503: Service Unavailable

## Rate Limiting
- 1000 requests per hour per user
- 100 requests per minute per user
- Sync operations: 10 concurrent per user

## Webhook Security
All webhooks include:
- HMAC signature verification
- Timestamp validation
- Idempotency keys
