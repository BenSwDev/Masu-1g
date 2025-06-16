"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { dbConnect } from "@/lib/db/db"
import Booking from "@/lib/db/models/booking"
import UserSubscription from "@/lib/db/models/user-subscription"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import User from "@/lib/db/models/user"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import Treatment from "@/lib/db/models/treatment"
import Subscription from "@/lib/db/models/subscription"
import mongoose from "mongoose"
import type {
  PurchaseTransaction,
  CustomerSummary,
  PurchaseFilters,
  PurchaseStats,
  BookingDetails,
  SubscriptionDetails,
  GiftVoucherDetails,
  DailyTransactionStats,
} from "@/lib/types/purchase-summary"

// Helper function to handle database connection errors
async function safeDbConnect() {
  try {
    await dbConnect()
    return true
  } catch (error) {
    console.error('Database connection failed:', error)
    return false
  }
}

/**
 * Get user's purchase history (for member dashboard)
 */
export async function getUserPurchaseHistory(
  page = 1,
  limit = 10,
  filters?: Partial<PurchaseFilters>
): Promise<{
  success: boolean
  data?: {
    transactions: PurchaseTransaction[]
    totalCount: number
    totalPages: number
    currentPage: number
  }
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" }
    }

    const isConnected = await safeDbConnect()
    if (!isConnected) {
      return { success: false, error: "Database connection failed" }
    }

    // For member users, use session user id
    const targetUserId = new mongoose.Types.ObjectId(session.user.id)
    const skip = (page - 1) * limit
    const allTransactions: PurchaseTransaction[] = []

    // Get bookings
    if (!filters?.type || filters.type.includes('booking')) {
      const bookings = await Booking.find({ userId: targetUserId })
        .populate('treatmentId', 'name')
        .populate('professionalId', 'name')
        .sort({ bookingDateTime: -1 })
        .lean()

      for (const booking of bookings) {
        const bookingDetails: BookingDetails = {
          bookingNumber: booking.bookingNumber,
          treatmentName: (booking.treatmentId as any)?.name || 'Unknown Treatment',
          professionalName: (booking.professionalId as any)?.name,
          dateTime: booking.bookingDateTime,
          clientName: booking.recipientName || booking.bookedByUserName || 'Unknown Client',
          source: booking.source,
          priceDetails: {
            basePrice: booking.priceDetails.basePrice || 0,
            finalAmount: booking.priceDetails.finalAmount || 0,
            isFullyCoveredByVoucherOrSubscription: booking.priceDetails.isFullyCoveredByVoucherOrSubscription || false,
            appliedDiscounts: booking.priceDetails.discountAmount || 0,
            appliedVouchers: booking.priceDetails.voucherAppliedAmount || 0,
          },
          paymentStatus: booking.paymentDetails.paymentStatus,
        }

        allTransactions.push({
          id: booking._id.toString(),
          type: 'booking',
          date: booking.bookingDateTime,
          amount: booking.priceDetails.basePrice || 0,
          finalAmount: booking.priceDetails.finalAmount || 0,
          status: booking.status === 'completed' ? 'completed' : 
                 booking.status === 'cancelled_by_user' || booking.status === 'cancelled_by_admin' ? 'cancelled' : 'pending',
          description: `הזמנת ${(booking.treatmentId as any)?.name || 'טיפול'}`,
          details: bookingDetails,
        })
      }
    }

    // Get subscriptions
    if (!filters?.type || filters.type.includes('subscription')) {
      const userSubscriptions = await UserSubscription.find({ userId: targetUserId })
        .populate('subscriptionId', 'name')
        .populate('treatmentId', 'name')
        .sort({ purchaseDate: -1 })
        .lean()

      for (const userSub of userSubscriptions) {
        const subscriptionDetails: SubscriptionDetails = {
          subscriptionName: (userSub.subscriptionId as any)?.name || 'Unknown Subscription',
          treatmentName: (userSub.treatmentId as any)?.name || 'Unknown Treatment',
          quantity: userSub.totalQuantity || 0,
          bonusQuantity: 0,
          usedQuantity: (userSub.totalQuantity || 0) - (userSub.remainingQuantity || 0),
          remainingQuantity: userSub.remainingQuantity || 0,
          expiryDate: userSub.expiryDate,
          pricePerSession: userSub.pricePerSession || 0,
          totalPaid: userSub.paymentAmount || 0,
          validityMonths: 0,
        }

        allTransactions.push({
          id: userSub._id.toString(),
          type: 'subscription',
          date: userSub.purchaseDate,
          amount: userSub.paymentAmount || 0,
          finalAmount: userSub.paymentAmount || 0,
          status: userSub.remainingQuantity > 0 && userSub.expiryDate > new Date() ? 'active' : 'expired',
          description: `מנוי ${(userSub.subscriptionId as any)?.name || 'לא ידוע'}`,
          details: subscriptionDetails,
        })
      }
    }

    // Get gift vouchers
    if (!filters?.type || filters.type.includes('gift_voucher')) {
      const vouchers = await GiftVoucher.find({ 
        $or: [
          { purchaserUserId: targetUserId },
          { ownerUserId: targetUserId }
        ]
      })
        .populate('treatmentId', 'name')
        .sort({ purchaseDate: -1 })
        .lean()

      for (const voucher of vouchers) {
        const voucherDetails: GiftVoucherDetails = {
          code: voucher.code,
          voucherType: voucher.voucherType,
          originalAmount: voucher.originalAmount || voucher.amount,
          remainingAmount: voucher.remainingAmount || voucher.amount,
          treatmentName: voucher.voucherType === 'treatment' ? (voucher.treatmentId as any)?.name : undefined,
          isGift: voucher.isGift,
          recipientName: voucher.recipientName,
          recipientPhone: voucher.recipientPhone,
          validUntil: voucher.validUntil,
          usageHistory: voucher.usageHistory?.map(h => ({
            date: h.date,
            amountUsed: h.amountUsed,
            orderId: h.orderId?.toString(),
            description: h.description || 'שימוש בשובר',
          })) || [],
        }

        allTransactions.push({
          id: voucher._id.toString(),
          type: 'gift_voucher',
          date: voucher.purchaseDate,
          amount: voucher.amount,
          finalAmount: voucher.amount,
          status: voucher.status === 'active' ? 'active' : 
                 voucher.status === 'partially_used' ? 'partially_used' :
                 voucher.status === 'fully_used' ? 'fully_used' : 'pending',
          description: voucher.voucherType === 'monetary' ? 
            `שובר כספי ${voucher.amount} ש״ח` : 
            `שובר טיפול ${(voucher.treatmentId as any)?.name || 'לא ידוע'}`,
          details: voucherDetails,
        })
      }
    }

    // Apply filters
    let filteredTransactions = allTransactions

    if (filters?.status && filters.status.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => filters.status!.includes(t.status))
    }

    if (filters?.dateFrom) {
      filteredTransactions = filteredTransactions.filter(t => t.date >= filters.dateFrom!)
    }

    if (filters?.dateTo) {
      filteredTransactions = filteredTransactions.filter(t => t.date <= filters.dateTo!)
    }

    if (filters?.amountMin) {
      filteredTransactions = filteredTransactions.filter(t => (t.finalAmount || t.amount) >= filters.amountMin!)
    }

    if (filters?.amountMax) {
      filteredTransactions = filteredTransactions.filter(t => (t.finalAmount || t.amount) <= filters.amountMax!)
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filteredTransactions = filteredTransactions.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        t.id.toLowerCase().includes(searchLower)
      )
    }

    // Sort by date (newest first)
    filteredTransactions.sort((a, b) => b.date.getTime() - a.date.getTime())

    const totalCount = filteredTransactions.length
    const totalPages = Math.ceil(totalCount / limit)
    const paginatedTransactions = filteredTransactions.slice(skip, skip + limit)

    return {
      success: true,
      data: {
        transactions: paginatedTransactions,
        totalCount,
        totalPages,
        currentPage: page,
      }
    }
  } catch (error) {
    console.error('Error in getUserPurchaseHistory:', error)
    return { success: false, error: "Failed to fetch purchase history" }
  }
}

