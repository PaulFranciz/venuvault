"use client";

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Users, TrendingUp, Send, Calendar, MessageSquare } from 'lucide-react';
import Spinner from "@/components/Spinner";

export default function EmailMarketingPage() {
  const { user, isLoaded } = useUser();

  // Get user's events for email marketing
  const userEvents = useQuery(api.events.getUserEvents, 
    user?.id ? { userId: user.id } : "skip"
  );

  // Show loading spinner while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Please sign in to access email marketing tools.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
        <p className="text-gray-600">Manage your email campaigns and communications</p>
      </div>

      {/* Email Marketing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Subscribers</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold text-gray-900">0%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Button className="h-20 flex-col bg-blue-600 hover:bg-blue-700">
          <Send className="w-6 h-6 mb-2" />
          Create Campaign
        </Button>
        <Button variant="outline" className="h-20 flex-col">
          <Mail className="w-6 h-6 mb-2" />
          Email Templates
        </Button>
        <Button variant="outline" className="h-20 flex-col">
          <Users className="w-6 h-6 mb-2" />
          Manage Subscribers
        </Button>
        <Button variant="outline" className="h-20 flex-col">
          <TrendingUp className="w-6 h-6 mb-2" />
          View Analytics
        </Button>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Email Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No email campaigns yet</h3>
            <p className="text-gray-500 mb-4">Start engaging with your attendees through email marketing</p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4 mr-2" />
              Create Your First Campaign
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Marketing Features Coming Soon */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Advanced Email Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start space-x-3">
                <Calendar className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Automated Sequences</h4>
                  <p className="text-sm text-gray-600">Set up automated email sequences for ticket confirmations, reminders, and follow-ups</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MessageSquare className="w-6 h-6 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Event Communication</h4>
                  <p className="text-sm text-gray-600">Send updates, announcements, and important information to your attendees</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-6 h-6 text-purple-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Advanced Analytics</h4>
                  <p className="text-sm text-gray-600">Track open rates, click-through rates, and engagement metrics</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Users className="w-6 h-6 text-orange-600 mt-1" />
                <div>
                  <h4 className="font-medium text-gray-900">Audience Segmentation</h4>
                  <p className="text-sm text-gray-600">Target specific groups of attendees with personalized messages</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 