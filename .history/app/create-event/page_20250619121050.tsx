'use client';

import React from 'react';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Spinner from "@/components/Spinner";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from '@/components/ui/button';
import { toast } from "sonner"; // Added for sonner toasts
import EventPublicationSuccessModal from '@/components/event-creation/EventPublicationSuccessModal'; // Added for success modal
import { Calendar, MapPin, Tag, Clock, Users, Info, Ticket } from 'lucide-react';
import { useEventForm } from '@/providers/EventFormProvider';
import { Currency, formatCurrency } from '@/lib/currencyUtils';
import { Id } from "@/convex/_generated/dataModel"; // Added for Id type

// Step components
import BasicInfoStep from '@/components/event-creation/BasicInfoStep';
import CategoryStep from '@/components/event-creation/CategoryStep';
import DateTimeStep from '@/components/event-creation/DateTimeStep';
import LocationStep from '@/components/event-creation/LocationStep';
import DetailsStep from '@/components/event-creation/DetailsStep';
import TicketStep from '@/components/event-creation/TicketStep';
import PreviewStep from '@/components/event-creation/PreviewStep';

// Define ticket type for ticket-related components
export type TicketType = {
  id: string;
  name: string;
  price: string;
  quantity: string;
  description: string;
  unlimited: boolean;
  startDate?: string;
  endDate?: string;
  recurringEvent?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  recurringDays?: number[];
  recurringEndDate?: string;
  isFree?: boolean;
  isHidden?: boolean;
};

// Define the types for our form data
export type VendorPassType = {
  id: string;
  name: string;
  price: string;
  quantity: string;
  description?: string;
  unlimited: boolean;
};

export type EventFormData = {
  name: string;
  description: string;
  category: string;
  bannerImage?: File;
  thumbnailImage?: File;
  bannerImagePreviewUrl?: string;
  thumbnailImagePreviewUrl?: string;
  bannerImageStorageId?: Id<"_storage">; // Added for actual storage ID
  thumbnailImageStorageId?: Id<"_storage">; // Added for thumbnail storage ID
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  locationType: 'physical' | 'virtual';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  virtualLink?: string;
  // Google Maps coordinates
  coordinates?: {
    lat: number;
    lng: number;
  };
  placeId?: string;
  // Agenda Items
  agenda?: { title: string; startTime: string; endTime: string; description: string; }[];
  // Guest List
  guestList?: { name: string; email: string; role: string; }[];
  // Vendor Information
  vendors?: { name: string; description: string; }[];
  // Media Files
  audioSnippetFile?: File;
  audioSnippetUrl?: string;
  videoSnippetFile?: File;
  videoSnippetUrl?: string;
  generalImageFiles?: File[]; 
  generalImageUrls?: string[];
  generalVideoFiles?: File[];
  generalVideoUrls?: string[];

  // Ticket related fields
  ticketTypes?: TicketType[];
  currency?: Currency; 
  platformFeePaidBy?: 'buyer' | 'creator';
  // Vendor Pass fields
  vendorPassesEnabled?: boolean;
  vendorPasses?: VendorPassType[];
  // Refund Policy fields
  refundPolicyEnabled?: boolean;
  refundPolicyDetails?: string;
  agendaEnabled?: boolean;
  guestListEnabled?: boolean;
  mediaPreviewsEnabled?: boolean;
  // Recurring Event fields
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly';
  recurringInterval?: number;
  recurringDaysOfWeek?: string[]; // e.g., ['Monday', 'Wednesday']
  recurringDayOfMonth?: number; // e.g., 15
  recurringEndDate?: string;
  // Additional fields from schema
  locationTips?: string; 
  inviteOnly?: boolean;
};

// Define the steps of our form
type StepComponentProps = {
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
  onSubmit?: () => void; // Added for PreviewStep
  onSchedulePublish?: (scheduleDateTime: Date) => void; // Updated for PreviewStep
};

type Step = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  component: React.ComponentType<StepComponentProps>;
  tips: { text: string }[];
};

