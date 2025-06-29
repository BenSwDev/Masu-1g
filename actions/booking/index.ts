/**
 * BOOKING ACTIONS - MAIN INDEX
 * Following ROLE OF ONE principle - centralized exports
 */

// Core CRUD operations
export {
  createBooking,
  createGuestBooking,
  updateBookingByAdmin,
  cancelBooking,
  getBookingById,
  getBookingsByUser,
  getBookingsByProfessional,
} from './booking-crud'

// Price calculation operations
export {
  calculateBookingPrice,
  calculateGuestBookingPrice,
  recalculateBookingPrice,
} from './booking-pricing'

// Professional operations
export {
  professionalMarkEnRoute,
  professionalMarkCompleted,
  assignProfessionalToBooking,
  unassignProfessionalFromBooking,
} from './booking-professional'

// Time and availability operations
export {
  getAvailableTimeSlots,
  isTimeSlotAvailable,
  checkBookingConflicts,
} from './booking-availability'

// Utility functions
export {
  toPopulatedBooking,
  constructBookingAddressSnapshot,
  validateBookingData,
} from './booking-utils'

// Abandoned booking operations
export {
  saveAbandonedBooking,
  getAbandonedBookings,
  deleteAbandonedBooking,
} from './booking-abandoned'

// Legacy exports for backward compatibility
export * from './booking-crud'
export * from './booking-pricing'
export * from './booking-professional'
export * from './booking-availability'
export * from './booking-utils'
export * from './booking-abandoned' 