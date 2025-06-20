import React from 'react';
import { useUser } from '@clerk/nextjs';
import EmailAnalyticsDashboard from '@/components/email-marketing/EmailAnalyticsDashboard';
import EmailCampaignBuilder from '@/components/email-marketing/EmailCampaignBuilder';
import EventCommunicationHub from '@/components/email-marketing/EventCommunicationHub';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function EmailMarketingPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
        <p className="text-gray-600">Manage your email campaigns and communications</p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <EmailAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="campaigns">
          <EmailCampaignBuilder />
        </TabsContent>

        <TabsContent value="communication">
          <EventCommunicationHub />
        </TabsContent>
      </Tabs>
    </div>
  );
} 