/**
 * Get customer summary for admin
 */
export async function getCustomerSummary(customerId: string): Promise<{
  success: boolean
  data?: CustomerSummary
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes('admin')) {
      return { success: false, error: "Unauthorized" }
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return { success: false, error: "Invalid customer ID" }
    }

    await dbConnect()

    const userId = new mongoose.Types.ObjectId(customerId)

    // Get customer basic info
    const customer = await User.findById(userId).lean()
    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    // Get bookings
    const bookings = await Booking.find({ userId }).lean()
    const completedBookings = bookings.filter(b => b.status === 'completed')
    const cancelledBookings = bookings.filter(b => 
      b.status === 'cancelled_by_user' || b.status === 'cancelled_by_admin'
    )
    const noShowBookings = bookings.filter(b => b.status === 'no_show')

    // Get subscriptions
    const userSubscriptions = await UserSubscription.find({ userId }).lean()
    const activeSubscriptions = userSubscriptions.filter(s => 
      s.remainingQuantity > 0 && s.expiryDate > new Date()
    )

    // Get vouchers
    const vouchers = await GiftVoucher.find({ 
      $or: [{ purchaserUserId: userId }, { ownerUserId: userId }]
    }).lean()
    const activeVouchers = vouchers.filter(v => 
      v.status === 'active' || v.status === 'partially_used'
    )
    const usedVouchers = vouchers.filter(v => v.status === 'fully_used')

    // Calculate totals
    const totalBookingSpent = bookings.reduce((sum, b) => sum + b.priceDetails.finalAmount, 0)
            const totalSubscriptionSpent = userSubscriptions.reduce((sum, s) => sum + (s.paymentAmount || 0), 0)
    const totalVoucherSpent = vouchers.filter(v => v.purchaserUserId.equals(userId))
      .reduce((sum, v) => sum + v.amount, 0)
    const totalSpent = totalBookingSpent + totalSubscriptionSpent + totalVoucherSpent

    const averageBookingValue = bookings.length > 0 ? totalBookingSpent / bookings.length : 0

    // Find last activity
    const lastBooking = bookings.sort((a, b) => b.bookingDateTime.getTime() - a.bookingDateTime.getTime())[0]
    const lastSubscription = userSubscriptions.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime())[0]
    const lastVoucher = vouchers.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime())[0]
    
    const activities = [
      lastBooking?.bookingDateTime,
      lastSubscription?.purchaseDate,
      lastVoucher?.purchaseDate
    ].filter(Boolean)
    
    const lastActivity = activities.length > 0 ? 
      new Date(Math.max(...activities.map(d => d!.getTime()))) : customer.createdAt

    const customerSummary: CustomerSummary = {
      userId: customer._id.toString(),
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || '',
      joinDate: customer.createdAt,
      totalSpent,
      totalBookings: bookings.length,
      activeSubscriptions: activeSubscriptions.length,
      activeVouchers: activeVouchers.length,
      lastActivity,
      statistics: {
        completedBookings: completedBookings.length,
        cancelledBookings: cancelledBookings.length,
        noShowBookings: noShowBookings.length,
        totalVouchersPurchased: vouchers.filter(v => v.purchaserUserId.equals(userId)).length,
        totalVouchersUsed: usedVouchers.length,
        totalSubscriptionsPurchased: userSubscriptions.length,
        averageBookingValue,
      }
    }

    return { success: true, data: customerSummary }
  } catch (error) {
    console.error('Error fetching customer summary:', error)
    return { success: false, error: 'Failed to fetch customer summary' }
  }
}

