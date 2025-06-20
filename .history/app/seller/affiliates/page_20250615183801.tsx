"use client";

import React from 'react';
import { useUser } from '@clerk/nextjs';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import AffiliateManager from '@/components/marketing/AffiliateManager';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AffiliatesPage() {
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

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p>Please sign in to access affiliate management tools.</p>
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
            <p className="text-gray-600">Create an event first to start using affiliate marketing tools.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Affiliate & Referral Program</h1>
            <p className="text-gray-600">Manage your affiliate codes and track earnings</p>
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

      {selectedEventId && user && (
        <AffiliateManager eventId={selectedEventId as any} userId={user.id} />
      )}
    </div>
  );
} 