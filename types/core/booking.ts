import type { Types } from 'mongoose'

/**
 * CORE BOOKING TYPES - SINGLE SOURCE OF TRUTH
 * Following ROLE OF ONE principle - one interface per concept
 */

// ============================================================================
// CORE INTERFACES - SINGLE SOURCE OF TRUTH
// ============================================================================

/**
 * Base Booking Data Structure
 * This is the canonical interface used throughout the application
 */
export interface Booking {
  _id: string
  userId?: string
  
  // Treatment Information
  treatmentId: string
  treatmentName?: string
  treatmentCategory?: string
  selectedDurationId?: string
  selectedDurationName?: string
  
  // Scheduling
  bookingDateTime: string
  isFlexibleTime: boolean
  flexibilityRangeHours?: number
  
  // Address Information
  addressId?: string
  bookingAddressSnapshot: BookingAddress
  
  // Professional Assignment
  professionalId?: string
  professionalName?: string
  therapistGenderPreference: 'male' | 'female' | 'any'
  suitableProfessionals?: BookingProfessional[]
  
  // Pricing
  priceDetails: BookingPriceDetails
  staticTreatmentPrice?: number
  staticTherapistPay?: number
  staticTimeSurcharge?: number
  staticTimeSurchargeReason?: string
  staticTherapistPayExtra?: number
  companyFee?: number
  
  // Payment
  paymentDetails: BookingPaymentDetails
  enhancedPaymentDetails?: BookingEnhancedPaymentDetails
  
  // Gift Information
  isGift: boolean
  giftGreeting?: string
  giftSendWhen?: 'now' | string
  giftHidePrice?: boolean
  
  // Status & Workflow
  status: BookingStatus
  step?: number
  
  // Guest Information (for non-user bookings)
  guestInfo?: BookingGuestInfo
  
  // Consents & Preferences
  consents?: BookingConsents
  
  // Communication
  notificationPreferences: BookingNotificationPreferences
  
  // Review
  review?: BookingReview
  
  // Administrative
  notes?: string
  internalNotes?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Booking Address Information
 */
export interface BookingAddress {
  fullAddress: string
  city: string
  street: string
  streetNumber?: string
  apartment?: string
  entrance?: string
  floor?: string
  notes?: string
  doorName?: string
  buildingName?: string
  hotelName?: string
  roomNumber?: string
  otherInstructions?: string
  hasPrivateParking?: boolean
}

/**
 * Booking Professional Information
 */
export interface BookingProfessional {
  professionalId: string
  name: string
  email: string
  phone?: string
  gender?: string
  profileId: string
  calculatedAt: string
}

/**
 * Booking Price Details
 */
export interface BookingPriceDetails {
  basePrice: number
  timeSurcharge?: number
  timeSurchargeReason?: string
  therapistPay: number
  therapistPayExtra?: number
  companyFee: number
  discount?: number
  discountReason?: string
  totalPrice: number
  currency: string
}

/**
 * Booking Payment Details
 */
export interface BookingPaymentDetails {
  method: 'cash' | 'card' | 'bank_transfer' | 'gift_voucher' | 'subscription'
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial'
  amount: number
  currency: string
  transactionId?: string
  paymentMethodId?: string
  appliedCouponCode?: string
  appliedGiftVoucherId?: string
  redeemedSubscriptionId?: string
}

/**
 * Enhanced Payment Details
 */
export interface BookingEnhancedPaymentDetails {
  cardLast4?: string
  cardBrand?: string
  paymentGateway?: string
  gatewayTransactionId?: string
  refundDetails?: {
    amount: number
    reason: string
    processedAt: string
    refundId: string
  }[]
}

/**
 * Booking Status Enum
 */
export type BookingStatus =
  | 'pending_payment'
  | 'in_process'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'no_show'

/**
 * Guest Information for Bookings
 */
export interface BookingGuestInfo {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate?: string
  gender?: 'male' | 'female' | 'other'
  isBookingForSomeoneElse?: boolean
  recipientFirstName?: string
  recipientLastName?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientBirthDate?: string
  recipientGender?: 'male' | 'female' | 'other'
}

/**
 * Booking Consents
 */
export interface BookingConsents {
  termsOfService: boolean
  privacyPolicy: boolean
  marketingEmails?: boolean
  marketingSms?: boolean
  dataProcessing: boolean
  consentDate: string
}

/**
 * Booking Notification Preferences
 */
export interface BookingNotificationPreferences {
  bookerMethod: 'email' | 'sms' | 'both' | 'none'
  bookerLanguage: 'he' | 'en' | 'ru'
  recipientMethod?: 'email' | 'sms' | 'both' | 'none'
  recipientLanguage?: 'he' | 'en' | 'ru'
}

/**
 * Booking Review
 */
export interface BookingReview {
  rating: number
  comment?: string
  reviewDate: string
  isPublic: boolean
}

// ============================================================================
// DATABASE INTERFACES
// ============================================================================

/**
 * MongoDB Document Interface for Bookings
 * Only for internal database operations
 */
export interface IBookingDocument {
  _id: Types.ObjectId
  userId?: Types.ObjectId
  
