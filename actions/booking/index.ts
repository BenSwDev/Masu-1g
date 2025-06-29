/**
 * BOOKING ACTIONS - MAIN INDEX
 * Following ROLE OF ONE principle - centralized exports
 */

// Core CRUD operations
export {
  createBooking,
  getBookingById,
  getUserBookings,
  cancelBooking,
  updateBookingByAdmin,
  getAllBookings,
} from './booking-crud'

// Price calculation operations
export {
  calculateBookingPrice,
  calculateGuestBookingPrice,
  recalculateBookingPrice,
} from './booking-pricing'

// Professional operations
export {
  findAvailableProfessionals,
  assignProfessionalToBooking,
  unassignProfessionalFromBooking,
  getProfessionalBookings,
  updateProfessionalStatus,
} from './booking-professional'

// Time and availability operations
export {
  getAvailableTimeSlots,
  isTimeSlotAvailable,
  checkBookingConflicts,
  generateTimeSlots,
  filterAvailableSlots,
} from './booking-availability'

// Utility functions
export {
  constructFullAddressHelper,
  getNextSequenceValue,
  formatTimeSlot,
  formatDuration,
  isBookingEditable,
} from './booking-utils'

// Abandoned booking operations
export {
  saveAbandonedBooking,
  getAbandonedBookings,
  deleteAbandonedBooking,
} from './booking-abandoned'

// Legacy exports for backward compatibility - all functions from individual modules
export * from './booking-crud'
export * from './booking-pricing'
export * from './booking-professional'
export * from './booking-availability'
export * from './booking-utils'
export * from './booking-abandoned' 