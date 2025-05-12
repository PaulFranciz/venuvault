// EventBasicDetailsForm.tsx
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
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Calendar, Tag } from "lucide-react";
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

// Define form schema (subset relevant for this component, or import if shared)
const eventBasicDetailsSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  // image related fields are handled by props/state from parent
});

type EventBasicDetailsFormData = z.infer<typeof eventBasicDetailsSchema>;

interface EventBasicDetailsFormProps {
  form: UseFormReturn<any>; // Use 'any' for now, or a more specific type from the parent form
  imagePreview: string | null;
  currentImageUrl: string | null | undefined;
  removedCurrentImage: boolean;
  handleImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  imageInput: React.RefObject<HTMLInputElement>;
  setRemovedCurrentImage: (value: boolean) => void;
  setSelectedImage: (file: File | null) => void;
  setImagePreview: (preview: string | null) => void;
  EVENT_CATEGORIES: string[];
}

export default function EventBasicDetailsForm({
  form,
  imagePreview,
  currentImageUrl,
  removedCurrentImage,
  handleImageChange,
  imageInput,
  setRemovedCurrentImage,
  setSelectedImage,
  setImagePreview,
  EVENT_CATEGORIES
}: EventBasicDetailsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-brand-teal" />
          Event Details
        </CardTitle>
        <CardDescription>
          Basic information about your event
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} rows={5} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Tag className="h-4 w-4 inline mr-1" />
                Event Category
              </FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                >
                  <option value="">Select a category</option>
                  {EVENT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload */}
        <div className="space-y-2">
          <FormLabel className="block">Event Image</FormLabel>
          <div className="mt-1 flex items-center gap-4">
            {imagePreview || (!removedCurrentImage && currentImageUrl) ? (
              <div className="relative w-32 aspect-video bg-gray-100 rounded-lg">
                <Image
                  src={imagePreview || currentImageUrl!}
                  alt="Event Preview"
                  fill
                  className="object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    setRemovedCurrentImage(true);
                    if (imageInput.current) {
                      imageInput.current.value = "";
                    }
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={imageInput}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-brand-teal file:text-white
                  hover:file:bg-brand-teal/90"
              />
            )}
          </div>
          <FormDescription>
            Upload a banner image for your event. Recommended size: 1200x630px.
          </FormDescription>
        </div>
      </CardContent>
    </Card>
  );
}