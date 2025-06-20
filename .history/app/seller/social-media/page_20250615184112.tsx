"use client";

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SocialMediaManager from '@/components/marketing/SocialMediaManager';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SocialMediaPage() {
  const { user, isLoaded } = useUser();
  const [selectedEventId, setSelectedEventId] = React.useState<string>("");

  // Get user's events
  const userEvents = useQuery(api.events.getUserEvents, 
    user?.id ? { userId: user.id } : "skip"
  );

  // Use the first event as default if none selected
  React.useEffect(() => {
    if (userEvents && userEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(userEvents[0]._id);
    }
  }, [userEvents, selectedEventId]);

  // Show loading spinner while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Please sign in to access social media marketing tools.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userEvents || userEvents.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Found</h3>
            <p className="text-gray-600">Create an event first to start using social media marketing tools.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Social Media Marketing</h1>
            <p className="text-gray-600">Manage your event's social media presence</p>
          </div>
          <div className="w-64">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {userEvents.map((event) => (
                  <SelectItem key={event._id} value={event._id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selectedEventId && (
        <SocialMediaManager eventId={selectedEventId as any} />
      )}
    </div>
  );
} 