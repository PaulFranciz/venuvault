"use client";

import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
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
import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, Plus, Trash2, CreditCard, Clock, Map, Calendar, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStorageUrl } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { v4 as uuidv4 } from 'uuid'; // You may need to install this package

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
});

// Define form schema
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
  price: z.number().min(0, "Price must be 0 or greater"), // Legacy field
  totalTickets: z.number().min(1, "Must have at least 1 ticket"), // Legacy field
  isPublished: z.boolean().optional(),
  inviteOnly: z.boolean().optional(),
  refundPolicy: z.string().optional(),
  ticketTypes: z.array(ticketTypeSchema).optional(),
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

export default function EventForm({ mode, initialData }: EventFormProps) {
  const { user } = useUser();
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.updateEvent);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const currentImageUrl = useStorageUrl(initialData?.imageStorageId);

  // Image upload
  const imageInput = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const updateEventImage = useMutation(api.storage.updateEventImage);
  const deleteImage = useMutation(api.storage.deleteImage);

  const [removedCurrentImage, setRemovedCurrentImage] = useState(false);
  
  // Local state for form UI
  const [isCustomRefundPolicy, setIsCustomRefundPolicy] = useState(false);
  const [usingTicketTypes, setUsingTicketTypes] = useState(
    initialData?.ticketTypes && initialData.ticketTypes.length > 0
  );

  // Initialize the form
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
      ticketTypes: initialData?.ticketTypes ?? [
        // Default ticket type if none exists
        {
          id: uuidv4(),
          name: "General Admission",
          description: "Standard entry ticket",
          price: 0,
          quantity: 100,
          remaining: 100,
          isSoldOut: false,
          isHidden: false,
          allowGroupPurchase: true,
          maxPerTransaction: 10,
          minPerTransaction: 1,
        }
      ],
    },
  });
  
  // Set up field array for ticket types
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ticketTypes",
  });

  // Effect to handle custom refund policy toggle
  React.useEffect(() => {
    const refundPolicy = form.watch("refundPolicy");
    setIsCustomRefundPolicy(!REFUND_POLICY_OPTIONS.includes(refundPolicy || ""));
  }, [form.watch("refundPolicy")]);

  async function onSubmit(values: FormData) {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication error",
        description: "You must be logged in to create or edit events.",
      });
      return;
    }

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
        const processedTicketTypes = values.ticketTypes?.map(type => ({
          ...type,
          remaining: type.remaining ?? type.quantity // Set remaining to quantity for new ticket types
        }));

        // For create mode
        if (mode === "create") {
          const eventId = await createEvent({
            ...values,
            userId: user.id,
            eventDate: values.eventDate.getTime(),
            endDate: values.endDate?.getTime(),
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
            ...values,
            eventDate: values.eventDate.getTime(),
            endDate: values.endDate?.getTime(),
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
    append({
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
    if (!usingTicketTypes && (!form.getValues("ticketTypes") || form.getValues("ticketTypes").length === 0)) {
      addTicketType();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Event Basic Details Card */}
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

        {/* Location & Time Card */}
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
            {!usingTicketTypes ? (
              // Simple pricing mode - single price and quantity
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Ticket (₦)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
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
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 bg-gray-50">
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
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Quantity */}
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
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
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

        {/* Event Settings Card */}
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
          </CardContent>
        </Card>

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