  treatmentId: Types.ObjectId
  treatmentCategory?: Types.ObjectId
  selectedDurationId?: Types.ObjectId
  
  bookingDateTime: Date
  isFlexibleTime: boolean
  flexibilityRangeHours?: number
  
  addressId?: Types.ObjectId
  bookingAddressSnapshot: BookingAddress
  
  professionalId?: Types.ObjectId
  therapistGenderPreference: 'male' | 'female' | 'any'
  suitableProfessionals?: Array<{
    professionalId: Types.ObjectId
    name: string
    email: string
    phone?: string
    gender?: string
    profileId: Types.ObjectId
    calculatedAt: Date
  }>
  
  priceDetails: BookingPriceDetails
  staticTreatmentPrice?: number
  staticTherapistPay?: number
  staticTimeSurcharge?: number
  staticTimeSurchargeReason?: string
  staticTherapistPayExtra?: number
  companyFee?: number
  
  paymentDetails: BookingPaymentDetails
  enhancedPaymentDetails?: BookingEnhancedPaymentDetails
  
  isGift: boolean
  giftGreeting?: string
  giftSendWhen?: 'now' | Date
  giftHidePrice?: boolean
  
  status: BookingStatus
  step?: number
  
  guestInfo?: BookingGuestInfo
  consents?: BookingConsents
  notificationPreferences: BookingNotificationPreferences
  review?: BookingReview
  
  notes?: string
  internalNotes?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// FORM & INPUT INTERFACES
// ============================================================================

/**
 * Booking Creation Form Data
 */
export interface BookingCreateForm {
  // Customer Information
  customerType: 'guest' | 'existing'
  guestInfo?: BookingGuestInfo
  existingCustomerId?: string
  
  // Treatment Selection
  treatmentId: string
  selectedDurationId?: string
  
  // Scheduling
  bookingDateTime: string
  isFlexibleTime: boolean
  flexibilityRangeHours?: number
  therapistGenderPreference: 'male' | 'female' | 'any'
  
  // Address
  addressType: 'existing' | 'custom'
  addressId?: string
  customAddress?: BookingAddress
  
  // Payment
  paymentType: 'immediate' | 'cash' | 'invoice'
  paymentMethodId?: string
  appliedCouponCode?: string
  appliedGiftVoucherId?: string
  redeemedSubscriptionId?: string
  
