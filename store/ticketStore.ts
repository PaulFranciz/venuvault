import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface TicketState {
  // Modal state
  isModalOpen: boolean;
  selectedTicketType: string | null;
  selectedQuantity: number;
  selectedTicketName: string | null;
  selectedTicketPrice: number | null;
  
  // Reservation state
  isReserving: boolean;
  isReserved: boolean;
  reservationExpiry: number | null;
  showReservation: boolean;
  
  // Enhanced reservation data
  reservationId: string | null;
  eventId: string | null;
  eventName: string | null;
  eventBannerUrl: string | null;
  
  // Actions
  openModal: () => void;
  closeModal: () => void;
  setSelectedTicket: (ticketTypeId: string, quantity: number, name: string, price: number) => void;
  startReservation: (expiryTime: number, reservationId: string | null, eventId: string | null, eventName: string | null, eventBannerUrl?: string | null) => void;
  completeReservation: () => void;
  cancelReservation: () => void;
  releaseTicket: () => void;
  resetState: () => void;
  hasActiveReservation: () => boolean;
  checkReservationExpiry: () => boolean;
}

// Create a Zustand store with enhanced persistence for high-performance navigation
const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      // Initial state
      isModalOpen: false,
      selectedTicketType: null,
      selectedQuantity: 0,
      selectedTicketName: null,
      selectedTicketPrice: null,
      isReserving: false,
      isReserved: false,
      reservationExpiry: null,
      showReservation: false,
      
      // Enhanced reservation data
      reservationId: null,
      eventId: null,
      eventName: null,
      eventBannerUrl: null,
      
      // Actions
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),
      
      setSelectedTicket: (ticketTypeId, quantity, name, price) => set({
        selectedTicketType: ticketTypeId,
        selectedQuantity: quantity,
        selectedTicketName: name,
        selectedTicketPrice: price,
        isReserving: true,
      }),
      
      startReservation: (expiryTime, reservationId, eventId, eventName, eventBannerUrl) => {
        // Create a complete backup of reservation data in localStorage for resilience
        // This helps with Next.js 15's high performance navigation and ensures state survives
        try {
          // Store complete reservation state for fast recovery during navigation
          const reservationBackup = {
            reservationExpiry: expiryTime,
            isReserved: true,
            showReservation: true,
            reservationId,
            eventId,
            eventName,
            eventBannerUrl: eventBannerUrl || null,
            selectedTicketType: get().selectedTicketType,
            selectedQuantity: get().selectedQuantity,
            selectedTicketName: get().selectedTicketName,
            selectedTicketPrice: get().selectedTicketPrice,
            timestamp: Date.now() // Add timestamp for validation
          };
          
          // Store the complete backup as a JSON string
          localStorage.setItem('ticwaka-reservation-backup', JSON.stringify(reservationBackup));
          
          // Also store critical values individually for backward compatibility
          localStorage.setItem('ticketReservationTime', String(expiryTime));
          localStorage.setItem('ticketEventId', eventId || '');
          localStorage.setItem('ticketReservationId', reservationId || '');
        } catch (e) {
          console.error('Failed to backup reservation data', e);
        }
        
        // Update the state with a synchronous operation
        const newState = {
          reservationExpiry: expiryTime,
          showReservation: true,
          isReserving: true,
          isReserved: true,
          isModalOpen: false, // Close modal to avoid UI conflicts
          reservationId,
          eventId,
          eventName,
          eventBannerUrl: eventBannerUrl || null,
        };
        
        set(newState);
        
        // Force the state to be persisted immediately
        try {
          const stateForStorage = {
            state: {
              isReserved: true,
              reservationExpiry: expiryTime,
              showReservation: true,
              reservationId,
              eventId,
              eventName,
              eventBannerUrl: eventBannerUrl || null,
              selectedTicketType: get().selectedTicketType,
              selectedQuantity: get().selectedQuantity,
              selectedTicketName: get().selectedTicketName,
              selectedTicketPrice: get().selectedTicketPrice,
            },
            version: 0 // Version matches Zustand persist middleware
          };
          
          localStorage.setItem('ticwaka-ticket-store', JSON.stringify(stateForStorage));
        } catch (e) {
          console.error('Failed to force persist state', e);
        }
      },
      
      completeReservation: () => set({ isReserving: false }),
      
      cancelReservation: () => set({ isReserving: false, isReserved: false, showReservation: false }),
      
      releaseTicket: () => set({
        reservationExpiry: null,
        showReservation: false,
        isReserving: false,
        isReserved: false,
        reservationId: null,
      }),
      
      resetState: () => set({
        isModalOpen: false,
        selectedTicketType: null,
        selectedQuantity: 0,
        selectedTicketName: null,
        selectedTicketPrice: null,
        isReserving: false,
        isReserved: false,
        reservationExpiry: null,
        showReservation: false,
        reservationId: null,
        eventId: null,
        eventName: null,
        eventBannerUrl: null,
      }),
      
      hasActiveReservation: () => {
        const state = get();
        return state.isReserved && state.reservationExpiry !== null && !get().checkReservationExpiry();
      },
      
      checkReservationExpiry: () => {
        const state = get();
        if (!state.reservationExpiry) return true;
        
        const isExpired = Date.now() > state.reservationExpiry;
        if (isExpired && state.isReserved) {
          // Auto release expired ticket
          set({
            isReserved: false,
            isReserving: false,
            showReservation: false,
          });
          return true;
        }
        return isExpired;
      },
      
      // Additional helper to re-check reservation state
      // (This can be useful during page transitions)
      getState: () => ({
        isReserved: get().isReserved,
        showReservation: get().showReservation,
        reservationExpiry: get().reservationExpiry,
        reservationId: get().reservationId,
        eventId: get().eventId,
        eventName: get().eventName,
        eventBannerUrl: get().eventBannerUrl,
      }),
    }),
    {
      name: 'ticwaka-ticket-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isReserved: state.isReserved,
        reservationExpiry: state.reservationExpiry,
        showReservation: state.showReservation,
        reservationId: state.reservationId,
        eventId: state.eventId,
        eventName: state.eventName,
        eventBannerUrl: state.eventBannerUrl,
        selectedTicketType: state.selectedTicketType,
        selectedQuantity: state.selectedQuantity,
        selectedTicketName: state.selectedTicketName,
        selectedTicketPrice: state.selectedTicketPrice,
      }),
    }
  )
);

export default useTicketStore;
