# Webinar Wise - Final Architecture Documentation

## Overview

Webinar Wise is a SaaS application that transforms Zoom webinar data into business intelligence. The application has been migrated to a simplified architecture with a single backend service.

## Architecture Components

### Frontend
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: React Context + Hooks
- **Hosting**: Lovable.dev
- **Authentication**: Supabase Auth

### Backend
- **Service**: Node.js + Express
- **Hosting**: Render.com
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT tokens from Supabase

### Third-Party Integrations
- **Zoom**: OAuth 2.0 for webinar data
- **SendGrid**: Email delivery
- **OpenAI**: AI-powered insights
- **Supabase**: Database, Auth, and Storage

## API Architecture

### Base URLs
- Production: `https://webinar-wise-launchpad-17.onrender.com`
- Frontend: `https://webinar-wise-launchpad-17.lovable.app`

### API Structure

```
/health                          - Health check (no auth)
/api/email/track/*              - Email tracking (no auth)

[Authenticated Routes]
/validate-credentials           - Zoom credential validation
/test-connection               - Test Zoom connection
/start-sync                    - Start webinar sync
/sync-progress/:id             - Check sync progress
/sync-webinars                 - Sync specific webinars

/api/email/send                - Send email
/api/email/process-queue       - Process email queue
/api/email/preferences         - Manage preferences

/api/campaigns/launch          - Launch campaign
/api/campaigns/schedule        - Schedule campaign
/api/campaigns/:id/status      - Get campaign status

/api/ai/generate-insights      - Generate AI insights
/api/ai/insights/:webinarId    - Get webinar insights

/api/user/export-data          - Export user data
/api/user/delete-account       - Delete account
/api/user/stats               - Get user statistics
```

## Data Flow

### Zoom Sync Flow
1. User connects Zoom account via OAuth
2. Frontend calls Render backend to start sync
3. Backend fetches webinars from Zoom API
4. Data is stored in Supabase database
5. Progress updates sent to frontend

### Email Campaign Flow
1. User creates campaign in frontend
2. Campaign data stored in Supabase
3. User launches campaign via Render API
4. Backend queues emails and processes them
5. Tracking events recorded in database

### AI Insights Flow
1. User requests analysis for webinar
2. Backend fetches webinar data from database
3. OpenAI API generates insights
4. Results stored and returned to frontend

## Database Schema (Key Tables)

### User Management
- `profiles` - User profiles
- `user_settings` - User preferences
- `email_preferences` - Email subscription preferences

### Zoom Integration
- `zoom_connections` - OAuth connections
- `zoom_webinars` - Webinar data
- `zoom_participants` - Participant data
- `zoom_registrants` - Registration data
- `zoom_sync_logs` - Sync history

### Email Marketing
- `email_campaigns` - Campaign definitions
- `email_templates` - Email templates
- `email_sends` - Individual email records
- `email_tracking_events` - Open/click tracking
- `campaign_analytics` - Campaign metrics

### AI/Analytics
- `ai_insights` - Generated insights
- `analytics_events` - Event tracking
- `custom_metrics` - User-defined metrics

## Security

### Authentication
- Supabase Auth handles user authentication
- JWT tokens passed to backend
- Row Level Security (RLS) on database tables

### API Security
- CORS configured for frontend domains
- Rate limiting on all endpoints
- Input validation and sanitization
- Environment variables for secrets

### Data Protection
- HTTPS for all communications
- Encrypted tokens at rest
- GDPR-compliant data handling
- User data isolation via RLS

## Deployment

### Frontend (Lovable)
1. Code pushed to Lovable
2. Automatic build and deployment
3. Environment variables configured in Lovable

### Backend (Render)
1. Code in `render-backend` directory
2. Push to GitHub
3. Render auto-deploys from main branch
4. Environment variables in Render dashboard

### Database (Supabase)
1. Migrations in `supabase/migrations`
2. Apply via Supabase CLI or dashboard
3. RLS policies ensure data security

## Monitoring & Maintenance

### Health Checks
- `/health` endpoint for uptime monitoring
- Render provides automatic health monitoring
- Supabase dashboard for database metrics

### Logging
- Structured logging in backend
- Request IDs for tracing
- Error tracking and alerting

### Backups
- Supabase automatic daily backups
- Point-in-time recovery available
- Export functionality for user data

## Development Workflow

### Local Development
1. Frontend: `npm run dev`
2. Backend: `cd render-backend && npm run dev`
3. Database: Local Supabase or cloud instance

### Testing
1. Unit tests for utilities
2. Integration tests for API endpoints
3. E2E tests for critical flows

### Deployment
1. Feature branches for development
2. PR reviews before merging
3. Automatic deployment on merge to main

## Cost Optimization

### Current Setup
- Render: Free tier (spins down after inactivity)
- Supabase: Free tier (sufficient for MVP)
- SendGrid: Free tier (100 emails/day)
- OpenAI: Pay-per-use

### Scaling Considerations
- Upgrade Render for always-on service
- Supabase Pro for higher limits
- SendGrid scaling plans for volume
- Implement caching for AI insights

## Future Enhancements

### Planned Features
1. Real-time analytics dashboard
2. Advanced email automation
3. Multi-language support
4. Mobile app

### Technical Improvements
1. GraphQL API layer
2. Redis caching
3. Message queue for async tasks
4. Kubernetes deployment

## Support & Documentation

### For Developers
- API documentation in `/render-backend/API_DOCUMENTATION.md`
- Migration guide in `/MIGRATION_COMPLETE.md`
- Environment setup in `/render-backend/ENVIRONMENT_SETUP.md`

### For Users
- In-app help documentation
- Video tutorials
- Support ticket system

## Conclusion

The consolidated architecture provides a solid foundation for Webinar Wise, with clear separation of concerns, secure data handling, and scalable infrastructure. The single backend service simplifies operations while maintaining all functionality previously spread across multiple services.
