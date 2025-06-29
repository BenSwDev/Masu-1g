/**
 * CORE TYPES INDEX - SINGLE SOURCE OF TRUTH
 * Following ROLE OF ONE principle - centralized type exports
 */

// ============================================================================
// GIFT VOUCHER TYPES
// ============================================================================
export type {
  // Core Interface
  GiftVoucher,
  GiftVoucherGuestInfo,
  GiftVoucherStatus,
  GiftVoucherUsage,
  
  // Database Interface
  IGiftVoucherDocument,
  
  // Form Interfaces
  GiftVoucherCreateForm,
  GiftVoucherUpdateForm,
  GiftVoucherPurchaseData,
  GiftVoucherPaymentResult,
  GiftVoucherRedemption,
  
  // Query Interfaces
  GiftVoucherFilters,
  GiftVoucherListOptions,
  
  // Response Interfaces
  GiftVoucherResponse,
  GiftVoucherListResponse,
  
  // Utility Types
  GiftVoucherSummary,
  GiftVoucherDetails,
} from './gift-voucher'

export {
  // Validation Functions
  isGiftVoucherValid,
  canRedeemGiftVoucher,
} from './gift-voucher'

// ============================================================================
// BOOKING TYPES
// ============================================================================
export type {
  // Core Interface
  Booking,
  BookingAddress,
  BookingProfessional,
  BookingPriceDetails,
  BookingPaymentDetails,
  BookingEnhancedPaymentDetails,
  BookingStatus,
  BookingGuestInfo,
  BookingConsents,
  BookingNotificationPreferences,
  BookingReview,
  
  // Database Interface
  IBookingDocument,
  
  // Form Interfaces
  BookingCreateForm,
  BookingUpdateForm,
  BookingWizardData,
  
  // Query Interfaces
  BookingFilters,
  BookingListOptions,
  
  // Response Interfaces
  BookingResponse,
  BookingListResponse,
  BookingCreateResponse,
  
  // Utility Types
  BookingSummary,
  BookingDetails,
} from './booking'

export {
  // Validation Functions
  canCancelBooking,
  canRescheduleBooking,
  requiresPayment,
  getBookingDisplayStatus,
} from './booking'

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Common API Response Structure
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Common List Response Structure
 */
export interface ListResponse<T = any> {
  success: boolean
  data?: T[]
  total?: number
  page?: number
  limit?: number
  error?: string
}

/**
 * Common Pagination Options
 */
export interface PaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Common Filter Base
 */
export interface BaseFilters {
  search?: string
  createdFrom?: string
  createdTo?: string
  updatedFrom?: string
  updatedTo?: string
}

/**
 * Common Status Types
 */
export type CommonStatus = 'active' | 'inactive' | 'pending' | 'cancelled'

/**
 * Common Gender Type
 */
export type Gender = 'male' | 'female' | 'other'

/**
 * Common Language Type
 */
export type Language = 'he' | 'en' | 'ru'

/**
 * Common Notification Method Type
 */
export type NotificationMethod = 'email' | 'sms' | 'both' | 'none'

/**
 * Common Currency Type
 */
export type Currency = 'ILS' | 'USD' | 'EUR'

/**
 * Common Phone Number Format
 */
export type PhoneNumber = string // Format: +972-XX-XXXXXXX

/**
 * Common Email Format
 */
export type Email = string // Format: validated email address

/**
 * Common Date String Format
 */
export type DateString = string // ISO 8601 format

/**
 * Common ID Type
 */
export type ID = string

/**
 * MongoDB ObjectId Type
 */
export type ObjectId = string

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Type guard to check if value is defined
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null
}

/**
 * Type guard to check if string is not empty
 */
export function isNonEmptyString(value: string | undefined | null): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Type guard to check if array is not empty
 */
export function isNonEmptyArray<T>(value: T[] | undefined | null): value is T[] {
  return Array.isArray(value) && value.length > 0
}

/**
 * Format date to display string
 */
export function formatDateForDisplay(date: DateString | Date): string {
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: Currency = 'ILS'): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number format (Israeli)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+972|0)(5[0-9]|7[2-9])\d{7}$/
  return phoneRegex.test(phone.replace(/[-\s]/g, ''))
}

/**
 * Generate unique code
 */
export function generateUniqueCode(prefix: string = '', length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = prefix
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
} 