/**
 * Get all customers list for admin
 */
export async function getAllCustomers(
  page = 1,
  limit = 20,
  search?: string,
  userType?: 'all' | 'guests' | 'members'
): Promise<{
  success: boolean
  data?: {
    customers: CustomerSummary[]
    totalCount: number
    totalPages: number
    currentPage: number
  }
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes('admin')) {
      return { success: false, error: "Unauthorized" }
    }

    const isConnected = await safeDbConnect()
    if (!isConnected) {
      return { success: false, error: "Database connection failed" }
    }

    const skip = (page - 1) * limit
    let userQuery: any = {}

    // Filter by user type
    if (userType === 'guests') {
      userQuery.roles = { $in: ['guest'] }
    } else if (userType === 'members') {
      userQuery.roles = { $in: ['member'] }
    } else {
      // Default: show all customers (members and guests)
      userQuery.roles = { $in: ['member', 'guest'] }
    }

    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }

    const totalCount = await User.countDocuments(userQuery)
    const users = await User.find(userQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const customers: CustomerSummary[] = []

    for (const user of users) {
      const summaryResult = await getCustomerSummary(user._id.toString())
      if (summaryResult.success && summaryResult.data) {
        // Add user type information
        const customerWithType = {
          ...summaryResult.data,
          userType: user.roles.includes('guest') ? 'guest' : 'member'
        }
        customers.push(customerWithType as CustomerSummary)
      }
    }

    return {
      success: true,
      data: {
        customers,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      }
    }
  } catch (error) {
    console.error('Error fetching all customers:', error)
    return { success: false, error: 'Failed to fetch customers' }
  }
}

