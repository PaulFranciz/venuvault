import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EventFormData } from '@/app/create-event/page';

interface EventFormState {
  formData: EventFormData;
  currentStepIndex: number;
  setFormData: (data: Partial<EventFormData> | ((prev: EventFormData) => EventFormData)) => void;
  setCurrentStepIndex: (index: number) => void;
  resetForm: () => void;
}

const initialFormData: EventFormData = {
  name: '',
  description: '',
  category: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  timezone: 'GMT+1',
  locationType: 'physical',
  ticketTypes: [],
  currency: 'USD',
  platformFeePaidBy: 'buyer',
};

export const useEventFormStore = create<EventFormState>()(
  persist(
    (set) => ({
      formData: initialFormData,
      currentStepIndex: 0,
      setFormData: (data) => set((state) => {
        const newData = typeof data === 'function' 
          ? data(state.formData)
          : { ...state.formData, ...data };
        return { formData: newData };
      }),
      setCurrentStepIndex: (index) => set({ currentStepIndex: index }),
      resetForm: () => set({ formData: initialFormData, currentStepIndex: 0 }),
    }),
    {
      name: 'event-form-storage',
      // Only persist these fields
      partialize: (state) => ({
        formData: state.formData,
        currentStepIndex: state.currentStepIndex,
      }),
    }
  )
);
