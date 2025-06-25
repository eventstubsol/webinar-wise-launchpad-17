
# Deployment Checklist

Use this checklist to ensure successful deployment to Render.com.

## Pre-Deployment

- [ ] Code is committed and pushed to GitHub
- [ ] All required files are in `render-backend/` directory
- [ ] `package.json` contains all dependencies
- [ ] Environment variables are documented in `.env.example`

## Render Configuration

- [ ] Web service created on Render.com
- [ ] Repository connected to Render
- [ ] Root directory set to `render-backend`
- [ ] Build command set to `npm install`
- [ ] Start command set to `npm start`
- [ ] Health check path set to `/health`

## Environment Variables Set

### Required
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `DATABASE_URL` (Supabase connection string)
- [ ] `SUPABASE_URL` (Project URL)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (Service role key)

### Zoom API
- [ ] `ZOOM_CLIENT_ID`
- [ ] `ZOOM_CLIENT_SECRET`
- [ ] `ZOOM_ACCOUNT_ID`

### Security
- [ ] `JWT_SECRET` (32+ character random string)
- [ ] `API_KEY` (32+ character random string)

## Post-Deployment Testing

- [ ] Service deploys successfully (check build logs)
- [ ] Health endpoint responds: `GET /health`
- [ ] Service URL is accessible
- [ ] Frontend updated with correct service URL
- [ ] Zoom credential validation works
- [ ] Database operations work (check logs)

## Production Readiness

- [ ] Consider upgrading to paid Render plan
- [ ] Set up monitoring/alerts
- [ ] Review and test all API endpoints
- [ ] Test error handling and edge cases
- [ ] Monitor service logs for issues

## Quick Tests

After deployment, test these endpoints:

```bash
# Health check
curl https://your-service-name.onrender.com/health

# Test with credentials (replace with real values)
curl -X POST https://your-service-name.onrender.com/validate-credentials \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "your-account-id",
    "client_id": "your-client-id", 
    "client_secret": "your-client-secret"
  }'
```

## Next Steps After Successful Deployment

1. Update frontend service URL
2. Test full Zoom integration flow
3. Monitor service performance
4. Set up regular health checks
5. Document any additional configuration needed
