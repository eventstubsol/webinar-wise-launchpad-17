
# Multi-Tenant Deployment Checklist

Use this checklist to ensure successful multi-tenant deployment to Render.com.

## Pre-Deployment

- [ ] Code is committed and pushed to GitHub
- [ ] All required files are in `render-backend/` directory
- [ ] `package.json` contains all dependencies
- [ ] Environment variables are documented in `.env.example`
- [ ] **NO** Zoom credentials in environment variables

## Render Configuration

- [ ] Web service created on Render.com
- [ ] Repository connected to Render
- [ ] Root directory set to `render-backend`
- [ ] Build command set to `npm install`
- [ ] Start command set to `npm start`
- [ ] Health check path set to `/health`

## Environment Variables Set

### Required (Database & Service)
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `DATABASE_URL` (Supabase connection string)
- [ ] `SUPABASE_URL` (Project URL)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (Service role key)

### Security
- [ ] `JWT_SECRET` (32+ character random string)
- [ ] `API_KEY` (32+ character random string)

### ⚠️ NOT NEEDED (User-Specific)
- [x] ~~`ZOOM_CLIENT_ID`~~ (Now per-user in database)
- [x] ~~`ZOOM_CLIENT_SECRET`~~ (Now per-user in database)  
- [x] ~~`ZOOM_ACCOUNT_ID`~~ (Now per-user in database)

## Multi-Tenant Architecture Verification

- [ ] User authentication middleware enabled
- [ ] All routes protected with `extractUser` middleware
- [ ] Database queries scoped to authenticated user
- [ ] Zoom credentials retrieved from user's database record
- [ ] Connection ownership verified on all operations

## Post-Deployment Testing

- [ ] Service deploys successfully (check build logs)
- [ ] Health endpoint responds: `GET /health`
- [ ] Service URL is accessible
- [ ] Frontend updated with correct service URL
- [ ] User can input and validate Zoom credentials
- [ ] Database operations work (check logs)
- [ ] Multi-user isolation working (test with different users)

## Multi-Tenant Security Tests

- [ ] User A cannot access User B's connections
- [ ] Authentication required for all endpoints
- [ ] Proper error messages for access denied
- [ ] User credentials stored securely in database
- [ ] JWT token validation working

## Production Readiness

- [ ] Consider upgrading to paid Render plan
- [ ] Set up monitoring/alerts
- [ ] Review and test all API endpoints
- [ ] Test error handling and edge cases
- [ ] Monitor service logs for issues
- [ ] Test user isolation thoroughly

## Quick Tests

After deployment, test these endpoints with proper authentication:

```bash
# Health check (no auth required)
curl https://your-service-name.onrender.com/health

# Test with user credentials (requires valid JWT token)
curl -X POST https://your-service-name.onrender.com/validate-credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_JWT_TOKEN" \
  -d '{
    "account_id": "user-account-id",
    "client_id": "user-client-id", 
    "client_secret": "user-client-secret"
  }'
```

## Multi-Tenant Flow Verification

1. **User Registration/Login**: User authenticates via Supabase
2. **Credential Setup**: User inputs their Zoom credentials via frontend
3. **Credential Validation**: Backend validates and stores user's credentials
4. **Connection Creation**: Connection is created and tied to user
5. **API Operations**: All subsequent operations use user's credentials
6. **Data Isolation**: User can only access their own data

## Next Steps After Successful Deployment

1. Update frontend service URL
2. Test full multi-tenant Zoom integration flow
3. Monitor service performance per user
4. Set up regular health checks
5. Document any additional configuration needed
6. Monitor user-specific rate limiting
7. Review security logs for access patterns

## Architecture Benefits ✅

- **True Multi-Tenancy**: Each user's data completely isolated
- **Security**: No shared credentials or access
- **Scalability**: Can handle multiple users with different Zoom accounts
- **Flexibility**: Users can manage their own Zoom credentials
- **Compliance**: Better security posture for enterprise use