/**
 * Get all purchase transactions for admin dashboard
 */
export async function getAllPurchaseTransactions(
  page = 1,
  limit = 20,
  filters?: Partial<PurchaseFilters>
): Promise<{
  success: boolean
  data?: {
    transactions: PurchaseTransaction[]
    totalCount: number
    totalPages: number
    currentPage: number
  }
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes('admin')) {
      return { success: false, error: "Unauthorized" }
    }

    const isConnected = await safeDbConnect()
    if (!isConnected) {
      return { success: false, error: "Database connection failed" }
    }

    const skip = (page - 1) * limit
    const allTransactions: PurchaseTransaction[] = []

    // Build filter query
    let userFilter: any = {}
    if (filters?.userId) {
      userFilter = { userId: new mongoose.Types.ObjectId(filters.userId) }
    }

    // Get bookings
    if (!filters?.type || filters.type.includes('booking')) {
      const bookings = await Booking.find(userFilter)
        .populate('treatmentId', 'name')
        .populate('professionalId', 'name')
        .populate('userId', 'name email phone')
        .sort({ bookingDateTime: -1 })
        .lean()

      for (const booking of bookings) {
        const bookingDetails: BookingDetails = {
          bookingNumber: booking.bookingNumber,
          treatmentName: (booking.treatmentId as any)?.name || 'Unknown Treatment',
          professionalName: (booking.professionalId as any)?.name,
          dateTime: booking.bookingDateTime,
          clientName: booking.recipientName || booking.bookedByUserName || (booking.userId as any)?.name || 'Unknown Client',
          source: booking.source,
          priceDetails: {
            basePrice: booking.priceDetails.basePrice || 0,
            finalAmount: booking.priceDetails.finalAmount || 0,
            isFullyCoveredByVoucherOrSubscription: booking.priceDetails.isFullyCoveredByVoucherOrSubscription || false,
            appliedDiscounts: booking.priceDetails.discountAmount || 0,
            appliedVouchers: booking.priceDetails.voucherAppliedAmount || 0,
          },
          paymentStatus: booking.paymentDetails.paymentStatus,
        }

        allTransactions.push({
          id: booking._id.toString(),
          type: 'booking',
          date: booking.bookingDateTime,
          amount: booking.priceDetails.basePrice || 0,
          finalAmount: booking.priceDetails.finalAmount || 0,
          status: booking.status === 'completed' ? 'completed' : 
                 booking.status === 'cancelled_by_user' || booking.status === 'cancelled_by_admin' ? 'cancelled' : 'pending',
          description: `הזמנת ${(booking.treatmentId as any)?.name || 'טיפול'}`,
          details: bookingDetails,
          customerName: (booking.userId as any)?.name || 'Unknown',
          customerEmail: (booking.userId as any)?.email,
          customerPhone: (booking.userId as any)?.phone,
        })
      }
    }

    // Get subscriptions
    if (!filters?.type || filters.type.includes('subscription')) {
      const userSubscriptions = await UserSubscription.find(userFilter)
        .populate('subscriptionId', 'name')
        .populate('treatmentId', 'name')
        .populate('userId', 'name email phone')
        .sort({ purchaseDate: -1 })
        .lean()

      for (const userSub of userSubscriptions) {
        const subscriptionDetails: SubscriptionDetails = {
          subscriptionName: (userSub.subscriptionId as any)?.name || 'Unknown Subscription',
          treatmentName: (userSub.treatmentId as any)?.name || 'Unknown Treatment',
          quantity: userSub.totalQuantity || 0,
          bonusQuantity: 0,
          usedQuantity: (userSub.totalQuantity || 0) - (userSub.remainingQuantity || 0),
          remainingQuantity: userSub.remainingQuantity || 0,
          expiryDate: userSub.expiryDate,
          pricePerSession: userSub.pricePerSession || 0,
          totalPaid: userSub.paymentAmount || 0,
          validityMonths: 0,
        }

        allTransactions.push({
          id: userSub._id.toString(),
          type: 'subscription',
          date: userSub.purchaseDate,
          amount: userSub.paymentAmount || 0,
          finalAmount: userSub.paymentAmount || 0,
          status: userSub.remainingQuantity > 0 && userSub.expiryDate > new Date() ? 'active' : 'expired',
          description: `מנוי ${(userSub.subscriptionId as any)?.name || 'לא ידוע'}`,
          details: subscriptionDetails,
          customerName: (userSub.userId as any)?.name || 'Unknown',
          customerEmail: (userSub.userId as any)?.email,
          customerPhone: (userSub.userId as any)?.phone,
        })
      }
    }

    // Get gift vouchers
    if (!filters?.type || filters.type.includes('gift_voucher')) {
      let voucherFilter: any = {}
      if (filters?.userId) {
        voucherFilter = {
          $or: [
            { purchaserUserId: new mongoose.Types.ObjectId(filters.userId) },
            { ownerUserId: new mongoose.Types.ObjectId(filters.userId) }
          ]
        }
      }

      const vouchers = await GiftVoucher.find(voucherFilter)
        .populate('treatmentId', 'name')
        .populate('purchaserUserId', 'name email phone')
        .populate('ownerUserId', 'name email phone')
        .sort({ purchaseDate: -1 })
        .lean()

      for (const voucher of vouchers) {
        const voucherDetails: GiftVoucherDetails = {
          code: voucher.code,
          voucherType: voucher.voucherType,
          originalAmount: voucher.originalAmount || voucher.amount,
          remainingAmount: voucher.remainingAmount || voucher.amount,
          treatmentName: voucher.voucherType === 'treatment' ? (voucher.treatmentId as any)?.name : undefined,
          isGift: voucher.isGift,
          recipientName: voucher.recipientName,
          recipientPhone: voucher.recipientPhone,
          validUntil: voucher.validUntil,
          usageHistory: voucher.usageHistory?.map(h => ({
            date: h.date,
            amountUsed: h.amountUsed,
            orderId: h.orderId?.toString(),
            description: h.description || 'שימוש בשובר',
          })) || [],
        }

        const customerData = voucher.purchaserUserId || voucher.ownerUserId
        allTransactions.push({
          id: voucher._id.toString(),
          type: 'gift_voucher',
          date: voucher.purchaseDate,
          amount: voucher.amount,
          finalAmount: voucher.amount,
          status: voucher.status === 'active' ? 'active' : 
                 voucher.status === 'partially_used' ? 'partially_used' :
                 voucher.status === 'fully_used' ? 'fully_used' : 'pending',
          description: voucher.voucherType === 'monetary' ? 
            `שובר כספי ${voucher.amount} ש״ח` : 
            `שובר טיפול ${(voucher.treatmentId as any)?.name || 'לא ידוע'}`,
          details: voucherDetails,
          customerName: (customerData as any)?.name || 'Unknown',
          customerEmail: (customerData as any)?.email,
          customerPhone: (customerData as any)?.phone,
        })
      }
    }

    // Apply filters
    let filteredTransactions = allTransactions

    if (filters?.status && filters.status.length > 0) {
      filteredTransactions = filteredTransactions.filter(t => filters.status!.includes(t.status))
    }

    if (filters?.dateFrom) {
      filteredTransactions = filteredTransactions.filter(t => t.date >= filters.dateFrom!)
    }

    if (filters?.dateTo) {
      filteredTransactions = filteredTransactions.filter(t => t.date <= filters.dateTo!)
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      filteredTransactions = filteredTransactions.filter(t => 
        t.description.toLowerCase().includes(searchLower) ||
        t.customerName?.toLowerCase().includes(searchLower) ||
        t.customerEmail?.toLowerCase().includes(searchLower) ||
        t.customerPhone?.includes(filters.search!)
      )
    }

    // Sort by date descending
    filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Paginate
    const totalCount = filteredTransactions.length
    const totalPages = Math.ceil(totalCount / limit)
    const paginatedTransactions = filteredTransactions.slice(skip, skip + limit)

    return {
      success: true,
      data: {
        transactions: paginatedTransactions,
        totalCount,
        totalPages,
        currentPage: page,
      }
    }
  } catch (error) {
    console.error('Error fetching all purchase transactions:', error)
    return { success: false, error: 'Failed to fetch transactions' }
  }
}

