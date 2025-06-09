export type TransactionType = 'booking' | 'subscription' | 'gift_voucher'
export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'expired' | 'active' | 'partially_used' | 'fully_used'

export interface PurchaseTransaction {
  id: string
  type: TransactionType
  date: Date
  amount: number
  finalAmount?: number // For bookings with discounts
  status: TransactionStatus
  description: string
  details: BookingDetails | SubscriptionDetails | GiftVoucherDetails
}

export interface BookingDetails {
  bookingNumber: string
  treatmentName: string
  professionalName?: string
  dateTime: Date
  clientName: string
  source: 'new_purchase' | 'subscription_redemption' | 'gift_voucher_redemption'
  priceDetails: {
    basePrice: number
    finalAmount: number
    isFullyCoveredByVoucherOrSubscription: boolean
    appliedDiscounts?: number
    appliedVouchers?: number
  }
  paymentStatus: 'pending' | 'paid' | 'failed' | 'not_required'
}

export interface SubscriptionDetails {
  subscriptionName: string
  treatmentName: string
  quantity: number
  bonusQuantity?: number
  usedQuantity: number
  remainingQuantity: number
  expiryDate: Date
  pricePerSession: number
  totalPaid: number
  validityMonths: number
}

export interface GiftVoucherDetails {
  code: string
  voucherType: 'treatment' | 'monetary'
  originalAmount: number
  remainingAmount: number
  treatmentName?: string
  isGift: boolean
  recipientName?: string
  recipientPhone?: string
  validUntil: Date
  usageHistory: Array<{
    date: Date
    amountUsed: number
    orderId?: string
    description: string
  }>
}

export interface CustomerSummary {
  userId: string
  customerName: string
  customerEmail: string
  customerPhone: string
  joinDate: Date
  totalSpent: number
  totalBookings: number
  activeSubscriptions: number
  activeVouchers: number
  lastActivity: Date
  statistics: {
    completedBookings: number
    cancelledBookings: number
    noShowBookings: number
    totalVouchersPurchased: number
    totalVouchersUsed: number
    totalSubscriptionsPurchased: number
    averageBookingValue: number
  }
}

export interface PurchaseFilters {
  userId?: string
  type?: TransactionType[]
  status?: TransactionStatus[]
  dateFrom?: Date
  dateTo?: Date
  amountMin?: number
  amountMax?: number
  search?: string
}

export interface PurchaseStats {
  totalTransactions: number
  totalRevenue: number
  averageTransactionValue: number
  totalCustomers: number
  newCustomersThisMonth: number
  bookingStats: {
    total: number
    completed: number
    cancelled: number
    revenue: number
  }
  subscriptionStats: {
    total: number
    active: number
    revenue: number
  }
  voucherStats: {
    total: number
    active: number
    revenue: number
    redemptionRate: number
  }
  monthlyRevenue: Array<{
    month: string
    bookings: number
    subscriptions: number
    vouchers: number
    total: number
  }>
} 