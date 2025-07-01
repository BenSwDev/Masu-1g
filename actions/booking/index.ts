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
  findSuitableProfessionals,
  getSuitableProfessionalsForBooking,
  sendNotificationToSuitableProfessionals,
} from "./booking-special"

// Price calculation operations
export {
  calculateBookingPrice,
  calculateGuestBookingPrice,
  recalculateBookingPrice,
} from "./booking-pricing"

// Booking Professional Management
export {
  getAvailableProfessionals,
  professionalAcceptBooking,
  professionalMarkEnRoute,
  professionalMarkCompleted,
  // getBookingByIdForProfessional, - function doesn't exist
} from "./booking-professional"

// Time and availability operations
export {
  getAvailableTimeSlots,
  isTimeSlotAvailable,
  checkBookingConflicts,
  generateTimeSlots,
  filterAvailableSlots,
} from "./booking-availability"

// Booking Utilities - server actions only
export {
  generateBookingNumber,
  toBookingPlain,
} from "./booking-utils"

// Import utility functions from the new helpers file
export {
  validateBookingData,
  formatTimeSlot,
  formatDuration,
  canCancelBooking,
  canRescheduleBooking,
  getBookingDisplayStatus,
  calculateBookingDuration,
  formatBookingTime,
  isBookingToday,
  getBookingTimeStatus,
  isBookingEditable,
  constructFullAddressHelper,
} from "@/lib/utils/booking-helpers"

// Legacy exports for backward compatibility - all functions from individual modules
export * from "./booking-crud"
export * from "./booking-guest"
export * from "./booking-abandoned"
export * from "./booking-special"
export * from "./booking-pricing"
export * from "./booking-professional"
export * from "./booking-availability"
export * from "./booking-utils"
