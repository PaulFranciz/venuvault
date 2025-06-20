// EventSettingsForm.tsx
import React from 'react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { UseFormReturn } from 'react-hook-form';
import { z } from 'zod';

// Define form schema (subset relevant for this component, or import if shared)
const eventSettingsSchema = z.object({
  isPublished: z.boolean().optional(),
  inviteOnly: z.boolean().optional(),
  refundPolicy: z.string().optional(),
  organizerAbsorbsFees: z.boolean().optional(),
});

type EventSettingsFormData = z.infer<typeof eventSettingsSchema>;

interface EventSettingsFormProps {
  form: UseFormReturn<any>; // Use 'any' for now, or a more specific type from the parent form
  isCustomRefundPolicy: boolean;
  setIsCustomRefundPolicy: (value: boolean) => void;
  REFUND_POLICY_OPTIONS: string[];
}

export default function EventSettingsForm({
  form,
  isCustomRefundPolicy,
  setIsCustomRefundPolicy,
  REFUND_POLICY_OPTIONS
}: EventSettingsFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Settings</CardTitle>
        <CardDescription>
          Configure additional options for your event
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visibility Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Visibility</h3>
          
          <FormField
            control={form.control}
            name="isPublished"
            render={({ field }) => (
              <FormItem className="flex items-start space-x-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 mt-1 text-brand-teal border-gray-300 rounded focus:ring-brand-teal"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Publish Event</FormLabel>
                  <FormDescription>
                    When unchecked, your event will be hidden from the public
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="inviteOnly"
            render={({ field }) => (
              <FormItem className="flex items-start space-x-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 mt-1 text-brand-teal border-gray-300 rounded focus:ring-brand-teal"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Invite-Only Event</FormLabel>
                  <FormDescription>
                    When checked, only people with a direct link can register
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>
        
        {/* Refund Policy */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Refund Policy</h3>
          
          <FormField
            control={form.control}
            name="refundPolicy"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="space-y-3">
                    {REFUND_POLICY_OPTIONS.map((policy) => (
                      <div key={policy} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={policy}
                          checked={field.value === policy}
                          onChange={() => field.onChange(policy)}
                          className="h-4 w-4 text-brand-teal border-gray-300 focus:ring-brand-teal"
                        />
                        <label htmlFor={policy} className="text-sm">{policy}</label>
                      </div>
                    ))}
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="custom-policy"
                        checked={isCustomRefundPolicy}
                        onChange={() => {
                          setIsCustomRefundPolicy(true);
                          field.onChange("");
                        }}
                        className="h-4 w-4 text-brand-teal border-gray-300 focus:ring-brand-teal"
                      />
                      <label htmlFor="custom-policy" className="text-sm">Custom policy</label>
                    </div>

                    {isCustomRefundPolicy && (
                      <Textarea
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Enter your custom refund policy..."
                        rows={3}
                        className="mt-2"
                      />
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Platform Fees */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Platform Fees</h3>
                            <span className="text-sm text-muted-foreground">8.5% + ₦100 per paid ticket</span>
          </div>
          
          <FormField
            control={form.control}
            name="organizerAbsorbsFees"
            render={({ field }) => (
              <FormItem className="flex items-start space-x-3 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 mt-1 text-brand-teal border-gray-300 rounded focus:ring-brand-teal"
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Absorb Platform Fees</FormLabel>
                  <FormDescription>
                    {form.getValues("isFreeEvent")
                      ? "Platform fees are not applicable for free events."
                      : form.watch("organizerAbsorbsFees")
                        ? "You absorb the platform fees. We'll calculate the total price for attendees based on the amount you want to receive."
                        : "Attendees pay the platform fees. Fees will be added to the ticket price you set."}
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}