/**
 * Get purchase statistics for admin dashboard
 */
export async function getPurchaseStats(): Promise<{
  success: boolean
  data?: PurchaseStats
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes('admin')) {
      return { success: false, error: "Unauthorized" }
    }

    const isConnected = await safeDbConnect()
    if (!isConnected) {
      return { success: false, error: "Database connection failed" }
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Get all data
    const allBookings = await Booking.find({}).lean()
    const allSubscriptions = await UserSubscription.find({}).lean()
    const allVouchers = await GiftVoucher.find({}).lean()
    const allUsers = await User.find({ roles: { $in: ['member'] } }).lean()

    // Calculate booking stats
    const completedBookings = allBookings.filter(b => b.status === 'completed')
    const cancelledBookings = allBookings.filter(b => 
      b.status === 'cancelled_by_user' || b.status === 'cancelled_by_admin'
    )
    const bookingRevenue = completedBookings.reduce((sum, b) => sum + b.priceDetails.finalAmount, 0)

    // Calculate subscription stats
    const activeSubscriptions = allSubscriptions.filter(s => 
      s.remainingQuantity > 0 && s.expiryDate > now
    )
    const subscriptionRevenue = allSubscriptions.reduce((sum, s) => sum + (s.paymentAmount || 0), 0)

    // Calculate voucher stats
    const activeVouchers = allVouchers.filter(v => 
      v.status === 'active' || v.status === 'partially_used'
    )
    const voucherRevenue = allVouchers.reduce((sum, v) => sum + v.amount, 0)
    const usedVouchers = allVouchers.filter(v => v.status === 'fully_used')
    const redemptionRate = allVouchers.length > 0 ? (usedVouchers.length / allVouchers.length) * 100 : 0

    // Calculate totals
    const totalTransactions = allBookings.length + allSubscriptions.length + allVouchers.length
    const totalRevenue = bookingRevenue + subscriptionRevenue + voucherRevenue
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // New customers this month
    const newCustomersThisMonth = allUsers.filter(u => u.createdAt >= startOfMonth).length

    // Monthly revenue for chart (last 12 months)
    const monthlyRevenue = []
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthBookings = allBookings.filter(b => 
        b.bookingDateTime >= monthStart && b.bookingDateTime <= monthEnd && b.status === 'completed'
      ).reduce((sum, b) => sum + b.priceDetails.finalAmount, 0)
      
      const monthSubscriptions = allSubscriptions.filter(s => 
        s.purchaseDate >= monthStart && s.purchaseDate <= monthEnd
      ).reduce((sum, s) => sum + (s.paymentAmount || 0), 0)
      
      const monthVouchers = allVouchers.filter(v => 
        v.purchaseDate >= monthStart && v.purchaseDate <= monthEnd
      ).reduce((sum, v) => sum + v.amount, 0)

      monthlyRevenue.push({
        month: monthStart.toLocaleString('he-IL', { month: 'short', year: 'numeric' }),
        bookings: monthBookings,
        subscriptions: monthSubscriptions,
        vouchers: monthVouchers,
        total: monthBookings + monthSubscriptions + monthVouchers,
      })
    }

    const stats: PurchaseStats = {
      totalTransactions,
      totalRevenue,
      averageTransactionValue,
      totalCustomers: allUsers.length,
      newCustomersThisMonth,
      bookingStats: {
        total: allBookings.length,
        completed: completedBookings.length,
        cancelled: cancelledBookings.length,
        revenue: bookingRevenue,
      },
      subscriptionStats: {
        total: allSubscriptions.length,
        active: activeSubscriptions.length,
        revenue: subscriptionRevenue,
      },
      voucherStats: {
        total: allVouchers.length,
        active: activeVouchers.length,
        revenue: voucherRevenue,
        redemptionRate,
      },
      monthlyRevenue,
    }

    return { success: true, data: stats }
  } catch (error) {
    console.error('Error fetching purchase stats:', error)
    return { success: false, error: 'Failed to fetch purchase statistics' }
  }
}

