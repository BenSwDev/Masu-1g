import type { Types } from 'mongoose'

/**
 * CORE GIFT VOUCHER TYPES - SINGLE SOURCE OF TRUTH
 * Following ROLE OF ONE principle - one interface per concept
 */

// ============================================================================
// CORE INTERFACES - SINGLE SOURCE OF TRUTH
// ============================================================================

/**
 * Base Gift Voucher Data Structure
 * This is the canonical interface used throughout the application
 */
export interface GiftVoucher {
  _id: string
  code: string
  voucherType: 'treatment' | 'monetary'
  amount: number // Primary value of the voucher
  
  // Treatment-specific fields
  treatmentId?: string
  treatmentName?: string
  selectedDurationId?: string
  selectedDurationName?: string
  
  // Monetary-specific fields
  monetaryValue?: number
  originalAmount?: number
  remainingAmount?: number
  
  // Ownership & User Information
  purchaserUserId?: string
  purchaserName?: string
  ownerUserId?: string
  ownerName?: string
  
  // Guest Information (for non-user purchases)
  guestInfo?: GiftVoucherGuestInfo
  
  // Gift Information
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  greetingMessage?: string
  sendDate?: string
  
  // Status & Lifecycle
  status: GiftVoucherStatus
  purchaseDate: string
  validFrom: string
  validUntil: string
  isActive: boolean
  
  // Payment Information
  paymentId?: string
  paymentAmount?: number
  paymentMethodId?: string
  transactionId?: string
  
  // Usage Tracking
  usageHistory: GiftVoucherUsage[]
  
  // Administrative
  notes?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Guest Information for Gift Vouchers
 */
export interface GiftVoucherGuestInfo {
  name: string
  email: string
  phone: string
}

/**
 * Gift Voucher Status Enum
 */
export type GiftVoucherStatus =
  | 'pending_payment'
  | 'active'
  | 'partially_used'
  | 'fully_used'
  | 'expired'
  | 'pending_send'
  | 'sent'
  | 'cancelled'

/**
 * Gift Voucher Usage History Entry
 */
export interface GiftVoucherUsage {
  date: string
  amountUsed: number
  orderId?: string
  description?: string
}

// ============================================================================
// DATABASE INTERFACES
// ============================================================================

/**
 * MongoDB Document Interface for Gift Vouchers
 * Only for internal database operations
 */
export interface IGiftVoucherDocument {
  _id: Types.ObjectId
  code: string
  voucherType: 'treatment' | 'monetary'
  amount: number
  
  treatmentId?: Types.ObjectId
  selectedDurationId?: Types.ObjectId
  monetaryValue?: number
  originalAmount?: number
  remainingAmount?: number
  
  purchaserUserId?: Types.ObjectId
  ownerUserId?: Types.ObjectId
  guestInfo?: GiftVoucherGuestInfo
  
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  greetingMessage?: string
  sendDate?: Date
  
  status: GiftVoucherStatus
  purchaseDate: Date
  validFrom: Date
  validUntil: Date
  
  paymentId?: string
  paymentAmount?: number
  paymentMethodId?: string
  transactionId?: string
  notes?: string
  
  usageHistory: Array<{
    date: Date
    amountUsed: number
    orderId?: Types.ObjectId
    description?: string
    userId?: Types.ObjectId
  }>
  
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// FORM & INPUT INTERFACES
// ============================================================================

/**
 * Gift Voucher Creation Form Data
 */
export interface GiftVoucherCreateForm {
  voucherType: 'treatment' | 'monetary'
  treatmentId?: string
  selectedDurationId?: string
  amount?: number
  monetaryValue?: number
  ownerUserId?: string
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  greetingMessage?: string
  validFrom: string
  validUntil: string
  notes?: string
}

/**
 * Gift Voucher Update Form Data
 */
export interface GiftVoucherUpdateForm extends Partial<GiftVoucherCreateForm> {
  status?: GiftVoucherStatus
}

/**
 * Gift Voucher Purchase Initiation Data
 */
export interface GiftVoucherPurchaseData {
  voucherType: 'treatment' | 'monetary'
  treatmentId?: string
  selectedDurationId?: string
  monetaryValue?: number
  recipientName: string
  recipientPhone: string
  recipientEmail?: string
  greetingMessage?: string
  sendDate?: string
  guestInfo?: GiftVoucherGuestInfo
}

/**
 * Gift Voucher Payment Result Data
 */
export interface GiftVoucherPaymentResult {
  voucherId: string
  paymentId: string
  success: boolean
  amount: number
  transactionId?: string
  paymentMethodId?: string
}

/**
 * Gift Voucher Redemption Data
 */
export interface GiftVoucherRedemption {
  code: string
  orderDetails: {
    orderId?: string
    totalAmount: number
    items?: Array<{ name: string; price: number }>
  }
}

// ============================================================================
// QUERY & FILTER INTERFACES
// ============================================================================

/**
 * Gift Voucher Query Filters
 */
export interface GiftVoucherFilters {
  status?: GiftVoucherStatus[]
  voucherType?: ('treatment' | 'monetary')[]
  ownerUserId?: string
  purchaserUserId?: string
  validFrom?: string
  validUntil?: string
  isActive?: boolean
  search?: string
}

/**
 * Gift Voucher List Options
 */
export interface GiftVoucherListOptions {
  page?: number
  limit?: number
  sortBy?: 'purchaseDate' | 'validUntil' | 'amount' | 'status'
  sortOrder?: 'asc' | 'desc'
  filters?: GiftVoucherFilters
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

/**
 * Gift Voucher API Response
 */
export interface GiftVoucherResponse {
  success: boolean
  voucher?: GiftVoucher
  error?: string
}

/**
 * Gift Voucher List API Response
 */
export interface GiftVoucherListResponse {
  success: boolean
  vouchers?: GiftVoucher[]
  total?: number
  page?: number
  limit?: number
  error?: string
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Gift Voucher Summary (for display in lists)
 */
export type GiftVoucherSummary = Pick<
  GiftVoucher,
  | '_id'
  | 'code'
  | 'voucherType'
  | 'amount'
  | 'status'
  | 'validUntil'
  | 'isActive'
  | 'ownerName'
  | 'treatmentName'
>

/**
 * Gift Voucher Details (for detailed views)
 */
export type GiftVoucherDetails = Omit<GiftVoucher, 'usageHistory'> & {
  usageHistory: GiftVoucherUsage[]
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if gift voucher is valid for use
 */
export function isGiftVoucherValid(voucher: GiftVoucher): boolean {
  const now = new Date()
  const validFrom = new Date(voucher.validFrom)
  const validUntil = new Date(voucher.validUntil)
  
  return (
    voucher.isActive &&
    voucher.status === 'active' &&
    now >= validFrom &&
    now <= validUntil &&
    (voucher.voucherType === 'monetary' ? (voucher.remainingAmount || 0) > 0 : true)
  )
}

/**
 * Check if gift voucher can be redeemed
 */
export function canRedeemGiftVoucher(voucher: GiftVoucher, amount: number): boolean {
  if (!isGiftVoucherValid(voucher)) return false
  
  if (voucher.voucherType === 'monetary') {
    return (voucher.remainingAmount || 0) >= amount
  }
  
  return true // Treatment vouchers can always be redeemed if valid
} 