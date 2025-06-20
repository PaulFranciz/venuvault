"use client";

import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import React, { useRef, useState, useTransition, useEffect } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, Plus, Trash2, CreditCard, Clock, Map, Calendar, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStorageUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { v4 as uuidv4 } from 'uuid'; // You may need to install this package

import EventBasicDetailsForm from "./EventForm/EventBasicDetailsForm";
import EventLocationTimeForm from "./EventForm/EventLocationTimeForm";
import EventPricingForm from "./EventForm/EventPricingForm";
import EventSettingsForm from "./EventForm/EventSettingsForm";

// Define ticket type schema
const ticketTypeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  quantity: z.number().min(1, "Must have at least 1 ticket"),
  remaining: z.number().optional(), // This will be calculated based on sales
  isSoldOut: z.boolean().optional(),
  isHidden: z.boolean().optional(),
  allowGroupPurchase: z.boolean().optional(),
  maxPerTransaction: z.number().optional(),
  minPerTransaction: z.number().optional(),
  priceInfo: z.string().optional(), // Add this field for ticket types
});

// Update the form schema to include isFreeEvent
const formSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().min(1, "Location is required"),
  locationTips: z.string().optional(),
  eventDate: z.date().min(new Date(new Date().setHours(0, 0, 0, 0)), "Event date must be in the future"),
  endDate: z.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timezone: z.string().optional(),
  category: z.string().optional(),
  price: z.number().min(0, "Price must be 0 or greater"),
  totalTickets: z.number().min(1, "Must have at least 1 ticket"),
  isPublished: z.boolean().optional(),
  inviteOnly: z.boolean().optional(),
  refundPolicy: z.string().optional(),
  ticketTypes: z.array(ticketTypeSchema).optional(),
  organizerAbsorbsFees: z.boolean().optional(),
  priceInfo: z.string().optional(), // Add this field
  isFreeEvent: z.boolean().default(false), // Add for free event toggle
});

type FormData = z.infer<typeof formSchema>;

interface InitialEventData {
  _id: Id<"events">;
  name: string;
  description: string;
  location: string;
  locationTips?: string;
  eventDate: number;
  endDate?: number;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  category?: string;
  price: number;
  totalTickets: number;
  imageStorageId?: Id<"_storage">;
  isPublished?: boolean;
  inviteOnly?: boolean;
  refundPolicy?: string;
  organizerAbsorbsFees?: boolean;
  isFreeEvent?: boolean; // Add this field
  ticketTypes?: {
    id: string;
    name: string;
    description?: string;
    price: number;
    quantity: number;
    remaining: number;
    isSoldOut?: boolean;
    isHidden?: boolean;
    allowGroupPurchase?: boolean;
    maxPerTransaction?: number;
    minPerTransaction?: number;
    priceInfo?: string; // Add this field for ticket types
  }[];
}

interface EventFormProps {
  mode: "create" | "edit";
  initialData?: InitialEventData;
}

// Lists for dropdown selections
const EVENT_CATEGORIES = [
  "Conference",
  "Workshop",
  "Concert",
  "Festival",
  "Sports",
  "Networking",
  "Party",
  "Exhibition",
  "Seminar",
  "Other"
];

const TIMEZONE_OPTIONS = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Africa/Nairobi",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney"
];

const REFUND_POLICY_OPTIONS = [
  "No refunds",
  "Refunds up to 24 hours before event",
  "Refunds up to 7 days before event",
  "Refunds up to 30 days before event",
  "Custom refund policy"
];

// Platform fee calculation helper
function calculateFinalPrice(basePrice: number, organizerAbsorbsFees: boolean) {
  if (basePrice === 0) return 0;
  
  const feePercentage = 0.085; // 8.5%
  const fixedFee = 100; // ₦100
  
  if (organizerAbsorbsFees) {
    // When organizer absorbs fees (backward calculation):
    // Y = (X + 100) / 0.95  where X is the amount organizer receives
    return Math.round((basePrice + fixedFee) / (1 - feePercentage));
  } else {
    // When attendee pays fees:
    // finalPrice = basePrice + (0.05 × basePrice) + 100
    return Math.round(basePrice + (basePrice * feePercentage) + fixedFee);
  }
}