// Weekly transaction summary for admin dashboard
export async function getWeeklyAdminTransactionStats() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes('admin')) {
      return { success: false, error: "Unauthorized" }
    }

    const isConnected = await safeDbConnect()
    if (!isConnected) {
      return { success: false, error: "Database connection failed" }
    }

    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - start.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 7)

    const days: Record<string, any> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      days[key] = {
        date: key,
        bookings: 0,
        subscriptionPurchases: 0,
        subscriptionRedemptions: 0,
        voucherUsages: 0,
        penalties: 0,
        credits: 0,
        couponUsages: 0,
      }
    }

    const bookings = await Booking.find({
      bookingDateTime: { $gte: start, $lt: end }
    }).lean()
    bookings.forEach(b => {
      const key = new Date(b.bookingDateTime).toISOString().slice(0, 10)
      if (days[key]) {
        days[key].bookings += 1
        if (b.priceDetails.redeemedUserSubscriptionId) {
          days[key].subscriptionRedemptions += 1
        }
        if (b.priceDetails.appliedGiftVoucherId) {
          days[key].voucherUsages += 1
        }
        if (b.priceDetails.appliedCouponId) {
          days[key].couponUsages += 1
        }
      }
    })

    const subs = await UserSubscription.find({
      purchaseDate: { $gte: start, $lt: end }
    }).lean()
    subs.forEach(s => {
      const key = new Date(s.purchaseDate).toISOString().slice(0, 10)
      if (days[key]) days[key].subscriptionPurchases += 1
    })

    const professionals = await ProfessionalProfile.find({
      'financialTransactions.date': { $gte: start, $lt: end }
    }, { financialTransactions: 1 }).lean()
    professionals.forEach(p => {
      p.financialTransactions?.forEach((t: any) => {
        const d = new Date(t.date)
        if (d >= start && d < end) {
          const key = d.toISOString().slice(0, 10)
          if (!days[key]) return
          if (t.type === 'penalty') days[key].penalties += 1
          if (t.type === 'bonus' || t.type === 'adjustment') days[key].credits += 1
        }
      })
    })

    const summary = Object.values(days)
    return { success: true, data: summary }
  } catch (error) {
    console.error('Error fetching weekly transaction stats:', error)
    return { success: false, error: 'Failed to fetch statistics' }
  }
}
