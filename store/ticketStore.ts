import { create } from 'zustand'

interface TicketState {
  // Modal state
  isModalOpen: boolean
  selectedTicketType: string | null
  selectedQuantity: number
  selectedTicketName: string | null
  selectedTicketPrice: number | null
  
  // Reservation state
  isReserving: boolean
  isReserved: boolean
  reservationExpiry: number | null
  showReservation: boolean
  
  // Actions
  openModal: () => void
  closeModal: () => void
  setSelectedTicket: (ticketTypeId: string, quantity: number, name: string, price: number) => void
  startReservation: (expiryTime: number) => void
  completeReservation: () => void
  cancelReservation: () => void
  releaseTicket: () => void
  resetState: () => void
}

const useTicketStore = create<TicketState>()((set) => ({
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
  
  startReservation: (expiryTime) => set({
    reservationExpiry: expiryTime,
    showReservation: true,
    isReserving: true,
    // Keep modal open during reservation
    isModalOpen: true,
  }),
  
  completeReservation: () => set({
    isReserving: false,
    isReserved: true,
    // Modal remains open so user can proceed to checkout
  }),
  
  cancelReservation: () => set({
    isReserving: false,
    isReserved: false,
    reservationExpiry: null,
    showReservation: false,
    selectedTicketType: null,
    selectedQuantity: 0,
    selectedTicketName: null,
    selectedTicketPrice: null,
  }),
  
  releaseTicket: () => set({
    isReserving: false,
    isReserved: false,
    reservationExpiry: null,
    showReservation: false,
    selectedTicketType: null,
    selectedQuantity: 0,
    selectedTicketName: null,
    selectedTicketPrice: null,
    isModalOpen: false, // Close modal after releasing ticket
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
  })
}))

export default useTicketStore
