# Scheduled Jobs for Ticwaka

This document explains how to set up and configure GitHub Actions for scheduled background jobs in the Ticwaka application.

## Overview

Instead of using Vercel's built-in cron jobs (which are limited on the Hobby plan), we've implemented a more robust solution using GitHub Actions to trigger API endpoints in your Vercel deployment.

## Configuration Steps

### 1. Set up Repository Secrets

Add the following secrets to your GitHub repository:

- **API_SECRET_TOKEN**: A secure random string that acts as an authentication token for API calls
  - Example: Generate a secure token with `openssl rand -base64 32`
- **VERCEL_URL**: The base URL of your Vercel deployment
  - Example: `https://ticwaka.vercel.app`
- **SLACK_WEBHOOK_URL** (Optional): For failure notifications
  - Only needed if you want Slack notifications on job failures

### 2. Update Environment Variables in Vercel

Add the following environment variable to your Vercel project:

- **API_SECRET_TOKEN**: The same value as the GitHub secret

### 3. Configure Convex Mutations

The `scheduled-jobs.ts` file contains example mutations for cleanup and waitlist processing. You'll need to:

1. Review the TypeScript errors in the example file
2. Adapt the queries and mutations to match your actual database schema
3. Add these functions to your existing Convex files (likely `tickets.ts`)

## Workflow Details

The GitHub Actions workflow (`scheduled-jobs.yml`) includes three main jobs:

1. **process-tickets**: Runs every 5 minutes to process ticket reservations
2. **cleanup-reservations**: Runs after process-tickets to clean up expired reservations
3. **waitlist-processing**: Runs hourly to notify people on waitlists about ticket availability

## Testing

You can manually trigger the workflow from the GitHub Actions tab in your repository by selecting "Run workflow" and choosing which specific job to run.

## Troubleshooting

- Check GitHub Actions logs for any errors in API calls
- Verify that your API endpoints are accessible and functioning properly
- Ensure your Convex mutations have proper error handling

## Security Considerations

- The API endpoints are protected by the API_SECRET_TOKEN
- Only make API endpoints available that are necessary for scheduled jobs
- Consider implementing rate limiting on your API endpoints
