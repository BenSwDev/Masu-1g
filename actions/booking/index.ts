/**
 * BOOKING ACTIONS - MAIN INDEX
 * Following ROLE OF ONE principle - centralized exports
 *
 * This file serves as the single entry point for all booking-related operations.
 * All functions are organized into focused modules by responsibility.
 */

// Core CRUD operations
export {
  createBooking,
  getBookingById,
  getUserBookings,
  cancelBooking,
  updateBookingByAdmin,
  getAllBookings,
} from "./booking-crud"

// Guest booking operations
export {
  createGuestBooking,
  getGuestBookingInitialData,
  createGuestUser,
  validateRedemptionCode,
} from "./booking-guest"

// Abandoned booking operations
export {
  saveAbandonedBooking,
  getAbandonedBooking,
  deleteAbandonedBooking,
  getAbandonedBookings,
  updateAbandonedBooking,
  hasAbandonedBookings,
  getAbandonedBookingStats,
} from "./booking-abandoned"

// Special operations and legacy functions
export {
  getBookingInitialData,
  updateBookingStatusAfterPayment,
  professionalAcceptBooking,
  findSuitableProfessionals,
  getSuitableProfessionalsForBooking,
  sendNotificationToSuitableProfessionals,
  getAvailableProfessionals,
} from "./booking-special"

// Price calculation operations
export {
  calculateBookingPrice,
  calculateGuestBookingPrice,
  recalculateBookingPrice,
} from "./booking-pricing"

// Professional operations
export {
  findAvailableProfessionals,
  assignProfessionalToBooking,
  unassignProfessionalFromBooking,
  getProfessionalBookings,
  updateProfessionalStatus,
} from "./booking-professional"

// Time and availability operations
export {
  getAvailableTimeSlots,
  isTimeSlotAvailable,
  checkBookingConflicts,
  generateTimeSlots,
  filterAvailableSlots,
} from "./booking-availability"

// Utility functions
export {
  constructFullAddressHelper,
  getNextSequenceValue,
  formatTimeSlot,
  formatDuration,
  isBookingEditable,
} from "./booking-utils"

// Legacy exports for backward compatibility - all functions from individual modules
export * from "./booking-crud"
export * from "./booking-guest"
export * from "./booking-abandoned"
export * from "./booking-special"
export * from "./booking-pricing"
export * from "./booking-professional"
export * from "./booking-availability"
export * from "./booking-utils"