  // Additional
  notes?: string
  notificationPreferences: BookingNotificationPreferences
  consents?: BookingConsents
}

/**
 * Booking Update Form Data
 */
export interface BookingUpdateForm {
  bookingDateTime?: string
  professionalId?: string
  status?: BookingStatus
  notes?: string
  internalNotes?: string
  paymentDetails?: Partial<BookingPaymentDetails>
}

/**
 * Guest Booking Wizard Data
 */
export interface BookingWizardData {
  step: number
  treatmentId?: string
  selectedDurationId?: string
  bookingDateTime?: string
  addressData?: BookingAddress
  guestInfo?: BookingGuestInfo
  paymentData?: Partial<BookingPaymentDetails>
  notificationPreferences?: BookingNotificationPreferences
}

// ============================================================================
// QUERY & FILTER INTERFACES
// ============================================================================

/**
 * Booking Query Filters
 */
export interface BookingFilters {
  status?: BookingStatus[]
  userId?: string
  professionalId?: string
  treatmentId?: string
  city?: string
  dateFrom?: string
  dateTo?: string
  isGift?: boolean
  paymentStatus?: string[]
  search?: string
}

/**
 * Booking List Options
 */
export interface BookingListOptions {
  page?: number
  limit?: number
  sortBy?: 'bookingDateTime' | 'createdAt' | 'status' | 'totalPrice'
  sortOrder?: 'asc' | 'desc'
  filters?: BookingFilters
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

/**
 * Booking API Response
 */
export interface BookingResponse {
  success: boolean
  booking?: Booking
  error?: string
}

/**
 * Booking List API Response
 */
export interface BookingListResponse {
  success: boolean
  bookings?: Booking[]
  total?: number
  page?: number
  limit?: number
  error?: string
}

/**
 * Booking Creation Response
 */
export interface BookingCreateResponse {
  success: boolean
  bookingId?: string
  booking?: Booking
  paymentUrl?: string
  error?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Booking Summary (for display in lists)
 */
export type BookingSummary = Pick<
  Booking,
  | '_id'
  | 'bookingDateTime'
  | 'treatmentName'
  | 'status'
  | 'professionalName'
  | 'priceDetails'
  | 'isGift'
  | 'createdAt'
>

/**
 * Booking Details (for detailed views)
 */
export type BookingDetails = Booking & {
  treatmentDetails?: {
    name: string
    description?: string
    category: string
    duration: number
    basePrice: number
  }
  professionalDetails?: {
    name: string
    email: string
    phone?: string
    rating?: number
    profileImage?: string
  }
  customerDetails?: {
    name: string
    email: string
    phone: string
    totalBookings?: number
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if booking can be cancelled
 */
export function canCancelBooking(booking: Booking): boolean {
  const bookingTime = new Date(booking.bookingDateTime)
  const now = new Date()
  const hoursDifference = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  return (
    ['pending_payment', 'in_process', 'confirmed'].includes(booking.status) &&
    hoursDifference >= 24 // At least 24 hours before booking
  )
}

/**
 * Check if booking can be rescheduled
 */
export function canRescheduleBooking(booking: Booking): boolean {
  const bookingTime = new Date(booking.bookingDateTime)
  const now = new Date()
  const hoursDifference = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  return (
    ['in_process', 'confirmed'].includes(booking.status) &&
    hoursDifference >= 12 // At least 12 hours before booking
  )
}

/**
 * Check if booking requires payment
 */
export function requiresPayment(booking: Booking): boolean {
  return (
    booking.status === 'pending_payment' ||
    booking.paymentDetails.status === 'pending' ||
    booking.paymentDetails.status === 'failed'
  )
}

/**
 * Get booking display status
 */
export function getBookingDisplayStatus(booking: Booking): string {
  if (booking.status === 'pending_payment') return 'ממתין לתשלום'
  if (booking.status === 'in_process') return 'בעיבוד'
  if (booking.status === 'confirmed') return 'מאושר'
  if (booking.status === 'completed') return 'הושלם'
  if (booking.status === 'cancelled') return 'בוטל'
  if (booking.status === 'refunded') return 'הוחזר'
  if (booking.status === 'no_show') return 'לא הגיע'
  return booking.status
} 