# Cron Jobs Troubleshooting Guide

## Common Issues and Solutions

### 1. **401 Unauthorized Errors**

**Symptoms:**

- GitHub Actions show "❌ Failed to process ticket queue: HTTP error 401"
- API endpoints return "Unauthorized" errors

**Root Causes:**

- `API_SECRET_TOKEN` not set in GitHub repository secrets
- Token mismatch between GitHub secret and API endpoint expectations
- Inconsistent token validation logic

**Solutions:**

1. Set GitHub repository secret:
   ```bash
   # Generate a secure token
   openssl rand -base64 32
   ```
2. Add to GitHub repository secrets:

   - Go to Settings > Secrets and variables > Actions
   - Add `API_SECRET_TOKEN` with the generated value

3. Ensure Vercel environment variables match:
   - Add `API_SECRET_TOKEN` to your Vercel project
   - Use the same value as GitHub secret

### 2. **Convex Connection Errors**

**Symptoms:**

- "NEXT_PUBLIC_CONVEX_URL is not defined" errors
- Convex mutation calls fail

**Solutions:**

1. Verify Vercel environment variables:

   ```
   NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
   ```

2. Check Convex deployment status:
   ```bash
   npx convex dev
   ```

### 3. **Redis Connection Issues**

**Symptoms:**

- BullMQ connection errors
- "Redis connection failed" messages

**Solutions:**

1. Verify Redis URL format:

   ```
   REDIS_URL=rediss://username:password@host:port
   ```

2. Test Redis connection:
   ```bash
   node scripts/test-redis.mjs
   ```

### 4. **Workflow Schedule Issues**

**Problem:** Waitlist processing job never runs on schedule

**Fixed:** Updated workflow condition to remove invalid `github.event.schedule` check

### 5. **Database Schema Mismatches**

**Symptoms:**

- Convex mutations fail with schema errors
- Undefined field errors

**Solutions:**

1. Verify Convex schema matches code expectations
2. Check that all required fields exist in database
3. Update mutations to handle optional fields properly

## Debugging Steps

### 1. **Manual Testing**

```bash
# Test process-queues endpoint
curl -X POST "https://ticwaka.vercel.app/api/cron/process-queues" \
  -H "x-api-key: YOUR_API_SECRET_TOKEN" \
  -H "Content-Type: application/json"

# Test cleanup-reservations endpoint
curl -X POST "https://ticwaka.vercel.app/api/cron/cleanup-reservations" \
  -H "x-api-key: YOUR_API_SECRET_TOKEN" \
  -H "Content-Type: application/json"

# Test waitlist processing
curl -X POST "https://ticwaka.vercel.app/api/cron/process-waitlist" \
  -H "x-api-key: YOUR_API_SECRET_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. **Environment Validation**

```bash
# Run validation script
node scripts/validate-cron-env.mjs
```

### 3. **Check Logs**

**GitHub Actions Logs:**

- Go to Actions tab in GitHub repository
- Click on failed workflow run
- Check individual job logs

**Vercel Function Logs:**

- Open Vercel dashboard
- Go to Functions tab
- Check logs for API endpoints

## Environment Variables Checklist

### Required:

- [ ] `API_SECRET_TOKEN` - Set in both GitHub secrets and Vercel
- [ ] `NEXT_PUBLIC_CONVEX_URL` - Your Convex deployment URL
- [ ] `REDIS_URL` - Redis connection string (for BullMQ)

### Optional:

- [ ] `VERCEL_URL` - Your Vercel deployment URL
- [ ] `SLACK_WEBHOOK_URL` - For notifications

## Workflow Testing

### Manual Trigger:

1. Go to Actions tab in GitHub
2. Select "Scheduled Queue Processing"
3. Click "Run workflow"
4. Choose specific job to test

### Cron Schedule:

- Process tickets: Every 5 minutes (`*/5 * * * *`)
- Waitlist processing: Every hour (`0 * * * *`)

## Recent Fixes Applied

1. ✅ Standardized token validation across all endpoints
2. ✅ Fixed workflow schedule condition for waitlist processing
3. ✅ Removed hardcoded tokens in favor of environment variables
4. ✅ Added proper error handling for missing environment variables
5. ✅ Created validation script for environment setup
6. ✅ Fixed process-queues endpoint token validation (was causing 401 errors)
7. ✅ Created endpoint testing script for debugging

## Next Steps

1. Test all endpoints manually with curl
2. Verify GitHub secrets are properly set
3. Run environment validation script
4. Monitor GitHub Actions logs for remaining issues
5. Check Vercel function logs for detailed error messages