export default function CreateEventPage() {
  // Get all context hooks first to maintain consistent hook ordering
  const { 
    formData, 
    setFormData, 
    currentStepIndex, 
    setCurrentStepIndex, 
    resetForm 
  } = useEventForm();
  const router = useRouter();
  const { user: authUser, isLoaded: authLoaded } = useUser();
  
  // All useState hooks together for consistent ordering
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for success modal
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState("");
  const [successModalMessage, setSuccessModalMessage] = useState("");
  const [successModalEventId, setSuccessModalEventId] = useState<string | undefined>(undefined);
  const [successModalIsScheduled, setSuccessModalIsScheduled] = useState(false);

  // Call useMutation at the top level
  const createEventMutation = useMutation(api.events.create);

  // Call useMutation at the top level
  
  const handleSchedulePublish = async (scheduleDateTime: Date) => {
    if (!authUser) {
      toast.error('Please sign in to schedule an event.');
      router.push('/sign-in');
      return;
    }
    setIsSubmitting(true);
    console.log('Scheduling event with data:', formData, 'for time:', scheduleDateTime);

    try {
      const eventData = {
        name: formData.name,
        description: formData.description,
        location: formData.locationType === 'physical' 
          ? `${formData.address}, ${formData.city}, ${formData.state}, ${formData.country}, ${formData.zipCode}` 
          : formData.virtualLink || 'Virtual Event',
        eventDate: new Date(formData.startDate).getTime(), // Convert to timestamp
        price: formData.ticketTypes && formData.ticketTypes.length > 0 ? parseFloat(formData.ticketTypes[0].price) : 0, // Example: use first ticket price or 0
        totalTickets: formData.ticketTypes?.reduce((sum, tt) => sum + (tt.unlimited ? Infinity : parseInt(tt.quantity, 10) || 0), 0) || 0,
        userId: authUser?.id, // Use the authenticated user ID
        imageStorageId: formData.bannerImageStorageId, // Added this line
        thumbnailImageStorageId: formData.thumbnailImageStorageId, // Added this line for thumbnail
        // Optional fields from formData
        locationTips: formData.locationTips,
        endDate: formData.endDate ? new Date(formData.endDate).getTime() : undefined,
        startTime: formData.startTime,
        endTime: formData.endTime,
        timezone: formData.timezone,
        category: formData.category,
        inviteOnly: formData.inviteOnly,
        refundPolicy: formData.refundPolicyDetails,
        organizerAbsorbsFees: formData.platformFeePaidBy === 'creator',
        isFreeEvent: formData.ticketTypes?.some(tt => tt.isFree),
        ticketTypes: formData.ticketTypes?.map(tt => ({
          id: tt.id,
          name: tt.name,
          description: tt.description,
          price: parseFloat(tt.price) || 0,
          quantity: tt.unlimited ? Infinity : parseInt(tt.quantity, 10) || 0,
          remaining: tt.unlimited ? Infinity : parseInt(tt.quantity, 10) || 0,
          isSoldOut: false, // Initial state
          isHidden: false, // Default or from form
          allowGroupPurchase: true, // Default or from form
          maxPerTransaction: 10, // Default or from form
          minPerTransaction: 1, // Default or from form
          priceInfo: tt.isFree ? 'Free' : formatCurrency(parseFloat(tt.price) || 0, formData.currency!)
        })),
        // Recurring event fields
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.recurringFrequency,
        recurringInterval: formData.recurringInterval,
        recurringDaysOfWeek: formData.recurringDaysOfWeek,
        recurringDayOfMonth: formData.recurringDayOfMonth,
        recurringEndDate: formData.recurringEndDate ? new Date(formData.recurringEndDate).getTime() : undefined,
        
        // Scheduling specific fields
        isPublished: false, // Explicitly set to false for scheduled events
        scheduledPublishTime: scheduleDateTime.getTime(), // Timestamp for scheduled publish
      };

      const eventId = await createEventMutation(eventData as any); // Use 'as any' if type conflicts arise, refine later
      console.log('Event scheduled successfully with ID:', eventId);
      toast.success("Event scheduled successfully!");
      setSuccessModalTitle("Event Scheduled!");
      setSuccessModalMessage("Your event has been successfully scheduled and will be published automatically at the chosen time.");
      setSuccessModalEventId(eventId as string);
      setSuccessModalIsScheduled(true);
      setIsSuccessModalOpen(true);
      // resetForm(); // Moved to modal close
      // router.push(`/events/${eventId}`); // Moved to modal action
    } catch (error) {
      console.error('Error scheduling event:', error);
      toast.error('Failed to schedule event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!authUser) {
      toast.error('Please sign in to create an event.');
      router.push('/sign-in');
      return;
    }
    setIsSubmitting(true);
    console.log('Submitting event with data:', formData);

    // Prepare data for Convex mutation, including recurring event fields
    const eventData = {
      name: formData.name,
      description: formData.description,
      location: formData.locationType === 'physical' 
        ? `${formData.address}, ${formData.city}, ${formData.state}, ${formData.country}, ${formData.zipCode}` 
        : formData.virtualLink || 'Virtual Event',
      eventDate: new Date(formData.startDate).getTime(), // Convert to timestamp
      price: formData.ticketTypes && formData.ticketTypes.length > 0 ? parseFloat(formData.ticketTypes[0].price) : 0, // Example: use first ticket price or 0
      totalTickets: formData.ticketTypes?.reduce((sum, tt) => sum + (tt.unlimited ? Infinity : parseInt(tt.quantity, 10) || 0), 0) || 0,
      userId: authUser?.id, // Use the authenticated user ID
      imageStorageId: formData.bannerImageStorageId, // Added this line
      thumbnailImageStorageId: formData.thumbnailImageStorageId, // Added this line for thumbnail
      // Optional fields from formData
      locationTips: formData.locationTips,
      endDate: formData.endDate ? new Date(formData.endDate).getTime() : undefined,
      startTime: formData.startTime,
      endTime: formData.endTime,
      timezone: formData.timezone,
      category: formData.category,
      isPublished: true, // Default to true for immediate publish
      inviteOnly: formData.inviteOnly,
      refundPolicy: formData.refundPolicyDetails,
      organizerAbsorbsFees: formData.platformFeePaidBy === 'creator',
      isFreeEvent: formData.ticketTypes?.some(tt => tt.isFree),
      ticketTypes: formData.ticketTypes?.map(tt => ({
        id: tt.id,
        name: tt.name,
        description: tt.description,
        price: parseFloat(tt.price) || 0,
        quantity: tt.unlimited ? Infinity : parseInt(tt.quantity, 10) || 0,
        remaining: tt.unlimited ? Infinity : parseInt(tt.quantity, 10) || 0,
        isSoldOut: false, // Initial state
        isHidden: false, // Default or from form
        allowGroupPurchase: true, // Default or from form
        maxPerTransaction: 10, // Default or from form
        minPerTransaction: 1, // Default or from form
        priceInfo: tt.isFree ? 'Free' : formatCurrency(parseFloat(tt.price) || 0, formData.currency!)
      })),
      // Recurring event fields
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.recurringFrequency,
      recurringInterval: formData.recurringInterval,
      recurringDaysOfWeek: formData.recurringDaysOfWeek,
      recurringDayOfMonth: formData.recurringDayOfMonth,
      recurringEndDate: formData.recurringEndDate ? new Date(formData.recurringEndDate).getTime() : undefined,
    };

    try {
      const eventId = await createEventMutation(eventData as any); // Use 'as any' if type conflicts arise, refine later
      console.log('Event created successfully with ID:', eventId);
      toast.success("Event published successfully!");
      setSuccessModalTitle("Event Published!");
      setSuccessModalMessage("Your event has been successfully published and is now live.");
      setSuccessModalEventId(eventId as string);
      setSuccessModalIsScheduled(false);
      setIsSuccessModalOpen(true);
      // resetForm(); // Moved to modal close
      // router.push(`/event/${eventId}`); // Moved to modal action
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to publish event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
    resetForm();
    // Optionally, navigate to a general page or do nothing, 
    // as specific navigation is handled by modal buttons.
    // router.push('/seller/events'); // Example: navigate to events list after closing modal
  };

  // Define the steps
  const steps: Step[] = [
    {
      id: 'basic-info',
      title: 'Tell us about your event',
      subtitle: 'Basic Information',
      icon: <Info className="h-6 w-6 text-[#F96521]" />,
      component: BasicInfoStep,
      tips: [
        { text: 'Make your event name short and memorable.' },
        { text: 'Focus on unique aspects to make your description engaging.' }
      ]
    },
    {
      id: 'category',
      title: 'What kind of events do you organize?',
      subtitle: 'Basic Information',
      icon: <Tag className="h-6 w-6 text-[#F96521]" />,
      component: CategoryStep,
      tips: [
        { text: 'Think about the primary audience for your event.' }
      ]
    },
    {
      id: 'date-time',
      title: 'Specify when your event will take place.',
      subtitle: 'Basic Information',
      icon: <Calendar className="h-6 w-6 text-[#F96521]" />,
      component: DateTimeStep,
      tips: [
        { text: 'Double-check dates and times to avoid scheduling conflicts.' },
        { text: 'Clearly indicate if the event has multiple occurrences.' }
      ]
    },
    {
      id: 'location',
      title: 'Where will your event take place?',
      subtitle: 'Basic Information',
      icon: <MapPin className="h-6 w-6 text-[#F96521]" />,
      component: LocationStep,
      tips: [
        { text: 'For physical events, ensure the address is correct to avoid confusion and use the map pin to give attendees a visual location.' },
        { text: 'For virtual events, double-check the link and access instructions to ensure they are correct and easily understandable.' },
        { text: 'Clearly indicate if your event has both physical and virtual attendance options, and provide details for both.' }
      ]
    },
    {
      id: 'details',
      title: 'Highlight any VIP or special guests.',
      subtitle: 'Event Details',
      icon: <Users className="h-6 w-6 text-[#F96521]" />,
      component: DetailsStep,
      tips: [
        { text: 'Regularly update the guest list to ensure accuracy.' },
        { text: 'Use high-quality images and videos to attract more interest.' }
      ]
    },
    {
      id: 'tickets',
      title: 'Set up tickets for your event.',
      subtitle: 'Tickets',
      icon: <Ticket className="h-6 w-6 text-[#F96521]" />,
      component: TicketStep,
      tips: [
        { text: 'Offer different ticket types to cater to various audience segments.' },
        { text: 'Consider early bird pricing to encourage early registrations.' },
        { text: 'Be clear about what each ticket type includes to avoid confusion.' }
      ]
    },
    {
      id: 'preview',
      title: 'Review and publish your event.',
      subtitle: 'Final Review',
      icon: <Clock className="h-6 w-6 text-[#F96521]" />,
      component: PreviewStep,
      tips: [
        { text: 'Ensure all details are correct before publishing.' },
        { text: 'Check your ticket settings and pricing carefully.' }
      ]
    }
  ];

  const currentStep = steps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
      window.scrollTo(0, 0);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      window.scrollTo(0, 0);
    }
  };

  if (!authLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }
  
  // For development: proceed even if user is not authenticated
  // In production, you would redirect unauthenticated users

  return (
    <div className="min-h-screen bg-[#F8F0E3]">
      <div className="flex flex-col md:flex-row">
        {/* Left sidebar */}
        <div className="w-full md:w-1/3 p-8">
          <div className="mb-8">
            <Image 
              src="/images/logo.png" 
              alt="Ticwaka Logo" 
              width={120} 
              height={40} 
              className="mb-12"
            />
            <h1 className="text-3xl font-pally font-pally-bold text-[#231F20] mb-2">
              {currentStep.title}
            </h1>
            <div className="mt-8">
              <h3 className="text-lg font-pally text-[#231F20] mb-2">Here are some hints</h3>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#F8F0E3] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#F96521]">💡</span>
                  </div>
                  <div>
                    <h4 className="font-pally font-pally-medium text-[#231F20] mb-2">Tips to consider</h4>
                    <ul className="space-y-2">
                      {currentStep.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-[#4A4A4A]">
                          <span className="text-[#F96521] font-bold">•</span>
                          <span>{tip.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right content area */}
        <div className="w-full md:w-2/3 bg-[#F8F0E3]">
          <div className="max-w-3xl mx-auto p-4 md:p-8">
            <div className="bg-[#231F20] rounded-3xl overflow-hidden shadow-xl">
              <div className="p-4 md:p-6 border-b border-[#3B3B3B]">
                <h2 className="text-white text-xl font-pally font-pally-medium">{currentStep.subtitle}</h2>
                <div className="mt-2 flex space-x-2">
                  {steps.map((step, index) => (
                    <div 
                      key={index} 
                      className={`h-1 flex-1 rounded-full ${
                        index <= currentStepIndex ? 'bg-[#F96521]' : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="p-6 md:p-8">
                <currentStep.component
                  onNext={handleNext}
                  onBack={currentStepIndex > 0 ? handleBack : undefined}
                  isSubmitting={isSubmitting}
                  onSubmit={handleSubmit} // Pass handleSubmit for PreviewStep
                  onSchedulePublish={currentStepIndex === steps.length - 1 ? handleSchedulePublish : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <EventPublicationSuccessModal
        isOpen={isSuccessModalOpen}
        onClose={handleCloseSuccessModal}
        title={successModalTitle}
        message={successModalMessage}
        eventId={successModalEventId}
        isScheduled={successModalIsScheduled}
      />
    </div>
  );
}
