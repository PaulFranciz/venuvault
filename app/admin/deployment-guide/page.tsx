"use client";

import React from 'react';
import Link from 'next/link';

export default function DeploymentGuidePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold mb-6">VenuVault High-Scale Deployment Guide</h1>
        
        <div className="prose max-w-none">
          <h2>Deploying to Vercel with Redis + BullMQ</h2>
          
          <p>
            This guide explains how to deploy the VenuVault ticketing platform with the 
            high-performance Redis + BullMQ caching and queue system to handle 100K-1M concurrent users.
          </p>
          
          <h3>Step 1: Set Environment Variables</h3>
          
          <p>
            In your Vercel project settings, set these environment variables:
          </p>
          
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
{`# Redis Configuration
REDIS_URL=rediss://default:your-password@your-redis-host.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://your-redis-host.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Security tokens
CRON_SECRET=your-unique-cron-secret-token
ADMIN_SECRET=your-unique-admin-secret-token`}
          </pre>
          
          <h3>Step 2: Deploy to Vercel</h3>
          
          <p>
            Push your code to GitHub and connect your repository to Vercel for continuous deployment.
            Make sure the <code>vercel.json</code> file is in your repository root to configure cron jobs.
          </p>
          
          <h3>Step 3: Verify Cron Job</h3>
          
          <p>
            After deployment, verify that your cron job is running by checking:
          </p>
          
          <ul>
            <li>Vercel logs for the cron job execution</li>
            <li>Redis memory usage and queue statistics</li>
            <li>The admin dashboard for queue analytics</li>
          </ul>
          
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
            <p className="font-bold text-blue-700">Production Performance Settings</p>
            <p>
              For optimal performance in production, we recommend:
            </p>
            <ul>
              <li>Increase the cron job frequency to every minute with <code>"schedule": "* * * * *"</code></li>
              <li>Enable Redis persistence for data durability</li>
              <li>Monitor memory usage and scale Redis as needed</li>
            </ul>
          </div>
          
          <h3>Step 4: Implement the High-Performance Ticket Component</h3>
          
          <p>
            Replace the standard ticket purchase flow with the high-performance version:
          </p>
          
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
{`// In your event detail page
import HighPerformancePurchaseTicket from "@/components/HighPerformancePurchaseTicket";

// Replace this:
<PurchaseTicket eventId={eventId} />

// With this:
<HighPerformancePurchaseTicket 
  eventId={eventId} 
  ticketTypeId={event.ticketTypes?.[0]?.id}
/>`}
          </pre>
          
          <h3>Step 5: Access the Admin Dashboard</h3>
          
          <p>
            Once deployed, you can access the admin dashboard at:
          </p>
          
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            https://your-domain.com/admin/queue-analytics
          </pre>
          
          <p>
            You'll need to include the admin token as a query parameter:
          </p>
          
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
            https://your-domain.com/admin/queue-analytics?token=your-admin-secret-key
          </pre>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
            <p className="font-bold text-yellow-700">Security Note</p>
            <p>
              In a production environment, replace the token-based authentication with a proper admin 
              authentication system using Clerk or another authentication provider.
            </p>
          </div>
          
          <h3>Testing Your Deployment</h3>
          
          <p>
            Before launching a high-traffic event, we recommend running load tests:
          </p>
          
          <ol>
            <li>Use a load testing tool like Artillery or k6</li>
            <li>Simulate at least 2x your expected traffic</li>
            <li>Monitor Redis memory usage during the test</li>
            <li>Check job processing rates in the admin dashboard</li>
            <li>Adjust caching TTLs based on observed patterns</li>
          </ol>
          
          <div className="mt-8 flex justify-center">
            <Link href="/admin/queue-analytics" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-md shadow-md transition-colors">
              Go to Queue Analytics Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
