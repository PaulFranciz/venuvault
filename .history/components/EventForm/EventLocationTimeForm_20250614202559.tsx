// EventLocationTimeForm.tsx
import React from 'react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DateTimePicker, TimePicker } from "@/components/ui/datetime-picker";
import { Map, Clock } from "lucide-react";
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

// Define form schema (subset relevant for this component, or import if shared)
const eventLocationTimeSchema = z.object({
  location: z.string().min(1, "Location is required"),
  locationTips: z.string().optional(),
  eventDate: z.date().min(new Date(new Date().setHours(0, 0, 0, 0)), "Event date must be in the future"),
  endDate: z.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
});

type EventLocationTimeFormData = z.infer<typeof eventLocationTimeSchema>;

interface EventLocationTimeFormProps {
  form: UseFormReturn<any>; // Use 'any' for now, or a more specific type from the parent form
  TIMEZONE_OPTIONS: string[];
}

export default function EventLocationTimeForm({
  form,
  TIMEZONE_OPTIONS
}: EventLocationTimeFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-brand-teal" />
          Location & Time
        </CardTitle>
        <CardDescription>
          When and where your event will take place
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Location */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
              <FormDescription>
                Full address of your event venue
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Location Tips */}
        <FormField
          control={form.control}
          name="locationTips"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Tips (Optional)</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} />
              </FormControl>
              <FormDescription>
                Parking details, entrance information, or other helpful tips for attendees
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date & Time Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Date */}
          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    onChange={(e) => {
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : null
                      );
                    }}
                    value={
                      field.value
                        ? new Date(field.value).toISOString().split("T")[0]
                        : ""
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* End Date */}
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    onChange={(e) => {
                      field.onChange(
                        e.target.value ? new Date(e.target.value) : undefined
                      );
                    }}
                    value={
                      field.value
                        ? new Date(field.value).toISOString().split("T")[0]
                        : ""
                    }
                  />
                </FormControl>
                <FormDescription>
                  For multi-day events
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Start Time */}
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Clock className="h-4 w-4 inline mr-1" />
                  Start Time
                </FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* End Time */}
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Timezone */}
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Timezone</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}