// Helper to format price info text
function getPriceInfoText(basePrice: number, organizerAbsorbsFees: boolean) {
  if (basePrice === 0) return "Free ticket";
  
  const finalPrice = calculateFinalPrice(basePrice, organizerAbsorbsFees);
  const fees = finalPrice - basePrice;

  if (organizerAbsorbsFees) {
    return `You will receive ₦${basePrice.toFixed(2)}, paying ₦${fees.toFixed(2)} in fees`;
  } else {
    return `Attendees will pay ₦${finalPrice.toFixed(2)} (includes ₦${fees.toFixed(2)} fees)`;
  }
}

export default function EventForm({ mode, initialData }: EventFormProps) {
  const { user } = useUser();
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.updateEvent);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const currentImageUrl = useStorageUrl(initialData?.imageStorageId);

  // Image upload state
  const imageInput = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const updateEventImage = useMutation(api.storage.updateEventImage);
  const deleteImage = useMutation(api.storage.deleteImage);

  const [removedCurrentImage, setRemovedCurrentImage] = useState(false);

  // Form UI state
  const [isCustomRefundPolicy, setIsCustomRefundPolicy] = useState(
    initialData?.refundPolicy ? !REFUND_POLICY_OPTIONS.includes(initialData.refundPolicy) : false
  );
  const [usingTicketTypes, setUsingTicketTypes] = useState(
    initialData?.ticketTypes && initialData.ticketTypes.length > 0
  );
  // const [isFreeEvent, setIsFreeEvent] = useState(initialData?.price === 0); // Will be handled by form state

  // Initialize form with isFreeEvent
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      location: initialData?.location ?? "",
      locationTips: initialData?.locationTips ?? "",
      eventDate: initialData ? new Date(initialData.eventDate) : new Date(),
      endDate: initialData?.endDate ? new Date(initialData.endDate) : undefined,
      startTime: initialData?.startTime ?? "",
      endTime: initialData?.endTime ?? "",
      timezone: initialData?.timezone ?? "Africa/Lagos", // Default to Lagos timezone
      category: initialData?.category ?? "",
      price: initialData?.price ?? 0,
      totalTickets: initialData?.totalTickets ?? 100,
      isPublished: initialData?.isPublished ?? true,
      inviteOnly: initialData?.inviteOnly ?? false,
      refundPolicy: initialData?.refundPolicy ?? REFUND_POLICY_OPTIONS[0],
      ticketTypes: initialData?.ticketTypes?.map(t => ({ ...t, id: t.id || uuidv4() })) ?? [
        // Default ticket type if none exists
        {
          id: uuidv4(),
          name: "General Admission",
          description: "Standard entry ticket",
          price: initialData?.price === 0 ? 0 : (initialData?.ticketTypes?.[0]?.price ?? 0),
          quantity: initialData?.ticketTypes?.[0]?.quantity ?? 100,
          remaining: initialData?.ticketTypes?.[0]?.remaining ?? (initialData?.ticketTypes?.[0]?.quantity ?? 100),
          isSoldOut: false,
          isHidden: false,
          allowGroupPurchase: true,
          maxPerTransaction: 10,
          minPerTransaction: 1,
          priceInfo: "", // Add default for ticket types
        }
      ],
      organizerAbsorbsFees: initialData?.organizerAbsorbsFees ?? false,
      priceInfo: getPriceInfoText(initialData?.price ?? 0, initialData?.organizerAbsorbsFees ?? false), // Initialize for main price
      isFreeEvent: initialData?.isFreeEvent ?? false, // Initialize based on price
    },
  });
  
  // Set up field array for ticket types
  const ticketTypesFieldArray = useFieldArray({
    control: form.control,
    name: "ticketTypes",
  });

  // Effect to handle custom refund policy toggle
  const refundPolicyValueFromWatch = form.watch("refundPolicy");
  useEffect(() => {
    setIsCustomRefundPolicy(refundPolicyValueFromWatch ? !REFUND_POLICY_OPTIONS.includes(refundPolicyValueFromWatch) : false);
  }, [refundPolicyValueFromWatch]);

  // Watch isFreeEvent to update price fields
  const isFreeEvent = form.watch("isFreeEvent");

  // Add effect to handle free event selection
  useEffect(() => {
    if (isFreeEvent) {
      if (!usingTicketTypes) {
        form.setValue("price", 0);
      } else {
        // Set all ticket type prices to 0
        const ticketTypes = form.getValues("ticketTypes") || [];
        ticketTypes.forEach((_, idx) => {
          form.setValue(`ticketTypes.${idx}.price`, 0);
        });
      }
    }
  }, [isFreeEvent, form, usingTicketTypes]);

  // Watch form fields with type safety
  const organizerAbsorbsFees = form.watch("organizerAbsorbsFees") ?? false; // Default to false if undefined
  const ticketTypes = form.watch("ticketTypes");
  const priceFromWatch = form.watch("price");

  // Update priceInfo for simple pricing and ticket types
  useEffect(() => {
    const currentOrganizerAbsorbsFees = form.getValues("organizerAbsorbsFees") ?? false;
    const currentIsFreeEvent = form.getValues("isFreeEvent");

    // For simple pricing
    if (!usingTicketTypes) {
      const currentPrice = form.getValues("price") || 0;
      const infoText = currentIsFreeEvent ? "Free ticket" : getPriceInfoText(currentPrice, currentOrganizerAbsorbsFees);
      form.setValue("priceInfo", infoText);
    } else {
      // Clear main priceInfo if using ticket types
      form.setValue("priceInfo", ""); 
    }

    // For ticket types
    if (usingTicketTypes && Array.isArray(ticketTypes)) {
      ticketTypes.forEach((type, idx) => {
        if (type?.price !== undefined) { // Check if price is defined, even if 0
          const infoText = currentIsFreeEvent ? "Free ticket" : getPriceInfoText(type.price, currentOrganizerAbsorbsFees);
          form.setValue(`ticketTypes.${idx}.priceInfo`, infoText);
        }
      });
    }
  }, [organizerAbsorbsFees, usingTicketTypes, ticketTypes, priceFromWatch, form, isFreeEvent]);

  // Effect to handle isFreeEvent toggle
  useEffect(() => {
    if (isFreeEvent) {
      form.setValue("price", 0);
      if (ticketTypes && ticketTypes.length > 0) {
        ticketTypes.forEach((_, index) => {
          form.setValue(`ticketTypes.${index}.price`, 0);
        });
      }
    } 
    // When unchecking isFreeEvent, we don't automatically restore prices here.
    // User would need to manually re-enter them or we could store previous values.
    // For now, it just enables the fields.
  }, [isFreeEvent, form, ticketTypes]);

  // Add helper text to show the actual amount organizer will receive (This useEffect is now combined above)
  // useEffect(() => {
  //   const formPrice = form.getValues("price") || 0;
  //   if (!usingTicketTypes && formPrice > 0) {
  //     const finalPrice = calculateFinalPrice(formPrice, organizerAbsorbsFees);
  //     const infoText = organizerAbsorbsFees 
  //       ? `You will receive ₦${formPrice.toFixed(2)} per ticket`
  //       : `Attendees will pay ₦${finalPrice.toFixed(2)} per ticket`;
  //     form.setValue("priceInfo", infoText);
  //   }
  // }, [organizerAbsorbsFees, form.watch("price")]);

  async function onSubmit(values: FormData) {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: "You must be logged in to create or edit events.",
      });
      return;
    }

    // --- Patch: Sync legacy price/totalTickets with ticketTypes if usingTicketTypes ---
    let patchedValues = { ...values };
    if (usingTicketTypes && values.ticketTypes && values.ticketTypes.length > 0) {
      // Only consider visible ticket types
      const visibleTypes = values.ticketTypes.filter(t => !t.isHidden);
      patchedValues.price = visibleTypes.length > 0
        ? Math.min(...visibleTypes.map(t => t.price))
        : 0;
      patchedValues.totalTickets = visibleTypes.reduce((sum, t) => sum + (t.quantity || 0), 0);
    }
    // --- End Patch ---

    // Remove priceInfo from the root of patchedValues as it's not part of the backend schema for the event itself.
    // It's used on the frontend for display and within ticketTypes.
    // The backend expects priceInfo only within each ticketType object.
    const { priceInfo, ...valuesWithoutRootPriceInfo } = patchedValues;

    startTransition(async () => {
      try {
        let imageStorageId = null;

        // Handle image changes
        if (selectedImage) {
          // Upload new image
          imageStorageId = await handleImageUpload(selectedImage);
        }

        // Handle image deletion/update in edit mode
        if (mode === "edit" && initialData?.imageStorageId) {
          if (removedCurrentImage || selectedImage) {
            // Delete old image from storage
            await deleteImage({
              storageId: initialData.imageStorageId,
            });
          }
        }

        // Prepare ticket types with corrected remaining count for new tickets
        const processedTicketTypes = valuesWithoutRootPriceInfo.ticketTypes?.map(type => ({
          ...type,
          price: valuesWithoutRootPriceInfo.isFreeEvent ? 0 : type.price, // Ensure price is 0 if free event
          remaining: type.remaining ?? type.quantity // Set remaining to quantity for new ticket types
        }));

        // For create mode
        if (mode === "create") {
          const eventId = await createEvent({
            ...valuesWithoutRootPriceInfo,
            userId: user.id,
            eventDate: valuesWithoutRootPriceInfo.eventDate.getTime(),
            endDate: valuesWithoutRootPriceInfo.endDate?.getTime(),
            ticketTypes: processedTicketTypes,
          });

          if (imageStorageId) {
            await updateEventImage({
              eventId,
              storageId: imageStorageId as Id<"_storage">,
            });
          }

          toast({
            title: "Event created",
            description: "Your event has been successfully created.",
          });

          router.push(`/event/${eventId}`);
        } 
        // For edit mode
        else {
          // Ensure initialData exists before proceeding with update
          if (!initialData) {
            throw new Error("Initial event data is required for updates");
          }

          // Update event details
          await updateEvent({
            eventId: initialData._id,
            ...valuesWithoutRootPriceInfo,
            eventDate: valuesWithoutRootPriceInfo.eventDate.getTime(),
            endDate: valuesWithoutRootPriceInfo.endDate?.getTime(),
            ticketTypes: processedTicketTypes,
          });

          // Update image - this will now handle both adding new image and removing existing image
          if (imageStorageId || removedCurrentImage) {
            await updateEventImage({
              eventId: initialData._id,
              // If we have a new image, use its ID, otherwise if we're removing the image, pass null
              storageId: imageStorageId
                ? (imageStorageId as Id<"_storage">)
                : null,
            });
          }

          toast({
            title: "Event updated",
            description: "Your event has been successfully updated.",
          });

          router.push(`/event/${initialData._id}`);
        }
      } catch (error) {
        console.error("Failed to handle event:", error);
        toast({
          variant: "destructive",
          title: "Uh oh! Something went wrong.",
          description: "There was a problem with your request.",
        });
      }
    });
  }

  async function handleImageUpload(file: File): Promise<string | null> {
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      return storageId;
    } catch (error) {
      console.error("Failed to upload image:", error);
      return null;
    }
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addTicketType = () => {
    ticketTypesFieldArray.append({
      id: uuidv4(),
      name: "",
      description: "",
      price: 0,
      quantity: 100,
      remaining: 100,
      isSoldOut: false,
      isHidden: false,
      allowGroupPurchase: true,
      maxPerTransaction: 10,
      minPerTransaction: 1,
    });
  };

  // Toggle between using legacy pricing (single price/ticketCount) or ticket types
  const toggleTicketTypeMode = () => {
    setUsingTicketTypes(!usingTicketTypes);
    
    // If switching to ticket types and none exist yet, add a default one
    if (!usingTicketTypes && (!form.getValues("ticketTypes") || form.getValues("ticketTypes")?.length === 0)) {
      addTicketType();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Event Basic Details Card */}
        <EventBasicDetailsForm
          form={form}
          imagePreview={imagePreview}
          currentImageUrl={currentImageUrl}
          removedCurrentImage={removedCurrentImage}
          handleImageChange={handleImageChange}
          imageInput={imageInput}
          setRemovedCurrentImage={setRemovedCurrentImage}
          setSelectedImage={setSelectedImage}
          setImagePreview={setImagePreview}
          EVENT_CATEGORIES={EVENT_CATEGORIES}
        />

        {/* Location & Time Card */}
        <EventLocationTimeForm
          form={form}
          TIMEZONE_OPTIONS={TIMEZONE_OPTIONS}
        />

        {/* Ticket Pricing Card */}
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
            {/* Event Type Selection */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isFreeEvent"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Event Type</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <label className="flex items-center justify-center p-4 border rounded-lg cursor-pointer hover:border-brand-teal transition-colors">
                        <input
                          type="radio"
                          className="sr-only"
                          checked={!field.value}
                          onChange={() => field.onChange(false)}
                          name={field.name}
                          value="paid"
                        />
                        <div className={`text-center ${!field.value ? 'text-brand-teal' : 'text-gray-500'}`}>
                          <CreditCard className="h-6 w-6 mx-auto mb-2" />
                          <span className="font-medium">Paid Event</span>
                        </div>
                      </label>
                      <label className="flex items-center justify-center p-4 border rounded-lg cursor-pointer hover:border-brand-teal transition-colors">
                        <input
                          type="radio"
                          className="sr-only"
                          checked={field.value}
                          onChange={() => field.onChange(true)}
                          name={field.name}
                          value="free"
                        />
                        <div className={`text-center ${field.value ? 'text-brand-teal' : 'text-gray-500'}`}>
                          <Tag className="h-6 w-6 mx-auto mb-2" />
                          <span className="font-medium">Free Event</span>
                        </div>
                      </label>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Price Fields - Only show if not a free event */}
            {!isFreeEvent && (
              !usingTicketTypes ? (
                // Simple pricing mode
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Ticket (₦)</FormLabel>
                        <FormDescription>
                          This is the {organizerAbsorbsFees ? "amount you will receive" : "base price"} per ticket
                        </FormDescription>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        {field.value > 0 && (
                          <FormDescription>
                            {getPriceInfoText(field.value, organizerAbsorbsFees)}
                          </FormDescription>
                        )}
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
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                  {ticketTypesFieldArray.fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-lg">Ticket Type {index + 1}</h4>
                        {ticketTypesFieldArray.fields.length > 1 && (
                          <Button
                            type="button"
                            onClick={() => ticketTypesFieldArray.remove(index)}
                            variant="destructive"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name={`ticketTypes.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ticket Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Earlybird, VIP, etc." />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
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
                          <FormField
                            control={form.control}
                            name={`ticketTypes.${index}.price`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Price (₦)</FormLabel>
                                <FormDescription>
                                  This is the {organizerAbsorbsFees ? "amount you will receive" : "base price"} per ticket
                                </FormDescription>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => {
                                      const value = parseFloat(e.target.value) || 0;
                                      field.onChange(value);
                                    }}
                                  />
                                </FormControl>
                                {field.value > 0 && (
                                  <FormDescription>
                                    {getPriceInfoText(field.value, organizerAbsorbsFees)}
                                  </FormDescription>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`ticketTypes.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity Available</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
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
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
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
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
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
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
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
              )
            )}

            {/* Show message if it's a free event */}
            {isFreeEvent && (
              <div className="text-center text-gray-500 space-y-4">
                <p>This is a free event. All tickets will be issued at no cost.</p>
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
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Settings Card */}
        <EventSettingsForm
          form={form}
          isCustomRefundPolicy={isCustomRefundPolicy}
          setIsCustomRefundPolicy={setIsCustomRefundPolicy}
          REFUND_POLICY_OPTIONS={REFUND_POLICY_OPTIONS}
        />

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        <Button
          type="submit"
          disabled={isPending}
            className="bg-brand-teal hover:bg-brand-teal/90"
        >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create Event" : "Update Event"}
        </Button>
        </div>
      </form>
    </Form>
  );
}
