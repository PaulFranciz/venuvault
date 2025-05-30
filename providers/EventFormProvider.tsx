"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useEventFormStore } from '@/store/useEventFormStore';
import { EventFormData } from '@/app/create-event/page';

// Create a context for the event form
interface EventFormContextType {
  formData: EventFormData;
  currentStepIndex: number;
  setFormData: (data: Partial<EventFormData>) => void;
  setCurrentStepIndex: (index: number) => void;
  resetForm: () => void;
}

const EventFormContext = createContext<EventFormContextType | undefined>(undefined);

// Provider component
export function EventFormProvider({ children }: { children: ReactNode }) {
  const formStore = useEventFormStore();

  return (
    <EventFormContext.Provider value={formStore}>
      {children}
    </EventFormContext.Provider>
  );
}

// Custom hook to use the event form context
export function useEventForm() {
  const context = useContext(EventFormContext);
  if (context === undefined) {
    throw new Error('useEventForm must be used within an EventFormProvider');
  }
  return context;
}
