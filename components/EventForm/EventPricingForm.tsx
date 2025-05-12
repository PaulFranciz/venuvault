// EventPricingForm.tsx
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { UseFormReturn, UseFieldArrayReturn } from 'react-hook-form';
import { z } from 'zod';

// Define ticket type schema (subset or import if shared)
const ticketTypeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  quantity: z.number().min(1, "Must have at least 1 ticket"),
  remaining: z.number().optional(),
  isSoldOut: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  allowGroupPurchase: z.boolean().optional(),
  maxPerTransaction: z.number().optional(),
  minPerTransaction: z.number().optional(),
  priceInfo: z.string().optional(),
});

// Define form schema (subset relevant for this component, or import if shared)
const eventPricingSchema = z.object({
  price: z.number().min(0, "Price must be 0 or greater"),
  totalTickets: z.number().min(1, "Must have at least 1 ticket"),
  ticketTypes: z.array(ticketTypeSchema).optional(),
  isFreeEvent: z.boolean().optional(),
  organizerAbsorbsFees: z.boolean().optional(),
  priceInfo: z.string().optional(),
});

type EventPricingFormData = z.infer<typeof eventPricingSchema>;

interface EventPricingFormProps {
  form: UseFormReturn<any>; // Use 'any' for now, or a more specific type from the parent form
  usingTicketTypes: boolean;
  toggleTicketTypeMode: () => void;
  addTicketType: () => void;
  fieldArray: UseFieldArrayReturn<any, "ticketTypes", "id">; // Adjust 'any' as needed
  organizerAbsorbsFees: boolean;
}

export default function EventPricingForm({
  form,
  usingTicketTypes,
  toggleTicketTypeMode,
  addTicketType,
  fieldArray,
  organizerAbsorbsFees
}: EventPricingFormProps) {
  const { fields, remove } = fieldArray;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-brand-teal" />
            Ticket Pricing
          </CardTitle>
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground mr-2">
              {usingTicketTypes ? "Multiple ticket types" : "Simple pricing"}
            </span>
            <Button 
              type="button" 
              onClick={toggleTicketTypeMode} 
              variant="outline"
              size="sm"
            >
              Switch
            </Button>
          </div>
        </div>
        <CardDescription>
          {usingTicketTypes 
            ? "Create different ticket types with varying prices and quantities" 
            : "Set a single price and quantity for all tickets"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Free Event Checkbox */}
        <FormField
          control={form.control}
          name="isFreeEvent"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (checked) {
                      form.setValue("price", 0);
                      const ticketTypes = form.getValues("ticketTypes");
                      if (ticketTypes) {
                        ticketTypes.forEach((_: any, index: number) => {
                          form.setValue(`ticketTypes.${index}.price`, 0);
                        });
                      }
                      form.setValue("organizerAbsorbsFees", false); 
                    }
                  }}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Free Event</FormLabel>
                <FormDescription>
                  Check this if your event is free. Price fields will be disabled.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {!usingTicketTypes ? (
          // Simple pricing mode - single price and quantity
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price per Ticket (₦)</FormLabel>
                  <FormDescription>
                    {form.watch("isFreeEvent") 
                      ? "This is a free event."
                      : `This is the ${organizerAbsorbsFees ? "amount you will receive" : "base price"} per ticket`}
                  </FormDescription>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        field.onChange(value);
                      }}
                      disabled={form.watch("isFreeEvent")}
                    />
                  </FormControl>
                  <FormDescription>
                    {!usingTicketTypes && !form.watch("isFreeEvent") && (form.watch("price") || 0) > 0 && form.watch("priceInfo")}
                    {form.watch("isFreeEvent") && "No fees apply for free events."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalTickets"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Tickets Available</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          // Multiple ticket types mode
          <div className="space-y-6">
            {fields.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-lg">Ticket Type {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => remove(index)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Remove
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Ticket Name */}
                  <FormField
                    control={form.control}
                    name={`ticketTypes.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticket Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="General Admission, VIP, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Ticket Description */}
                  <FormField
                    control={form.control}
                    name={`ticketTypes.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={2} placeholder="What's included with this ticket type?" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Price */}
                    <FormField
                      control={form.control}
                      name={`ticketTypes.${index}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (₦)</FormLabel>
                          <FormDescription>
                            {form.watch("isFreeEvent")
                              ? "This is a free event."
                              : `This is the ${organizerAbsorbsFees ? "amount you will receive" : "base price"} per ticket`}
                          </FormDescription>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} disabled={form.watch("isFreeEvent")} />
                          </FormControl>
                          <FormDescription>
                            {!form.watch("isFreeEvent") && form.watch(`ticketTypes.${index}.priceInfo`)}
                            {form.watch("isFreeEvent") && "No fees apply for free events."}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`ticketTypes.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Advanced Options Section */}
                  <div className="mt-2 border-t pt-4">
                    <h5 className="text-sm font-medium mb-3">Advanced Options</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Hidden Ticket Toggle */}
                      <FormField
                        control={form.control}
                        name={`ticketTypes.${index}.isHidden`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 text-brand-teal border-gray-300 rounded focus:ring-brand-teal"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">Hide this ticket type</FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      {/* Group Purchase Toggle */}
                      <FormField
                        control={form.control}
                        name={`ticketTypes.${index}.allowGroupPurchase`}
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 text-brand-teal border-gray-300 rounded focus:ring-brand-teal"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">Allow group purchase</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    {/* Group Purchase Limits */}
                    {form.watch(`ticketTypes.${index}.allowGroupPurchase`) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <FormField
                          control={form.control}
                          name={`ticketTypes.${index}.minPerTransaction`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minimum per transaction</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`ticketTypes.${index}.maxPerTransaction`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum per transaction</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <Button
              type="button"
              onClick={addTicketType}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Another Ticket Type
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}