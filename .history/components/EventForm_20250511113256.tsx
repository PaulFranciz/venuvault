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
            {/* Simple pricing mode */}
            {!usingTicketTypes && (
              <div className="space-y-4">
                {/* Price per Ticket */}
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Ticket (₦)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2">₦</span>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className="pl-6"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Total Tickets */}
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
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Multiple ticket types mode */}
            {usingTicketTypes && (
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative">
                    <h3 className="font-medium mb-3">Ticket Type {index + 1}</h3>
                    
                    {/* Allow removal if there are more than one ticket types */}
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2 text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Ticket Type Name */}
                      <FormField
                        control={form.control}
                        name={`ticketTypes.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ticket Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., General Admission, VIP" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Ticket Price */}
                      <FormField
                        control={form.control}
                        name={`ticketTypes.${index}.price`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price (₦)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2">₦</span>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  className="pl-6"
                                />
                              </div>
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
                          <FormItem className="md:col-span-2">
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="What's included with this ticket"
                                rows={2}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Ticket Quantity */}
                      <FormField
                        control={form.control}
                        name={`ticketTypes.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Hidden Status */}
                      <FormField
                        control={form.control}
                        name={`ticketTypes.${index}.isHidden`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0 mt-6">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="h-4 w-4 text-brand-teal rounded focus:ring-brand-teal"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Hide this ticket type</FormLabel>
                              <FormDescription>
                                Hidden tickets won't be visible to attendees
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      {/* Group Purchase Settings */}
                      <div className="md:col-span-2 border-t pt-4 mt-2">
                        <h4 className="text-sm font-medium mb-2">Group Purchase Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Allow Group Purchase */}
                          <FormField
                            control={form.control}
                            name={`ticketTypes.${index}.allowGroupPurchase`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-4 w-4 text-brand-teal rounded focus:ring-brand-teal"
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Allow group purchase</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          {/* Min Per Transaction */}
                          <FormField
                            control={form.control}
                            name={`ticketTypes.${index}.minPerTransaction`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Min per transaction</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    disabled={!form.watch(`ticketTypes.${index}.allowGroupPurchase`)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          
                          {/* Max Per Transaction */}
                          <FormField
                            control={form.control}
                            name={`ticketTypes.${index}.maxPerTransaction`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Max per transaction</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    disabled={!form.watch(`ticketTypes.${index}.allowGroupPurchase`)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
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
                  <Plus className="mr-2 h-4 w-4" /> Add Another Ticket Type
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
          <CardContent className="space-y-4">
            {/* Refund Policy */}
            <FormField
              control={form.control}
              name="refundPolicy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Refund Policy</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-teal focus:border-brand-teal"
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value);
                        setIsCustomRefundPolicy(value === "Custom refund policy");
                      }}
                    >
                      {REFUND_POLICY_OPTIONS.map((policy) => (
                        <option key={policy} value={policy}>
                          {policy}
                        </option>
                      ))}
                      <option value="Custom refund policy">Custom refund policy</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Refund Policy Text */}
            {isCustomRefundPolicy && (
              <FormField
                control={form.control}
                name="refundPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Refund Policy</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder="Enter your custom refund policy..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Invite Only Toggle */}
            <FormField
              control={form.control}
              name="inviteOnly"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 text-brand-teal rounded focus:ring-brand-teal"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Invite-only Event</FormLabel>
                    <FormDescription>
                      This event will only be visible to people with the direct link
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Published Toggle */}
            <FormField
              control={form.control}
              name="isPublished"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 text-brand-teal rounded focus:ring-brand-teal"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Publish Event</FormLabel>
                    <FormDescription>
                      Published events are visible to the public. Uncheck to save as draft.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Submission Button */}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-r from-brand-teal to-teal-700 hover:from-brand-teal/90 hover:to-teal-700/90 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {mode === "create" ? "Creating Event..." : "Updating Event..."}
            </>
          ) : mode === "create" ? (
            "Create Event"
          ) : (
            "Update Event"
          )}
        </Button>
      </form>
    </Form>
  );
}
